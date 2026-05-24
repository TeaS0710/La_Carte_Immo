#!/usr/bin/env python3
"""
Récupère la liste complète des communes d'Île-de-France depuis l'API
publique geo.api.gouv.fr et stocke un manifest réutilisable pour le
batch processing de build_commune.py.

Outputs :
  - scripts/communes_idf.json (liste enrichie, manifest principal)
  - public/data/idf/communes.json (version frontend, sélecteur de ville)

Usage : ./scripts/fetch_communes_idf.py
"""
import json
import unicodedata
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
DEPTS_IDF = ["75", "77", "78", "91", "92", "93", "94", "95"]


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode("ascii")
    return (
        s.lower()
        .replace("'", "-")
        .replace(" ", "-")
        .replace("--", "-")
        .replace("é", "e")
        .replace("è", "e")
        .replace("ê", "e")
        .replace("à", "a")
        .strip("-")
    )


print("Fetching communes IDF…")
all_communes: list[dict] = []
for dept in DEPTS_IDF:
    r = requests.get(
        "https://geo.api.gouv.fr/communes",
        params={
            "codeDepartement": dept,
            "fields": "nom,code,codeDepartement,codesPostaux,population,centre",
        },
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    # CAS PARIS : l'API retourne juste 75056 (Paris entière) mais on veut
    # aussi les 20 arrondissements 75101-75120 comme communes à part entière.
    if dept == "75":
        for arr in range(1, 21):
            code = f"751{arr:02d}"
            try:
                rr = requests.get(
                    f"https://geo.api.gouv.fr/communes/{code}",
                    params={"fields": "nom,code,codeDepartement,codesPostaux,population,centre"},
                    timeout=15,
                )
                if rr.ok:
                    data.append(rr.json())
            except Exception:
                pass
    for c in data:
        nom = c["nom"]
        code = c["code"]
        slug = slugify(nom)
        # Coordonnées centroïde (pour pré-zoom carte) : centre.coordinates = [lng, lat]
        centre = c.get("centre", {}).get("coordinates")
        all_communes.append({
            "code_insee": code,
            "nom": nom,
            "slug": slug,
            "code_dept": dept,
            "code_postal": (c.get("codesPostaux") or ["00000"])[0],
            "population": c.get("population", 0),
            "lng": centre[0] if centre else None,
            "lat": centre[1] if centre else None,
        })
    print(f"  dept {dept} : {len(data)} communes")

# Tri stable : par dept puis par population décroissante
all_communes.sort(key=lambda c: (c["code_dept"], -c["population"]))

print(f"\nTotal IDF : {len(all_communes)} communes · {sum(c['population'] for c in all_communes):,} hab.")

# Manifest pour build_commune.py --batch
manifest_path = ROOT / "scripts" / "communes_idf.json"
manifest_path.write_text(json.dumps(
    [c["code_insee"] for c in all_communes],
    ensure_ascii=False,
    indent=2,
))
print(f"\nWrote {manifest_path.relative_to(ROOT)} (liste de codes INSEE)")

# Version frontend pour le sélecteur de ville
front_path = ROOT / "public" / "data" / "idf" / "communes.json"
front_path.parent.mkdir(parents=True, exist_ok=True)
front_path.write_text(json.dumps(all_communes, ensure_ascii=False))
print(f"Wrote {front_path.relative_to(ROOT)} (référentiel frontend)")
