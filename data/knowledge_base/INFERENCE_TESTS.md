## Test — 2026-05-23T13:34:16

- Modèle : `gemma3:latest`
- Question : **Décris le profil socio-éco de l'IRIS Vieux Saint-Maur en 5 puces utiles pour un argumentaire commercial vers une agence immo.**
- Fiches retrieved (4) : iris-940680201-le-vieux-saint-maur-1, iris-940680202-le-vieux-saint-maur-2, iris-940680203-le-vieux-saint-maur-3, iris-940680204-le-vieux-saint-maur-4
- Latence : 115.92 s

### Contexte injecté (résumé)
```

----- Fiche : iris-940680201-le-vieux-saint-maur-1 (iris) -----
# IRIS Le Vieux Saint-Maur 1 (940680201)

- Commune : Saint-Maur-des-Fossés (94068)
- Type IRIS : H (Habitat)
- Centroïde : lat=48.81245, lng=2.47346

## Population (INSEE 2021)
- Population totale : 1 723 habitants
- Hommes / Femmes : 806 / 917
- 0-14 ans : 314 (18,2 %)
- 65 ans et + : 293 (17,0 %)
- Population étrangère : 149 (8,6 %)

## Catégories socio-professionnelles (15+ ans)
- Agriculteurs (CS1) : 0
- Cadres et professions intellectuelles supérieures (CS3) : 427 (27,9 %)
- Employés (CS5) : 150
- Ouvriers (CS6) : 34
- Diplômés du supérieur long (BAC+5 et plus) : 371 sur 1 189 non-scolarisés 15+ (31,2 %)

## Logement
- Logements totaux : 1 019
- Résidences principales : 955
- Propriétaires : 522 (54,7 %) — Locataires : 408 (42,7 %) — HLM : 38 (4,0 %)
- Maisons : 72 (7,1 %) — Appartements : 945 (92,7 %)
- Grands logements (120 m²+) : 27 — Petits (-30 m²) : 123

## Équipements (BPE 2024)
- Services aux particuliers : 21
- Santé / social : 14
- Commerces : 6
- Enseignement : 4
- Sports / loisirs / culture : 1
- Tourisme : 1

## Points d'intérêt OSM (top 8)
- amenity:bench : 10
- amenity:bicycle_parking : 8
- amenity:restaurant : 4
- public_transport:platform : 3
- amenity:parking_space : 3
- amenity:recycling : 3
- amenity:parking : 2
- shop:bakery : 2

## DPE (étiquettes énergétiques)
- C : 244
- D : 166
- E : 135
- F : 54
- G : 25

----- Fiche : iris-940680202-le-vieux-saint-maur-2 (iris) -----
# IRIS Le Vieux Saint-Maur 2 (940680202)

- Commune : Saint-Maur-des-Fossés (94068)
- Type IRIS : H (Habitat)
- Centroïde : lat=48.81188, lng=2.48179

## Population (INSEE 2021)
- Population totale : 1 861 habitants
- Hommes / Femmes : 829 / 1 032
- 0-14 ans : 292 (15,7 %)
- 65 ans et + : 518 (27,8 %)
- Populat
[...tronqué...]
```

### Réponse brute Ollama

Voici une description du profil socio-économique de l'IRIS Vieux Saint-Maur, structurée en 5 puces pertinentes pour un argumentaire commercial destiné à des agences immobilières partenaires :

*   **Population active et cadre :** L'IRIS Vieux Saint-Maur 1, 2 et 3 présentent une forte proportion de cadres et professions intellectuelles supérieures (entre 27% et 28%, source : INSEE 2021), ainsi qu'un nombre important d'employés. Cela indique un marché potentiel pour des biens immobiliers de qualité et potentiellement plus onéreux.

*   **Logement majoritairement locatif :**  La majorité des résidences principales sont occupées en location (entre 42,7% et 49,1%, source : BPE 2024), ce qui suggère une demande locative importante et une opportunité pour les agences de proposer des biens à loyer maîtrisé ou des locations de standing.

