#!/usr/bin/env python3
"""
Pour chaque IRIS de Saint-Maur, génère via Ollama (gemma3) une courte analyse
"profil acheteur" destinée à être affichée dans IrisCard côté front.

Lit iris.geojson, appelle infer_local.py pour chaque IRIS, et stocke les
réponses dans public/data/saint-maur/iris_analyses.json (keyed by code_iris).

Filtre : par défaut ne traite que les 5 IRIS les mieux classés sur l'attractivité,
sauf si --all est passé.

Usage :
  python3 scripts/generate_iris_analyses.py            # top 5
  python3 scripts/generate_iris_analyses.py --all      # tous (~50 min !)
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IRIS_SRC = ROOT / "public" / "data" / "saint-maur" / "iris.geojson"
OUT = ROOT / "public" / "data" / "saint-maur" / "iris_analyses.json"
INFER = ROOT / "scripts" / "infer_local.py"

PROMPT_TEMPLATE = (
    "En 4 puces brèves (max 25 mots chacune), décris le profil de ce quartier "
    "pour un courtier en crédit immobilier qui veut convaincre une agence "
    "immobilière de devenir partenaire. Cible les éléments qui aident à fermer "
    "une vente : profil acheteur cible, type de bien dominant, dynamique du "
    "marché, équipements clés. Style sobre, professionnel, factuel. Pas "
    "d'invention : si une donnée manque, ne la mentionne pas."
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true", help="traiter tous les IRIS")
    parser.add_argument("--limit", type=int, default=5, help="nombre d'IRIS si pas --all")
    args = parser.parse_args()

    geo = json.loads(IRIS_SRC.read_text())
    features = geo["features"]
    if not args.all:
        # Trier par attractivity_score décroissant
        features = sorted(
            features,
            key=lambda f: f["properties"].get("attractivity_score") or 0,
            reverse=True,
        )[: args.limit]

    # Reprendre les analyses déjà générées si OUT existe
    analyses: dict[str, dict] = {}
    if OUT.exists():
        analyses = json.loads(OUT.read_text())
    print(f"Cache existing : {len(analyses)} IRIS déjà analysés")

    for f in features:
        code = f["properties"].get("code_iris")
        if not code:
            continue
        if code in analyses and analyses[code].get("ok"):
            print(f"  [skip] {code} {f['properties'].get('nom_iris')} (déjà fait)")
            continue
        # find fiche slug : prefix iris-<code>-<slug>
        slug = next(
            (
                f"iris-{code}-{slug_part}"
                for slug_part in [f["properties"].get("nom_iris", "").lower().replace(" ", "-")]
            ),
            None,
        )
        print(f"\n[run] {code} {f['properties'].get('nom_iris')}")
        cmd = [
            sys.executable,
            str(INFER),
            "--model",
            "gemma3:latest",
            "--top-k",
            "1",
            PROMPT_TEMPLATE,
        ]
        if slug:
            cmd = cmd[:-1] + ["--entity", f"iris-{code}", PROMPT_TEMPLATE]
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            if r.returncode == 0:
                # infer_local output : the response is the last block
                # On extrait la dernière section "## Réponse" ou le tout
                text = r.stdout.strip()
                # Cherche la dernière section après "Réponse" si présent
                marker = "## Réponse"
                if marker in text:
                    text = text.split(marker, 1)[1].strip("\n: ")
                analyses[code] = {"ok": True, "text": text}
                print(f"  ✓ {len(text)} chars")
            else:
                analyses[code] = {"ok": False, "error": r.stderr[:500]}
                print(f"  ✗ {r.stderr[:200]}")
        except subprocess.TimeoutExpired:
            analyses[code] = {"ok": False, "error": "timeout 300s"}
            print(f"  ✗ timeout")
        # Sauve incrémentalement
        OUT.write_text(json.dumps(analyses, ensure_ascii=False, indent=2))

    print(f"\nWrote {OUT} ({len([a for a in analyses.values() if a.get('ok')])}/{len(analyses)} success)")


if __name__ == "__main__":
    main()
