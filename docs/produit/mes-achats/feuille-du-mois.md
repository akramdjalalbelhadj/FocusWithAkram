# Mes achats — la feuille du mois (lot 13)

Décision du 5 novembre 2026. Ce document fixe le fonctionnement et le contrat d'API de la nouvelle organisation de « Mes achats ». Il complète la [spécification](specification.md), qui reste la référence pour les règles de calcul (budget, prévision, faisabilité).

## 1. Idée générale

Chaque mois est une **feuille** : un tableau qui montre, pour le mois choisi, ce qui était **prévu** et ce qui s'est **réellement** passé.

| Section | Contenu | Saisie |
| --- | --- | --- |
| **Revenus** | Salaire et autres revenus prévus | Saisis une fois pour un mois ou une période (ex. 2 290 € le 28 de chaque mois, de novembre 2026 à février 2027) ; le réel se saisit chaque mois (un salaire peut baisser après une absence). |
| **Dépenses fixes** | Loyer, téléphone, abonnement de transport… | Saisies une fois ; la feuille de chaque mois est **déjà remplie**. On confirme le paiement (montant réel). |
| **Dépenses variables** | Courses, restaurants… avec un **plafond** mensuel (ex. courses 300 €) | On saisit les dépenses au fil du mois, ou le total du mois. Au-delà du plafond, la feuille demande un **commentaire** qui explique le dépassement. |
| **Autres dépenses** | Tout le reste (imprévus, achats prévus réalisés) | Saisie libre (bouton Dépense, touche E). |

En bas de la feuille : **épargne prévue** (revenus prévus − dépenses prévues) et **épargne réelle** (revenus reçus − dépenses payées), comparées à l'objectif d'épargne du mois.

### Montants qui changent dans le temps

Un montant fixe (loyer, transport, plafond des courses) **change à partir d'un mois** : passer le loyer à 400 € à partir de janvier 2027 ne modifie pas novembre ni décembre 2026, qui restent à 350 €. On peut aussi changer **ce mois seulement** (une facture exceptionnellement plus élevée), sans toucher aux autres mois.

### Un seul compte

Tout l'argent (banque, épargne, espèces) est dans un compte unique. L'épargne n'est pas un compte : c'est ce qui reste du mois. Un prêt est une dépense de la catégorie « Prêts », son remboursement un revenu de cette catégorie.

## 2. Modèle de données

- **Revenu prévu** et **dépense fixe** : échéanciers mensuels (`fin_schedule`, fréquence `MONTHLY`). Un revenu pour un seul mois est un échéancier dont la première et la dernière échéance sont dans ce mois. Une dépense fixe est `essential = true`, avec une catégorie.
- **Montant à partir d'un mois** : `fin_schedule_amount (schedule_id, from_month, amount)`. Le montant d'une échéance est celui de la version la plus récente dont `from_month` ≤ mois de l'échéance ; sans version, le montant de l'échéancier. Les échéances déjà enregistrées (réalisées, sautées, ajustées) gardent leur montant.
- **Ce mois seulement** : ajustement d'une échéance (existant : `PUT /schedules/{id}/occurrences/{due}`).
- **Réel** : réalisation d'une échéance (montant, date, commentaire facultatif conservé dans la description de l'opération). Le montant prévu est conservé : l'écart est affiché.
- **Dépense variable plafonnée** (« enveloppe ») : `fin_envelope (id, category_id, label, position, start_month, end_month)`, plafonds datés `fin_envelope_amount (envelope_id, from_month, amount)`, suivi mensuel `fin_envelope_month (envelope_id, month, comment, total_operation_id)`.
  - Dépensé du mois = dépenses réalisées de la catégorie (et de ses sous-catégories pour une catégorie racine), nettes des remboursements d'achats, hors échéances d'échéancier et hors achats d'objectifs.
  - « Saisir le total du mois » crée ou met à jour **une** opération de total pour que le dépensé égale le montant saisi (les autres dépenses de la catégorie restent comptées).
  - Le plafond variable du mois (budget, prévision, alertes) est la **somme des plafonds des enveloppes** actives ce mois-là ; sans enveloppe, le plafond du mois ou par défaut s'applique comme avant.

## 3. Contrat d'API (préfixe `/api/v1/finance`)

