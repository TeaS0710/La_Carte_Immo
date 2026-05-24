#!/usr/bin/env python3
"""
Pipeline de ventes probables avec **scoring calibré empiriquement**.

Le score est désormais une vraie probabilité issue d'une régression logistique
entraînée sur 11 865 DPE × DVF (cf. scripts/calibrate_pipeline_model.py).
Cf. public/data/commune/{code_insee}/model_coefficients.json.

Chaque logement reçoit :
  - `proba_sale_12m`     : probabilité 0-100 % (modèle calibré)
  - `signals` (list)      : décomposition explicable (feature × coef)

Usage :
  ./scripts/build_pipeline_dataset.py --code-insee 94068
"""
import argparse
import json
import math
from collections import defaultdict
from pathlib import Path

from shapely.geometry import shape, Point
from shapely.prepared import prep

ROOT = Path(__file__).resolve().parent.parent

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--code-insee", required=True, help="Code INSEE 5 chiffres de la commune")
args = parser.parse_args()

CODE_INSEE = args.code_insee
COMMUNE_DIR = ROOT / "public" / "data" / "commune" / CODE_INSEE
COMMUNE_DIR.mkdir(parents=True, exist_ok=True)

DPE_SRC = ROOT / "data" / "raw" / "dpe" / f"dpe_{CODE_INSEE}.json"
IRIS_SRC = COMMUNE_DIR / "iris.geojson"
COEF_SRC = COMMUNE_DIR / "model_coefficients.json"
OUT_DIR = COMMUNE_DIR

# Friendly labels for each calibrated feature (for the signals breakdown)
FEATURE_LABELS = {
    "et_e": "DPE E (perf. faible)",
    "et_f": "DPE F (passoire intermédiaire)",
    "et_g": "DPE G (passoire thermique)",
    "log_surface": "Effet surface logement",
    "old_pre1949": "Bâti d'avant 1949",
    "old_1949_1974": "Bâti 1949-1973",
    "is_maison": "Maison individuelle",
    "chauffage_fioul": "Chauffage fioul (sortie programmée)",
    "iris_log_turnover": "Quartier actif (turnover IRIS)",
    "iris_pct_65p_norm": "Population âgée du quartier (>65 ans)",
}


def sigmoid(x: float) -> float:
    if x >= 0:
        z = math.exp(-x)
        return 1 / (1 + z)
    z = math.exp(x)
    return z / (1 + z)


def parse_year(s):
    try:
        return int(s)
    except (ValueError, TypeError):
        return None


def parse_geopoint(s):
    if not s or not isinstance(s, str):
        return None
    try:
        lat, lng = (float(x) for x in s.split(","))
        return (lng, lat)
    except (ValueError, AttributeError):
        return None


# ── IRIS index ───────────────────────────────────────────────────────────────
iris_geo = json.loads(IRIS_SRC.read_text())
iris_attrs = {}
prepared = []
for f in iris_geo["features"]:
    p = f["properties"]
    code = p["code_iris"]
    iris_attrs[code] = {
        "code_iris": code,
        "nom_iris": p.get("nom_iris"),
        "dvf_sales_total": p.get("dvf_sales_total", 0),
        "pct_65p": p.get("pct_65p"),
    }
    geom = shape(f["geometry"])
    prepared.append((code, geom, prep(geom)))


def find_iris(lng, lat):
    pt = Point(lng, lat)
    for code, _, pg in prepared:
        if pg.contains(pt):
            return code
    return None


# ── Load calibrated model coefficients ───────────────────────────────────────
coefs_data = json.loads(COEF_SRC.read_text())
INTERCEPT = coefs_data["intercept"]
COEFS = coefs_data["coefficients"]
FEATURES = coefs_data["features"]
print(f"Loaded calibrated model: ROC AUC {coefs_data['metrics']['roc_auc_cv']:.3f}, lift@top10 ×{coefs_data['metrics']['lift_top10']:.2f}")


