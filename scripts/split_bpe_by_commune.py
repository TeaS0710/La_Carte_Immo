#!/usr/bin/env python3
"""
Split le fichier BPE 2024 entier (data/raw/bpe/BPE24_FULL.parquet, ~175 MB)
en un parquet par commune cible, au format `data/raw/bpe/BPE24_{INSEE}.parquet`
(même format que celui déjà utilisé pour Saint-Maur).

Filtre : DEPCOM == code commune (avec gestion arrondissements Paris :
les DEPCOM Paris dans BPE sont les codes 75101..75120, pas 75056).

Usage :
  ./scripts/split_bpe_by_commune.py --targets scripts/target_full.json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "raw" / "bpe" / "BPE24_FULL.parquet"
OUT_DIR = ROOT / "data" / "raw" / "bpe"


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--targets", required=True)
    args = p.parse_args()

    if not SRC.exists():
        print(f"ERR : {SRC} introuvable", file=sys.stderr)
        return 1

    targets = json.loads(Path(args.targets).read_text())
    print(f"Lecture {SRC.name} ({SRC.stat().st_size // (1024*1024)} MB)...")
    df = pd.read_parquet(SRC)
    df["DEPCOM"] = df["DEPCOM"].astype(str).str.zfill(5)
    print(f"  {len(df):,} lignes total ; {df['DEPCOM'].nunique():,} communes")

    ok = miss = 0
    for code in targets:
        sub = df[df["DEPCOM"] == code]
        if sub.empty:
            print(f"  ✗ {code} : 0 équipements")
            miss += 1
            continue
        out = OUT_DIR / f"BPE24_{code}.parquet"
        sub.to_parquet(out, index=False)
        # quick stats
        dom_counts = sub["DOM"].value_counts().to_dict()
        print(f"  ✓ {code} : {len(sub):4d} équipements ({dom_counts})")
        ok += 1
    print(f"\nTotal : {ok} OK, {miss} 0-équip")
    return 0


if __name__ == "__main__":
    sys.exit(main())