Types TypeScript dans `shared/finance.ts` (`MonthSheet`, `SheetRow`, `EnvelopeRow`, `Envelope`, `EnvelopeBody`, `AmountChange`).

| Méthode | Chemin | Corps / réponse |
| --- | --- | --- |
| GET | `/months/{yyyy-MM}/sheet` | → `MonthSheet` |
| PUT | `/schedules/{id}/amount` | `AmountChange { fromMonth, amount }` → `Schedule` (crée ou remplace la version de ce mois) |
| DELETE | `/schedules/{id}/amount/{yyyy-MM}` | supprime une version (pas la première) → `Schedule` |
| POST | `/schedules/{id}/occurrences/{due}/complete` | `{ amount, date, comment? }` → `Operation` ; **accepte aussi une échéance déjà réalisée** (met à jour le réel, garde le prévu) |
| DELETE | `/schedules/{id}/occurrences/{due}` | annule l'enregistrement de l'échéance (elle redevient prévue) → 204 |
| GET | `/envelopes` | → `Envelope[]` |
| POST | `/envelopes` | `EnvelopeBody { categoryId, label?, amount, fromMonth }` → `Envelope` (201) |
| PUT | `/envelopes/{id}` | `{ label, position }` → `Envelope` |
| PUT | `/envelopes/{id}/amount` | `AmountChange` → `Envelope` |
| POST | `/envelopes/{id}/end` | `{ lastMonth }` → `Envelope` (plus de plafond après ce mois) |
| DELETE | `/envelopes/{id}` | 204 (les opérations restent) |
| PUT | `/envelopes/{id}/months/{yyyy-MM}/comment` | `{ comment }` (vide : supprimé) → `EnvelopeRow` |
| PUT | `/envelopes/{id}/months/{yyyy-MM}/actual` | `{ amount, comment? }` → `EnvelopeRow` ; refusé pour un mois futur (`FUTURE_COMPLETED_OPERATION`) ou si les autres dépenses dépassent déjà le montant (`ENVELOPE_TOTAL_TOO_LOW`) |

Erreurs au format ProblemDetail avec `code` stable : `INVALID_ENVELOPE`, `ENVELOPE_CATEGORY_TAKEN`, `INVALID_AMOUNT_CHANGE`, `FUTURE_COMPLETED_OPERATION`, `ENVELOPE_TOTAL_TOO_LOW`.

### Calcul des totaux de la feuille

- `incomePlanned` / `incomeActual` : somme des prévus / réels des lignes de revenus (lignes sautées exclues).
- `fixedPlanned` / `fixedActual` : idem pour les dépenses fixes.
- `variablePlanned` = somme des plafonds ; `variableActual` = somme des dépensés.
- `expensesActual` = dépenses payées du mois (nettes des remboursements), comme le bilan du mois ; `othersActual` = `expensesActual − fixedActual − variableActual`.
- `expensesPlanned` = `fixedPlanned + variablePlanned`.
- `savingsPlanned` = `incomePlanned − expensesPlanned` ; `savingsActual` = `incomeActual − expensesActual`.

Une opération ponctuelle (non liée à un échéancier) de revenu apparaît dans les revenus : prévue → `planned` = montant ; réalisée → `actual` = montant, `planned` = montant prévu conservé s'il existe.

## 4. Interface

- Onglets : **Mon mois** (la feuille, par défaut) · **Opérations** (historique ; vue « Revenus et charges récurrents ») · **Projets d'achat** · **Analyses** (statistiques, calendrier) · icône ⚙ **Réglages** · bouton **?** (visite guidée).
- Anciennes adresses redirigées : `overview`, `budget`, `loans` → `month` ; `schedules` → `operations?vue=recurrents` ; `statistics` → `analyses` ; `calendar` → `analyses?vue=calendrier`.
- **Visite guidée** au premier passage (enregistrée dans les préférences, `tutorialDone`), relançable par **?** ; chaque étape a **Suivant**, **Précédent**, **Passer**.
- **Bulles d'aide** (icône ?) à côté de chaque section et des notions (prévu, réel, plafond, épargne, « à partir de », « ce mois seulement »), accessibles au clavier et au lecteur d'écran.
- Repères pour la visite : attributs `data-tour` = `finance-tabs`, `quick-expense`, `tour-button` (en-tête), `month-nav`, `month-summary`, `month-income`, `month-fixed`, `month-variable`, `month-others` (feuille).
