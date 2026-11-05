# FocusWithAkram — avancement fonctionnel

Relevé du **3 novembre 2026**. Cible : [cahier des charges](../produit/cahier-des-charges.md). Contrôles : [checklist](checklist.md). « Livré » signifie présent dans le code et relié à l’API ; cela ne couvre pas automatiquement tous les appareils et tous les scénarios.

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
| FWA-F019 Mes achats — socle       | Livré                  | Livré                      | Non commencé                   | 18 tests d’intégration et unitaires ; recette navigateur sur base jetable. |
| FWA-F020 Mes achats — budget      | Livré                  | Livré                      | Non commencé                   | Échéancier, budget, préférences : 14 tests dédiés ; recette navigateur. |
| FWA-F021 Mes achats — achats prévus | Livré                | Livré                      | Non commencé                   | Moteur testé sur 12 scénarios chiffrés ; 6 tests d'intégration ; recette navigateur. |
| FWA-F022 Mes achats — prêts       | Livré                  | Livré                      | Non commencé                   | 7 tests d'intégration ; recette navigateur. |
| FWA-F023 Mes achats — analyses    | Livré                  | Livré                      | Non commencé                   | Alertes, statistiques, simulations, calendrier : 5 tests d'intégration, 4 tests unitaires ; recette navigateur. |
| FWA-F024 Notes & idées — espace   | Livré                  | Livré                      | Non commencé                   | Saisie rapide (champ, touche I, palette), enregistrement automatique, recherche titre/contenu, filtres, tris, favoris ; `NoteIT` ; recette navigateur clair/sombre et 390 px. |
| FWA-F025 Notes & idées — catégories | Livré                | Livré                      | Non commencé                   | Écran dédié, nom unique sans casse, suppression qui conserve les idées ; tests d'intégration et recette. |
| FWA-F026 Notes & idées — éditeur  | Préférence livrée      | Livré (Markdown + visuel)  | Non commencé                   | Contenu Markdown unique ; barre d'outils, Ctrl+B/I/Z, aperçu avec cases cochables ; mode visuel Tiptap ; préférence enregistrée. 8 tests unitaires ; recette navigateur. |
| FWA-F027 Idée → tâches            | Livré                  | Livré                      | Non commencé                   | Formulaire de tâche réutilisé, quadrant et échéance, plusieurs tâches, lien conservé (restauration, duplication), doublon confirmé, suppression bloquée ou forcée ; `NoteIT` (10 scénarios) ; recette navigateur. |

## 2. Modifications fonctionnelles récentes

- **Notes & idées** (3 novembre 2026) : idées sans statut, catégories gérées, éditeur Markdown ou visuel, transformation en une ou plusieurs tâches de la matrice avec lien conservé ; sauvegarde v4. Angular seulement.
- Le minuteur se configure dans **Focus / Pomodoro → Configurer** : travail, pauses, fréquence de pause longue, objectif quotidien, options automatiques, son et notifications.
- Les paramètres généraux conservent l’apparence, la région, les préférences de tâches, les raccourcis et les transferts de données.
- Les saisies non enregistrées du panneau Pomodoro React sont conservées lors d’une actualisation des préférences.
- Le renommage `frontend-angular` et la séparation en dossiers ne créent pas de second backend ni de nouvelles données.
- Les DTO d’entrée du backend préservent la distinction entre omission et `null` explicite dans les mises à jour.

## 3. Tests et validations disponibles

| Preuve                          | Résultat connu                                                    | Périmètre / limite                                                           |
| ------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Backend existant                | 70 tests sans échec                                               | Tâches, matrice, Pomodoro, dates, archives, statistiques, import/export.     |
| Contrat et architecture backend | 8 tests supplémentaires sans échec                                | PATCH, DTO, recherche, erreurs HTTP et séparation contrôleur/repository.     |
| Unitaires frontend              | 22 Angular (1 nov. 2026, refonte v2) + 12 React (validation antérieure) sans échec | Tests ciblés ; pas une couverture complète des pages.            |
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
| Docker de bout en bout                       | Non validé                                     | Contexte de build corrigé ; construction réelle à essayer.                               |
| Fonctionnement navigateur fermé              | Non garanti                                    | Son, notifications et enchaînements automatiques nécessitent le navigateur.              |
| Mode hors ligne complet                      | Non livré                                      | Un affichage de session mémorisé n’est pas une base locale synchronisable.               |
| Authentification et multi-utilisateur        | Non livrés                                     | Usage local uniquement.                                                                  |

## 5. Prochaines étapes

1. Valider visuellement le nouveau panneau Focus en clair/sombre sur ordinateur et téléphone.
2. Poursuivre la conversion des classes utilitaires Angular en styles de composants si la séparation stricte est maintenue comme cible.
3. Vérifier les parcours rares : conflits simultanés entre interfaces, permissions refusées, import volumineux et interruption réseau pendant un enregistrement.
4. Valider Docker et une restauration sur environnement vierge.
5. Rafraîchir les captures et les mesures après toute nouvelle modification visuelle.
