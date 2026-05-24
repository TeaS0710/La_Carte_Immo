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

    # Écrit synthèse par dept
    for dept, communes in sorted(by_dept.items()):
        communes.sort(key=lambda c: -c["total_sales"])
        dept_total_sales = sum(c["total_sales"] for c in communes)
        dept_population = sum(c["population"] for c in communes)
        # Prix médian dept : médiane pondérée des médians communaux
        prices = [c["median_price"] for c in communes if c["median_price"]]
        median_price_dept = sorted(prices)[len(prices) // 2] if prices else None
        payload = {
            "code_dept": dept,
            "nom_dept": DEPT_NAMES.get(dept, dept),
            "communes_count_total": sum(1 for c in manifest.values() if c["code_dept"] == dept),
            "communes_count_available": len(communes),
            "total_sales": dept_total_sales,
            "median_price": median_price_dept,
            "population_total": sum(c["population"] for c in manifest.values() if c["code_dept"] == dept),
            "population_available": dept_population,
            "top_communes": communes[:20],
            "all_communes_available": [
                {"slug": c["slug"], "nom": c["nom"], "code_insee": c["code_insee"], "total_sales": c["total_sales"]}
                for c in communes
            ],
        }
        (DEPT_DIR / f"{dept}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2))
        print(f"  dept {dept} {DEPT_NAMES.get(dept):24s} : {len(communes)}/{payload['communes_count_total']} communes")

    # Synthèse région
    all_communes_summary = []
    for dept_communes in by_dept.values():
        all_communes_summary.extend(dept_communes)
    all_communes_summary.sort(key=lambda c: -c["total_sales"])
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
        "top_communes": all_communes_summary[:30],
    }
    (IDF_DIR / "region.json").write_text(json.dumps(region_payload, ensure_ascii=False, indent=2))
    print(f"\n  Région IDF : {region_total['communes_count']}/{len(manifest)} communes disponibles")
    print(f"  Total ventes DVF : {region_total['total_sales']:,}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
