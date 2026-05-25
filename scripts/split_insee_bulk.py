#!/usr/bin/env python3
"""
Split un CSV INSEE Recensement bulk (téléchargé entier depuis insee.fr)
en fichiers par commune cible, au format `base_{theme}_{annee}_{INSEE}.csv`
(même format que celui déjà utilisé pour Saint-Maur dans data/raw/insee/).

Le bulk pop 2020 a été récupéré sous /tmp/insee_extract/base-ic-evol-struct-pop-2020.CSV
(séparateur `;`, encoding latin-1, IRIS=9 chiffres, COM=5 chiffres).

Usage :
  ./scripts/split_insee_bulk.py --src /tmp/insee_extract/base-ic-evol-struct-pop-2020.CSV \
      --theme pop --year 2020 --targets scripts/target_full.json

Sortie : data/raw/insee/base_{theme}_{year}_{INSEE}.csv pour chaque code INSEE
trouvé dans `targets`.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "raw" / "insee"


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--src", required=True, help="Chemin du CSV bulk INSEE extrait")
    p.add_argument("--theme", required=True, choices=["pop", "log", "cfm", "dpl"])
    p.add_argument("--year", required=True, type=int)
    p.add_argument("--targets", required=True, help="JSON liste de codes INSEE (5 chiffres)")
    p.add_argument("--encoding", default="latin-1")
    p.add_argument("--sep", default=";")
    args = p.parse_args()

    src = Path(args.src)
    if not src.exists():
        print(f"ERR : source introuvable {src}", file=sys.stderr)
        return 1

    targets = json.loads(Path(args.targets).read_text())
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Lecture {src.name} ({src.stat().st_size // (1024*1024)} MB) ...")
    df = pd.read_csv(src, sep=args.sep, encoding=args.encoding, dtype={"IRIS": str, "COM": str}, low_memory=False)
    df["IRIS"] = df["IRIS"].astype(str).str.zfill(9)
    df["COM"] = df["COM"].astype(str).str.zfill(5)
    print(f"  {len(df):,} lignes, {df['COM'].nunique():,} communes uniques")

    ok = miss = 0
    for code in targets:
        # Cas général : COM == code (Hauts-de-Seine, Val-de-Marne, ...)
        # Cas Paris : Le bulk utilise COM=75101..75120 (arrondissements), pas 75056.
        sub = df[df["COM"] == code]
        if sub.empty:
            # Fallback : préfixe IRIS (au cas où la colonne COM est mal encodée)
            sub = df[df["IRIS"].str.startswith(code)]
        if sub.empty:
            print(f"  ✗ {code} : aucune ligne")
            miss += 1
            continue
        out = OUT_DIR / f"base_{args.theme}_{args.year}_{code}.csv"
        sub.to_csv(out, index=False, sep=";", encoding="utf-8")
        print(f"  ✓ {code} : {len(sub)} IRIS → {out.name}")
        ok += 1

    print(f"\nTotal : {ok} OK, {miss} manquantes")
    return 0 if miss == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
