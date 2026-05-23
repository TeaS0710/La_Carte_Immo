#!/usr/bin/env python3
"""
Spatial-join : add code_iris to each street feature in streets.geojson
based on point-in-polygon against the IRIS polygons.
"""
import json
from pathlib import Path

from shapely.geometry import shape, Point
from shapely.prepared import prep

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "data" / "saint-maur" / "streets.geojson"
IRIS = ROOT / "public" / "data" / "saint-maur" / "iris.geojson"

streets = json.loads(SRC.read_text())
iris = json.loads(IRIS.read_text())

prepared = []
for f in iris["features"]:
    geom = shape(f["geometry"])
    prepared.append({
        "code": f["properties"].get("code_iris"),
        "name": f["properties"].get("nom_iris"),
        "geom": geom,
        "prep": prep(geom),
    })

def find_iris(lng: float, lat: float) -> tuple[str, str] | tuple[None, None]:
    pt = Point(lng, lat)
    for p in prepared:
        if p["prep"].contains(pt):
            return p["code"], p["name"]
    return None, None

n_joined = 0
for f in streets["features"]:
    lng, lat = f["geometry"]["coordinates"]
    code, name = find_iris(lng, lat)
    if code:
        f["properties"]["code_iris"] = code
        f["properties"]["nom_iris"] = name
        n_joined += 1

SRC.write_text(json.dumps(streets, ensure_ascii=False))
print(f"Enriched {n_joined}/{len(streets['features'])} streets with code_iris")
print(f"Wrote {SRC} ({SRC.stat().st_size // 1024} KB)")
