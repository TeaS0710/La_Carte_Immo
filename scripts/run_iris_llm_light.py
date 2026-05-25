#!/usr/bin/env python3
"""
Génère une analyse contextuelle par IRIS via Ollama Cloud gpt-oss:120b
en utilisant UNIQUEMENT les données disponibles (iris.geojson enrichi DVF +
stats commune + risques) — pas besoin de la knowledge base complète INSEE bulk.

Format de sortie compatible avec le composant IrisCard (clé code_iris → text).
Stocke dans public/data/commune/{insee}/iris_analyses.json (incrémental).

Usage :
  python3 scripts/run_iris_llm_light.py --code-insee 94042
  python3 scripts/run_iris_llm_light.py --targets scripts/target_full.json
  python3 scripts/run_iris_llm_light.py --code-insee 75111 --limit 5
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
MODEL = "gpt-oss:120b-cloud"
OLLAMA_URL = "http://localhost:11434/api/generate"
TIMEOUT_S = 90

PROMPT_TEMPLATE = """\
Tu es un analyste immobilier rigoureux. Rédige une analyse synthétique
du quartier ci-dessous pour un agent immobilier qui prépare un mandat.

CONTEXTE DU QUARTIER (IRIS INSEE)
- Commune : {commune_nom} ({code_insee})
- Quartier : {nom_iris} (IRIS {code_iris})
- Ventes DVF 2021-2025 : {sales} transactions
- Prix médian : {median_price} €
- Prix médian au m² : {median_ppsqm} €/m²
- Appartements vendus : {sales_appt}
- Maisons vendues : {sales_maison}
- Ventes par année : {by_year}

DONNÉES COMMUNALES
- Population commune : {pop_commune} habitants
- Ventes commune totales : {sales_commune}
- Prix médian €/m² commune : {ppsqm_commune}

RISQUES MAJEURS (Géorisques)
{risques}

ÉCRIS L'ANALYSE EN FRANÇAIS, en suivant EXACTEMENT ce format :

