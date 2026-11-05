# Refonte v2 et module « Mes achats » — suivi

Document vivant de la phase v2 (branche `refonte-v2`, démarrée le 1 novembre 2026). Périmètre : **backend et frontend Angular uniquement**.

> **Priorité (décision du 5 novembre 2026)** : on reste sur **FocusWithAkram web avec Angular** jusqu'à une **version stable** du produit. Le frontend React et l'application mobile (Krimou) sont **déprioritisés** : ils ne reprennent qu'après cette version stable, à partir de la liste d'adaptations en fin de document. D'ici là, React n'est pas modifié (il doit seulement continuer à compiler) et aucune nouvelle règle n'est portée dans Krimou.

## 1. Décisions validées

| Date | Décision | Conséquence |
| --- | --- | --- |
| 2026-11-01 | Retirer du suivi Git `backend/data/`, `logs/`, `.idea/` ; purge de l'historique à lancer par le propriétaire | Procédure : [exploitation § 13](../technique/exploitation.md) |
| 2026-11-01 | Backend : découpage par domaine conservé, couches **aplaties** dans chaque domaine (`dto/` seul sous-package) ; règles d'architecture via ArchUnit | Routes, JSON, tables et migrations inchangés |
| 2026-11-01 | Documentation réorganisée en `produit/`, `technique/`, `suivi/`, `historique/`, `maquettes/` ; lanceurs déplacés dans `scripts/` | Commandes de lancement : `.\scripts\start_angular.ps1` |
| 2026-11-01 | Portage Kotlin : toute FocusWithAkram dans Krimou ; données hors ligne sur le téléphone (stockage local chiffré, import/export de la sauvegarde v3) ; réalisé après les lots 7 et 8 | Lot 10 ; moteurs de calcul dans `:engines` (Kotlin pur), testés avec les mêmes scénarios que le backend |
| 2026-11-01 | Règles financières D3 à D6 : épargne mobilisable par objectif au-dessus d'un plancher ; achats d'objectifs hors plafond variable ; faisabilité sur salaires prévus, sans remboursements attendus ; une entrée « Mes achats » à onglets | [Spécification § 14](../produit/mes-achats/specification.md) |
| 2026-11-01 | Finances : **plusieurs comptes simples** (courant, épargne, espèces…) ; mettre de côté = virement vers un compte d'épargne ; réservations pour achats = affectations virtuelles | Modèle de données du lot 4 |
| 2026-11-05 | **Angular d'abord** : seul FocusWithAkram web avec Angular évolue jusqu'à une version stable ; React et le mobile (Krimou) reprennent ensuite | Lot 9 recentré sur Angular ; dossier de migration React et portage Krimou des lots 11 et suivants reportés après la version stable ; § 4 = backlog React |
| 2026-11-05 | Lanceurs : un lancement précédent de FocusWithAkram est arrêté ; **une autre application n'est jamais arrêtée**, le port libre suivant est pris (CORS adapté) ; PostgreSQL embarqué sur 15432, hors de la plage que Windows réserve | Lot 12 ; [exploitation § 3](../technique/exploitation.md) |
| 2026-11-05 | **PostgreSQL 18** partout (embarqué et Docker), en remplacement de 14 (fin de support en novembre 2026) et 17 ; base locale migrée par `scripts/migrate_postgres.ps1`, ancienne base conservée | Lot 12 ; [exploitation § 11.1](../technique/exploitation.md) |
| 2026-11-03 | Notes & Brainstorming : une idée **n'a pas de statut** (seules ses tâches en ont) ; catégories gérées dans un écran dédié ; deux modes d'éditeur (Markdown avec aperçu, visuel) sur un contenu Markdown unique, mode par défaut dans les Paramètres ; suppression d'une idée refusée tant que des tâches en sont issues, avec suppression forcée qui conserve les tâches | Lot 11 ; [cahier des charges § 4.5](../produit/cahier-des-charges.md) |

## 2. Lots

