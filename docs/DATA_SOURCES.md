# Sources de données — Prelys Courtage (Saint-Maur-des-Fossés, 94068)

Document de référence pour la couche "knowledge base" — recense chaque source
de données ouvertes ou commerciales pertinente pour le profilage socio-éco du
territoire de Saint-Maur-des-Fossés (Val-de-Marne, code INSEE `94068`).

Mise à jour : 2026-05-23 — auteur : agent automatisé (knowledge-base builder).

## Légende du statut juridique

| Symbole | Sens |
|---------|------|
| OK     | Libre — licence ouverte (Etalab, ODbL, CC-BY) — exploitation commerciale autorisée. |
| COND   | Conditionnel — licence avec mentions, contre-partie ou enregistrement. |
| PAID   | API payante — pas de free tier exploitable industriellement. |
| NO     | Scraping interdit / risque légal (CGU + droit sui generis BDD + RGPD). |
| TODO   | Source à confirmer juridiquement. |

## Sources téléchargées (intégrées au build)

### 1. DVF (Demandes de Valeurs Foncières) — déjà intégré
- **URL** : https://files.data.gouv.fr/geo-dvf/ + https://app.dvf.etalab.gouv.fr
- **Format** : CSV par année, géocodé
- **Granularité** : transaction (parcelle, adresse)
- **Statut** : OK (Etalab)
- **Volume Saint-Maur** : ~12 000 transactions 2021-2025 (4 Mo)
- **Intérêt** : turnover par rue/parcelle, prix médian €/m², fiche immeuble → outil n°1 et n°2 Prelys.

### 2. Contours IRIS (IGN Géoplateforme)
- **URL** : https://data.geopf.fr/wfs/ows?service=WFS&typeNames=STATISTICALUNITS.IRIS:contours_iris
- **Format** : GeoJSON (WFS 2.0)
- **Granularité** : IRIS
- **Statut** : OK (licence ouverte Etalab)
- **Volume** : 34 IRIS pour Saint-Maur, 30 Ko
- **Intérêt** : maille géographique pivot pour toutes les stats INSEE (~2 000 hab par IRIS).

### 3. INSEE bases infracommunales 2021 (4 bases sur IRIS)
- **URL pop** : https://www.insee.fr/fr/statistiques/8268806 (base-ic-evol-struct-pop-2021)
- **URL logement** : https://www.insee.fr/fr/statistiques/8268838 (base-ic-logement-2021)
- **URL couples-familles-ménages** : https://www.insee.fr/fr/statistiques/8268828
- **URL diplômes-formation** : https://www.insee.fr/fr/statistiques/8268840
- **Format** : CSV, séparateur `,`, encodage UTF-8 BOM, 1 ligne par IRIS
- **Granularité** : IRIS (parfois COM si IRIS unique)
- **Statut** : OK (Etalab)
- **Volume** : 4 fichiers × 34 IRIS, ~160 Ko
- **Intérêt** : pyramide des âges, CSP, statut d'occupation, surface logements,
  ancienneté résidence, niveau de diplôme, structure ménages → profilage socio-éco fin.

### 4. INSEE Filosofi — TODO
- **URL** : data.gouv slug `base-des-revenus-fiscaux-localises-iris` (à confirmer)
- **Format** : CSV par IRIS (revenu disponible, taux pauvreté, déciles)
- **Statut** : OK (Etalab)
- **Volume estimé** : <100 Ko pour Saint-Maur
- **Intérêt** : signal de gentrification (évolution revenu), profil acheteur cible.
- **Pourquoi pas téléchargé** : ID INSEE 2021 IRIS non trouvé en brute force (404 sur IDs candidats),
  l'agrégat commune-only n'est pas suffisamment fin pour notre besoin. À compléter en V2
  via le portail data.gouv directement.

### 5. BPE — Base permanente des équipements 2024 (INSEE)
- **URL** : https://www.insee.fr/fr/statistiques/8217525 (`BPE24.parquet`)
- **Format** : Parquet, 89 colonnes, géocodé en France entière
- **Granularité** : équipement individuel (école, commerce, médecin, sport, etc.)
- **Statut** : OK (Etalab)
- **Volume** : 183 Mo national → filtré à 3 476 équipements (220 Ko) pour Saint-Maur
- **Intérêt** : fiche quartier exhaustive — densité commerciale, santé, scolaire.

