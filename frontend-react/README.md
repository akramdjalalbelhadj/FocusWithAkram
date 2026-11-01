# FocusWithAkram — React

Depuis la racine du dépôt : `./start_react.ps1` (PowerShell) ou `bash ./start_react.sh` (Bash). Le lanceur démarre aussi le backend local. Pour utiliser un backend déjà lancé, exécuter `npm run react` depuis la racine.

Interface : `http://127.0.0.1:5173`. Le proxy `/api` cible `http://127.0.0.1:8080` par défaut ; `FOCUS_API_URL` permet de le modifier.

Les pages sont organisées par fonctionnalité dans `src/features`. Chaque page assemble une vue `.view.tsx` et un hook `.ts`. Les composants réutilisables sont dans `src/shared`, le transport et l'état applicatif dans `src/core`, les règles CSS dans `src/styles`.

Depuis ce dossier : `npm run build`, `npm test`, `npm run lint`.

Voir [l'architecture commune](../docs/frontend-architecture.md) et [le guide de lancement et de recette](../docs/how-to-run-frontends.md).
