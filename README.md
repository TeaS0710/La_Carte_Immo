# La Carte Prelys

Outil interactif d'analyse de marché immobilier pour les agences partenaires de Prelys Courtage. Déployé en statique sur GitHub Pages, open source, sans backend ni paywall.

→ https://teas0710.github.io/prelys-carte-saint-maur/

## Stack

- **Frontend** : Next.js 16 (App Router) · TypeScript · Tailwind 4 · React 19
- **Cartographie** : MapLibre GL JS · style vectoriel OpenFreeMap Positron · couche 3D bâtiments
- **Charts** : Recharts
- **Pipeline data** : Python 3.12 · pandas · shapely · scikit-learn · statsmodels
- **LLM** : Ollama Cloud `gpt-oss:120b-cloud` pour les notes d'analyse quartier
- **Hébergement** : GitHub Pages (build statique, `output: "export"`)

## Architecture data

Arborescence servie statiquement sous `public/data/` :

```
idf/
├── communes.json         → référentiel 1266 communes (slug, INSEE, dept, pop, centroïde)
└── region.json           → synthèse régionale (top dépts, top villes)
dept/
└── {code}.json           → synthèse par département (top villes, KPI)
commune/
└── {code_insee}/
    ├── stats.json              → KPI commune (DVF)
    ├── streets.geojson         → 1 point par rue + agrégats DVF
    ├── transactions.geojson    → ventes individuelles
    ├── parcelles.geojson       → parcelles avec ≥ 2 ventes
    ├── parcelle_details.json   → historique par parcelle
    ├── top_parcelles.json      → top 30 parcelles
    ├── jt_quartier.json        → pulse marché année courante
    ├── projection.json         → ARIMA + bootstrap CI
    ├── commune_risks.json      → Géorisques (résumé + ICPE + radon + PPR)
    ├── iris.geojson            → polygones IRIS INSEE + agrégations (commune complète)
    ├── iris_analyses.json      → notes LLM par IRIS (commune complète)
    ├── iris_analyses_audit.json → audit factualité (commune complète)
    ├── pipeline.geojson        → logements DPE F/G scorés (commune complète)
    ├── permits.geojson         → bâtiments modifiés cadastre IGN (commune complète)
    ├── commune.json            → moyennes commune
    ├── model_coefficients.json → coefs sklearn calibrés
    └── dpe.geojson             → tous les DPE de la commune
```

Communes en mode "partiel" (juste DVF + projection + géorisques) vs commune "complète" : seule Saint-Maur (94068) est complète aujourd'hui.

## Routes Next.js

```
/                               landing Prelys
/carte                          page Saint-Maur par défaut
/carte/region/idf               vue région IDF avec recherche commune
/carte/dept/{code}              vue départementale (generateStaticParams)
/carte/ville/{slug}             vue commune (generateStaticParams)
```

Les pages `[code]` et `[slug]` sont énumérées automatiquement depuis le filesystem au moment du build.

## Scripts Python (pipeline data)

Tous paramétrés via `argparse --code-insee XXXXX`. Orchestrés par `build_commune.py`.

| Script | Rôle | Sources |
|---|---|---|
| `download_dvf.py` | Télécharge DVF par commune × année | files.data.gouv.fr |
| `fetch_communes_idf.py` | Récupère le référentiel IDF | geo.api.gouv.fr |
| `build_dvf_dataset.py` | Agrège DVF en streets/transactions/parcelles | DVF brut |
| `enrich_iris_aggregates.py` | Joint IRIS × DVF, calcule scores | iris.geojson |
| `enrich_streets_with_iris.py` | Rattache rues → IRIS | streets + iris |
| `build_permits_dataset.py` | Permits cadastre via IGN | Cadastre |
| `build_pipeline_dataset.py` | Score sklearn proba vente 12 mois | DPE ADEME |
| `calibrate_pipeline_model.py` | Calibre logistic regression sur DVF | DVF + DPE |
| `build_projection_models.py` | ARIMA + bootstrap CI | DVF mensuel |
| `enrich_commune_extras.py` | Géorisques + transport | Géorisques API |
| `build_knowledge_base.py` | KB unifiée (markdown briefings) | Tout |
| `run_iris_qwen3_analyses.py` | Notes LLM Ollama par IRIS | KB |
| `check_analyses_factuality.py` | Audit factualité chiffres cités | analyses + KB |
| `build_dept_aggregates.py` | Agrège stats.json par dépt et région | stats par commune |

## Étendre à une nouvelle commune

```bash
./scripts/download_dvf.py --communes 75056
./scripts/build_commune.py --code-insee 75056 --skip-llm --continue-on-error
./scripts/build_dept_aggregates.py
npm run build
git add -A && git commit -m "Ajout Paris (75056)" && git push
```

GitHub Actions déploie automatiquement sur push de main.

## Étendre à toute l'IDF

```bash
./scripts/download_dvf.py --communes $(jq -r '.[]' scripts/communes_idf.json | tr '\n' ' ')
./scripts/build_commune.py --batch scripts/communes_idf.json --skip-llm --continue-on-error
./scripts/build_dept_aggregates.py
npm run build && git push
```

Voir `scripts/README_IDF.md` pour la procédure complète + coûts/durées estimés.

## Composants React clés

- `src/app/carte/CarteClient.tsx` — orchestrateur (états, filtres, modals)
- `src/components/carte/CarteMap.tsx` — MapLibre + interactions, layers conditionnels selon data dispo
- `src/components/carte/FiltersBubble.tsx` — bulle Projections gauche
- `src/components/carte/MarketModal.tsx` — modal Historique 3 onglets
- `src/components/carte/IrisCard.tsx` — fiche IRIS détaillée
- `src/components/carte/StreetCard.tsx` — fiche rue
- `src/components/carte/PipelineCard.tsx` — fiche logement potentiel DPE F/G
- `src/components/carte/PermitCard.tsx` — fiche bâtiment modifié
- `src/components/carte/RisquesPanel.tsx` — bloc compact Géorisques
- `src/components/carte/CommuneSearch.tsx` — autocomplete recherche commune IDF
- `src/components/carte/ExternalLookup.tsx` — deeplinks PJ/PB/Pappers/Street View
- `src/components/ui/AnalyseGate.tsx` — gate "Lancer l'analyse" + cercle
- `src/components/ui/CircularProgress.tsx` — anneau SVG sobre

## Stockage GitHub Pages

Limite repo : 1 GB. Si dépassé, basculer `public/data/` vers GitHub Releases (limite 2 GB/release) servis via jsDelivr CDN.

## Licences

- Code source : MIT (à confirmer)
- DVF : DGFiP, Licence Ouverte 2.0
- INSEE : Licence Ouverte 2.0
- DPE : ADEME, Licence Ouverte 2.0
- Cadastre : IGN, Licence Ouverte 2.0
- Géorisques : données ouvertes
- Carte : OpenFreeMap (libre) — OpenStreetMap (ODbL)
