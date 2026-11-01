# FocusWithAkram — checklist

Relevé du **1 novembre 2026**. Les cases cochées indiquent une réalisation ou une validation consignée ; elles ne signifient pas que toute la recette a été relancée pendant cette révision documentaire. Une case ouverte reste un travail de validation ou d’évolution.

## FWA-F001 — Navigation

- [x] Neuf pages dans Angular et React, avec routes accessibles directement.
- [x] Navigation latérale et variante mobile ; indication de la destination active.
- [x] Contrôle des neuf routes à 1440 px et 390 px pour les deux variantes.
- [ ] Essai tactile réel, retour navigateur et zoom à 200 % sur les neuf pages.

## FWA-F002 / F003 — Tâches, sous-tâches et étiquettes

- [x] Création, modification, duplication et suppression reliées à l’API.
- [x] Champs typés, validation du titre et bornes du contrat côté backend.
- [x] Sous-tâches persistées et filtres projet/étiquette disponibles.
- [x] Un PATCH de titre conserve projet et planning ; un `null` explicite les efface.
- [ ] Recette des longueurs maximales, doublons de tags et erreurs concurrentes dans les deux formulaires.

## FWA-F004 / F005 / F006 — Priorisation

- [x] Quadrants dérivés d’important/urgent ; ordre manuel persistant.
- [x] Déplacement clavier dans la matrice et onglets des quadrants en mobile.
- [x] Listes Priorités, Aujourd’hui, Semaine, Toutes, En retard, Terminées.
- [x] Top 3 quotidien et progression.
- [ ] Vérifier toutes les combinaisons de filtres et le parcours au-delà de 100 tâches terminées.

## FWA-F007 / F008 — Cycle de vie et archives

- [x] Démarrage, remise à faire, complétion avec dates cohérentes.
- [x] Demande d’un début réel quand la tâche n’a jamais été démarrée.
- [x] Archivage à la complétion et restauration en nouveau cycle.
- [x] Tests de chronologie, prévu/réel et changements d’heure.
- [ ] Recette humaine des corrections rétroactives dans les deux interfaces.

## FWA-F009 / F010 / F011 — Focus et Pomodoro

- [x] Une session active ; concentration, pauses courte/longue, pause/reprise/interruption.
- [x] Calcul du temps à partir des horodatages du serveur.
- [x] Tous les réglages du minuteur regroupés dans Focus → Configurer.
- [x] Réglages retirés des paramètres généraux.
- [x] Bornes des durées et objectif quotidien ; comportement d’une permission refusée.
- [x] E2E de persistance et de non-réinitialisation par les paramètres généraux.
- [x] Formulaire React : saisie en cours conservée lors des actualisations de préférences.
- [x] Scénarios pause/recharge/reprise/interruption vérifiés pour les deux variantes.
- [ ] Son et notifications sur navigateurs réels avec suspension de l’onglet.
- [ ] Nouvelle série de captures du panneau ouvert en clair/sombre et sur mobile.

## FWA-F012 à F015 — Calendrier, projets, dashboard, statistiques

- [x] Calendrier mois/semaine/jour ; tâches non planifiées et déplacement de date.
- [x] Projets, progression et aperçu des tâches ouvrant le détail.
- [x] Indicateurs, Top 3 et aperçus issus des données réelles.
- [x] Statistiques prévues/réelles/actives et regroupements par fuseau.
- [ ] Revalider les dates fixes des scénarios de calendrier avant une recette future.
- [ ] Mesurer une base volumineuse et des historiques longs ; ne pas extrapoler la recette à 120 tâches.

## FWA-F016 / F017 / F018 — Préférences, recherche, transferts

- [x] Préférences générales séparées du Pomodoro.
- [x] Recherche globale avec DTO et service dédiés.
- [x] Palette clavier et raccourcis documentés avec leurs différences.
- [x] Export CSV/JSON, sauvegarde versionnée et aperçu d’import.
- [x] Doublons et échappement CSV testés.
- [ ] Exécuter une restauration complète sur base vierge et comparer les volumes.
- [ ] Décider d’un format versionné incluant les préférences utilisateur.

## FWA-T001 — Backend

- [x] Organisation par domaine et responsabilité.
- [x] Entités dans `entity`, DTO dédiés, mappers et repositories séparés.
- [x] Exceptions regroupées ; statuts et codes HTTP conservés sur les cas testés.
- [x] Contrôleurs sans corps `Map` et sans repository directement injecté.
- [x] 70 tests existants et 8 tests de contrat/architecture réussis.
- [x] JAR généré ; sorties `target/` retirées du suivi Git.
- [ ] Vérifier les avertissements de dépréciation lors de la prochaine mise à niveau de dépendances.

## FWA-T002 / FWA-T003 — Frontends

- [x] Dossiers `frontend-angular` et `frontend-react` ; pages et composants dans leurs sous-dossiers.
- [x] Templates HTML Angular externalisés et vues JSX React séparées de la logique des pages.
- [x] Feuilles CSS dédiées et tokens partagés.
- [x] Builds, typage et lints vérifiés pendant les lots correspondants.
- [x] Tests unitaires disponibles : 22 Angular, 12 React.
- [ ] Retirer les utilitaires Tailwind de tous les templates Angular si cette cible est confirmée pour la suite.
- [ ] Décomposer davantage la coordination de l’état applicatif React quand son évolution le justifie.

## FWA-T004 / FWA-N001 à N008 — Exploitation et qualité

- [x] API locale, PostgreSQL persistant en profil local et Flyway.
- [x] Scripts PowerShell/Bash distincts par frontend.
- [x] Procédure pour lancer les deux interfaces avec un seul backend.
- [x] Documentation des sauvegardes et du diagnostic.
- [x] Contexte de build Docker incluant `shared/` et excluant les données locales.
- [ ] Construction Docker puis démarrage réellement vérifiés.
- [ ] Accessibilité humaine : clavier complet, lecteur d’écran, zoom et toucher.
- [ ] Aucune ouverture Internet sans travail d’authentification et d’exposition réseau dédié.

## FWA-T005 — Documentation

- [x] Cahier des charges et identifiants d’exigences.
- [x] Avancement fonctionnel et technique backend/Angular/React.
- [x] Guide utilisateur et exploitation.
- [x] Design détaillé, écarts réels et règles de contribution.
- [x] Index et liens vers les preuves disponibles.
- [ ] Actualiser cette checklist à chaque livraison et enregistrer les résultats d’une prochaine recette complète.
