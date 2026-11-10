# Organisation des frontends

Les deux applications utilisent le même backend et les mêmes contrats dans `shared/`. Elles gardent leurs propres composants et leur propre gestion d'état. Pendant la refonte v2, seul Angular évolue ; React sera adapté ensuite (voir le [suivi](../suivi/refonte-v2.md)).

## Angular : `frontend-angular/`

```text
src/
  app/
    config/         configuration de l'application et navigation (navigation.ts)
    core/           API, services injectables, intercepteurs et utilitaires
    features/       dashboard, tasks, eisenhower, calendar, pomodoro, etc.
    layout/         shell, palette de commandes et aide des raccourcis
    shared/ui/      composants réutilisables et dialogues (accessible-dialogs.ts : nom et rôle des dialogues CDK)
  styles/           styles globaux et règles de disposition
  styles/index.css  point d'entrée des styles
```

Chaque composant possède son fichier TypeScript et un template `.html` référencé par `templateUrl`. Les styles locaux, lorsqu'ils sont nécessaires, utilisent `styleUrl` et un fichier `.css`. Ne pas créer de feuille vide si les styles partagés suffisent. Les points d’entrée publics des groupes de composants sont des fichiers `index.ts` dans leurs répertoires dédiés.

Les appels réseau restent dans `core/api`, les actions métier et interactions transversales dans des services injectables. Les pages assemblent ces services et exposent l'état du template. Les signaux et la détection `OnPush` sont conservés. Le lint interdit les propriétés `template` et `styles` inline dans les composants.

### Conventions Angular

- **Navigation** : `config/navigation.ts` est la source unique. Le menu latéral, la barre mobile (entrées `mobile`, quatre au plus), le menu « Plus », la palette de commandes et les raccourcis « G puis touche » en sont dérivés. Ajouter une page = une route dans `routes/app.routes.ts` et une entrée dans `NAV` ; un test vérifie que chaque entrée a sa route et que les touches sont uniques.
- **Chargement** : `core/util/loader.ts` (`Loader`) relit ses données quand un signal lu par `fetch` change ou quand `RefreshService.bump()` est appelé après une mutation ; un nouveau chargement **annule** la requête précédente.
- **Recherche** : les champs de saisie libre passent par `debounced()` (`core/util/debounced.ts`, 250 ms) avant d'alimenter un `Loader`.
- **Mes achats** : `features/finance/` (organisation du lot 13 ; règles : [feuille du mois](../produit/mes-achats/feuille-du-mois.md)).
  - **Onglets** : `finance.routes.ts` déclare les onglets en routes enfants sous `/finance` : `month` (**Mon mois**, par défaut), `operations` (**Opérations**), `purchases` (**Projets d’achat**), `analyses` (**Analyses**), et `settings` (**⚙ Réglages** : compte unique, préférences, catégories). Les anciennes adresses sont redirigées : `overview`, `budget`, `loans` → `month` ; `schedules` → `operations?vue=recurrents` ; `statistics` → `analyses` ; `calendar` → `analyses?vue=calendrier`.
  - **Vues par paramètre d’adresse** : une vue secondaire d’un onglet est un paramètre `vue`, pas une route : `operations?vue=recurrents` (revenus et charges récurrents, sinon historique), `analyses?vue=calendrier` (calendrier, sinon statistiques). L’adresse reste explicite et partageable.
  - **Mon mois** : la page affiche `MonthSheet` (`GET /finance/months/{AAAA-MM}/sheet`) section par section — revenus, dépenses fixes, dépenses variables plafonnées, autres dépenses — avec prévu, réel et écart, puis l’épargne prévue et réelle face à l’objectif. Les totaux viennent du serveur ; le client ne refait aucun calcul financier.
  - **Visite guidée** : ouverte à la première visite tant que `FinancePreferences.tutorialDone` est faux, relançable par le bouton **?** de l’en-tête ; étapes ancrées sur des attributs `data-tour` (`finance-tabs`, `quick-expense`, `tour-button` dans l’en-tête ; `month-nav`, `month-summary`, `month-income`, `month-fixed`, `month-variable`, `month-others` dans la feuille), avec **Suivant**, **Précédent**, **Passer** ; terminer ou passer enregistre `tutorialDone`. Un nouvel écran qui doit figurer dans la visite pose son attribut `data-tour`. Depuis le lot 14, elle repose sur le composant partagé `ff-tour` (voir **Visites guidées** ci-dessous) : `FinanceTourService` (étapes dans `components/finance-tour/tour-steps.ts`) étend `TourEngine` et le shell affiche `<ff-tour [engine]="tour" />` ; l’ancienne enveloppe `ff-finance-tour` est supprimée, le comportement est inchangé.
  - **Bulles d’aide** : composant d’infobulle `ff-help-tip` (icône ?), placé à côté d’un titre de section ou d’une notion (prévu, réel, plafond, épargne, « à partir de », « ce mois seulement ») ; utilisable au clavier et annoncé par les lecteurs d’écran.
  - **Composants** : dialogues d’opération (catégorie facultative pour un revenu), de compte (premier accès par le total disponible, renommage), de revenu prévu (un mois ou une période), de catégorie, de montant, d’échéancier, de budget, d’objectif avec aperçu de faisabilité, d’achat, de date ; panneau de simulation « Et si… ? » ; carte d’objectif ; ligne d’opération, qui gère aussi les échéances virtuelles sans identifiant. Services : `FinanceActions` pour les actions, `FinanceReferenceStore` pour le compte unique et les catégories. Les dialogues et pages des prêts sont supprimés.
  - La saisie rapide (`quick-expense.ts`) est chargée à la demande depuis le raccourci et la palette. Contrats dans `shared/finance.ts` ; montants formatés et saisis par `core/util/money.ts` (virgule acceptée, deux décimales, aucun calcul financier côté client ; seuls des totaux d’affichage sont additionnés en centimes entiers par `money-sum.ts`).
