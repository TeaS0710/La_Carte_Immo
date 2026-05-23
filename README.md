# Carte du marché immobilier · Saint-Maur-des-Fossés

Outil interactif d'analyse du marché immobilier local pour les agences
partenaires de **Prelys Courtage Saint-Maur**.

> **Démo en ligne** · à compléter après le premier déploiement
> _https://teas0710.github.io/<repo>/_

## Ce que fait l'outil

- **Carte interactive** Saint-Maur (34 quartiers IRIS, ~16 000 transactions
  DVF 2021–2025, 16 000 logements DPE ADEME)
- **Score prédictif** par logement : probabilité de mise en vente sous 12 mois
  (régression logistique calibrée sur l'historique réel)
- **Analyses par quartier** générées automatiquement (Ollama `gpt-oss:120b`)
  avec recoupement factuel des chiffres cités
- **Projection prix** mensuelle avec fan chart de confiance (5 ans
  d'historique lissé)
- **Données croisées** : INSEE socio-démo, BPE équipements, Géorisques,
  distances RER A, photos aériennes IGN

## Stack technique

- **Frontend** : Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4
- **Cartographie** : MapLibre GL JS · tuiles Carto Voyager
- **Graphiques** : Recharts
- **Pipeline data** : Python (pandas · shapely · scikit-learn · statsmodels)
- **IA** : Ollama Cloud (`gpt-oss:120b`) pour la rédaction des fiches
- **Déploiement** : Static export, hébergement GitHub Pages

## Architecture

```
public/
  data/saint-maur/    ← données pré-calculées servies par le site (commit)
  prelys/             ← assets visuels Prelys (commit)
src/
  app/                ← pages Next.js (landing + /carte)
  components/         ← UI carte + landing
  lib/                ← helpers format / URL / types
scripts/              ← pipeline Python (téléchargement + calibration + IA)
data/                 ← sources brutes (gitignored, régénérables)
docs/                 ← documentation des sources de données
.github/workflows/    ← déploiement automatique GitHub Pages
```

## Développement local

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Re-générer la donnée

Toute la chaîne est dans `scripts/`. À lancer dans l'ordre quand on veut
rafraîchir les données :

```bash
# 1. Télécharger DVF + sources INSEE/BPE/OSM/DPE
python3 scripts/download_dvf.py
python3 scripts/build_knowledge_base.py

# 2. Construire les datasets servis au front
python3 scripts/build_dvf_dataset.py
python3 scripts/prepare_iris_for_front.py
python3 scripts/enrich_iris_aggregates.py
python3 scripts/enrich_streets_with_iris.py
python3 scripts/enrich_commune_extras.py

# 3. Modèle prédictif calibré + pipeline DPE
python3 scripts/calibrate_pipeline_model.py
python3 scripts/build_pipeline_dataset.py
python3 scripts/build_permits_dataset.py

# 4. Analyses IA (Ollama Cloud — gratuit avec compte ollama.com)
python3 scripts/run_iris_qwen3_analyses.py
python3 scripts/normalize_iris_analyses.py
python3 scripts/check_analyses_factuality.py

# 5. Projection prix (multi-modèle + bootstrap)
python3 scripts/build_projection_models.py
```

Puis `git commit && git push` → le workflow déploie tout seul.

## Sources de données

Toutes les données sont publiques et libres :

| Source | Usage |
|---|---|
| [DVF DGFiP](https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres/) | Transactions immobilières 2021-2025 |
| [INSEE bases infracommunales 2021](https://www.insee.fr/) | Socio-démo par IRIS |
| [BPE INSEE 2024](https://www.insee.fr/) | Équipements (commerces, écoles, santé) |
| [DPE ADEME](https://data.ademe.fr/) | Diagnostic énergétique des logements |
| [IGN BD-Ortho · Géoplateforme](https://geoservices.ign.fr/) | Photos aériennes |
| [Géorisques](https://www.georisques.gouv.fr/) | Risques naturels et technologiques |
| [OpenStreetMap via Overpass](https://overpass-api.de/) | POI quartier |
| Cadastre Étalab | Parcelles + bâtiments |

Voir `docs/DATA_SOURCES.md` pour le détail par source (URL, licence, volume).

## Déploiement

Voir [`DEPLOY.md`](./DEPLOY.md) pour la procédure complète (GitHub Pages,
GitHub Actions, domaine custom).

## Crédits

Pipeline data et tooling : Saiga · Hébergement de l'outil : Prelys Courtage
Saint-Maur · Données publiques : DGFiP, INSEE, ADEME, IGN, Géorisques.

## Garde-fous RGPD

L'outil n'expose aucune donnée nominative d'habitant. Les indicateurs socio
sont agrégés à l'IRIS (≥ 200 ménages). Les boutons annuaire ouvrent les
formulaires de recherche manuelle sur les sites officiels (Pages Jaunes /
Pappers / Cadastre), sans collecte ni stockage de notre côté.
