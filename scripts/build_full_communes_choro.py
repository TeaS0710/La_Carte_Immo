#!/usr/bin/env python3
"""
Génère public/data/idf/communes_full_choro.geojson : un FeatureCollection
de POLYGONES de contours communaux pour les villes traitées en mode FULL.

Stratégie : on considère "full" une commune ayant pipeline.geojson présent.
Le contour est récupéré via geo.api.gouv.fr/communes/{code}?fields=contour.

Properties par feature :
  code_insee, slug, nom, code_dept, population,
  total_sales, median_price, median_price_per_sqm

Utilisé par RegionMap pour afficher un vrai choroplèthe semi-transparent
à l'échelle régionale (équivalent IRIS d'une ville mais commune-wide).

Usage :
  ./scripts/build_full_communes_choro.py
"""
import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
COMMUNE_DIR = ROOT / "public" / "data" / "commune"
MANIFEST = ROOT / "public" / "data" / "idf" / "communes.json"
OUT = ROOT / "public" / "data" / "idf" / "communes_full_choro.geojson"


def is_full(code_insee: str) -> bool:
    return (COMMUNE_DIR / code_insee / "pipeline.geojson").exists()


def load_stats(code_insee: str) -> dict:
    p = COMMUNE_DIR / code_insee / "stats.json"
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text())
    except Exception:
        return {}


def fetch_contour(code_insee: str) -> dict | None:
    try:
        r = requests.get(
            f"https://geo.api.gouv.fr/communes/{code_insee}",
            params={"fields": "nom,contour,centre,population", "geometry": "contour"},
            timeout=15,
        )
        if r.ok:
            return r.json()
    except Exception:
        pass
    return None


def main() -> int:
    manifest = {c["code_insee"]: c for c in json.loads(MANIFEST.read_text())}
    full_codes = sorted([c for c in manifest if is_full(c)])
    print(f"Communes mode FULL détectées : {len(full_codes)}")

    features = []
    for i, code in enumerate(full_codes, 1):
        ref = manifest.get(code, {})
        stats = load_stats(code)
        data = fetch_contour(code)
        if not data or "contour" not in data:
            print(f"  ⚠  {code} : pas de contour")
            continue
        props = {
            "code_insee": code,
            "slug": ref.get("slug", ""),
            "nom": ref.get("nom", data.get("nom", code)),
            "code_dept": ref.get("code_dept", code[:2]),
            "population": ref.get("population", data.get("population", 0)),
            "total_sales": stats.get("total_sales", 0),
            "median_price": stats.get("median_price"),
            "median_price_per_sqm": stats.get("median_price_per_sqm"),
        }
        features.append({
            "type": "Feature",
            "geometry": data["contour"],
            "properties": props,
        })
        if i % 5 == 0 or i == len(full_codes):
            print(f"  {i}/{len(full_codes)} contours récupérés")
        time.sleep(0.12)

    out = {
        "type": "FeatureCollection",
        "features": features,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False))
    size_kb = OUT.stat().st_size // 1024
    print(f"\nWrote {OUT.relative_to(ROOT)} : {len(features)} polygones, {size_kb} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