- **Matrice d’Eisenhower — tutoriel** (lot 15) : `features/eisenhower/components/matrix-tour/` — `MatrixTourService` étend `PageTourEngine`, étapes et grille `EISENHOWER_MATRIX` (disposition `matrix`) dans `matrix-tour-steps.ts` ; démarré seul à la première visite de `/matrix` tant que `Settings.matrixTutorialDone` est faux, relancé par le bouton **Comment ça marche ?** de l’en-tête. Cibles `data-tour` : `matrix-new-task`, `matrix-tabs` (visibles sous 64rem seulement : étape sautée sur ordinateur), `matrix-grid`, `matrix-task` (posé sur la première carte de chaque quadrant ; la première visible est retenue, étape sautée sans tâche), `matrix-filters`, `matrix-tour-button` ; la première et la sixième étape sont centrées et affichent la grille (Q2 mise en avant à la sixième). Terminer ou passer enregistre `matrixTutorialDone` ; quitter la page interrompt sans enregistrer.
- **Dialogues** : ouverts par le service `Dialog` du CDK. Chaque composant de dialogue déclare sur sa racine `role="dialog"` (ou `alertdialog` pour une confirmation) et `aria-labelledby` vers son titre ; `provideAccessibleDialogs()` (`shared/ui/accessible-dialogs.ts`, déclaré dans `app.config.ts`) reporte ce nom, la description et le rôle sur le conteneur CDK et rend les dialogues modaux (`aria-modal`), pour qu’un lecteur d’écran n’annonce qu’un dialogue nommé. Pendant un dialogue, le reste de la page est masqué aux lecteurs d’écran : une erreur d’enregistrement s’affiche donc aussi dans le dialogue.
- **Visites guidées** (lot 14) : `shared/ui/tour/`, commun à Mes achats et à Notes & idées.
  - `tour-model.ts` : étape `TourStep` (titre, texte, `target` facultatif = valeur d’un attribut `data-tour` ; sans cible, la bulle est centrée) et schéma facultatif `TourDiagram { label, stages[{icon, title, text, tone: amber | violet | green | blue}], focus? }` ; calculs de placement de la bulle autour de la cible.
  - `tour-engine.ts` : classe abstraite `TourEngine` (étapes, étape courante, suivant, précédent, passer, arrêter, `begin()`) ; chaque module l’étend et implémente `markDone()` pour enregistrer sa préférence. Une étape dont la cible est absente est sautée.
  - `tour.ts`, `tour.html`, `tour.css` : composant `ff-tour` (entrée `engine`) : projecteur sur la cible, bulle de dialogue (Échap = Passer), rendu du schéma. Le schéma est une liste ordonnée nommée par `label` ; l’étape `focus` porte `aria-current="step"` et les autres passent en couleurs neutres ; les flèches sont dessinées en CSS (non lues par les lecteurs d’écran) ; les tons viennent des tokens du thème (clair et sombre) ; disposition verticale sur téléphone.
  - Schéma en matrice (lot 15) : `TourDiagram.layout` vaut `'flow'` (étapes en suite, par défaut) ou `'matrix'` (grille 2 × 2 avec `axes`, `TourStage.badge` Q1–Q4 et tons `q1`–`q4` des quadrants ; reste en 2 × 2 sur téléphone ; axes `aria-hidden`).
  - `page-tour.ts` (lot 15) : classe abstraite `PageTourEngine` qui étend `TourEngine` pour un tutoriel de page : démarrage seul à la première visite (`autoStart()`), lancement ou relance avec navigation (`navigateByUrl`) vers la page, attente des cibles prêtes, enregistrement d’un `TutorialSetting` (`'notesTutorialDone' | 'matrixTutorialDone'`) par `SettingsStore`. `TourEngine.element()` renvoie le premier élément **visible** portant un marqueur `data-tour` (utile quand le marqueur est répété, comme la première carte de tâche).
  - Ajouter une visite : un service qui étend `PageTourEngine` (ou `TourEngine` avec son propre `markDone()`), des attributs `data-tour` dans les templates, `<ff-tour [engine]="…" />` dans la page.
