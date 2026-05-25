#!/usr/bin/env python3
"""
Estime la population par IRIS à partir de la densité DPE (chaque diagnostic
= 1 logement ≈ 1 ménage). Faute d'accès au INSEE Recensement bulk 2021,
c'est une approximation correcte pour situer chaque quartier.

Méthode : pop_iris = pop_commune × (dpe_iris / dpe_commune_total)

Ajoute au iris.geojson :
  - population_est (estimation entière)
  - pop_estimation_method ("dpe_density" pour traçabilité)

Usage :
  ./scripts/estimate_iris_population.py --targets scripts/target_full.json
"""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COMMUNE_DIR = ROOT / "public" / "data" / "commune"
MANIFEST = ROOT / "public" / "data" / "idf" / "communes.json"


def estimate_for_commune(code: str, manifest: dict) -> bool:
    cdir = COMMUNE_DIR / code
    iris_path = cdir / "iris.geojson"
    if not iris_path.exists():
        return False
    geo = json.loads(iris_path.read_text())

    ref = manifest.get(code, {})
    pop_commune = ref.get("population")
    if not pop_commune:
        return False

    total_dpe = sum(f["properties"].get("dpe_total", 0) for f in geo["features"])
    n_iris = len(geo["features"])
    for f in geo["features"]:
        dpe_n = f["properties"].get("dpe_total", 0)
        if total_dpe > 0:
            est = round(pop_commune * dpe_n / total_dpe)
        else:
            # Pas de DPE → répartition uniforme
            est = round(pop_commune / max(1, n_iris))
        f["properties"]["population_est"] = est
        f["properties"]["pop_estimation_method"] = "dpe_density" if total_dpe > 0 else "uniform"
        # Aussi : si pas de population déjà dans props (cas iris stub), on
        # met population_est = population
        if not f["properties"].get("population"):
            f["properties"]["population"] = est

    iris_path.write_text(json.dumps(geo, ensure_ascii=False))
    print(f"OK {code} ({ref.get('nom', '?')}) : pop_commune={pop_commune}, "
          f"{n_iris} IRIS estimés")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    g = parser.add_mutually_exclusive_group(required=True)
    g.add_argument("--code-insee")
    g.add_argument("--targets")
    args = parser.parse_args()
    manifest = {c["code_insee"]: c for c in json.loads(MANIFEST.read_text())}
    codes = [args.code_insee] if args.code_insee else json.loads(Path(args.targets).read_text())
    ok = fail = 0
    for code in codes:
        if estimate_for_commune(code, manifest):
            ok += 1
        else:
            fail += 1
    print(f"\nTotal : {ok} OK, {fail} fail")
    return 0


if __name__ == "__main__":
    sys.exit(main())
