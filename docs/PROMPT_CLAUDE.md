# MISSION — FocusWithAkram / Focus Suite Akram
**Édition 2 — Références visuelles mises à jour : 14 maquettes individuelles, 7 pages × 2 thèmes.**

## Refonte UI/UX complète en deux frontends comparables : Angular et React

Tu agis comme une équipe senior réunissant : **architecte logiciel frontend**, **expert Angular**, **expert React**, **designer produit UI/UX premium**, **ingénieur accessibilité**, **ingénieur tests E2E** et **expert intégration Spring Boot**.

Ta mission est **d'inspecter le dépôt existant puis de réaliser effectivement, dans le code**, deux implémentations frontend distinctes de la même application de productivité :

1. **Angular** : moderniser le frontend Angular existant, en préservant son fonctionnement, ses services et ses contrats API autant que possible.
2. **React** : créer un frontend React + TypeScript + Vite distinct, connecté au **même backend Spring Boot** et offrant les **mêmes fonctionnalités** et une **qualité visuelle équivalente**.

Le but est de pouvoir démarrer les deux applications, naviguer sur les mêmes pages, comparer objectivement UX, fidélité aux maquettes, fluidité, performances, complexité du code, accessibilité et maintenabilité, puis choisir un frontend définitif **sans avoir à refaire le travail**.

**IMPORTANT : ne réponds pas uniquement par un plan, une architecture théorique, des prototypes HTML ou une liste de recommandations. Tu dois produire les fichiers, écrire le code, démarrer ou compiler les applications, exécuter les tests disponibles et documenter les résultats réellement obtenus.** Travaille de façon incrémentale en conservant une base fonctionnelle à chaque étape.

---

## 0. Entrées, sources et hiérarchie des exigences

Lis d'abord attentivement les fichiers joints et le dépôt :

- `docs/DOCUMENTATION_FONCTIONNELLE.md` (ou le chemin réel du fichier fourni) : **source principale pour les fonctionnalités et règles métier actuellement implémentées**. Ce document décrit notamment le tableau de bord, la matrice d'Eisenhower, les tâches, la planification, le Pomodoro, ses historiques, le calendrier, les projets, les archives, les statistiques, les paramètres, les raccourcis et les limites connues.
- `references/INDEX_DESIGN.md` : **index obligatoire des 14 maquettes individuelles**, chemins exacts, ordre de priorité et règles de lecture.
- `references/matrice/matrice-clair.png` et `references/matrice/matrice-sombre.png` : **matrice explicitement validée**, thèmes clair et sombre.
- `references/calendrier/calendrier-clair.png` et `references/calendrier/calendrier-sombre.png` : **calendrier décliné en deux images indépendantes**, thèmes clair et sombre.
- Pour chacune des cinq autres pages illustrées, lire **les deux images individuelles** dans `references/` : Tableau de bord, Mes tâches, Focus/Pomodoro, Statistiques et Projets (index complet ci-dessous).
- Le frontend Angular actuel, le backend Spring Boot, leurs DTO, endpoints, validations, tests, contrats et fichiers de configuration.

**Priorités en cas de contradiction :**
1. Vérité fonctionnelle : code backend et contrats API effectivement présents ; ne jamais inventer un endpoint ou une donnée.
2. Spécification fonctionnelle fournie, sauf si elle contredit l'état vérifié du backend : consigne l'écart et adopte une stratégie compatible et non destructive.
3. Contraintes UI/UX explicitement décidées pendant la conception (par exemple, **Matrice = seulement quatre quadrants, sans panneau droit ni timer**).
4. Maquettes individuelles de référence, sous réserve du modèle métier réel ; index et priorité précisés en §0.1.
5. Choix techniques d'implémentation des bibliothèques.

Les textes, nombres, dates et tâches visibles dans les **images** sont des exemples graphiques, pas des données à coder en dur. La présentation peut les utiliser comme fixtures de test explicites, mais l'application normale doit afficher de **vraies données issues de Spring Boot**. Ne copie pas d'éventuelles erreurs de texte ni les dates anciennes des images.

Les références proviennent de designs générés ; **reconstitue les éléments d'interface en composants HTML/CSS**, sans intégrer la maquette comme une grande image de fond. Les illustrations décoratives peuvent être réalisées en CSS/SVG local si elles sont utiles et simples à maintenir.

## 0.1. Index des références UI/UX — nouvelle édition (14 images séparées)

**Lis et compare effectivement chaque image** en ouvrant son fichier, et pas seulement son nom. Le pack contient **sept pages dotées de deux captures chacune**. Tu dois produire **une page HTML/CSS réelle pour chaque référence visuelle dans chacun des deux frameworks** et non afficher les PNG comme interface.