### 6. Cadastre étalab (DGFIP via cadastre.data.gouv.fr)
- **URL** : https://cadastre.data.gouv.fr/data/etalab-cadastre/latest/geojson/communes/94/94068/
- **Fichiers** : `parcelles.json.gz` (16 653 parcelles), `batiments.json.gz`, `sections.json.gz`
- **Format** : GeoJSON gzipped
- **Granularité** : parcelle cadastrale, bâtiment
- **Statut** : OK (Etalab)
- **Volume** : 2.8 Mo
- **Intérêt** : ancrage parcelle/bâtiment pour fiche immeuble + jointure DVF/DPE.

### 7. BAN — Base Adresse Nationale
- **URL** : https://adresse.data.gouv.fr/data/ban/adresses/latest/csv/adresses-94.csv.gz
- **Format** : CSV (filtré 94068 → 16 972 adresses)
- **Granularité** : adresse géocodée + id_fantoir + ref parcelle
- **Statut** : OK (Etalab + ODbL pour la composante OSM)
- **Volume Saint-Maur** : 3.8 Mo
- **Intérêt** : géocodage canonique + lien fantoir/parcelle/voie pour normaliser les autres sources.

### 8. DPE ADEME — Diagnostic de performance énergétique
- **URL** : https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant (filtré par `code_insee_ban:94068`)
- **Format** : JSON (Data Fair API)
- **Granularité** : logement individuel diagnostiqué (depuis juillet 2021)
- **Statut** : OK (Etalab)
- **Volume Saint-Maur** : 16 448 DPE actifs (13 Mo, sous-ensemble de champs)
- **Intérêt** : passoires énergétiques (D-F-G) = gisement de financement travaux pour Prelys,
  millésime construction par bâtiment, surface habitable.

### 9. OpenStreetMap (via Overpass)
- **URL** : https://overpass-api.de/api/interpreter (query par area INSEE)
- **Format** : JSON Overpass
- **Granularité** : POI (node/way), tags libres
- **Statut** : OK (ODbL — attribution requise "© les contributeurs OpenStreetMap")
- **Volume Saint-Maur** : 2 733 éléments (660 Ko)
- **Intérêt** : POI quartier (commerces, transports, écoles, parcs) complémentaire à BPE.
- **Garde-fou** : si redistribution publique, mentionner ODbL et fournir un lien vers les données sources.

### 10. Sirene (annuaire entreprises) — via API recherche-entreprises
- **URL** : https://recherche-entreprises.api.gouv.fr/search?code_commune=94068
- **Format** : JSON paginé (cap 10 000 résultats)
- **Granularité** : unité légale + établissement (SIRET)
- **Statut** : OK (Etalab — données SIRENE diffusables sauf flag `STATUT_DIFFUSION=N`)
- **Volume téléchargé** : 1 245 entreprises actives sur ~20 codes NAF ciblés (agences immo, courtage, restauration, supermarchés, santé), 5 Mo
- **Intérêt** : cartographier les 392 agences immobilières actives (apporteurs potentiels), animation économique du quartier.
- **Note** : API rate-limit à 7 req/s, retours 429 fréquents au-delà.

### 11. Annuaire de l'Éducation Nationale
- **URL** : https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records
- **Format** : JSON
- **Granularité** : établissement (UAI)
- **Statut** : OK (Etalab)
- **Volume Saint-Maur** : 55 établissements scolaires (124 Ko)
- **Intérêt** : carte scolaire = critère #1 pour les familles acheteurs, signal de quartier.

