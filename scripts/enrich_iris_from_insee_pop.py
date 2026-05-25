#!/usr/bin/env python3
"""
Enrichit `public/data/commune/{code}/iris.geojson` avec les indicateurs
issus du fichier INSEE bulk pop 2020 splitté (data/raw/insee/base_pop_2020_{code}.csv).

Calculs par IRIS :
  - population         = P20_POP            (entier)
  - pct_cadres         = C20_POP15P_CS3 / C20_POP15P  × 100
  - pct_etrangers      = P20_POP_ETR / P20_POP × 100
  - pct_0_14           = P20_POP0014 / P20_POP × 100
  - pct_65p            = P20_POP65P / P20_POP × 100

Conserve `population_est` (DPE-density) si présent pour traçabilité, mais
remplace `population` par la valeur INSEE quand elle est connue (>0).

Usage :
  ./scripts/enrich_iris_from_insee_pop.py --code-insee 94042
  ./scripts/enrich_iris_from_insee_pop.py --targets scripts/target_full.json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
INSEE_DIR = ROOT / "data" / "raw" / "insee"
COMMUNE_DIR = ROOT / "public" / "data" / "commune"


def _safe_div(num, den):
    try:
        if not den or den <= 0:
            return None
        return round(float(num) / float(den) * 100, 1)
    except Exception:
        return None


def _to_float(v):
    try:
        if v is None or v == "" or pd.isna(v):
            return None
        return float(v)
    except Exception:
        return None


def enrich_commune(code: str) -> bool:
    iris_path = COMMUNE_DIR / code / "iris.geojson"
    csv_path = INSEE_DIR / f"base_pop_2020_{code}.csv"
    if not iris_path.exists():
        print(f"  ✗ {code} : iris.geojson manquant")
        return False
    if not csv_path.exists():
        print(f"  ✗ {code} : {csv_path.name} manquant (run split_insee_bulk.py)")
        return False

    df = pd.read_csv(csv_path, sep=";", dtype={"IRIS": str, "COM": str}, low_memory=False)
    df["IRIS"] = df["IRIS"].astype(str).str.zfill(9)

    rows = {r["IRIS"]: r for _, r in df.iterrows()}

    geo = json.loads(iris_path.read_text())
    matched = 0
    for f in geo["features"]:
        code_iris = (f["properties"].get("code_iris") or "").zfill(9)
        r = rows.get(code_iris)
        if r is None:
            continue
        matched += 1
        pop = _to_float(r.get("P20_POP"))
        p15p = _to_float(r.get("C20_POP15P"))
        cs3 = _to_float(r.get("C20_POP15P_CS3"))
        etr = _to_float(r.get("P20_POP_ETR"))
        p0014 = _to_float(r.get("P20_POP0014"))
        p65p = _to_float(r.get("P20_POP65P"))

        if pop is not None and pop > 0:
            f["properties"]["population"] = int(round(pop))
            f["properties"]["pop_estimation_method"] = "insee_2020"
        f["properties"]["pct_cadres"] = _safe_div(cs3, p15p)
        f["properties"]["pct_etrangers"] = _safe_div(etr, pop)
        f["properties"]["pct_0_14"] = _safe_div(p0014, pop)
        f["properties"]["pct_65p"] = _safe_div(p65p, pop)

    iris_path.write_text(json.dumps(geo, ensure_ascii=False))
    print(f"  ✓ {code} : {matched}/{len(geo['features'])} IRIS matchés")
    return matched > 0


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--code-insee")
    g.add_argument("--targets")
    args = p.parse_args()

    codes = [args.code_insee] if args.code_insee else json.loads(Path(args.targets).read_text())
    ok = fail = 0
    for code in codes:
        if enrich_commune(code):
            ok += 1
        else:
            fail += 1
    print(f"\nTotal : {ok} OK, {fail} fail")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