| Page | Version claire | Version sombre | Interprétation |
|---|---|---|---|
| Matrice d'Eisenhower | `references/matrice/matrice-clair.png` | `references/matrice/matrice-sombre.png` | **Référence visuelle prioritaire et explicitement validée** |
| Calendrier | `references/calendrier/calendrier-clair.png` | `references/calendrier/calendrier-sombre.png` | **Référence visuelle prioritaire**, une image par thème |
| Tableau de bord | `references/tableau-de-bord/tableau-de-bord-clair.png` | `references/tableau-de-bord/tableau-de-bord-sombre.png` | Direction visuelle des composants, à réconcilier avec les six indicateurs documentés |
| Mes tâches | `references/mes-taches/mes-taches-clair.png` | `references/mes-taches/mes-taches-sombre.png` | Direction visuelle des listes, filtres et panneau de détail |
| Focus / Pomodoro | `references/focus-pomodoro/focus-pomodoro-clair.png` | `references/focus-pomodoro/focus-pomodoro-sombre.png` | Direction visuelle du minuteur, objectif et historique |
| Statistiques | `references/statistiques/statistiques-clair.png` | `references/statistiques/statistiques-sombre.png` | Direction visuelle des indicateurs, graphiques, heatmap |
| Projets | `references/projets/projets-clair.png` | `references/projets/projets-sombre.png` | Direction visuelle des cartes, avancement, actions |

**Niveau de référence :** la Matrice a été explicitement affinée et validée par l'utilisateur, y compris suppression des widgets de droite et du sous-titre. Le Calendrier dispose de versions séparées demandées expressément. Les cinq autres paires définissent une **direction artistique cohérente à intégrer**, mais ne doivent pas être traitées comme des modifications validées du modèle métier. Les PNG générés sont des prototypes visuels : leurs chiffres, badges, dates, priorités, éléments décoratifs et parfois libellés ne constituent pas la spécification fonctionnelle.

**Absence d'images finales :** Archives et Paramètres n'ont pas encore de maquettes individuelles dédiées ; applique strictement le design system des sept pages illustrées, la documentation fonctionnelle et les composants communs. Ne les omets pas et n'invente pas d'images de référence inexistantes.

**Ne pas mélanger des générations anciennes :** les fichiers des explorations précédentes (collages, première matrice avec panneau droit, ancien calendrier sur une seule image) **ne sont pas les références canoniques**. En particulier, la Matrice définitive n'a **ni chronomètre, ni aperçu de journée, ni “Focus de la semaine”, ni texte d'accroche**, même si ces éléments sont présents dans une ancienne exploration. Les références canoniques se trouvent **uniquement dans les 14 chemins ci-dessus**.

**Définition de fidélité visuelle :** même structure, même densité, même position des composants, même logique des couleurs, mêmes proportions, arrondis, typographie, néon discret sur la sidebar active, nuances des cartes, ombres et organisation des contrôles, à fonctionnalité et données équivalentes. Les micro-différences propres aux navigateurs peuvent être acceptables, mais pas un changement d'identité visuelle ni une page réduite à une liste générique. Ne sacrifie jamais l'accessibilité ou la vérité métier pour imiter une erreur dans un PNG.

## 1. Audit obligatoire du dépôt avant toute modification

Effectue une inspection effective et produis un résumé vérifiable :

- Topologie du dépôt : répertoires, framework et versions réelles, scripts npm, gestionnaire de paquets, configuration build, UI library existante, composants et styles globaux.
- Backend Java/Spring Boot : version, contrôleurs REST, schémas de données, DTO, paramètres, CORS/proxy, pagination, codes d'erreur, gestion de dates/UTC/fuseaux, contraintes métier, éventuel OpenAPI.
- Routes et modules Angular déjà présents, composants réutilisables, services HTTP, state management, formulaires, tests, code mort et éventuels raccourcis.
- Fonctionnalités prouvées par le code versus documentées versus manquantes ; note les différences plutôt que les cacher.
- Contraintes de fonctionnement : application personnelle locale, **sans authentification** selon la documentation ; n'ajoute pas de faux login et n'expose pas le backend publiquement.

Avant de modifier, sauvegarde un état de référence (commit Git local si approprié et sans toucher au travail non commité, ou branche de travail clairement identifiée). **Ne supprime, n'écrase ni ne force-push aucun travail utilisateur.** Ne déplace pas le backend ou le frontend Angular original de façon risquée uniquement pour obtenir une structure idéale.

Crée `docs/frontend-audit.md` présentant les constats et les écarts entre documentation et réalité du code.

## 2. Deux frontends réellement séparés, même backend

Organise le dépôt de préférence ainsi, si c'est compatible avec sa structure existante :

```text
project-root/
├── backend/                      # backend Spring Boot existant, chemin adaptable
├── frontend-angular/             # frontend Angular existant, modernisé
├── frontend-react/               # nouveau frontend React + TS + Vite
├── shared/                       # facultatif : contrats TS, utilitaires purs, tokens, icônes SVG
│   ├── api-contracts/
│   └── design-tokens/
├── references/                   # 14 maquettes canoniques + index
└── docs/
    ├── DOCUMENTATION_FONCTIONNELLE.md
    ├── frontend-audit.md
    ├── frontend-design-system.md
    ├── frontend-feature-parity.md
    ├── frontend-visual-regression.md
    ├── frontend-comparison.md
    └── how-to-run-frontends.md
```