### 12. Délinquance — bases statistiques communales (Service Statistique Ministériel de la Sécurité Intérieure)
- **URL** : data.gouv slug `bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales`
- **Format** : Parquet
- **Granularité** : commune × indicateur × année
- **Statut** : OK (Etalab — avec précautions documentation pour l'interprétation)
- **Volume Saint-Maur** : 150 lignes (15 indicateurs × ~10 ans), 7 Ko
- **Intérêt** : signal sécurité — biais de plainte à signaler, à exprimer en taux pour mille.

### 13. Élections présidentielles 2022 par commune (Ministère de l'Intérieur)
- **URL** : data.gouv slugs `resultats-du-premier-tour-de-lelection-presidentielle-2022-par-commune-et-par-departement` + `resultats-du-second-tour-de-lelection-presidentielle-2022`
- **Format** : CSV
- **Granularité** : commune × candidat (T1 = 12 candidats, T2 = 2)
- **Statut** : OK (Etalab)
- **Volume Saint-Maur** : 26 lignes (T1 + T2), 8 Ko
- **Intérêt** : proxy sociopolitique (vote LFI/RN/LR/Renaissance par bureau pour gentrification, fragmentation).
- **Limite** : nous n'avons que le niveau commune — la maille bureau de vote n'a pas
  été trouvée via le portail Min Int. À compléter en V2 (via opendatasoft `elections-france-bureaux-de-vote`).

## Sources documentées mais non téléchargées

### Géoportail / IGN — BD TOPO, BD ALTI, orthophotos
- **Statut** : OK
- **Pourquoi pas téléchargé** : volumes importants (Go) sans valeur immédiate pour le profilage socio-éco.
  Utiles plus tard pour : carte 3D bâtiments (BD TOPO bati), pente terrain (RGE ALTI),
  vues façades (orthophotos). Recommandation V2 : extraire le bâti BD TOPO Saint-Maur (~50 Mo).

### BODACC (annonces légales)
- **URL** : https://www.data.gouv.fr/fr/datasets/base-des-publications-au-bodacc/ (mise à jour quotidienne)
- **Statut** : OK
- **Pourquoi pas téléchargé** : volume national 4+ Go zippé, filtrage Saint-Maur coûteux.
  Recommandation V2 : ingestion incrémentale via API opendatasoft `economicalindex` filtré par
  code postal 94100/94210 + nom de commune.
- **Intérêt** : créations/fermetures d'entreprises locales, mouvements SCI (signal cession parc locatif).

### Pappers (gérants, SCI, comptes annuels)
- **URL** : https://api.pappers.fr (free tier 1 000 req/mois)
- **Statut** : COND
- **Pourquoi pas téléchargé** : free tier insuffisant pour la base SCI Saint-Maur (~quelques milliers),
  le tarif passe ensuite à plusieurs centaines d'euros / mois. À évaluer commercialement.
- **Note RGPD** : les noms de personnes physiques gérantes sont diffusables (registre public RNCS)
  mais à manipuler avec prudence — pas de profilage individuel.

### Pages Jaunes / Pages Blanches
- **Statut** : NO — SCRAPING INTERDIT
- **Raisons** : CGU de Solocal interdisent explicitement le scraping ; droit sui generis sur la BDD
  (CPI art. L341-1) ; risque RGPD pour les particuliers (Pages Blanches).
- **Alternative légale** : API Solocal officielle (PAID).
  → **Décision : ne pas exploiter dans ce projet.**

### LinkedIn (profils, entreprises)
- **Statut** : NO — scraping interdit (CGU + jurisprudence HiQ vs LinkedIn US ≠ France ; en France
  TGI a sanctionné le scraping LinkedIn à plusieurs reprises).
- **Décision** : ne pas exploiter.

### Service de la Publicité Foncière — fichier immobilier (DGFIP)
- **Statut** : PAID + intérêt légitime à justifier
- **Coût** : ~15 €/relevé propriétaire, accès restreint aux notaires/officiers ministériels
  sauf intérêt légitime (créancier, etc.).
- **Décision** : ne pas intégrer — un courtier n'a pas d'intérêt légitime opposable.

### SNCF Open Data / RATP (gares, fréquences)
- **URL** : https://ressources.data.sncf.com/, https://data.ratp.fr/
- **Statut** : OK
- **Pourquoi pas téléchargé en V1** : OSM `railway=station` couvre déjà les 4 gares RER A
  (Saint-Maur-Créteil, Le Parc de Saint-Maur, Champigny, La Varenne–Chennevières). Fréquences = pas
  de différenciateur fort à l'échelle d'une seule commune.
- **Recommandation V2** : intégrer les arrêts de bus RATP géolocalisés + GTFS pour le calcul
  d'accessibilité fine.

### Vélib / autres mobilités
- **Statut** : OK (Vélib Métropole open data)
- **Décision** : Saint-Maur a peu de stations Vélib (commune périphérique zone 2) — signal faible.

### Observatoire des loyers (OLAP/CLAMEUR/CITADIN)
- **Statut** : COND (OLAP : agrégats publics mais pas Île-de-France hors Paris dense ;
  CLAMEUR : payant, accès aux pros de l'immo via SeLoger)
- **Pourquoi pas téléchargé** : Saint-Maur n'est pas couvert par OLAP. La référence locative
  IDF officielle pour 2026 est l'arrêté préfectoral d'encadrement des loyers — Saint-Maur n'est
  pas en zone d'encadrement (seule Paris + Plaine Commune + Est Ensemble + Lyon + Lille + Bordeaux
  + Montpellier sont concernés à date de connaissance).
- **Recommandation V2** : agréger les annonces de location publiques (LeBonCoin via API
  partenaire, ou ROSCO si on a un accès pro).

### Permis de construire — Sit@del2 / open permits
- **URL** : https://www.statistiques.developpement-durable.gouv.fr/ (Sit@del2 millésime mensuel)
- **Statut** : OK (anonymisé au-dessus du seuil)
- **Pourquoi pas téléchargé en V1** : volume utile au mois (création/évolution stock logements),
  intérêt fort pour anticiper le marché. **À ajouter en priorité V1.5.**

### RNB — Référentiel National des Bâtiments
- **URL** : https://rnb.beta.gouv.fr/api/alpha/buildings/?insee_code=94068
- **Statut** : OK (Etalab)
- **Pourquoi pas téléchargé** : API encore en alpha, mais le cadastre Etalab + DPE (champ
  `id_rnb`) couvrent déjà 95 % du besoin "fiche immeuble". **À envisager V2** pour ID stable
  cross-source.

### Données fiscales 2022 (Filosofi commune + IRIS)
- Voir #4 — à compléter une fois les IDs INSEE 2021 IRIS retrouvés.

## Décisions juridiques à valider par l'utilisateur

1. **Sirene + Recherche-entreprises** : utilisation OK mais l'API publique a un cap de 10 000
   résultats par requête (~13 % des 78 000 unités légales actives à Saint-Maur). Pour exhaustivité
   nous devrions descendre la BDD complète SIRENE (StockEtablissement, ~10 Go) — à confirmer si
   nécessaire pour le produit.
2. **OSM** : la licence ODbL impose attribution et partage à l'identique des œuvres dérivées.
   Si la knowledge base est exposée publiquement (UI publique, API), il faut afficher
   "© contributeurs OpenStreetMap (ODbL)". Si la KB reste interne (back-office Prelys), pas de
   contrainte forte. **Décision à confirmer**.
3. **Délinquance** : les indicateurs sont parfois "non diffusés" (champ `est_diffuse=False`)
   pour les communes < 10 000 habitants — Saint-Maur n'est pas concerné (76 572 hab) mais il faut
   afficher un avertissement "biais de plainte" en restitution.
4. **DPE** : les adresses sont diffusées en clair (et géocodées). Le couplage DPE + cadastre +
   DVF permet une fiche immeuble très précise — **à 1 logement par bâtiment, on franchit la
   limite RGPD de ré-identification**. Le pipeline agrège systématiquement à la parcelle/IRIS
   pour éviter ce risque.
5. **Pas de scraping** Pages Jaunes/LinkedIn — décision actée par défaut, à confirmer si l'on
   souhaite contractualiser avec Solocal (API payante).

## Convention de stockage

```
data/raw/<source>/<fichier brut>     # immuable, daté implicitement par le moment du téléchargement
data/knowledge_base/entities.jsonl    # un JSON par entité unifiée (commune/iris/rue/parcelle)
data/knowledge_base/fiches/*.md       # fiches lisibles pour injection LLM
```

## Fraîcheur

| Source | Dernier millésime | Fréquence de rafraîchissement |
|--------|-------------------|------------------------------|
| DVF | 2025 (semestriel) | Avril & octobre |
| IRIS (contours) | LATEST (annuel) | Janvier |
| INSEE bases IRIS | 2021 (publié déc. 2024) | Annuelle |
| BPE | 2024 | Annuelle (mars) |
| Cadastre étalab | LATEST (mensuel) | Mensuelle |
| BAN | LATEST (mensuel) | Mensuelle |
| DPE ADEME | continu | Quasi temps réel |
| OSM | continu | Quotidienne |
| Sirene API | continu | Temps réel |
| Annuaire Education | rentrée | Annuelle (août) |
| Délinquance | 2025 | Annuelle (janvier) |
| Élections présidentielles | 2022 | Définitive |