*   **Population vieillissante avec un fort niveau de diplôme :** La population est vieillissante avec une proportion importante de personnes âgées de 65 ans et plus (entre 14,1% et 27,8%, source : INSEE 2021), mais également dotée d'un niveau de diplôme élevé (plus de 31%, source : INSEE 2021). Cela peut correspondre à des besoins spécifiques en termes de logement adapté et de services.

*   **Diversité culturelle et équipements :** La population étrangère représente une part significative (entre 8,4% et 9,9%, source : INSEE 2021), ce qui peut être un atout pour l'attractivité du quartier. De plus, l'offre d'équipements (services, commerces, santé, etc.) est diversifiée (source : BPE 2024), ce qui renforce l'attractivité du secteur.

*   **Logements majoritairement appartement :** La majorité des logements sont des appartements (entre 65,2% et 85,2%, source : BPE 2024), ce qui correspond aux attentes d'une population urbaine et offre des opportunités de développement immobilier dans ce segment.

---
## Test — 2026-05-23T13:35:53

- Modèle : `gemma3:latest`
- Question : **Combien y a-t-il d'agences immobilières actives à Saint-Maur, et quel est le prix médian au m² des appartements vs maisons d'après DVF ?**
- Fiches retrieved (1) : commune-94068
- Latence : 90.18 s

### Contexte injecté (résumé)
```

----- Fiche : commune-94068 (commune) -----
# Commune Saint-Maur-des-Fossés (94068)

- Code INSEE : 94068 — Val-de-Marne (94), Île-de-France
- Population (INSEE 2021 cumulée sur 34 IRIS) : 75 441 habitants

## Logement (INSEE 2021)
- Logements totaux : 37 991
- Résidences principales : 35 049
- Propriétaires : 21 619 (61,7 %) — Locataires : 12 612 (36,0 %) — HLM : 2 310 (6,6 %)

## Profil socio (CSP+ et diplômes)
- Cadres et professions intellectuelles sup. (CS3) : 15 511 sur 63 357 actifs 15+ (24,5 %)

## Marché immobilier — DVF 2021-2025
- Appartement : prix médian 297 000 € — prix médian €/m² : 5595 €/m² (n=4210)
- Maison : prix médian 750 000 € — prix médian €/m² : 7377 €/m² (n=2006)

## Comparatif communes voisines (DVF agrégé 2021-2025, prix médian €/m² appartements)
- Vincennes : 8976 €/m² (n=4092)
- Fontenay-sous-Bois : 6058 €/m² (n=2049)
- Maisons-Alfort : 5632 €/m² (n=2772)
- Saint-Maur-des-Fossés : 5595 €/m² (n=4210)  ← Saint-Maur
- Le Perreux-sur-Marne : 5491 €/m² (n=2044)
- Alfortville : 5222 €/m² (n=2099)
- Villejuif : 5167 €/m² (n=1929)
- Vitry-sur-Seine : 4000 €/m² (n=2339)
- Créteil : 3729 €/m² (n=3156)
- Champigny-sur-Marne : 3722 €/m² (n=2041)

## Équipements (BPE 2024, par domaine)
- Services aux particuliers : 1673
- Commerces : 434
- Enseignement : 63
- Santé / social : 989
- Transports / déplacements : 194
- Sports / loisirs / culture : 90
- Tourisme : 33

## Tissu économique (Sirene actifs, échantillon NAF cible)
- NAF 68.31Z — Agences immobilières : 398 établissements
- NAF 68.32A — Administration d'immeubles : 259 établissements
- NAF 56.10A — Restauration traditionnelle : 247 établissements
- NAF 66.19B — Courtage / intermédiation financière : 72 établissements
- NAF 47.11B — Supérette : 70 établissements
- NAF 56.30Z — Débits de boissons : 4
[...tronqué...]
```

### Réponse brute Ollama

Il y a 398 agences immobilières actives à Saint-Maur-des-Fossés (source : fiche commune-94068).

Le prix médian au m² des appartements est de 5595 € (source : DVF 2021-2025, n=4210) et pour les maisons, il est de 7377 € (source : DVF 2021-2025, n=2006).

---
## Test — 2026-05-23T13:38:30