- **Notes & idées** : `features/notes/` — `notes.routes.ts` (liste `/notes`, écran `/notes/categories`, éditeur `/notes/:id`), `pages/` (liste, éditeur avec enregistrement automatique des champs modifiés, catégories), `components/` (`note-editor` à deux modes, dialogue de saisie rapide, dialogue de catégorie), `services/note-actions.service.ts` (saisie rapide, transformation en tâche, suppression bloquée ou forcée, catégories), `util/markdown.ts` (actions de la barre d’outils et cases à cocher, fonctions pures testées). La saisie rapide (`quick-note.ts`, touche I et palette) est chargée à la demande. Contrats dans `shared/notes.ts`, API dans `core/api/notes.api.ts`. **Éditeur** : le contenu reste du Markdown ; le mode visuel et l’aperçu utilisent Tiptap 3 (`@tiptap/core`, `starter-kit`, `extension-list`, `extensions`, `markdown`, versions figées), chargé uniquement avec la page de l’éditeur (chunk paresseux d’environ 130 Ko compressés). Le mode Markdown modifie le texte par l’édition native du navigateur pour que Ctrl+Z annule les actions de la barre d’outils ; une case cochée dans l’aperçu modifie seulement la ligne correspondante du texte. La transformation en tâche **réutilise** `TaskFormDialogComponent` (`TaskFormData.fromNote`) : pas de second formulaire. **Tutoriel** (lot 14) : `components/notes-tour/` — `NotesTourService` étend `PageTourEngine` depuis le lot 15 (comportement inchangé), étapes et schéma `IDEA_FLOW` dans `notes-tour-steps.ts` ; la page de liste le démarre seule à la première visite tant que `Settings.notesTutorialDone` est faux, le bouton **Comment ça marche ?** le relance (en rouvrant la liste si besoin). Cibles `data-tour` : `notes-capture` (saisie rapide), `notes-list` (grille ou état vide), `notes-categories`, `notes-views`, `notes-tour-button` ; la première et la cinquième étape sont centrées et affichent le schéma (Nouvelle idée, Brainstorming, Transformation en tâches ; étape 3 mise en avant à la cinquième). Terminer ou passer enregistre `notesTutorialDone` par `PATCH /settings` ; quitter la page interrompt le tutoriel sans enregistrer. **Onglets** (10 novembre 2026) : `services/note-tabs.service.ts` (`NoteTabs`, signal des onglets `{ id, title, color }` conservé dans `localStorage` sous `ff.notes.tabs`, relecture tolérante, synchronisation entre fenêtres par l’événement `storage` ; ouverture sans doublon, fermeture, voisin à afficher), `components/note-tabs/` (`ff-note-tabs`, barre `nav` « Onglets des idées » : lien « Notes & idées » puis un lien par idée avec `aria-current="page"` et un bouton de fermeture ; croix, clic molette, Suppr ; menu « Fermer les autres / tous » ; focus rendu à l’onglet voisin). L’éditeur ouvre l’onglet après le chargement de l’idée (pas après sa destruction), le tient à jour (titre saisi, couleur de catégorie), le ferme sur un 404 ; `NoteActions.remove` le ferme ; la liste rafraîchit les titres. Changer d’onglet **recrée** l’éditeur : `core/routing/route-reuse.strategy.ts` (`AppRouteReuseStrategy`, fourni dans `app.config.ts`) ne réutilise pas un composant dont la route est marquée `recreateOnParamChange` quand ses paramètres changent ; l’éditeur quitté enregistre ainsi sa saisie en attente, et rouvrir aussitôt la même idée attend la fin de cet envoi. **Barre d’outils collée** (10 novembre 2026) : `.note-sticky` (barre d’outils et formulaire de lien) en `position: sticky` sous `--app-header-height` (variable de `styles/base.css`, hauteur de la barre supérieure du shell) ; le cadre de l’éditeur passe de `overflow: hidden` à `overflow: clip`, qui ne crée pas de conteneur de défilement ; ombre quand la barre est collée par une requête `@container scroll-state(stuck: top)` (amélioration progressive) ; sur téléphone, une ligne qui défile horizontalement. En mode Visuel, `handleScrollToSelection` (ProseMirror) fait défiler la page quand le curseur remonte sous la barre collée. Le panneau des tâches de l’éditeur colle désormais sous la barre supérieure (`top: calc(var(--app-header-height) + 1rem)`). **Surlignage** (10 novembre 2026) : marque Tiptap `NoteHighlight` (`editor/highlight.ts`, attribut `color` parmi `yellow`, `red`, `sky`, `violet`, rendu `<mark class="note-mark" data-color>`, commandes `toggleHighlight` / `setHighlight` / `unsetHighlight`, Ctrl+Maj+H, règles de saisie et de collage `==texte==`) avec son analyseur Markdown en ligne ; syntaxe et application au texte du mode Markdown dans `util/highlight.ts` (fonctions pures testées) ; couleurs claires et sombres en variables `--note-hl-*` dans `editor/note-prose.css` ; `visualLosses` ignore les balises `<mark>` ; dernière couleur choisie dans `localStorage` (`ff.notes.highlight`). Côté serveur, `NoteMapper.excerpt` retire `==` (hors comparaisons) et les balises `<mark>`. **Export** (10 novembre 2026) : un bouton « Exporter » (menu CDK) dans `pages/note/` ; Markdown par `noteToMarkdownFile` (`util/markdown-blocks.ts`, nom de fichier `noteFileName`) ; PDF par `util/note-pdf.ts` (`notePdfDefinition`, fonction pure : document ProseMirror → définition pdfmake, couleurs du thème clair, cases à cocher dessinées, code coloré par `noteLowlight`) et `util/note-pdf-export.ts` (`noteToPdf` : analyse du Markdown par un éditeur Tiptap sans affichage, puis pdfmake). pdfmake **0.3.13** (version figée, avec `@types/pdfmake` 0.3.3), police Roboto (`vfs_fonts`) et police standard Courier pour le code (`pdfmake-fonts.d.ts` la déclare) sont chargés par `import()` au premier export : morceaux paresseux d’environ 250 et 310 Ko compressés, chargement initial inchangé ; `angular.json` les déclare dans `allowedCommonJsDependencies`.
- **Erreurs** : l'intercepteur convertit tout échec HTTP en `AppError` (`core/api/app-error.ts`) et affiche lui-même les conflits, erreurs serveur et pertes réseau (`notified = true`). Les appelants utilisent `ToastService.errorFrom(e, repli)`, qui n'affiche que ce qui ne l'a pas déjà été ; les erreurs 400/404/422 restent à la charge de l'appelant (formulaires).

