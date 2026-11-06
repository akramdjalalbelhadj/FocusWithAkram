# FocusWithAkram — cahier des charges

Version documentaire du **6 novembre 2026** (« Mes achats » simplifié, lot 13, et tutoriels de Notes & idées et de la matrice, lots 14 et 15, validés le 6 novembre 2026). État de livraison : [avancement fonctionnel](../suivi/avancement-fonctionnel.md). Critères de recette : [checklist](../suivi/checklist.md). Référence visuelle : [design](../technique/design.md).

## 1. Contexte et vision

FocusWithAkram est une application web de productivité personnelle. Elle relie la priorisation d’Eisenhower, les tâches et le travail chronométré par Pomodoro. L’utilisateur doit pouvoir décider quoi faire, commencer une session, conserver un historique fiable et comparer son planning au travail réalisé. En amont des tâches, l’espace **Notes & Brainstorming** recueille les idées : **idée → réflexion → tâches réalisables** dans la matrice.

Le produit est actuellement **mono-utilisateur et local**. Angular et React sont deux interfaces du même produit ; elles utilisent la même API Spring Boot et les mêmes données PostgreSQL. Elles ne sont pas deux espaces personnels indépendants.

## 2. Objectifs et utilisateurs

- Organiser les tâches par importance et urgence, sans stocker deux représentations contradictoires du quadrant.
- Ne perdre aucune idée : la noter en quelques secondes, la développer plus tard, puis la transformer en une ou plusieurs tâches au moment choisi.
- Réduire les changements de contexte : démarrer le travail depuis une tâche et configurer le minuteur dans Focus.
- Distinguer le temps planifié, le temps réel écoulé et le temps actif mesuré.
- Préserver l’historique lors d’une restauration de tâche.
- Rendre les données exportables et restaurables.
- Proposer une expérience cohérente sur ordinateur et mobile, en clair et en sombre.

La cible est une personne gérant ses propres activités : études, projets personnels ou travail individuel. Le suivi d’équipe, l’affectation et la facturation ne font pas partie du périmètre livré.

## 3. Exigences fonctionnelles

