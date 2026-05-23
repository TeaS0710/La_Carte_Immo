#!/usr/bin/env python3
"""
Build the unified knowledge base for Saint-Maur-des-Fossés (94068).

Reads all sources in `data/raw/<source>/`, joins them at three granularities
(commune, IRIS, parcelle) and writes:

  data/knowledge_base/entities.jsonl   - one JSON line per entity
  data/knowledge_base/fiches/*.md      - one Markdown briefing per entity
  data/knowledge_base/INDEX.json       - lookup {slug -> {path, type, lat, lng, keywords}}

The script uses only pandas + shapely (no geopandas dependency).  Point-in-polygon
joins are done manually with shapely.prepared. Coordinates are EPSG:4326 (WGS84)
because all raw sources are already in that CRS.

Run:
  python3 scripts/build_knowledge_base.py
"""
from __future__ import annotations

import csv
import gzip
import io
import json
import math
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from statistics import median
from typing import Any

import pandas as pd
from shapely.geometry import Point, shape
from shapely.prepared import prep

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
KB = ROOT / "data" / "knowledge_base"
FICHES = KB / "fiches"
FICHES.mkdir(parents=True, exist_ok=True)

COM_CODE = "94068"
COM_NAME = "Saint-Maur-des-Fossés"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "x"


def safe_div(a, b):
    try:
        a = float(a); b = float(b)
        return a / b if b else None
    except Exception:
        return None


def pct(a, b, digits=1):
    v = safe_div(a, b)
    return round(v * 100, digits) if v is not None else None


def fnum(x, digits=0):
    if x is None or (isinstance(x, float) and math.isnan(x)):
        return None
    try:
        f = float(x)
    except Exception:
        return x
    if digits == 0:
        return int(round(f))
    return round(f, digits)


def fmt_eur(x):
    if x is None: return "—"
    return f"{int(round(x)):,}".replace(",", " ") + " €"


def fmt_int(x):
    if x is None: return "—"
    return f"{int(round(x)):,}".replace(",", " ")


def fmt_pct(x, digits=1):
    if x is None: return "—"
    return f"{round(x, digits)} %".replace(".", ",")


# ---------------------------------------------------------------------------
# 1. Load IRIS contours (also gives us the polygons for point-in-polygon)
# ---------------------------------------------------------------------------
def load_iris_polygons() -> list[dict]:
    fc = json.loads((RAW / "iris" / "iris_94068.geojson").read_text())
    irises = []
    for feat in fc["features"]:
        props = feat["properties"]
        geom = shape(feat["geometry"])
        irises.append({
            "code_iris": props["code_iris"],
            "nom_iris": props["nom_iris"],
            "type_iris": props.get("type_iris"),
            "geom": geom,
            "prep": prep(geom),
            "centroid": (geom.centroid.x, geom.centroid.y),  # lng, lat
        })
    return irises


# ---------------------------------------------------------------------------
# 2. Load INSEE IRIS tables
# ---------------------------------------------------------------------------
def load_insee_iris() -> dict[str, dict]:
    pop = pd.read_csv(RAW / "insee" / "base_pop_2021_94068.csv", dtype={"IRIS": str, "COM": str})
    log = pd.read_csv(RAW / "insee" / "base_log_2021_94068.csv", dtype={"IRIS": str, "COM": str})
    cfm = pd.read_csv(RAW / "insee" / "base_cfm_2021_94068.csv", dtype={"IRIS": str, "COM": str})
    dpl = pd.read_csv(RAW / "insee" / "base_dpl_2021_94068.csv", dtype={"IRIS": str, "COM": str})

    out: dict[str, dict] = defaultdict(dict)
    for df, prefix in [(pop, "pop"), (log, "log"), (cfm, "cfm"), (dpl, "dpl")]:
        df = df.copy()
        df["IRIS"] = df["IRIS"].astype(str).str.zfill(9)
        for _, row in df.iterrows():
            r = row.to_dict()
            out[r["IRIS"]].setdefault("LAB_IRIS", r.get("LAB_IRIS"))
            out[r["IRIS"]].setdefault("TYP_IRIS", r.get("TYP_IRIS"))
            for k, v in r.items():
                if k in {"IRIS", "COM", "TYP_IRIS", "LAB_IRIS"}:
                    continue
                out[r["IRIS"]][k] = v
    return dict(out)


# ---------------------------------------------------------------------------
# 3. Load DVF (10 communes × 5 années) — but we keep only St-Maur for entities,
#    plus aggregates for the commune fiche.
# ---------------------------------------------------------------------------
def load_dvf() -> pd.DataFrame:
    files = sorted((RAW).glob("dvf_*.csv"))
    dfs = []
    for f in files:
        try:
            df = pd.read_csv(f, dtype={"code_commune": str, "id_parcelle": str, "code_postal": str})
            dfs.append(df)
        except Exception as e:
            print(f"  ! DVF skip {f.name}: {e}", file=sys.stderr)
    big = pd.concat(dfs, ignore_index=True)
    # Keep only Ventes with a price and a built type
    big = big[big["nature_mutation"] == "Vente"].copy()
    big = big[big["valeur_fonciere"].notna()]
    big["year"] = big["date_mutation"].str[:4].astype(int, errors="ignore")
    return big