| Lot | Contenu | État |
| --- | --- | --- |
| 0 | Hygiène du dépôt, réorganisation `docs/` et racine | Livré |
| 1 | Backend : aplatissement des packages, ArchUnit, import robuste, sauvegarde v2 extensible (compatible v1) | Livré |
| 2 | Angular : corrections (archives, double toast, recherche, lint autonome, Docker), navigation à source unique | Livré (Docker non construit) |
| 3 | Spécification fonctionnelle et règles financières de « Mes achats » — validation par le propriétaire | Livré : [spécification validée](../produit/mes-achats/specification.md) |
| 4 | Socle finance : comptes, catégories, opérations, solde, corrections | Livré |
| 5 | Revenus prévus/reçus, budget mensuel, épargne, abonnements | Livré |
| 6 | Objectifs d'achat, matrice d'achats, moteur de prévision, faisabilité | Livré |
| 7 | Prêts et emprunts | Livré |
| 8 | Tableau de bord, statistiques, alertes, simulations, calendrier financier | Livré |
| 9 | Stabilisation et documentation finale de la version web Angular ; le dossier de migration React est reporté après la version stable | À faire |
| 10 | Portage de toute FocusWithAkram (productivité et Mes achats) dans l'application Android Krimou (`D:\Projet\agent-android`, Kotlin, Jetpack Compose) | Livré dans Krimou le 1 novembre 2026, non essayé sur téléphone ; suite reportée après la version stable |
| 11 | Notes & Brainstorming : idées, catégories, éditeur à deux modes, transformation en tâches de la matrice (API et Angular) | Livré le 3 novembre 2026 |
| 12 | Exploitation : lanceurs sans conflit de ports, PostgreSQL 18 (embarqué, tests, Docker) et migration de la base locale | Livré le 5 novembre 2026 ; migration de la base personnelle à lancer |

## 3. Constats de l'audit du 1 novembre 2026

Problèmes **observés** (et non préférences), à corriger dans les lots 1 et 2 :

| Zone | Constat | Lot |
| --- | --- | --- |
| Backend / import | Une exécution ou sous-tâche invalide fait échouer tout l'import (violation SQL hors du `try` de l'élément) au lieu d'un rapport partiel | 1 |
| Backend / sauvegarde | Réglages et Top 3 absents ; sessions d'une tâche ignorée comme doublon perdues | 1 |
| Backend / sauvegarde | Version vérifiée par égalité stricte : l'ajout d'un domaine rendrait les sauvegardes v1 illisibles | 1 |
| Backend / structure | 30 sous-packages à un seul fichier ; cycle `task` ↔ `pomodoro` ; `ProjectRepository` interroge `Task` | 1 |
| Backend / exploitation | PostgreSQL 14 embarqué contre 17 dans Docker ; PostgreSQL 14 atteint sa fin de support en novembre 2026 | Décidé le 5 novembre 2026 : PostgreSQL 18 partout (lot 12) |
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

### Réalisé au lot 5 — budget et échéancier

