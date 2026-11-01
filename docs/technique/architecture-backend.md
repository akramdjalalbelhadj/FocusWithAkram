# FocusWithAkram — architecture du backend

Java 25, Spring Boot, Spring MVC, Bean Validation, JPA et PostgreSQL. Le code est organise par domaine fonctionnel ; chaque domaine contient uniquement les couches dont il a besoin.

```text
backend/src/main/java/com/focusflow/
  FocusFlowApplication.java
  config/                         configuration Spring et infrastructure locale
  common/
    dto/                          pagination et base des requetes PATCH
    exception/                    erreurs metier et gestion HTTP centralisee
    util/                         lecture des modifications partielles
  task/
    controller/                   endpoints HTTP
    dto/                          requetes et reponses de l'API
    entity/                       Task, Subtask, Tag, TaskExecution, DailyGoal
    enums/                        statuts, quadrants, priorites et archives
    mapper/                       conversion vers les DTO
    model/                        filtres et calculs temporels
    repository/                   acces JPA
    service/                      cas d'usage et transactions
    specification/                filtres JPA composables
  project/                        meme convention, avec une projection dans model/
  pomodoro/                       sessions, historique et transitions
  settings/                       preferences utilisateur
  dashboard/                      indicateurs et objectifs quotidiens
  eisenhower/                     matrice
  statistics/                     agregations statistiques
  search/                         recherche globale
  transfer/                       import, export et sauvegarde versionnee
```

## Responsabilites

- **Controller** : routage, deserialisation et validation des entrees, delegation au service et choix du statut HTTP. Les requetes utilisent des DTO explicites, jamais une entite JPA ni un `Map` sans contrat.
- **DTO** : contrat de transport JSON, dans son propre fichier. Les `record` sont privilegies pour les requetes completes et les reponses. Les DTO ne contiennent ni acces aux repositories ni logique de persistance.
- **Entity** : etat persistant, relations JPA et invariants du cycle de vie. Une entite n'est jamais serialisee directement dans une reponse de l'API.
- **Service** : orchestration des cas d'usage, regles applicatives et limites transactionnelles. Les dependances sont fournies par constructeur. Aucune dependance vers un controleur.
- **Repository** : acces aux donnees et requetes JPA. Les noms d'entites JPQL restent ceux des classes ; les references qualifiees aux enums suivent les nouveaux packages.
- **Mapper** : transformation des entites ou projections internes en DTO, sans logique HTTP. Les mappers simples sont des fonctions statiques ; le mapper de taches reste un composant car il agrege le temps travaille et utilise une horloge injectable.
- **Model** : valeurs calculees, filtres et projections internes qui ne sont ni des tables ni des corps HTTP.

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