**Profil acheteur cible**
[1-2 phrases : qui achète dans ce quartier, capacité d'emprunt, motivations]

**Dynamique du marché local**
[1-2 phrases : volume vs commune, prix vs commune, tendance par année]

**Bien dominant et opportunités**
[1-2 phrases : type de bien majoritaire, opportunités de mandat]

**Recommandation tactique**
[1-2 phrases : sur quels biens/rues focaliser la prospection]

Sois CONCIS, factuel, chaque chiffre cité doit venir des données ci-dessus.
Pas d'introduction ni de conclusion. Commence directement par **Profil acheteur cible**.
"""


def render_risques(risks_data: dict | None) -> str:
    if not risks_data or "risks" not in risks_data:
        return "- Aucun risque majeur recensé"
    lines = []
    for r in risks_data["risks"].values():
        intensity = r.get("intensity", "?")
        lines.append(f"- {r.get('label', '?')} (intensité {intensity})")
    return "\n".join(lines) if lines else "- Aucun risque majeur recensé"


def build_prompt(iris_props: dict, stats: dict, risks: dict | None, commune_nom: str) -> str:
    by_year_str = ", ".join(
        f"{y['year']} : {y['sales']} ventes" for y in iris_props.get("dvf_by_year", [])[:5]
    ) or "n/a"
    return PROMPT_TEMPLATE.format(
        commune_nom=commune_nom,
        code_insee=stats.get("insee", "?"),
        nom_iris=iris_props.get("nom_iris", "?"),
        code_iris=iris_props.get("code_iris", "?"),
        sales=iris_props.get("dvf_sales_total", 0),
        median_price=int(iris_props["dvf_median_price"]) if iris_props.get("dvf_median_price") else "n/a",
        median_ppsqm=int(iris_props["dvf_median_ppsqm"]) if iris_props.get("dvf_median_ppsqm") else "n/a",
        sales_appt=iris_props.get("dvf_sales_appt", 0),
        sales_maison=iris_props.get("dvf_sales_maison", 0),
        by_year=by_year_str,
        pop_commune=stats.get("commune_population", "n/a"),
        sales_commune=stats.get("total_sales", "n/a"),
        ppsqm_commune=int(stats.get("median_price_per_sqm")) if stats.get("median_price_per_sqm") else "n/a",
        risques=render_risques(risks),
    )


def call_ollama(prompt: str, attempts: int = 2) -> tuple[bool, str, float]:
    for attempt in range(attempts):
        try:
            t0 = time.time()
            r = requests.post(
                OLLAMA_URL,
                json={"model": MODEL, "prompt": prompt, "stream": False, "options": {"temperature": 0.4}},
                timeout=TIMEOUT_S,
            )
            elapsed = time.time() - t0
            if r.ok:
                data = r.json()
                return True, data.get("response", "").strip(), elapsed
            time.sleep(2)
        except Exception as e:
            if attempt == attempts - 1:
                return False, f"err: {e}", 0
            time.sleep(3)
    return False, "max retries", 0


def process_commune(code_insee: str, limit: int | None = None, force: bool = False) -> tuple[int, int]:
    cdir = ROOT / "public" / "data" / "commune" / code_insee
    iris_path = cdir / "iris.geojson"
    stats_path = cdir / "stats.json"
    risks_path = cdir / "commune_risks.json"
    out_path = cdir / "iris_analyses.json"
    if not iris_path.exists() or not stats_path.exists():
        return 0, 0

    iris_geo = json.loads(iris_path.read_text())
    stats = json.loads(stats_path.read_text())
    risks = json.loads(risks_path.read_text()) if risks_path.exists() else None
    commune_nom = stats.get("commune", code_insee)

    # Load existing analyses (incremental)
    existing = {}
    if out_path.exists() and not force:
        try:
            existing = json.loads(out_path.read_text())
        except Exception:
            existing = {}

    features = iris_geo["features"]
    if limit:
        features = features[:limit]

    ok_count = 0
    fail_count = 0
    for i, f in enumerate(features, 1):
        code = f["properties"].get("code_iris")
        if not code:
            continue
        # Skip si déjà analysé et OK avec ce modèle
        if existing.get(code, {}).get("ok") and existing[code].get("model") == MODEL and not force:
            continue
        # Skip si pas de ventes DVF (rien à analyser)
        if not f["properties"].get("dvf_sales_total"):
            existing[code] = {"ok": False, "error": "Aucune transaction DVF dans cet IRIS"}
            continue

        prompt = build_prompt(f["properties"], stats, risks, commune_nom)
        ok, text, elapsed = call_ollama(prompt)
        if ok:
            existing[code] = {
                "ok": True,
                "text": text,
                "model": MODEL,
                "duration_s": round(elapsed, 1),
            }
            ok_count += 1
            print(f"    [{i}/{len(features)}] {code} OK ({elapsed:.0f}s, {len(text)} chars)")
        else:
            existing[code] = {"ok": False, "error": text}
            fail_count += 1
            print(f"    [{i}/{len(features)}] {code} FAIL: {text[:80]}")
        # Save incremental après chaque IRIS
        out_path.write_text(json.dumps(existing, ensure_ascii=False))
    return ok_count, fail_count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    g = parser.add_mutually_exclusive_group(required=True)
    g.add_argument("--code-insee", help="Une seule commune")
    g.add_argument("--targets", help="JSON liste de codes INSEE")
    parser.add_argument("--limit", type=int, default=None, help="Limite IRIS par commune")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    codes = [args.code_insee] if args.code_insee else json.loads(Path(args.targets).read_text())
    print(f"Lancement LLM sur {len(codes)} commune(s) avec model {MODEL}")
    total_ok = 0
    total_fail = 0
    t0 = time.time()
    for j, code in enumerate(codes, 1):
        cdir = ROOT / "public" / "data" / "commune" / code
        stats_path = cdir / "stats.json"
        if not stats_path.exists():
            print(f"  [{j}/{len(codes)}] {code} skip (pas de stats.json)")
            continue
        commune_nom = json.loads(stats_path.read_text()).get("commune", code)
        print(f"\n  [{j}/{len(codes)}] {code} {commune_nom}")
        ok, fail = process_commune(code, args.limit, args.force)
        total_ok += ok
        total_fail += fail
    elapsed = int(time.time() - t0)
    print(f"\n═══ FINI : {total_ok} OK, {total_fail} fail en {elapsed//60}m{elapsed%60}s ═══")
    return 0 if total_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
