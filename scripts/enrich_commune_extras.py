#!/usr/bin/env python3
"""
Enrichit la KB avec :
  - Risques Géorisques (inondation, nappe, séisme, etc.)
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


# ── 1. Géorisques ────────────────────────────────────────────────────────────
print("Fetching Géorisques…")
r = requests.get(
    "https://www.georisques.gouv.fr/api/v1/resultats_rapport_risque",
    params={"code_insee": "94068"},
    headers={"Accept": "application/json"},
    timeout=20,
)
r.raise_for_status()
data = r.json()

# Extract present risks
risks = {}
for category in ("risquesNaturels", "risquesTechnologiques", "risquesPollution"):
    for key, v in (data.get(category) or {}).items():
        if v.get("present"):
            risks[key] = {
                "category": category,
                "label": v.get("libelle"),
                "status": v.get("libelleStatutCommune"),
            }

commune_risks = {
    "commune": data.get("commune", {}).get("libelle"),
    "code_insee": data.get("commune", {}).get("codeInsee"),
    "georisques_url": data.get("url"),
    "risks": risks,
    "n_risks_present": len(risks),
}

RISKS_OUT.write_text(json.dumps(commune_risks, ensure_ascii=False, indent=2))
print(f"  {len(risks)} risques recensés → {RISKS_OUT.name}")
for k, v in risks.items():
    print(f"    {v['label']:35} {v['status']}")

# ── 2. Distance RER par IRIS ────────────────────────────────────────────────
print("\nComputing RER distances per IRIS…")
geo = json.loads(IRIS_GEO.read_text())
n_close = 0
for f in geo["features"]:
    p = f["properties"]
    # Centroid via shapely
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
    p["rer_walking_min"] = round(nearest_dist / 80, 1)  # 80 m/min = 4.8 km/h marche
    if nearest_dist <= 800:
        n_close += 1

IRIS_GEO.write_text(json.dumps(geo, ensure_ascii=False))
print(f"  {n_close}/{len(geo['features'])} IRIS à <= 800 m d'une gare RER A")
print(f"Wrote {IRIS_GEO.name} ({IRIS_GEO.stat().st_size // 1024} KB)")