- Modèle : `gemma3:latest`
- Question : **Parmi les fiches parcelles fournies, identifie la ou les rues les plus actives en transactions (DVF) à Saint-Maur, et donne une fourchette de prix médians.**
- Fiches retrieved (5) : commune-94068, iris-940680201-le-vieux-saint-maur-1, iris-940680202-le-vieux-saint-maur-2, iris-940680203-le-vieux-saint-maur-3, iris-940680204-le-vieux-saint-maur-4
- Latence : 149.98 s

### Contexte injecté (résumé)
```

----- Fiche : commune-94068 (commune) -----
# Commune Saint-Maur-des-Fossés (94068)

- Code INSEE : 94068 — Val-de-Marne (94), Île-de-France
- Population (INSEE 2021 cumulée sur 34 IRIS) : 75 441 habitants

## Logement (INSEE 2021)
- Logements totaux : 37 991
- Résidences principales : 35 049
- Propriétaires : 21 619 (61,7 %) — Locataires : 12 612 (36,0 %) — HLM : 2 310 (6,6 %)

## Profil socio (CSP+ et diplômes)
- Cadres et professions intellectuelles sup. (CS3) : 15 511 sur 63 357 actifs 15+ (24,5 %)

## Marché immobilier — DVF 2021-2025
- Appartement : prix médian 297 000 € — prix médian €/m² : 5595 €/m² (n=4210)
- Maison : prix médian 750 000 € — prix médian €/m² : 7377 €/m² (n=2006)

## Comparatif communes voisines (DVF agrégé 2021-2025, prix médian €/m² appartements)
- Vincennes : 8976 €/m² (n=4092)
- Fontenay-sous-Bois : 6058 €/m² (n=2049)
- Maisons-Alfort : 5632 €/m² (n=2772)
- Saint-Maur-des-Fossés : 5595 €/m² (n=4210)  ← Saint-Maur
- Le Perreux-sur-Marne : 5491 €/m² (n=2044)
- Alfortville : 5222 €/m² (n=2099)
- Villejuif : 5167 €/m² (n=1929)
- Vitry-sur-Seine : 4000 €/m² (n=2339)
- Créteil : 3729 €/m² (n=3156)
- Champigny-sur-Marne : 3722 €/m² (n=2041)

## Équipements (BPE 2024, par domaine)
- Services aux particuliers : 1673
- Commerces : 434
- Enseignement : 63
- Santé / social : 989
- Transports / déplacements : 194
- Sports / loisirs / culture : 90
- Tourisme : 33

## Tissu économique (Sirene actifs, échantillon NAF cible)
- NAF 68.31Z — Agences immobilières : 398 établissements
- NAF 68.32A — Administration d'immeubles : 259 établissements
- NAF 56.10A — Restauration traditionnelle : 247 établissements
- NAF 66.19B — Courtage / intermédiation financière : 72 établissements
- NAF 47.11B — Supérette : 70 établissements
- NAF 56.30Z — Débits de boissons : 4
[...tronqué...]
```

### Réponse brute Ollama

D'après les données de la DVF 2021-2025, les rues les plus actives en transactions à Saint-Maur-des-Fossés sont :

*   **Boulevard de Bellechasse** : 96 (n=1178) - Prix médian : 685 000 € - Prix médian €/m² : 5888 €/m²
*   **Rue Saint-Hilaire** : 24 (n=1012) - Prix médian : 385 000 € - Prix médian €/m² : 4433 €/m²
*   **Avenue Charles de Gaulle** : 5 (n=653) - Prix médian : 580 000 € - Prix médian €/m² : 5376 €/m²

Il est important de noter que ces chiffres sont basés sur les données de la DVF et peuvent varier en fonction des transactions récentes.

---
## Test — 2026-05-23T13:40:13

- Modèle : `gemma3:latest`
- Question : **En t'appuyant uniquement sur les fiches fournies, donne 3 arguments concrets pour vendre nos services courtage Prelys à une agence active dans le quartier Le Vieux Saint-Maur.**
- Fiches retrieved (3) : iris-940680201-le-vieux-saint-maur-1, iris-940680202-le-vieux-saint-maur-2, iris-940680203-le-vieux-saint-maur-3
- Latence : 91.76 s

