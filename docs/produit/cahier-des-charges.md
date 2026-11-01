# FocusWithAkram — cahier des charges

Version documentaire du **1 novembre 2026**. État de livraison : [avancement fonctionnel](../suivi/avancement-fonctionnel.md). Critères de recette : [checklist](../suivi/checklist.md). Référence visuelle : [design](../technique/design.md).

## 1. Contexte et vision

FocusWithAkram est une application web de productivité personnelle. Elle relie la priorisation d’Eisenhower, les tâches et le travail chronométré par Pomodoro. L’utilisateur doit pouvoir décider quoi faire, commencer une session, conserver un historique fiable et comparer son planning au travail réalisé.

Le produit est actuellement **mono-utilisateur et local**. Angular et React sont deux interfaces du même produit ; elles utilisent la même API Spring Boot et les mêmes données PostgreSQL. Elles ne sont pas deux espaces personnels indépendants.

## 2. Objectifs et utilisateurs

- Organiser les tâches par importance et urgence, sans stocker deux représentations contradictoires du quadrant.
- Réduire les changements de contexte : démarrer le travail depuis une tâche et configurer le minuteur dans Focus.
- Distinguer le temps planifié, le temps réel écoulé et le temps actif mesuré.
- Préserver l’historique lors d’une restauration de tâche.
- Rendre les données exportables et restaurables.
- Proposer une expérience cohérente sur ordinateur et mobile, en clair et en sombre.

La cible est une personne gérant ses propres activités : études, projets personnels ou travail individuel. Le suivi d’équipe, l’affectation et la facturation ne font pas partie du périmètre livré.

## 3. Exigences fonctionnelles

| ID       | Exigence                            | Critère d’acceptation principal                                                                                                |
| -------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| FWA-F001 | Navigation entre les neuf pages     | Chaque destination possède une URL et un titre ; le retour navigateur fonctionne.                                              |
| FWA-F002 | Création et modification des tâches | Titre obligatoire ; projet, estimation, notes, dates et étiquettes sont enregistrés sans perte des champs non modifiés.        |
| FWA-F003 | Sous-tâches et étiquettes           | Ajouter et cocher des sous-tâches ; filtrer les tâches par étiquette ; respecter les limites du contrat.                       |
| FWA-F004 | Matrice d’Eisenhower                | Quatre quadrants ; déplacement persistant ; alternative clavier au glisser-déposer.                                            |
| FWA-F005 | Listes et priorités                 | Vues Priorités, Aujourd’hui, Semaine, Toutes, En retard et Terminées ; filtres et recherche.                                   |
| FWA-F006 | Objectifs Top 3                     | Choix d’au plus trois tâches pour le jour ; indicateur de progression cohérent.                                                |
| FWA-F007 | Cycle de vie et dates               | Démarrer, remettre à faire, terminer, archiver et restaurer avec contrôles de cohérence temporelle.                            |
| FWA-F008 | Archives et cycles                  | Consulter les tâches terminées par date réelle de fin ; restaurer sans supprimer les anciens cycles.                           |
| FWA-F009 | Minuteur Pomodoro                   | Concentration, pause courte et pause longue ; pause, reprise, interruption et fin ; une seule session active.                  |
| FWA-F010 | Configuration dans Focus            | Toutes les options du minuteur sont dans **Focus / Pomodoro → Configurer**, sans être dupliquées dans les paramètres généraux. |
| FWA-F011 | Historique des sessions             | Afficher les heures, le temps travaillé, la tâche associée et le résultat des sessions.                                        |
| FWA-F012 | Calendrier                          | Vues mois, semaine et jour ; tâches datées et non planifiées ; changement de date persistant.                                  |
| FWA-F013 | Projets                             | Créer, modifier, archiver et supprimer un projet ; afficher sa progression et accéder à ses tâches.                            |
| FWA-F014 | Tableau de bord                     | Indicateurs du jour, Top 3, aperçu de matrice, Pomodoro et activité issus de l’API.                                            |
| FWA-F015 | Statistiques                        | Mesures des tâches et sessions, répartitions et comparaison prévu/réalisé par période et fuseau.                               |
| FWA-F016 | Paramètres généraux                 | Thème, fuseau, semaine, raccourcis et préférences de tâches ; conserver les réglages Pomodoro lors d’un enregistrement.        |
| FWA-F017 | Recherche et commandes              | Rechercher tâches et projets ; ouvrir le détail ; accès clavier à la palette.                                                  |
| FWA-F018 | Export et restauration              | Export CSV/JSON et sauvegarde complète ; aperçu d’import avant confirmation ; rapport des doublons et erreurs.                 |