def parcel_dvf_aggregate(dvf_stm: pd.DataFrame) -> dict[str, dict]:
    """Aggregate DVF transactions per parcelle (Saint-Maur only).

    DVF éclate une vente sur plusieurs lignes (un lot par ligne). On regroupe
    donc par (id_mutation, id_parcelle) pour récupérer une transaction unique
    (somme des surfaces bâties pour la parcelle, valeur foncière dédupliquée).
    """
    out: dict[str, dict] = {}
    if "id_parcelle" not in dvf_stm.columns:
        return out
    df = dvf_stm.dropna(subset=["id_parcelle"]).copy()
    # Agréger lignes-lot vers ligne-transaction (1 ligne par id_mutation × id_parcelle)
    by_tx = (
        df.groupby(["id_mutation", "id_parcelle"], as_index=False)
        .agg(
            valeur_fonciere=("valeur_fonciere", "first"),
            surface_reelle_bati=("surface_reelle_bati", "sum"),
            date_mutation=("date_mutation", "first"),
            year=("year", "first"),
            adresse_numero=("adresse_numero", "first"),
            adresse_nom_voie=("adresse_nom_voie", "first"),
            code_postal=("code_postal", "first"),
            longitude=("longitude", "first"),
            latitude=("latitude", "first"),
        )
    )
    # Tous les types de lots (toutes lignes brutes) pour le breakdown
    types_by_parcel = (
        df.dropna(subset=["type_local"])
        .groupby("id_parcelle")["type_local"]
        .apply(lambda s: Counter(s).most_common())
        .to_dict()
    )
    g = by_tx.groupby("id_parcelle")
    for pid, sub in g:
        prices = sub["valeur_fonciere"].dropna().tolist()
        surfaces = sub["surface_reelle_bati"].replace(0, pd.NA).dropna().tolist()
        addr = sub.iloc[0]
        out[pid] = {
            "n_mutations": int(len(sub)),
            "first_year": int(sub["year"].min()),
            "last_year": int(sub["year"].max()),
            "price_min": float(min(prices)) if prices else None,
            "price_max": float(max(prices)) if prices else None,
            "price_median": float(median(prices)) if prices else None,
            "surface_median": float(median(surfaces)) if surfaces else None,
            "types_local": types_by_parcel.get(pid, []),
            "addr_numero": addr.get("adresse_numero"),
            "addr_voie": addr.get("adresse_nom_voie"),
            "code_postal": addr.get("code_postal"),
            "lng": addr.get("longitude"),
            "lat": addr.get("latitude"),
        }
    return out


# ---------------------------------------------------------------------------
# 4. Cadastre parcelles (geometry + contenance)
# ---------------------------------------------------------------------------
def load_cadastre_parcelles() -> dict[str, dict]:
    with gzip.open(RAW / "cadastre" / "parcelles.json.gz", "rt") as f:
        fc = json.load(f)
    out = {}
    for feat in fc["features"]:
        p = feat["properties"]
        try:
            geom = shape(feat["geometry"])
            c = geom.centroid
        except Exception:
            c = None
        out[p["id"]] = {
            "contenance": p.get("contenance"),
            "section": p.get("section"),
            "numero": p.get("numero"),
            "centroid": (c.x, c.y) if c else None,
        }
    return out


# ---------------------------------------------------------------------------
# 5. BAN — addresses (used to enrich parcelle fiches with normalised street names)
# ---------------------------------------------------------------------------
def load_ban_by_parcel() -> dict[str, list[dict]]:
    df = pd.read_csv(RAW / "ban" / "adresses-94068.csv", sep=";", dtype=str, low_memory=False)
    out: dict[str, list[dict]] = defaultdict(list)
    for _, r in df.iterrows():
        cad = r.get("cad_parcelles") or ""
        if not cad or pd.isna(cad):
            continue
        for pid in cad.split("|"):
            pid = pid.strip()
            if pid:
                out[pid].append({
                    "numero": r.get("numero"),
                    "voie": r.get("nom_voie"),
                    "code_postal": r.get("code_postal"),
                    "libelle_acheminement": r.get("libelle_acheminement"),
                    "lat": float(r.get("lat")) if r.get("lat") else None,
                    "lng": float(r.get("lon")) if r.get("lon") else None,
                })
    return out


# ---------------------------------------------------------------------------
# 6. BPE — équipements per IRIS (via DCIRIS field, already computed by INSEE)
# ---------------------------------------------------------------------------
SDOM_LABELS = {
    "A": "Services aux particuliers",
    "B": "Commerces",
    "C": "Enseignement",
    "D": "Santé / social",
    "E": "Transports / déplacements",
    "F": "Sports / loisirs / culture",
    "G": "Tourisme",
}