| ID       | Exigence                            | Critère d’acceptation principal                                                                                                |
| -------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| FWA-F001 | Navigation entre les pages          | Chaque destination possède une URL et un titre ; le retour navigateur fonctionne. Angular : onze destinations (dont « Mes achats » et « Notes & idées ») ; React : neuf. |
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
| FWA-F019 | Mes achats — socle financier        | **Compte unique** pour tout l’argent (banque, épargne, espèces) : solde de départ saisi au premier accès, renommage et corrections tracées, second compte refusé ; comptes existants fusionnés à la mise à jour et à l’import sans changer le solde total ; opérations réalisées/prévues/annulées ; catégories sur deux niveaux, facultatives pour un revenu ; historique filtré ; bilan du mois. Règles : [spécification](mes-achats/specification.md). |
| FWA-F020 | Mes achats — budget et récurrences  | Revenus prévus pour un mois ou une période, abonnements et dépenses fixes ; montants qui changent à partir d’un mois ou pour ce mois seulement ; plafond variable (somme des dépenses variables plafonnées quand il y en a) ; épargne du mois (revenus reçus − dépenses payées) face à un objectif (spécification § 4.4 à § 5). |
| FWA-F021 | Mes achats — projets d’achat        | Objectifs d’achat (onglet « Projets d’achat »), matrice dédiée, prévision de trésorerie et faisabilité, sans financement par l’épargne (spécification § 6 à § 8). |
| FWA-F022 | Mes achats — prêts (remplacée)      | **Remplacée le 5 novembre 2026** (lot 13) : plus de suivi des prêts. Un prêt accordé ou un remboursement versé est une dépense de la catégorie « Prêts », un emprunt ou un remboursement reçu un revenu de cette catégorie ; couvert par FWA-F019 (spécification § 4.9). |
| FWA-F023 | Mes achats — analyses et alertes    | Onglet « Analyses » : statistiques sur 3 à 24 mois avec, mois par mois, l’épargne, l’objectif atteint ou manqué et le plafond variable tenu ou dépassé ; calendrier ; alertes (dont dépense variable au-delà de son plafond, sans alerte de prêt) ; simulations (spécification § 10 et § 12). |
| FWA-F024 | Notes & idées — espace d’idées      | Page dédiée : saisie rapide (titre seul), consultation, modification enregistrée automatiquement, suppression confirmée, recherche titre/contenu, filtres (catégorie, étiquette, favoris, avec/sans tâche) et tris ; données conservées après rechargement. Règles : § 4.5. |
| FWA-F025 | Notes & idées — catégories          | Écran dédié : créer, renommer, colorer et supprimer une catégorie (nom unique) ; la suppression conserve les notes, sans catégorie. |
| FWA-F026 | Notes & idées — éditeur             | Deux modes au choix, **Markdown avec aperçu** et **éditeur visuel**, sur le même contenu : titres, paragraphes, listes, cases à cocher. Mode par défaut dans les Paramètres, bascule depuis l’éditeur. |
| FWA-F027 | Idée → tâches                       | Depuis une note, créer une ou plusieurs tâches avec le formulaire de tâche existant (titre, description, quadrant, échéance…) ; chaque tâche rejoint son quadrant et garde le lien vers l’idée ; doublon signalé avant création ; note conservée. |
| FWA-F028 | Mes achats — feuille du mois        | Onglet « Mon mois » par défaut : revenus, dépenses fixes, dépenses variables plafonnées et autres dépenses du mois choisi, avec prévu, réel et écart. Revenus saisis une fois pour un mois ou une période, réel confirmé (éventuellement plus bas) ; dépenses fixes déjà remplies chaque mois, confirmées « payé » ; montant modifiable à partir d’un mois sans toucher aux mois précédents, ou pour ce mois seulement ; dépenses variables plafonnées avec dépensé, reste, total du mois saisissable et commentaire demandé en cas de dépassement ; épargne prévue et réelle face à l’objectif du mois. Navigation en quatre onglets (Mon mois, Opérations, Projets d’achat, Analyses) et ⚙ Réglages ; anciennes adresses redirigées. Règles : [feuille du mois](mes-achats/feuille-du-mois.md). |
| FWA-F029 | Mes achats — aide intégrée          | Visite guidée ouverte à la première visite, avec Suivant, Précédent et Passer, non réaffichée une fois terminée ou passée (état enregistré côté serveur) et relançable par le bouton ? ; bulles d’aide à côté de chaque section et des notions (prévu, réel, plafond, épargne, « à partir de », « ce mois seulement »), utilisables au clavier et annoncées par les lecteurs d’écran. |
| FWA-F030 | Notes & idées — tutoriel            | Tutoriel ouvert à la première visite de la liste des idées : il explique le but du module par un schéma coloré en trois étapes (**Nouvelle idée** → **Brainstorming** → **Transformation en tâches**) puis montre où se fait chacune ; Suivant, Précédent et Passer (Échap) ; non réaffiché une fois terminé ou passé (état enregistré côté serveur) et relançable par le bouton « Comment ça marche ? » ; schéma lu comme une liste ordonnée par les lecteurs d’écran et affiché de haut en bas sur téléphone. Règles : § 4.5. |
| FWA-F031 | Matrice d’Eisenhower — tutoriel     | Tutoriel ouvert à la première visite de la matrice : il explique la méthode par une grille 2 × 2 aux couleurs des quadrants (axes Urgent / Pas urgent et Important / Pas important ; Q1 Faire maintenant, Q2 Planifier, Q3 Déléguer / limiter, Q4 Éliminer / plus tard) puis montre l’ajout, les cases, le déplacement d’une tâche, l’intérêt de Q2 et les filtres ; Suivant, Précédent et Passer (Échap) ; non réaffiché une fois terminé ou passé (état enregistré côté serveur, indépendant de celui des notes) et relançable par le bouton « Comment ça marche ? » ; grille lue comme une liste ordonnée par les lecteurs d’écran et gardée en 2 × 2 sur téléphone. Règles : § 4.1. |

