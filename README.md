# FocusWithAkram

Application web de productivité personnelle : **matrice d'Eisenhower** + **minuteur Pomodoro**, avec dashboard, calendrier, statistiques, archives et historique des Pomodoros.

- Documentation fonctionnelle détaillée : [`docs/docs/DOCUMENTATION_FONCTIONNELLE.md`](docs/docs/DOCUMENTATION_FONCTIONNELLE.md)
- Deux frontends Angular/React : [lancement et recette](docs/how-to-run-frontends.md) · [comparaison](docs/frontend-comparison.md) · [parité](docs/frontend-feature-parity.md) · [captures et écarts](docs/frontend-visual-regression.md)
- API interactive (Swagger UI) : <http://localhost:8080/swagger-ui.html> une fois lancé

## Démarrage rapide (sans Docker)

Pré-requis : **Java 25**, **Maven 3.9+**, **Node ≥ 22.22.3 ou ≥ 24.15** (exigence d'Angular 22).

```powershell
# Windows
.\start_angular.ps1
# Ou React :
.\start_react.ps1
# Node trop ancien dans le PATH ? Indiquez un Node portable :
.\start_react.ps1 -NodeHome C:\chemin\node-v24.22.2-win-x64
```

```bash
# Linux / macOS / Git Bash
bash ./start_angular.sh
# Ou React :
bash ./start_react.sh
NODE_HOME=/chemin/node bash ./start_react.sh        # si besoin
```

Les scripts vérifient les versions et les ports, installent les dépendances frontend au premier lancement, démarrent le backend (profil `local` : **PostgreSQL embarqué**, données conservées dans `backend/data/postgres`), attendent qu'il soit prêt, démarrent le frontend, ouvrent le navigateur, puis arrêtent tout au `Ctrl+C`. Journaux dans `logs/angular/` ou `logs/react/`. Choisir un seul lanceur à la fois : chacun démarre son backend sur le port 8080. Pour comparer les deux frontends simultanément, suivre le [guide à trois terminaux](docs/how-to-run-frontends.md). Les options `-BackendPort` / `-FrontendPort` (PowerShell) ou `BACKEND_PORT` / `FRONTEND_PORT` (Bash) personnalisent les ports et le proxy API.

- Angular : <http://127.0.0.1:4200> ; React : <http://127.0.0.1:5173>
- Le premier lancement télécharge les binaires PostgreSQL embarqués (quelques minutes).

## Avec Docker (PostgreSQL réel)

```bash
cp .env.example .env        # changez FOCUSFLOW_DB_PASSWORD
docker compose up -d --build
# Application : http://localhost:8088  (publiée sur 127.0.0.1 uniquement)
```

`docker-compose.dev.yml` ne démarre que PostgreSQL pour développer avec `mvn spring-boot:run` sans le profil `local`. ⚠️ Les fichiers Docker n'ont pas été exécutés sur le poste de développement (Docker absent) : à vérifier au premier usage.

## Architecture

Organisation des deux interfaces : [architecture frontend](docs/frontend-architecture.md).

Monolithe modulaire, découpé par domaine puis par responsabilité.

```
backend/   Java 25 · Spring Boot 4.1 · JPA/Hibernate · PostgreSQL · Flyway · springdoc
  com.focusflow.task        domain (Task, Subtask, TaskExecution, Quadrant…) · application · api · infrastructure
  com.focusflow.pomodoro    PomodoroSession (machine à états), service, API
  com.focusflow.eisenhower  matrice
  com.focusflow.dashboard · statistics · project · settings · transfer · search · common · config
frontend-react/    React · vues TSX · hooks · CSS par domaine
frontend-angular/  Angular 22 · standalone · Signals · OnPush · Tailwind 4 · CDK (drag&drop, dialog, menu) · ECharts · Lucide
  core/      api, interceptors, services (PomodoroEngine, SettingsStore…), util (dates)
  shared/ui  design system (icônes, badges, états, sélecteur de date, graphiques, dialogues)
  features/  dashboard · eisenhower · tasks · pomodoro · calendar · statistics · projects · archives · settings
  layout/    shell, palette de commandes
```

Choix structurants :

- **Le quadrant n'est pas stocké** : il dérive de `important` × `urgent` (cohérence garantie).
- **Les règles du cycle de vie** (démarrer / terminer / restaurer) sont dans l'entité `Task` ; les invariants sont aussi imposés par des contraintes SQL.
- **Le temps Pomodoro est calculé depuis des horodatages** et non compté ; le temps d'une tâche est la somme de ses sessions (pas de double comptage). Voir la documentation, section 16.
- **Instants en UTC**, affichage et regroupements dans le fuseau de l'utilisateur.
- Erreurs au format **ProblemDetail (RFC 9457)** avec un `code` stable.
- État frontend en **Signals** ; un `RefreshService` recharge toutes les vues après chaque mutation.

### Principaux endpoints (`/api/v1`)

`tasks` (CRUD, `status`, `quadrant`, `reorder`, `start`, `complete`, `restore`, `duplicate`, `timeline`, `executions`, `subtasks`, `priorities`, `archives`), `eisenhower/matrix`, `projects`, `tags`, `pomodoro/sessions` (+ `pause`, `resume`, `complete`, `cancel`, `active`), `pomodoro/history`, **`pomodoro/history/daily`**, `dashboard/summary`, `dashboard/top3`, `statistics/productivity`, `settings`, `export/tasks`, `export/backup`, `import`, `search`.

## Tests

```bash
cd backend  && mvn verify                       # 70 tests : unitaires + intégration (PostgreSQL embarqué)
cd frontend-angular && npx ng test --watch=false        # 12 tests : dates / fuseaux / moteur du minuteur
```

Backend : cycle de vie et archivage, comparaison prévu/réel, début rétroactif, restauration et cycles multiples, matrice et ordre, priorités, sous-tâches, machine à états Pomodoro (pause, reprise, idempotence, expiration, pas de double comptage), historique quotidien, statistiques par fuseau, **changements d'heure** (printemps et automne), import / export. Les tests d'intégration utilisent un vrai PostgreSQL embarqué (Testcontainers n'est pas utilisable sans Docker).

## Configuration

| Variable | Défaut | Rôle |
|---|---|---|
| `FOCUSFLOW_DB_URL` / `_USER` / `_PASSWORD` | `jdbc:postgresql://localhost:5432/focusflow` | Base PostgreSQL (hors profil `local`) |
| `PORT` | `8080` | Port du backend |
| `FOCUSFLOW_BIND_ADDRESS` | `127.0.0.1` | Interface d'écoute (`0.0.0.0` dans Docker) |
| `FOCUSFLOW_CORS_ORIGINS` | `http://localhost:4200` | Origines CORS autorisées |

## Sécurité

Usage **personnel local** : pas d'authentification. Le backend n'écoute que sur `127.0.0.1`. N'exposez pas l'API sur Internet sans ajouter une authentification.

## Limites connues

Voir la section 17 de la documentation fonctionnelle (pas de tests E2E Playwright, Docker non exécuté ici, couverture frontend limitée, pas de synchronisation hors ligne…).
