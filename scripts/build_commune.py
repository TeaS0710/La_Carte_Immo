#!/usr/bin/env python3
"""
Orchestrateur pipeline complet pour UNE commune.

Pour chaque commune (identifiée par code INSEE), enchaîne :
  1. Téléchargement / extraction DVF (transactions)
  2. Téléchargement / extraction IRIS INSEE (population, profils CSP, etc.)
  3. Téléchargement / extraction DPE ADEME
  4. Téléchargement / extraction cadastre IGN (parcelles, bâti modifié)
  5. Agrégations IRIS × DVF
  6. Calcul pipeline de ventes probables (modèle calibré)
  7. Génération projection ARIMA + bootstrap
  8. Enrichissements Géorisques + transport
  9. Génération analyses LLM par IRIS (Ollama Cloud)
  10. Audit factualité des analyses

Output : public/data/commune/{code_insee}/*.json|geojson

Usage :
  ./scripts/build_commune.py --code-insee 94068
  ./scripts/build_commune.py --code-insee 94068 --skip-llm    # rapide, sans LLM
  ./scripts/build_commune.py --code-insee 94068 --only georisques
  ./scripts/build_commune.py --batch idf.json                  # liste de communes

Cet orchestrateur est CONÇU POUR ÊTRE INTERRUPTIBLE et REPRENDRE
là où il s'est arrêté (chaque étape skip si output déjà à jour).
"""
import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"


STEPS = [
    ("dvf", "build_dvf_dataset.py", "Téléchargement et extraction DVF"),
    ("iris", "enrich_iris_aggregates.py", "Agrégations INSEE × DVF par IRIS"),
    ("streets", "enrich_streets_with_iris.py", "Rattachement rues → IRIS"),
    ("permits", "build_permits_dataset.py", "Permits cadastre IGN"),
    ("pipeline", "build_pipeline_dataset.py", "Pipeline ventes probables (DPE)"),
    ("calibration", "calibrate_pipeline_model.py", "Calibration du modèle de probabilité"),
    ("projection", "build_projection_models.py", "Projection ARIMA + bootstrap"),
    ("georisques", "enrich_commune_extras.py", "Risques Géorisques + transport"),
    ("kb", "build_knowledge_base.py", "Knowledge base consolidée"),
    ("analyses", "run_iris_qwen3_analyses.py", "Analyses LLM par IRIS (Ollama Cloud)"),
    ("factuality", "check_analyses_factuality.py", "Audit factualité des chiffres"),
]


def run_step(name: str, script: str, code_insee: str, extra_args: list[str]) -> bool:
    """Exécute un script avec --code-insee. Retourne True si succès."""
    cmd = [sys.executable, str(SCRIPTS / script), "--code-insee", code_insee] + extra_args
    print(f"\n{'═' * 70}")
    print(f"  [{name}] {script}")
    print(f"{'═' * 70}")
    start = time.time()
    try:
        result = subprocess.run(cmd, check=False)
        elapsed = time.time() - start
        if result.returncode != 0:
            print(f"  ⚠  {script} returned {result.returncode} (failed in {elapsed:.1f}s)")
            return False
        print(f"  ✓ {script} done in {elapsed:.1f}s")
        return True
    except FileNotFoundError:
        print(f"  ⚠  {script} not found — skipping")
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    grp = parser.add_mutually_exclusive_group(required=True)
    grp.add_argument("--code-insee", help="Code INSEE 5 chiffres")
    grp.add_argument("--batch", help="JSON liste de codes INSEE à traiter")
    parser.add_argument("--only", choices=[s[0] for s in STEPS], help="Exécute uniquement cette étape")
    parser.add_argument("--skip-llm", action="store_true", help="Saute les étapes coûteuses LLM (analyses + factuality)")
    parser.add_argument("--continue-on-error", action="store_true", help="Continue même si une étape échoue")
    args = parser.parse_args()

    if args.batch:
        codes = json.loads(Path(args.batch).read_text())
        if not isinstance(codes, list):
            print("Batch JSON doit être une liste de codes INSEE", file=sys.stderr)
            return 2
    else:
        codes = [args.code_insee]

    overall_ok = True
    for code in codes:
        print(f"\n{'#' * 70}")
        print(f"# COMMUNE {code}")
        print(f"{'#' * 70}")

        steps_to_run = STEPS
        if args.only:
            steps_to_run = [s for s in STEPS if s[0] == args.only]
        elif args.skip_llm:
            steps_to_run = [s for s in STEPS if s[0] not in ("analyses", "factuality")]

        for name, script, label in steps_to_run:
            ok = run_step(name, script, code, [])
            if not ok and not args.continue_on_error:
                print(f"\n✗ Pipeline interrompu pour {code} à l'étape {name}")
                overall_ok = False
                break

    return 0 if overall_ok else 1


if __name__ == "__main__":
    sys.exit(main())