## React : `frontend-react/`

```text
src/
  app/              fournisseurs et configuration de navigation
  core/
    api/            transport HTTP, requêtes, téléchargements et QueryClient
    state/          état applicatif et accès au contexte
    settings/       paramètres par défaut
    pomodoro/       persistance du minuteur
    utils/          utilitaires sans rendu
  features/
    tasks/          composants, actions, contexte et types des tâches
    dashboard/
      pages/dashboard/  dashboard-page.tsx, dashboard-page.view.tsx,
                        use-dashboard-page.ts
      styles/           dashboard.css
    .../            même découpage pour les autres pages
  layout/           shell, palette et logique de navigation
  shared/
    ui/             composants visuels réutilisables
    charts/         graphiques
    styles/         adaptation des données aux variables CSS
  styles/           fondations, layout, composants, domaines, responsive
  styles/index.css  imports dans l'ordre de la cascade
  main.tsx          montage de l'application
```

Une page `*-page.tsx` relie son hook `use-*-page.ts` à sa vue `*-page.view.tsx`. Le hook contient les requêtes, l'état et les actions ; la vue contient le JSX et branche les événements. Les composants interactifs réutilisables peuvent conserver leur état local, par exemple la référence du dialogue accessible.

React utilise des vues JSX typées dans des fichiers `.tsx`, et non des templates `.html` externes. Les modules `.ts` de logique ne contiennent pas de JSX. Les règles visuelles restent dans les feuilles CSS. Les valeurs réellement dynamiques (couleur d'un projet, progression, intensité d'un graphique) sont transmises par des variables CSS ; elles ne dupliquent pas les règles de présentation. L'ordre des imports CSS préserve la cascade existante.

