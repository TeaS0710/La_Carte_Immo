#!/usr/bin/env python3
"""
Agrège les stats par département à partir des stats.json de chaque commune
déjà traitée dans public/data/commune/{insee}/. Produit :

  public/data/dept/{code}.json      — synthèse par dépt (top villes, KPI)
  public/data/idf/region.json       — synthèse région (top dépts, top villes)

Usage : ./scripts/build_dept_aggregates.py
"""
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COMMUNE_DIR = ROOT / "public" / "data" / "commune"
DEPT_DIR = ROOT / "public" / "data" / "dept"
IDF_DIR = ROOT / "public" / "data" / "idf"
MANIFEST = IDF_DIR / "communes.json"

DEPT_NAMES = {
    "75": "Paris",
    "77": "Seine-et-Marne",
    "78": "Yvelines",
    "91": "Essonne",
    "92": "Hauts-de-Seine",
    "93": "Seine-Saint-Denis",
    "94": "Val-de-Marne",
    "95": "Val-d'Oise",
}


def load_manifest() -> dict[str, dict]:
    """Returns code_insee → commune ref."""
    if not MANIFEST.exists():
        print(f"  Manifest IDF absent ({MANIFEST}) — lance d'abord fetch_communes_idf.py")
        return {}
    return {c["code_insee"]: c for c in json.loads(MANIFEST.read_text())}


