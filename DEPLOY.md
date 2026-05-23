# Déploiement sur GitHub Pages

## TL;DR

```bash
# 1. Pousse le code sur GitHub (main branch)
git push origin main

# 2. Active GitHub Pages : Settings → Pages → Source : "GitHub Actions"
# 3. Le workflow .github/workflows/deploy.yml se lance automatiquement
# 4. La carte est en ligne sur https://<user>.github.io/<repo>/
```

## Test local du build statique

```bash
# Sans base path (domaine racine)
npm run build
npx serve out

# Avec base path pour simuler GitHub Pages sous /repo-name/
NEXT_PUBLIC_BASE_PATH=/courtage_project npm run build
npx serve out -l 3000
# → ouvre http://localhost:3000/courtage_project/
```

## Configuration GitHub Pages côté repo

1. **Settings → Pages**
2. **Source** : `GitHub Actions` (pas `Deploy from a branch`)
3. C'est tout — le workflow gère la suite

## Domaine custom (optionnel)

Si tu utilises un domaine perso (ex. `carte.prelys-saint-maur.fr`) :

1. **Settings → Pages → Custom domain** → saisis le domaine
2. Crée un fichier `public/CNAME` contenant le domaine
3. Configure ton DNS : `CNAME` vers `<user>.github.io`
4. Le `NEXT_PUBLIC_BASE_PATH` reste vide (root domain)

## Architecture du build

- **Pré-calculé** (commité dans le repo, sous `public/data/saint-maur/`)
 - DVF agrégés par rue, parcelle, IRIS
 - Pipeline DPE scoré
 - Analyses GPT-OSS par quartier
 - Projection mensuelle + bootstrap
 - Risques Géorisques
 - Distances RER
 - Validation factuelle des analyses
- **Build statique** (`out/` après `npm run build`)
 - HTML pré-rendu pour `/` et `/carte/`
 - JS/CSS bundle Next.js
 - GeoJSON et JSON pré-calculés copiés depuis `public/`

## Re-générer les données (avant un push)

Tout passe par des scripts Python dans `scripts/` :

```bash
# Pipeline DVF de base
python3 scripts/download_dvf.py
python3 scripts/build_dvf_dataset.py

# Knowledge base (sources INSEE/BPE/OSM/etc.)
python3 scripts/build_knowledge_base.py

# Enrichissements IRIS
python3 scripts/prepare_iris_for_front.py
python3 scripts/enrich_iris_aggregates.py
python3 scripts/enrich_streets_with_iris.py
python3 scripts/enrich_commune_extras.py

# Modèle prédictif calibré
python3 scripts/calibrate_pipeline_model.py
python3 scripts/build_pipeline_dataset.py
python3 scripts/build_permits_dataset.py

# Analyses IA (Ollama Cloud gpt-oss:120b)
python3 scripts/run_iris_qwen3_analyses.py
python3 scripts/normalize_iris_analyses.py
python3 scripts/check_analyses_factuality.py

# Projection prix multi-modèle
python3 scripts/build_projection_models.py
```

Puis commit + push → GitHub Actions rebuild + redeploy.

## Limites & points d'attention

- **Taille de l'output** : `out/` = ~72 Mo (transactions geojson 6 Mo, pipeline 8 Mo).
 GitHub Pages limite la bande passante à 100 Go/mois, ça tient large.
- **Pas de SSR** : tout est statique. Les analyses IA sont pré-générées,
 pas live. Pour les rafraîchir, re-run le script Python puis re-push.
- **MapLibre + tuiles Carto** : chargées depuis le CDN public Carto, fonctionne
 sans clé. Pour usage commercial intense, prévoir un compte Carto ou auto-héberger
 les tuiles.
- **Liens annuaire / Pappers** : les sites cibles ont du Cloudflare anti-bot,
 mais le formulaire pré-rempli s'ouvre normalement dans le navigateur.
