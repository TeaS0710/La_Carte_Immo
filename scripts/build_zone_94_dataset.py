#!/usr/bin/env python3
"""Build le dataset DVF agrégé pour la zone 94 Prelys Courtage (10 communes).

Entrée :  data/raw/dvf_{INSEE}_{YYYY}.csv (téléchargés par scripts/download_dvf.py)
Sortie : public/data/zone-94/
            {slug}/streets.geojson        — rues, count + médiane prix
            {slug}/parcelles.geojson      — parcelles (immeuble proxy) ≥2 ventes
            {slug}/transactions.geojson   — toutes les transactions Vente résidentielles
            {slug}/stats.json             — KPIs commune
            _overview.json                — KPIs comparés entre communes
            _all_streets.geojson          — heatmap zone entière

Idempotent : on overwrite à chaque run.
"""
from __future__ import annotations

import json
import math
import re
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd
from unidecode import unidecode

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "public" / "data" / "zone-94"

COMMUNES = [
    ("94002", "Alfortville"),
    ("94017", "Champigny-sur-Marne"),
    ("94028", "Créteil"),
    ("94033", "Fontenay-sous-Bois"),
    ("94046", "Maisons-Alfort"),
    ("94058", "Le Perreux-sur-Marne"),
    ("94068", "Saint-Maur-des-Fossés"),
    ("94076", "Villejuif"),
    ("94080", "Vincennes"),
    ("94081", "Vitry-sur-Seine"),
]


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", unidecode(name).lower()).strip("-")