## 4. Règles métier

### 4.1 Quadrants et priorités

| Quadrant | Important | Urgent | Intention            |
| -------- | --------- | ------ | -------------------- |
| Q1       | Oui       | Oui    | Faire maintenant     |
| Q2       | Oui       | Non    | Planifier            |
| Q3       | Non       | Oui    | Déléguer / limiter   |
| Q4       | Non       | Non    | Éliminer / plus tard |

Le quadrant est calculé à partir de `important` et `urgent`. Le classement Priorités considère le quadrant, le retard, l’échéance, le statut en cours, l’ordre manuel puis la création. Les vues Aujourd’hui et Semaine utilisent le fuseau et le début de semaine configurés. La vue Terminées est actuellement limitée aux 100 résultats récents côté priorités ; les archives restent le parcours de consultation dédié.

### 4.2 Tâches, dates et historique

- Statuts : `TODO`, `IN_PROGRESS`, `DONE`. L’archivage est matérialisé par `archivedAt`, pas par un quatrième statut.
- Dates distinctes : création, modification, début/fin prévus, début/fin réels et archivage. Ne pas remplacer une valeur inconnue par une date inventée.
- Une tâche en cours exige un début réel. La remise à faire conserve ce début.
- Une tâche terminée exige début réel, fin réelle et archivage. Si elle n’a jamais été démarrée, demander le début réel avant de la terminer.
- La fin ne précède pas le début. Les dates réelles futures sont refusées au-delà de la tolérance d’horloge prévue par le domaine.
- La restauration crée un nouveau cycle et remet à zéro les dates réelles du cycle courant ; les cycles précédents restent consultables.
- Le temps actif provient des sessions de travail ; la durée réelle écoulée n’est pas nécessairement du travail actif.

### 4.3 Pomodoro

Une session peut être en cours, en pause, terminée ou annulée. L’API arbitre l’unicité de la session active et son temps. Le navigateur affiche le reste à partir d’horodatages corrigés avec `serverTime` ; il ne doit pas compter naïvement un nombre de ticks.

| Réglage                     | Valeur initiale | Bornes    |
| --------------------------- | --------------- | --------- |
| Travail                     | 25 min          | 1–180 min |
| Pause courte                | 5 min           | 1–60 min  |
| Pause longue                | 15 min          | 1–120 min |
| Sessions avant pause longue | 4               | 1–12      |
| Objectif quotidien          | 120 min         | 0–720 min |

Les démarrages automatiques, le son et les notifications sont facultatifs. Les notifications nécessitent l’autorisation du navigateur. Les nouvelles durées s’appliquent aux prochaines sessions ; une session lancée conserve sa durée. Une interruption conserve le temps déjà travaillé sans devenir une session terminée.

### 4.4 Projets et données

Un projet actif porte un nom non vide de 120 caractères maximum, unique parmi les projets actifs. Supprimer un projet conserve ses tâches et supprime leur rattachement. Une sauvegarde complète contient les projets, tâches, sous-tâches, cycles d’exécution et sessions ; elle n’inclut pas les préférences utilisateur dans son format actuel. Le rapport d’import distingue créations, réutilisations, doublons et erreurs.

## 5. Exigences non fonctionnelles

| ID       | Exigence                       | Situation et contrôle                                                                                                                    |
| -------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| FWA-N001 | Données cohérentes et durables | Transactions, contraintes PostgreSQL et migrations Flyway ; tests d’intégration.                                                         |
| FWA-N002 | Identité visuelle partagée     | Tokens communs ; variantes Angular/React documentées ; aucune obligation de pixel-identité non vérifiée.                                 |
| FWA-N003 | Accessibilité                  | Noms accessibles, clavier, focus, états textuels, contrastes et animations réduites ; audits automatiques complétés par recette humaine. |
| FWA-N004 | Responsive                     | Neuf routes utilisables à 390 px et sur desktop ; contrôles tactiles et zones fixes à vérifier sur appareil réel.                        |
| FWA-N005 | Erreurs compréhensibles        | `ProblemDetail` avec code stable ; reprise proposée quand possible ; pas de détail interne exposé.                                       |
| FWA-N006 | Confidentialité locale         | Écoute sur boucle locale par défaut ; absence d’authentification clairement annoncée.                                                    |
| FWA-N007 | Maintenabilité                 | DTO, entités, exceptions et services séparés ; pages/composants dans leurs dossiers ; tests de contrat et d’architecture.                |
| FWA-N008 | Observabilité et exploitation  | Healthcheck, journaux, procédure de sauvegarde et de restauration documentées.                                                           |