def load_bpe_by_iris() -> tuple[dict[str, dict], dict[str, int]]:
    """Returns (iris -> {label_dom: count}, commune-level counts)."""
    df = pd.read_parquet(RAW / "bpe" / "BPE24_94068.parquet")
    df["DCIRIS"] = df["DCIRIS"].astype(str).str.zfill(9)
    per_iris: dict[str, dict] = defaultdict(lambda: defaultdict(int))
    commune_counts: dict[str, int] = defaultdict(int)
    for _, r in df.iterrows():
        dom = r["DOM"]
        label = SDOM_LABELS.get(dom, dom)
        per_iris[r["DCIRIS"]][label] += 1
        commune_counts[label] += 1
        commune_counts[f"_TYPEQU_{r['TYPEQU']}"] += 1
    return {k: dict(v) for k, v in per_iris.items()}, dict(commune_counts)


# ---------------------------------------------------------------------------
# 7. Sirene — entreprises actives par NAF, à Saint-Maur
# ---------------------------------------------------------------------------
NAF_LABELS = {
    "68.31Z": "Agences immobilières",
    "56.10A": "Restauration traditionnelle",
    "68.32A": "Administration d'immeubles",
    "66.19B": "Courtage / intermédiation financière",
    "47.11B": "Supérette",
    "56.30Z": "Débits de boissons",
    "47.81Z": "Commerce de détail sur éventaires alimentaire",
    "70.10Z": "Activités des sièges sociaux",
    "68.32B": "Supports juridiques de programmes",
    "47.11D": "Supermarchés",
    "85.31Z": "Enseignement secondaire général",
    "87.10A": "Hébergement médicalisé pour personnes âgées",
}


def load_sirene_targets() -> tuple[dict[str, int], list[dict]]:
    data = json.loads((RAW / "sirene" / "sirene_94068_targets.json").read_text())
    counts: dict[str, int] = Counter()
    agencies = []
    for r in data:
        sieges = r.get("matching_etablissements") or []
        for e in sieges:
            if e.get("commune") != COM_CODE:
                continue
            naf = e.get("activite_principale") or (r.get("siege") or {}).get("activite_principale")
            if not naf:
                continue
            counts[naf] += 1
            if naf == "68.31Z":
                agencies.append({
                    "siren": r.get("siren"),
                    "nom": r.get("nom_complet"),
                    "adresse": e.get("adresse"),
                    "code_postal": e.get("code_postal"),
                })
    return dict(counts), agencies


# ---------------------------------------------------------------------------
# 8. OSM — POIs aggregated per IRIS via point-in-polygon
# ---------------------------------------------------------------------------
def load_osm_pois() -> list[dict]:
    data = json.loads((RAW / "osm" / "osm_94068.json").read_text())
    pois = []
    for e in data["elements"]:
        tags = e.get("tags") or {}
        if not tags:
            continue
        # Get lat/lng (either node or center for ways)
        lat = e.get("lat") or (e.get("center") or {}).get("lat")
        lng = e.get("lon") or (e.get("center") or {}).get("lon")
        if lat is None or lng is None:
            continue
        for key in ("amenity", "shop", "leisure", "tourism", "office", "public_transport", "railway"):
            if key in tags:
                pois.append({
                    "lat": lat,
                    "lng": lng,
                    "category": key,
                    "value": tags[key],
                    "name": tags.get("name"),
                })
                break
    return pois


def agg_osm_per_iris(pois: list[dict], irises: list[dict]) -> dict[str, dict]:
    per_iris: dict[str, dict] = defaultdict(lambda: defaultdict(int))
    for poi in pois:
        pt = Point(poi["lng"], poi["lat"])
        for iris in irises:
            if iris["prep"].contains(pt):
                per_iris[iris["code_iris"]][f"{poi['category']}:{poi['value']}"] += 1
                break
    return {k: dict(v) for k, v in per_iris.items()}


# ---------------------------------------------------------------------------
# 9. DPE — count per IRIS + global commune profile
# ---------------------------------------------------------------------------
def load_dpe() -> tuple[dict[str, dict], dict[str, int]]:
    data = json.loads((RAW / "dpe" / "dpe_94068.json").read_text())
    commune = Counter()
    rows = []
    for d in data:
        gp = d.get("_geopoint")
        if not gp:
            continue
        try:
            lat, lng = [float(x) for x in gp.split(",")]
        except Exception:
            continue
        label = d.get("etiquette_dpe") or "?"
        commune[label] += 1
        rows.append({
            "lat": lat, "lng": lng, "label": label,
            "annee_construction": d.get("annee_construction"),
        })
    return rows, dict(commune)


def agg_dpe_per_iris(rows, irises):
    per_iris = defaultdict(lambda: defaultdict(int))
    for d in rows:
        pt = Point(d["lng"], d["lat"])
        for iris in irises:
            if iris["prep"].contains(pt):
                per_iris[iris["code_iris"]][d["label"]] += 1
                break
    return {k: dict(v) for k, v in per_iris.items()}


