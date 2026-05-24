#!/usr/bin/env python3
"""
Audit factuel des analyses générées par GPT-OSS.

Pour chaque IRIS analysé :
  1. Extrait tous les nombres (entiers + décimales fr) du texte de l'analyse
  2. Vérifie que chacun apparait, à valeur proche, dans la fiche source
  3. Sort un report avec score de factualité par IRIS + liste des chiffres
     non-trouvés ("hallucinations potentielles")

Tolerance : on accepte un nombre si on le retrouve à ± 1 % dans la fiche source.
On ignore les chiffres triviaux (rangs 1-5, % au-dessus de 200, etc.).

Usage :
  ./scripts/check_analyses_factuality.py --code-insee 94068
"""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--code-insee", required=True, help="Code INSEE 5 chiffres de la commune")
args = parser.parse_args()

CODE_INSEE = args.code_insee
COMMUNE_DIR = ROOT / "public" / "data" / "commune" / CODE_INSEE
COMMUNE_DIR.mkdir(parents=True, exist_ok=True)
ANALYSES = COMMUNE_DIR / "iris_analyses.json"
FICHES = ROOT / "data" / "knowledge_base" / "fiches"
COMMUNE = COMMUNE_DIR / "commune.json"
OUT = COMMUNE_DIR / "iris_analyses_audit.json"

NUM_RE = re.compile(r"(?<![A-Za-z\-])(\d+(?:[,.]\d+)?)")
# On ignore les chiffres triviaux + le code INSEE de la commune analysée
IGNORE_LITERAL = {
    "5", "12", "100", "1", "2", "3", "4", "10", "21",
    "1948", "1974", "2025", "2024", "2021", "2022", "2023",
    CODE_INSEE,
}


def parse_num(s: str) -> float:
    return float(s.replace(",", ".").replace(" ", ""))


def extract_numbers(text: str) -> list[float]:
    out = []
    for m in NUM_RE.findall(text):
        if m in IGNORE_LITERAL:
            continue
        try:
            v = parse_num(m)
            if 0.1 <= v <= 99_999_999:
                out.append(v)
        except ValueError:
            pass
    return out


def fiche_numbers(text: str) -> list[float]:
    return extract_numbers(text)


def near(a: float, b: float) -> bool:
    if a == b:
        return True
    if b == 0:
        return abs(a) < 0.5
    return abs(a - b) / abs(b) <= 0.012  # 1.2% tolerance


def load_commune_numbers() -> list[float]:
    if not COMMUNE.exists():
        return []
    d = json.loads(COMMUNE.read_text())
    return [v for v in d.values() if isinstance(v, (int, float))]


def main():
    analyses = json.loads(ANALYSES.read_text())
    commune_nums = load_commune_numbers()
    audit = {}

    for code, a in analyses.items():
        if not a.get("ok") or not a.get("text"):
            continue
        text = a["text"]
        fiche_candidates = sorted(FICHES.glob(f"iris-{code}-*.md"))
        if not fiche_candidates:
            audit[code] = {"verified": None, "reason": "no fiche found"}
            continue
        source = fiche_candidates[0].read_text()
        src_nums = set(fiche_numbers(source)) | set(commune_nums)

        cited = extract_numbers(text)
        matched = [n for n in cited if any(near(n, s) for s in src_nums)]
        missing = [n for n in cited if not any(near(n, s) for s in src_nums)]
        score = round(100 * len(matched) / len(cited), 1) if cited else None

        audit[code] = {
            "n_cited": len(cited),
            "n_matched": len(matched),
            "n_missing": len(missing),
            "factuality_score": score,
            "missing_samples": missing[:8],
            "model": a.get("model"),
        }

    # Aggregate
    scores = [v["factuality_score"] for v in audit.values() if v.get("factuality_score") is not None]
    summary = {
        "n_analyses": len(audit),
        "avg_factuality_score": round(sum(scores) / len(scores), 1) if scores else None,
        "min": min(scores) if scores else None,
        "max": max(scores) if scores else None,
        "iris_low_score": sorted(
            ((c, v) for c, v in audit.items() if v.get("factuality_score") is not None and v["factuality_score"] < 75),
            key=lambda x: x[1]["factuality_score"] or 0,
        )[:5],
    }

    OUT.write_text(json.dumps({"summary": summary, "per_iris": audit}, ensure_ascii=False, indent=2))
    print(f"Audit factuel : {OUT}")
    print(f"  Score moyen : {summary['avg_factuality_score']} %")
    print(f"  Range       : {summary['min']} - {summary['max']} %")
    print(f"  IRIS < 75 % : {len(summary['iris_low_score'])}")
    for code, v in summary["iris_low_score"]:
        print(f"    {code} score={v['factuality_score']} (manquants {v['n_missing']}/{v['n_cited']})")


if __name__ == "__main__":
    main()
