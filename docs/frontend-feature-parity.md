# Parité fonctionnelle — état de recette

`fonctionnel` signifie code relié à l’API réelle, avec la preuve indiquée. Cela ne signifie pas que toutes les combinaisons ont été automatisées. `partiel` identifie une différence de couverture ou de présentation. Aucun endpoint fictif. Les règles de dates, de cycles, de statut et d’archivage restent côté Spring Boot.

| Page / fonctionnalité | Angular | React | API réelle | Preuve / test | Écart connu |
|---|---|---|---|---|---|
| Navigation des 9 pages | fonctionnel | fonctionnel | Selon page | E2E navigation | Layouts propres à chaque framework |
| Matrice : 4 quadrants, filtres, ajout | fonctionnel | fonctionnel | eisenhower/matrix, tasks | E2E création et captures | Aucun panneau droit ni timer |
| Déplacement de quadrant clavier, persistance | fonctionnel | fonctionnel | tasks/reorder | E2E Alt+2 + rechargement | CDK / dnd-kit |
| Tri souris, ordre interne, annulation | fonctionnel | fonctionnel | tasks/reorder | Code matrix.page / planning, test calendrier souris | Annulation non couverte par E2E dédié |
| Tâche création/édition, sous-tâches | fonctionnel | fonctionnel | tasks, tasks/{id}/subtasks | E2E formulaire, titre modifié, sous-tâche persistée | Sélecteur date Angular personnalisé / natif React |
| Détail : six dates, notes, durées, cycles et sessions | fonctionnel | fonctionnel | tasks/{id}, timeline, executions | Composants task-detail.panel / TaskDetail ; tests backend cycles | Pas de scénario UI exhaustif des corrections |
| Terminer et archiver | fonctionnel | fonctionnel | start, complete, archives | E2E passage API puis disparition active / présence archives ; backend TaskLifecycleIT | Dialogue de fin sans début réel non automatisé |
| Restaurer, dupliquer, supprimer | fonctionnel | fonctionnel | restore, duplicate, DELETE tasks | Code actions ; backend TaskLifecycleIT | Pas de test UI de chaque menu |
| Calendrier mois/semaine/jour | fonctionnel | fonctionnel | tasks (bornes de dates) | Captures, code calendar.page / CalendarPage | Semaine/jour présentent les échéances réelles, pas des créneaux inventés |
| Calendrier déplacement à la souris | fonctionnel | fonctionnel | PATCH tasks/{id} | E2E changement de jour puis reload ; début et fin conservés | Chargement borné à 200 ; pagination globale non exposée dans la grille |
| Calendrier détail et non planifiées | fonctionnel | fonctionnel | tasks | Captures et lecture du code | Nombre visible limité pour préserver la grille |
| Dashboard six indicateurs, Top 3, activité, Focus | fonctionnel | fonctionnel | dashboard/summary, dashboard/top3 | Captures ; backend MatrixAndPrioritiesIT | Graphiques différents ; Top 3 non testé par manipulation UI |
| Mes tâches : six vues, filtres, tris | fonctionnel | fonctionnel | tasks/priorities | Code + navigation/captures | Panneau résumé latéral ; détail complet dans un dialogue |
| Focus démarrer/pause/reprise/rechargement | fonctionnel | fonctionnel | pomodoro/sessions | E2E dans les deux, tests horloge | Cache local non autoritaire, resynchronisation serveur |
| Focus fin, interruptions, séquence, historique | fonctionnel | fonctionnel | complete, cancel, history/daily | PomodoroIT et tests unitaires ; historique capturé | Fin automatique longue et audio réel non testés en navigateur |
| Projets CRUD, couleur, icône, échéance, archives | fonctionnel | fonctionnel | projects | Code et captures ; intégration API réelle | Pas de scénario E2E CRUD projet complet |
| Aperçu des tâches sur les projets | fonctionnel | fonctionnel | tasks/priorities, tasks/{id} | E2E ouverture du détail depuis la carte, dates visibles et Échap | Deux premières tâches actives |
| Projets progression et tâches conservées | fonctionnel | fonctionnel | compteurs Project, tasks | DTO et code ; backend | Aucun pourcentage statique |
| Statistiques périodes et données | fonctionnel | fonctionnel | statistics/productivity | StatisticsAndArchivesIT ; captures | ECharts Angular / SVG-CSS React ; même API |
| Statistiques donut, activité, heatmap | fonctionnel | fonctionnel | daily, activeByQuadrant | Captures ; alternatives texte/tableau | React représente le focus en barres et les tâches dans le tableau |
| Prévu/réel/actif, ponctualité, temps par projet/tâche | fonctionnel | fonctionnel | planning, focus | Code et tests backend | React privilégie les tableaux pour la comparaison de durées |
| Archives périodes/filtres/pagination/détails | fonctionnel | fonctionnel | tasks/archives, facets | Code et E2E présence archive | Pas de PNG de référence fourni |
| Export JSON/CSV et sauvegarde | fonctionnel | fonctionnel | export/tasks, export/backup | ImportExportIT, CsvEscapingTest ; handlers UI | Téléchargement UI non automatisé |
| Import aperçu puis confirmation | fonctionnel | fonctionnel | import?dryRun | ImportExportIT ; code SettingsPage | Sélection de fichier UI non automatisée |
| Paramètres persistants et thèmes | fonctionnel | fonctionnel | settings | E2E LIGHT + reload, captures DARK | Angular enregistre automatiquement ; React bouton explicite |
| Sons et notifications | fonctionnel | fonctionnel | settings + API navigateur | Code | Permissions, son audible et fermeture navigateur non validés manuellement |
| Recherche/palette et raccourcis | fonctionnel | fonctionnel | search | Code shell / Palette | Couverture clavier partielle : le test valide le déplacement matriciel |
| Erreur API et reprise | fonctionnel | fonctionnel | ProblemDetail | E2E interruption réseau matrice | Pas de simulation de toutes les erreurs métier |

## Limites de validation

Les tests UI couvrent les parcours structurants, pas chaque opération de la table. La recette reste partielle pour une certification de parité exhaustive : import/export dans le navigateur, tous les menus, lecteurs d’écran, plusieurs onglets concurrents et fin sonore automatique. Les tests backend ne sont pas présentés comme des tests UI.

Les exemples visuels sont des fixtures déclarées dans `frontend-react/e2e/seed.mjs`, stockées par les vrais endpoints dans une base PostgreSQL séparée. Les applications normales n’utilisent ni mocks ni fixtures. Les dates partagées sont testées pour les journées de 23/25 heures et l’heure ambiguë d’automne.
