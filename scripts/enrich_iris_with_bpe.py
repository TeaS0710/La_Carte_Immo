#!/usr/bin/env python3
"""
Enrichit iris.geojson avec les agrégats BPE 2024 par IRIS, via la colonne
`DCIRIS` (déjà calculée par INSEE — pas de spatial join nécessaire).

Ajoute par feature IRIS :
  - bpe_total
  - bpe_commerces      (DOM == 'B')
  - bpe_enseignement   (DOM == 'C')
  - bpe_sante          (DOM == 'D')
  - bpe_services       (DOM == 'A')
  - bpe_transports     (DOM == 'E')
  - bpe_sport_culture  (DOM == 'F')
  - bpe_tourisme       (DOM == 'G')

Pré-requis : iris.geojson + data/raw/bpe/BPE24_{INSEE}.parquet
(splittés via scripts/split_bpe_by_commune.py).

Usage :
  ./scripts/enrich_iris_with_bpe.py --code-insee 94042
  ./scripts/enrich_iris_with_bpe.py --targets scripts/target_full.json
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
BPE_DIR = ROOT / "data" / "raw" / "bpe"
COMMUNE_DIR = ROOT / "public" / "data" / "commune"

DOM_TO_FIELD = {
    "A": "bpe_services",
    "B": "bpe_commerces",
    "C": "bpe_enseignement",
    "D": "bpe_sante",
    "E": "bpe_transports",
    "F": "bpe_sport_culture",
    "G": "bpe_tourisme",
}


def enrich_commune(code: str) -> bool:
    iris_path = COMMUNE_DIR / code / "iris.geojson"
    bpe_path = BPE_DIR / f"BPE24_{code}.parquet"
    if not iris_path.exists():
        print(f"  ✗ {code} : iris.geojson manquant")
        return False
    if not bpe_path.exists():
        print(f"  ✗ {code} : {bpe_path.name} manquant")
        return False

    df = pd.read_parquet(bpe_path)
    df["DCIRIS"] = df["DCIRIS"].astype(str).str.zfill(9)

    per_iris: dict[str, dict] = defaultdict(lambda: defaultdict(int))
    for _, r in df.iterrows():
        dciris = r["DCIRIS"]
        dom = r.get("DOM")
        per_iris[dciris]["bpe_total"] += 1
        field = DOM_TO_FIELD.get(dom)
        if field:
            per_iris[dciris][field] += 1

    geo = json.loads(iris_path.read_text())
    matched = 0
    for f in geo["features"]:
        ci = (f["properties"].get("code_iris") or "").zfill(9)
        agg = per_iris.get(ci, {})
        if agg:
            matched += 1
        p = f["properties"]
        p["bpe_total"] = int(agg.get("bpe_total", 0))
        for field in DOM_TO_FIELD.values():
            p[field] = int(agg.get(field, 0))

    iris_path.write_text(json.dumps(geo, ensure_ascii=False))
    total = sum(agg.get("bpe_total", 0) for agg in per_iris.values())
    print(f"  ✓ {code} : {matched}/{len(geo['features'])} IRIS enrichis ({total} équipements)")
    return True


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--code-insee")
    g.add_argument("--targets")
    args = p.parse_args()
    codes = [args.code_insee] if args.code_insee else json.loads(Path(args.targets).read_text())
    ok = fail = 0
    for c in codes:
        if enrich_commune(c):
            ok += 1
        else:
            fail += 1
    print(f"\nTotal : {ok} OK, {fail} fail")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
