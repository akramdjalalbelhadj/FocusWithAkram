# Refonte v2 et module « Mes achats » — suivi

Document vivant de la phase v2 (branche `refonte-v2`, démarrée le 1 novembre 2026). Périmètre : **backend et frontend Angular uniquement** ; le frontend React n'est pas modifié pendant cette phase, les adaptations à prévoir sont listées en fin de document.

## 1. Décisions validées

| Date | Décision | Conséquence |
| --- | --- | --- |
| 2026-11-01 | Retirer du suivi Git `backend/data/`, `logs/`, `.idea/` ; purge de l'historique à lancer par le propriétaire | Procédure : [exploitation § 13](../technique/exploitation.md) |
| 2026-11-01 | Backend : découpage par domaine conservé, couches **aplaties** dans chaque domaine (`dto/` seul sous-package) ; règles d'architecture via ArchUnit | Routes, JSON, tables et migrations inchangés |
| 2026-11-01 | Documentation réorganisée en `produit/`, `technique/`, `suivi/`, `historique/`, `maquettes/` ; lanceurs déplacés dans `scripts/` | Commandes de lancement : `.\scripts\start_angular.ps1` |
| 2026-11-01 | Règles financières D3 à D6 : épargne mobilisable par objectif au-dessus d'un plancher ; achats d'objectifs hors plafond variable ; faisabilité sur salaires prévus, sans remboursements attendus ; une entrée « Mes achats » à onglets | [Spécification § 14](../produit/mes-achats/specification.md) |
| 2026-11-01 | Finances : **plusieurs comptes simples** (courant, épargne, espèces…) ; mettre de côté = virement vers un compte d'épargne ; réservations pour achats = affectations virtuelles | Modèle de données du lot 4 |

## 2. Lots

| Lot | Contenu | État |
| --- | --- | --- |
| 0 | Hygiène du dépôt, réorganisation `docs/` et racine | Livré |
| 1 | Backend : aplatissement des packages, ArchUnit, import robuste, sauvegarde v2 extensible (compatible v1) | Livré |
| 2 | Angular : corrections (archives, double toast, recherche, lint autonome, Docker), navigation à source unique | Livré (Docker non construit) |
| 3 | Spécification fonctionnelle et règles financières de « Mes achats » — validation par le propriétaire | Livré : [spécification validée](../produit/mes-achats/specification.md) |
| 4 | Socle finance : comptes, catégories, opérations, solde, corrections | Livré |
| 5 | Revenus prévus/reçus, budget mensuel, épargne, abonnements | À faire |
| 6 | Objectifs d'achat, matrice d'achats, moteur de prévision, faisabilité | À faire |
| 7 | Prêts et emprunts | À faire |
| 8 | Tableau de bord, statistiques, alertes, simulations | À faire |
| 9 | Documentation finale et dossier de migration React | À faire |

## 3. Constats de l'audit du 1 novembre 2026

Problèmes **observés** (et non préférences), à corriger dans les lots 1 et 2 :

| Zone | Constat | Lot |
| --- | --- | --- |
| Backend / import | Une exécution ou sous-tâche invalide fait échouer tout l'import (violation SQL hors du `try` de l'élément) au lieu d'un rapport partiel | 1 |
| Backend / sauvegarde | Réglages et Top 3 absents ; sessions d'une tâche ignorée comme doublon perdues | 1 |
| Backend / sauvegarde | Version vérifiée par égalité stricte : l'ajout d'un domaine rendrait les sauvegardes v1 illisibles | 1 |
| Backend / structure | 30 sous-packages à un seul fichier ; cycle `task` ↔ `pomodoro` ; `ProjectRepository` interroge `Task` | 1 |
| Backend / exploitation | PostgreSQL 14 embarqué contre 17 dans Docker ; PostgreSQL 14 atteint sa fin de support en novembre 2026 | Décision à prendre (migration des données réelles) |
| Angular / archives | « Charger plus » figé : `hasMore` est un `computed` sans signal | 2 |
| Angular / erreurs | Message d'erreur affiché deux fois (intercepteur + `TaskActions` / `PomodoroEngine`) | 2 |
| Angular / recherche | Une requête par frappe, sans délai ni annulation | 2 |
| Angular / outillage | Le lint dépend de `frontend-react/node_modules` | 2 |
| Angular / Docker | Build impossible : `shared/` hors du contexte, pas de `.dockerignore` | 2 |
| Angular / navigation | Une entrée de menu est déclarée à cinq endroits | 2 |

### Réalisé au lot 1