## 4. Règles métier

### 4.1 Quadrants et priorités

| Quadrant | Important | Urgent | Intention            |
| -------- | --------- | ------ | -------------------- |
| Q1       | Oui       | Oui    | Faire maintenant     |
| Q2       | Oui       | Non    | Planifier            |
| Q3       | Non       | Oui    | Déléguer / limiter   |
| Q4       | Non       | Non    | Éliminer / plus tard |

Le quadrant est calculé à partir de `important` et `urgent`. Le classement Priorités considère le quadrant, le retard, l’échéance, le statut en cours, l’ordre manuel puis la création. Les vues Aujourd’hui et Semaine utilisent le fuseau et le début de semaine configurés. La vue Terminées est actuellement limitée aux 100 résultats récents côté priorités ; les archives restent le parcours de consultation dédié.

**Tutoriel** (FWA-F031, demande du propriétaire du 6 novembre 2026) : la matrice s’explique par elle-même, une grille 2 × 2 aux couleurs des quadrants où deux questions (urgent ? important ?) donnent la case, donc quoi faire. Le tutoriel insiste sur **Q2 Planifier** : les tâches importantes mais pas urgentes sont celles qui font avancer ; les planifier avant qu’elles deviennent urgentes vide Q1. Il s’ouvre seul à la visite de la matrice tant qu’il n’a été ni terminé ni passé ; une étape dont l’élément visé est absent est sautée (onglets sur grand écran, carte de tâche quand la matrice est vide) ; quitter la page ne l’enregistre pas. Cet état (`matrixTutorialDone`) est indépendant de celui de Notes & idées, enregistré côté serveur et **exclu de la sauvegarde**, comme les autres visites guidées.

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

### 4.5 Notes et idées

Décisions validées par le propriétaire le 3 novembre 2026.