Si Angular est déjà à la racine ou dans un autre chemin, **préserve-le** et adapte l'arborescence, en la documentant. La sécurité de la migration prime sur l'élégance des dossiers.

Contraintes impératives :

- Un **seul backend Spring Boot** et une seule logique métier serveur ; aucun backend React parallèle, aucun nouveau service métier en Node.js.
- Deux processus frontend démarrables indépendamment, chacun avec un port local différent, des variables d'environnement ou proxy API appropriés.
- Les deux frontends utilisent les **mêmes vrais endpoints et les mêmes DTO** ; réutilise OpenAPI/génération de types si le projet le permet, sinon types TS partagés indépendants des frameworks.
- Aucun code de composants React dans Angular ni composants Angular dans React. Partage éventuel limité aux tokens, contrats API, assets, types et fonctions TypeScript pures si la maintenance en bénéficie.
- Les deux applications doivent pouvoir accéder aux mêmes données de test du backend, mais les tests destructifs doivent être isolés / réinitialisables pour éviter qu'un test d'une variante ne perturbe l'autre.
- Possibilité de comparer les écrans côte à côte avec état équivalent : même compte local, mêmes tâches, même fuseau, même date sélectionnée et même thème.
- Ne crée pas de stockage local concurrent qui remplace la persistance du serveur. Le localStorage ne doit servir qu'aux préférences UI appropriées et à l'éventuelle copie d'affichage prévue dans la spécification.

## 3. Choix techniques adaptés à chaque framework

**Angular — respecter sa version actuelle quand possible :**
- Conserver Angular + TypeScript et les conventions déjà présentes ; moderniser vers les API appropriées à la version installée (standalone components, signals, formulaires typés, `OnPush`, etc. si compatibles et réellement justifiés).
- Tailwind CSS si cela ne casse pas le build ni ne crée de conflit injustifié avec le CSS existant ; sinon CSS/SCSS organisé et tokens centralisés.
- Angular CDK Drag & Drop pour la matrice.
- Composants accessibles via Angular CDK, composants personnalisés ou spartan/ui si sa compatibilité a été confirmée ; ne pas installer une bibliothèque entière pour deux boutons.
- `HttpClient` et services API typés ; architecture de state management proportionnée à la complexité existante.
- Calendrier personnalisé ou adaptateur FullCalendar Angular compatible avec la version observée.

**React — créer une application maintenable et non une démonstration artificielle :**
- React + TypeScript + Vite, versions stables et compatibles réellement disponibles au moment de l'installation.
- React Router (ou équivalent maintenu) pour conserver la logique de navigation.
- Tailwind CSS et composants personnalisables, shadcn/ui uniquement là où il accélère la création de vrais contrôles ; pas de template de dashboard générique.
- dnd-kit ou autre solution de drag & drop React maintenue, compatible et accessible.
- TanStack Query pour le server-state si pertinent, sans multiplier inutilement les magasins de données ; formulaires et validations fortement typés.
- FullCalendar React ou calendrier sur mesure selon la fidélité au design et les opérations réellement supportées par le backend.

**Règle de sélection :** vérifie dans les documentations officielles les versions, licences, peer dependencies, limitations et compatibilités. N'invente pas de numéros de version. Les composants premium/commerciaux ne doivent pas être introduits sans nécessité ni accord. Si FullCalendar rend l'aspect souhaité trop difficile, privilégie une grille personnalisée mais préserve correctement toutes les interactions de calendrier déjà implémentées.

## 4. Identité visuelle commune : à reproduire sans tomber dans le dashboard générique

L'utilisateur a **explicitement validé l'identité de la Matrice** et demandé sa déclinaison sur le Calendrier et les cinq autres pages illustrées. Ce n'est PAS une demande de nouveau style libre : reconstruis fidèlement leur identité. Respecte les nuances de validation précisées en §0.1.

Principes :

- Interface SaaS premium, sobre, moderne, expressive, visuellement distinctive.
- Arrondis généreux mais cohérents ; surfaces légèrement teintées ; contrastes soignés ; hiérarchie typographique nette ; espacements équilibrés.
- Palette de quatre quadrants stables : **Q1 corail/rouge**, **Q2 bleu/cyan**, **Q3 ambre/orange**, **Q4 violet**.
- Violet électrique pour l'identité de marque, la navigation active et le bouton principal « + Nouvelle tâche ».
- **Effet néon discret sur l'élément actif de la barre latérale** (bordure et `box-shadow` CSS) ; interactions hover/focus élégantes, jamais flash agressif.
- Fonds **simples à coder** : couleur de base, éventuellement un ou deux `radial-gradient` / `linear-gradient` CSS légers. Pas d'arrière-plan 3D, particules animées, textures bitmap géantes ou effets difficiles à maintenir.
- Cartes de quadrants avec fond teinté, fin contour coloré, très légère ombre, en-tête doté d'un grand pictogramme et badge Q1–Q4 ; tâches lisibles, cases à cocher, badges de date, icônes.
- Thème clair : fond presque blanc avec une teinte lilas très légère, cartes pastel claires, texte foncé. Thème sombre : fond bleu nuit/indigo profond, cartes sombres légèrement colorées, texte clair, néon plus perceptible.
- Éventuelle illustration paysagère de la barre latérale : élément secondaire facultatif, **SVG local simple ou CSS**, jamais un obstacle à la réalisation ; ne la laisse pas réduire la lisibilité de la navigation.
- Typographie moderne et lisible (police correctement licenciée, chargement local ou fallback système), pas de dépendance aux effets graphiques pour comprendre les actions.