# ---------------------------------------------------------------------------
# 10. Délinquance — commune
# ---------------------------------------------------------------------------
def load_delinquance() -> dict[str, Any]:
    df = pd.read_parquet(RAW / "delinquance" / "delinquance_94068.parquet")
    # Most recent year only
    latest = df["annee"].max()
    recent = df[df["annee"] == latest].copy()
    out = {
        "annee": int(latest),
        "indicateurs": [],
    }
    for _, r in recent.iterrows():
        out["indicateurs"].append({
            "indicateur": r["indicateur"],
            "nombre": fnum(r.get("nombre")),
            "taux_pour_mille": fnum(r.get("taux_pour_mille"), 2),
            "est_diffuse": bool(r.get("est_diffuse")) if pd.notna(r.get("est_diffuse")) else None,
        })
    return out


# ---------------------------------------------------------------------------
# 11. Élections — commune
# ---------------------------------------------------------------------------
def load_elections() -> dict[str, Any]:
    out = {}
    for tour, fname in [("T1", "pres2022_t1_94068.csv"), ("T2", "pres2022_t2_94068.csv")]:
        df = pd.read_csv(RAW / "elections" / fname)
        meta_row = df.iloc[0]
        candidates = []
        for _, r in df.iterrows():
            candidates.append({
                "nom": f"{r['cand_prenom']} {r['cand_nom']}",
                "voix": int(r["cand_nb_voix"]),
                "pct_exprimes": float(r["cand_rapport_exprim"]),
            })
        candidates.sort(key=lambda c: -c["voix"])
        out[tour] = {
            "inscrits": int(meta_row["inscrits_nb"]),
            "abstention_pct": float(meta_row["abstention_pourc"]),
            "exprimes": int(meta_row["exprimes_nb"]),
            "candidats": candidates,
        }
    return out


# ---------------------------------------------------------------------------
# 12. Éducation
# ---------------------------------------------------------------------------
def load_education() -> dict[str, Any]:
    data = json.loads((RAW / "education" / "annuaire_94068.json").read_text())
    results = data.get("results", [])
    counts = Counter()
    by_type = defaultdict(list)
    for r in results:
        t = r.get("type_etablissement") or "?"
        counts[t] += 1
        by_type[t].append({
            "nom": r.get("nom_etablissement"),
            "adresse": r.get("adresse_1"),
            "statut": r.get("statut_public_prive"),
        })
    return {
        "n_total": data.get("total_count", len(results)),
        "par_type": dict(counts),
        "etablissements": dict(by_type),
    }


# ---------------------------------------------------------------------------
# 13. Commune-level DVF aggregate (St-Maur + 10 voisins, all years)
# ---------------------------------------------------------------------------
def dvf_commune_summary(dvf: pd.DataFrame) -> dict[str, dict]:
    """Agrège DVF en valeurs uniques par transaction (id_mutation)."""
    out = {}
    sub = dvf[dvf["type_local"].isin(["Appartement", "Maison"])].dropna(
        subset=["surface_reelle_bati", "valeur_fonciere"]
    )
    # 1 ligne par (id_mutation, type_local) — somme des surfaces des lots de même type
    agg = (
        sub.groupby(["id_mutation", "code_commune", "nom_commune", "type_local"], as_index=False)
        .agg(
            valeur_fonciere=("valeur_fonciere", "first"),
            surface_reelle_bati=("surface_reelle_bati", "sum"),
        )
    )
    agg = agg[agg["surface_reelle_bati"] > 9]
    agg["price_m2"] = agg["valeur_fonciere"] / agg["surface_reelle_bati"]
    agg = agg[(agg["price_m2"] > 1000) & (agg["price_m2"] < 25000)]
    for (code, name, tl), s in agg.groupby(["code_commune", "nom_commune", "type_local"]):
        out.setdefault(code, {"name": name, "by_type": {}})
        out[code]["by_type"][tl] = {
            "n": int(len(s)),
            "median_eur_m2": int(round(s["price_m2"].median())),
            "median_eur": int(round(s["valeur_fonciere"].median())),
        }
    return out


