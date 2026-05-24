#!/usr/bin/env python3
"""
Génère pour chaque IRIS d'une commune une analyse "qualité industrielle" via
Ollama qwen3:32b / gpt-oss:120b-cloud avec :
  - Few-shot prompting (2 exemples calibrés)
  - Format structuré obligatoire (Profil acheteur / Bien dominant / Dynamique /
    Risques / Recommandation tactique)
  - Décomposition explicite des signaux quantifiés citée par le modèle

Output : public/data/commune/{code_insee}/iris_analyses.json (incrémental,
reprend après interruption). Une exécution ~3 min par IRIS — 34 IRIS = ~100 min.

Usage :
  python3 scripts/run_iris_qwen3_analyses.py --code-insee 94068
  python3 scripts/run_iris_qwen3_analyses.py --code-insee 94068 --limit 5
  python3 scripts/run_iris_qwen3_analyses.py --code-insee 94068 --code 940680101
"""
from __future__ import annotations

import argparse
import json
import re
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
FICHES_DIR = ROOT / "data" / "knowledge_base" / "fiches"

MODEL = "gpt-oss:120b-cloud"
OLLAMA_URL = "http://localhost:11434/api/generate"
TIMEOUT_S = 120

# ── Two carefully calibrated few-shot examples ───────────────────────────────
FEW_SHOT = """\
=== EXEMPLE 1 — IRIS Adamville 4 (940680104) ===

Données extraites des fiches :
- Population : 1 854 habitants · 31% de cadres · 38% de Bac+5
- Logement : 1 142 logements · 71% appartements · 64% propriétaires
- Marché DVF 2021-2025 : 410 ventes · prix médian 397 000 € · 6 800 €/m²
- DPE majoritaire : C · seulement 12% F/G
- BPE : 47 équipements dont 18 commerces, 4 écoles, 7 santé
- Rang attractivité : 1er / 34 IRIS commune

Analyse :

**Profil acheteur cible**
Cadre supérieur 35-50 ans avec enfants scolarisés, principalement primo-accédant
haut de gamme ou en mobilité résidentielle pour upgrade. Profil exigeant sur les
prestations et la sectorisation scolaire.

**Type de bien dominant**
Appartements familiaux 3-4 pièces de 70 à 95 m² dans un budget 480 à 700 k€.
Demande forte mais offre tendue. Maisons rares (29%) très prisées au-delà du million.

**Dynamique du marché**
Quartier le plus attractif de Saint-Maur (1er rang attractivité commune). Prix
au-dessus de la médiane communale (6 800 vs 6 246 €/m², +9%). Rotation rapide,
biens vendus généralement sous 6 semaines au prix demandé.

**Risques et points de vigilance**
Faibles. Parc DPE majoritairement C (sain), peu de logements F/G à risque de
travaux lourds. Vigilance sur la tension prix qui peut faire reculer les profils
budgets serrés.

**Signaux clés**
1. Densité de cadres 31% vs commune 24,5% → CSP+ confirmé, capacité d'emprunt élevée
2. Prix €/m² 6 800 vs commune 6 246 (+9%) → quartier premium, marché tendu
3. 18 commerces de proximité + 4 écoles → quartier vivant, attractivité familiale

=== EXEMPLE 2 — IRIS La Pie 3 (940680703) ===

Données extraites des fiches :
- Population : 2 105 habitants · 19% de cadres · 22% de Bac+5
- Logement : 1 087 logements · 78% appartements · 51% propriétaires · 12% HLM
- Marché DVF 2021-2025 : 274 ventes · prix médian 318 000 € · 5 100 €/m²
- DPE majoritaire : D · 28% F/G
- BPE : 19 équipements dont 8 commerces, 1 école
- Rang attractivité : 24e / 34 IRIS commune

Analyse :

**Profil acheteur cible**
Primo-accédant employé ou profession intermédiaire 28-38 ans, jeunes couples
sans enfant ou avec un enfant en bas âge. Profils budget contraint cherchant le
meilleur ratio surface/prix sur Saint-Maur.

**Type de bien dominant**
Appartements 2-3 pièces de 45 à 65 m² entre 230 et 360 k€. Marché plus accessible,
plus de rotations locatives transformées en accession.

**Dynamique du marché**
Quartier secondaire (24e attractivité). Prix inférieur à la commune (5 100 vs 6 246
€/m², -18%) qui en fait un terrain de chasse pour primo-accédants. Volume
modeste (274 ventes), marché moins tendu donc plus de marge de négociation.

**Risques et points de vigilance**
28% de logements DPE F/G : signal de travaux à anticiper sur les ventes, à
intégrer dans le plan de financement. 12% HLM peut peser sur certains immeubles.
Vigilance copropriété et charges.

**Signaux clés**
1. Prix €/m² 5 100 vs commune 6 246 (-18%) → marché accessible primo-accédant
2. 28% DPE F/G → opportunité (négociation) mais risque travaux à financer
3. 1 école seulement + 8 commerces → équipements limités, moins d'attractivité famille

"""