Les mesures de volume disponibles utilisent 120 tâches supplémentaires de recette. Elles ne constituent pas un objectif de performance garanti à plusieurs milliers de tâches ni un engagement de temps de réponse.

### Exigences de réalisation technique

| ID       | Exigence                                                       | Vérification                                                                |
| -------- | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| FWA-T001 | Backend organisé par domaine, DTO/entités/exceptions séparés   | Compilation, tests métier, contrat et architecture                          |
| FWA-T002 | Angular structuré par pages et composants, ressources externes | Build avec contrôle des templates, lint et recette navigateur               |
| FWA-T003 | React structuré par pages, vues, hooks et composants           | Typage, build, lint et recette navigateur                                   |
| FWA-T004 | Installation, configuration et sauvegarde reproductibles       | Procédures d’exploitation ; Docker et restauration réelle encore à vérifier |
| FWA-T005 | Documentation maintenue avec la livraison                      | Sept documents, index, liens et preuves datées                              |

## 6. Parcours nominaux et alternatifs

| Parcours               | Nominal                                                    | Alternative / erreur                                                                                         |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Préparer la journée    | Créer → classer → choisir le Top 3                         | Matrice vide : créer une tâche ; date invalide : corriger sans perdre la saisie.                             |
| Travailler             | Ouvrir une tâche → lancer Focus → pause/reprise → terminer | Session déjà active : reprendre ou interrompre celle-ci ; réseau coupé : état d’erreur et resynchronisation. |
| Clore une tâche        | Terminer avec dates cohérentes → consulter l’archive       | Début réel absent : le demander ; conflit de version : recharger et recommencer.                             |
| Reprendre une activité | Restaurer → nouveau cycle → nouveau travail                | Historique ancien conservé et distinct du cycle courant.                                                     |
| Régler le minuteur     | Focus → Configurer → modifier → vérifier l’enregistrement  | Permission refusée : notifications désactivées ; durée hors bornes : correction requise.                     |
| Restaurer un fichier   | Sélectionner JSON → aperçu → confirmer                     | JSON invalide : message ; doublons : rapport ; ne pas annoncer une restauration intégrale des réglages.      |

## 7. Contraintes et hors périmètre

Pas de comptes multiples, authentification, collaboration, délégation à une autre personne, tâches récurrentes, synchronisation cloud ou fonctionnement complet hors ligne. Aucun déploiement Internet sécurisé n’est livré. Le son et les notifications ne sont pas garantis lorsque le navigateur est fermé ou fortement suspendu.

Docker est fourni pour une composition locale Angular + API + PostgreSQL ; React n’a pas de service Docker dédié. La construction Docker et sa restauration sur un poste vierge restent à valider, notamment l’inclusion du dossier partagé dans le contexte de build.

## 8. Livraison et critères de clôture

| Lot   | Contenu                                                           | État au relevé                                    |
| ----- | ----------------------------------------------------------------- | ------------------------------------------------- |
| A     | Métier tâches, matrice, Pomodoro, dates, archives                 | Implémenté ; tests backend disponibles            |
| B     | Deux frontends connectés et refonte visuelle                      | Implémenté ; différences visibles documentées     |
| C     | Organisation des pages/composants et du backend                   | Implémenté ; contrôles d’architecture disponibles |
| D     | Réglages Pomodoro regroupés dans Focus                            | Implémenté ; E2E ciblés disponibles               |
| E     | Dossier documentaire et exploitation                              | Présente révision                                 |
| Suite | Harmonisation CSS, recette humaine, Docker et restauration réelle | À planifier / à vérifier                          |

Une exigence est clôturée après contrôle du code, résultat de test ou recette identifié, mise à jour documentaire et absence de blocage critique sur son parcours. Un état « partiel » reste visible dans la checklist.
