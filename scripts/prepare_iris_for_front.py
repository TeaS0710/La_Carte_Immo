#!/usr/bin/env python3
"""
Build IRIS GeoJSON enriched with :
  - INSEE socio attributes (population, CSP, logement, BPE, DPE)
  - DVF sales history per IRIS (spatial join, by year and by type)
"""
import json
from pathlib import Path
from collections import defaultdict

import pandas as pd
from shapely.geometry import shape, Point
from shapely.prepared import prep

ROOT = Path(__file__).resolve().parent.parent
SRC_GEO = ROOT / "data" / "raw" / "iris" / "iris_94068.geojson"
SRC_ENT = ROOT / "data" / "knowledge_base" / "entities.jsonl"
DVF_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "public" / "data" / "saint-maur"
OUT = OUT_DIR / "iris.geojson"

INSEE = "94068"

# ── 1. Load INSEE / KB socio attributes per IRIS ─────────────────────────────
iris_attrs: dict[str, dict] = {}
with SRC_ENT.open() as f:
    for line in f:
        ent = json.loads(line)
        if ent.get("type") != "iris":
            continue
        a = ent.get("attributes", {})
        iris_attrs[ent["id"]] = {
            "name": ent.get("name"),
            "population": a.get("population"),
            "n_log": a.get("n_log"),
            "n_rp": a.get("n_rp"),
            "pct_proprio": a.get("pct_proprio"),
            "pct_hlm": a.get("pct_hlm"),
            "pct_appart": a.get("pct_appart"),
            "pct_cadres": a.get("pct_cadres"),
            "pct_bac5p": a.get("pct_bac5p"),
            "pct_etrangers": a.get("pct_etrangers"),
            "pct_0_14": a.get("pct_0_14"),
            "pct_65p": a.get("pct_65p"),
            "bpe_total": sum((a.get("bpe") or {}).values()) if isinstance(a.get("bpe"), dict) else None,
            "bpe_commerces": (a.get("bpe") or {}).get("Commerces"),
            "bpe_enseignement": (a.get("bpe") or {}).get("Enseignement"),
            "bpe_sante": (a.get("bpe") or {}).get("Santé / social"),
            "dpe": a.get("dpe"),
        }

# ── 2. Load IRIS geometry and prepare spatial index ──────────────────────────
geo = json.loads(SRC_GEO.read_text())
prepared = []
for f in geo["features"]:
    code = f["properties"].get("code_iris")
    geom = shape(f["geometry"])
    prepared.append((code, geom, prep(geom)))
print(f"Loaded {len(prepared)} IRIS polygons")

# ── 3. Load and clean DVF transactions ───────────────────────────────────────
frames = []
for csv in sorted(DVF_DIR.glob(f"dvf_{INSEE}_*.csv")):
    year = int(csv.stem.split("_")[-1])
    df = pd.read_csv(csv, dtype={"code_postal": "string", "code_commune": "string"})
    df["year"] = year
    frames.append(df)
df = pd.concat(frames, ignore_index=True)
df = df[df["nature_mutation"] == "Vente"]
df = df[df["valeur_fonciere"].notna()]
df = df[df["longitude"].notna() & df["latitude"].notna()]
print(f"Loaded {len(df)} sales total")

# ── 4. Spatial join : assign each DVF point to its IRIS ──────────────────────
def find_iris(lng: float, lat: float) -> str | None:
    pt = Point(lng, lat)
    for code, _, pgeom in prepared:
        if pgeom.contains(pt):
            return code
    return None

df["code_iris"] = [
    find_iris(lng, lat)
    for lng, lat in zip(df["longitude"], df["latitude"])
]
joined = df["code_iris"].notna().sum()
print(f"Assigned {joined}/{len(df)} sales to an IRIS ({100*joined/len(df):.1f} %)")

# ── 5. Aggregate sales per IRIS ──────────────────────────────────────────────
iris_sales: dict[str, dict] = {}
for code, g in df.groupby("code_iris"):
    if pd.isna(code) or not code:
        continue
    g = g.copy()
    g["price_per_sqm"] = g.apply(
        lambda r: r["valeur_fonciere"] / r["surface_reelle_bati"]
        if pd.notna(r["surface_reelle_bati"]) and r["surface_reelle_bati"] > 9
        else None,
        axis=1,
    )
    ppsqm = g["price_per_sqm"].dropna()
    by_year = []
    for y, gy in g.groupby("year"):
        by_year.append({
            "year": int(y),
            "sales": int(len(gy)),
            "median_price": float(gy["valeur_fonciere"].median()),
        })
    by_year.sort(key=lambda x: x["year"])

    appt = g[g["type_local"] == "Appartement"]
    maison = g[g["type_local"] == "Maison"]

    iris_sales[code] = {
        "dvf_sales_total": int(len(g)),
        "dvf_sales_appt": int(len(appt)),
        "dvf_sales_maison": int(len(maison)),
        "dvf_median_price": float(g["valeur_fonciere"].median()),
        "dvf_median_ppsqm": float(ppsqm.median()) if len(ppsqm) else None,
        "dvf_by_year": by_year,
    }

# ── 6. Inject everything into the geojson features ───────────────────────────
for f in geo["features"]:
    code = f["properties"].get("code_iris")
    f["properties"].update(iris_attrs.get(code, {}))
    f["properties"].update(iris_sales.get(code, {
        "dvf_sales_total": 0,
        "dvf_sales_appt": 0,
        "dvf_sales_maison": 0,
        "dvf_median_price": None,
        "dvf_median_ppsqm": None,
        "dvf_by_year": [],
    }))

OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(geo, ensure_ascii=False))
print(f"\nWrote {OUT} ({OUT.stat().st_size // 1024} KB)")
print(f"IRIS with sales : {sum(1 for f in geo['features'] if f['properties'].get('dvf_sales_total', 0) > 0)} / {len(geo['features'])}")
