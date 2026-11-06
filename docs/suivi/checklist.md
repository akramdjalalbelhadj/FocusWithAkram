# FocusWithAkram — checklist

Relevé du **5 novembre 2026** (après le lot 9 ; lot 13 « Mes achats simplifié » et lots 14 et 15 « tutoriels de Notes & idées et de la matrice » validés le 6 novembre 2026). Les cases cochées indiquent une réalisation ou une validation consignée ; elles ne signifient pas que toute la recette a été relancée pendant cette révision documentaire. Une case ouverte reste un travail de validation ou d’évolution.

**Priorité** : version stable de FocusWithAkram web avec **Angular** d’abord. Les cases marquées *(après la version stable)* concernent React ou le mobile, déprioritisés (décision du 5 novembre 2026, [refonte v2](refonte-v2.md)).

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

## FWA-F004 / F005 / F006, F031 — Priorisation

- [x] Quadrants dérivés d’important/urgent ; ordre manuel persistant.
- [x] Déplacement clavier dans la matrice et onglets des quadrants en mobile.
- [x] Listes Priorités, Aujourd’hui, Semaine, Toutes, En retard, Terminées.
- [x] Top 3 quotidien et progression.
- [ ] Vérifier toutes les combinaisons de filtres et le parcours au-delà de 100 tâches terminées.

Lot 15 — tutoriel de la matrice (FWA-F031), validé le 6 novembre 2026 (183 tests backend, 122 tests Angular, scénario E2E `matrix.spec.ts`) :

- [x] Ouverture seule à la première visite de `/matrix` tant que `matrixTutorialDone` est faux ; quitter la page l’interrompt sans l’enregistrer.
- [x] Grille 2 × 2 : quatre cases et leurs libellés (Q1 Faire maintenant, Q2 Planifier, Q3 Déléguer / limiter, Q4 Éliminer / plus tard), positions comme sur la page, quatre couleurs des quadrants, axes Urgent / Pas urgent et Important / Pas important ; Q2 mise en avant à l’étape « Planifier ».
- [x] Suivant / Précédent / Passer (Échap passe aussi) ; étape des onglets sautée sur ordinateur, présente à 390 px ; étape de la carte sautée sans tâche.
- [x] Terminé ou passé : `matrixTutorialDone` enregistré côté serveur (vérifié par l’API), indépendamment de `notesTutorialDone` ; non réaffiché après rechargement ; focus rendu au bouton « Comment ça marche ? » ; test backend `MatrixAndPrioritiesIT`.
- [x] Relance par « Comment ça marche ? » et parcours complet jusqu’à « Terminer ».
- [x] 390 px : grille toujours en 2 × 2, aucun débordement horizontal ; audits axe sans violation sur ordinateur et à 390 px.
- [x] `smoke.spec.ts` marque les tutoriels comme vus (`PATCH /settings`) pour qu’ils ne couvrent pas les écrans contrôlés.
- [ ] Tutoriel de la matrice essayé avec un vrai lecteur d’écran et au toucher.

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
- [x] Base volumineuse mesurée (5 novembre 2026) : 4 010 tâches, 10 006 opérations sur 24 mois, 1 000 idées ; chaque page en 0,7 à 1,4 s, sans erreur ni débordement.

## FWA-F016 / F017 / F018 — Préférences, recherche, transferts

- [x] Préférences générales séparées du Pomodoro.
- [x] Recherche globale avec DTO et service dédiés.
- [x] Palette clavier et raccourcis documentés avec leurs différences.
- [x] Export CSV/JSON, sauvegarde versionnée et aperçu d’import.
- [x] Doublons et échappement CSV testés.
- [ ] Exécuter une restauration complète sur base vierge et comparer les volumes.
- [x] Format versionné incluant les préférences utilisateur : sauvegarde v2 et suivantes (réglages, Top 3), v4 validée au lot 11.
- [x] Sauvegarde v5 (lot 13) : aller-retour complet, import des versions antérieures avec conversion de la partie « Mes achats ».

