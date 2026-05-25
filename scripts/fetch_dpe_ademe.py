#!/usr/bin/env python3
"""
Télécharge les DPE ADEME (Logements existants depuis juillet 2021) pour
une liste de communes. Stocke un fichier JSON par commune sous
data/raw/dpe/dpe_{code_insee}.json (compatible format Saint-Maur existant).

Usage :
  ./scripts/fetch_dpe_ademe.py --targets scripts/target_full.json
  ./scripts/fetch_dpe_ademe.py --code 94068
"""
import argparse
import json
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "raw" / "dpe"
OUT_DIR.mkdir(parents=True, exist_ok=True)

DATASET = "meg-83tjwtg8dyz4vv7h1dqe"  # DPE Logements existants depuis 07/2021
API = f"https://data.ademe.fr/data-fair/api/v1/datasets/{DATASET}/lines"

# Champs essentiels pour le pipeline (réduit le volume)
FIELDS = [
    "numero_dpe", "code_insee_ban", "adresse_ban", "numero_voie_ban",
    "nom_rue_ban", "type_batiment", "annee_construction", "periode_construction",
    "surface_habitable_logement", "etiquette_dpe", "etiquette_ges",
    "type_energie_principale_chauffage", "date_fin_validite_dpe",
    "_geopoint", "identifiant_ban", "score_ban",
]


def fetch_commune(code_insee: str, force: bool = False) -> tuple[int, str]:
    out = OUT_DIR / f"dpe_{code_insee}.json"
    if out.exists() and not force:
        return 0, "skip (existe)"
    all_items = []
    page_size = 10000
    after = None
    started = time.time()
    while True:
        params = {
            "qs": f'code_insee_ban:"{code_insee}"',
            "size": page_size,
            "select": ",".join(FIELDS),
            "sort": "numero_dpe",
        }
        if after:
            params["after"] = after
        try:
            r = requests.get(API, params=params, timeout=60)
            if not r.ok:
                return -1, f"HTTP {r.status_code}"
            data = r.json()
        except Exception as e:
            return -1, f"err {e}"
        items = data.get("results") or []
        if not items:
            break
        all_items.extend(items)
        # Pagination "after" : la valeur du dernier numero_dpe
        last_value = items[-1].get("numero_dpe")
        if not last_value or len(items) < page_size:
            break
        after = last_value
        time.sleep(0.3)  # rate limit léger
        if len(all_items) > 200000:  # garde-fou
            break
    out.write_text(json.dumps(all_items, ensure_ascii=False))
    elapsed = int(time.time() - started)
    return len(all_items), f"{len(all_items)} DPE en {elapsed}s, {out.stat().st_size//1024} KB"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    g = parser.add_mutually_exclusive_group(required=True)
    g.add_argument("--code", help="Un seul code INSEE")
    g.add_argument("--targets", help="JSON liste de codes INSEE")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    codes = [args.code] if args.code else json.loads(Path(args.targets).read_text())
    print(f"DL DPE pour {len(codes)} commune(s)")
    total_dpe = 0
    fails = 0
    for i, code in enumerate(codes, 1):
        n, msg = fetch_commune(code, args.force)
        tag = "✓" if n >= 0 else "✗"
        print(f"  [{i}/{len(codes)}] {tag} {code} → {msg}")
        if n >= 0:
            total_dpe += n
        else:
            fails += 1
    print(f"\nTotal : {total_dpe:,} DPE téléchargés, {fails} échecs")
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