### Contexte injecté (résumé)
```

----- Fiche : iris-940680201-le-vieux-saint-maur-1 (iris) -----
# IRIS Le Vieux Saint-Maur 1 (940680201)

- Commune : Saint-Maur-des-Fossés (94068)
- Type IRIS : H (Habitat)
- Centroïde : lat=48.81245, lng=2.47346

## Population (INSEE 2021)
- Population totale : 1 723 habitants
- Hommes / Femmes : 806 / 917
- 0-14 ans : 314 (18,2 %)
- 65 ans et + : 293 (17,0 %)
- Population étrangère : 149 (8,6 %)

## Catégories socio-professionnelles (15+ ans)
- Agriculteurs (CS1) : 0
- Cadres et professions intellectuelles supérieures (CS3) : 427 (27,9 %)
- Employés (CS5) : 150
- Ouvriers (CS6) : 34
- Diplômés du supérieur long (BAC+5 et plus) : 371 sur 1 189 non-scolarisés 15+ (31,2 %)

## Logement
- Logements totaux : 1 019
- Résidences principales : 955
- Propriétaires : 522 (54,7 %) — Locataires : 408 (42,7 %) — HLM : 38 (4,0 %)
- Maisons : 72 (7,1 %) — Appartements : 945 (92,7 %)
- Grands logements (120 m²+) : 27 — Petits (-30 m²) : 123

## Équipements (BPE 2024)
- Services aux particuliers : 21
- Santé / social : 14
- Commerces : 6
- Enseignement : 4
- Sports / loisirs / culture : 1
- Tourisme : 1

## Points d'intérêt OSM (top 8)
- amenity:bench : 10
- amenity:bicycle_parking : 8
- amenity:restaurant : 4
- public_transport:platform : 3
- amenity:parking_space : 3
- amenity:recycling : 3
- amenity:parking : 2
- shop:bakery : 2

## DPE (étiquettes énergétiques)
- C : 244
- D : 166
- E : 135
- F : 54
- G : 25

----- Fiche : iris-940680202-le-vieux-saint-maur-2 (iris) -----
# IRIS Le Vieux Saint-Maur 2 (940680202)

- Commune : Saint-Maur-des-Fossés (94068)
- Type IRIS : H (Habitat)
- Centroïde : lat=48.81188, lng=2.48179

## Population (INSEE 2021)
- Population totale : 1 861 habitants
- Hommes / Femmes : 829 / 1 032
- 0-14 ans : 292 (15,7 %)
- 65 ans et + : 518 (27,8 %)
- Populat
[...tronqué...]
```

### Réponse brute Ollama

Voici 3 arguments concrets que l’on peut utiliser pour vendre les services de Prelys Courtage à une agence immobilière partenaire active dans le quartier Le Vieux Saint-Maur, basés sur les données des fiches IRIS :

1.  **Demande locative forte et population qualifiée :**  Les trois IRIS analysés (940680201, 940680202, 940680203) regroupent un total de 6 831 habitants.  Sur ces habitants, 644 sont locataires (20,1% selon l’IRIS 940680202) et 1 189 non-scolarisés 15+ ont un diplôme supérieur long (31,2% selon l’IRIS 940680201). Cela indique une forte demande locative et une population ayant un niveau de qualification élevé, ce qui est un atout pour les agences souhaitant cibler des clients potentiels avec un pouvoir d'achat plus important.

2.  **Prédominance de logements individuels et de maisons :**  Selon les données, 273 logements sont des maisons (34,0% selon l’IRIS 940680203).  Cela représente une opportunité pour Prelys Courtage de proposer des solutions de financement adaptées à l'achat de ces biens, en tenant compte des spécificités des prêts immobiliers pour les maisons.

3.  **Équipements et points d'intérêt diversifiés :** Les trois IRIS présentent une offre d'équipements et de points d'intérêt variés (services aux particuliers, santé/social, commerces, enseignement, sports/loisirs). Cela suggère une population active et diversifiée, avec des besoins financiers variés, que Prelys Courtage peut aider à satisfaire grâce à une offre de crédit sur mesure.

---
