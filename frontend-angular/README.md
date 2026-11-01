# FocusWithAkram — Angular

Depuis la racine du dépôt : `.\scripts\start_angular.ps1` (PowerShell) ou `bash ./scripts/start_angular.sh` (Bash). Le lanceur démarre aussi le backend local. Pour utiliser un backend déjà lancé, exécuter `npm run angular` depuis la racine.

Interface : `http://127.0.0.1:4200`. Le proxy est défini dans `proxy.conf.json` ; les lanceurs adaptent automatiquement sa cible lorsque le port backend est personnalisé.

Les composants utilisent des templates HTML externes et des feuilles CSS locales lorsqu'ils ont des styles spécifiques. L'application est organisée en `core`, `features`, `layout` et `shared/ui`. Les styles globaux sont dans `src/styles`.

Depuis ce dossier : `npm run build`, `npm test -- --watch=false`. Le lint se lance depuis la racine avec `npm run lint:angular`.

Voir [l'architecture commune](../docs/technique/architecture-frontend.md) et [le guide de lancement et de recette](../docs/technique/exploitation.md).
