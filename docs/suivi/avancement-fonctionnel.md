# FocusWithAkram — avancement fonctionnel

Relevé du **5 novembre 2026** (lot 13 « Mes achats simplifié » validé le 6 novembre 2026). Cible : [cahier des charges](../produit/cahier-des-charges.md). Contrôles : [checklist](checklist.md). « Livré » signifie présent dans le code et relié à l’API ; cela ne couvre pas automatiquement tous les appareils et tous les scénarios.

**Priorité** : FocusWithAkram web avec **Angular** jusqu’à une version stable. React et l’application mobile (Krimou) sont déprioritisés et reprennent ensuite (décision du 5 novembre 2026, [refonte v2](refonte-v2.md)) ; « Reporté » dans la colonne React signifie qu’aucun travail n’est prévu avant cette version stable.

## 1. État des fonctionnalités

| Exigence                          | Backend                | Angular                    | React                          | Preuves / réserve                                                                            |
| --------------------------------- | ---------------------- | -------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| FWA-F001 Navigation               | Routes API disponibles | 11 pages                   | 9 pages                        | 36 contrôles route/viewport lors de l’organisation ; test navigateur commun.                 |
| FWA-F002 Tâches                   | Livré                  | Livré                      | Livré                          | Cycle de vie et formulaires couverts par tests métier et E2E.                                |
| FWA-F003 Sous-tâches / tags       | Livré                  | Livré                      | Livré                          | Sous-tâche persistée dans le scénario de formulaire ; couverture non exhaustive des limites. |
| FWA-F004 Matrice                  | Livré                  | Livré                      | Livré                          | Déplacement clavier et ordre persistés ; grille mobile à quadrant sélectionné.               |
| FWA-F005 Priorités                | Livré                  | Livré                      | Livré                          | Vues et filtres présents ; la vue Terminées ne remplace pas les archives paginées.           |
| FWA-F006 Top 3                    | Livré                  | Livré                      | Livré                          | Sélection quotidienne et progression ; règles côté dashboard.                                |
| FWA-F007 Dates / cycle de vie     | Livré                  | Livré                      | Livré                          | Cohérence prévu/réel et démarrage rétroactif testés côté serveur.                            |
| FWA-F008 Archives                 | Livré                  | Livré                      | Livré                          | Restauration et historique multi-cycles testés.                                              |
| FWA-F009 Pomodoro                 | Livré                  | Livré                      | Livré                          | Pause, recharge, reprise et interruption vérifiées dans les deux variantes.                  |
| FWA-F010 Configuration dans Focus | Livré                  | Enregistrement automatique | Enregistrement explicite       | Durées, objectif, enchaînements, son et notifications retirés des paramètres généraux.       |
| FWA-F011 Historique Pomodoro      | Livré                  | Livré                      | Livré                          | Sessions terminées/interrompues et regroupement quotidien ; différences de présentation.     |
| FWA-F012 Calendrier               | Livré                  | Livré                      | Livré                          | Replanification souris vérifiée ; dates du scénario E2E à maintenir.                         |
| FWA-F013 Projets                  | Livré                  | Livré                      | Livré                          | Aperçu des tâches et ouverture du détail vérifiés ; noms actifs uniques.                     |
| FWA-F014 Dashboard                | Livré                  | Livré                      | Livré                          | Données réelles ; composition et graphiques différents selon le frontend.                    |
| FWA-F015 Statistiques             | Livré                  | Livré                      | Livré, présentation différente | Angular emploie ECharts ; React emploie aussi tableaux, SVG et CSS.                          |
| FWA-F016 Paramètres généraux      | Livré                  | Auto-enregistrement        | Formulaire Enregistrer         | E2E : ne réinitialisent pas les réglages Pomodoro.                                           |
| FWA-F017 Recherche / raccourcis   | Livré                  | Livré                      | Livré                          | Recherche extraite dans un service backend ; nuances de raccourcis dans le guide.            |
| FWA-F018 Import / export          | Livré (v5, lot 13)    | Livré                | Livré                          | Sauvegarde v4 (préférences, Top 3, finances, notes), import élément par élément, doublons et CSV testés. Sauvegarde v5 (montants datés, dépenses variables plafonnées, commentaires) et conversion des anciennes sauvegardes testées (aller-retour, sauvegarde à plusieurs comptes et prêts, sauvegarde personnelle). |
| FWA-F019 Mes achats — socle       | Livré (lot 13)         | Livré (lot 13)             | Reporté (après version stable) | Socle livré aux lots 4 et 5 (18 tests d’intégration et unitaires ; recette navigateur sur base jetable). Lot 13 : compte unique, fusion des comptes (migration V8, test `SingleAccountMigrationIT` ajouté), catégorie facultative des revenus : testés (`FinanceIT`, `SingleAccountMigrationIT`, E2E). |
| FWA-F020 Mes achats — budget      | Livré (lot 13)         | Livré (lot 13)             | Reporté (après version stable) | Échéancier, budget, préférences livrés au lot 5 (14 tests dédiés ; recette navigateur). Lot 13 : revenus pour une période, montants à partir d’un mois, plafond variable = somme des dépenses variables plafonnées, épargne du mois : testés (`MonthSheetIT`, `FinanceBudgetIT`, E2E). |
| FWA-F021 Mes achats — projets d’achat | Livré (lot 13)     | Livré (lot 13)             | Reporté (après version stable) | Moteur testé sur 12 scénarios chiffrés ; 6 tests d'intégration ; recette navigateur (lot 6). Lot 13 : financement par l’épargne et plancher retirés, onglet renommé « Projets d’achat » ; projet avec verdict dans l’E2E. |
| FWA-F022 Mes achats — prêts       | Remplacée (lot 13)     | Remplacée (lot 13)         | —                              | Plus de suivi des prêts (décision du 5 novembre 2026) : catégorie « Prêts », couverte par FWA-F019. Onglet, API `/loans`, régularisation et alertes de prêt retirés ; prêt saisi dans la catégorie « Prêts » dans l’E2E. |
| FWA-F023 Mes achats — analyses    | Livré (lot 13)         | Livré (lot 13)             | Reporté (après version stable) | Alertes, statistiques, simulations, calendrier livrés au lot 8 (5 tests d'intégration, 4 tests unitaires ; recette navigateur). Lot 13 : onglet « Analyses », épargne, objectif et plafond mois par mois, alerte `ENVELOPE_OVER`, alertes de prêt retirées : testés (`InsightIT`, `EnvelopeIT`, E2E). |
| FWA-F024 Notes & idées — espace   | Livré                  | Livré                      | Reporté (après version stable) | Saisie rapide (champ, touche I, palette), enregistrement automatique, recherche titre/contenu, filtres, tris, favoris ; `NoteIT` ; recette navigateur clair/sombre et 390 px. |
| FWA-F025 Notes & idées — catégories | Livré                | Livré                      | Reporté (après version stable) | Écran dédié, nom unique sans casse, suppression qui conserve les idées ; tests d'intégration et recette. |
| FWA-F026 Notes & idées — éditeur  | Préférence livrée      | Livré (Markdown + visuel)  | Reporté (après version stable) | Contenu Markdown unique ; barre d'outils, Ctrl+B/I/Z, aperçu avec cases cochables ; mode visuel Tiptap ; préférence enregistrée. 8 tests unitaires ; recette navigateur. |
| FWA-F027 Idée → tâches            | Livré                  | Livré                      | Reporté (après version stable) | Formulaire de tâche réutilisé, quadrant et échéance, plusieurs tâches, lien conservé (restauration, duplication), doublon confirmé, suppression bloquée ou forcée ; `NoteIT` (10 scénarios) ; recette navigateur. |
| FWA-F028 Mes achats — feuille du mois | Livré (lot 13)     | Livré (lot 13)             | Reporté (après version stable) | `GET /months/{mois}/sheet`, dépenses variables plafonnées (`/envelopes`), montants datés des échéanciers, page « Mon mois », quatre onglets et anciennes adresses redirigées : `MonthSheetIT`, `EnvelopeIT` et E2E (salaire de novembre 2026 à février 2027, loyer 350 € puis 400 € en janvier 2027, courses 300 € dépassées et expliquées). Référence : [feuille du mois](../produit/mes-achats/feuille-du-mois.md). |
| FWA-F029 Mes achats — aide intégrée | Préférence livrée (lot 13) | Livré (lot 13) | Reporté (après version stable) | Visite guidée (préférence `tutorialDone`, migration V8), bulles d’aide `ff-help-tip` : tests unitaires et E2E (démarrage, Passer, non réaffichage, Échap) ; lecteur d’écran réel à essayer. |

## 2. Modifications fonctionnelles récentes

- **« Mes achats » simplifié, lot 13** (5 novembre 2026, **validé le 6 novembre 2026**) : un seul compte représente tout l’argent (banque, épargne, espèces) ; les comptes existants sont fusionnés sans changer le total et les virements entre eux disparaissent. Les prêts ne sont plus suivis : ils deviennent des dépenses ou des revenus de la catégorie « Prêts ». L’épargne est ce qui reste du mois, comparée à un objectif. Nouvel onglet **Mon mois** : revenus saisis pour une période, dépenses fixes pré-remplies, montants qui changent à partir d’un mois ou pour ce mois seulement, dépenses variables plafonnées avec commentaire en cas de dépassement, épargne prévue et réelle. Quatre onglets (Mon mois, Opérations, Projets d’achat, Analyses), ⚙ Réglages, visite guidée et bulles d’aide ; anciennes adresses redirigées ; sauvegarde v5. Mettre à jour après une sauvegarde JSON ([exploitation § 11.2](../technique/exploitation.md)).
- **Stabilisation Angular, lot 9** (5 novembre 2026) : dialogues annoncés correctement par les lecteurs d’écran (un seul dialogue nommé et modal), « Mes achats » sans débordement sur téléphone une fois des données présentes, import de grosses sauvegardes environ quinze fois plus rapide, message clair quand une idée ouverte a été supprimée dans un autre onglet ; Docker validé.
- **Lancement et base locale** (5 novembre 2026) : relancer l’application remplace proprement le lancement précédent ; une autre application qui occupe un port n’est plus arrêtée, le lanceur prend le port libre suivant et l’affiche. La base locale passe à PostgreSQL 18 : une base créée avant est migrée une fois par `scripts/migrate_postgres.ps1` (les lanceurs l’indiquent), l’ancienne étant conservée.
- **Notes & idées** (3 novembre 2026) : idées sans statut, catégories gérées, éditeur Markdown ou visuel, transformation en une ou plusieurs tâches de la matrice avec lien conservé ; sauvegarde v4. Angular seulement.
- Le minuteur se configure dans **Focus / Pomodoro → Configurer** : travail, pauses, fréquence de pause longue, objectif quotidien, options automatiques, son et notifications.
- Les paramètres généraux conservent l’apparence, la région, les préférences de tâches, les raccourcis et les transferts de données.
- Les saisies non enregistrées du panneau Pomodoro React sont conservées lors d’une actualisation des préférences.
- Le renommage `frontend-angular` et la séparation en dossiers ne créent pas de second backend ni de nouvelles données.
- Les DTO d’entrée du backend préservent la distinction entre omission et `null` explicite dans les mises à jour.

## 3. Tests et validations disponibles

| Preuve                          | Résultat connu                                                    | Périmètre / limite                                                           |
| ------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Backend                         | 188 tests sans échec (6 nov. 2026, PostgreSQL 18.6, lot 13)     | Unitaires, intégration, contrat et architecture : productivité, Mes achats, Notes, import/export, PostgreSQL embarqué. |
| Unitaires frontend              | 104 Angular (6 nov. 2026, lot 13) + 12 React (validation antérieure) sans échec | Tests ciblés ; pas une couverture complète des pages.               |
| E2E Angular                     | 10 scénarios sans échec (6 nov. 2026, lot 13)                     | Tâches, matrice, Pomodoro, calendrier, projets, navigation et audits axe, **Mes achats** et **Notes** de bout en bout, coupure réseau. |
| Relevé des pages et volume      | 20 pages × 3 variantes, base vide puis volumineuse, sans erreur   | 4 010 tâches, 10 006 opérations, 1 000 idées : 0,7 à 1,4 s par page ; import de 7 500 éléments en 6 s. |
| Docker                          | Validé dans WSL (5 nov. 2026)                                     | Services sains, PostgreSQL 18.6, écritures, en-têtes de sécurité, données conservées après redémarrage. |
| Lanceurs et migration PostgreSQL | Recette Windows du 5 nov. 2026 (PowerShell et Git Bash)          | Relance sur instance active, ports pris par une autre application, CORS, arrêt ; migration 14 → 18 sur une copie de la base personnelle. |
| Lot 13 — Mes achats simplifié   | Validé (6 nov. 2026)                                              | 188 tests backend (dont `SingleAccountMigrationIT`, `MonthSheetIT`, `EnvelopeIT`), 104 Angular, `finance.spec.ts` réécrit (1,2 min), audits axe de Mon mois à 1440 et 390 px ; sauvegarde personnelle importée sans écart dans une base jetable. |
| Recette métier historique       | 12 scénarios réussis, 6 par frontend                              | Manipulation des tâches, Pomodoro, réseau, calendrier, sous-tâche et projet. |
| Réglages déplacés               | 1 scénario par frontend réussi                                    | Enregistrement, recharge et conservation après paramètres généraux.          |
| Navigation responsive           | 36 contrôles réussis                                              | 9 routes × 2 tailles × 2 frontends ; pas un essai tactile réel.              |
| Accessibilité historique        | 28 audits axe sans violation détectée                             | 7 pages × 2 thèmes × 2 variantes ; ne certifie pas toute l’application.      |

Les preuves ne correspondent pas toutes à une unique exécution de la version finale. Les captures antérieures ne montrent pas forcément le nouveau panneau Focus. Voir [l’inventaire daté](../historique/2026-11-refonte-frontends/test-results/documentation-audit.json) et les [écarts visuels](../historique/2026-11-refonte-frontends/recette-visuelle.md).

## 4. Partiel ou non livré

| Sujet                                        | État                                           | Impact                                                                                   |
| -------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Équivalence visuelle exacte                  | Partiel                                        | Tailles d’anneau, graphiques, actions et densité diffèrent encore.                       |
| Retrait de Tailwind du HTML Angular          | Partiel                                        | La matrice emploie des classes sémantiques ; d’autres templates gardent des utilitaires. |
| Tests lecteurs d’écran et appareils tactiles | Non consignés de manière complète              | Recette humaine encore nécessaire.                                                       |
| « Mes achats » simplifié (lot 13)            | Livré ; recette humaine à faire                | Lecteur d’écran réel et toucher sur la feuille du mois, la visite guidée et les bulles d’aide. |
| Interface React à jour, application mobile   | Reportés après la version stable Angular       | React n’a ni Mes achats ni Notes ; Krimou n’importe pas les sauvegardes v4 et v5 et garde les règles financières d’avant le lot 13. |
| Fonctionnement navigateur fermé              | Non garanti                                    | Son, notifications et enchaînements automatiques nécessitent le navigateur.              |
| Mode hors ligne complet                      | Non livré                                      | Un affichage de session mémorisé n’est pas une base locale synchronisable.               |
| Authentification et multi-utilisateur        | Non livrés                                     | Usage local uniquement.                                                                  |

## 5. Prochaines étapes

La version web Angular est stabilisée (lot 9, 5 novembre 2026). Suite prévue :

1. Utiliser la **feuille du mois** au quotidien (lot 13, validé le 6 novembre 2026) et noter ce qui gêne ; essayer la visite guidée et les bulles d’aide au lecteur d’écran et au toucher.
2. Recette humaine : lecteur d’écran réel, toucher sur téléphone, zoom 200 %, son et notifications avec onglet suspendu ; panneau Focus en clair/sombre sur téléphone.
3. Messages d’erreur du serveur : accents et suppression des identifiants techniques.
4. Restauration complète sur environnement vierge (sauvegarde applicative vers une base Docker neuve).
5. Décider si la conversion des classes utilitaires Angular en styles de composants reste une cible.
6. Après la version stable : React (backlog du [§ 4 de la refonte v2](refonte-v2.md)), puis l’application mobile Krimou.