# ---------------------------------------------------------------------------
# Build IRIS fiches
# ---------------------------------------------------------------------------
def build_iris_fiche(
    iris: dict,
    insee: dict,
    bpe_per_iris: dict,
    osm_per_iris: dict,
    dpe_per_iris: dict,
) -> tuple[str, dict]:
    code = iris["code_iris"]
    nom = iris["nom_iris"]
    cx, cy = iris["centroid"]  # lng, lat
    insee_row = insee.get(code, {})
    bpe = bpe_per_iris.get(code, {})
    osm = osm_per_iris.get(code, {})
    dpe = dpe_per_iris.get(code, {})

    pop = fnum(insee_row.get("P21_POP"))
    pop_h = fnum(insee_row.get("P21_POPH"))
    pop_f = fnum(insee_row.get("P21_POPF"))
    p_0014 = fnum(insee_row.get("P21_POP0014"))
    p_65p = fnum(insee_row.get("P21_POP65P"))
    pop_etr = fnum(insee_row.get("P21_POP_ETR"))
    n_log = fnum(insee_row.get("P21_LOG"))
    n_rp = fnum(insee_row.get("P21_RP"))
    rp_prop = fnum(insee_row.get("P21_RP_PROP"))
    rp_loc = fnum(insee_row.get("P21_RP_LOC"))
    rp_hlm = fnum(insee_row.get("P21_RP_LOCHLMV"))
    maison = fnum(insee_row.get("P21_MAISON"))
    appart = fnum(insee_row.get("P21_APPART"))
    rp_120 = fnum(insee_row.get("P21_RP_120M2P"))
    rp_m30 = fnum(insee_row.get("P21_RP_M30M2"))
    sup5 = fnum(insee_row.get("P21_NSCOL15P_SUP5"))
    nscol15 = fnum(insee_row.get("P21_NSCOL15P"))
    cs1 = fnum(insee_row.get("C21_POP15P_CS1"))
    cs3 = fnum(insee_row.get("C21_POP15P_CS3"))  # cadres
    cs5 = fnum(insee_row.get("C21_POP15P_CS5"))  # employés
    cs6 = fnum(insee_row.get("C21_POP15P_CS6"))  # ouvriers

    # OSM top 5 catégories
    top_osm = sorted(osm.items(), key=lambda kv: -kv[1])[:8]
    # BPE — équipements par domaine
    bpe_lines = sorted(bpe.items(), key=lambda kv: -kv[1])

    type_label = {"H": "Habitat", "A": "Activité", "D": "Divers"}.get(iris.get("type_iris"), "?")
    md = [
        f"# IRIS {nom} ({code})",
        "",
        f"- Commune : Saint-Maur-des-Fossés (94068)",
        f"- Type IRIS : {iris.get('type_iris', '?')} ({type_label})",
        f"- Centroïde : lat={cy:.5f}, lng={cx:.5f}",
        "",
        "## Population (INSEE 2021)",
        f"- Population totale : {fmt_int(pop)} habitants",
        f"- Hommes / Femmes : {fmt_int(pop_h)} / {fmt_int(pop_f)}",
        f"- 0-14 ans : {fmt_int(p_0014)} ({fmt_pct(pct(p_0014, pop))})",
        f"- 65 ans et + : {fmt_int(p_65p)} ({fmt_pct(pct(p_65p, pop))})",
        f"- Population étrangère : {fmt_int(pop_etr)} ({fmt_pct(pct(pop_etr, pop))})",
        "",
        "## Catégories socio-professionnelles (15+ ans)",
        f"- Agriculteurs (CS1) : {fmt_int(cs1)}",
        f"- Cadres et professions intellectuelles supérieures (CS3) : {fmt_int(cs3)} ({fmt_pct(pct(cs3, fnum(insee_row.get('C21_POP15P'))))})",
        f"- Employés (CS5) : {fmt_int(cs5)}",
        f"- Ouvriers (CS6) : {fmt_int(cs6)}",
        f"- Diplômés du supérieur long (BAC+5 et plus) : {fmt_int(sup5)} sur {fmt_int(nscol15)} non-scolarisés 15+ ({fmt_pct(pct(sup5, nscol15))})",
        "",
        "## Logement",
        f"- Logements totaux : {fmt_int(n_log)}",
        f"- Résidences principales : {fmt_int(n_rp)}",
        f"- Propriétaires : {fmt_int(rp_prop)} ({fmt_pct(pct(rp_prop, n_rp))}) — Locataires : {fmt_int(rp_loc)} ({fmt_pct(pct(rp_loc, n_rp))}) — HLM : {fmt_int(rp_hlm)} ({fmt_pct(pct(rp_hlm, n_rp))})",
        f"- Maisons : {fmt_int(maison)} ({fmt_pct(pct(maison, n_log))}) — Appartements : {fmt_int(appart)} ({fmt_pct(pct(appart, n_log))})",
        f"- Grands logements (120 m²+) : {fmt_int(rp_120)} — Petits (-30 m²) : {fmt_int(rp_m30)}",
        "",
        "## Équipements (BPE 2024)",
    ]
    if bpe_lines:
        for k, v in bpe_lines:
            md.append(f"- {k} : {v}")
    else:
        md.append("- (aucun équipement BPE recensé)")

    md.append("")
    md.append("## Points d'intérêt OSM (top 8)")
    if top_osm:
        for k, v in top_osm:
            md.append(f"- {k} : {v}")
    else:
        md.append("- (aucun POI catégorisé recensé)")

    md.append("")
    md.append("## DPE (étiquettes énergétiques)")
    if dpe:
        for k in ["A", "B", "C", "D", "E", "F", "G"]:
            if k in dpe:
                md.append(f"- {k} : {dpe[k]}")
    else:
        md.append("- (aucun DPE recensé sur cet IRIS — agrégation point-in-polygon non concluante)")

    body = "\n".join(md)
    keywords = [
        nom, code, "iris", "saint-maur",
        "cadres" if cs3 and pop and cs3 / max(pop, 1) > 0.05 else None,
        "propriétaires" if rp_prop and n_rp and rp_prop / n_rp > 0.55 else None,
        "locataires" if rp_loc and n_rp and rp_loc / n_rp > 0.4 else None,
        "hlm" if rp_hlm and rp_hlm > 50 else None,
        "famille" if p_0014 and pop and p_0014 / pop > 0.18 else None,
    ]
    keywords = [k.lower() for k in keywords if k]

    meta = {
        "type": "iris",
        "id": code,
        "name": nom,
        "lat": round(cy, 6),
        "lng": round(cx, 6),
        "attributes": {
            "population": pop, "n_log": n_log, "n_rp": n_rp,
            "pct_proprio": pct(rp_prop, n_rp),
            "pct_appart": pct(appart, n_log),
            "pct_cadres": pct(cs3, fnum(insee_row.get("C21_POP15P"))),
            "pct_bac5p": pct(sup5, nscol15),
            "bpe": bpe,
            "osm_top": dict(top_osm),
            "dpe": dpe,
        },
        "keywords": sorted(set(keywords)),
    }
    return body, meta


