# Audit initial — 1 novembre 2026

État de référence : commit `ca46e18`, branche de travail `codex/frontend-refonte`. Travail utilisateur conservé : suppression de docs/DOCUMENTATION_FONCTIONNELLE.md, documentation déplacée dans docs/docs/, prompt et références non suivis. Aucun reset ni déplacement des sources.

## Topologie vérifiée
- `backend/` : Java 25, Spring Boot 4.1.2, PostgreSQL, Flyway, Maven. Écoute 127.0.0.1:8080, sans authentification. Profil local PostgreSQL embarqué persistant ; tests avec base séparée.
- `frontend-angular/` : Angular 22.2, standalone, OnPush, signals, HttpClient/RxJS, CDK drag/drop/dialog/menu, Tailwind 4, ECharts, Lucide et Inter local. Neuf routes lazy existantes. Scripts start/build/test ; aucun lint configuré.
- `frontend-react/` : nouveau frontend indépendant prévu sur 5173. Proxy vers le même backend ; pas de backend Node.
- Node système 22.12.0 incompatible avec Angular actuel : runtime Node 24 local dans .tools, ignoré par Git.

## Sources et références
La documentation réelle est `docs/docs/DOCUMENTATION_FONCTIONNELLE.md`. Les 14 images ont été ouvertes individuellement. L'index demandé est absent ; les PNG sont à plat dans `docs/references/`. Matrice_Eisenhower et Calendrier sont les références prioritaires, les dix FocusWithAkram_* les autres références. matrice-light/dark sont exclus des références canoniques. Les images ne sont pas utilisées comme interface.

## Contrats effectivement présents
API `/api/v1` : tasks (CRUD, status, quadrant, reorder, start, complete, restore, duplicate, timeline, executions, subtasks, priorities, archives/facets), eisenhower/matrix, projects, tags, dashboard/summary et top3, pomodoro/sessions et active/pause/resume/complete/cancel, pomodoro/history/daily, statistics/productivity, settings, search, export/tasks, export/backup, import avec dryRun.

DTO TypeScript existants alignés sur ces contrôleurs. Pagination `{items,page,size,totalItems,totalPages}`. Erreurs ProblemDetail avec code et detail. Dates ISO UTC, présentation dans settings.timeZone. Les échéances ne sont pas des créneaux inventés. Quadrants dérivés d'important/urgent. Terminer exige un début réel ; restauration conserve les cycles. Reorder accepte une liste ordonnée et déplace les tâches vers le quadrant cible. Aucun changement métier serveur nécessaire.

## Écarts initiaux
La matrice possède un sous-titre à retirer ; palette indigo et cartes compactes différentes des références. Calendrier : détail du jour sous la grille au lieu du panneau latéral ; cellules non accessibles au clavier. Dashboard : six indicateurs déjà présents (à garder malgré les quatre des PNG). Tests Angular dates/minuteur présents ; pas d'E2E, pas de lint, pas de React. Le prompt exige une comparaison complète : elle ne pourra être déclarée acquise qu'après builds, tests et captures.