Définis un système de design partagé : couleurs sémantiques, surfaces, fonds, bordures, ombres, rayons, échelle d'espacement, tailles de texte, états interactifs, durée des transitions, focus ring, z-index, responsive breakpoints.

**Proposition initiale de tokens (à ajuster par comparaison avec les références) :**

```css
:root {
  --brand: #7437f6;
  --brand-hover: #6327e2;
  --q1: #f04763;
  --q2: #168cf5;
  --q3: #f4a11a;
  --q4: #9b4df5;
  --app-bg: #fcfaff;
  --surface: #ffffff;
  --text-primary: #17162d;
  --text-secondary: #5a5974;
  --border-subtle: #e9e5f4;
  --radius-card: 22px;
  --radius-control: 12px;
}
[data-theme='dark'] {
  --app-bg: #0d1021;
  --surface: #18172c;
  --text-primary: #f5f2ff;
  --text-secondary: #b8b6cf;
  --border-subtle: #34314f;
}
```

Ces valeurs sont une **base de travail** et non un relevé colorimétrique exact. Ajuste-les par contrôle visuel. Utilise les mêmes tokens sémantiques pour Angular et React. Les variations d'opacité et de couleur doivent rester lisibles et accessibles.

### Reproduction des deux thèmes

- Le mode clair et le mode sombre doivent suivre les **mêmes principes de composition**, et non être deux designs différents.
- Bascule « clair / sombre / système » persistée dans les préférences appropriées ; respecte le système et évite le flash de mauvais thème au chargement.
- Prévoir toutes les variantes : hover, active, focus, disabled, loading, success/error, drag-preview, drop-target, empty-state et dialog backdrop.
- Transitions courtes, non essentielles, avec `prefers-reduced-motion` respecté.

### Barre latérale et navigation

