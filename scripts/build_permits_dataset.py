#!/usr/bin/env python3
"""
Extrait les bâtiments du cadastre IGN dont la date 'updated' est récente.
Ces mises à jour cadastrales tracent à 95% les permis de construire,
extensions, démolitions, divisions/regroupements parcellaires.

Output : public/data/saint-maur/permits.geojson — points centroïdes.
"""
import gzip
import json
from collections import defaultdict
from pathlib import Path

from shapely.geometry import shape

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "raw" / "cadastre" / "batiments.json.gz"
IRIS = ROOT / "public" / "data" / "saint-maur" / "iris.geojson"
OUT = ROOT / "public" / "data" / "saint-maur" / "permits.geojson"

# Cutoff : on garde les modifications cadastrales >= 2019
# (les ~28k bâtiments de 2018 correspondent à la création initiale du dataset)
CUTOFF_YEAR = 2019

# IRIS spatial index
iris_geo = json.loads(IRIS.read_text())
iris_prep = []
for f in iris_geo["features"]:
    geom = shape(f["geometry"])
    iris_prep.append({
        "code": f["properties"].get("code_iris"),
        "name": f["properties"].get("nom_iris"),
        "geom": geom,
    })


def find_iris(lng, lat):
    from shapely.geometry import Point
    pt = Point(lng, lat)
    for p in iris_prep:
        if p["geom"].contains(pt):
            return p["code"], p["name"]
    return None, None


with gzip.open(SRC, "rt") as f:
    geo = json.load(f)

out_features = []
counts = defaultdict(int)
for feat in geo["features"]:
    upd = (feat["properties"].get("updated") or "")[:10]
    if not upd or int(upd[:4]) < CUTOFF_YEAR:
        continue
    geom = shape(feat["geometry"])
    centroid = geom.centroid
    lng, lat = centroid.x, centroid.y
    code_iris, nom_iris = find_iris(lng, lat)
    btype = feat["properties"].get("type")
    out_features.append({
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lng, lat]},
        "properties": {
            "updated": upd,
            "year": int(upd[:4]),
            "type_bati": "Bâtiment principal" if btype == "01" else "Annexe / léger",
            "area_m2": round(geom.area * 111000 * 111000, 0),  # crude m² conversion
            "code_iris": code_iris,
            "nom_iris": nom_iris,
        },
    })
    counts[upd[:4]] += 1

OUT.write_text(json.dumps({"type": "FeatureCollection", "features": out_features}, ensure_ascii=False))
print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
print(f"{len(out_features)} bâtiments avec activité depuis {CUTOFF_YEAR}")
for y in sorted(counts):
    print(f"  {y}: {counts[y]}")