# ---------------------------------------------------------------------------
# Commune fiche
# ---------------------------------------------------------------------------
def build_commune_fiche(
    insee: dict,
    bpe_commune: dict,
    sirene_counts: dict,
    agencies: list[dict],
    education: dict,
    elections: dict,
    delinquance: dict,
    dpe_commune: dict,
    dvf_summary: dict,
) -> tuple[str, dict]:
    # Aggregate INSEE over all IRIS for commune totals
    total_pop = sum((insee[k].get("P21_POP") or 0) for k in insee)
    total_log = sum((insee[k].get("P21_LOG") or 0) for k in insee)
    total_rp = sum((insee[k].get("P21_RP") or 0) for k in insee)
    rp_prop = sum((insee[k].get("P21_RP_PROP") or 0) for k in insee)
    rp_loc = sum((insee[k].get("P21_RP_LOC") or 0) for k in insee)
    rp_hlm = sum((insee[k].get("P21_RP_LOCHLMV") or 0) for k in insee)
    cs3 = sum((insee[k].get("C21_POP15P_CS3") or 0) for k in insee)
    cs15 = sum((insee[k].get("C21_POP15P") or 0) for k in insee)

    stm_dvf = dvf_summary.get(COM_CODE, {})
    md = [
        f"# Commune {COM_NAME} ({COM_CODE})",
        "",
        f"- Code INSEE : {COM_CODE} — Val-de-Marne (94), Île-de-France",
        f"- Population (INSEE 2021 cumulée sur 34 IRIS) : {fmt_int(total_pop)} habitants",
        "",
        "## Logement (INSEE 2021)",
        f"- Logements totaux : {fmt_int(total_log)}",
        f"- Résidences principales : {fmt_int(total_rp)}",
        f"- Propriétaires : {fmt_int(rp_prop)} ({fmt_pct(pct(rp_prop, total_rp))}) — Locataires : {fmt_int(rp_loc)} ({fmt_pct(pct(rp_loc, total_rp))}) — HLM : {fmt_int(rp_hlm)} ({fmt_pct(pct(rp_hlm, total_rp))})",
        "",
        "## Profil socio (CSP+ et diplômes)",
        f"- Cadres et professions intellectuelles sup. (CS3) : {fmt_int(cs3)} sur {fmt_int(cs15)} actifs 15+ ({fmt_pct(pct(cs3, cs15))})",
        "",
        "## Marché immobilier — DVF 2021-2025",
    ]
    if stm_dvf.get("by_type"):
        for tl, v in stm_dvf["by_type"].items():
            md.append(f"- {tl} : prix médian {fmt_eur(v['median_eur'])} — prix médian €/m² : {v['median_eur_m2']} €/m² (n={v['n']})")

    md += [
        "",
        "## Comparatif communes voisines (DVF agrégé 2021-2025, prix médian €/m² appartements)",
    ]
    rows = []
    for code, info in dvf_summary.items():
        appart = (info.get("by_type") or {}).get("Appartement", {})
        if appart:
            rows.append((info["name"], appart.get("median_eur_m2"), appart.get("n")))
    rows.sort(key=lambda r: -(r[1] or 0))
    for n, p, c in rows:
        flag = "  ← Saint-Maur" if "Saint-Maur" in n else ""
        md.append(f"- {n} : {p} €/m² (n={c}){flag}")

    md += [
        "",
        "## Équipements (BPE 2024, par domaine)",
    ]
    for k in ["Services aux particuliers", "Commerces", "Enseignement", "Santé / social", "Transports / déplacements", "Sports / loisirs / culture", "Tourisme"]:
        if k in bpe_commune:
            md.append(f"- {k} : {bpe_commune[k]}")

    md += [
        "",
        "## Tissu économique (Sirene actifs, échantillon NAF cible)",
    ]
    for naf, n in sorted(sirene_counts.items(), key=lambda kv: -kv[1]):
        label = NAF_LABELS.get(naf, naf)
        md.append(f"- NAF {naf} — {label} : {n} établissements")
    md.append("")
    md.append(f"### Agences immobilières actives : {len(agencies)}")
    md.append("Top 10 par nom :")
    for a in agencies[:10]:
        md.append(f"- {a.get('nom')} ({a.get('adresse')})")

    md += [
        "",
        "## Éducation (Annuaire MEN)",
        f"- Total établissements : {education.get('n_total')}",
    ]
    for t, n in sorted(education.get("par_type", {}).items(), key=lambda kv: -kv[1]):
        md.append(f"- {t} : {n}")

    md += [
        "",
        "## Sécurité (Délinquance enregistrée — SSMSI, année " + str(delinquance["annee"]) + ")",
    ]
    for ind in delinquance["indicateurs"]:
        diff = "" if ind["est_diffuse"] else " (non diffusé — secret stat)"
        md.append(f"- {ind['indicateur']} : {fmt_int(ind['nombre'])} faits — {ind['taux_pour_mille']} ‰{diff}")
    md.append("")
    md.append("> Avertissement : ces données reflètent l'activité enregistrée par police/gendarmerie. Biais de plainte non négligeable.")

    md += [
        "",
        "## Vote — présidentielles 2022",
        f"### Premier tour — inscrits : {fmt_int(elections['T1']['inscrits'])}, abstention : {elections['T1']['abstention_pct']}%",
    ]
    for c in elections["T1"]["candidats"][:5]:
        md.append(f"- {c['nom']} : {fmt_int(c['voix'])} voix ({c['pct_exprimes']}%)")
    md.append("")
    md.append(f"### Second tour")
    for c in elections["T2"]["candidats"]:
        md.append(f"- {c['nom']} : {fmt_int(c['voix'])} voix ({c['pct_exprimes']}%)")

    md += [
        "",
        "## DPE (étiquettes énergétiques, base ADEME)",
    ]
    for k in ["A", "B", "C", "D", "E", "F", "G", "?"]:
        if k in dpe_commune:
            md.append(f"- {k} : {dpe_commune[k]}")

    body = "\n".join(md)

    meta = {
        "type": "commune",
        "id": COM_CODE,
        "name": COM_NAME,
        "lat": 48.7999,
        "lng": 2.4921,
        "attributes": {
            "population": fnum(total_pop),
            "n_log": fnum(total_log),
            "n_rp": fnum(total_rp),
            "pct_proprio": pct(rp_prop, total_rp),
            "pct_hlm": pct(rp_hlm, total_rp),
            "n_agencies_immo": len(agencies),
            "delinquance_annee": delinquance["annee"],
        },
        "keywords": ["saint-maur", "94068", "commune", "val-de-marne", "ile-de-france"],
    }
    return body, meta


