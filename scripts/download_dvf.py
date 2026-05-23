#!/usr/bin/env python3
"""Télécharge les CSV DVF officiels (etalab geo-dvf) pour la zone 94 courtage.

Source : https://files.data.gouv.fr/geo-dvf/latest/csv/{YEAR}/communes/{DEP}/{INSEE}.csv
Idempotent — skip si fichier déjà présent et non vide.

Usage :
    python scripts/download_dvf.py
    python scripts/download_dvf.py --years 2024 2025
    python scripts/download_dvf.py --communes 94068 94058
"""
from __future__ import annotations
import argparse
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"

# Zone 94 courtage Prelys — 10 communes ciblées
COMMUNES_94 = {
    "94002": "Alfortville",
    "94017": "Champigny-sur-Marne",
    "94028": "Créteil",
    "94033": "Fontenay-sous-Bois",
    "94046": "Maisons-Alfort",
    "94058": "Le Perreux-sur-Marne",
    "94068": "Saint-Maur-des-Fossés",
    "94076": "Villejuif",
    "94080": "Vincennes",
    "94081": "Vitry-sur-Seine",
}

DEFAULT_YEARS = [2021, 2022, 2023, 2024, 2025]
BASE_URL = "https://files.data.gouv.fr/geo-dvf/latest/csv/{year}/communes/{dep}/{insee}.csv"


def download_one(insee: str, year: int, out_path: Path) -> tuple[bool, str]:
    """Returns (ok, msg)."""
    if out_path.exists() and out_path.stat().st_size > 0:
        return True, f"skip (exists, {out_path.stat().st_size // 1024} KB)"
    dep = insee[:2]
    url = BASE_URL.format(year=year, dep=dep, insee=insee)
    req = Request(url, headers={"User-Agent": "Prelys-dvf-fetcher/1.0"})
    try:
        with urlopen(req, timeout=30) as resp:
            data = resp.read()
    except HTTPError as e:
        if e.code == 404:
            return False, f"404 (pas de données — peut-être année non publiée)"
        return False, f"HTTP {e.code}"
    except URLError as e:
        return False, f"URL error: {e.reason}"
    if not data or len(data) < 100:
        return False, "réponse vide"
    out_path.write_bytes(data)
    return True, f"OK ({len(data) // 1024} KB)"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--years", type=int, nargs="+", default=DEFAULT_YEARS)
    parser.add_argument("--communes", nargs="+", default=list(COMMUNES_94.keys()))
    parser.add_argument("--delay", type=float, default=0.5, help="Pause entre downloads (s)")
    args = parser.parse_args()

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    total = success = skipped = failed = 0
    for insee in args.communes:
        nom = COMMUNES_94.get(insee, "?")
        for year in args.years:
            total += 1
            out = RAW_DIR / f"dvf_{insee}_{year}.csv"
            existed = out.exists() and out.stat().st_size > 0
            ok, msg = download_one(insee, year, out)
            tag = "✓" if ok else "✗"
            print(f"  [{tag}] {nom:25s} {insee} {year} → {msg}")
            if ok:
                success += 1
                if "skip" in msg:
                    skipped += 1
            else:
                failed += 1
            if not existed and ok:
                time.sleep(args.delay)
    print(f"\nRésumé : {success}/{total} OK  ({skipped} déjà présents, {failed} échecs)")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