## FWA-F019 à F023, F028, F029 — Mes achats (Angular)

Validé avant le lot 13 et toujours vrai :

- [x] Solde de départ daté et correction du solde tracée (opération visible dans l’historique).
- [x] Opérations : dépenses, revenus, remboursements d’achat ; prévue / réalisée / annulée ; saisie au format français ; doublon probable confirmé explicitement.
- [x] Échéancier (salaire, abonnements, charges, paiement en plusieurs fois) ; échéances jamais payées d’office.
- [x] Plafond variable signalé, jamais bloquant ; objectif d’épargne du mois ou par défaut.
- [x] Projets d’achat : verdict de faisabilité avant enregistrement, matrice, achat réel, report, simulations « Et si… ? ».
- [x] Alertes, calendrier financier, statistiques sur 3 à 24 mois.
- [ ] Matrice d’achats au glisser-déposer vérifiée par l’automatisation (le déplacement est testé par l’API et par le menu clavier).

Lot 13 — validé le 6 novembre 2026 (181 tests backend, 104 tests Angular, scénario E2E `finance.spec.ts`) :

- [x] Compte unique : premier accès par le total disponible (banque, épargne, espèces) ; second compte refusé ; renommer et corriger le solde dans ⚙ Réglages.
- [x] Migration V8 essayée sur une base au schéma V7 remplie de deux comptes, d’un virement et d’un prêt (`SingleAccountMigrationIT`) : solde total inchangé, corrections « Solde de départ — <nom> », virements supprimés, mouvements de prêt convertis dans la catégorie « Prêts », table des prêts supprimée.
- [x] Import d’une sauvegarde v3 ou v4 à plusieurs comptes et prêts : fusion dans le compte unique et conversion des prêts ; réimport sans doublon.
- [x] Revenu prévu pour un mois ou une période (ex. 2 290 € le 28, de novembre 2026 à février 2027) ; réel plus bas confirmé, prévu et écart affichés ; réel corrigé ou annulé.
- [x] Dépense fixe déjà remplie chaque mois et confirmée « payé » ; nouveau montant à partir d’un mois sans changer les mois précédents ; montant « ce mois seulement ».
- [x] Dépenses variables plafonnées : dépensé, reste, total du mois saisi (refus pour un mois futur ou un total trop bas), commentaire demandé en cas de dépassement, alerte `ENVELOPE_OVER`.
- [x] Feuille du mois : totaux prévus et réels, autres dépenses, épargne prévue et réelle conformes au calcul de la [feuille du mois](../produit/mes-achats/feuille-du-mois.md) § 3.
- [x] Plafond variable du mois égal à la somme des plafonds des dépenses variables plafonnées (budget, prévision, alertes).
- [x] Revenu avec catégorie facultative ; prêts saisis dans la catégorie « Prêts » ; onglet Prêts, régularisation et alertes de prêt absents.
- [x] Plus de financement par l’épargne ni de plancher d’épargne dans les projets d’achat et les préférences.
- [x] Analyses : épargne du mois, objectif atteint ou manqué, plafond variable tenu ou dépassé, mois par mois.
- [x] Navigation : Mon mois (par défaut), Opérations (vue « Revenus et charges récurrents »), Projets d’achat, Analyses (statistiques, calendrier), ⚙ Réglages ; anciennes adresses `overview`, `budget`, `loans`, `schedules`, `statistics`, `calendar` redirigées.
- [x] Visite guidée : ouverte à la première visite, Suivant / Précédent / Passer, non réaffichée une fois terminée ou passée, relançable par le bouton ? ; bulles d’aide ouvertes et fermées au clavier (Échap), audit axe sans violation.
- [ ] Visite guidée et bulles d’aide essayées avec un vrai lecteur d’écran et au toucher.
- [x] Scénario E2E `finance.spec.ts` adapté au lot 13 (le scénario du lot 9 couvrait comptes multiples et prêts) : parcours complet, coupure réseau, dialogues accessibles, 390 px sans débordement.
- [x] Tests backend et Angular, lint et build sans échec ; 390 px sans défilement horizontal sur les 8 vues de Mes achats (E2E) ; thème sombre vérifié sur la page Mon mois avec des données simulées.
- [x] Données personnelles (1 compte, sans prêt) importées telles quelles dans une base jetable à la nouvelle version : solde identique, aucune erreur ; sauvegarde JSON prise avant la mise à jour.

