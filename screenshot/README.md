# Captures d'écran du frontend Angular

Captures **versionnées** de chaque page du frontend Angular (React n'est pas capturé), rangées par module. Elles
montrent l'état réel de l'application à la date indiquée ; les maquettes de référence restent dans
[`docs/maquettes/`](../docs/maquettes/README.md). Les captures générées par la suite E2E (`docs/screenshots/`) ne
sont, elles, pas versionnées.

## Organisation

```
screenshot/
  <Module>/
    clair/    ordinateur 1440 × 900, thème clair, page entière
    sombre/   ordinateur 1440 × 900, thème sombre, page entière
    mobile/   téléphone 390 × 844, thème clair, page entière
```

Chaque variante contient les mêmes fichiers, numérotés dans l'ordre de lecture du module.

## Modules

| Module | Date | Données |
| --- | --- | --- |
| [Finance — « Mes achats »](#finance--mes-achats) | 15 novembre 2026 (lot 28 : Mon mois en tableau de bord) | scénario `finance.spec.ts` (novembre 2026 à février 2027) |

### Finance — « Mes achats »

| Fichier | Page ou état |
| --- | --- |
| `00a-premier-acces.png` | Premier accès : une seule question, le total disponible |
| `00b-mon-argent-aujourdhui.png` | Dialogue « Mon argent aujourd'hui » rempli (1 200 €) |
| `00c-visite-guidee.png` | Visite guidée, étape 1 |
| `01-mon-mois.png` | Mon mois (tableau de bord), novembre 2026 : solde, salaire reçu (2 100 €, prévu 2 290 € rappelé pour les calculs), dépenses payées, épargne du mois, lien vers le détail |
| `02-mon-mois-decembre.png` | Mon mois, décembre 2026 (mois à venir) : revenus reçus à 0 €, salaire prévu et date attendue |
| `03-details-du-mois.png` | Détails du mois, novembre 2026 : revenus (sans écart), loyer payé, courses au-delà du plafond expliquées, prêt, épargne réelle |
| `04-details-du-mois-janvier.png` | Détails du mois, janvier 2027 : loyer passé à 400 € |
| `05-operations-historique.png` | Opérations, historique |
| `06-operations-recurrents.png` | Opérations, revenus et charges récurrents |
| `07-projets-achat.png` | Projets d'achat par priorité, prévision de trésorerie et verdict |
| `08-projets-achat-matrice.png` | Projets d'achat en matrice |
| `09-analyses-statistiques.png` | Analyses : épargne et plafond, mois par mois |
| `10-analyses-calendrier.png` | Analyses : calendrier du mois |
| `11-reglages.png` | Réglages de « Mes achats » |
| `12-dialogue-nouvelle-operation.png` | Dialogue « Nouvelle opération » (bouton Dépense) |
| `13-dialogue-projet-achat.png` | Dialogue « Nouvel achat prévu » avec le calcul de faisabilité |

## Régénérer

Sur la recette isolée (backend 18080, Angular 4300, base neuve ; voir
[exploitation § 7](../docs/technique/exploitation.md#7-recette-e2e-isolée)) :

```powershell
# 1. Base sans compte : écran d'accueil et visite guidée
node scripts/screenshots-angular.mjs finance premier-acces
# 2. Repartir d'une base neuve (le compte créé ne peut pas être supprimé), donner un pseudo par
#    PATCH /api/v1/settings {"displayName": "Akram"}, puis remplir les données
$env:E2E_ANGULAR_URL='http://127.0.0.1:4300'
npm --prefix frontend-react exec -- playwright test e2e/finance.spec.ts --project angular
# 3. Pages remplies
node scripts/screenshots-angular.mjs finance
# Visite guidée seule, sur une base avec compte (après un changement de ses étapes)
node scripts/screenshots-angular.mjs finance visite
```

Le script n'agit que sur `127.0.0.1:18080` et `127.0.0.1:4300` (jamais sur l'application personnelle) et remet le
thème clair à la fin.