| Constat | Correction | Vérification |
| --- | --- | --- |
| Import interrompu par une donnée invalide | Validation de chaque élément avant écriture (fabriques d'entités et service) ; aperçu par annulation de transaction | Test de régression : échouait en 500 sur l'ancien code, passe désormais |
| Sauvegarde sans préférences ni Top 3 | Format v2 ; v1 toujours importable ; fichier plus récent refusé avec un message explicite | Aller-retour complet, aperçu sans écriture, préférences invalides non appliquées |
| Sessions perdues pour une tâche déjà présente | Rattachement si l'identifiant concorde ; jamais sur une simple ressemblance | Test dédié (une session rattachée, une ignorée) |
| 30 sous-packages à un fichier | Domaines à plat, `task.archive`, `common` simplifié | 88 tests backend sans échec, dont 5 règles ArchUnit (règle de cycle vérifiée par mutation) ; build Angular et typage React vérifiés |
| Requêtes N+1 à l'export ; requête en double dans les statistiques | Cycles chargés en une requête ; résultat réutilisé | Tests existants |
| Base vide créée silencieusement si le backend est lancé depuis un autre dossier | Chemin absolu de la base journalisé au démarrage, avertissement si elle est absente | Revue de code |

Correction de l'audit : la journalisation DEBUG du profil local ne concerne que le code applicatif, qui ne journalise aucune donnée ; ce n'est pas un risque de fuite.

### Réalisé au lot 2

| Constat | Correction | Vérification |
| --- | --- | --- |
| « Charger plus » des archives figé | Pagination en signaux ; réponses obsolètes ignorées ; minuteur nettoyé à la destruction | Build et lint |
| Erreur affichée deux fois | `AppError.notified` posé par l'intercepteur ; `ToastService.errorFrom` dans tous les appelants | 3 tests unitaires |
| Une requête par frappe | `debounced()` (250 ms) sur Tâches et Matrice ; `Loader` annule la requête précédente | 4 tests unitaires |
| Navigation déclarée à cinq endroits | `config/navigation.ts` unique ; shell, palette et raccourcis dérivés | 3 tests (routes, touches, barre mobile) |
| Lint dépendant de React | ESLint 10 et typescript-eslint 8 dans Angular, versions identiques à React | `npm run lint` : 0 erreur |
| Docker impossible à construire | Contexte racine, `.dockerignore` racine et backend (exclut la base personnelle) | **Non construit** : Docker absent du poste |

Vérifications : 22 tests Angular, lint et build de production sans erreur ni avertissement.

Recette navigateur (1 novembre 2026, backend et base **jetables** sur les ports 18090/54349, Angular sur 4300 ; la base personnelle n'est pas utilisée) :

- Archives : 45 tâches archivées ; « Charger la suite » ajoute les 5 dernières puis disparaît.
- Mes tâches : 7 frappes rapides dans la recherche donnent **une** requête (`q=Reviser`) et le bon filtrage.
- Focus : session interrompue côté serveur puis « Pause » dans l'interface → 409, **un seul** message, puis resynchronisation.
- Navigation : barre mobile (375 px) Accueil / Matrice / Tâches / Focus / Plus ; palette avec ses 9 destinations et raccourcis ; « G puis S » ouvre les statistiques.
- Le démarrage sur une base absente journalise l'avertissement prévu avec le chemin absolu.

### Réalisé au lot 4 — socle « Mes achats »

| Élément | Contenu | Vérification |
| --- | --- | --- |
| Schéma | `V2__finance_core.sql`, `V3__finance_default_categories.sql` (53 catégories du besoin), additives | Migrations appliquées sur base neuve ; arbre vérifié par test |
| Comptes | Courant, épargne, espèces ; solde initial daté (négatif possible) ; correction tracée ; archivage à solde nul ; suppression si aucune opération | Tests d'intégration |
| Opérations | Revenus (origine), dépenses (catégorie, indispensable, exceptionnelle), remboursements d'achats, virements ; prévue / réalisée / annulée ; montant prévu conservé | Tests d'intégration ; contraintes SQL |
| Bilan du mois | Revenus attendus/reçus, dépenses indispensables/variables/exceptionnelles, remboursements, épargne mise de côté, non dépensé, par catégorie | Scénario chiffré complet |
| Historique | Filtres période, type, statut, compte (virements reçus inclus), catégorie (sous-catégories incluses), nature, montant, texte ; pagination | Tests d'intégration ; recette navigateur |
| Doublons | Même compte, type et montant à trois jours près ; confirmation avant enregistrement | Test d'intégration ; recette navigateur |
| Sauvegarde | Format v3 ; import élément par élément ; réimport sans doublon ; v2 toujours importable | Aller-retour complet testé |
| Angular | Entrée « Mes achats » (G puis B), onglets Vue d'ensemble / Opérations / Réglages, saisie rapide (E, palette), dialogues, première utilisation | 25 tests unitaires, lint, build ; recette navigateur clair/sombre, 375 px |
| Architecture | `finance` indépendant des domaines de productivité ; aucun flottant pour l'argent (ArchUnit) | 7 règles ArchUnit |

Vérifications : 106 tests backend, 25 tests Angular, lint et build sans erreur. Recette navigateur sur base jetable : premier compte, saisie rapide, doublon signalé, salaire prévu en retard puis reçu avec écart, historique et vue d'ensemble cohérents, thème clair en 375 px sans défilement horizontal.

## 4. Adaptations React à prévoir (phase 2)

| Origine | Adaptation |
| --- | --- |
| Lot 0 | `frontend-react/README.md` pointe vers `docs/frontend-architecture.md` et `docs/how-to-run-frontends.md`, devenus `docs/technique/architecture-frontend.md` et `docs/technique/exploitation.md` |
| Lot 1 | `ImportReport` contient `settingsRestored`, `dailyGoalsCreated`, `dailyGoalsSkipped` (sauvegarde v2) : les afficher dans l'aperçu d'import React. Champs ajoutés, aucun champ retiré : React compile sans changement |
| Lot 4 | Implémenter le module « Mes achats » : contrats dans `shared/finance.ts`, API `/api/v1/finance` (voir l'architecture backend), entrée de navigation `/finance` (G puis B), raccourci E. `ImportReport.finance` (sauvegarde v3) à afficher dans l'aperçu d'import |
| Lot 0 | La suite E2E (`frontend-react/e2e`, `playwright.config.ts`) écrit dans `docs/test-results/` et `docs/screenshots/`, désormais ignorés par Git ; envisager de la déplacer hors du dossier React puisqu'elle teste aussi Angular |