def load_commune_years(insee: str) -> pd.DataFrame:
    frames = []
    for csv in sorted(RAW_DIR.glob(f"dvf_{insee}_*.csv")):
        year = int(csv.stem.split("_")[-1])
        df = pd.read_csv(csv, dtype={"code_postal": "string", "code_commune": "string"}, low_memory=False)
        df["year"] = year
        frames.append(df)
    if not frames:
        return pd.DataFrame()
    return pd.concat(frames, ignore_index=True)


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Filtre aux ventes résidentielles avec coords + surface."""
    if df.empty:
        return df
    df = df[df["nature_mutation"] == "Vente"].copy()
    df = df[df["valeur_fonciere"].notna()]
    df = df[df["longitude"].notna() & df["latitude"].notna()]
    df = df[df["adresse_nom_voie"].notna()]
    df["date_mutation"] = pd.to_datetime(df["date_mutation"], errors="coerce")
    df = df[df["date_mutation"].notna()]
    df["street_key"] = df["adresse_nom_voie"].map(lambda s: unidecode(str(s)).upper().strip())
    df["price_per_sqm"] = df.apply(
        lambda r: r["valeur_fonciere"] / r["surface_reelle_bati"]
        if pd.notna(r["surface_reelle_bati"]) and r["surface_reelle_bati"] > 9
        else None,
        axis=1,
    )
    return df


def aggregate_by_street(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame()
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
    if out.empty:
        return out
    max_sales = out["sales"].max()
    out["turnover_score"] = (out["sales"] / max_sales * 100).round(1)
    return out.sort_values("sales", ascending=False).reset_index(drop=True)


def aggregate_by_parcelle(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame()
    df = df[df["id_parcelle"].notna()].copy()
    rows = []
    for parcelle, g in df.groupby("id_parcelle"):
        if len(g) < 2:
            continue
        ppsqm = g["price_per_sqm"].dropna()
        rooms = g["nombre_pieces_principales"].dropna()
        nums = g["adresse_numero"].dropna()
        addr_num = str(int(nums.mode().iloc[0])) if len(nums) else ""
        rows.append({
            "id_parcelle": parcelle,
            "address": f"{addr_num} {g['adresse_nom_voie'].mode().iloc[0]}".strip(),
            "lon": g["longitude"].median(),
            "lat": g["latitude"].median(),
            "sales": len(g),
            "median_price": float(g["valeur_fonciere"].median()),
            "median_price_per_sqm": float(ppsqm.median()) if len(ppsqm) else None,
            "median_rooms": float(rooms.median()) if len(rooms) else None,
            "first_sale": g["date_mutation"].min().strftime("%Y-%m-%d"),
            "last_sale": g["date_mutation"].max().strftime("%Y-%m-%d"),
        })
    if not rows:
        return pd.DataFrame()
    return pd.DataFrame(rows).sort_values("sales", ascending=False).reset_index(drop=True)


def _safe_value(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if hasattr(v, "item"):
        try:
            return v.item()
        except (ValueError, AttributeError):
            return v
    return v


def to_geojson_points(df: pd.DataFrame, props: list[str]) -> dict:
    features = []
    if df.empty:
        return {"type": "FeatureCollection", "features": features}
    for _, r in df.iterrows():
        if pd.isna(r["lon"]) or pd.isna(r["lat"]):
            continue
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [float(r["lon"]), float(r["lat"])]},
            "properties": {p: _safe_value(r[p]) for p in props},
        })
    return {"type": "FeatureCollection", "features": features}


def commune_stats(insee: str, nom: str, df: pd.DataFrame, streets: pd.DataFrame) -> dict:
    if df.empty:
        return {
            "insee": insee, "commune": nom,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "total_sales": 0, "streets_with_sales": 0,
        }
    ppsqm = df["price_per_sqm"].dropna()
    by_year = df.groupby("year").agg(
        sales=("valeur_fonciere", "count"),
        median_price=("valeur_fonciere", "median"),
        median_ppsqm=("price_per_sqm", "median"),
    ).reset_index()
    return {
        "insee": insee,
        "commune": nom,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "total_sales": int(len(df)),
        "years_covered": sorted(df["year"].unique().tolist()),
        "streets_with_sales": int(len(streets)),
        "median_price": float(df["valeur_fonciere"].median()),
        "median_price_per_sqm": float(ppsqm.median()) if len(ppsqm) else None,
        "by_year": [
            {
                "year": int(r["year"]),
                "sales": int(r["sales"]),
                "median_price": float(r["median_price"]),
                "median_ppsqm": float(r["median_ppsqm"]) if pd.notna(r["median_ppsqm"]) else None,
            }
            for _, r in by_year.iterrows()
        ],
        "top_streets": streets.head(15)[
            ["street_name", "sales", "median_price_per_sqm"]
        ].to_dict(orient="records") if not streets.empty else [],
    }


def process_commune(insee: str, nom: str) -> tuple[dict, pd.DataFrame]:
    """Traite une commune, écrit ses sorties, renvoie (stats, streets_df pour overview)."""
    slug = slugify(nom)
    out_dir = OUT_DIR / slug
    out_dir.mkdir(parents=True, exist_ok=True)

    raw = load_commune_years(insee)
    if raw.empty:
        print(f"  ! {nom} : aucun CSV trouvé — skip")
        return commune_stats(insee, nom, pd.DataFrame(), pd.DataFrame()), pd.DataFrame()

    df = clean(raw)
    print(f"  {nom:25s}  raw={len(raw):5d}  ventes nettoyées={len(df):5d}", end="")

    streets = aggregate_by_street(df)
    parcelles = aggregate_by_parcelle(df)
    print(f"  rues={len(streets):4d}  parcelles_multi={len(parcelles):4d}")

    (out_dir / "streets.geojson").write_text(json.dumps(
        to_geojson_points(streets, [
            "street_name", "sales", "sales_appt", "sales_maison",
            "median_price", "median_price_per_sqm", "turnover_score",
            "first_year", "last_year", "years_active",
        ]), ensure_ascii=False))

    (out_dir / "parcelles.geojson").write_text(json.dumps(
        to_geojson_points(parcelles, [
            "id_parcelle", "address", "sales", "median_price",
            "median_price_per_sqm", "median_rooms", "first_sale", "last_sale",
        ]), ensure_ascii=False))

    tx_df = df.copy().rename(columns={"longitude": "lon", "latitude": "lat"})
    tx_df["date_iso"] = tx_df["date_mutation"].dt.strftime("%Y-%m-%d")
    tx_df["addr_num"] = tx_df["adresse_numero"].apply(lambda v: str(int(v)) if pd.notna(v) else "")
    (out_dir / "transactions.geojson").write_text(json.dumps(
        to_geojson_points(
            tx_df[["lon", "lat", "year", "valeur_fonciere", "type_local",
                   "surface_reelle_bati", "nombre_pieces_principales",
                   "adresse_nom_voie", "price_per_sqm", "date_iso", "addr_num"]],
            ["year", "valeur_fonciere", "type_local", "surface_reelle_bati",
             "nombre_pieces_principales", "adresse_nom_voie", "price_per_sqm",
             "date_iso", "addr_num"],
        ), ensure_ascii=False))

    stats = commune_stats(insee, nom, df, streets)
    (out_dir / "stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=2))

    streets_with_commune = streets.copy()
    if not streets_with_commune.empty:
        streets_with_commune["insee"] = insee
        streets_with_commune["commune"] = nom
    return stats, streets_with_commune


def write_overview(all_stats: list[dict], all_streets: pd.DataFrame) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    overview = {
        "zone": "zone-94-courtage-prelys",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "communes": [
            {
                "insee": s["insee"],
                "commune": s["commune"],
                "slug": slugify(s["commune"]),
                "total_sales": s.get("total_sales", 0),
                "streets_with_sales": s.get("streets_with_sales", 0),
                "median_price": s.get("median_price"),
                "median_price_per_sqm": s.get("median_price_per_sqm"),
                "years_covered": s.get("years_covered", []),
            }
            for s in all_stats
        ],
        "totals": {
            "communes": len([s for s in all_stats if s.get("total_sales", 0) > 0]),
            "total_sales": sum(s.get("total_sales", 0) for s in all_stats),
            "total_streets": sum(s.get("streets_with_sales", 0) for s in all_stats),
        },
    }
    (OUT_DIR / "_overview.json").write_text(json.dumps(overview, ensure_ascii=False, indent=2))

    if not all_streets.empty:
        (OUT_DIR / "_all_streets.geojson").write_text(json.dumps(
            to_geojson_points(all_streets, [
                "street_name", "commune", "insee", "sales",
                "median_price", "median_price_per_sqm", "turnover_score",
            ]),
            ensure_ascii=False,
        ))


def main() -> int:
    print(f"DVF zone 94 — {len(COMMUNES)} communes, sortie → {OUT_DIR}\n")
    all_stats = []
    all_streets_frames = []
    for insee, nom in COMMUNES:
        stats, streets = process_commune(insee, nom)
        all_stats.append(stats)
        if not streets.empty:
            all_streets_frames.append(streets)

    all_streets = (
        pd.concat(all_streets_frames, ignore_index=True)
        if all_streets_frames
        else pd.DataFrame()
    )
    write_overview(all_stats, all_streets)

    print(f"\nÉcrits :")
    for f in sorted(OUT_DIR.rglob("*")):
        if f.is_file():
            print(f"  {f.relative_to(OUT_DIR)}  ({f.stat().st_size // 1024} KB)")
    print(f"\nTotal ventes nettoyées sur la zone : "
          f"{sum(s.get('total_sales', 0) for s in all_stats):,}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