Les contextes ont un accès contrôlé : un hook utilisé sans son fournisseur signale explicitement l'erreur de composition. Les types des contextes sont importés avec `import type` pour éviter une dépendance d'exécution vers les hooks qui les alimentent.

## Convention de dossiers

Chaque page et chaque composant disposent de leur propre répertoire. Les fichiers du même composant restent ensemble ; les services, hooks partagés, types et constantes vont dans des répertoires nommés selon leur responsabilité. Les dossiers `pages/` et `components/` contiennent des sous-dossiers, pas une liste de fichiers de composants.

Exemple Angular :

```text
features/eisenhower/pages/matrix/
  matrix.page.ts
  matrix.page.html
  matrix.page.css
features/tasks/
  pages/tasks/
  components/task-card/
  components/task-form/
  components/task-detail/
  services/task-actions.service.ts
shared/ui/dialogs/confirm-dialog/
  confirm-dialog.component.ts
  confirm-dialog.html
  confirm-data.ts
```

Exemple React :

```text
features/tasks/
  pages/tasks/
    tasks-page.tsx
    tasks-page.view.tsx
    use-tasks-page.ts
  components/task-row/
  context/
  hooks/
  types/
  styles/tasks.css
layout/app-shell/
  app-shell.tsx
  app-shell.view.tsx
  use-app-shell.ts
tests/
  components/
  domain/
```

Les styles de domaine React sont regroupés dans `features/<domaine>/styles/`, car ils sont utilisés par plusieurs composants. Les styles globaux sont dans `styles/`, avec `index.css` comme point d’entrée dans les deux applications. Les fichiers imposés par le framework (`main.ts`, `main.tsx`, `index.html`) et les configurations d’outillage restent à leur emplacement standard.

Cette organisation des dossiers ne signifie pas que tous les utilitaires Tailwind ont été retirés des autres templates Angular. La page matrice utilise des classes sémantiques ; les autres templates conservent encore des utilitaires.

## Principes de maintenance

- **Responsabilité unique** : distinguer transport, état, actions, rendu et styles ; un composant réutilisable par fichier.
- **Composition** : construire les pages avec des composants et hooks ciblés plutôt qu'avec une hiérarchie de classes.
- **Contrats typés** : réutiliser les DTO partagés, des props explicites et les types de retour des hooks. Éviter les interfaces ajoutées sans besoin de substitution.
- **Dépendances explicites** : services injectés dans Angular, props et fournisseurs dans React ; pas d'appels réseau dans les feuilles de présentation des pages.
- **Évolution locale** : une nouvelle fonctionnalité possède son dossier ; les éléments partagés ne doivent accueillir que du code effectivement réutilisé.

La séparation des fichiers n'élimine pas à elle seule tous les couplages : l'état applicatif React centralise encore la coordination du minuteur, des paramètres et des notifications. Sa décomposition future doit préserver les règles de session et être accompagnée de tests de comportement.

## Vérification

Depuis la racine : `npm run build:angular`, `npm run build:react`, `npm run test:angular`, `npm run test:react`, `npm run lint:angular` et `npm run lint:react`. Le lint Angular est autonome (`npm --prefix frontend-angular run lint`). La recette navigateur commune reste dans `frontend-react/e2e/` ; voir [le guide de lancement](exploitation.md) pour le backend de test isolé.