# ---------------------------------------------------------------------------
# Parcelle fiche
# ---------------------------------------------------------------------------
def build_parcelle_fiche(
    pid: str, agg: dict, cadastre: dict, ban: dict, iris_lookup,
) -> tuple[str, dict]:
    cad = cadastre.get(pid, {})
    addrs = ban.get(pid, [])
    cent = cad.get("centroid") or (agg.get("lng"), agg.get("lat"))
    if not cent or cent[0] is None:
        return "", None
    cx, cy = cent
    # Find iris containing this point
    pt = Point(cx, cy)
    iris_name = None; iris_code = None
    for iris in iris_lookup:
        if iris["prep"].contains(pt):
            iris_name = iris["nom_iris"]; iris_code = iris["code_iris"]
            break

    addr = ""
    if agg.get("addr_voie"):
        addr = f"{int(agg['addr_numero']) if agg.get('addr_numero') and not pd.isna(agg['addr_numero']) else ''} {agg['addr_voie']}".strip()
    elif addrs:
        a0 = addrs[0]
        addr = f"{a0.get('numero','')} {a0.get('voie','')}".strip()

    types_str = ", ".join(f"{t}×{n}" for t, n in agg.get("types_local", []))
    md = [
        f"# Parcelle {pid}",
        f"- Adresse principale : {addr or '(non géocodée)'}",
        f"- IRIS : {iris_name or '?'} ({iris_code or '?'})",
        f"- Section / numéro : {cad.get('section')} {cad.get('numero')}",
        f"- Contenance cadastrale : {cad.get('contenance')} m²",
        f"- Coordonnées centroïde : lat={cy:.6f}, lng={cx:.6f}",
        "",
        "## Transactions DVF (Vente)",
        f"- Nombre : {agg['n_mutations']} ({agg['first_year']}–{agg['last_year']})",
        f"- Prix médian : {fmt_eur(agg['price_median'])}",
        f"- Prix min / max : {fmt_eur(agg['price_min'])} / {fmt_eur(agg['price_max'])}",
        f"- Surface médiane : {agg['surface_median']} m²" if agg.get("surface_median") else "- Surface : (non renseignée)",
        f"- Types de biens : {types_str}" if types_str else "",
        "",
        "## Adresses BAN rattachées",
    ]
    for a in addrs[:8]:
        md.append(f"- {a.get('numero','')} {a.get('voie','')} ({a.get('code_postal','')})")

    body = "\n".join(md)
    meta = {
        "type": "parcelle",
        "id": pid,
        "name": addr or pid,
        "lat": round(cy, 6),
        "lng": round(cx, 6),
        "attributes": {
            "iris": iris_code,
            "n_mutations": agg["n_mutations"],
            "price_median": agg["price_median"],
            "contenance": cad.get("contenance"),
            "types_local": dict(agg.get("types_local", [])),
        },
        "keywords": [pid, iris_name or "", "parcelle", "dvf"],
    }
    return body, meta


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("[1/8] Loading IRIS contours...", file=sys.stderr)
    irises = load_iris_polygons()
    print(f"  {len(irises)} IRIS", file=sys.stderr)

    print("[2/8] Loading INSEE IRIS tables...", file=sys.stderr)
    insee = load_insee_iris()
    print(f"  {len(insee)} IRIS rows", file=sys.stderr)

    print("[3/8] Loading DVF (11 communes × 5 ans)...", file=sys.stderr)
    dvf = load_dvf()
    print(f"  {len(dvf)} ventes (toutes communes/années)", file=sys.stderr)
    dvf_stm = dvf[dvf["code_commune"] == COM_CODE].copy()
    print(f"  dont {len(dvf_stm)} sur St-Maur", file=sys.stderr)
    dvf_summary = dvf_commune_summary(dvf)

    print("[4/8] Aggregating DVF per parcelle...", file=sys.stderr)
    parcelle_dvf = parcel_dvf_aggregate(dvf_stm)
    print(f"  {len(parcelle_dvf)} parcelles avec ventes", file=sys.stderr)

    print("[5/8] Loading cadastre + BAN...", file=sys.stderr)
    cadastre = load_cadastre_parcelles()
    ban = load_ban_by_parcel()
    print(f"  {len(cadastre)} parcelles cadastre, {len(ban)} parcelles BAN-indexées", file=sys.stderr)

    print("[6/8] Loading BPE + Sirene + OSM + DPE + délinquance + élections + éduc...", file=sys.stderr)
    bpe_per_iris, bpe_commune = load_bpe_by_iris()
    sirene_counts, agencies = load_sirene_targets()
    osm_pois = load_osm_pois()
    osm_per_iris = agg_osm_per_iris(osm_pois, irises)
    dpe_rows, dpe_commune = load_dpe()
    dpe_per_iris = agg_dpe_per_iris(dpe_rows, irises)
    delinquance = load_delinquance()
    elections = load_elections()
    education = load_education()

    print("[7/8] Writing fiches...", file=sys.stderr)
    # Nettoyer les fiches d'un run précédent pour ne pas mélanger les versions
    for old in FICHES.glob("*.md"):
        old.unlink()
    index: list[dict] = []
    entities_jsonl = []

    # Commune
    body, meta = build_commune_fiche(
        insee, bpe_commune, sirene_counts, agencies, education,
        elections, delinquance, dpe_commune, dvf_summary,
    )
    slug = f"commune-{COM_CODE}"
    (FICHES / f"{slug}.md").write_text(body)
    meta["fiche_path"] = f"fiches/{slug}.md"
    entities_jsonl.append(meta)
    index.append({"slug": slug, **{k: meta[k] for k in ("type", "id", "name", "lat", "lng", "keywords", "fiche_path")}})

    # IRIS
    for iris in sorted(irises, key=lambda x: x["code_iris"]):
        body, meta = build_iris_fiche(iris, insee, bpe_per_iris, osm_per_iris, dpe_per_iris)
        slug = f"iris-{iris['code_iris']}-{slugify(iris['nom_iris'])}"
        (FICHES / f"{slug}.md").write_text(body)
        meta["fiche_path"] = f"fiches/{slug}.md"
        entities_jsonl.append(meta)
        index.append({"slug": slug, **{k: meta[k] for k in ("type", "id", "name", "lat", "lng", "keywords", "fiche_path")}})

    # Parcelles — top 30 par nb_mutations
    top_parcelles = sorted(parcelle_dvf.items(), key=lambda kv: (-kv[1]["n_mutations"], -(kv[1]["price_median"] or 0)))[:30]
    for pid, agg in top_parcelles:
        body, meta = build_parcelle_fiche(pid, agg, cadastre, ban, irises)
        if not meta:
            continue
        slug = f"parcelle-{pid}"
        (FICHES / f"{slug}.md").write_text(body)
        meta["fiche_path"] = f"fiches/{slug}.md"
        entities_jsonl.append(meta)
        index.append({"slug": slug, **{k: meta[k] for k in ("type", "id", "name", "lat", "lng", "keywords", "fiche_path")}})

    # Persist
    with (KB / "entities.jsonl").open("w") as f:
        for e in entities_jsonl:
            f.write(json.dumps(e, ensure_ascii=False, default=str) + "\n")
    (KB / "INDEX.json").write_text(json.dumps(index, ensure_ascii=False, indent=2, default=str))

    print(f"[8/8] Done — {len(entities_jsonl)} entities. KB at {KB}", file=sys.stderr)


if __name__ == "__main__":
    main()
