#!/usr/bin/env python3
"""
Enrichit la KB avec :
  - Risques Géorisques détaillés (résumé + ICPE + radon + PPR)
  - Distance haversine de chaque IRIS aux 4 gares RER A de Saint-Maur

Outputs :
  - public/data/saint-maur/commune_risks.json
  - public/data/saint-maur/iris.geojson  (in-place enrichment)
"""
import json
import math
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parent.parent
IRIS_GEO = ROOT / "public" / "data" / "saint-maur" / "iris.geojson"
RISKS_OUT = ROOT / "public" / "data" / "saint-maur" / "commune_risks.json"
CODE_INSEE = "94068"

# Mapping libellé Géorisques → niveau d'intensité normalisé
# Géorisques retourne "Risque Existant", "Risque Existant - faible",
# "Risque Existant - important", "Risque Concerne", etc.
def normalize_intensity(libelle_statut: str | None) -> str:
    if not libelle_statut:
        return "unknown"
    s = libelle_statut.lower()
    if "important" in s or "fort" in s:
        return "fort"
    if "moyen" in s or "modere" in s or "modéré" in s:
        return "moyen"
    if "faible" in s:
        return "faible"
    if "concerne" in s:
        # "Risque Concerne" = présent sur la commune sans gradation d'aléa
        return "present"
    if "existant" in s:
        return "present"
    return "unknown"


# Texte courtier (glossaire) — explique le sens pratique de chaque risque
RISK_NOTES = {
    "inondation": "Zone à risque inondation (souvent PPRI). À vérifier sur l'altimétrie de la parcelle pour l'éligibilité au prêt et la sur-prime assurance.",
    "remonteeNappe": "Sous-sol potentiellement humide / cave inondable. Impact sur la valeur, à mentionner si la cave est partie habitable.",
    "seisme": "Zone de sismicité 1 (très faible) pour Saint-Maur. Pas de contrainte de construction particulière.",
    "mouvementTerrain": "Risque d'effondrement / tassement (anciennes carrières souterraines historiques). À déclarer dans l'ERP.",
    "retraitGonflementArgile": "Sols argileux qui se rétractent en sec et gonflent en humide. Aléa important = mention obligatoire au compromis (loi ELAN 2018), surcoût fondations en cas de construction neuve.",
    "radon": "Gaz radioactif naturel. Classe 1 (faible) = aucune obligation de diagnostic ni travaux.",
    "canalisationsMatieresDangereuses": "Canalisation de transport (gaz GRTgaz généralement). Servitude d'utilité publique sur les parcelles concernées, distance de sécurité à respecter pour toute construction.",
    "pollutionSols": "Sites BASOL/BASIAS recensés sur la commune. À vérifier avant tout projet de division de parcelle ou de réhabilitation en logement.",
    "icpe": "Installations Classées Protection Environnement. Présentes en zone industrielle / commerciale.",
}


# ── 1. Résumé Géorisques ─────────────────────────────────────────────────────
print("Fetching Géorisques (résumé général)…")
r = requests.get(
    "https://www.georisques.gouv.fr/api/v1/resultats_rapport_risque",
    params={"code_insee": CODE_INSEE},
    headers={"Accept": "application/json", "User-Agent": "Mozilla/5.0"},
    timeout=20,
)
r.raise_for_status()
data = r.json()

risks = {}
for category in ("risquesNaturels", "risquesTechnologiques", "risquesPollution"):
    for key, v in (data.get(category) or {}).items():
        if v.get("present"):
            statut = v.get("libelleStatutCommune")
            risks[key] = {
                "category": category,
                "label": v.get("libelle"),
                "raw_status": statut,
                "intensity": normalize_intensity(statut),
                "note": RISK_NOTES.get(key, ""),
            }

# ── 2. Compte ICPE (Installations Classées) ──────────────────────────────────
print("Fetching ICPE count…")
icpe_count = 0
try:
    r2 = requests.get(
        "https://www.georisques.gouv.fr/api/v1/installations_classees",
        params={"code_insee": CODE_INSEE, "page_size": 25, "page": 1},
        timeout=15,
    )
    if r2.ok:
        d2 = r2.json()
        total_pages = d2.get("total_pages", 0)
        if total_pages > 0:
            # Estime via dernière page
            r_last = requests.get(
                "https://www.georisques.gouv.fr/api/v1/installations_classees",
                params={"code_insee": CODE_INSEE, "page_size": 25, "page": total_pages},
                timeout=15,
            )
            if r_last.ok:
                last_count = len(r_last.json().get("data", []))
                icpe_count = (total_pages - 1) * 25 + last_count
