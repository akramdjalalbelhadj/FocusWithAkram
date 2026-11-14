# FocusWithAkram — architecture du backend

Java 25, Spring Boot 4.1, Spring MVC, Bean Validation, JPA/Hibernate 7, PostgreSQL 18 et Flyway. Monolithe modulaire **organise par domaine fonctionnel** ; dans un domaine, les classes sont **a plat** et seul le contrat HTTP (`dto/`) forme un sous-package. Le role d'une classe se lit dans son suffixe (`*Controller`, `*Service`, `*Repository`, `*Mapper`) ; les entites et enums portent le nom du concept.

```text
backend/src/main/java/com/focusflow/
  FocusFlowApplication.java
  config/          horloge UTC injectable, CORS, PostgreSQL embarque (profil local : port de repli, controle de version de la base)
  common/          PageResponse, PatchRequest/Patch (PATCH partiels)
    exception/     ApiException, GlobalExceptionHandler (ProblemDetail + code stable)
  task/            Task, Subtask, Tag, TaskExecution, DailyGoal (Top 3), statuts, quadrants,
                   TaskService, TaskQueries, TaskHistoryService, PriorityService, TaskMapper,
                   TaskSpecifications, repositories, TaskController, TagController
    archive/       sous-domaine des archives : ArchiveController, ArchiveService, ArchiveFilter, ArchiveSection
    dto/           requetes et reponses de l'API des taches
  project/         Project, ProjectService, ProjectMapper, ProjectView, ProjectController,
                   ProjectFolder, ProjectFolderService, ProjectFolderController (lot 23), dto/
  folderdeletion/  FolderDeletionService, FolderDeletionController, FolderDeletionMode, dto/ (lot 27)
  pomodoro/        PomodoroSession (machine a etats), SessionType, SessionStatus, PomodoroService, dto/
  settings/        UserSettings (singleton), SettingsService, SettingsMapper, dto/
  dashboard/       indicateurs et Top 3 ; eisenhower/ matrice ; statistics/ agregations ; search/ recherche
  finance/         module « Mes achats » : Account (compte unique), Category, Operation, Schedule (echeancier, montants dates),
                   enveloppes (depenses variables plafonnees, lot 13), MonthlyBudget, FinancePreferences, Goal (objectif d'achat),
                   ForecastEngine (calcul pur) et ForecastService, Money, FinanceDates, services (compte, operations, echeancier,
                   budget, objectifs, enveloppes, feuille du mois), FinanceOverviewService (bilan du mois), AlertService,
                   FinanceStatisticsService, SimulationService (hypotheses sur la prevision), FinanceBackup (section de sauvegarde), dto/
  note/            module Notes & idees : Note (idee, contenu Markdown, sans statut), NoteCategory, NoteService
                   (saisie, recherche, suppression, transformation en tache), NoteCategoryService, NoteBackup
                   (section de sauvegarde), NoteSpecifications, NoteMapper, controleurs, dto/
  transfer/        export CSV/JSON, sauvegarde versionnee et import, dto/
```

Les tests suivent les memes packages ; `architecture/`, `contract/` et `support/` sont transverses.

### Ajouter un domaine

1. Creer `com.focusflow.<domaine>` ; y placer entites, enums, repositories, services, mappers et controleurs a plat.
2. Placer les requetes et reponses HTTP dans `<domaine>.dto`.
3. Si le domaine depasse une vingtaine de classes, le decouper en sous-domaines cohesifs (`<domaine>.<sous-domaine>`), comme `task.archive`, plutot qu'en couches techniques.
4. Ajouter une migration Flyway `V<n>__<sujet>.sql` ; ne jamais modifier une migration deja appliquee.
5. Si le domaine contient des donnees utilisateur, l'ajouter a la sauvegarde (voir plus bas).

### Regles verifiees automatiquement

`ModuleArchitectureTest` (ArchUnit) :

