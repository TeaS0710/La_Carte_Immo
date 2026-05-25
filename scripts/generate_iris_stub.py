#!/usr/bin/env python3
"""
Génère un iris.geojson MINIMAL pour les communes qui n'ont pas de découpage
IRIS détaillé (= mode partiel). Le "stub" contient 1 seule feature qui est
le contour de la commune entière, avec les agrégats DVF déjà calculés.

Permet aux composants frontend (choroplèthe IRIS, IrisCard) de fonctionner
sur n'importe quelle commune, même sans avoir téléchargé le shapefile
INSEE complet. Bien sûr, on n'aura pas la granularité quartier.

Usage :
  ./scripts/generate_iris_stub.py --code-insee 75112
  ./scripts/generate_iris_stub.py --all-missing    # boucle sur toutes les
                                                    # communes ayant stats.json
                                                    # mais pas iris.geojson
"""
import argparse
import json
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
COMMUNE_DIR = ROOT / "public" / "data" / "commune"
MANIFEST = ROOT / "public" / "data" / "idf" / "communes.json"


def fetch_contour(code_insee: str) -> dict | None:
    """Récupère le contour GeoJSON de la commune via geo.api.gouv.fr."""
    url = f"https://geo.api.gouv.fr/communes/{code_insee}"
    try:
        r = requests.get(
            url,
            params={"fields": "nom,code,contour,centre,population", "geometry": "contour"},
            timeout=15,
        )
        if not r.ok:
            return None
        return r.json()
    except Exception:
        return None


def build_stub(code_insee: str, force: bool = False) -> bool:
    """Génère iris.geojson stub pour la commune. Retourne True si succès."""
    cdir = COMMUNE_DIR / code_insee
    if not cdir.exists():
        return False
    iris_path = cdir / "iris.geojson"
    if iris_path.exists() and not force:
        return False  # déjà existant
    stats_path = cdir / "stats.json"
    if not stats_path.exists():
        return False

    stats = json.loads(stats_path.read_text())
    data = fetch_contour(code_insee)
    if not data or "contour" not in data:
        return False

    # Properties IRIS minimales — un seul "IRIS" = commune entière
    props = {
        "code_iris": f"{code_insee}0000",
        "nom_iris": stats.get("commune", data.get("nom", code_insee)) + " (commune entière)",
        "type_iris": "Z",  # zone agrégée
        "lat": data["centre"]["coordinates"][1] if data.get("centre") else None,
        "lng": data["centre"]["coordinates"][0] if data.get("centre") else None,
        # Agrégats DVF déjà calculés
        "dvf_sales_total": stats.get("total_sales", 0),
        "dvf_sales_appt": 0,  # non décomposé au niveau stub
        "dvf_sales_maison": 0,
        "dvf_median_price": stats.get("median_price"),
        "dvf_median_ppsqm": stats.get("median_price_per_sqm"),
        "dvf_by_year": json.dumps(stats.get("by_year", [])),
        # Démographie : population brute, le reste null (pas d'INSEE par IRIS)
        "population": data.get("population", 0),
        "n_log": None,
        "n_rp": None,
        "pct_proprio": None, "pct_hlm": None, "pct_appart": None,
        "pct_cadres": None, "pct_bac5p": None, "pct_etrangers": None,
        "pct_0_14": None, "pct_65p": None,
        "bpe_total": None, "bpe_commerces": None, "bpe_enseignement": None, "bpe_sante": None,
        "dpe": None,
        "attractivity_score": None,
        "rank_attractivity_score": None,
        "rank_total_attractivity_score": 1,
        "commune_avg": None,
        "is_stub": True,  # marqueur pour le frontend
    }

    geo = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": data["contour"],
            "properties": props,
        }],
    }
    iris_path.write_text(json.dumps(geo, ensure_ascii=False))
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    g = parser.add_mutually_exclusive_group(required=True)
    g.add_argument("--code-insee", help="Code INSEE 5 chiffres")
    g.add_argument("--all-missing", action="store_true",
                   help="Toutes les communes ayant stats.json sans iris.geojson")
    parser.add_argument("--force", action="store_true",
                        help="Réécrit même si iris.geojson existe déjà")
    parser.add_argument("--delay", type=float, default=0.15,
                        help="Pause entre fetches (rate limit API)")
    args = parser.parse_args()

    if args.code_insee:
        ok = build_stub(args.code_insee, args.force)
        print(f"{'✓' if ok else '✗'} {args.code_insee}")
        return 0 if ok else 1

    # --all-missing : scan toutes les communes
    if not COMMUNE_DIR.exists():
        print("public/data/commune/ absent", file=sys.stderr)
        return 1
    candidates = []
    for d in sorted(COMMUNE_DIR.iterdir()):
        if not d.is_dir():
            continue
        if (d / "stats.json").exists() and (args.force or not (d / "iris.geojson").exists()):
            candidates.append(d.name)
    print(f"À générer : {len(candidates)} communes")
    ok_count = fail_count = 0
    for i, code in enumerate(candidates, 1):
        ok = build_stub(code, args.force)
        if ok:
            ok_count += 1
        else:
            fail_count += 1
        if i % 20 == 0 or i == len(candidates):
            print(f"  {i}/{len(candidates)} · OK {ok_count} · KO {fail_count}")
        time.sleep(args.delay)
    print(f"\nTotal : {ok_count} stubs générés, {fail_count} échecs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
