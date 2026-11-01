# FocusWithAkram

Application web de productivité personnelle : **matrice d'Eisenhower** + **minuteur Pomodoro**, avec dashboard, calendrier, statistiques, archives et historique des Pomodoros. Le module de finances personnelles **« Mes achats »** est en cours de livraison : comptes, opérations, catégories et bilan mensuel sont disponibles ; budgets, abonnements, achats prévus et prêts suivent (voir le [suivi de la refonte v2](docs/suivi/refonte-v2.md)).

Toute la documentation est indexée dans [docs/README.md](docs/README.md).

| Besoin | Document |
| --- | --- |
| Utiliser l'application | [Guide d'utilisation](docs/produit/guide-utilisation.md) |
| Comprendre le produit et ses règles | [Cahier des charges](docs/produit/cahier-des-charges.md) |
| Installer, lancer, tester, sauvegarder | [Exploitation](docs/technique/exploitation.md) |
| Architecture | [Backend](docs/technique/architecture-backend.md) · [Frontends](docs/technique/architecture-frontend.md) · [Design](docs/technique/design.md) |
| État d'avancement | [Fonctionnel](docs/suivi/avancement-fonctionnel.md) · [Technique](docs/suivi/avancement-technique.md) · [Checklist](docs/suivi/checklist.md) · [Refonte v2](docs/suivi/refonte-v2.md) |

API interactive (Swagger UI) : <http://localhost:8080/swagger-ui.html> une fois le backend lancé.

## Démarrage rapide (sans Docker)

Pré-requis : **Java 25**, **Maven 3.9+**, **Node ≥ 22.22.3 ou ≥ 24.15** (exigence d'Angular 22).

```powershell
# Windows, depuis la racine
.\scripts\start_angular.ps1
# Ou React :
.\scripts\start_react.ps1
# Node trop ancien dans le PATH ? Indiquez un Node portable :
.\scripts\start_angular.ps1 -NodeHome C:\chemin\node-v24.22.2-win-x64
```

```bash
# Linux / macOS / Git Bash, depuis la racine
bash ./scripts/start_angular.sh
bash ./scripts/start_react.sh
NODE_HOME=/chemin/node bash ./scripts/start_angular.sh   # si besoin
```

Les lanceurs vérifient les versions et les ports, installent les dépendances frontend au premier lancement, démarrent le backend (profil `local` : **PostgreSQL embarqué**, données conservées dans `backend/data/postgres`, jamais versionnées), attendent qu'il soit prêt, démarrent le frontend, ouvrent le navigateur, puis arrêtent tout au `Ctrl+C`. Journaux dans `logs/angular/` ou `logs/react/`. Un seul lanceur à la fois : chacun démarre son backend sur le port 8080. Options et lancement manuel : [exploitation](docs/technique/exploitation.md).

- Angular : <http://127.0.0.1:4200> ; React : <http://127.0.0.1:5173>
- Le premier lancement télécharge les binaires PostgreSQL embarqués (quelques minutes).

## Avec Docker

`docker-compose.yml` (PostgreSQL + backend + Angular/nginx) et `docker-compose.dev.yml` (PostgreSQL seul) existent mais **ne sont pas validés** : le contexte de build a été corrigé (racine du dépôt, `.dockerignore`), sans construction réelle à ce jour. Voir [exploitation, section Docker](docs/technique/exploitation.md).

## Organisation du dépôt

```
backend/            Java 25 · Spring Boot 4.1 · JPA/Hibernate 7 · PostgreSQL · Flyway
frontend-angular/   Angular 22 · standalone · Signals · zoneless · Tailwind 4 · CDK · ECharts
frontend-react/     React 19 · React Router · TanStack Query · Vite (hors périmètre de la phase v2 en cours)
shared/             Contrats TypeScript, utilitaires de dates et tokens CSS communs aux deux frontends
scripts/            Lanceurs locaux (PowerShell et Bash)
docs/               Documentation : produit, technique, suivi, historique, maquettes
```

Fichiers locaux jamais versionnés : `backend/data/` (base), `logs/`, `.tools/` (Node portable), `.env`.

Choix structurants :

- **Le quadrant n'est pas stocké** : il dérive de `important` × `urgent`.
- **Les règles du cycle de vie** (démarrer / terminer / restaurer) sont dans l'entité `Task` ; les invariants sont aussi imposés par des contraintes SQL.
- **Le temps Pomodoro est calculé depuis des horodatages** ; le temps actif d'une tâche est la somme de ses sessions de travail, sans double comptage.
- **Instants en UTC**, affichage et regroupements dans le fuseau de l'utilisateur.
- Erreurs au format **ProblemDetail (RFC 9457)** avec un `code` stable.

## Tests

```powershell
# Depuis backend : tests unitaires, d'intégration (PostgreSQL embarqué jetable), contrat et architecture
mvn test
```

```powershell
# Depuis la racine
npm run test:angular
npm run lint:angular
npm run build:angular
```

Résultats et périmètre à jour : [avancement technique](docs/suivi/avancement-technique.md).

## Configuration

| Variable                                   | Défaut                                            | Rôle                                       |
| ------------------------------------------ | ------------------------------------------------- | ------------------------------------------ |
| `FOCUSFLOW_DB_URL` / `_USER` / `_PASSWORD` | `jdbc:postgresql://localhost:5432/focusflow`      | Base PostgreSQL (hors profil `local`)      |
| `PORT`                                     | `8080`                                            | Port du backend                            |
| `FOCUSFLOW_BIND_ADDRESS`                   | `127.0.0.1`                                       | Interface d'écoute (`0.0.0.0` dans Docker) |
| `FOCUSFLOW_CORS_ORIGINS`                   | localhost et 127.0.0.1 sur les ports 4200 et 5173 | Origines CORS autorisées                   |

## Sécurité et confidentialité

Usage **personnel local** : pas d'authentification. Le backend n'écoute que sur `127.0.0.1`. N'exposez pas l'API sur Internet sans ajouter une authentification. La base, les sauvegardes JSON et les journaux contiennent des données personnelles : ne les versionnez pas.