def features_of(d, code_iris):
    """Compute the 10 features expected by the calibrated model."""
    et = (d.get("etiquette_dpe") or "").upper()
    year_built = parse_year(d.get("annee_construction")) or 1970
    try:
        surface = float(d.get("surface_habitable_logement") or 0)
    except (ValueError, TypeError):
        surface = 0
    surface = max(9.0, min(600.0, surface))  # clip to training range
    type_bati = (d.get("type_batiment") or "").lower()
    chauffage = (d.get("type_energie_principale_chauffage") or "").lower()
    iris = iris_attrs.get(code_iris, {})
    sales = iris.get("dvf_sales_total") or 0
    pct65 = iris.get("pct_65p") or 18.0
    return {
        "et_e": float(et == "E"),
        "et_f": float(et == "F"),
        "et_g": float(et == "G"),
        "log_surface": math.log(surface),
        "old_pre1949": float(0 < year_built < 1949),
        "old_1949_1974": float(1949 <= year_built < 1974),
        "is_maison": float("maison" in type_bati),
        "chauffage_fioul": float("fioul" in chauffage),
        "iris_log_turnover": math.log1p(sales),
        "iris_pct_65p_norm": (pct65 - 18) / 10,
    }


def score_logement(features: dict) -> tuple[float, list[dict]]:
    """Compute calibrated probability and per-feature contribution to logit."""
    contribs = []
    logit = INTERCEPT
    for f_name in FEATURES:
        coef = COEFS[f_name]
        val = features[f_name]
        delta = coef * val
        logit += delta
        # Only keep contributions with meaningful magnitude
        if abs(delta) >= 0.05:
            contribs.append({
                "label": FEATURE_LABELS.get(f_name, f_name),
                "feature": f_name,
                "value": round(val, 3),
                "coef": round(coef, 3),
                "logit_delta": round(delta, 3),
            })
    proba = sigmoid(logit)
    # Sort contributions by absolute impact (most important first)
    contribs.sort(key=lambda s: -abs(s["logit_delta"]))
    return proba, contribs


# ── Build the pipeline geojson ───────────────────────────────────────────────
dpe_raw = json.loads(DPE_SRC.read_text())
print(f"Loaded {len(dpe_raw)} DPE records")

features_all = []
features_pipe = []
by_et = defaultdict(int)

for d in dpe_raw:
    et = (d.get("etiquette_dpe") or "").strip().upper()
    by_et[et] += 1
    if et not in {"D", "E", "F", "G"}:
        continue
    pt = parse_geopoint(d.get("_geopoint"))
    if not pt:
        continue
    lng, lat = pt
    code_iris = find_iris(lng, lat)
    iris = iris_attrs.get(code_iris) if code_iris else None

    feats = features_of(d, code_iris)
    proba, signals = score_logement(feats)
    score_pct = round(proba * 100, 1)

    props = {
        "numero_dpe": d.get("numero_dpe"),
        "addr": d.get("adresse_ban") or f"{d.get('numero_voie_ban') or ''} {d.get('nom_rue_ban') or ''}".strip(),
        "type_bati": d.get("type_batiment"),
        "annee_construction": parse_year(d.get("annee_construction")),
        "surface": d.get("surface_habitable_logement"),
        "etiquette_dpe": et,
        "etiquette_ges": (d.get("etiquette_ges") or "").upper() or None,
        "chauffage": d.get("type_energie_principale_chauffage"),
        "date_dpe": d.get("date_etablissement_dpe"),
        "code_iris": code_iris,
        "nom_iris": iris["nom_iris"] if iris else None,
        "proba_sale_12m": score_pct,
        "signals_json": json.dumps(signals, ensure_ascii=False),
        "model_version": "calibrated_v1",
    }
    feat = {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lng, lat]},
        "properties": props,
    }
    features_all.append(feat)
    # Pipeline threshold : 40 % (vs ancien 25/100 arbitraire)
    if score_pct >= 40:
        features_pipe.append(feat)

print(f"DPE par étiquette : {dict(sorted(by_et.items()))}")
print(f"DPE D/E/F/G total : {len(features_all)}")
print(f"Pipeline (≥ 40 %) : {len(features_pipe)}")

scores = sorted([f["properties"]["proba_sale_12m"] for f in features_pipe])
if scores:
    print(f"Scores : min={scores[0]:.1f} médian={scores[len(scores)//2]:.1f} max={scores[-1]:.1f}")

(OUT_DIR / "dpe.geojson").write_text(json.dumps(
    {"type": "FeatureCollection", "features": features_all},
    ensure_ascii=False,
))
(OUT_DIR / "pipeline.geojson").write_text(json.dumps(
    {"type": "FeatureCollection", "features": features_pipe},
    ensure_ascii=False,
))

print(f"\nWrote pipeline.geojson : {(OUT_DIR / 'pipeline.geojson').stat().st_size // 1024} KB")
