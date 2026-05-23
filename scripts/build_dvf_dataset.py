#!/usr/bin/env python3
"""
Build the Saint-Maur DVF dataset for the Prelys turnover tool.

Reads raw DVF CSVs (one per year) from data/raw/, aggregates by street and by
parcelle (immeuble proxy), and writes GeoJSON + JSON files consumable by the
Next.js front-end.

Outputs (in public/data/saint-maur/):
  - streets.geojson      one Point per street, with sales count, avg price, etc.
  - transactions.geojson all individual sales (for density heatmap)
  - parcelles.geojson    aggregates by id_parcelle (mockup data for outil n°2)
  - stats.json           commune-wide KPIs
"""
from __future__ import annotations

import json
import math
from datetime import datetime
from pathlib import Path

import pandas as pd
from unidecode import unidecode

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "public" / "data" / "saint-maur"

INSEE_CODE = "94068"
COMMUNE_NAME = "Saint-Maur-des-Fossés"


def load_all_years() -> pd.DataFrame:
    frames = []
    for csv in sorted(RAW_DIR.glob(f"dvf_{INSEE_CODE}_*.csv")):
        year = int(csv.stem.split("_")[-1])
        df = pd.read_csv(csv, dtype={"code_postal": "string", "code_commune": "string"})
        df["year"] = year
        frames.append(df)
    if not frames:
        raise SystemExit("No raw DVF CSVs found — run the download step first.")
    return pd.concat(frames, ignore_index=True)


def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df[df["nature_mutation"] == "Vente"].copy()
    df = df[df["valeur_fonciere"].notna()]
    df = df[df["longitude"].notna() & df["latitude"].notna()]
    df = df[df["adresse_nom_voie"].notna()]
    df["date_mutation"] = pd.to_datetime(df["date_mutation"], errors="coerce")
    df = df[df["date_mutation"].notna()]
    df["street_key"] = df["adresse_nom_voie"].map(
        lambda s: unidecode(str(s)).upper().strip()
    )
    df["price_per_sqm"] = df.apply(
        lambda r: r["valeur_fonciere"] / r["surface_reelle_bati"]
        if r["surface_reelle_bati"] and r["surface_reelle_bati"] > 9
        else None,
        axis=1,
    )
    return df


def aggregate_by_street(df: pd.DataFrame) -> pd.DataFrame:
    grouped = df.groupby("street_key")
    rows = []
    for key, g in grouped:
        appt = g[g["type_local"] == "Appartement"]
        maison = g[g["type_local"] == "Maison"]
        ppsqm = g["price_per_sqm"].dropna()
        rows.append({
            "street_key": key,
            "street_name": g["adresse_nom_voie"].mode().iloc[0],
            "lon": g["longitude"].median(),
            "lat": g["latitude"].median(),
            "sales": len(g),
            "sales_appt": len(appt),
            "sales_maison": len(maison),
            "median_price": float(g["valeur_fonciere"].median()),
            "median_price_per_sqm": float(ppsqm.median()) if len(ppsqm) else None,
            "first_year": int(g["year"].min()),
            "last_year": int(g["year"].max()),
            "years_active": int(g["year"].nunique()),
        })
    out = pd.DataFrame(rows)
    out["turnover_rank"] = out["sales"].rank(method="dense", ascending=False).astype(int)
    max_sales = out["sales"].max() if len(out) else 1
    out["turnover_score"] = (out["sales"] / max_sales * 100).round(1)
    return out.sort_values("sales", ascending=False).reset_index(drop=True)


def aggregate_by_parcelle(df: pd.DataFrame) -> pd.DataFrame:
    df = df[df["id_parcelle"].notna()].copy()
    grouped = df.groupby("id_parcelle")
    rows = []
    for parcelle, g in grouped:
        if len(g) < 2:
            continue
        ppsqm = g["price_per_sqm"].dropna()
        rooms = g["nombre_pieces_principales"].dropna()
        rows.append({
            "id_parcelle": parcelle,
            "address": f"{g['adresse_numero'].dropna().astype(int).astype(str).mode().iloc[0] if g['adresse_numero'].notna().any() else ''} {g['adresse_nom_voie'].mode().iloc[0]}".strip(),
            "lon": g["longitude"].median(),
            "lat": g["latitude"].median(),
            "sales": len(g),
            "median_price": float(g["valeur_fonciere"].median()),
            "median_price_per_sqm": float(ppsqm.median()) if len(ppsqm) else None,
            "median_rooms": float(rooms.median()) if len(rooms) else None,
            "first_sale": g["date_mutation"].min().strftime("%Y-%m-%d"),
            "last_sale": g["date_mutation"].max().strftime("%Y-%m-%d"),
        })
    out = pd.DataFrame(rows)
    return out.sort_values("sales", ascending=False).reset_index(drop=True)