## FWA-F024 à F027, F030 — Notes & idées (Angular)

- [x] Page `/notes`, entrée de menu, G puis N ; saisie rapide par Entrée, touche I et palette.
- [x] Créer, consulter, modifier (enregistrement automatique), supprimer ; données conservées après rechargement.
- [x] Recherche titre/contenu, filtres catégorie, étiquette, favoris, avec/sans tâches ; tris.
- [x] Catégories dans un écran dédié ; nom unique sans casse ; suppression qui conserve les idées.
- [x] Éditeur Markdown (barre d’outils, Ctrl+B/I/Z, aperçu, cases cochables) et visuel ; même contenu ; préférence dans Paramètres.
- [x] Transformation en une ou plusieurs tâches avec le formulaire existant ; quadrant et échéance ; tâches visibles dans la matrice.
- [x] Lien idée ↔ tâche : panneau de l’idée, lien depuis le détail de la tâche, repère dans Mes tâches ; lien conservé à la restauration et à la duplication.
- [x] Doublon confirmé explicitement ; idée jamais modifiée par la création d’une tâche.
- [x] Suppression bloquée avec avertissement explicatif ; suppression forcée qui conserve les tâches.
- [x] Sauvegarde v4 (idées, catégories, lien, mode d’éditeur) ; v3 importable.
- [x] Recette navigateur sur base jetable : clair, sombre, 390 px sans défilement horizontal ; scénario E2E `notes.spec.ts` (lot 9).
- [ ] Recette humaine au lecteur d’écran et au toucher de l’éditeur visuel.
- [ ] Interface React et import du format v4 dans Krimou *(après la version stable)*.

Lot 14 — tutoriel (FWA-F030), validé le 6 novembre 2026 (182 tests backend, 115 tests Angular, scénario E2E `notes.spec.ts` « tutoriel ») :

- [x] Ouverture seule à la première visite de `/notes` tant que `notesTutorialDone` est faux ; quitter la page pendant le tutoriel l’interrompt sans l’enregistrer.
- [x] Schéma en trois étapes colorées (Nouvelle idée, Brainstorming, Transformation en tâches) : liste ordonnée nommée, textes des trois étapes, trois couleurs différentes de gauche à droite ; étape 3 mise en avant à l’étape « 3. Transformation en tâches ».
- [x] Suivant / Précédent / Passer (Échap passe aussi) ; une étape dont la cible est absente est sautée.
- [x] Terminé ou passé : `notesTutorialDone` enregistré côté serveur (vérifié par l’API), tutoriel non réaffiché après rechargement, focus rendu au bouton « Comment ça marche ? » ; test backend `NoteIT.theTutorialIsOfferedUntilItIsFinishedOrSkipped`.
- [x] Relance par « Comment ça marche ? » et parcours complet jusqu’à « Terminer ».
- [x] 390 px : étapes du schéma de haut en bas, aucun débordement horizontal ; audits axe sans violation sur ordinateur et à 390 px.
- [x] Visite guidée de Mes achats passée au composant partagé `ff-tour` sans changement de comportement (`finance.spec.ts` toujours vert).
- [ ] Tutoriel et schéma essayés avec un vrai lecteur d’écran et au toucher.

## FWA-T001 — Backend

