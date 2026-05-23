#!/usr/bin/env python3
"""
Enrichit iris.geojson avec :
  - les moyennes pondérées commune-wide pour chaque indicateur INSEE / DVF
  - le rang de chaque IRIS pour chaque indicateur (1 = meilleur)
  - un score composite "attractivité acheteur"

Le résultat permet d'afficher des barres comparatives + badges de classement
dans IrisCard côté front.
"""
import json
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "data" / "saint-maur" / "iris.geojson"

geo = json.loads(SRC.read_text())
features = geo["features"]

NUMERIC_METRICS = [
    "pct_proprio",
    "pct_hlm",
    "pct_appart",
    "pct_cadres",
    "pct_bac5p",
    "pct_etrangers",
    "pct_0_14",
    "pct_65p",
    "dvf_median_price",
    "dvf_median_ppsqm",
    "dvf_sales_total",
    "bpe_total",
]

# ── 1. Commune-wide aggregates (population-weighted where it makes sense) ────
def weighted_mean(values_weights):
    s = sum(w for _, w in values_weights if w)
    if not s:
        return None
    return sum(v * w for v, w in values_weights if v is not None and w) / s

commune = {}
pops = [(f["properties"].get("population"), f["properties"]) for f in features]
total_pop = sum(p for p, _ in pops if p)
n_log_total = sum((f["properties"].get("n_log") or 0) for f in features)
n_log_features = [(f["properties"].get("n_log"), f["properties"]) for f in features]

for metric in [
    "pct_proprio", "pct_hlm", "pct_appart", "pct_cadres", "pct_bac5p",
    "pct_etrangers", "pct_0_14", "pct_65p",
]:
    # Pondérer par population (ou par n_log pour les % logement)
    weight = "n_log" if metric in ("pct_proprio", "pct_hlm", "pct_appart") else "population"
    pairs = [
        (f["properties"].get(metric), f["properties"].get(weight))
        for f in features
        if f["properties"].get(metric) is not None
    ]
    m = weighted_mean(pairs)
    commune[metric] = round(m, 1) if m is not None else None

# DVF aggregates
all_ppsqm = [f["properties"].get("dvf_median_ppsqm") for f in features if f["properties"].get("dvf_median_ppsqm")]
all_price = [f["properties"].get("dvf_median_price") for f in features if f["properties"].get("dvf_median_price")]
commune["dvf_median_ppsqm"] = round(statistics.median(all_ppsqm), 0) if all_ppsqm else None
commune["dvf_median_price"] = round(statistics.median(all_price), 0) if all_price else None
commune["dvf_sales_total"] = sum(f["properties"].get("dvf_sales_total", 0) for f in features)
commune["bpe_total"] = sum((f["properties"].get("bpe_total") or 0) for f in features)
commune["population"] = total_pop
commune["n_log"] = n_log_total

print("Commune avg / median :")
for k, v in commune.items():
    print(f"  {k}: {v}")

# ── 2. Per-IRIS rankings ─────────────────────────────────────────────────────
def rank_features(metric: str, reverse: bool = True):
    """Assign rank 1..n where 1 = highest if reverse, lowest otherwise."""
    indexed = [(i, f["properties"].get(metric)) for i, f in enumerate(features) if f["properties"].get(metric) is not None]
    indexed.sort(key=lambda x: x[1], reverse=reverse)
    for rank, (i, _) in enumerate(indexed, start=1):
        features[i]["properties"][f"rank_{metric}"] = rank
        features[i]["properties"][f"rank_total_{metric}"] = len(indexed)

# Higher = "better" (more cadres, more bac+5, more proprio, more sales) — rank 1 = top
for metric in [
    "pct_cadres", "pct_bac5p", "pct_proprio", "pct_appart",
    "dvf_median_ppsqm", "dvf_median_price", "dvf_sales_total", "bpe_total",
]:
    rank_features(metric, reverse=True)

# Lower = "remarkable" (less HLM, etc.) — rank 1 = lowest
# Skip for now — let user infer

# ── 3. Composite "attractivité acheteur" score (0-100) ───────────────────────
# Heuristique mixant : % cadres, % bac+5, % propriétaires, prix/m², volume
# Plus c'est haut, plus le quartier est "désirable" pour un acheteur primo-CSP+
def composite(p):
    parts = []
    if p.get("pct_cadres"):
        parts.append(p["pct_cadres"] / 50)  # normalize ~50% max
    if p.get("pct_bac5p"):
        parts.append(p["pct_bac5p"] / 60)
    if p.get("pct_proprio"):
        parts.append(p["pct_proprio"] / 90)
    if p.get("dvf_median_ppsqm"):
        # Plus le €/m² est haut, plus le quartier est attractif (sur Saint-Maur)
        parts.append(min(1.0, (p["dvf_median_ppsqm"] - 4000) / 6000))
    if p.get("bpe_total"):
        parts.append(min(1.0, p["bpe_total"] / 200))
    if not parts:
        return None
    return round(sum(parts) / len(parts) * 100, 1)

for f in features:
    s = composite(f["properties"])
    if s is not None:
        f["properties"]["attractivity_score"] = s

# Rank attractivity
rank_features("attractivity_score", reverse=True)

# ── 4. Inject commune averages into every feature for client access ──────────
for f in features:
    f["properties"]["commune_avg"] = commune

SRC.write_text(json.dumps(geo, ensure_ascii=False))
print(f"\nWrote {SRC} ({SRC.stat().st_size // 1024} KB)")

# Also write commune.json separately (lighter for landing/strate use)
COMMUNE_OUT = SRC.parent / "commune.json"
COMMUNE_OUT.write_text(json.dumps(commune, ensure_ascii=False, indent=2))
print(f"Wrote {COMMUNE_OUT}")

# Print top IRIS by attractivity for sanity
top = sorted(features, key=lambda f: f["properties"].get("attractivity_score") or 0, reverse=True)[:5]
print("\nTop 5 IRIS attractivité :")
for f in top:
    p = f["properties"]
    print(f"  #{p.get('rank_attractivity_score')}  {p.get('nom_iris')}  score={p.get('attractivity_score')}  cadres={p.get('pct_cadres')}%  €/m²={p.get('dvf_median_ppsqm')}")
