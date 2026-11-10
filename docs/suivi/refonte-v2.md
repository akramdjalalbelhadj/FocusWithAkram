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
| 2026-11-01 | Règles financières D3 à D6 : épargne mobilisable par objectif au-dessus d'un plancher ; achats d'objectifs hors plafond variable ; faisabilité sur salaires prévus, sans remboursements attendus ; une entrée « Mes achats » à onglets | [Spécification § 14](../produit/mes-achats/specification.md) ; D3 retirée et onglets réorganisés le 5 novembre 2026 (lot 13) |
| 2026-11-01 | Finances : **plusieurs comptes simples** (courant, épargne, espèces…) ; mettre de côté = virement vers un compte d'épargne ; réservations pour achats = affectations virtuelles | Modèle de données du lot 4 ; comptes multiples et virements remplacés par le compte unique le 5 novembre 2026 (lot 13) |
| 2026-11-05 | **Angular d'abord** : seul FocusWithAkram web avec Angular évolue jusqu'à une version stable ; React et le mobile (Krimou) reprennent ensuite | Lot 9 recentré sur Angular ; dossier de migration React et portage Krimou des lots 11 et suivants reportés après la version stable ; § 4 = backlog React |
| 2026-11-05 | Lanceurs : un lancement précédent de FocusWithAkram est arrêté ; **une autre application n'est jamais arrêtée**, le port libre suivant est pris (CORS adapté) ; PostgreSQL embarqué sur 15432, hors de la plage que Windows réserve | Lot 12 ; [exploitation § 3](../technique/exploitation.md) |
| 2026-11-05 | **PostgreSQL 18** partout (embarqué et Docker), en remplacement de 14 (fin de support en novembre 2026) et 17 ; base locale migrée par `scripts/migrate_postgres.ps1`, ancienne base conservée | Lot 12 ; [exploitation § 11.1](../technique/exploitation.md) |
| 2026-11-05 | Migration PostgreSQL hors Windows (Linux, macOS) : **hors périmètre**, l'application n'est utilisée que sous Windows | `scripts/migrate_postgres.ps1` seul ; plus de case ouverte |
| 2026-11-05 | Docker : validé dans **WSL** (Ubuntu, Docker 29), seul environnement Docker du poste | [exploitation § 8](../technique/exploitation.md) |
| 2026-11-05 | « Mes achats » : **un seul compte** représente tout l'argent (banque, épargne, espèces) ; plus d'ajout de compte ; comptes existants fusionnés (soldes de départ des autres comptes → corrections « Solde de départ — <nom> », virements internes supprimés), sauvegardes anciennes fusionnées de même à l'import | Lot 13 ; migration V8 ; [spécification D7](../produit/mes-achats/specification.md) |
| 2026-11-05 | « Mes achats » : **plus de suivi des prêts** ; prêt accordé ou remboursement versé = dépense « Prêts », emprunt ou remboursement reçu = revenu « Prêts » (catégorie facultative pour un revenu) ; onglet Prêts, régularisation et alertes de prêt supprimés | Lot 13 ; migration V8 ; spécification D8 |
| 2026-11-05 | « Mes achats » : **l'épargne n'est pas un compte**, c'est ce qui reste du mois (revenus reçus − dépenses payées), suivi face à un objectif ; statistiques mois par mois (épargne, objectif atteint ou manqué, plafond tenu ou dépassé) ; plus de financement par l'épargne ni de plancher | Lot 13 ; spécification D9 |
| 2026-11-05 | « Mes achats » : **feuille du mois** (revenus pour un mois ou une période avec réel à confirmer, dépenses fixes pré-remplies, montants « à partir d'un mois » ou « ce mois seulement », dépenses variables plafonnées avec commentaire de dépassement, autres dépenses, épargne prévue / réelle) ; quatre onglets (Mon mois, Opérations, Projets d'achat, Analyses), ⚙ Réglages, visite guidée et bulles d'aide, anciennes adresses redirigées ; sauvegarde v5 | Lot 13 ; [feuille du mois](../produit/mes-achats/feuille-du-mois.md) ; spécification D10 à D12 |
| 2026-11-03 | Notes & Brainstorming : une idée **n'a pas de statut** (seules ses tâches en ont) ; catégories gérées dans un écran dédié ; deux modes d'éditeur (Markdown avec aperçu, visuel) sur un contenu Markdown unique, mode par défaut dans les Paramètres ; suppression d'une idée refusée tant que des tâches en sont issues, avec suppression forcée qui conserve les tâches | Lot 11 ; [cahier des charges § 4.5](../produit/cahier-des-charges.md) |
| 2026-11-06 | Notes & idées : un **tutoriel** explique le but du module par un schéma simple et coloré en trois étapes (**Nouvelle idée** → **Brainstorming** → **Transformation en tâches**) ; ouvert à la première visite de la liste, non réaffiché une fois terminé ou passé (`notesTutorialDone`, côté serveur, hors sauvegarde), relançable par « Comment ça marche ? » ; la visite guidée de Mes achats devient un composant partagé | Lot 14 ; migration V10 ; [cahier des charges FWA-F030 et § 4.5](../produit/cahier-des-charges.md) |
| 2026-11-06 | Matrice d'Eisenhower : même type de **tutoriel**, dont le schéma est la matrice elle-même (grille 2 × 2 aux couleurs des quadrants, axes Urgent / Pas urgent et Important / Pas important) et qui insiste sur Q2 « Planifier » ; état `matrixTutorialDone` indépendant de celui des notes, côté serveur, hors sauvegarde ; relançable par « Comment ça marche ? » | Lot 15 ; migration V11 ; [cahier des charges FWA-F031 et § 4.1](../produit/cahier-des-charges.md) |
| 2026-11-10 | Notes & idées : **onglets** des idées ouvertes ; ouvrir une idée lui donne un onglet, revenir à la liste le garde, seule une fermeture explicite (ou la suppression de l'idée) le retire ; fermer l'idée affichée ouvre sa voisine ; état d'interface propre au navigateur (`localStorage`), hors serveur et hors sauvegarde | Lot 17 ; [cahier des charges FWA-F032 et § 4.5](../produit/cahier-des-charges.md) |
| 2026-11-10 | Notes & idées : **barre d'outils collée** en haut de l'écran pendant la saisie d'un long texte ; **surlignage** en quatre couleurs (jaune `==texte==`, rouge, bleu ciel, violet `<mark data-color>`), une seule couleur par passage | Lot 18 ; [cahier des charges FWA-F026 et § 4.5](../produit/cahier-des-charges.md) |
| 2026-11-10 | Notes & idées : **export en PDF** à côté du Markdown, derrière un seul bouton « Exporter » ; PDF produit dans le navigateur (pdfmake), sans serveur | Lot 19 ; [cahier des charges FWA-F033 et § 4.5](../produit/cahier-des-charges.md) |

## 2. Lots

| Lot | Contenu | État |
| --- | --- | --- |
| 0 | Hygiène du dépôt, réorganisation `docs/` et racine | Livré |
| 1 | Backend : aplatissement des packages, ArchUnit, import robuste, sauvegarde v2 extensible (compatible v1) | Livré |
| 2 | Angular : corrections (archives, double toast, recherche, lint autonome, Docker), navigation à source unique | Livré (Docker construit et validé au lot 9) |
| 3 | Spécification fonctionnelle et règles financières de « Mes achats » — validation par le propriétaire | Livré : [spécification validée](../produit/mes-achats/specification.md) |
| 4 | Socle finance : comptes, catégories, opérations, solde, corrections | Livré |
| 5 | Revenus prévus/reçus, budget mensuel, épargne, abonnements | Livré |
| 6 | Objectifs d'achat, matrice d'achats, moteur de prévision, faisabilité | Livré |
| 7 | Prêts et emprunts | Livré ; retiré au lot 13 (les prêts deviennent une catégorie) |
| 8 | Tableau de bord, statistiques, alertes, simulations, calendrier financier | Livré |
| 9 | Stabilisation et documentation finale de la version web Angular ; le dossier de migration React est reporté après la version stable | Livré le 5 novembre 2026 |
| 10 | Portage de toute FocusWithAkram (productivité et Mes achats) dans l'application Android Krimou (`D:\Projet\agent-android`, Kotlin, Jetpack Compose) | Livré dans Krimou le 1 novembre 2026, non essayé sur téléphone ; suite reportée après la version stable |
| 11 | Notes & Brainstorming : idées, catégories, éditeur à deux modes, transformation en tâches de la matrice (API et Angular) | Livré le 3 novembre 2026 |
| 12 | Exploitation : lanceurs sans conflit de ports, PostgreSQL 18 (embarqué, tests, Docker) et migration de la base locale | Livré le 5 novembre 2026 ; base personnelle migrée le même jour |
| 13 | « Mes achats » simplifié : compte unique, prêts en catégorie, épargne du mois, feuille du mois, montants datés, dépenses variables plafonnées, navigation en quatre onglets, visite guidée et bulles d'aide, sauvegarde v5 (API et Angular) | Validé le 6 novembre 2026 (branche `lot-13-mes-achats-simplifie`) |
| 14 | Tutoriel de Notes & idées « de l'idée à l'action » (schéma coloré en trois étapes), composant de visite guidée partagé `ff-tour` repris par Mes achats (API et Angular) | Validé le 6 novembre 2026 (branche `lot-14-15-tutoriels`, fusionnée dans `main`) |
| 15 | Tutoriel de la matrice d'Eisenhower (grille 2 × 2 colorée, secret de la case « Planifier »), disposition `matrix` du schéma et moteur commun `PageTourEngine` (API et Angular) | Validé le 6 novembre 2026 (branche `lot-14-15-tutoriels`, fusionnée dans `main`) |
| 17 | Onglets des idées ouvertes dans Notes & idées (Angular seulement, sans changement d'API) | Livré le 10 novembre 2026, à valider par le propriétaire |
| 18 | Éditeur des idées : barre d'outils collée et surlignage en quatre couleurs (Angular ; extrait des cartes côté serveur) | Livré le 10 novembre 2026, à valider par le propriétaire |
| 19 | Export d'une idée en PDF ; un seul bouton « Exporter » (Markdown ou PDF) (Angular seulement) | Livré le 10 novembre 2026, à valider par le propriétaire |

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
| PostgreSQL 18 | Binaires 18.6.0 (BOM zonky, propriété `embedded-postgres-binaries.version` du `pom.xml`, filtrée dans `application-local.yml`) ; Docker `postgres:18-alpine`, volume sur `/var/lib/postgresql` | **170 tests backend sans échec sur PostgreSQL 18.6**, dont `EmbeddedPostgresVersionIT` ; Docker validé au lot 9 |
| Migration | `scripts/migrate_postgres.ps1` + `scripts/lib/PgCopy.java` : schéma par les migrations Flyway, copie par `COPY`, comparaison lignes + empreintes + séquences, ancienne base conservée ; lanceurs et backend refusent une base 14 avec la commande à lancer | Copie de la base personnelle : 21 tables, 65 lignes identiques ; backend démarré sur la base migrée (Flyway : 7 migrations validées), données lues par l'API ; lanceur refusant la base 14 |

Suite : base personnelle migrée le 5 novembre 2026 (21 tables, 65 lignes identiques ; sauvegarde `backend/data/postgres-14-sauvegarde-20261105-192114`) ; Docker validé au lot 9 ; procédure hors Windows hors périmètre (décision du 5 novembre 2026).

### Réalisé au lot 9 — stabilisation de la version web Angular

Recette du 5 novembre 2026 sur backend et base **jetables** (18080, base sous `backend/target/`), Angular sur 4300 ; l'application personnelle (4200/8080) n'a pas été utilisée.

| Contrôle | Résultat |
| --- | --- |
| Qualité | Backend : 172 tests sans échec sur PostgreSQL 18.6 ; Angular : 47 tests unitaires, lint et build de production sans avertissement ; React compile toujours |
| E2E Angular | **10 scénarios sans échec** : les 8 existants (navigation et audits axe, tâches, matrice, Pomodoro, erreur réseau, calendrier, sous-tâches, projets) et deux nouveaux, `finance.spec.ts` et `notes.spec.ts` |
| Relevé des pages | 20 pages × 3 variantes (clair et sombre 1440 px, 390 px), base vide puis base de 4 010 tâches, 10 006 opérations et 1 000 idées : aucune erreur JavaScript, aucun appel d'API en échec, chaque page en 0,7 à 1,4 s |
| Parcours rares | Coupure réseau pendant un enregistrement (message, saisie conservée, nouvel essai) ; import volumineux ; onglet périmé (idée supprimée ailleurs) ; doublon d'opération ; suppression d'idée bloquée puis forcée |
| Docker (WSL) | Construction, trois services sains, PostgreSQL 18.6, API et frontend sur 8088, écritures depuis `localhost` et `127.0.0.1`, données conservées après `down`/`up` |

Défauts trouvés et corrigés :

| Défaut | Correction | Vérification |
| --- | --- | --- |
| Import volumineux quadratique : 7 500 éléments en 88 s (au-delà des 60 s du proxy nginx de Docker) ; une requête par élément synchronisait tout le contexte de persistance | `common/ExistingIds` : identifiants existants lus par lots de 1 000 avant la boucle (tâches, sessions, opérations, idées) | Même volume en 6 s à chaud ; 5 000 opérations en 1,4 s (5,6 s pour 2 000 avant) ; réimport sans doublon en 0,4 s ; `ExistingIdsTest`, tests d'import inchangés |
| Dialogues : un `dialog` sans nom (conteneur CDK, `aria-modal="false"`) contenant le dialogue nommé, pour les 21 dialogues | `provideAccessibleDialogs()` : `aria-modal` par défaut, nom, description et rôle (`alertdialog` des confirmations) du contenu reportés sur le conteneur | 4 tests unitaires ; E2E : un seul dialogue nommé par ouverture |
| Champ « Plafond des dépenses variables » annoncé « Aucun » : identifiant `bud-cap` en double (titre de la page Budget) | Titre renommé `bud-cap-title` | E2E : champ trouvé par son libellé ; aucun identifiant en double à l'ouverture de chaque dialogue |
| Débordement horizontal à 390 px de quatre onglets de « Mes achats » une fois des données présentes (cartes en grille élargies par leur contenu) | `.card { min-width: 0 }` | Relevé : 0 débordement ; contrôle à 390 px de tous les onglets dans `finance.spec.ts` |
| Docker : backend toujours « unhealthy » (`wget` absent de `eclipse-temurin:25-jre`) | Contrôle de santé par `/dev/tcp` de bash | Trois services « healthy » |
| Docker : POST refusés (403 CORS) depuis `http://127.0.0.1:8088` (nginx transmettait `Host` sans le port) | `proxy_set_header Host $http_host` ; origines `localhost` et `127.0.0.1` | 201 depuis les deux origines |
| Docker : en-têtes de sécurité jamais envoyés (un `add_header` de `location` annule ceux du serveur) | En-têtes répétés dans les blocs concernés | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` présents sur la page, les routes et les fichiers |
| Idée supprimée dans un autre onglet : « Non enregistré : Idee introuvable : <identifiant> » | Message explicite, texte conservé à l'écran | Relevé de l'onglet périmé |

Constats sans correction (comportements assumés ou hors lot) :

- **Modifications concurrentes** : les mises à jour n'envoient pas de version ; entre deux onglets, la dernière écriture l'emporte (`@Version` ne protège que les écritures simultanées). Un élément supprimé ailleurs donne une erreur 404 explicite.
- Pendant un dialogue modal, le reste de la page (notifications comprises) est masqué aux lecteurs d'écran : une erreur d'enregistrement s'affiche donc aussi dans le dialogue. Deux messages visibles, un seul annoncé.
- Les messages d'erreur du serveur sont écrits sans accents (convention ASCII des sources Java) et certains contiennent un identifiant technique : à reprendre côté serveur.
- Restent humains : lecteur d'écran réel, toucher sur téléphone, notifications et son avec onglet suspendu.

### Lot 13 — Mes achats simplifié

**Validé le 6 novembre 2026** (branche `lot-13-mes-achats-simplifie`, démarré le 5 novembre 2026, réalisé par quatre agents en parallèle : backend, page Mon mois, navigation et visite guidée, documentation). Décisions du propriétaire du 5 novembre 2026 : [spécification § 14](../produit/mes-achats/specification.md), D7 à D12. Organisation, modèle et contrat d'API : [feuille du mois](../produit/mes-achats/feuille-du-mois.md). Objectif : suivre son argent mois par mois sur une seule feuille, prévu face au réel, sans gérer de comptes, de virements ni de prêts.

| Élément | Contenu | Vérification |
| --- | --- | --- |
| Compte unique | Tout l'argent (banque, épargne, espèces) sur un compte ; premier accès par le total disponible ; second compte refusé (`SINGLE_ACCOUNT`) ; ⚙ Réglages : renommer, corriger le solde | `FinanceIT`, E2E |
| Prêts | Table `fin_loan`, types `LOAN_*`, API `/loans`, régularisation, alertes `LOAN_OVERDUE_*`, onglet Prêts supprimés ; un revenu peut porter une catégorie (facultative) | `FinanceIT`, `SingleAccountMigrationIT`, E2E |
| Épargne | Épargne du mois = revenus reçus − dépenses payées ; objectif atteint ou manqué et plafond variable tenu ou dépassé, mois par mois (`MonthStat.variableCap`, `savingsTarget`) ; taux d'épargne = épargne / revenus ; plus de financement par l'épargne ni de plancher | `InsightIT`, E2E |
| Feuille du mois | `GET /months/{AAAA-MM}/sheet` : revenus, dépenses fixes, dépenses variables plafonnées, autres dépenses, totaux prévus et réels, épargne prévue et réelle ; réel d'une échéance modifiable ou annulable | `MonthSheetIT`, E2E |
| Montants datés | `fin_schedule_amount` : montant « à partir d'un mois » (`PUT` et `DELETE /schedules/{id}/amount`) ; « ce mois seulement » = ajustement d'échéance existant | `MonthSheetIT`, E2E (loyer 350 € puis 400 € en janvier 2027) |
| Dépenses variables plafonnées | `fin_envelope`, `fin_envelope_amount`, `fin_envelope_month` ; API `/envelopes` ; total du mois, commentaire de dépassement ; plafond variable du mois = somme des plafonds (budget, prévision, alertes) ; alerte `ENVELOPE_OVER` | `EnvelopeIT`, E2E (courses 300 €, dépassement expliqué) |
| Navigation et aide | Onglets Mon mois, Opérations (vue « Revenus et charges récurrents »), Projets d'achat, Analyses (statistiques, calendrier) ; ⚙ Réglages ; anciennes adresses redirigées ; visite guidée (`tutorialDone`) et bulles d'aide `ff-help-tip` | Tests unitaires, E2E, audits axe |
| Sauvegarde | Format v5 : montants datés, dépenses variables plafonnées, commentaires et totaux du mois ; sans section des prêts. Import d'une sauvegarde v3 ou v4 : comptes fusionnés, virements ignorés, prêts convertis | `FinanceIT`, `ImportExportIT`, sauvegarde personnelle importée |

Migrations :

- `V8__finance_single_account.sql` **modifie les données existantes** : compte conservé = compte courant actif le plus ancien (sinon le premier) ; soldes initiaux des autres comptes convertis en corrections « Solde de départ — <nom> » (la plus ancienne devient le solde initial si le compte conservé n'en a pas) ; virements supprimés ; opérations et échéanciers rattachés au compte conservé, autres comptes supprimés ; mouvements de prêt convertis en dépenses (`LOAN_GIVEN`, `LOAN_REPAID`) ou revenus (`LOAN_COLLECTED`, `LOAN_TAKEN`) de la catégorie racine « Prêts » (réutilisée ou créée), puis colonne `loan_id` et table `fin_loan` supprimées ; marquage « financé par l'épargne » retiré des objectifs ; catégorie facultative pour un revenu (opérations et échéanciers) ; colonne `fin_preferences.tutorial_done`. Le solde total est inchangé. Test dédié : `SingleAccountMigrationIT` (réussi).
- `V9__finance_month_sheet.sql` (additive) : montants datés des échéanciers et dépenses variables plafonnées (`fin_schedule_amount`, `fin_envelope`, `fin_envelope_amount`, `fin_envelope_month`) ; catégorie racine « Prêts » créée si elle manque.

Avant de mettre à jour la base personnelle : sauvegarde JSON complète avec l'ancienne version, puis essai de la migration sur une copie ([exploitation § 11.2](../technique/exploitation.md)).

Vérifications (6 novembre 2026) : 181 tests backend, 104 tests Angular, lint et build Angular, build et lint React ; 10 scénarios E2E Angular dont `finance.spec.ts` réécrit (premier accès, visite guidée, salaire de novembre 2026 à février 2027, loyer 350 € puis 400 € en janvier 2027, réel plus bas commenté, courses plafonnées à 300 € dépassées et expliquées, prêt en catégorie « Prêts », coupure réseau, redirections, 390 px, axe). Base personnelle : un compte, aucun prêt, sauvegarde JSON prise ; elle a été importée dans une base jetable à la nouvelle version sans écart de solde. Correction trouvée à l'intégration : la « prochaine échéance » d'un échéancier ignorait une échéance déjà payée. Hors périmètre : React et Krimou (voir § 4).

### Lot 14 — Tutoriel de Notes & idées

**Validé le 6 novembre 2026.** Demande du propriétaire : expliquer le but du module « Notes & idées » par un schéma simple et coloré — **Nouvelle idée** (capturer une pensée spontanée) → **Brainstorming** (développer, enrichir et organiser l'idée) → **Transformation en tâches** (créer une ou plusieurs actions réalisables). Règles : [cahier des charges FWA-F030 et § 4.5](../produit/cahier-des-charges.md) ; usage : [guide § 12.1](../produit/guide-utilisation.md).

| Élément | Contenu | Vérification |
| --- | --- | --- |
| Composant partagé | La visite guidée de Mes achats devient `shared/ui/tour/` : `tour-model.ts` (étape `TourStep` à `target` et `diagram` facultatifs ; `TourDiagram { label, stages[{icon, title, text, tone: amber \| violet \| green \| blue}], focus? }` ; calculs de placement), `tour-engine.ts` (classe abstraite `TourEngine` : étapes, étape courante, suivant, précédent, passer, arrêter, `begin()` ; `markDone()` propre à chaque module), `tour.ts\|html\|css` (composant `ff-tour`, entrée `engine` : projecteur, bulle de dialogue, rendu du schéma). `FinanceTourService` étend `TourEngine` ; le shell de Mes achats affiche `<ff-tour [engine]="tour" />` (enveloppe `ff-finance-tour` supprimée) | `tour.spec.ts` ; comportement de Mes achats inchangé (`finance.spec.ts`) |
| Tutoriel | `NotesTourService` (`features/notes/components/notes-tour/`, étapes dans `notes-tour-steps.ts`) : 7 étapes — schéma ; saisie rapide (`notes-capture`) ; liste des idées ou état vide (`notes-list`) ; bouton Catégories (`notes-categories`) ; schéma avec l'étape 3 mise en avant ; vues À transformer, Avec tâches, Favorites (`notes-views`) ; bouton de relance (`notes-tour-button`). Une étape dont la cible est absente est sautée. Ouverture seule sur `/notes` tant que `notesTutorialDone` est faux ; Suivant, Précédent, Passer (Échap) ; terminer ou passer enregistre la préférence ; quitter la page interrompt sans enregistrer ; « Comment ça marche ? » relance (rouvre la liste si besoin) | `notes-tour.service.spec.ts`, E2E |
| Schéma | Liste ordonnée nommée « Le parcours d'une idée, en trois étapes », étape mise en avant en `aria-current="step"` (les autres en couleurs neutres) ; flèches dessinées en CSS, non lues ; tons ambre, violet, vert tirés des tokens (thèmes clair et sombre) ; de gauche à droite sur ordinateur, de haut en bas sur téléphone | E2E : trois étapes et leurs textes, trois couleurs différentes, axe à 1440 et 390 px |
| Préférence | `user_settings.notes_tutorial_done` ; `GET` / `PATCH /settings` exposent `notesTutorialDone` ; **hors sauvegarde JSON**, comme `tutorialDone` de Mes achats (état d'interface : après restauration sur une nouvelle installation, le tutoriel est simplement proposé une fois de plus) ; contrat `shared/models.ts` : `Settings.notesTutorialDone?` facultatif, ignoré par React | `NoteIT.theTutorialIsOfferedUntilItIsFinishedOrSkipped` |

Migration : `V10__notes_tutorial.sql` (additive) : `user_settings.notes_tutorial_done BOOLEAN NOT NULL DEFAULT FALSE` ; aucune donnée existante modifiée, le tutoriel est proposé une fois sur une base déjà utilisée.

Vérifications (6 novembre 2026) : 182 tests backend sans échec, 115 tests unitaires Angular (dont `tour.spec.ts` et `notes-tour.service.spec.ts`), lint et build de production Angular, build et lint React ; 11 scénarios E2E Angular. `notes.spec.ts` compte désormais deux scénarios exécutés en série ; le nouveau scénario « tutoriel » remet lui-même `notesTutorialDone` à faux et vérifie : démarrage seul à la première visite, les trois étapes et leurs textes, trois couleurs différentes de gauche à droite, audit axe, Suivant, Passer enregistré (lu par l'API), pas de réaffichage après rechargement, focus rendu à « Comment ça marche ? », relance et parcours complet jusqu'à « Terminer » avec l'étape 3 mise en avant à « 3. Transformation en tâches » ; à 390 px, étapes de haut en bas, aucun débordement horizontal, audit axe, fermeture par Échap. Restent humains : lecteur d'écran réel et toucher. Hors périmètre : React et Krimou (voir § 4).

### Lot 15 — Tutoriel de la matrice d'Eisenhower

**Validé le 6 novembre 2026.** Demande du propriétaire : le même tutoriel sur la page « Matrice d'Eisenhower », avec pour schéma la matrice elle-même. Règles : [cahier des charges FWA-F031 et § 4.1](../produit/cahier-des-charges.md) ; usage : [guide § 4](../produit/guide-utilisation.md).

| Élément | Contenu | Vérification |
| --- | --- | --- |
| Schéma en matrice | `TourDiagram.layout: 'flow' \| 'matrix'`, `axes`, `TourStage.badge`, tons `q1`–`q4` (couleurs des quadrants). Constante `EISENHOWER_MATRIX` : Q1 Faire maintenant (urgent et important : à traiter en premier), Q2 Planifier (important, pas urgent : réservez-lui du temps), Q3 Déléguer / limiter (urgent, pas important : confiez-le ou faites court), Q4 Éliminer / plus tard (ni urgent ni important : abandonnez ou reportez) ; même disposition que la page (Q1 en haut à gauche), 2 × 2 aussi sur téléphone ; liste ordonnée « Les quatre cases de la matrice d'Eisenhower », axes `aria-hidden` (les textes disent déjà urgent / important) | Tests unitaires ; E2E : quatre cases, positions, quatre couleurs, axes, axe |
| Moteur commun | `shared/ui/tour/page-tour.ts` : classe abstraite `PageTourEngine` (démarrage à la première visite d'une page, lancement ou relance avec navigation par `navigateByUrl`, attente des cibles prêtes, enregistrement d'un `TutorialSetting` = `'notesTutorialDone' \| 'matrixTutorialDone'` par `SettingsStore`). `NotesTourService` en hérite (comportement inchangé). `TourEngine.element()` renvoie le premier élément **visible** portant un marqueur `data-tour` répété (première carte de tâche) | Tests unitaires ; `notes.spec.ts` inchangé et vert |
| Tutoriel | `MatrixTourService` (`features/eisenhower/components/matrix-tour/`, étapes dans `matrix-tour-steps.ts`) : 8 étapes — grille ; Nouvelle tâche (`matrix-new-task`, touche N) ; onglets (`matrix-tabs`, sous 64rem seulement) ; les quatre cases (`matrix-grid`) ; première carte (`matrix-task` : glisser-déposer, Alt + 1–4, Alt + ↑/↓, clic, menu Pomodoro) ; grille avec Q2 mise en avant (« Le secret : la case Planifier ») ; filtres (`matrix-filters`) ; relance (`matrix-tour-button`). Étape sans cible sautée ; ouverture seule sur `/matrix` tant que `matrixTutorialDone` est faux ; quitter la page interrompt sans enregistrer | Tests unitaires, E2E |
| Préférence | `user_settings.matrix_tutorial_done` ; `GET` / `PATCH /settings` exposent `matrixTutorialDone`, indépendant de `notesTutorialDone` ; hors sauvegarde JSON ; contrat `Settings.matrixTutorialDone?` facultatif, ignoré par React | `MatrixAndPrioritiesIT.theMatrixTutorialIsOfferedUntilItIsFinishedOrSkippedIndependentlyOfTheNotesOne` |

Migration : `V11__matrix_tutorial.sql` (additive) : `user_settings.matrix_tutorial_done BOOLEAN NOT NULL DEFAULT FALSE` ; le tutoriel est proposé une fois sur une base déjà utilisée.

Vérifications (6 novembre 2026) : 183 tests backend sans échec, 122 tests unitaires Angular, lint et build de production Angular, build et lint React ; 12 scénarios E2E Angular. Nouveau `matrix.spec.ts` (Angular seulement, rejouable : il remet lui-même `matrixTutorialDone` à faux, crée puis supprime sa tâche) : démarrage seul, quatre cases et leurs libellés, positions 2 × 2, quatre couleurs, axes, audit axe, Suivant, Passer enregistré, pas de réaffichage après rechargement, focus rendu au bouton, relance et parcours complet jusqu'à « Terminer » avec Q2 mise en avant à l'étape « Planifier » et l'étape des onglets sautée sur ordinateur ; à 390 px, grille toujours en 2 × 2, aucun débordement, audit axe, étape des onglets présente, fermeture par Échap. `smoke.spec.ts` marque désormais les tutoriels comme vus (`PATCH /settings` dans `beforeEach`) pour qu'ils ne couvrent pas les écrans qu'il contrôle. Restent humains : lecteur d'écran réel et toucher. Hors périmètre : React et Krimou.

### Lot 17 — Onglets de Notes & idées

**Livré le 10 novembre 2026**, à valider par le propriétaire. Demande : quand on entre dans une idée pour la modifier, elle s'ouvre dans un onglet ; revenir à la liste laisse l'onglet, sauf si on l'a fermé avec le bouton de l'onglet ; on bascule facilement entre les idées ouvertes ; une idée fermée doit être rouverte pour revenir dans la barre ; sans encombrer la page. Angular seulement, aucune modification d'API ni de sauvegarde.

| Élément | Contenu | Vérification |
| --- | --- | --- |
| État | `NoteTabs` (`features/notes/services/note-tabs.service.ts`) : onglets `{ id, title, color }` dans `localStorage` (`ff.notes.tabs`), relecture tolérante (JSON illisible, doublons, entrées invalides ignorés), synchronisation entre fenêtres ; ouverture à droite sans doublon, mise à jour sans résurrection d'un onglet fermé, fermeture, « autres », « tous », voisin à afficher | `note-tabs.service.spec.ts` (9 tests) |
| Barre | `ff-note-tabs` : « Notes & idées » (liste) puis un onglet par idée, soulignement de l'onglet affiché, pastille de catégorie, titre tronqué avec infobulle, croix, clic molette, Suppr, menu ⋯ dès deux onglets, focus rendu au voisin, défilement horizontal ; sur l'éditeur elle remplace le lien « ← Notes & idées » ; sur la liste elle n'apparaît que si une idée est ouverte | `note-tabs.spec.ts` (5 tests) ; captures clair, sombre, 1440 px et 390 px |
| Changement d'onglet | `AppRouteReuseStrategy` (`core/routing/`) recrée l'éditeur quand l'identifiant change (route marquée `recreateOnParamChange`) : l'idée quittée enregistre sa saisie en attente, l'idée ouverte ne peut pas recevoir le texte de la précédente ; rouvrir aussitôt la même idée attend la fin de l'envoi ; un chargement terminé après la fermeture de l'onglet ne le rouvre pas (défaut trouvé par l'E2E et corrigé) | `route-reuse.strategy.spec.ts` (3 tests) ; E2E « saisie puis changement d'onglet » lue par l'API |
| Cohérence | Titre et couleur suivis pendant la saisie ; titres rafraîchis par la liste ; onglet fermé à la suppression de l'idée et sur un 404 | `notes.spec.ts` |

Vérifications (10 novembre 2026) : 176 tests unitaires Angular (dont 17 nouveaux), lint et build de production Angular ; `notes.spec.ts` à trois scénarios sans échec sur backend et base **jetables** (18080, `backend/target/onglets-e2e-db`, Angular 4300) : le nouveau scénario « onglets » couvre l'ouverture, le retour à la liste, la bascule, l'enregistrement au changement d'onglet, le titre suivi, le rechargement, la fermeture de l'onglet affiché et d'un autre, la réouverture, axe et 390 px ; le scénario « parcours » cible désormais la carte de la liste (l'onglet porte le même nom). Restent humains : lecteur d'écran réel et toucher. Hors périmètre : React et Krimou (voir § 4).

### Lot 18 — Barre d'outils collée et surlignage

**Livré le 10 novembre 2026**, à valider par le propriétaire. Demandes : la barre d'outils (gras, italique…) doit suivre quand on descend dans un long texte, au lieu d'obliger à remonter au début ; un bouton de surlignage du texte choisi, en jaune, rouge, bleu ciel et violet.

| Élément | Contenu | Vérification |
| --- | --- | --- |
| Barre collée | `.note-sticky` (barre d'outils et formulaire de lien) collée sous la barre supérieure (`--app-header-height`) ; cadre de l'éditeur en `overflow: clip` (au lieu de `hidden`, qui empêchait le collage) ; ombre quand elle est collée (`@container scroll-state`) ; une ligne défilante sur téléphone ; curseur gardé sous la barre (`handleScrollToSelection`) ; panneau des tâches recalé sous la barre supérieure | E2E « barre d'outils collée » ; désactiver la correction du curseur fait échouer le scénario (vérifié) ; captures clair, sombre, 390 px |
| Surlignage | Marque `NoteHighlight` (Tiptap) et `util/highlight.ts` : `==texte==` (jaune), `<mark data-color="red\|sky\|violet">` ; bouton (dernière couleur, retire au second clic), flèche vers les quatre couleurs (cases radio annoncées) et **Retirer le surlignage**, Ctrl+Maj+H dans les deux modes, `==texte==` tapé en mode Visuel ; aide Markdown complétée ; aucune lecture seule du mode Visuel | `highlight.spec.ts` (9 tests), `note-extensions.spec.ts` (+9 tests : aller-retour des quatre couleurs, lien et gras surlignés, `<mark>` sans couleur, comparaisons et code ignorés, commandes, saisie `==`) ; E2E « surlignage » |
| Extrait | `NoteMapper.excerpt` retire `==` (pas dans « a == b ») et les balises `<mark>` | `NoteMapperTest.theExcerptDropsHighlightMarkersButKeepsComparisons` |

Vérifications (10 novembre 2026) : 264 tests backend sans échec, 194 tests unitaires Angular, lint et build de production Angular ; `notes.spec.ts` à cinq scénarios sans échec sur backend et base jetables ; audits axe en thème clair et sombre sur du texte surligné. Restent humains : lecteur d'écran réel et toucher. Hors périmètre : React et Krimou (voir § 4).

### Lot 19 — Export PDF

**Livré le 10 novembre 2026**, à valider par le propriétaire. Demande : exporter une idée en PDF ; un seul bouton d'export avec deux choix, Markdown ou PDF.

| Élément | Contenu | Vérification |
| --- | --- | --- |
| Bouton | « Exporter .md » remplacé par **Exporter** (menu : Markdown (.md), PDF (.pdf)) ; « Export PDF… » et bouton désactivé pendant la génération ; message de réussite ou d'erreur | E2E « export » (audit axe du menu) |
| PDF | `notePdfDefinition` (pure) : en-tête (titre, catégorie, étiquettes, dates), titres, gras, italique, barré, code, liens cliquables, surlignages en couleur, listes imbriquées, cases dessinées, alertes colorées, citations, tableaux avec en-tête, code coloré (Courier), séparateurs, pied de page (titre, page / total) ; idée vide signalée | `note-pdf.spec.ts` (7 tests, dont un vrai PDF généré : `%PDF-`) ; rendu d'une idée riche vérifié en image |
| Chargement | pdfmake 0.3.13 (figé) et ses polices dans des morceaux paresseux (≈ 250 + 310 Ko compressés), chargés au premier export ; chargement initial inchangé ; `allowedCommonJsDependencies` | Build de production sans avertissement |
| Émojis | Noto Emoji (`@expo-google-fonts/noto-emoji` 0.4.8, OFL-1.1) copiée dans `fonts/` au build, chargée à la demande ; découpage des émojis dans tout le document | `note-pdf.spec.ts` ; E2E « export » |

Émojis (demande du même jour) : police Noto Emoji monochrome (une police de PDF n'a pas de couleurs), téléchargée seulement si l'idée en contient ; émojis complets (drapeaux, ZWJ, tons de peau, touches) dans tout le document ; police indisponible : PDF sans émojis et message. Vérifié par `note-pdf.spec.ts` (12 tests), l'E2E « export » (police `NotoEmoji` embarquée dans le fichier) et le rendu d'une idée riche en émojis. Limite restante : symboles rares absents des polices. Vérifications (10 novembre 2026) : 206 tests unitaires Angular, lint et build de production Angular ; `notes.spec.ts` à six scénarios sans échec sur backend et base jetables. Hors périmètre : React et Krimou (voir § 4).

## 4. Adaptations React à prévoir (après la version stable Angular)

Backlog **gelé** jusqu'à la version stable d'Angular (décision du 5 novembre 2026). Toute évolution des contrats `shared/` doit rester compatible : React doit continuer à compiler sans modification.

| Origine | Adaptation |
| --- | --- |
| Lot 0 | `frontend-react/README.md` pointe vers `docs/frontend-architecture.md` et `docs/how-to-run-frontends.md`, devenus `docs/technique/architecture-frontend.md` et `docs/technique/exploitation.md` |
| Lot 1 | `ImportReport` contient `settingsRestored`, `dailyGoalsCreated`, `dailyGoalsSkipped` (sauvegarde v2) : les afficher dans l'aperçu d'import React. Champs ajoutés, aucun champ retiré : React compile sans changement |
| Lot 4 | Implémenter le module « Mes achats » : contrats dans `shared/finance.ts`, API `/api/v1/finance` (voir l'architecture backend), entrée de navigation `/finance` (G puis B), raccourci E. `ImportReport.finance` (sauvegarde v3) à afficher dans l'aperçu d'import |
| Lot 7 | **Sans objet depuis le lot 13** (prêts retirés) : `OperationType` comptait quatre types de mouvements de prêt (`LOAN_*`) ; `FinanceOverview.receivables` / `debts`, `ForecastResponse.expectedRepayments`, type `Loan` et API `/api/v1/finance/loans` ; `ImportReport.finance.loansCreated` / `loansSkipped` |
| Lot 8 | API `/finance/alerts`, `/finance/statistics`, `/finance/simulation`, `/finance/calendar` et types `FinanceAlert`, `FinanceStatistics`, `SimulationBody` / `SimulationResult` dans `shared/finance.ts` ; formulation des alertes à reprendre de `alert-text.ts` |
| Lot 11 | Module Notes & idées : contrats `shared/notes.ts`, API `/api/v1/notes` et `/api/v1/note-categories`, entrée `/notes` (G puis N), touche I ; éditeur à deux modes sur un contenu Markdown (préférence `Settings.noteEditorMode`) ; création de tâche depuis une idée via `POST /notes/{id}/tasks` avec gestion de `NOTE_TASK_DUPLICATE` ; suppression avec `NOTE_HAS_TASKS` / `force` ; `Task.sourceNoteId` (lien et repère) ; `ImportReport.notes`. Champs ajoutés en facultatifs : React compile sans changement |
| Lot 11 (Krimou) | Importer et exporter le format v4 (section `notes`, `sourceNoteId`, `noteEditorMode`) dans `engine.focus` ; jusque-là, une sauvegarde v4 est refusée par Krimou |
| Lot 13 | Implémenter directement « Mes achats » simplifié : compte unique, feuille du mois (`GET /finance/months/{mois}/sheet`, types `MonthSheet`, `SheetRow`, `EnvelopeRow`), dépenses variables plafonnées (`/finance/envelopes`, `Envelope`, `EnvelopeBody`), montants datés (`AmountChange`, `Schedule.amounts`, `PUT` / `DELETE /finance/schedules/{id}/amount`), quatre onglets et redirections, visite guidée (`FinancePreferences.tutorialDone`) et bulles d'aide, alerte `ENVELOPE_OVER`, `MonthStat.variableCap` / `savingsTarget`. Retirés de `shared/finance.ts` (et non rendus facultatifs) : `Loan`, `LoanBody`, `LoanDirection`, `LoanStatus`, types `LOAN_*`, `receivables` / `debts`, `expectedRepayments`, `loansCreated` / `loansSkipped`, `writtenOffLent` / `writtenOffBorrowed`, alertes `LOAN_OVERDUE_*`. React n'importe aucun contrat financier : il n'est pas concerné d'ici là |
| Lot 13 (Krimou) | Porter dans `engine.focus.finance` le compte unique et la fusion des comptes, les prêts en catégorie, l'épargne du mois, la feuille du mois, les montants datés et les dépenses variables plafonnées, avec leurs scénarios de test ; importer et exporter le format v5 |
| Lot 14 | Avec le module Notes & idées : tutoriel « de l'idée à l'action » (schéma en trois étapes, Suivant / Précédent / Passer, relance « Comment ça marche ? »), état dans `Settings.notesTutorialDone` (`GET` / `PATCH /settings`). Champ ajouté en facultatif dans `shared/models.ts` : React compile sans changement et l'ignore d'ici là |
| Lot 15 | Tutoriel de la matrice (grille 2 × 2 aux couleurs des quadrants, étape « Planifier », relance « Comment ça marche ? »), état dans `Settings.matrixTutorialDone` (`GET` / `PATCH /settings`), indépendant de `notesTutorialDone`. Champ ajouté en facultatif : React compile sans changement et l'ignore d'ici là |
| Lot 0 | La suite E2E (`frontend-react/e2e`, `playwright.config.ts`) écrit dans `docs/test-results/` et `docs/screenshots/`, désormais ignorés par Git ; envisager de la déplacer hors du dossier React puisqu'elle teste aussi Angular |