def main() -> int:
    manifest = load_manifest()
    if not manifest:
        return 2

    DEPT_DIR.mkdir(parents=True, exist_ok=True)

    by_dept: dict[str, list[dict]] = defaultdict(list)
    region_total = {
        "total_sales": 0,
        "total_population": 0,
        "communes_count": 0,
    }

    # Pour chaque commune ayant stats.json, l'agréger
    for cdir in sorted(COMMUNE_DIR.iterdir()):
        if not cdir.is_dir():
            continue
        stats_path = cdir / "stats.json"
        if not stats_path.exists():
            continue
        insee = cdir.name
        ref = manifest.get(insee)
        if not ref:
            continue
        stats = json.loads(stats_path.read_text())
        commune_summary = {
            "code_insee": insee,
            "slug": ref["slug"],
            "nom": ref["nom"],
            "population": ref.get("population", 0),
            "lng": ref.get("lng"),
            "lat": ref.get("lat"),
            "total_sales": stats.get("total_sales", 0),
            "median_price": stats.get("median_price"),
            "median_price_per_sqm": stats.get("median_price_per_sqm"),
            "years_covered": stats.get("years_covered", []),
            "streets_with_sales": stats.get("streets_with_sales", 0),
        }
        by_dept[ref["code_dept"]].append(commune_summary)
        region_total["total_sales"] += commune_summary["total_sales"]
        region_total["total_population"] += commune_summary["population"]
        region_total["communes_count"] += 1

    def fmt_eur(n: float | int) -> str:
        return f"{int(round(n)):,} €".replace(",", " ")

    def fmt_int(n: int) -> str:
        return f"{n:,}".replace(",", " ")

    # Écrit synthèse par dept
    for dept, communes in sorted(by_dept.items()):
        communes.sort(key=lambda c: -c["total_sales"])
        dept_total_sales = sum(c["total_sales"] for c in communes)
        dept_population = sum(c["population"] for c in communes)
        # Prix médian dept : médiane pondérée des médians communaux
        prices = [c["median_price"] for c in communes if c["median_price"]]
        median_price_dept = sorted(prices)[len(prices) // 2] if prices else None
        ppsqm = [c["median_price_per_sqm"] for c in communes if c["median_price_per_sqm"]]
        median_ppsqm_dept = sorted(ppsqm)[len(ppsqm) // 2] if ppsqm else None
        # Top-3 insights actionnables
        insights = []
        if communes:
            top = communes[0]
            insights.append(
                f"{top['nom']} concentre le plus de transactions du département "
                f"({fmt_int(top['total_sales'])} ventes DVF sur 5 ans)."
            )
        if median_ppsqm_dept:
            most_expensive = max(
                (c for c in communes if c["median_price_per_sqm"]),
                key=lambda c: c["median_price_per_sqm"] or 0,
                default=None,
            )
            cheapest = min(
                (c for c in communes if c["median_price_per_sqm"]),
                key=lambda c: c["median_price_per_sqm"] or 1e9,
                default=None,
            )
            if most_expensive and cheapest and most_expensive != cheapest:
                insights.append(
                    f"Spread prix marqué : {most_expensive['nom']} à "
                    f"{fmt_eur(most_expensive['median_price_per_sqm'])}/m² vs "
                    f"{cheapest['nom']} à {fmt_eur(cheapest['median_price_per_sqm'])}/m²."
                )
        if len(communes) >= 5:
            top5_share = sum(c["total_sales"] for c in communes[:5]) / max(
                1, sum(c["total_sales"] for c in communes)
            )
            insights.append(
                f"Les 5 communes les plus actives concentrent {int(top5_share * 100)} % "
                f"des transactions du département analysées."
            )
        payload = {
            "code_dept": dept,
            "nom_dept": DEPT_NAMES.get(dept, dept),
            "communes_count_total": sum(1 for c in manifest.values() if c["code_dept"] == dept),
            "communes_count_available": len(communes),
            "total_sales": dept_total_sales,
            "median_price": median_price_dept,
            "population_total": sum(c["population"] for c in manifest.values() if c["code_dept"] == dept),
            "population_available": dept_population,
            "median_price_per_sqm": median_ppsqm_dept,
            "insights": insights,
            "top_communes": communes[:20],
            "all_communes_available": [
                {"slug": c["slug"], "nom": c["nom"], "code_insee": c["code_insee"], "total_sales": c["total_sales"]}
                for c in communes
            ],
        }
        (DEPT_DIR / f"{dept}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2))
        print(f"  dept {dept} {DEPT_NAMES.get(dept):24s} : {len(communes)}/{payload['communes_count_total']} communes")

    # ─── Agrégation by_year à l'échelle région & par dept ────────────
    # Lit chaque stats.json pour récupérer le by_year et agrège.
    from collections import defaultdict as _dd
    region_by_year_sales = _dd(int)
    region_by_year_prices = _dd(list)
    dept_by_year: dict[str, dict] = _dd(lambda: _dd(lambda: {"sales": 0, "prices": []}))
    for cdir in COMMUNE_DIR.iterdir():
        if not cdir.is_dir():
            continue
        sp = cdir / "stats.json"
        if not sp.exists():
            continue
        try:
            s = json.loads(sp.read_text())
        except Exception:
            continue
        ref = manifest.get(cdir.name)
        if not ref:
            continue
        dept = ref["code_dept"]
        for y in s.get("by_year", []):
            year = int(y["year"])
            sales = int(y["sales"])
            mprice = y["median_price"]
            region_by_year_sales[year] += sales
            region_by_year_prices[year].extend([mprice] * sales)
            dept_by_year[dept][year]["sales"] += sales
            dept_by_year[dept][year]["prices"].extend([mprice] * sales)

    def _serialize_by_year(sales_map: dict, prices_map: dict) -> list[dict]:
        years = sorted(sales_map.keys())
        out = []
        for y in years:
            prices = prices_map[y]
            mp = sorted(prices)[len(prices) // 2] if prices else None
            out.append({"year": y, "sales": sales_map[y], "median_price": mp})
        return out

    region_by_year_payload = _serialize_by_year(region_by_year_sales, region_by_year_prices)

    # Synthèse région
    all_communes_summary = []
    for dept_communes in by_dept.values():
        all_communes_summary.extend(dept_communes)
    all_communes_summary.sort(key=lambda c: -c["total_sales"])
    # Top-3 insights région
    region_insights = []
    if all_communes_summary:
        top = all_communes_summary[0]
        region_insights.append(
            f"{top['nom']} (dept {next((m['code_dept'] for m in manifest.values() if m['code_insee'] == top['code_insee']), '?')}) "
            f"est la commune IDF la plus active des données analysées : {fmt_int(top['total_sales'])} ventes DVF."
        )
    dept_with_most = max(by_dept.items(), key=lambda x: len(x[1]), default=(None, []))
    if dept_with_most[0]:
        region_insights.append(
            f"Le département {DEPT_NAMES.get(dept_with_most[0], dept_with_most[0])} "
            f"compte le plus de communes couvertes ({len(dept_with_most[1])} villes analysées)."
        )
    region_insights.append(
        f"Couverture progressive en cours : {region_total['communes_count']} communes IDF "
        f"sur {len(manifest)} planifiées."
    )

    region_payload = {
        "region_slug": "idf",
        "nom_region": "Île-de-France",
        "depts": [
            {
                "code_dept": d,
                "nom_dept": DEPT_NAMES.get(d, d),
                "communes_count_total": sum(1 for c in manifest.values() if c["code_dept"] == d),
                "communes_count_available": len(by_dept.get(d, [])),
                "total_sales": sum(c["total_sales"] for c in by_dept.get(d, [])),
            }
            for d in sorted(DEPT_NAMES)
        ],
        "communes_count_total": len(manifest),
        "communes_count_available": region_total["communes_count"],
        "total_sales_available": region_total["total_sales"],
        "population_total": sum(c.get("population", 0) for c in manifest.values()),
        "insights": region_insights,
        "top_communes": all_communes_summary[:30],
        "by_year": region_by_year_payload,
    }

    # Patch chaque dept.json avec son by_year
    for dept_code in by_dept:
        dept_file = DEPT_DIR / f"{dept_code}.json"
        if dept_file.exists():
            d = json.loads(dept_file.read_text())
            d["by_year"] = _serialize_by_year(
                {y: v["sales"] for y, v in dept_by_year[dept_code].items()},
                {y: v["prices"] for y, v in dept_by_year[dept_code].items()},
            )
            dept_file.write_text(json.dumps(d, ensure_ascii=False, indent=2))
    (IDF_DIR / "region.json").write_text(json.dumps(region_payload, ensure_ascii=False, indent=2))
    print(f"\n  Région IDF : {region_total['communes_count']}/{len(manifest)} communes disponibles")
    print(f"  Total ventes DVF : {region_total['total_sales']:,}")

    # GeoJSON markers communes (utilisé par la carte régionale frontend)
    features = []
    for c in all_communes_summary:
        if c["lng"] is None or c["lat"] is None:
            continue
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [c["lng"], c["lat"]]},
            "properties": {
                "code_insee": c["code_insee"],
                "slug": c["slug"],
                "nom": c["nom"],
                "code_dept": next(
                    (m["code_dept"] for m in manifest.values() if m["code_insee"] == c["code_insee"]),
                    None,
                ),
                "population": c["population"],
                "total_sales": c["total_sales"],
                "median_price": c["median_price"],
                "median_price_per_sqm": c["median_price_per_sqm"],
            },
        })
    (IDF_DIR / "communes_map.geojson").write_text(json.dumps({
        "type": "FeatureCollection",
        "features": features,
    }, ensure_ascii=False))
    print(f"  GeoJSON markers : {len(features)} communes")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
