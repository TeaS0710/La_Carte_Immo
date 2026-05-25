#!/usr/bin/env python3
"""
Enrichit iris.geojson avec les agrégats DPE par IRIS via spatial join.
Ajoute par feature IRIS :
  - dpe_total : nombre de DPE
  - dpe_etiquettes : {A,B,C,D,E,F,G: count}
  - dpe_pct_fg : % logements étiquette F ou G
  - dpe_pct_ab : % logements étiquette A ou B
  - annee_construction_median

Pré-requis : iris.geojson + data/raw/dpe/dpe_{INSEE}.json.

Usage :
  ./scripts/enrich_iris_with_dpe.py --code-insee 94068
  ./scripts/enrich_iris_with_dpe.py --targets scripts/target_full.json
"""
import argparse
import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path

from shapely.geometry import Point, shape
from shapely.prepared import prep

ROOT = Path(__file__).resolve().parent.parent
COMMUNE_DIR = ROOT / "public" / "data" / "commune"
DPE_DIR = ROOT / "data" / "raw" / "dpe"


def enrich_commune(code: str) -> bool:
    iris_path = COMMUNE_DIR / code / "iris.geojson"
    dpe_path = DPE_DIR / f"dpe_{code}.json"
    if not iris_path.exists() or not dpe_path.exists():
        return False

    iris_geo = json.loads(iris_path.read_text())
    dpe_list = json.loads(dpe_path.read_text())

    iris_index = []
    for f in iris_geo["features"]:
        geom = shape(f["geometry"])
        iris_index.append({
            "props": f["properties"],
            "geom": geom,
            "prep": prep(geom),
        })

    agg = defaultdict(lambda: {
        "etiquettes": defaultdict(int),
        "annees": [],
    })

    for dpe in dpe_list:
        geo = dpe.get("_geopoint")
        if not geo:
            continue
        try:
            lat, lng = [float(x.strip()) for x in geo.split(",")]
        except Exception:
            continue
        pt = Point(lng, lat)
        for ir in iris_index:
            if ir["prep"].contains(pt):
                code_iris = ir["props"]["code_iris"]
                et = (dpe.get("etiquette_dpe") or "").upper()
                if et in "ABCDEFG":
                    agg[code_iris]["etiquettes"][et] += 1
                annee = dpe.get("annee_construction")
                if annee and isinstance(annee, (int, float)) and 1850 <= annee <= 2030:
                    agg[code_iris]["annees"].append(int(annee))
                break

    for f in iris_geo["features"]:
        code_iris = f["properties"]["code_iris"]
        a = agg.get(code_iris)
        if a:
            total = sum(a["etiquettes"].values())
            f["properties"]["dpe_total"] = total
            f["properties"]["dpe_etiquettes"] = dict(a["etiquettes"])
            if total > 0:
                fg = a["etiquettes"].get("F", 0) + a["etiquettes"].get("G", 0)
                ab = a["etiquettes"].get("A", 0) + a["etiquettes"].get("B", 0)
                f["properties"]["dpe_pct_fg"] = round(fg / total * 100, 1)
                f["properties"]["dpe_pct_ab"] = round(ab / total * 100, 1)
            else:
                f["properties"]["dpe_pct_fg"] = None
                f["properties"]["dpe_pct_ab"] = None
            f["properties"]["annee_construction_median"] = (
                int(statistics.median(a["annees"])) if a["annees"] else None
            )
        else:
            f["properties"]["dpe_total"] = 0
            f["properties"]["dpe_etiquettes"] = {}
            f["properties"]["dpe_pct_fg"] = None
            f["properties"]["dpe_pct_ab"] = None
            f["properties"]["annee_construction_median"] = None

    iris_path.write_text(json.dumps(iris_geo, ensure_ascii=False))
    n_with = sum(1 for f in iris_geo["features"] if f["properties"]["dpe_total"] > 0)
    print(f"OK {code} : {n_with}/{len(iris_geo['features'])} IRIS enrichis DPE")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    g = parser.add_mutually_exclusive_group(required=True)
    g.add_argument("--code-insee")
    g.add_argument("--targets")
    args = parser.parse_args()

    codes = [args.code_insee] if args.code_insee else json.loads(Path(args.targets).read_text())
    ok = fail = 0
    for code in codes:
        if enrich_commune(code):
            ok += 1
        else:
            fail += 1
            print(f"  ✗ {code} (iris ou dpe manquant)")
    print(f"\nTotal : {ok} OK, {fail} fail")
    return 0


if __name__ == "__main__":
    sys.exit(main())
