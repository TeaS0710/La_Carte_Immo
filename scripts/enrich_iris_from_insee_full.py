#!/usr/bin/env python3
"""
Enrichit iris.geojson avec les indicateurs INSEE 2020 calculés à partir
de TOUS les fichiers bulk splittés (pop, log, dpl) :

  - population         (P20_POP)
  - pct_cadres         (C20_POP15P_CS3 / C20_POP15P)
  - pct_etrangers      (P20_POP_ETR / P20_POP)
  - pct_0_14           (P20_POP0014 / P20_POP)
  - pct_65p            (P20_POP65P / P20_POP)
  - pct_proprio        (P20_RP_PROP / P20_RP)
  - pct_hlm            (P20_RP_LOCHLMV / P20_RP)
  - pct_appart         (P20_APPART / P20_LOG)
  - pct_bac5p          (P20_NSCOL15P_SUP5 / P20_NSCOL15P)
  - n_log              (P20_LOG)
  - n_rp               (P20_RP)

Le fichier cfm (couples-familles-ménages) est pas utilisé pour les pct_*
de IrisCard, mais on peut l'ajouter plus tard (ex : pct_familles).

Usage :
  ./scripts/enrich_iris_from_insee_full.py --code-insee 94042
  ./scripts/enrich_iris_from_insee_full.py --targets scripts/target_full.json
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


def _f(v):
    try:
        if v is None or v == "" or pd.isna(v):
            return None
        return float(v)
    except Exception:
        return None


def _pct(num, den):
    n = _f(num)
    d = _f(den)
    if n is None or d is None or d <= 0:
        return None
    return round(n / d * 100, 1)


def _load(theme: str, code: str, year: int = 2020) -> dict:
    """Returns {iris_code(9): {col: value}}"""
    p = INSEE_DIR / f"base_{theme}_{year}_{code}.csv"
    if not p.exists():
        return {}
    df = pd.read_csv(p, sep=";", dtype={"IRIS": str, "COM": str}, low_memory=False)
    df["IRIS"] = df["IRIS"].astype(str).str.zfill(9)
    return {r["IRIS"]: r.to_dict() for _, r in df.iterrows()}


def enrich_commune(code: str) -> bool:
    iris_path = COMMUNE_DIR / code / "iris.geojson"
    if not iris_path.exists():
        print(f"  ✗ {code} : iris.geojson manquant")
        return False

    pop = _load("pop", code)
    log = _load("log", code)
    dpl = _load("dpl", code)

    if not pop:
        print(f"  ✗ {code} : aucun pop CSV")
        return False

    geo = json.loads(iris_path.read_text())
    matched = 0
    for f in geo["features"]:
        ci = (f["properties"].get("code_iris") or "").zfill(9)
        rp = pop.get(ci)
        rl = log.get(ci, {})
        rd = dpl.get(ci, {})
        if rp is None:
            continue
        matched += 1
        # Pop
        p = f["properties"]
        pop_val = _f(rp.get("P20_POP"))
        if pop_val and pop_val > 0:
            p["population"] = int(round(pop_val))
            p["pop_estimation_method"] = "insee_2020"
        p["pct_cadres"] = _pct(rp.get("C20_POP15P_CS3"), rp.get("C20_POP15P"))
        p["pct_etrangers"] = _pct(rp.get("P20_POP_ETR"), rp.get("P20_POP"))
        p["pct_0_14"] = _pct(rp.get("P20_POP0014"), rp.get("P20_POP"))
        p["pct_65p"] = _pct(rp.get("P20_POP65P"), rp.get("P20_POP"))
        # Logement
        n_log = _f(rl.get("P20_LOG"))
        n_rp = _f(rl.get("P20_RP"))
        if n_log is not None:
            p["n_log"] = int(round(n_log))
        if n_rp is not None:
            p["n_rp"] = int(round(n_rp))
        p["pct_proprio"] = _pct(rl.get("P20_RP_PROP"), rl.get("P20_RP"))
        p["pct_hlm"] = _pct(rl.get("P20_RP_LOCHLMV"), rl.get("P20_RP"))
        p["pct_appart"] = _pct(rl.get("P20_APPART"), rl.get("P20_LOG"))
        # Diplômes
        p["pct_bac5p"] = _pct(rd.get("P20_NSCOL15P_SUP5"), rd.get("P20_NSCOL15P"))

    iris_path.write_text(json.dumps(geo, ensure_ascii=False))
    print(f"  ✓ {code} : {matched}/{len(geo['features'])} IRIS enrichis")
    return matched > 0


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
