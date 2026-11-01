# Organisation des frontends

Les deux applications utilisent le même backend et les mêmes contrats dans `shared/`. Elles gardent leurs propres composants et leur propre gestion d'état. Les changements de cette réorganisation sont réalisés sur `main`.

## Angular : `frontend-angular/`

```text
src/
  app/
    core/           API, services injectables, intercepteurs et utilitaires
    features/       dashboard, tasks, eisenhower, calendar, pomodoro, etc.
    layout/         navigation, shell et palette de commandes
    shared/ui/      composants réutilisables et dialogues
  styles/           styles globaux et règles de disposition
  styles/index.css  point d'entrée des styles
```

Chaque composant possède son fichier TypeScript et un template `.html` référencé par `templateUrl`. Les styles locaux, lorsqu'ils sont nécessaires, utilisent `styleUrl` et un fichier `.css`. Ne pas créer de feuille vide si les styles partagés suffisent. Les points d’entrée publics des groupes de composants sont des fichiers `index.ts` dans leurs répertoires dédiés.

Les appels réseau restent dans `core/api`, les actions métier et interactions transversales dans des services injectables. Les pages assemblent ces services et exposent l'état du template. Les signaux et la détection `OnPush` sont conservés. Le lint interdit les propriétés `template` et `styles` inline dans les composants.

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

Depuis la racine : `npm run build:angular`, `npm run build:react`, `npm run test:angular`, `npm run test:react`, `npm run lint:angular` et `npm run lint:react`. La recette navigateur commune reste dans `frontend-react/e2e/` ; voir [le guide de lancement](exploitation.md) pour le backend de test isolé.