- aucun cycle de dependances entre domaines. Seule exception documentee : `task` et `pomodoro` (une session reference sa tache ; la tache agrege le temps de ses sessions) ;
- `common` ne depend d'aucun domaine ;
- un `@RestController` se nomme `*Controller`, ne se trouve ni dans `dto`, ni dans `common`, ni dans `config`, et n'est injecte nulle part ;
- un DTO ne depend ni de Spring Data ni de JPA ;
- `finance` ne depend d'aucun domaine de productivite (task, pomodoro, project…) ni de `note`, et ne contient aucun champ `double`/`float` ;
- `task`, `pomodoro`, `project` et `eisenhower` ne dependent pas de `note` : une tache ne connait son idee d'origine que par son identifiant (`Task.sourceNoteId`).

`ControllerArchitectureTest` : un controleur n'injecte pas de repository, n'accepte pas de `Map` comme corps et n'expose aucune entite JPA, meme imbriquee dans un record.

## Responsabilites

- **Controller** : routage, deserialisation et validation des entrees, delegation au service et choix du statut HTTP. Les requetes utilisent des DTO explicites, jamais une entite JPA ni un `Map` sans contrat.
- **DTO** : contrat de transport JSON, dans son propre fichier. Les `record` sont privilegies pour les requetes completes et les reponses. Les DTO ne contiennent ni acces aux repositories ni logique de persistance.
- **Entite** : etat persistant, relations JPA et invariants du cycle de vie. Une entite n'est jamais serialisee directement dans une reponse de l'API. Les fabriques d'import (`Task.fromSnapshot`, `TaskExecution.imported`, `PomodoroSession.imported`) verifient les memes invariants que les contraintes SQL.
- **Service** : orchestration des cas d'usage, regles applicatives et limites transactionnelles. Les dependances sont fournies par constructeur. Aucune dependance vers un controleur.
- **Repository** : acces aux donnees et requetes JPA. Les references qualifiees aux enums dans le JPQL suivent les packages (`com.focusflow.task.TaskStatus.DONE`).
- **Mapper** : transformation des entites ou projections internes en DTO, sans logique HTTP. Les mappers simples sont des fonctions statiques ; le mapper de taches reste un composant car il agrege le temps travaille et utilise une horloge injectable.
- **Valeurs et filtres** (`TaskTiming`, `TaskFilter`, `ArchiveFilter`, `ProjectView`) : calculs, criteres et projections internes, ni tables ni corps HTTP, places a cote du service qui les utilise.

Une interface de service n'est pas ajoutee sans besoin de plusieurs implementations. Les regles propres aux entites restent dans les entites ; les services ne deviennent pas de simples conteneurs de donnees.

## Mises a jour partielles

Les DTO `UpdateTaskRequest`, `UpdateSubtaskRequest`, `UpdateSettingsRequest` et `ProjectWriteRequest` declarent explicitement les champs et leurs types. La base `PatchRequest` conserve leur presence grace aux setters JSON :

```json
{"title":"Nouveau titre"}
```

modifie uniquement le titre, tandis que :

```json
{"projectId":null,"plannedStartAt":null,"plannedEndAt":null}
```

efface ces champs. Un record compose uniquement de champs nullables ne permettrait pas de distinguer ces deux intentions. L'adaptation vers `common/util/Patch` conserve les validations metier existantes dans les services. Les nouveaux champs modifiables doivent etre ajoutes explicitement au DTO concerne.

## Exceptions

`common/exception` contient `ApiException`, `ResourceNotFoundException`, `BusinessRuleException`, `ResourceConflictException` et `GlobalExceptionHandler`.

Le gestionnaire produit des reponses `ProblemDetail` avec un code stable : ressource absente (404), conflit (409), regle metier (422), requete invalide (400) et erreur interne (500). Les erreurs de validation Bean Validation exposent aussi les erreurs par champ. Les details techniques des erreurs inattendues restent dans les journaux du serveur.

## Module financier (`finance`)

Regles metier : [specification de « Mes achats »](../produit/mes-achats/specification.md). Choix d'implementation :

