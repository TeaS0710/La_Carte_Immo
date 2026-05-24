# Génération IDF complet — procédure opérationnelle

Cette procédure étend La Carte Prelys de Saint-Maur uniquement aux **1266 communes d'Île-de-France** (12,4 M habitants, 8 départements, ~5400 quartiers IRIS).

## Stack technique

- **Backend de génération** : Python 3.12 + scripts dans `scripts/`
- **Sources data publiques** (toutes gratuites) :
  - DVF DGFiP via `cadastre.data.gouv.fr` (transactions)
  - IRIS INSEE shapefile via IGN
  - DPE ADEME via API officielle
  - Cadastre bâti IGN BD TOPO
  - Géorisques via API gouvernementale
  - INSEE Recensement (population, CSP, diplômes)
- **LLM pour analyses qualitatives** : Ollama Cloud `gpt-oss:120b`
- **Frontend** : Next.js statique sur GitHub Pages, route dynamique `/carte/ville/[slug]`

## Prérequis

```bash
pip install pandas shapely scipy requests ollama tqdm
export OLLAMA_API_KEY="..."   # pour les analyses IRIS
```

## Étapes (ordre)

### 1. Générer le manifest IDF (5 min)

```bash
./scripts/fetch_communes_idf.py
```

Produit :
- `scripts/communes_idf.json` (liste de 1266 codes INSEE)
- `public/data/idf/communes.json` (référentiel front avec coordonnées, population)

### 2. Adapter les scripts restants pour --code-insee

Scripts déjà paramétriques :
- ✅ `enrich_commune_extras.py` (Géorisques + transport)
- ✅ `build_commune.py` (orchestrateur)

Scripts qui restent à paramétrer (chacun ~30-60 min de refactor) :
- ⬜ `build_dvf_dataset.py`
- ⬜ `enrich_iris_aggregates.py`
- ⬜ `enrich_streets_with_iris.py`
- ⬜ `build_permits_dataset.py`
- ⬜ `build_pipeline_dataset.py`
- ⬜ `build_projection_models.py`
- ⬜ `build_knowledge_base.py`
- ⬜ `run_iris_qwen3_analyses.py`
- ⬜ `check_analyses_factuality.py`

Pattern à appliquer dans chaque :
```python
import argparse
parser = argparse.ArgumentParser()
parser.add_argument("--code-insee", required=True)
args = parser.parse_args()
CODE_INSEE = args.code_insee
COMMUNE_DIR = ROOT / "public" / "data" / "commune" / CODE_INSEE
COMMUNE_DIR.mkdir(parents=True, exist_ok=True)
```

### 3. Lancer la génération en batch (12-24 h wall-clock)

Mode rapide (sans LLM) pour valider la chaîne :

```bash
./scripts/build_commune.py --batch scripts/communes_idf.json --skip-llm --continue-on-error
```

Mode complet (avec analyses LLM, ~22 h) :

```bash
./scripts/build_commune.py --batch scripts/communes_idf.json --continue-on-error
```

Ressources estimées :
- Stockage final : ~500 MB - 1 GB total (compressible)
- Bande passante : ~5 GB de téléchargement APIs
- LLM : ~50-100 € si Ollama Cloud, gratuit si infra locale

### 4. Vérifier la disponibilité

```bash
ls public/data/commune/ | wc -l   # devrait être 1266
```

### 5. Build et déploiement

```bash
npm run build
```

Le `generateStaticParams` de `/carte/ville/[slug]` pré-génère
automatiquement une page par commune disponible. Le sélecteur de
ville sur la home utilise `/data/idf/communes.json`.

## Cas particuliers

- **Paris (75056)** : 20 arrondissements traités comme 1 ville
  (le code INSEE 75056 agrège, les arrondissements 75101-75120 n'ont
  pas de DVF unifié — toujours regroupés au niveau commune Paris)
- **Communes <500 hab.** : analyse LLM facultative (peu de valeur)
- **Communes sans DVF** : skip avec warning, page non générée

## Coût LLM par commune (estimation)

| Volume IRIS | Coût Ollama Cloud |
|---|---|
| < 5 (commune rurale) | ~0.05 € |
| 5-30 (commune moyenne) | ~0.30 € |
| > 30 (ville moyenne) | ~1 € |
| Paris (>900 IRIS) | ~10 € |
| **Total IDF** | **~50-100 €** |

## Stockage GitHub Pages

GitHub Pages : limite 1 GB par repo, fichiers individuels max 100 MB.
Si dépassé, basculer vers GitHub Releases (jusqu'à 2 GB/release, gratuit)
servis via jsDelivr CDN.
