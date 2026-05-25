#!/usr/bin/env python3
"""
Récupère via l'API recherche-entreprises.api.gouv.fr la liste des
entreprises actives par commune cible et par NAF d'intérêt (mêmes
NAF que le build de Saint-Maur — agences immo, restos, écoles, etc.).

Sortie : data/raw/sirene/sirene_{INSEE}_targets.json (liste de SIREN
au même format que sirene_94068_targets.json existant).

Usage :
  ./scripts/fetch_sirene_per_commune.py --targets scripts/target_full.json
  ./scripts/fetch_sirene_per_commune.py --code-insee 94042
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "raw" / "sirene"
API = "https://recherche-entreprises.api.gouv.fr/search"

NAF_TARGETS = [
    "68.31Z",  # Agences immobilières
    "56.10A",  # Restauration traditionnelle
    "68.32A",  # Administration d'immeubles
    "66.19B",  # Courtage / intermédiation financière
    "47.11B",  # Supérette
    "56.30Z",  # Débits de boissons
    "47.81Z",  # Commerce détail sur éventaires alimentaire
    "70.10Z",  # Sièges sociaux
    "68.32B",  # Supports juridiques
    "47.11D",  # Supermarchés
    "85.31Z",  # Enseignement secondaire général
    "87.10A",  # Hébergement médicalisé personnes âgées
]


def fetch(code_commune: str, naf: str, page: int) -> dict:
    params = {
        "activite_principale": naf,
        "code_commune": code_commune,
        "etat_administratif": "A",
        "per_page": 25,
        "page": page,
    }
    for attempt in range(3):
        try:
            r = requests.get(API, params=params, timeout=20)
            if r.status_code == 429:
                time.sleep(2)
                continue
            r.raise_for_status()
            return r.json()
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2)
    return {}


def fetch_commune(code: str, force: bool = False) -> int:
    out = OUT_DIR / f"sirene_{code}_targets.json"
    if out.exists() and not force:
        existing = json.loads(out.read_text())
        if isinstance(existing, list) and existing:
            print(f"  - {code} déjà à jour ({len(existing)} entreprises) — skip")
            return len(existing)

    all_results: list[dict] = []
    seen_siren: set[str] = set()
    for naf in NAF_TARGETS:
        page = 1
        while True:
            d = fetch(code, naf, page)
            total = d.get("total_results", 0)
            results = d.get("results") or []
            if not results:
                break
            for r in results:
                siren = r.get("siren")
                if siren and siren not in seen_siren:
                    seen_siren.add(siren)
                    all_results.append(r)
            if page * 25 >= total or page >= 40:
                break
            page += 1
            time.sleep(0.15)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(all_results, ensure_ascii=False))
    return len(all_results)


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--code-insee")
    g.add_argument("--targets")
    p.add_argument("--force", action="store_true")
    args = p.parse_args()
    codes = [args.code_insee] if args.code_insee else json.loads(Path(args.targets).read_text())
    t0 = time.time()
    for i, code in enumerate(codes, 1):
        try:
            n = fetch_commune(code, force=args.force)
            print(f"  [{i}/{len(codes)}] {code} : {n} entreprises")
        except Exception as e:
            print(f"  [{i}/{len(codes)}] {code} : FAIL {e}")
    print(f"\nFini en {int(time.time() - t0)}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