| Élément | Contenu | Vérification |
| --- | --- | --- |
| Schéma | `V4__finance_budget_schedules.sql` : préférences (singleton), budgets mensuels, échéanciers, lien opération-échéance unique | Tests d'intégration sur base neuve |
| Échéancier | Salaire, abonnements, charges, paiements en plusieurs fois (nombre d'échéances) ; périodicité hebdomadaire, mensuelle, annuelle avec intervalle ; suspendre, reprendre, résilier | 6 tests unitaires (dates sans dérive, fin, pause, équivalents) |
| Échéances | Calculées, jamais payées d'office ; réaliser (montant réel, prévu conservé), sauter, ajuster ; une échéance ne se paie pas deux fois | Tests d'intégration ; recette navigateur |
| Budget | Plafond variable et objectif d'épargne du mois ou par défaut ; jauge OK / alerte / dépassement (jamais bloquant) ; indispensables attendues ; épargne théorique | Test de seuils exacts ; scénario chiffré |
| Vue d'ensemble | Échéances à venir et en retard (92 jours), jauge du budget, réserve de sécurité | Tests d'intégration ; recette navigateur |
| Sauvegarde | Échéanciers, budgets, préférences, lien des échéances ; réimport sans doublon | Aller-retour testé |
| Angular | Onglets Budget et Échéancier, dialogues d'échéancier et de budget, préférences financières, actions sur échéances virtuelles | 28 tests unitaires, lint, build ; recette navigateur |

Vérifications : 122 tests backend, 28 tests Angular, lint et build. Recette sur base jetable : salaire déclaré par le dialogue (valeurs par défaut correctes), abonnements indispensable et variable, plafond 50 € → jauge orange à 90 %, épargne théorique 2 063,60 € (2 200 − 86,40 − 50) exacte, échéance Navigo réalisée depuis le budget, salaire d'octobre signalé en retard.

Écart assumé avec la spécification : l'onglet s'appelle « Échéancier » (il regroupe salaire, abonnements, charges et paiements en plusieurs fois) plutôt que « Abonnements ».

### Réalisé au lot 6 — achats prévus et faisabilité

| Élément | Contenu | Vérification |
| --- | --- | --- |
| Schéma | `V5__finance_goals.sql` : objectifs (statut, réservation, financement par l'épargne, position), lien dépense-objectif | Tests d'intégration |
| Moteur | `ForecastEngine`, calcul pur jour par jour ; contrôle sur 92 jours après l'achat ; priorité Q1→Q4 puis date ; pas de double comptage ; réservations propres à leur objectif ; épargne au-dessus du plancher (D3) ; salaire en retard → « risqué » (D5) ; dépenses variables réparties au centime ; épargne du mois retirée au salaire | 12 scénarios calculés à la main ; règle de fenêtre vérifiée par mutation (2 tests échouent si elle est retirée) |
| Objectifs | Création, aperçu sans enregistrement, réservation limitée au disponible libre, achat réel hors plafond variable (D4), report, abandon, réouverture, matrice | 6 tests d'intégration |
| Angular | Onglet Achats prévus : prévision en courbe, liste par priorité, matrice (glisser-déposer et menu clavier), dialogue avec verdict en direct et alternatives, achat réel, historique avec écart prix réel / estimé | 31 tests unitaires, lint, build ; recette navigateur |

Vérifications : 140 tests backend, 31 tests Angular, lint et build. Recette sur base jetable : montre de 400 € au 15/11 avec 100 € disponibles → « non réalisable, date réaliste le 28 novembre » (le jour du salaire), alternatives proposées ; report appliqué → « réalisable, 1 900 € restants » ; déplacement Q4 → Q2 par le menu ; achat réel à 380 € enregistré avec un écart de −20 €. Le glisser-déposer de la matrice n'a pas pu être vérifié par l'automatisation du navigateur (le déplacement lui-même est testé par l'API et par le menu).

Précision de règle : tous les objectifs ouverts (envisagés, planifiés, reportés) entrent dans la prévision par ordre de priorité, comme le prévoit la spécification validée ; un achat « envisagé » peu prioritaire (Q4) passe donc après les autres.

### Réalisé au lot 7 — prêts et emprunts

| Élément | Contenu | Vérification |
| --- | --- | --- |
| Schéma | `V6__finance_loans.sql` : table `fin_loan` (personne, sens, montant, dates, régularisation, annulation) ; quatre types d'opération de prêt (`LOAN_GIVEN`, `LOAN_COLLECTED`, `LOAN_TAKEN`, `LOAN_REPAID`) liés obligatoirement à un prêt (contrainte `ck_fin_operation_loan`) ; contraintes de type et de sens recréées | Tests d'intégration |
| Règles | Versement et remboursements modifient les soldes mais ne sont ni revenus ni dépenses ; reste dû, statut (en cours, remboursé, régularisé, annulé) et retard calculés ; remboursement limité au reste dû ; régularisation explicite sans mouvement d'argent ; annulation qui annule aussi les mouvements ; « prêt antérieur au suivi » sans mouvement ; mouvements de prêt non saisissables ni modifiables comme opérations ordinaires | 7 tests d'intégration |
| Prévision | Une dette est déduite à son échéance (à aujourd'hui si elle est dépassée) ; les remboursements attendus des prêts accordés sont signalés (`expectedRepayments`) mais jamais comptés comme disponibles (D5) | Test « emprunt de 500 € à rembourser le 20/11 : achat de 400 € au 05/11 non réalisable » |
| Vue d'ensemble, sauvegarde | Créances et dettes en cours (`receivables`, `debts`) ; section `loans` de la sauvegarde v3 et `loanId` sur les opérations, import idempotent (`loansCreated`, `loansSkipped`) | Aller-retour sauvegarde puis réimport sans doublon |
| Angular | Onglet **Prêts** (« On me doit » / « Je dois », reste dû, barre de progression, historique dépliable), dialogues de prêt et de remboursement, régularisation, annulation ; bandeau créances/dettes dans la vue d'ensemble ; libellés et icône des mouvements de prêt dans les opérations | 31 tests unitaires, lint, build ; recette navigateur |

Vérifications : 147 tests backend, 31 tests Angular, lint et build ; React compile toujours (types partagés étendus, aucun fichier React modifié). Recette sur base jetable : compte de 1 200 €, prêt de 300 € à Sami (en retard, échéance au 25/10) et emprunt antérieur de 400 € ; remboursement partiel de 120,50 € saisi au format français → reste dû 179,50 € ; régularisation du reste → créances à 0 € ; vue d'ensemble : disponible 1 020,50 €, « Vous devez 400,00 € », aucune dépense ni aucun revenu comptés.

### Réalisé au lot 8 — alertes, statistiques, simulations, calendrier

| Élément | Contenu | Vérification |
| --- | --- | --- |
| Alertes | `AlertService`, `GET /finance/alerts` : plafond variable au seuil ou dépassé, revenu attendu non reçu, dépenses prévues en retard, échéances des 7 jours, disponible prévu sous la réserve dans les 60 jours, objectif risqué ou non réalisable, prêt ou emprunt en retard. Calculées à la lecture, triées par gravité ; formulées par l'interface (`alert-text.ts`) | 2 tests d'intégration (7 alertes chiffrées ; aucune alerte sans cause) ; 4 tests unitaires de formulation |
| Statistiques | `FinanceStatisticsService`, `GET /finance/statistics?from=&to=` (1 à 24 mois complets) : série mensuelle, totaux et moyennes, taux d'épargne, catégories et sous-catégories nettes des remboursements, plus grosses dépenses, écart prix payé / estimé des achats prévus, créances abandonnées et dettes remises | Test d'intégration chiffré (périodes invalides refusées) |
| Simulations | `ForecastService.Scenario` et `POST /finance/simulation` : variation de chaque salaire prévu, réduction mensuelle des dépenses variables, report ou retrait d'objectifs, achat supplémentaire ; même moteur, rien n'est enregistré, résultat comparé à la prévision actuelle | Test d'intégration (baisse de salaire → non réalisable ; report → réalisable ; achat urgent prioritaire ; aucune écriture) |
| Calendrier | `GET /finance/calendar?month=` : opérations du mois, échéances calculées comprises, hors annulées | Test d'intégration |
| Angular | Alertes en tête de la vue d'ensemble (lien vers l'onglet où agir) ; onglets **Calendrier** (grille du mois, entrées et sorties par jour, détail du jour avec les actions) et **Statistiques** (période 3/6/12/24 mois, graphique mensuel, catégories dépliables, plus grosses dépenses, achats prévus réalisés) ; panneau **Et si… ?** dans Achats prévus | 35 tests unitaires, lint, build ; recette navigateur |

Vérifications : 152 tests backend, 35 tests Angular, lint et build ; React compile toujours. Recette sur base jetable : alertes « Ordinateur n'est plus réalisable… date réaliste le 28 novembre », « 90 % du plafond variable utilisé », « Forfait prévue le 5 novembre » ; statistiques sur 12 mois (330 € de dépenses, 27,50 € par mois) ; calendrier de novembre avec le salaire calculé du 28 ; simulation du report de l'ordinateur au 15 décembre : « Non réalisable → Réalisable », sans aucune écriture.

### Réalisé au lot 10 — portage dans Krimou

Module **FocusWithAkram** de l'application Android Krimou (dépôt `D:\Projet`, `agent-android/`), hors ligne :

| Élément | Contenu | Vérification |
| --- | --- | --- |
| Moteurs | `engine.focus` (tâches, projets, Top 3, archives, Pomodoro, statistiques) et `engine.focus.finance` (soldes, échéancier, bilans, budget, prévision, faisabilité, prêts, alertes, statistiques, simulations, toutes les modifications avec les codes d'erreur de l'API) ; argent en centimes | 64 tests de productivité ; `ForecastEngineTest` (12) et `FinanceScenariosTest` (15) reprennent les scénarios de `ForecastEngineTest`, `GoalIT`, `LoanIT`, `InsightIT`, `FinanceBudgetIT` ; catégories par défaut (3) |
| Données | Document au format de la sauvegarde v3, chiffré (AES-256-GCM, Android Keystore), exclu des sauvegardes Android ; export v3 et import v1 à v3 avec aperçu, doublons ignorés | 16 tests (aller-retour exact des montants, idempotence, données illisibles jamais écrasées) |
| Interface | Cinq onglets (Aujourd'hui, Tâches, Focus, Mes achats, Plus) ; toutes les sections de « Mes achats » | 10 tests Robolectric ; suite Krimou complète, lint sans erreur, APK de debug |

Différences connues : interface en français seulement ; pas de notification de fin de Pomodoro ; calendrier mensuel
seulement ; déplacements dans les matrices par menu (pas de glisser-déposer). Toute règle modifiée ici doit l'être aussi
dans `engine.focus` de Krimou, avec son scénario de test. Documentation : `D:\Projet\docs\modules\focuswithakram\`.

### Réalisé au lot 11 — Notes & Brainstorming

| Élément | Contenu | Vérification |
| --- | --- | --- |
| Schéma | `V7__notes.sql` : `note_category`, `note` (sans statut), `note_tag`, `task.source_note_id` (`ON DELETE SET NULL`), `user_settings.note_editor_mode` ; additive | Tests d'intégration sur base neuve |
| Règles | Idée sans statut, avancement calculé ; tâche créée par `TaskService` (mêmes règles que la matrice) ; doublon de titre confirmé (`allowDuplicate`) sous verrou de l'idée ; suppression bloquée (`NOTE_HAS_TASKS`) ou forcée qui détache les tâches ; catégories uniques sans casse | `NoteIT` (10 scénarios), `NoteMapperTest` ; règle ArchUnit `task` ↛ `note` |
| Sauvegarde | Format v4 : section `notes`, `tasks[].sourceNoteId`, `settings.noteEditorMode` ; idées importées avant les tâches ; réimport sans doublon ; v3 importable | Aller-retour testé |
| Angular | Page Notes & idées (saisie rapide, filtres, vues, cartes), écran Catégories, éditeur avec enregistrement automatique et panneau des tâches issues, éditeur Markdown/visuel (Tiptap), formulaire de tâche réutilisé (`fromNote`), lien dans le détail de tâche, repère « Idée » dans Mes tâches, touche I, palette, préférence dans Paramètres | 43 tests unitaires, lint, build ; recette navigateur |

Vérifications : 166 tests backend, 43 tests Angular, lint et build sans erreur ; React compile et se construit sans modification (types partagés étendus en champs facultatifs). Recette du 3 novembre 2026 sur backend et base **jetables** (18080/54339), Angular sur 4300, Chrome piloté par Playwright : 22 contrôles réussis — saisie rapide, catégorie en double refusée, enregistrement automatique, gras puis Ctrl+Z, case cochée depuis l'aperçu sans réécrire le texte, bascule visuelle enregistrée, saisie visuelle sauvegardée en Markdown, formulaire prérempli, tâches en Q1 et Q2 de la matrice, doublon signalé, retour à l'idée depuis le détail de tâche, catégorie affichée à l'ouverture directe, suppression bloquée, touche I, suppression simple, 390 px sans défilement horizontal ; thème sombre vérifié sur captures. Défauts trouvés et corrigés pendant la recette : cases à cocher mal alignées (sélecteur Tiptap), Ctrl+Z inopérant après la barre d'outils, catégorie non affichée quand les options arrivent après la note, titres longs tronqués, avertissement de doublon hors champ.

Hors périmètre de ce lot : interface React, import du format v4 dans Krimou, recherche des idées dans la palette globale.

### Réalisé au lot 12 — lanceurs et PostgreSQL 18

Constat du 5 novembre 2026 : un lancement échouait après le précédent. Windows réservait les ports 54327-54626 (Hyper-V, WSL) : le PostgreSQL embarqué basculait sur un port aléatoire, que les lanceurs, ne libérant que 54329, ne voyaient pas ; resté actif, il gardait le verrou de `backend/data/postgres` (`postmaster.pid existe déjà`). Les lanceurs arrêtaient aussi toute application qui occupait 8080 ou 4200 (ici le relais réseau de WSL).

| Élément | Contenu | Vérification |
| --- | --- | --- |
| Lanceurs | `scripts/lib/launch.ps1` et `launch.sh` remplacent `free-port.*` : lancement précédent reconnu à sa ligne de commande et arrêté (backend, frontend, PostgreSQL de la base par `postmaster.pid`) ; port d'une autre application ou réservé : port libre suivant, à défaut attribué par le système ; CORS adapté au port du frontend ; en fin de lancement, seul le PostgreSQL de ce lancement est arrêté ; `-NoBrowser` / `NO_BROWSER=1` | Recette Windows (PowerShell et Git Bash) : relance sur une instance active ; ports 18080 et 14200 tenus par un autre processus → 18081 et 14201, processus étranger intact ; POST via le proxy accepté depuis 14201 (400 de validation), refusé depuis une origine inconnue (403) ; l'ancien lanceur, en s'arrêtant, n'a pas touché le PostgreSQL du nouveau ; nettoyage Bash : backend, frontend et PostgreSQL arrêtés en 8 s |
| Backend | PostgreSQL embarqué sur 15432 (hors plage dynamique de Windows), repli sur les 100 ports suivants puis sur un port du système ; refus explicite d'un dossier tenu par un PostgreSQL vivant ou créé par une autre version majeure (commande de migration indiquée) | 3 tests unitaires (`EmbeddedPostgresConfigTest`) |
| PostgreSQL 18 | Binaires 18.6.0 (BOM zonky, propriété `embedded-postgres-binaries.version` du `pom.xml`, filtrée dans `application-local.yml`) ; Docker `postgres:18-alpine`, volume sur `/var/lib/postgresql` | **170 tests backend sans échec sur PostgreSQL 18.6**, dont `EmbeddedPostgresVersionIT` ; Docker non construit |
| Migration | `scripts/migrate_postgres.ps1` + `scripts/lib/PgCopy.java` : schéma par les migrations Flyway, copie par `COPY`, comparaison lignes + empreintes + séquences, ancienne base conservée ; lanceurs et backend refusent une base 14 avec la commande à lancer | Copie de la base personnelle : 21 tables, 65 lignes identiques ; backend démarré sur la base migrée (Flyway : 7 migrations validées), données lues par l'API ; lanceur refusant la base 14 |

Reste : lancer la migration sur la base personnelle ; procédure hors Windows ; construction Docker.

## 4. Adaptations React à prévoir (après la version stable Angular)

Backlog **gelé** jusqu'à la version stable d'Angular (décision du 5 novembre 2026). Toute évolution des contrats `shared/` doit rester compatible : React doit continuer à compiler sans modification.

| Origine | Adaptation |
| --- | --- |
| Lot 0 | `frontend-react/README.md` pointe vers `docs/frontend-architecture.md` et `docs/how-to-run-frontends.md`, devenus `docs/technique/architecture-frontend.md` et `docs/technique/exploitation.md` |
| Lot 1 | `ImportReport` contient `settingsRestored`, `dailyGoalsCreated`, `dailyGoalsSkipped` (sauvegarde v2) : les afficher dans l'aperçu d'import React. Champs ajoutés, aucun champ retiré : React compile sans changement |
| Lot 4 | Implémenter le module « Mes achats » : contrats dans `shared/finance.ts`, API `/api/v1/finance` (voir l'architecture backend), entrée de navigation `/finance` (G puis B), raccourci E. `ImportReport.finance` (sauvegarde v3) à afficher dans l'aperçu d'import |
| Lot 7 | `OperationType` compte quatre types de mouvements de prêt (`LOAN_*`) à libeller ; `FinanceOverview.receivables` / `debts`, `ForecastResponse.expectedRepayments`, type `Loan` et API `/api/v1/finance/loans` ; `ImportReport.finance.loansCreated` / `loansSkipped` |
| Lot 8 | API `/finance/alerts`, `/finance/statistics`, `/finance/simulation`, `/finance/calendar` et types `FinanceAlert`, `FinanceStatistics`, `SimulationBody` / `SimulationResult` dans `shared/finance.ts` ; formulation des alertes à reprendre de `alert-text.ts` |
| Lot 11 | Module Notes & idées : contrats `shared/notes.ts`, API `/api/v1/notes` et `/api/v1/note-categories`, entrée `/notes` (G puis N), touche I ; éditeur à deux modes sur un contenu Markdown (préférence `Settings.noteEditorMode`) ; création de tâche depuis une idée via `POST /notes/{id}/tasks` avec gestion de `NOTE_TASK_DUPLICATE` ; suppression avec `NOTE_HAS_TASKS` / `force` ; `Task.sourceNoteId` (lien et repère) ; `ImportReport.notes`. Champs ajoutés en facultatifs : React compile sans changement |
| Lot 11 (Krimou) | Importer et exporter le format v4 (section `notes`, `sourceNoteId`, `noteEditorMode`) dans `engine.focus` ; jusque-là, une sauvegarde v4 est refusée par Krimou |
| Lot 0 | La suite E2E (`frontend-react/e2e`, `playwright.config.ts`) écrit dans `docs/test-results/` et `docs/screenshots/`, désormais ignorés par Git ; envisager de la déplacer hors du dossier React puisqu'elle teste aussi Angular |
