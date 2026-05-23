#!/usr/bin/env python3
"""
CLI d'inférence locale Ollama avec retrieval naïf sur la knowledge base.

Usage:
  python3 scripts/infer_local.py "Profil socio-éco du Vieux Saint-Maur"
  python3 scripts/infer_local.py --model gemma3:latest "Quelle est la rue la plus active ?"
  python3 scripts/infer_local.py --entity iris-940680201-le-vieux-saint-maur-1 "Décris ce quartier"
  python3 scripts/infer_local.py --top-k 3 --capture-to data/knowledge_base/INFERENCE_TESTS.md "..."

Logique :
1. Lit `data/knowledge_base/INDEX.json`
2. Retrieval naïf : tokenisation + score = nb_tokens_match (avec boost si match
   sur nom ou keywords) → top-k fiches
3. Construit le prompt : prompt système + fiches retrieved + question utilisateur
4. Appelle Ollama via HTTP `POST /api/generate` (stream=false)
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import time
import unicodedata
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parent.parent
KB = ROOT / "data" / "knowledge_base"

OLLAMA_URL = "http://localhost:11434/api/generate"

SYSTEM_PROMPT = (
    "Tu es un assistant pour un courtier en crédit immobilier basé à "
    "Saint-Maur-des-Fossés (Prelys Courtage). Tu réponds en français, sobrement, "
    "en t'appuyant uniquement sur les fiches fournies en contexte. Si une "
    "information n'apparaît pas dans les fiches, dis-le explicitement plutôt "
    "que d'inventer. Tu cites les chiffres clés avec leur source (INSEE 2021, "
    "BPE 2024, DVF 2021-2025, etc.) et restes utile pour un argumentaire "
    "commercial B2B (agences immobilières partenaires)."
)


# ---------------------------------------------------------------------------
# Tokenisation / retrieval
# ---------------------------------------------------------------------------
def normalize(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    return s.lower()


STOPWORDS = {
    "le", "la", "les", "de", "des", "du", "un", "une", "et", "ou", "a", "au",
    "aux", "en", "sur", "dans", "pour", "par", "qui", "que", "quel", "quelle",
    "est", "ce", "cette", "ces", "il", "elle", "se", "sa", "son", "mon", "ma",
    "ton", "leurs", "votre", "notre", "pas", "y", "n", "s", "d", "l", "m", "t",
    "plus", "moins", "tres", "donc", "mais", "aussi", "alors",
}


def tokenize(text: str) -> set[str]:
    text = normalize(text)
    return {t for t in re.split(r"[^a-z0-9]+", text) if t and t not in STOPWORDS and len(t) > 1}


def load_index() -> list[dict]:
    return json.loads((KB / "INDEX.json").read_text())


def retrieve(question: str, index: list[dict], top_k: int = 4, prefer_id: str | None = None) -> list[dict]:
    q_tokens = tokenize(question)
    scored = []
    for entry in index:
        if entry["slug"] == prefer_id:
            scored.append((10**6, entry))
            continue
        bag = " ".join([
            entry.get("name", "") or "",
            entry.get("type", "") or "",
            " ".join(entry.get("keywords", []) or []),
            entry.get("slug", ""),
        ])
        bag_tokens = tokenize(bag)
        # score: tokens en commun + bonus si match sur le nom complet
        score = len(q_tokens & bag_tokens)
        # bonus textuel sur le nom
        name_norm = normalize(entry.get("name", "") or "")
        for tok in q_tokens:
            if len(tok) > 3 and tok in name_norm:
                score += 2
        # Bonus si tokens match keywords (signal métier)
        for k in entry.get("keywords", []) or []:
            if normalize(k) in q_tokens:
                score += 1
        if score > 0:
            scored.append((score, entry))
    scored.sort(key=lambda x: -x[0])
    return [e for _, e in scored[:top_k]] or index[:1]  # fallback : la commune


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------
def build_context(entries: list[dict], max_chars: int = 12000) -> str:
    pieces = []
    total = 0
    for entry in entries:
        path = KB / entry["fiche_path"]
        try:
            content = path.read_text()
        except FileNotFoundError:
            continue
        piece = f"\n----- Fiche : {entry['slug']} ({entry['type']}) -----\n{content}\n"
        if total + len(piece) > max_chars:
            piece = piece[: max_chars - total] + "\n[...tronqué...]"
            pieces.append(piece)
            break
        pieces.append(piece)
        total += len(piece)
    return "".join(pieces)


def build_prompt(question: str, context: str) -> str:
    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"=== CONTEXTE (fiches knowledge base) ===\n{context}\n"
        f"=== QUESTION ===\n{question}\n\n"
        "=== RÉPONSE ==="
    )


# ---------------------------------------------------------------------------
# Ollama call
# ---------------------------------------------------------------------------
def call_ollama(model: str, prompt: str, timeout: int = 240) -> dict:
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.2, "num_ctx": 8192},
    }
    t0 = time.time()
    try:
        r = requests.post(OLLAMA_URL, json=payload, timeout=timeout)
        r.raise_for_status()
        data = r.json()
        data["_latency_s"] = round(time.time() - t0, 2)
        return data
    except requests.exceptions.RequestException as e:
        return {"error": str(e), "_latency_s": round(time.time() - t0, 2)}


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    p = argparse.ArgumentParser(description="CLI inférence locale Ollama avec retrieval KB.")
    p.add_argument("question", nargs="?", help="Question utilisateur")
    p.add_argument("--model", default="gemma3:latest", help="Modèle Ollama (def: gemma3:latest)")
    p.add_argument("--entity", default=None, help="Slug d'entité à forcer dans le contexte (ex: iris-940680201-le-vieux-saint-maur-1)")
    p.add_argument("--top-k", type=int, default=4, help="Nombre de fiches à injecter")
    p.add_argument("--dry-run", action="store_true", help="Imprimer le prompt et sortir")
    p.add_argument("--capture-to", type=Path, default=None,
                   help="Append le bloc complet (question / contexte / réponse) dans ce fichier .md")
    args = p.parse_args()

    if not args.question:
        p.error("question requise")

    index = load_index()
    entries = retrieve(args.question, index, top_k=args.top_k, prefer_id=args.entity)
    context = build_context(entries)
    prompt = build_prompt(args.question, context)

    print(f"[retrieve] top-{args.top_k} fiches :", file=sys.stderr)
    for e in entries:
        print(f"  - {e['slug']} ({e['type']})", file=sys.stderr)

    if args.dry_run:
        print(prompt)
        return

    print(f"[ollama] modèle = {args.model}, prompt_len = {len(prompt)} chars", file=sys.stderr)
    res = call_ollama(args.model, prompt)
    if "error" in res:
        print(f"[ERR] {res['error']}", file=sys.stderr)
        sys.exit(2)

    answer = res.get("response", "").strip()
    latency = res.get("_latency_s")
    print(answer)
    print(f"\n[ok] latence={latency}s, eval_count={res.get('eval_count')}, prompt_eval_count={res.get('prompt_eval_count')}",
          file=sys.stderr)

    if args.capture_to:
        block = [
            f"## Test — {dt.datetime.now().isoformat(timespec='seconds')}",
            "",
            f"- Modèle : `{args.model}`",
            f"- Question : **{args.question}**",
            f"- Fiches retrieved ({len(entries)}) : {', '.join(e['slug'] for e in entries)}",
            f"- Latence : {latency} s",
            "",
            "### Contexte injecté (résumé)",
            "```",
            (context[:1800] + ("\n[...tronqué...]" if len(context) > 1800 else "")),
            "```",
            "",
            "### Réponse brute Ollama",
            "",
            answer,
            "",
            "---",
            "",
        ]
        args.capture_to.parent.mkdir(parents=True, exist_ok=True)
        with args.capture_to.open("a") as f:
            f.write("\n".join(block))
        print(f"[capture] ajouté dans {args.capture_to}", file=sys.stderr)


if __name__ == "__main__":
    main()