def to_geojson_points(df: pd.DataFrame, props: list[str]) -> dict:
    features = []
    for _, r in df.iterrows():
        if pd.isna(r["lon"]) or pd.isna(r["lat"]):
            continue
        feature_props = {}
        for p in props:
            v = r[p]
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                feature_props[p] = None
            elif hasattr(v, "item"):
                feature_props[p] = v.item()
            else:
                feature_props[p] = v
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(r["lon"]), float(r["lat"])]},
            "properties": feature_props,
        })
    return {"type": "FeatureCollection", "features": features}


def commune_stats(df: pd.DataFrame, streets: pd.DataFrame) -> dict:
    ppsqm = df["price_per_sqm"].dropna()
    by_year = df.groupby("year").agg(
        sales=("valeur_fonciere", "count"),
        median_price=("valeur_fonciere", "median"),
    ).reset_index()
    by_year_payload = [
        {"year": int(r["year"]), "sales": int(r["sales"]), "median_price": float(r["median_price"])}
        for _, r in by_year.iterrows()
    ]
    return {
        "commune": COMMUNE_NAME,
        "insee": INSEE_CODE,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "total_sales": int(len(df)),
        "years_covered": sorted(df["year"].unique().tolist()),
        "streets_with_sales": int(len(streets)),
        "median_price": float(df["valeur_fonciere"].median()),
        "median_price_per_sqm": float(ppsqm.median()) if len(ppsqm) else None,
        "by_year": by_year_payload,
        "top_streets": streets.head(15)[["street_name", "sales", "median_price_per_sqm"]].to_dict(orient="records"),
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    raw = load_all_years()
    print(f"Loaded {len(raw)} raw rows from {RAW_DIR}")
    df = clean(raw)
    print(f"After cleaning: {len(df)} sales")

    streets = aggregate_by_street(df)
    print(f"Aggregated {len(streets)} streets")
    parcelles = aggregate_by_parcelle(df)
    print(f"Aggregated {len(parcelles)} multi-sale parcelles")

    (OUT_DIR / "streets.geojson").write_text(json.dumps(
        to_geojson_points(streets, [
            "street_name", "sales", "sales_appt", "sales_maison",
            "median_price", "median_price_per_sqm", "turnover_score", "turnover_rank",
            "first_year", "last_year", "years_active",
        ]),
        ensure_ascii=False,
    ))

    tx_df = df.rename(columns={"longitude": "lon", "latitude": "lat"}).copy()
    tx_df["date_iso"] = tx_df["date_mutation"].dt.strftime("%Y-%m-%d")
    tx_df["parcelle"] = tx_df["id_parcelle"].fillna("")
    tx_df["addr_num"] = tx_df["adresse_numero"].apply(
        lambda v: str(int(v)) if pd.notna(v) else ""
    )

    (OUT_DIR / "transactions.geojson").write_text(json.dumps(
        to_geojson_points(
            tx_df[[
                "lon", "lat", "year", "valeur_fonciere", "type_local",
                "surface_reelle_bati", "nombre_pieces_principales",
                "adresse_nom_voie", "price_per_sqm", "date_iso",
                "parcelle", "addr_num",
            ]],
            ["year", "valeur_fonciere", "type_local", "surface_reelle_bati",
             "nombre_pieces_principales", "adresse_nom_voie", "price_per_sqm",
             "date_iso", "parcelle", "addr_num"],
        ),
        ensure_ascii=False,
    ))

    (OUT_DIR / "parcelles.geojson").write_text(json.dumps(
        to_geojson_points(parcelles, [
            "id_parcelle", "address", "sales", "median_price",
            "median_price_per_sqm", "median_rooms", "first_sale", "last_sale",
        ]),
        ensure_ascii=False,
    ))

    # Top-N parcelles digest, for the fiche immeuble picker (light payload)
    top_parcelles = parcelles.head(30).to_dict(orient="records")
    (OUT_DIR / "top_parcelles.json").write_text(
        json.dumps({"parcelles": top_parcelles}, ensure_ascii=False, indent=2)
    )

    # Per-parcelle transaction details, for the fiche immeuble dynamic data
    parcelle_index: dict[str, dict] = {}
    for parcelle_id, g in df.groupby("id_parcelle"):
        if pd.isna(parcelle_id) or len(g) < 2:
            continue
        sorted_g = g.sort_values("date_mutation", ascending=False)
        sales_list = [
            {
                "date": r["date_mutation"].strftime("%Y-%m-%d"),
                "type": r["type_local"] if pd.notna(r["type_local"]) else None,
                "surface": int(r["surface_reelle_bati"]) if pd.notna(r["surface_reelle_bati"]) else None,
                "rooms": int(r["nombre_pieces_principales"]) if pd.notna(r["nombre_pieces_principales"]) else None,
                "price": float(r["valeur_fonciere"]),
                "ppsqm": float(r["price_per_sqm"]) if pd.notna(r["price_per_sqm"]) else None,
            }
            for _, r in sorted_g.iterrows()
        ]
        parcelle_index[parcelle_id] = {
            "id": parcelle_id,
            "address": f"{g['adresse_numero'].dropna().astype(int).astype(str).mode().iloc[0] if g['adresse_numero'].notna().any() else ''} {g['adresse_nom_voie'].mode().iloc[0]}".strip(),
            "sales": sales_list,
        }
    (OUT_DIR / "parcelle_details.json").write_text(
        json.dumps(parcelle_index, ensure_ascii=False)
    )

    # JT du quartier: real market pulse + top recent sales (last full year).
    # DVF often splits one transaction across multiple lots (same id_mutation,
    # repeated valeur_fonciere). Dedupe and filter to residential before picking.
    latest_year = int(df["year"].max())
    recent = df[df["year"] == latest_year]
    last_year_df = df[df["year"] == latest_year - 1]
    residential = recent[
        recent["type_local"].isin(["Appartement", "Maison"])
        & recent["surface_reelle_bati"].notna()
        & (recent["surface_reelle_bati"] >= 12)
    ].copy()
    residential = residential.drop_duplicates(subset="id_mutation", keep="first")
    # Also drop unrealistic prices (clear data anomalies — e.g. lot bundles
    # mis-classified as a single dwelling at multi-million €).
    residential = residential[
        (residential["price_per_sqm"] > 1500)
        & (residential["price_per_sqm"] < 25000)
    ]
    notable = (
        residential.sort_values("valeur_fonciere", ascending=False)
        .head(5)[["date_mutation", "adresse_nom_voie", "type_local",
                  "surface_reelle_bati", "valeur_fonciere"]]
    )
    notable_payload = [
        {
            "date": r["date_mutation"].strftime("%Y-%m-%d"),
            "street": r["adresse_nom_voie"],
            "type": r["type_local"] if pd.notna(r["type_local"]) else None,
            "surface": int(r["surface_reelle_bati"]) if pd.notna(r["surface_reelle_bati"]) else None,
            "price": float(r["valeur_fonciere"]),
        }
        for _, r in notable.iterrows()
    ]
    ppsqm_recent = recent["price_per_sqm"].dropna()
    ppsqm_prev = last_year_df["price_per_sqm"].dropna()
    delta_ppsqm = (
        (ppsqm_recent.median() - ppsqm_prev.median()) / ppsqm_prev.median() * 100
        if len(ppsqm_prev) else None
    )
    (OUT_DIR / "jt_quartier.json").write_text(json.dumps({
        "year": latest_year,
        "sales_year": int(len(recent)),
        "sales_delta_pct": round(
            (len(recent) - len(last_year_df)) / len(last_year_df) * 100, 1
        ) if len(last_year_df) else None,
        "median_price": float(recent["valeur_fonciere"].median()),
        "median_ppsqm": float(ppsqm_recent.median()) if len(ppsqm_recent) else None,
        "delta_ppsqm_pct": round(delta_ppsqm, 1) if delta_ppsqm is not None else None,
        "notable_sales": notable_payload,
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }, ensure_ascii=False, indent=2))

    (OUT_DIR / "stats.json").write_text(json.dumps(
        commune_stats(df, streets), ensure_ascii=False, indent=2,
    ))

    print(f"\nWrote outputs to {OUT_DIR}:")
    for f in OUT_DIR.iterdir():
        print(f"  {f.name}: {f.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
