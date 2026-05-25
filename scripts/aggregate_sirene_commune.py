#!/usr/bin/env python3
"""
Pour chaque commune cible, lit data/raw/sirene/sirene_{INSEE}_targets.json
et calcule la concurrence agences immo + le tissu économique commune-wide.

Ajoute dans public/data/commune/{INSEE}/stats.json :
  - sirene_targets_total       : total entreprises actives (NAF cibles)
  - sirene_agences_immo        : nb 68.31Z + 68.32A + 68.32B
  - sirene_par_naf             : dict NAF -> count
  - sirene_top_agences         : top 10 agences immo (nom_complet, siege_adresse)

Usage :
  ./scripts/aggregate_sirene_commune.py --targets scripts/target_full.json
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SIRENE_DIR = ROOT / "data" / "raw" / "sirene"
COMMUNE_DIR = ROOT / "public" / "data" / "commune"

NAF_AGENCES = {"68.31Z", "68.32A", "68.32B"}
NAF_LABELS = {
    "68.31Z": "Agences immobilières",
    "56.10A": "Restauration traditionnelle",
    "68.32A": "Administration d'immeubles",
    "66.19B": "Courtage / intermédiation financière",
    "47.11B": "Supérette",
    "56.30Z": "Débits de boissons",
    "47.81Z": "Commerce détail éventaires alim.",
    "70.10Z": "Sièges sociaux",
    "68.32B": "Supports juridiques",
    "47.11D": "Supermarchés",
    "85.31Z": "Enseignement secondaire général",
    "87.10A": "Hébergement médicalisé personnes âgées",
}


def get_naf(e: dict) -> str | None:
    return e.get("activite_principale") or (e.get("siege") or {}).get("activite_principale")


def aggregate(code: str) -> bool:
    src = SIRENE_DIR / f"sirene_{code}_targets.json"
    stats_path = COMMUNE_DIR / code / "stats.json"
    if not src.exists():
        print(f"  ✗ {code} : sirene fichier manquant")
        return False
    if not stats_path.exists():
        print(f"  ✗ {code} : stats.json manquant")
        return False

    data = json.loads(src.read_text())
    by_naf: Counter[str] = Counter()
    agences: list[dict] = []
    for e in data:
        naf = get_naf(e)
        if not naf:
            continue
        by_naf[naf] += 1
        if naf in NAF_AGENCES:
            siege = e.get("siege") or {}
            agences.append({
                "siren": e.get("siren"),
                "nom": e.get("nom_complet") or e.get("nom_raison_sociale"),
                "naf": naf,
                "naf_label": NAF_LABELS.get(naf, naf),
                "adresse": siege.get("adresse"),
                "code_postal": siege.get("code_postal"),
            })

    stats = json.loads(stats_path.read_text())
    stats["sirene_targets_total"] = sum(by_naf.values())
    stats["sirene_agences_immo"] = sum(by_naf[k] for k in NAF_AGENCES)
    stats["sirene_par_naf"] = [
        {"naf": k, "label": NAF_LABELS.get(k, k), "count": v}
        for k, v in sorted(by_naf.items(), key=lambda kv: -kv[1])
    ]
    # Top 15 agences (priorité 68.31Z, sinon autre)
    agences_sorted = sorted(agences, key=lambda a: (a["naf"] != "68.31Z", -1))[:15]
    stats["sirene_top_agences"] = agences_sorted

    stats_path.write_text(json.dumps(stats, ensure_ascii=False, indent=2))
    print(f"  ✓ {code} : {stats['sirene_targets_total']} entreprises NAF cibles, {stats['sirene_agences_immo']} agences immo")
    return True


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--code-insee")
    g.add_argument("--targets")
    args = p.parse_args()
    codes = [args.code_insee] if args.code_insee else json.loads(Path(args.targets).read_text())
    ok = fail = 0
    for c in codes:
        if aggregate(c):
            ok += 1
        else:
            fail += 1
    print(f"\nTotal : {ok} OK, {fail} fail")
    return 0


if __name__ == "__main__":
    sys.exit(main())