except Exception as e:
    print(f"  ICPE fetch failed: {e}")

# ── 3. Classe radon (plus précise que résumé) ────────────────────────────────
print("Fetching radon class…")
radon_class = None
try:
    r3 = requests.get(
        "https://www.georisques.gouv.fr/api/v1/radon",
        params={"code_insee": CODE_INSEE},
        timeout=15,
    )
    if r3.ok:
        d3 = r3.json()
        data3 = d3.get("data") or []
        if data3:
            radon_class = data3[0].get("classe_potentiel")
            # Enrichit le risque radon avec la classe précise (1/2/3)
            if "radon" in risks and radon_class:
                risks["radon"]["radon_class"] = radon_class
                if radon_class == "1":
                    risks["radon"]["intensity"] = "faible"
                elif radon_class == "2":
                    risks["radon"]["intensity"] = "moyen"
                elif radon_class == "3":
                    risks["radon"]["intensity"] = "fort"
except Exception as e:
    print(f"  Radon fetch failed: {e}")

# ── 4. PPR / GASPAR (Plans de Prévention) ────────────────────────────────────
print("Fetching PPR (GASPAR)…")
ppr_list = []
try:
    r4 = requests.get(
        "https://www.georisques.gouv.fr/api/v1/gaspar/risques",
        params={"code_insee": CODE_INSEE},
        timeout=15,
    )
    if r4.ok:
        d4 = r4.json()
        for ppr in d4.get("data") or []:
            for sub in ppr.get("risques_detail") or []:
                lib = sub.get("libelle_risque_long")
                if lib and lib not in ppr_list:
                    ppr_list.append(lib)
except Exception as e:
    print(f"  PPR fetch failed: {e}")

commune_risks = {
    "commune": data.get("commune", {}).get("libelle"),
    "code_insee": data.get("commune", {}).get("codeInsee"),
    "code_postal": data.get("commune", {}).get("codePostal"),
    "georisques_url": data.get("url"),
    "risks": risks,
    "n_risks_present": len(risks),
    "icpe_count": icpe_count,
    "radon_class": radon_class,
    "ppr_risques": ppr_list,
    "scale_note": "Données à l'échelle de la commune entière. Géorisques ne descend pas en dessous du code INSEE. Pour avoir le niveau exact à une adresse, utiliser le lien officiel ci-dessous.",
}

RISKS_OUT.write_text(json.dumps(commune_risks, ensure_ascii=False, indent=2))
print(f"  {len(risks)} risques recensés → {RISKS_OUT.name}")
print(f"  {icpe_count} ICPE recensées, radon classe {radon_class}, PPR : {', '.join(ppr_list) or '—'}")
for k, v in risks.items():
    print(f"    {v['label']:35} [{v['intensity']:8}] {v['raw_status']}")

# ── 5. Distance RER par IRIS ─────────────────────────────────────────────────
GARES_RER_A = {
    "Saint-Maur-Créteil": (48.7958, 2.4902),
    "Le Parc-de-Saint-Maur": (48.8105, 2.4824),
    "Champigny (RER A)": (48.8081, 2.5159),
    "La Varenne-Chennevières": (48.7977, 2.5152),
}

def haversine_m(lat1, lng1, lat2, lng2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


print("\nComputing RER distances per IRIS…")
geo = json.loads(IRIS_GEO.read_text())
n_close = 0
for f in geo["features"]:
    p = f["properties"]
    from shapely.geometry import shape
    centroid = shape(f["geometry"]).centroid
    lat, lng = centroid.y, centroid.x
    dists = {
        name: round(haversine_m(lat, lng, gare_lat, gare_lng))
        for name, (gare_lat, gare_lng) in GARES_RER_A.items()
    }
    nearest_name, nearest_dist = min(dists.items(), key=lambda x: x[1])
    p["rer_distance_m"] = nearest_dist
    p["rer_nearest"] = nearest_name
    p["rer_walking_min"] = round(nearest_dist / 80, 1)
    if nearest_dist <= 800:
        n_close += 1

IRIS_GEO.write_text(json.dumps(geo, ensure_ascii=False))
print(f"  {n_close}/{len(geo['features'])} IRIS à <= 800 m d'une gare RER A")
print(f"Wrote {IRIS_GEO.name} ({IRIS_GEO.stat().st_size // 1024} KB)")
