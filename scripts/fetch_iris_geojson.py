#!/usr/bin/env python3
"""
Télécharge les contours IRIS pour les communes cibles via l'API
opendatasoft georef-france-iris (équivalent INSEE/IGN CONTOURS-IRIS).

Sortie : data/raw/iris/iris_{code_insee}.geojson (un par commune)

Usage :
  ./scripts/fetch_iris_geojson.py --targets scripts/target_full.json
"""
import argparse
import json
import sys
import time
from collections import defaultdict
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "raw" / "iris"
OUT_DIR.mkdir(parents=True, exist_ok=True)

API = "https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/georef-france-iris/records"


def fetch_all_iris(dept_codes: list[str]) -> list[dict]:
    """Pagine sur tous les IRIS des départements demandés."""
    all_results: list[dict] = []
    where = " OR ".join([f'dep_code="{d}"' for d in dept_codes])
    limit = 100
    offset = 0
    while True:
        r = requests.get(API, params={
            "where": where,
            "limit": limit,
            "offset": offset,
        }, timeout=30)
        if not r.ok:
            print(f"  ! HTTP {r.status_code} at offset {offset}", file=sys.stderr)
            break
        data = r.json()
        results = data.get("results", [])
        if not results:
            break
        all_results.extend(results)
        if len(results) < limit:
            break
        offset += limit
        # OpenDataSoft hard limit 10000
        if offset >= 10000:
            break
        time.sleep(0.1)
    return all_results


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--targets", required=True, help="JSON liste de codes INSEE")
    parser.add_argument("--depts", nargs="+", default=None,
                        help="Départements à requêter (sinon dérivé des cibles)")
    args = parser.parse_args()

    targets = set(json.loads(Path(args.targets).read_text()))
    # Pour les arrondissements Paris (75101-75120), le com_code dans
    # opendatasoft est 75056 (Paris commune) mais com_arm_code est 751XX.
    arr_codes = {t for t in targets if t.startswith("751") and len(t) == 5}
    com_codes = targets - arr_codes
    print(f"Cibles : {len(targets)} ({len(com_codes)} communes 'normales' + {len(arr_codes)} arr Paris)")

    if args.depts:
        depts = args.depts
    else:
        depts = sorted({t[:2] for t in targets})
    print(f"Départements à fetcher : {depts}")

    all_iris = fetch_all_iris(depts)
    print(f"  {len(all_iris)} IRIS récupérés via API")

    # Groupe par code commune cible
    # Pour Paris : groupe par com_arm_code (75101-75120)
    # Pour autres : groupe par com_code
    def _scalar(v):
        if isinstance(v, list):
            return v[0] if v else None
        return v

    by_commune: dict[str, list[dict]] = defaultdict(list)
    for it in all_iris:
        com_arm = _scalar(it.get("com_arm_code"))
        com = _scalar(it.get("com_code"))
        if com_arm and com_arm in arr_codes:
            by_commune[com_arm].append(it)
        elif com and com in com_codes:
            by_commune[com].append(it)

    # Écrit un fichier GeoJSON par commune cible
    written = 0
    for code in sorted(targets):
        items = by_commune.get(code, [])
        if not items:
            print(f"  ⚠  {code} : aucun IRIS trouvé")
            continue
        features = []
        for it in items:
            # Format properties compatible avec ce qu'attendent les scripts
            # downstream. opendatasoft retourne souvent iris_code et iris_name
            # en LISTE multivalue → extraire le scalaire pour cohérence.
            props = {
                "code_iris": _scalar(it.get("iris_code")) or "",
                "nom_iris": _scalar(it.get("iris_name")) or _scalar(it.get("iris_name_upper")) or "",
                "type_iris": _scalar(it.get("iris_type")) or "Z",
            }
            features.append({
                "type": "Feature",
                "geometry": it.get("geo_shape", {}).get("geometry"),
                "properties": props,
            })
        out = OUT_DIR / f"iris_{code}.geojson"
        out.write_text(json.dumps({
            "type": "FeatureCollection",
            "features": features,
        }, ensure_ascii=False))
        written += 1
        if written % 5 == 0:
            print(f"  {written}/{len(targets)} écrits…")
    print(f"\nTotal : {written} fichiers iris_*.geojson écrits dans {OUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
