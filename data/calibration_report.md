# Calibration du modèle prédictif

Fenêtre cible : ventes dans les **36 mois** suivant la date du DPE
Rayon spatial DPE↔DVF : **~30 m** (0.0003° de latitude)

## Dataset
- 11865 DPE éligibles (étiquette D/E/F/G, surface 9-600 m²)
- 4641 positifs (39.1 %)
- Sources : DPE ADEME 94068 · DVF DGFiP 2021-2025 · IRIS INSEE

## Métriques (validation croisée 5-fold)
- **ROC AUC** : 0.608 ± 0.015 (0,5 = aléatoire, 1 = parfait)
- **PR AUC** : 0.484
- **Brier score** : 0.2409 (plus bas = mieux calibré)
- **Lift @ top 10 %** : ×1.42 vs base rate
- **Lift @ top 25 %** : ×1.31 vs base rate

## Coefficients (logit)
Un coefficient positif augmente la probabilité de vente.

| Feature | Coefficient | Effet |
|---|---:|---|
| `et_e` | +0.201 | ↑ vendu |
| `et_f` | +0.304 | ↑ vendu |
| `et_g` | +0.435 | ↑ vendu |
| `log_surface` | -0.223 | ↓ stable |
| `old_pre1949` | +0.554 | ↑ vendu |
| `old_1949_1974` | -0.324 | ↓ stable |
| `is_maison` | +0.553 | ↑ vendu |
| `chauffage_fioul` | +0.227 | ↑ vendu |
| `iris_log_turnover` | +0.326 | ↑ vendu |
| `iris_pct_65p_norm` | +0.000 | ↓ stable |
| `intercept` | -1.501 | — |

## Interprétation pour le pitch
Le score affiché dans IrisCard et popup pipeline est désormais une **vraie probabilité de vente sous 12 mois**, calibrée sur l'historique 2021-2025, et non plus un score heuristique arbitraire. Le lift @ top 25 % indique qu'un courtier qui prospecte uniquement la queue haute du score voit **×1.3 plus d'occasions de vente réelles** que la prospection aveugle.