- **Une idée n’a pas de statut.** Seules les tâches qui en sont issues ont un statut (`TODO`, `IN_PROGRESS`, `DONE`) ; la note affiche ces tâches et leur avancement (« 2 tâches · 1 terminée »), calculé à la lecture, jamais stocké.
- **Contenu d’une note** : titre obligatoire (200 caractères, une ligne), contenu facultatif en Markdown (100 000 caractères), une catégorie facultative, au plus 10 étiquettes de 40 caractères (doublons sans casse fusionnés), favori. Création et dernière modification sont horodatées par le serveur ; mettre en favori ne compte pas comme une modification. L’enregistrement est automatique ; un titre vide n’est pas enregistré.
- **Éditeur** : le contenu est toujours stocké en Markdown ; le mode Markdown (saisie avec barre d’outils et aperçu) et le mode visuel lisent et écrivent ce même texte. Une note écrite dans un mode s’ouvre dans l’autre. Le mode visuel peut normaliser l’écriture Markdown (par exemple `*` devient `-`) sans changer le contenu.
- **Catégories** : gérées dans un écran dédié ; nom obligatoire (60 caractères), unique sans tenir compte de la casse ; couleur. Supprimer une catégorie conserve ses notes, sans catégorie.
- **Transformation en tâche** : le formulaire de tâche existant est réutilisé, prérempli avec le titre et les étiquettes de l’idée ; la description peut reprendre le contenu de la note. La tâche suit les règles habituelles (quadrant dérivé de importance × urgence, Q2 par défaut, dates prévues cohérentes) et apparaît dans la matrice. La note n’est ni supprimée ni modifiée.
- **Plusieurs tâches par idée** ; une tâche provient d’au plus une idée. Le lien est conservé lorsque la tâche est terminée, archivée, restaurée ou dupliquée ; il disparaît si la tâche est supprimée.
- **Doublon** : créer, depuis la même idée, une tâche dont le titre (sans tenir compte de la casse) est déjà celui d’une tâche issue de cette idée demande une confirmation explicite. Un double envoi du formulaire ne crée pas deux tâches.
- **Suppression d’une idée** : refusée tant que des tâches en sont issues, avec un avertissement qui en donne la raison et le nombre de tâches. Une **suppression forcée** explicite reste possible : la note est supprimée, ses tâches sont **conservées** dans la matrice et perdent seulement le lien.
- **Sauvegarde** : catégories, notes, lien tâche → idée et mode d’éditeur font partie de la sauvegarde complète (depuis le format v4) ; les formats antérieurs restent importables.
- **Tutoriel** (FWA-F030, demande du propriétaire du 6 novembre 2026) : le module s’explique par un schéma en trois étapes — **Nouvelle idée** (capturer une pensée spontanée) → **Brainstorming** (développer, enrichir et organiser l’idée) → **Transformation en tâches** (créer une ou plusieurs actions réalisables). Le tutoriel s’ouvre seul à la visite de la liste des idées tant qu’il n’a été ni terminé ni passé ; une étape dont l’élément visé est absent est sautée ; quitter la page pendant le tutoriel ne l’enregistre pas. Cet état (`notesTutorialDone`) est une préférence d’interface enregistrée côté serveur et **exclue de la sauvegarde**, comme la visite guidée de Mes achats : après une restauration sur une nouvelle installation, le tutoriel est simplement proposé une fois de plus.

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
| Capturer une idée      | Notes & idées → saisir un titre → Entrée (ou raccourci I)  | Titre vide : refusé ; la note est développée plus tard dans l’éditeur.                                      |
| Concrétiser une idée   | Ouvrir la note → Créer une tâche → choisir quadrant et échéance → confirmer, autant de fois que nécessaire | Titre déjà utilisé pour cette idée : confirmation ; suppression d’une idée avec tâches : refus expliqué ou suppression forcée. |
| Suivre son mois        | Mes achats → Mon mois → confirmer revenus et dépenses fixes → ajouter les dépenses variables → lire l’épargne | Plafond dépassé : dépense acceptée, commentaire demandé ; total du mois plus bas que les dépenses déjà saisies, ou mois futur : refus expliqué. |
| Changer un montant     | Dépense fixe ou revenu → nouveau montant à partir d’un mois | Facture exceptionnelle : « ce mois seulement » ; les mois précédents et les échéances déjà enregistrées gardent leur montant. |

## 7. Contraintes et hors périmètre

Notes & idées : pas de pièces jointes, d’historique des versions d’une note, de partage ni de rattachement d’une note à un projet ; pas d’interface React tant que la phase v2 n’est pas reportée ; l’application Krimou n’importe pas encore le format v4.

Mes achats (depuis le lot 13) : un seul compte, sans compte d’épargne séparé ni virement ; pas de suivi des prêts (reste dû, échéance, régularisation) ; pas d’interface React ni de portage des nouvelles règles dans Krimou avant la version stable Angular.

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
| F     | Notes & Brainstorming (API et Angular)                            | Implémenté le 3 novembre 2026 ; tests backend et recette navigateur (lot 11 de la [refonte v2](../suivi/refonte-v2.md)) ; React et Krimou à adapter |
| G     | « Mes achats » simplifié : compte unique, prêts en catégorie, épargne du mois, feuille du mois, aide intégrée (API et Angular) | Livré et validé le 6 novembre 2026 (lot 13 de la [refonte v2](../suivi/refonte-v2.md)) ; recette humaine au lecteur d’écran et au toucher à faire |
| Suite | Harmonisation CSS, recette humaine, Docker et restauration réelle | À planifier / à vérifier                          |

Une exigence est clôturée après contrôle du code, résultat de test ou recette identifié, mise à jour documentaire et absence de blocage critique sur son parcours. Un état « partiel » reste visible dans la checklist.