SYSTEM = """\
Tu es un analyste de marché immobilier expérimenté qui rédige des fiches \
quartier pour des courtiers en crédit immobilier. Tes analyses doivent être :
- Factuelles et chiffrées (cite systématiquement les nombres des fiches)
- Sobres, sans superlatifs ni jargon marketing
- Structurées en 5 sections fixes (voir exemples)
- Utiles pour la vente : éclaire le profil acheteur et la stratégie commerciale

Tu n'inventes JAMAIS de chiffre. Si une donnée manque, tu écris "donnée non disponible".
Tu cites toujours la source d'un chiffre quand tu le donnes (ex: "31% (INSEE)").
"""


def load_fiche(code: str) -> str:
    matches = list(FICHES_DIR.glob(f"iris-{code}-*.md"))
    return matches[0].read_text() if matches else ""


def build_prompt(code: str, name: str) -> str:
    fiche = load_fiche(code)
    return (
        f"{SYSTEM}\n\n"
        f"Voici DEUX exemples d'analyses précédemment validées pour deux IRIS de Saint-Maur. "
        f"Tu dois suivre exactement le même format et le même niveau de détail.\n\n"
        f"{FEW_SHOT}\n"
        f"=== À TOI MAINTENANT — IRIS {name} ({code}) ===\n\n"
        f"Voici la fiche de données complète. Produis l'analyse en suivant strictement "
        f"le format des deux exemples (Profil acheteur cible / Type de bien dominant / "
        f"Dynamique du marché / Risques et points de vigilance / Signaux clés en 3 puces "
        f"avec chiffres comparatifs vs commune).\n\n"
        f"FICHE DU QUARTIER :\n"
        f"```\n{fiche}\n```\n\n"
        f"Réponds en français, structuré exactement comme les exemples, sans introduction "
        f"superflue, sans conclusion générale. Commence directement par **Profil acheteur cible**."
    )


def call_ollama(prompt: str) -> tuple[bool, str]:
    try:
        r = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.3},
            },
            timeout=TIMEOUT_S,
        )
        r.raise_for_status()
        data = r.json()
        text = (data.get("response") or "").strip()
        # GPT-OSS / qwen3 wrap any internal CoT in <think>...</think> — strip
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
        # Normalise typographic Unicode that may not render cleanly in browsers
        for fancy, plain in {
            "‑": "-", "‐": "-", "‒": "-", "–": "-",
            "—": "-", "―": "-", "­": "",
            "‘": "'", "’": "'", "‚": ",",
            "“": '"', "”": '"', "„": '"', "′": "'",
            "→": "->", "←": "<-", "↔": "<->",
            " ": " ", " ": " ", "​": "", "‌": "",
            "…": "...",
        }.items():
            text = text.replace(fancy, plain)
        return True, text
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--code-insee", required=True, help="Code INSEE 5 chiffres de la commune")
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--code", type=str, default="", help="Code IRIS spécifique (sinon tous)")
    parser.add_argument("--force", action="store_true", help="re-run even cached")
    args = parser.parse_args()

    commune_dir = ROOT / "public" / "data" / "commune" / args.code_insee
    commune_dir.mkdir(parents=True, exist_ok=True)
    iris_geo_path = commune_dir / "iris.geojson"
    out_path = commune_dir / "iris_analyses.json"

    geo = json.loads(iris_geo_path.read_text())
    features = geo["features"]
    if args.code:
        features = [f for f in features if f["properties"].get("code_iris") == args.code]
    elif args.limit:
        features = sorted(
            features,
            key=lambda f: f["properties"].get("attractivity_score") or 0,
            reverse=True,
        )[: args.limit]

    existing: dict[str, dict] = {}
    if out_path.exists():
        existing = json.loads(out_path.read_text())

    print(f"Commune : {args.code_insee}")
    print(f"Model : {MODEL}")
    print(f"Targets : {len(features)} IRIS  ·  cache : {len(existing)} déjà fait")

    for i, f in enumerate(features, 1):
        p = f["properties"]
        code, name = p.get("code_iris"), p.get("nom_iris")
        if not code:
            continue
        if not args.force and code in existing and existing[code].get("ok") and existing[code].get("model") == MODEL:
            print(f"  [{i}/{len(features)}] skip {code} {name}")
            continue
        prompt = build_prompt(code, name)
        t0 = time.time()
        ok, text = call_ollama(prompt)
        dt = time.time() - t0
        if ok:
            existing[code] = {
                "ok": True,
                "model": MODEL,
                "text": text,
                "duration_s": round(dt, 1),
                "source": "qwen3:32b · few-shot · structured",
            }
            print(f"  [{i}/{len(features)}] {code} {name} : {len(text)}c en {dt:.0f}s")
        else:
            existing[code] = {"ok": False, "error": text, "model": MODEL}
            print(f"  [{i}/{len(features)}] {code} {name} ÉCHEC : {text[:100]}")
        out_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2))

    ok_n = sum(1 for v in existing.values() if v.get("ok"))
    print(f"\nDone : {ok_n}/{len(existing)} succès — {out_path}")


if __name__ == "__main__":
    main()
