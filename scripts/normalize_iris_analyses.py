#!/usr/bin/env python3
"""
Normalise les caractères Unicode "fancy" produits par GPT-OSS dans les
analyses IRIS :
  - tirets cadratin (—), non-cassables (‑), figures (‒) → -
  - guillemets typographiques (« » " " ' ') → équivalents droits
  - flèches → texte
  - espaces insécables narrow → espace simple

Sauvegarde directement iris_analyses.json.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "data" / "saint-maur" / "iris_analyses.json"

REPLACEMENTS = {
    "‑": "-",      # non-breaking hyphen
    "‐": "-",      # hyphen
    "‒": "-",      # figure dash
    "–": "-",      # en dash
    "—": "-",      # em dash
    "―": "-",      # horizontal bar
    "­": "",       # soft hyphen
    "‘": "'",      # left single quote
    "’": "'",      # right single quote
    "‚": ",",      # single low-9 quote
    "“": '"',      # left double quote
    "”": '"',      # right double quote
    "„": '"',      # double low-9 quote
    "′": "'",      # prime
    "→": "->",     # right arrow
    "←": "<-",     # left arrow
    "↔": "<->",    # left-right arrow
    " ": " ",      # narrow no-break space
    " ": " ",      # thin space
    "​": "",       # zero-width space
    "‌": "",       # zero-width non-joiner
    " ": " ",      # no-break space (keep visual but normalize storage)
    "…": "...",         # horizontal ellipsis
}


def normalize(text: str) -> str:
    for fancy, plain in REPLACEMENTS.items():
        text = text.replace(fancy, plain)
    return text


if not SRC.exists():
    print("No iris_analyses.json")
    raise SystemExit(0)

d = json.loads(SRC.read_text())
changed = 0
for code, a in d.items():
    if not a.get("ok"):
        continue
    txt = a.get("text", "")
    new = normalize(txt)
    if new != txt:
        a["text"] = new
        changed += 1

SRC.write_text(json.dumps(d, ensure_ascii=False, indent=2))
print(f"Normalised {changed}/{len(d)} analyses → {SRC}")