- [x] Organisation par domaine et responsabilité.
- [x] Entités dans `entity`, DTO dédiés, mappers et repositories séparés.
- [x] Exceptions regroupées ; statuts et codes HTTP conservés sur les cas testés.
- [x] Contrôleurs sans corps `Map` et sans repository directement injecté.
- [x] 183 tests sans échec sur PostgreSQL 18.6 (unitaires, intégration, contrat, architecture, migrations), relevé du 6 novembre 2026 (lot 15).
- [x] JAR généré ; sorties `target/` retirées du suivi Git.
- [ ] Vérifier les avertissements de dépréciation lors de la prochaine mise à niveau de dépendances (par exemple la configuration de test que Spring Framework 7.1 ne tolérera plus).

## FWA-T002 / FWA-T003 — Frontends

- [x] Dossiers `frontend-angular` et `frontend-react` ; pages et composants dans leurs sous-dossiers.
- [x] Templates HTML Angular externalisés et vues JSX React séparées de la logique des pages.
- [x] Feuilles CSS dédiées et tokens partagés.
- [x] Builds, typage et lints vérifiés pendant les lots correspondants.
- [x] Tests unitaires disponibles : 122 Angular (6 novembre 2026, lot 15), 12 React.
- [ ] Retirer les utilitaires Tailwind de tous les templates Angular si cette cible est confirmée pour la suite.
- [ ] Décomposer davantage la coordination de l’état applicatif React quand son évolution le justifie *(après la version stable)*.

## FWA-T004 / FWA-N001 à N008 — Exploitation et qualité

- [x] API locale, PostgreSQL persistant en profil local et Flyway.
- [x] Scripts PowerShell/Bash distincts par frontend.
- [x] Procédure pour lancer les deux interfaces avec un seul backend.
- [x] Documentation des sauvegardes et du diagnostic.
- [x] Contexte de build Docker incluant `shared/` et excluant les données locales.
- [x] Relance sans échec : un lancement précédent (backend, frontend, PostgreSQL embarqué) est arrêté proprement ; recette PowerShell et Git Bash.
- [x] Une autre application qui occupe un port n’est jamais arrêtée : port libre suivant, CORS adapté ; PostgreSQL embarqué sur 15432, hors de la plage réservée par Windows.
- [x] PostgreSQL 18 embarqué (tests compris) et dans Docker ; version vérifiée par test.
- [x] Migration de la base locale 14 → 18 (`scripts/migrate_postgres.ps1`) essayée sur une copie : lignes, empreintes et séquences identiques, backend démarré dessus.
- [x] Base personnelle migrée vers PostgreSQL 18 (5 novembre 2026), ancienne base conservée. Migration hors Windows : hors périmètre.
- [x] Construction Docker puis démarrage réellement vérifiés (WSL, 5 novembre 2026) : services sains, PostgreSQL 18.6, écritures depuis `localhost` et `127.0.0.1`, en-têtes de sécurité, données conservées après redémarrage.
- [x] Import volumineux : 7 500 éléments en 6 s, réimport sans doublon ; temps linéaire (identifiants lus par lots).
- [x] Dialogues accessibles : un seul dialogue nommé et modal par ouverture (rôle `alertdialog` des confirmations), aucun identifiant en double.
- [ ] Accessibilité humaine : clavier complet, lecteur d’écran, zoom et toucher.
- [ ] Aucune ouverture Internet sans travail d’authentification et d’exposition réseau dédié.

## FWA-T005 — Documentation

- [x] Cahier des charges et identifiants d’exigences.
- [x] Avancement fonctionnel et technique backend/Angular/React.
- [x] Guide utilisateur et exploitation.
- [x] Design détaillé, écarts réels et règles de contribution.
- [x] Index et liens vers les preuves disponibles.
- [x] Recette complète de la version web Angular enregistrée (lot 9, 5 novembre 2026) : [refonte v2](refonte-v2.md).
- [ ] Actualiser cette checklist à chaque livraison.
