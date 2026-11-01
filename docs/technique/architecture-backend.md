# FocusWithAkram — architecture du backend

Java 25, Spring Boot 4.1, Spring MVC, Bean Validation, JPA/Hibernate 7, PostgreSQL et Flyway. Monolithe modulaire **organise par domaine fonctionnel** ; dans un domaine, les classes sont **a plat** et seul le contrat HTTP (`dto/`) forme un sous-package. Le role d'une classe se lit dans son suffixe (`*Controller`, `*Service`, `*Repository`, `*Mapper`) ; les entites et enums portent le nom du concept.

```text
backend/src/main/java/com/focusflow/
  FocusFlowApplication.java
  config/          horloge UTC injectable, CORS, PostgreSQL embarque (profil local)
  common/          PageResponse, PatchRequest/Patch (PATCH partiels)
    exception/     ApiException, GlobalExceptionHandler (ProblemDetail + code stable)
  task/            Task, Subtask, Tag, TaskExecution, DailyGoal (Top 3), statuts, quadrants,
                   TaskService, TaskQueries, TaskHistoryService, PriorityService, TaskMapper,
                   TaskSpecifications, repositories, TaskController, TagController
    archive/       sous-domaine des archives : ArchiveController, ArchiveService, ArchiveFilter, ArchiveSection
    dto/           requetes et reponses de l'API des taches
  project/         Project, ProjectService, ProjectMapper, ProjectView, ProjectController, dto/
  pomodoro/        PomodoroSession (machine a etats), SessionType, SessionStatus, PomodoroService, dto/
  settings/        UserSettings (singleton), SettingsService, SettingsMapper, dto/
  dashboard/       indicateurs et Top 3 ; eisenhower/ matrice ; statistics/ agregations ; search/ recherche
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
- un DTO ne depend ni de Spring Data ni de JPA.

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

## Sauvegarde et import

`BackupFile` est un format JSON versionne (`CURRENT_VERSION = 2`) :

| Version | Contenu |
| --- | --- |
| 1 | projets, taches (etiquettes, sous-taches, cycles), sessions Pomodoro terminees |
| 2 | v1 + preferences (`settings`) + Top 3 quotidien (`dailyGoals`) |

L'import accepte toute version de 1 a `CURRENT_VERSION` (sections absentes ignorees) et refuse un fichier plus recent avec `IMPORT_UNSUPPORTED_VERSION`. Chaque element est valide avant ecriture (memes regles que les contraintes SQL) : un element invalide est signale dans `ImportReport.errors` sans interrompre les autres. Le mode apercu (`dryRun=true`) execute l'import puis annule la transaction : son rapport est exactement celui de l'import reel. Les doublons sont ignores (taches : meme identifiant, ou meme titre et date de creation ; projets : meme nom ; sessions et Top 3 : meme identifiant ou meme date et position). Une session n'est rattachee a une tache existante que si leurs identifiants concordent. Les preferences du fichier remplacent les preferences courantes, apres validation complete.

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