- **Compte unique** (lot 13) : un seul compte represente tout l'argent (banque, epargne, especes). `AccountService.create` refuse un second compte (409 `SINGLE_ACCOUNT`) ; operations et echeanciers portent tous ce compte ; le solde disponible est son solde. La table `fin_account` est conservee (un enregistrement).
- **Montants** : `BigDecimal`, `NUMERIC(12,2)`, toujours positifs ; le sens est porte par `Direction` (CREDIT/DEBIT) et impose par le type (contraintes SQL `ck_fin_operation_*`). `Money` refuse plus de deux decimales au lieu d'arrondir.
- **Rien de calcule n'est stocke** : le solde d'un compte est la somme de ses operations realisees (requete agregee), le bilan du mois est recalcule a chaque lecture (`FinanceOverviewService`).
- **Dates** : `LocalDate` dans le fuseau des preferences (`FinanceDates.today()`) ; une operation realisee ne peut pas etre datee dans le futur.
- **Saisie** : creation et modification en remplacement complet (`PUT`) par des records valides ; les booleens facultatifs sont des `Boolean` (Jackson 3 refuse un primitif absent).
- **Invariants** : `Operation.apply` verifie tout le brouillon (`Operation.Draft`) avant de modifier l'entite ; les memes regles existent en SQL.
- **Echeanciers** : les echeances sont calculees depuis la date de depart (`Schedule.nth`, sans derive de fin de mois). Seule une echeance realisee, sautee ou ajustee est enregistree, comme operation liee (`schedule_id`, `due_date`, index unique) : une echeance ne peut pas etre payee deux fois. Les echeances a venir sont des operations **virtuelles** (`Operation.virtual`, jamais persistees) reutilisees par le budget, la vue d'ensemble et, plus tard, la prevision. Les echeances passees non confirmees restent proposees 92 jours (`ScheduleService.OVERDUE_LOOKBACK_DAYS`).
- **Montants dates** (lot 13) : `fin_schedule_amount (schedule_id, from_month, amount)`. Le montant d'une echeance est celui de la version la plus recente dont `from_month` <= mois de l'echeance, sinon le montant de l'echeancier ; les echeances deja enregistrees (realisees, sautees, ajustees) gardent leur montant. « Ce mois seulement » reste l'ajustement d'une echeance (`PUT /schedules/{id}/occurrences/{date}`). Une echeance deja realisee peut etre confirmee de nouveau (reel mis a jour, prevu conserve) ou son enregistrement annule (`DELETE /schedules/{id}/occurrences/{date}`, elle redevient prevue). Un revenu peut porter une categorie facultative (operation et echeancier).
- **Enveloppes** (lot 13) : `fin_envelope (id, category_id, label, position, start_month, end_month)`, plafonds dates `fin_envelope_amount`, suivi mensuel `fin_envelope_month (envelope_id, month, comment, total_operation_id)`. Le depense du mois est calcule a la lecture (categorie et sous-categories, net des remboursements, hors echeances et achats d'objectifs) ; « saisir le total du mois » cree ou met a jour une seule operation de total. Le plafond variable du mois (budget, prevision, alertes) est la somme des plafonds des enveloppes actives ; sans enveloppe, plafond du mois ou par defaut.
- **Feuille du mois** (lot 13) : `GET /months/{AAAA-MM}/sheet` assemble revenus, depenses fixes, enveloppes, autres depenses et totaux (prevus, reels, epargne prevue et reelle), recalcules a chaque lecture. Calcul et codes d'erreur (`INVALID_ENVELOPE`, `ENVELOPE_CATEGORY_TAKEN`, `INVALID_AMOUNT_CHANGE`, `FUTURE_COMPLETED_OPERATION`, `ENVELOPE_TOTAL_TOO_LOW`) : [feuille du mois](../produit/mes-achats/feuille-du-mois.md).
- **Budget** : `BudgetService` combine operations du mois et echeances virtuelles ; plafond et objectif du mois (`fin_budget`) ou par defaut (`fin_preferences`) ; jauge OK / WARNING (seuil inclus jusqu'au plafond) / OVER calculee sur les valeurs exactes.
- **Prevision et faisabilite** : `ForecastEngine` est un calcul pur (sans Spring ni base), teste sur des scenarios chiffres a la main. Il calcule jour par jour le disponible et l'epargne (operations prevues et en retard, echeances, depenses variables restantes reparties au centime sur le mois, epargne du mois retiree au salaire) puis evalue les objectifs ouverts par priorite (quadrant, date cible, anciennete). Un achat est realisable si le disponible libre reste au-dessus de la reserve de securite sur [date, date + 92 jours] ; chaque objectif retenu est deduit avant le suivant (pas de double comptage) ; les reservations n'appartiennent qu'a leur objectif. Depuis le lot 13, plus de financement par l'epargne (la migration V8 retire ce marquage) ni de prets dans la prevision. `ForecastService` prepare les entrees ; tout est recalcule a chaque lecture.
- **Prets** : retires au lot 13 (`Loan`, `LoanService`, `LoanController`, table `fin_loan`, types `LOAN_*`, alertes de pret). Un pret accorde ou un remboursement verse est une depense de la categorie « Prets », un emprunt ou un remboursement recu un revenu de cette categorie (contrainte `ck_fin_operation_category` : categorie obligatoire pour une depense, facultative pour un revenu).
- **Epargne** (lot 13) : epargne du mois = revenus recus - depenses payees (`unspent`) ; les statistiques exposent par mois le plafond variable et l'objectif d'epargne (`MonthStat.variableCap`, `savingsTarget`) et le taux d'epargne = epargne / revenus recus.
- **Migrations** : `V2__finance_core.sql` (tables), `V3__finance_default_categories.sql` (categories initiales), `V4__finance_budget_schedules.sql` (preferences, budgets, echeanciers, lien operation-echeance), `V5__finance_goals.sql` (objectifs d'achat, lien depense-objectif), `V6__finance_loans.sql` (prets et emprunts, mouvements de pret lies) : additives. `V8__finance_single_account.sql` (lot 13) **modifie les donnees** : compte conserve = compte courant actif le plus ancien ; soldes initiaux des autres comptes en corrections « Solde de depart — <nom> » ; virements supprimes ; operations et echeanciers rattaches au compte conserve, autres comptes supprimes (solde total inchange) ; mouvements de pret convertis en depenses ou revenus de la categorie « Prets », puis `fin_operation.loan_id` et `fin_loan` supprimes ; `funded_by_savings` remis a faux ; categorie facultative pour un revenu ; `fin_preferences.tutorial_done` (visite guidee). Test : `SingleAccountMigrationIT`. V9 (lot 13, additive) : `fin_schedule_amount`, `fin_envelope`, `fin_envelope_amount`, `fin_envelope_month`. Faire une sauvegarde JSON avant de passer V8 sur une base durable ([exploitation § 11.2](exploitation.md)).

API (`/api/v1/finance`) : `overview?month=AAAA-MM`, `months/{AAAA-MM}/sheet` (feuille du mois, lot 13), `accounts` (compte unique : creation du premier, renommage, `/{id}/reconcile` ; un second est refuse), `categories` (arbre, CRUD), `operations` (recherche paginee et filtree, CRUD, `/{id}/complete`, `/{id}/cancel`, `/duplicates`), `schedules` (CRUD, `/{id}/pause|resume|end`, `/{id}/occurrences/{AAAA-MM-JJ}/complete|skip`, `PUT /{id}/occurrences/{date}`, `DELETE /{id}/occurrences/{date}`, `PUT /{id}/amount`, `DELETE /{id}/amount/{AAAA-MM}`), `envelopes` (lot 13 : liste, creation, `PUT /{id}`, `PUT /{id}/amount`, `POST /{id}/end`, `DELETE /{id}`, `PUT /{id}/months/{AAAA-MM}/comment|actual`), `budget?month=` et `PUT budget/{AAAA-MM}`, `preferences` (GET/PUT, dont `tutorialDone`), `forecast`, `goals` (CRUD, `preview`, `/{id}/reservation`, `/{id}/purchase`, `/{id}/postpone|abandon|reopen`, `/{id}/position`), `alerts`, `statistics?from=&to=` (AAAA-MM, 1 a 24 mois), `POST simulation`, `calendar?month=`. L'API `loans` est retiree au lot 13.

## Module Notes & idees (`note`)

Regles metier : [cahier des charges § 4.5](../produit/cahier-des-charges.md). Choix d'implementation :

- **Dependance a sens unique** : `note` utilise `TaskService` (creation, taches d'une idee, avancement, detachement) ; le domaine des taches ne porte qu'une colonne `task.source_note_id` (UUID, cle etrangere `ON DELETE SET NULL`) et ne connait aucune classe de `note`. Il n'existe pas de second systeme de taches : `POST /notes/{id}/tasks` appelle `TaskService.create(req, noteId)`, avec les memes regles qu'une creation ordinaire (quadrant Q2 par defaut, dates prevues coherentes, etiquettes, projet).
- **Pas de statut d'idee** : l'avancement affiche (`taskCount`, `tasksDone`) est une requete agregee sur `task` a la lecture (`TaskService.progressByNote`).
- **Doublon** : un titre deja porte (casse ignoree) par une tache de la meme idee renvoie 409 `NOTE_TASK_DUPLICATE` sauf `allowDuplicate=true`. L'idee est verrouillee (`PESSIMISTIC_WRITE`) pendant la creation : deux envois simultanes ne creent pas deux taches.
- **Suppression** : 409 `NOTE_HAS_TASKS` tant que des taches sont issues de l'idee ; `?force=true` detache les taches (mise a jour groupee) puis supprime l'idee. Supprimer une tache retire simplement le lien. La duplication et la restauration d'une tache conservent le lien.
- **Contenu** : Markdown brut (100 000 caracteres), quel que soit le mode d'editeur ; l'extrait des listes (`NoteMapper.excerpt`, 240 caracteres) retire la syntaxe. Recherche `ILIKE` echappee sur titre et contenu.
- **Modification** : `PATCH` partiel (`UpdateNoteRequest`, a presence) pour l'enregistrement automatique ; le favori ne change pas la date de modification.
- **Categories** : nom unique sans casse (index `lower(name)`, 409 `NOTE_CATEGORY_NAME_TAKEN`), couleur `#rrggbb` ; suppression = `category_id` remis a NULL par la base.
- **Mode d'editeur** : `user_settings.note_editor_mode` (`MARKDOWN` | `RICH`), valide par `SettingsService` comme les autres preferences.
- **Migration** : `V7__notes.sql` (`note_category`, `note`, `note_tag`, `task.source_note_id`, `user_settings.note_editor_mode`). Additive : aucune donnee existante n'est modifiee.
- **Tutoriel** (lot 14) : `user_settings.notes_tutorial_done` (`V10__notes_tutorial.sql`, additive : `BOOLEAN NOT NULL DEFAULT FALSE`), expose par `GET` / `PATCH /api/v1/settings` sous `notesTutorialDone` et gere par `SettingsService` comme les autres preferences. Etat d'interface **hors sauvegarde JSON** (absent de `SettingsData`), comme `tutorialDone` de « Mes achats » : apres restauration sur une nouvelle installation, le tutoriel est simplement propose une fois de plus. Test : `NoteIT.theTutorialIsOfferedUntilItIsFinishedOrSkipped`.
- **Tutoriel de la matrice** (lot 15, hors module `note`) : `user_settings.matrix_tutorial_done` (`V11__matrix_tutorial.sql`, additive : `BOOLEAN NOT NULL DEFAULT FALSE`), expose par `GET` / `PATCH /api/v1/settings` sous `matrixTutorialDone`, independant de `notesTutorialDone`, egalement hors sauvegarde JSON. Test : `MatrixAndPrioritiesIT.theMatrixTutorialIsOfferedUntilItIsFinishedOrSkippedIndependentlyOfTheNotesOne`.

API : `/api/v1/notes` (`GET` pagine et filtre : `q`, `categoryId`, `tag`, `favorite`, `withTasks`, `sort=updatedAt|createdAt|title`, `dir` ; `GET /tags` ; `GET|PATCH|DELETE /{id}` avec `force` ; `POST /{id}/tasks` `{task, allowDuplicate}`), `/api/v1/note-categories` (`GET`, `POST`, `PATCH /{id}`, `DELETE /{id}`). `TaskResponse.sourceNoteId` expose l'idee d'origine.

## Sauvegarde et import

`BackupFile` est un format JSON versionne (`CURRENT_VERSION = 7` avec le lot 27) :

| Version | Contenu |
| --- | --- |
| 1 | projets, taches (etiquettes, sous-taches, cycles), sessions Pomodoro terminees |
| 2 | v1 + preferences (`settings`) + Top 3 quotidien (`dailyGoals`) |
| 3 | v2 + module « Mes achats » (`finance` : comptes, categories, echeanciers, objectifs d'achat, prets, operations, budgets, preferences) |
| 4 | v3 + Notes & idees (`notes` : categories, idees), idee d'origine des taches (`tasks[].sourceNoteId`) et `settings.noteEditorMode` |
| 5 | v4 + « Mes achats » simplifie (lot 13) : montants dates des echeanciers, enveloppes (plafonds dates, commentaires et totaux du mois) ; compte unique ; plus de section `loans` ni de `loanId`. Les etats de visite guidee (`tutorialDone`, `notesTutorialDone`, `matrixTutorialDone`) ne sont pas sauvegardes |
| 7 | v6 + plusieurs dossiers par projet (`projects[].folderIds` ; `folderId` reste ecrit avec le premier dossier, et seul lu dans un fichier v6) |
| 6 | v5 + dossiers de projets (`folders`, `projects[].folderId`) et tous les projets d'une tache (`tasks[].projectIds`, principal en tete ; sans ce champ, seul `projectId` est lu) |

L'import accepte toute version de 1 a `CURRENT_VERSION` (sections absentes ignorees) et refuse un fichier plus recent avec `IMPORT_UNSUPPORTED_VERSION`. Chaque element est valide avant ecriture (memes regles que les contraintes SQL) : un element invalide est signale dans `ImportReport.errors` sans interrompre les autres. Le mode apercu (`dryRun=true`) execute l'import puis annule la transaction : son rapport est exactement celui de l'import reel. Les doublons sont ignores (taches : meme identifiant, ou meme titre et date de creation ; projets : meme nom ; sessions et Top 3 : meme identifiant ou meme date et position). Une session n'est rattachee a une tache existante que si leurs identifiants concordent. Les preferences du fichier remplacent les preferences courantes, apres validation complete. Partie « Mes achats » d'une sauvegarde v3 ou v4 (lot 13) : tous ses comptes se rattachent au compte unique (cree au besoin d'apres son compte courant actif), le solde initial d'un compte supplementaire devient une correction, les virements sont ignores et les mouvements de pret deviennent des depenses ou revenus de la categorie « Prets » (reutilisee ou creee) ; le type d'operation est lu comme texte pour accepter ces anciens types. Les idees sont importees avant les taches : une tache retrouve son idee d'origine si celle-ci est dans le fichier (creee ou deja presente) ; les categories d'idees sont rapprochees par identifiant puis par nom, les idees par identifiant ou par titre et date de creation (`ImportReport.notes`).

Dossiers de projets (lot 23, modele etendu au lot 27 ci-dessous) : table `project_folder` (nom unique sans casse, couleur) ; le lien `project.folder_id` du lot 23 est remplace par `project_folder_link` (V14). Une tache ne connait jamais de dossier. API `/api/v1/project-folders` (`GET` avec `projectCount`, `POST`, `PATCH /{id}`, `DELETE /{id}` ; `FOLDER_NAME_TAKEN`, `FOLDER_NAME_RESERVED`), `folderIds` dans `ProjectResponse` et le `PATCH`/`POST` des projets. `GET /api/v1/export/projects?id=…&folderId=…&withTasks=true` produit un fichier au format courant (v7) limite aux dossiers et projets choisis (aucun filtre : tous), aux taches rattachees a l'un d'eux (principal ou supplementaire) et a leurs sessions terminees (`EXPORT_NO_PROJECT` si rien n'est choisi) ; il s'importe par `POST /import`. Les dossiers sont rapproches par nom (`ImportReport.foldersCreated` / `foldersReused`) ; un projet reutilise garde ses dossiers et rejoint ceux du fichier. L'interface Angular n'envoie a l'import de projets que `folders`, `projects`, `tasks` et `sessions`.

Plusieurs dossiers par projet (lot 27) : migration V14, table de liaison `project_folder_link` (`ON DELETE CASCADE` des deux cotes) a la place de `project.folder_id` (rangements existants recopies). `ProjectResponse.folderIds` (par nom de dossier, calcule dans le service : `open-in-view` est desactive) ; ecriture par `folderIds` (remplace la liste) ou l'ancien `folderId` (un seul dossier, `null` : aucun). `projectCount` d'un dossier compte chaque projet dans chacun de ses dossiers. Export d'une selection de dossiers : le fichier ne contient que ces dossiers, et chaque projet n'y est range que dans ceux-ci. Import : un projet appartient a chacun de ses dossiers du fichier (groupes de conflit) ; `SKIP` ne l'ignore que si tous ses dossiers sont en conflit ; un projet deja present (mode `MERGE`) garde ses dossiers et rejoint ceux du fichier.

Suppression de dossiers (lot 27, module `folderdeletion`, qui depend de `project` et `task` : le placer dans `project` creerait un cycle) : `POST /api/v1/project-folders/deletion?dryRun=` `{folderIds, mode}` avec `mode` = `KEEP_PROJECTS` | `DELETE_PROJECTS` | `DELETE_PROJECTS_AND_TASKS` ; `FOLDER_DELETION_EMPTY` sans dossier. Un projet qui fait aussi partie d'un dossier non supprime n'est jamais supprime (il quitte seulement les dossiers supprimes, `keptProjects`). En `DELETE_PROJECTS`, les taches des projets supprimes sont gardees et detachees (le premier projet restant devient principal) ; en `DELETE_PROJECTS_AND_TASKS`, une tache n'est supprimee que si tous ses projets le sont. `dryRun` execute puis annule la transaction (rapport identique). `DELETE /project-folders/{id}` reste disponible (equivaut a `KEEP_PROJECTS`).

Dossier par defaut : « Projets sans dossier » n'existe pas en base ; il designe les projets sans lien dans `project_folder_link`. Son nom est reserve (`ProjectFolderService.DEFAULT_FOLDER_NAME`, sans casse) : creation ou renommage refuses avec `FOLDER_NAME_RESERVED` (409) ; un dossier de ce nom dans un fichier importe est signale dans `errors` et ses projets arrivent sans dossier. Il ne peut donc ni etre supprime, ni recevoir un projet range ailleurs.

Conflits a l'import (lot 25) : `POST /import?conflicts=MERGE|SKIP|REPLACE` (defaut `MERGE`, comportement historique de la sauvegarde complete). Un groupe du fichier (un dossier, ou les projets sans dossier) est en conflit si son dossier ou l'un de ses projets existe deja (nom sans casse) ; `ImportReport.conflicts` (`ImportConflict` : dossier, `folderExists`, `projectCount`, `existingProjects` avec dossier actuel et etat) est toujours rempli. `SKIP` ignore ces groupes (dossier, projets, et taches dont tous les projets du fichier sont ignores) : `projectsIgnored`, `tasksIgnored`. `REPLACE` y laisse le fichier ecraser l'existant : couleur du dossier ; description, couleur, etat et dossier des projets (`projectsReplaced`) ; tache deja presente (meme identifiant, ou meme titre et date de creation) supprimee puis recreee depuis le fichier, ses sessions rattachees de nouveau et son Top 3 recree (`tasksReplaced`) ; tache avec une session en cours non remplacee (erreur signalee). Rien n'est supprime de ce qui n'est pas dans le fichier.

Pour ajouter un domaine a la sauvegarde : ajouter une section nullable a `BackupFile`, incrementer `CURRENT_VERSION`, ajouter ses compteurs a `ImportReport` et a `shared/models.ts`, et tester l'import d'un fichier de l'ancienne version.

## Tests et lancement

Depuis `backend/` :

```powershell
mvn test
mvn package
mvn spring-boot:run "-Dspring-boot.run.profiles=local"
```

Les tests suivent les packages de production ; les tests transversaux sont dans `contract/` et `architecture/`. Les tests d'integration utilisent une base PostgreSQL embarquee temporaire et une horloge controlable. La base locale de developpement est distincte.

`ControllerArchitectureTest` verifie que les controleurs deleguent l'acces aux donnees, utilisent des corps de requete types et n'exposent pas d'entites JPA dans leurs reponses. `ApiContractIT` couvre notamment la distinction entre champ absent et null explicite, les erreurs et la recherche.

Les routes `/api/v1`, les noms JSON, les tables et les migrations Flyway sont conserves. La structure des packages Java n'impose aucune migration des donnees. Voir [le guide de lancement des deux interfaces](exploitation.md).
