#!/usr/bin/env python3
"""
Enrichit iris.geojson avec les agrégats DVF par IRIS via spatial join
(transactions.geojson × iris.geojson). Ajoute par feature IRIS :
  - dvf_sales_total, dvf_sales_appt, dvf_sales_maison
  - dvf_median_price, dvf_median_ppsqm
  - dvf_by_year [{year, sales, median_price}]

Pré-requis : transactions.geojson + iris.geojson présents dans
public/data/commune/{INSEE}/.

Usage :
  ./scripts/enrich_iris_with_dvf.py --code-insee 94042
"""
import argparse
import json
import statistics
from collections import defaultdict
from pathlib import Path

from shapely.geometry import Point, shape
from shapely.prepared import prep

ROOT = Path(__file__).resolve().parent.parent

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--code-insee", required=True)
args = parser.parse_args()

CODE_INSEE = args.code_insee
COMMUNE_DIR = ROOT / "public" / "data" / "commune" / CODE_INSEE
IRIS_PATH = COMMUNE_DIR / "iris.geojson"
TX_PATH = COMMUNE_DIR / "transactions.geojson"

if not IRIS_PATH.exists() or not TX_PATH.exists():
    raise SystemExit(f"Missing input: {IRIS_PATH} or {TX_PATH}")

iris_geo = json.loads(IRIS_PATH.read_text())
tx_geo = json.loads(TX_PATH.read_text())

iris_index = []
for f in iris_geo["features"]:
    geom = shape(f["geometry"])
    iris_index.append({
        "props": f["properties"],
        "geom": geom,
        "prep": prep(geom),
    })

agg = defaultdict(lambda: {
    "sales": [], "appt": 0, "maison": 0, "prices": [], "ppsqm": [], "by_year": defaultdict(list),
})

for f in tx_geo["features"]:
    coords = f["geometry"]["coordinates"]
    pt = Point(coords[0], coords[1])
    p = f["properties"]
    val = p.get("valeur_fonciere")
    if not val:
        continue
    for ir in iris_index:
        if ir["prep"].contains(pt):
            code = ir["props"]["code_iris"]
            agg[code]["sales"].append(val)
            t = p.get("type_local")
            if t == "Appartement":
                agg[code]["appt"] += 1
            elif t == "Maison":
                agg[code]["maison"] += 1
            ppsqm = p.get("price_per_sqm")
            if ppsqm:
                agg[code]["ppsqm"].append(ppsqm)
            year = p.get("year")
            if year:
                agg[code]["by_year"][year].append(val)
            break

for f in iris_geo["features"]:
    code = f["properties"]["code_iris"]
    a = agg.get(code)
    if a:
        f["properties"]["dvf_sales_total"] = len(a["sales"])
        f["properties"]["dvf_sales_appt"] = a["appt"]
        f["properties"]["dvf_sales_maison"] = a["maison"]
        f["properties"]["dvf_median_price"] = round(statistics.median(a["sales"]), 0) if a["sales"] else None
        f["properties"]["dvf_median_ppsqm"] = round(statistics.median(a["ppsqm"]), 0) if a["ppsqm"] else None
        by_year_list = []
        for y in sorted(a["by_year"]):
            vals = a["by_year"][y]
            by_year_list.append({
                "year": int(y),
                "sales": len(vals),
                "median_price": round(statistics.median(vals), 0),
            })
        f["properties"]["dvf_by_year"] = by_year_list
    else:
        f["properties"]["dvf_sales_total"] = 0
        f["properties"]["dvf_sales_appt"] = 0
        f["properties"]["dvf_sales_maison"] = 0
        f["properties"]["dvf_median_price"] = None
        f["properties"]["dvf_median_ppsqm"] = None
        f["properties"]["dvf_by_year"] = []

IRIS_PATH.write_text(json.dumps(iris_geo, ensure_ascii=False))
total_sales = sum(f["properties"]["dvf_sales_total"] for f in iris_geo["features"])
n_with = sum(1 for f in iris_geo["features"] if f["properties"]["dvf_sales_total"] > 0)
print(f"OK {CODE_INSEE} : {n_with}/{len(iris_geo['features'])} IRIS enrichis · {total_sales} ventes")
