#!/usr/bin/env python3
"""
Unifie les 3 photos courtiers avec le même fond beige et la même taille (600×600).

- ND.png (300×300, fond gris studio) → fond beige soft
- ODS.png (200×200, fond beige) → upscalé en 600×600 (anti-flou retina)
- AL.jpg (600×600, fond beige) → ré-encodé tel quel pour cohérence
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageFilter
from rembg import remove, new_session

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "prelys"
TARGET_SIZE = 600
# Beige Prelys (cf. tailwind --brand-soft / fond AL & ODS existants)
BG = (192, 155, 91)


def unify(name: str, src: Path, dst: Path, needs_bg_remove: bool, session=None):
    print(f"--> {name}: {src.name} → {dst.name}", file=sys.stderr)
    img = Image.open(src).convert("RGBA")
    if needs_bg_remove:
        # Upscale d'abord pour donner plus de signal au modèle si l'image est petite
        if max(img.size) < TARGET_SIZE:
            scale = TARGET_SIZE / max(img.size)
            img = img.resize((int(img.size[0] * scale), int(img.size[1] * scale)), Image.LANCZOS)
        cut = remove(img, session=session, alpha_matting=True,
                     alpha_matting_foreground_threshold=240,
                     alpha_matting_background_threshold=15,
                     alpha_matting_erode_size=8)
        # cut est RGBA avec alpha sur le sujet
        img = cut
    # Composite sur fond beige uni
    bg = Image.new("RGBA", img.size, BG + (255,))
    bg.paste(img, (0, 0), img)
    bg = bg.convert("RGB")
    # Resize en carré centré
    w, h = bg.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    bg = bg.crop((left, top, left + side, top + side))
    bg = bg.resize((TARGET_SIZE, TARGET_SIZE), Image.LANCZOS)
    bg.save(dst, optimize=True)


def main():
    # Session unique partagée pour éviter re-charger le modèle 3x
    session = new_session("u2net")
    unify("Nathalie Delacourt", SRC / "ND.png", SRC / "ND_unified.png", needs_bg_remove=True, session=session)
    unify("Olivier de Sylva",   SRC / "ODS.png", SRC / "ODS_unified.png", needs_bg_remove=True, session=session)
    unify("Audrey Léonard",     SRC / "AL.jpg",  SRC / "AL_unified.jpg",  needs_bg_remove=False, session=session)


if __name__ == "__main__":
    main()
