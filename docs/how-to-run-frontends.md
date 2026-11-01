# Lancer et comparer FocusWithAkram

Racine : `D:\Projet\backup_Project\FocusWithAkram`.

## Installation

Java 25, Maven, Node 24.22.2 (version utilisée), npm. Le Node système 22.12.0 rencontré est trop ancien pour Angular 22.2. Activer Node 24 avant les commandes npm.

```powershell
npm ci --prefix frontend-angular
npm ci --prefix frontend-react
```

Le runtime temporaire `.tools/node_modules/node/bin/node.exe` utilisé pendant la recette est ignoré par Git. Exemple d’appel explicite : `.tools/node_modules/node/bin/node.exe frontend-react/node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173`. Il ne remplace pas le Node système ; npm.ps1 peut sélectionner un autre runtime.

## Lancement automatique d'un frontend

Depuis la racine, choisir `./start_angular.ps1` ou `./start_react.ps1` sous PowerShell ; `bash ./start_angular.sh` ou `bash ./start_react.sh` sous Bash. Chaque lanceur démarre aussi le backend local, installe les dépendances absentes et ouvre le navigateur. Angular utilise le port 4200, React le port 5173 ; le backend utilise le port 8080. Ctrl+C arrête les processus lancés.

Ports personnalisés : `-BackendPort 8081 -FrontendPort 4300` sous PowerShell, ou `BACKEND_PORT=8081 FRONTEND_PORT=4300 bash ./start_angular.sh` sous Bash. Le proxy suit le port backend choisi. Node portable : `-NodeHome` ou `FOCUSFLOW_NODE_HOME` sous PowerShell ; `NODE_HOME` sous Bash. Le runtime local `.tools/node_modules/node/bin` est utilisé s'il existe, sinon le Node du PATH. Journaux dans `logs/angular/` ou `logs/react/`.

Utiliser un seul lanceur automatique à la fois. Pour comparer les deux frontends avec un backend commun, suivre les commandes ci-dessous.

## Lancement normal — trois terminaux

Backend, PostgreSQL embarqué persistant dans `backend/data/postgres` :

```powershell
Set-Location D:\Projet\backup_Project\FocusWithAkram\backend
mvn spring-boot:run "-Dspring-boot.run.profiles=local"
```

Depuis la racine dans les deux autres terminaux :

```powershell
npm run angular
npm run react
```

Angular : http://127.0.0.1:4200 ; React : http://127.0.0.1:5173 ; API : http://127.0.0.1:8080/api/v1. Les applications partagent données et paramètres. Une seule session Pomodoro active côté serveur. Recharger l’autre frontend après modification pour comparer le même état.

Sans profil local : PostgreSQL via `FOCUSFLOW_DB_URL`, `FOCUSFLOW_DB_USER`, `FOCUSFLOW_DB_PASSWORD`. `PORT` fixe le port API ; `FOCUSFLOW_BIND_ADDRESS` reste 127.0.0.1. `FOCUSFLOW_CORS_ORIGINS` remplace les origines autorisées. React : proxy `FOCUS_API_URL` (défaut http://127.0.0.1:8080). Angular : `frontend-angular/proxy.conf.json`.

## Vérifications

```powershell
npm run build:angular
npm run build:react
npm run test:angular
npm run test:react
npm run lint:angular
npm run lint:react
```

Build Angular : typecheck des templates inclus. React : `tsc --noEmit` puis Vite. Lint centralisé dans les devDependencies React : installer les deux manifests. Backend : `mvn test` depuis `backend`.

## Recette isolée

Les tests mutent exclusivement 127.0.0.1:18080. Ce port doit pointer sur une base de test indépendante, jamais sur les données personnelles.

```powershell
Set-Location D:\Projet\backup_Project\FocusWithAkram\backend
mvn spring-boot:run "-Dspring-boot.run.profiles=local" "-Dspring-boot.run.arguments=--server.port=18080 --focusflow.embedded-postgres.port=54339 --focusflow.embedded-postgres.data-dir=./target/refonte-e2e-db"
```

Libérer les ports des frontends précédents puis, depuis la racine, dans des terminaux séparés :

```powershell
# Angular
npm --prefix frontend-angular start -- --configuration production --host 127.0.0.1 --port 4200 --proxy-config proxy.e2e.json
# React
$env:FOCUS_API_URL='http://127.0.0.1:18080'
npm run build:react
npm --prefix frontend-react run preview
# Tests
npm --prefix frontend-react exec -- playwright install chromium
node frontend-react/e2e/seed.mjs
# Après un test interrompu, facultatif : node frontend-react/e2e/clean.mjs
npm run test:e2e -- --grep-invert navigation
npm run test:volume
npm run test:e2e -- --grep navigation
```

Le seed crée une fois les exemples explicites de recette. Les tests suppriment leurs tâches par ID. Volume : 120 tâches supplémentaires, nettoyées dans un `finally`. Les sessions interrompues de recette restent dans l’historique. Le scénario de calendrier utilise novembre 2026 : adapter ses dates et le mois visible lors d’une exécution ultérieure.

Rapports dans `docs/test-results/`, captures dans `docs/screenshots/`. Exécuter les captures après les suites mutantes pour comparer un état identique : Chromium, fr-FR, Europe/Paris, 1440×900, 768×1024 et 390×844.

API inaccessible : vérifier `/actuator/health`, port et proxy. 403 en écriture : vérifier Origin/CORS. PostgreSQL embarqué verrouillé : attendre l’arrêt du précédent processus, sans effacer son répertoire. Aucune clé ni compte externe requis.