- Logo/identité « FocusWithAkram » (ou nom canonique trouvé dans le projet ; ne renomme pas arbitrairement l'application).
- Routes : Tableau de bord, Matrice d'Eisenhower, Mes tâches, Focus/Pomodoro, Calendrier, Statistiques, Projets, Archives, Paramètres.
- Icônes cohérentes (Lucide ou équivalent) ; icône active dans un conteneur lumineux violet avec indicateur latéral.
- Barre rétractable sur desktop/tablette si déjà prévu ; navigation inférieure sur mobile selon la documentation.
- Navigation accessible au clavier, sans perdre le scroll ou l'état métier de façon inattendue.

## 5. Page prioritaire #1 — Matrice d'Eisenhower (référence visuelle stricte)

**La matrice doit occuper l'essentiel du contenu : 2 colonnes × 2 lignes sur desktop, quatre grands quadrants, sans panneau droit.**

En-tête :
- Afficher simplement **« Matrice d'Eisenhower »** et l'icône associée, puis le bouton principal « + Nouvelle tâche » et les contrôles nécessaires.
- **Ne pas afficher** de sous-titre marketing (« Organisez vos priorités... »), d'encart « Focus de la semaine », de « Top 3 du jour », d'« Aperçu de la journée », de chronomètre, ni de colonne latérale droite.
- Garder la barre latérale principale et son effet néon.

Quadrants :
- Q1 **Faire maintenant** — urgent et important — corail.
- Q2 **Planifier** — important et non urgent — bleu.
- Q3 **Déléguer / limiter** — urgent et non important — ambre.
- Q4 **Éliminer / plus tard** — ni urgent ni important — violet.
- Chaque panneau : icône, titre, compteur de tâches, éventuellement compteur de retard, contenu de vraies tâches, case à cocher, échéance et état pertinents, menu d'actions, ajout rapide.
- Les tâches doivent rester lisibles sur les fonds colorés en light comme en dark.
- Conserve recherche et filtres documentés (projet, statut, étiquette, retard) sans surcharger le haut de page ; propose par exemple une barre secondaire compacte.
- Le glisser-déposer **entre quadrants et dans un quadrant** doit persister via Spring Boot ; en cas d'échec réseau, rétablir l'état précédent et présenter une erreur claire. Après succès, proposer « Annuler » si cela correspond au comportement backend.
- Permettre de déplacer/réordonner une tâche au clavier et via « ⋯ → Déplacer vers... ».
- Ne pas modifier automatiquement un quadrant parce qu'une échéance est dépassée.
- Une tâche terminée est archivée et disparaît de la matrice active.
- Mobile : un seul quadrant sélectionnable à la fois avec onglets et compteurs, sans imposer un drag & drop entre quadrants qui n'existe pas ; utiliser le menu d'action prévu.

**Critère visuel :** la page doit immédiatement rappeler les captures fournies, pas un tableau Kanban générique et pas une matrice pastel standard sans caractère.

## 6. Page prioritaire #2 — Calendrier (clair/sombre)

Réalise un calendrier dont la grammaire visuelle reprend la matrice : sidebar, violets, coins arrondis, cartes colorées, surfaces propres, grille nette, sélection de jour expressive mais sobre.

Fonctionnalités :
- Vues **mois / semaine / jour** ; aujourd'hui ; précédent/suivant ; filtre projet ; panneau « Non planifiées ».
- Le calendrier utilise les **dates réellement disponibles dans le backend** : les tâches sont notamment positionnées selon la **fin prévue** (échéance) comme dans la documentation. Ne fabrique aucune heure de début pour remplir une grille hebdomadaire esthétique.
- Si des intervalles `plannedStart`–`plannedEnd` existent réellement et sont exploitables pour une vue horaire, affiche-les sans contredire le modèle métier. Sinon, utilise la présentation échéance + liste du jour, tout en gardant l'esthétique de référence.
- Événements colorés selon le quadrant, indicateurs de retard, état « En cours », détail au clic.
- Déplacement de date en **vue mois**, avec persistance, conservation de l'heure locale de fin et décalage cohérent du début prévu si prévu par les règles existantes. N'invente pas le déplacement en semaine/jour si le backend ou les interactions existantes ne le permettent pas.
- Mobile : repères de jours et liste lisible du jour sélectionné.
- Les tâches terminées ne doivent pas réapparaître dans les vues actives.

**Les captures de calendrier servent à la présentation, pas à changer silencieusement les règles de planification de la documentation.**

### Spécifications visuelles supplémentaires du Calendrier (nouveaux PNG indépendants)

- Ouvre **les deux fichiers** `references/calendrier/calendrier-clair.png` et `references/calendrier/calendrier-sombre.png` ; ne dépends plus d'un collage unique clair/sombre.
- En vue **mois**, vise une grille de sept colonnes, un jour sélectionné facilement identifiable, des pastilles de tâches aux couleurs Q1–Q4, un sélecteur mois/semaine/jour, des contrôles précédent/suivant/aujourd'hui et un filtre projet.
- La maquette présente une zone « Détails du jour » et un panneau « Tâches non planifiées ». Ces panneaux concernent le **Calendrier uniquement** et ne doivent **jamais être réintroduits à droite de la Matrice**.
- Pour les périodes avec de nombreuses tâches : afficher un nombre maîtrisé de cartes + un mécanisme pour voir le reste ; garantir la lisibilité en 390 px de large et l'accès au détail au clavier.
- Dans une vue semaine/jour, l'apparence de grille horaire ne t'autorise pas à inventer des heures de début : respecte l'heure de l'échéance ou les vrais intervalles de planification fournis.

## 7. Toutes les autres pages : vrai produit, pas simple shell

Après les deux pages prioritaires, applique le même design system aux pages documentées **dans Angular ET React** :

**Tableau de bord :** références `references/tableau-de-bord/*`. Reproduis l'en-tête « Bonjour ... », les cartes synthétiques, la typographie, la hiérarchie et les contrastes de chaque thème, sans adopter aveuglément les nombres de la capture. Conserve **les six indicateurs réels** spécifiés, le Top 3 quotidien modifiable, la mini-matrice, le widget Focus/Pomodoro compact (**autorisé ici**, pas sur la Matrice), l'activité des sept derniers jours et les liens de navigation. Si l'image n'affiche qu'une partie des six indicateurs, adapte la grille pour afficher tous les indicateurs sans perdre l'esthétique.

**Mes tâches :** références `references/mes-taches/*`. Utilise une liste claire et dense avec en-têtes/onglets, cases à cocher, badges, actions rapides et panneau de détail latéral si la largeur le permet, comme dans les maquettes. Implémente **toutes** les vues documentées : Priorités / Aujourd'hui / Cette semaine / Toutes / En retard / Terminées ; recherche, filtres et tris. Respecte l'ordre métier Q1→Q2→Q3→Q4 puis retard, échéance, statut, ordre manuel, création. Sur mobile, le panneau de détail devient drawer ou écran dédié accessible ; aucun champ n'est purement esthétique.

**Créer/éditer une tâche :** titre obligatoire (200 caractères maximum selon la documentation), description, notes, importance/urgence, projet, étiquettes, sous-tâches, estimation, dates prévues, statut et actions. Date/heure saisissables et sélectionnables ; erreurs de validation visibles, jamais des champs décoratifs. Les sous-tâches ne terminent pas automatiquement le parent sauf si le paramètre correspondant est activé.

**Détail d'une tâche :** présentation des six dates, durée prévue, durée réelle écoulée, temps actif Pomodoro, écarts, chronologie, sous-tâches, notes, cycles d'exécution, historique des sessions, corrections de dates permises par le backend.

**Focus/Pomodoro :** références `references/focus-pomodoro/*`. Garde le **minuteur circulaire violet néon comme point focal**, avec actions réellement fonctionnelles, séquence des cycles, objectif quotidien et historique par jour. Ajoute tâche associée, démarrer / pause / reprise / réinitialiser / passer, réglages et prévisualisation de la prochaine session, conformément à la documentation. Ne calcule pas le compte à rebours par simple décrémentation naïve : respecte la source de temps serveur, les pauses, rechargements et la clôture idempotente. Une seule session active ; une session interrompue n'est pas terminée ; les pauses ne comptent pas comme temps de travail. L'apparence d'un état « 24:37 » dans la capture est un **état de démonstration**, pas la valeur fixe d'un timer.

**Archives :** **aucun PNG final fourni** ; décline les tokens et la sidebar cohérente des références canoniques. Tâches terminées par date réelle de fin, périodes et filtres, détail, restauration, exports, cycles préservés. Restaurer ne doit pas supprimer l'historique des exécutions précédentes.

**Projets :** références `references/projets/*`. Construis une grille de cartes de projets avec icône/couleur, intitulé, indicateurs de tâches, **barre de progression authentique**, actions contextuelles et création de projet. Une carte peut paraître colorée et lumineuse dans les PNG, mais la lisibilité prime. Implémente création / modification / archivage / restauration, couleurs, échéance et progrès des tâches ; l'archivage d'un projet conserve ses tâches.

**Statistiques :** références `references/statistiques/*`. Reproduis le style des **KPI en petites cartes**, graphiques violets, donut de répartition et heatmap d'activité, avec la même géométrie et lisibilité en light/dark. Implémente filtres de période, indicateurs, évolution quotidienne, durées prévues vs réelles, répartition des quadrants, temps par projet/tâche, heatmap et ponctualité. Utilise les **vraies données serveur** et des graphiques accessibles ; pas de nombres inventés ou de barres décoratives statiques. Les graphiques doivent avoir une alternative textuelle ou tabulaire.

**Paramètres :** **aucun PNG final fourni** ; conçois des groupes de formulaires et options accessibles avec le même style de contrôles. Thème, fuseau, premier jour de semaine, durées Pomodoro, objectif quotidien, sons, notifications, sous-tâches, raccourcis, export/import JSON/CSV. Ne pas simuler un import sans appel backend ; respecter l'aperçu avant confirmation et les validations existantes.

**Recherche globale / palette de commandes :** raccourci Ctrl/⌘+K, navigation, recherches, création, ouverture des détails et actions documentées ; focus et clavier accessibles.

**Résilience et feedback :** états chargement, vide, erreur, offline, retries raisonnables, notifications claires, avertissement explicite si le backend n'est pas disponible. Ne jamais considérer une opération réussie tant que le serveur ne l'a pas confirmée (ou si UI optimiste, implémenter rollback).

## 8. Contraintes métier non négociables

- Garder distinctes **création, début prévu, fin prévue, début réel, fin réelle, archivage** ; ne jamais remplacer le réel par le prévu.
- Les dates sont stockées côté backend en UTC, affichées selon le fuseau configuré ; attention aux changements d'heure, comparaisons et journées locales.
- Les périodes d'archives et statistiques se calculent dans le fuseau configuré, pas dans UTC par défaut.
- Durée réelle écoulée et temps actif Pomodoro **ne sont pas la même valeur**.
- Restaurer une tâche crée un **nouveau cycle** sans perdre l'ancien.
- Ne pas masquer les erreurs métier renvoyées par Spring Boot (`ProblemDetail` et codes stables observés dans le projet).
- Le Top 3 est propre à chaque journée locale et limité à trois tâches actives.
- Le statut « Terminée » entraîne l'archivage automatique et le retrait des vues actives.
- Ne pas contourner les validations du backend ni copier la logique métier côté frontend comme vérité concurrente.
- Documenter précisément les écarts de fonctionnalité si des fonctionnalités décrites ne sont pas implémentées actuellement par le serveur ; ne pas annoncer qu'elles fonctionnent si ce n'est pas vrai.

## 9. Comparaison juste entre Angular et React

Pour que le choix final ait une valeur, **les deux frontends doivent avoir le même périmètre et le même niveau de finition**. Ne livre pas un Angular complet face à une maquette React statique, ni l'inverse.

Crée `docs/frontend-feature-parity.md` avec une matrice :

```text
Page / fonctionnalité | Angular | React | API réelle | Tests | Écart connu
```

Pour chacune des principales opérations métier, marque : `fonctionnel`, `partiel`, `non réalisé`, avec une preuve (test, route, capture, constat). N'utilise pas des coches non vérifiées.

Critères de comparaison :

1. **Fidélité visuelle** aux images de référence en clair et sombre.
2. **Parité fonctionnelle** avec la documentation et les contrats serveur.
3. **Qualité UX** : facilité des interactions, drag & drop, filtres, retours d'erreur.
4. **Performances mesurées** : chargement, build de production, taille des bundles, fluidité avec une quantité représentative de tâches, interaction sur calendrier et matrice.
5. **Accessibilité** : clavier, contraste, dialogues, lecteurs d'écran, réduction des animations.
6. **Maintenance** : structure, découpage, complexité, duplication, réutilisation, typings, couverture des tests.
7. **Coût de conservation** : effort réel pour maintenir Angular existant versus migrer vers React, dépendances et risques.

Pour les mesures, utilise la même machine/navigateur, mêmes données, mêmes routes, build production, mêmes dimensions et conditions ; effectue plusieurs essais si les outils le permettent et donne la méthodologie. **N'invente jamais de FPS, scores Lighthouse, tailles gzip ou temps de chargement.** Si la mesure est impossible, indique `Non mesuré` et explique pourquoi.

## 10. Tests et validation visuelle obligatoires

- Installer les dépendances à partir des manifests et des versions compatibles ; ne pas ajouter systématiquement `--force` pour contourner des conflits non compris.
- Compiler **Angular ET React** en production, exécuter typecheck, lint et tests existants.
- Mettre en place des tests unitaires des fonctions critiques (dates, filtres, états du timer) et tests de composants pertinents.
- Écrire des tests E2E **pour les deux frontends** avec Playwright ou outil équivalent : navigation, création, édition, déplacement de quadrant, persistance après rafraîchissement, planification, tâche terminée/archivée, thèmes, Pomodoro et erreurs réseau si l'environnement de test le permet.
- Les suites E2E mutantes doivent utiliser une base de test ou des fixtures réinitialisables ; jamais effacer les vraies données personnelles de l'utilisateur.
- Screenshots comparables pour **chacune des sept pages illustrées** : **2 thèmes × 2 frameworks = 28 captures desktop** minimum, correspondant aux 14 images de référence. Chaque capture porte un nom stable (`angular|react` + page + `clair|sombre`). Même date, mêmes tâches, mêmes filtres et mêmes états dans les deux applications. **Ne pas présenter une galerie découpée comme des captures de pages indépendantes.**
- Pour la Matrice et le Calendrier, ajouter les tailles **1440×900**, **768×1024** et **390×844** (les captures desktop canoniques peuvent avoir un autre ratio propre à l'image de référence : comparer en compensant cette différence). Pour les autres pages, contrôler aussi au minimum un viewport mobile et un état de données volumineuses ; si la couverture exhaustive est possible, l'appliquer à toutes les pages.
- Effectuer une comparaison visuelle réelle **avec les 14 maquettes individuelles**. Corriger les divergences majeures : densité, marges, taille des cartes, colorimétrie, lisibilité, effet néon, responsive, focus states. Conserver les 14 PNG comme références en lecture seule et enregistrer les captures produites dans un dossier distinct `docs/screenshots/`.
- Construire une **matrice de validation visuelle** pour les 7 pages × 2 thèmes × 2 frameworks, indiquant la référence, le chemin de capture, la conformité, les écarts et leur gravité, sans déclarer une comparaison si le screenshot réel n'a pas été produit.
- Vérifier les règles d'accessibilité WCAG AA raisonnablement applicables et `prefers-reduced-motion`.
- Si le navigateur, les tests graphiques ou le serveur sont indisponibles dans ton environnement, signale exactement ce que tu as pu et n'as pas pu vérifier. Ne prétends pas avoir vu un résultat non testé.

## 11. Ordre d'exécution conseillé — réaliser, ne pas s'arrêter au plan

**Phase A : Audit et socle**
1. Explorer dépôt, documentation et références.
2. Vérifier APIs, versions et fonctionnement existant.
3. Préserver l'état initial et établir la structure de coexistence.
4. Définir tokens, composants visuels, scripts de lancement, proxy API.

**Phase B : Matrice Angular + React**
5. Refaire la Matrice en Angular, thème clair et sombre, 100 % intégrée au vrai backend.
6. Créer le projet React et refaire **la même matrice** avec les mêmes interactions, données et design tokens.
7. Vérifier drag & drop, persistance, erreurs, filtres, responsive ; capturer et comparer les écrans.

**Phase C : Calendrier Angular + React**
8. Réaliser les vues du calendrier dans les deux stacks ; respecter la source des dates et les règles d'édition.
9. Comparer les deux en clair et sombre, desktop/tablette/mobile.

**Phase D : Reste du produit**
10. Appliquer la même identité et préserver toutes les fonctionnalités sur Tableau de bord, Mes tâches, détails/formulaires, Focus, Archives, Projets, Statistiques, Paramètres, Recherche.
11. Garantir les comportements des dates, cycles, historique Pomodoro, exports/imports et état réseau.

**Phase E : Validation et choix**
12. Tests, vérifications visuelles, builds et corrections.
13. Rapport comparatif factuel et recommandation motivée : conserver Angular ou adopter React, **sans supprimer aucune variante**.

Dans les itérations où le contexte ou les ressources sont limités, sauvegarde le code réellement produit et publie un état factuel (fait / en cours / bloqué / non commencé). Reprends ensuite à partir de cet état. **Ne présente jamais une étape inachevée comme terminée.**

## 12. Livrables de sortie attendus

Le dépôt doit contenir :

1. Une version **Angular modernisée** et démarrable, conservant ses fonctionnalités existantes.
2. Une version **React indépendante** et démarrable, équivalente fonctionnellement.
3. Une intégration **commune et vérifiée** avec le backend Spring Boot.
4. Les deux **thèmes clair/sombre** et le design system documenté.
5. Les **sept pages illustrées** (Matrice, Calendrier, Tableau de bord, Mes tâches, Focus, Statistiques, Projets) fidèles chacune à ses deux références ; Archives et Paramètres cohérents avec le même système de design et complets fonctionnellement.
6. Scripts de lancement faciles depuis la racine ou commandes exactes documentées, ports non conflictuels ; commandes de build/test par frontend.
7. `docs/frontend-design-system.md` : tokens et règles UI/UX.
8. `docs/frontend-feature-parity.md` : état réel et testé de chaque fonctionnalité pour les deux stacks.
9. `docs/frontend-visual-regression.md` : matrice de comparaison des **14 références canoniques × 2 frameworks**, captures et écarts constatés.
10. `docs/frontend-comparison.md` : tableau de comparaison, métriques authentiques, limites, coûts, recommandation argumentée.
11. `docs/how-to-run-frontends.md` : prérequis, variables d'environnement, ports, lancement Spring Boot + Angular + React, cas d'erreur courants, procédure de comparaison.

### Format de ton compte rendu final

Présente dans cet ordre :
- **Structure réelle du projet** après modifications.
- **Ce qui a été implémenté dans Angular** (preuves et chemin des fichiers).
- **Ce qui a été implémenté dans React** (preuves et chemin des fichiers).
- **Commandes exactes pour lancer les deux**, et URL locales.
- **Fonctionnalités testées et tests réellement exécutés**, avec résultats.
- **Comparaison visuelle et technique** appuyée sur des observations vérifiables.
- **Limites ou travaux restants**, sans dissimulation.
- **Recommandation finale** Angular ou React, justifiée par le projet réellement livré, et non par la popularité générale d'un framework.

## 12.1. Check-list de recette spécifique aux nouvelles maquettes

Au-delà des tests métier, produis un tableau de recette UI vérifiable. Pour **chaque page** ci-dessous, vérifie le rendu clair et sombre en Angular et React, les interactions et les données réelles :

- **Matrice :** quatre quadrants 2×2 occupant la page sans panneau droit ; barre latérale active néon ; pas de timer ni texte d'accroche ; création, tri, drop persistant, annulation, filtres.
- **Calendrier :** vues mois/semaine/jour ; mois sélectionné et en-tête ; cartes Q1–Q4 ; jour sélectionné et détail ; tâches non planifiées ; mouvement des échéances uniquement selon comportement supporté.
- **Tableau de bord :** six KPI issus du serveur ; Top 3 ; mini-matrice ; Focus compact ; activité hebdomadaire ; aucune métrique fictive.
- **Mes tâches :** toutes les vues métier ; filtres, statut, recherche, sélection, panneau détail, création/édition ; ordre cohérent.
- **Focus :** anneau et état de timer réels ; démarrer/pause/reprise ; historique persistant et objectif ; synchronisation après recharge.
- **Statistiques :** vraies données ; filtres de période ; graphiques et heatmap ; alternatives accessibles.
- **Projets :** cartes et barres de progression calculées ; CRUD, archivage/restauration ; tâches préservées.
- **Archives / Paramètres :** pas de référence d'image : continuité du design ; toutes les opérations documentées.

Évalue objectivement : si une fonctionnalité demande un nouveau composant absent de la maquette, **intègre-le dans la grammaire visuelle existante au lieu de le supprimer**, et explique brièvement ce choix dans le rapport. Si une image illustre un comportement impossible avec le contrat API vérifié, respecte le backend et signale l'adaptation.

## 13. Consignes de comportement pour toi, Claude

- **Commence par explorer le dépôt et lire la documentation et les images.** Si un chemin manque, cherche-le dans le projet avant de conclure qu'il n'existe pas.
- **Prends les décisions techniques autonomes non critiques**, en expliquant brièvement celles qui ont un impact architectural. Évite de me poser des questions auxquelles le code ou les documents répondent déjà.
- N'effectue aucune opération destructrice, migration irréversible ou suppression du projet Angular initial sans accord explicite.
- Ne change pas le backend métier pour faciliter artificiellement le frontend. Si un ajustement API semble nécessaire, isole et justifie-le ; évite-le dans la comparaison initiale.
- Garde les noms et routes existants autant que possible, et les textes d'interface en **français naturel**.
- Refuse les solutions de facilité : captures intégrées comme UI, données codées en dur, fonctionnalités factices, bouton sans action, copie non fonctionnelle, calendrier rempli par des heures inventées, statistiques artificielles, style générique importé sans personnalisation.
- Ne sur-conçois pas : privilégie des composants propres, du CSS réalisable, peu de dépendances justifiées et une architecture lisible.
- L'objectif final est **une comparaison authentique entre deux frontends de production capables de remplacer l'interface actuelle**, pas deux portfolios de screenshots.

**Exécute maintenant la mission dans ce dépôt : audit, ouverture des 14 références, modifications de code, tests, captures comparables dans les deux thèmes et deux frameworks si disponibles, documentation puis comparaison finale.**
