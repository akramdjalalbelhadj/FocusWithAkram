# FocusWithAkram — avancement fonctionnel

Relevé du **5 novembre 2026**. Cible : [cahier des charges](../produit/cahier-des-charges.md). Contrôles : [checklist](checklist.md). « Livré » signifie présent dans le code et relié à l’API ; cela ne couvre pas automatiquement tous les appareils et tous les scénarios.

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
| FWA-F018 Import / export          | Livré                  | Livré                      | Livré                          | Sauvegarde v3 (préférences, Top 3, finances), import élément par élément, doublons et CSV testés.                  |
| FWA-F019 Mes achats — socle       | Livré                  | Livré                      | Reporté (après version stable) | 18 tests d’intégration et unitaires ; recette navigateur sur base jetable. |
| FWA-F020 Mes achats — budget      | Livré                  | Livré                      | Reporté (après version stable) | Échéancier, budget, préférences : 14 tests dédiés ; recette navigateur. |
| FWA-F021 Mes achats — achats prévus | Livré                | Livré                      | Reporté (après version stable) | Moteur testé sur 12 scénarios chiffrés ; 6 tests d'intégration ; recette navigateur. |
| FWA-F022 Mes achats — prêts       | Livré                  | Livré                      | Reporté (après version stable) | 7 tests d'intégration ; recette navigateur. |
| FWA-F023 Mes achats — analyses    | Livré                  | Livré                      | Reporté (après version stable) | Alertes, statistiques, simulations, calendrier : 5 tests d'intégration, 4 tests unitaires ; recette navigateur. |
| FWA-F024 Notes & idées — espace   | Livré                  | Livré                      | Reporté (après version stable) | Saisie rapide (champ, touche I, palette), enregistrement automatique, recherche titre/contenu, filtres, tris, favoris ; `NoteIT` ; recette navigateur clair/sombre et 390 px. |
| FWA-F025 Notes & idées — catégories | Livré                | Livré                      | Reporté (après version stable) | Écran dédié, nom unique sans casse, suppression qui conserve les idées ; tests d'intégration et recette. |
| FWA-F026 Notes & idées — éditeur  | Préférence livrée      | Livré (Markdown + visuel)  | Reporté (après version stable) | Contenu Markdown unique ; barre d'outils, Ctrl+B/I/Z, aperçu avec cases cochables ; mode visuel Tiptap ; préférence enregistrée. 8 tests unitaires ; recette navigateur. |
| FWA-F027 Idée → tâches            | Livré                  | Livré                      | Reporté (après version stable) | Formulaire de tâche réutilisé, quadrant et échéance, plusieurs tâches, lien conservé (restauration, duplication), doublon confirmé, suppression bloquée ou forcée ; `NoteIT` (10 scénarios) ; recette navigateur. |

## 2. Modifications fonctionnelles récentes

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
| Backend                         | 170 tests sans échec (5 nov. 2026, PostgreSQL 18.6)               | Unitaires, intégration, contrat et architecture : productivité, Mes achats, Notes, import/export, PostgreSQL embarqué. |
| Unitaires frontend              | 43 Angular (3 nov. 2026, lot 11) + 12 React (validation antérieure) sans échec | Tests ciblés ; pas une couverture complète des pages.               |
| Lanceurs et migration PostgreSQL | Recette Windows du 5 nov. 2026 (PowerShell et Git Bash)          | Relance sur instance active, ports pris par une autre application, CORS, arrêt ; migration 14 → 18 sur une copie de la base personnelle. |
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
| Docker de bout en bout                       | Non validé                                     | Contexte de build corrigé, image PostgreSQL 18 ; construction réelle à essayer.          |
| Base personnelle en PostgreSQL 18            | Migration prête et essayée sur une copie       | À lancer une fois (`scripts/migrate_postgres.ps1`) ; d’ici là, les lanceurs refusent de démarrer sur la base 14. |
| Interface React à jour, application mobile   | Reportés après la version stable Angular       | React n’a ni Mes achats ni Notes ; Krimou n’importe pas la sauvegarde v4.                |
| Fonctionnement navigateur fermé              | Non garanti                                    | Son, notifications et enchaînements automatiques nécessitent le navigateur.              |
| Mode hors ligne complet                      | Non livré                                      | Un affichage de session mémorisé n’est pas une base locale synchronisable.               |
| Authentification et multi-utilisateur        | Non livrés                                     | Usage local uniquement.                                                                  |

## 5. Prochaines étapes (vers la version stable Angular)

1. Migrer la base personnelle vers PostgreSQL 18 (`scripts/migrate_postgres.ps1`) puis relancer l’application.
2. Lot 9 : stabiliser la version web Angular (recette complète de tous les modules, parcours rares : conflits simultanés, permissions refusées, import volumineux, interruption réseau pendant un enregistrement) et finaliser la documentation.
3. Valider visuellement le panneau Focus en clair/sombre sur ordinateur et téléphone ; recette humaine (clavier complet, lecteur d’écran, zoom 200 %, toucher).
4. Valider Docker et une restauration sur environnement vierge.
5. Décider si la conversion des classes utilitaires Angular en styles de composants reste une cible.
6. Après la version stable : React (backlog du [§ 4 de la refonte v2](refonte-v2.md)), puis l’application mobile Krimou.
