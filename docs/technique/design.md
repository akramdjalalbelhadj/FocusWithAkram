# FocusWithAkram — design détaillé

Référence visuelle et règles d’évolution, relevées dans le code le **1 novembre 2026**. Périmètre : Angular et React, neuf pages, thèmes clair/sombre/système, ordinateur et mobile. Ce document distingue **l’existant** des **règles de conception à appliquer lors des prochaines modifications** ; il ne certifie pas que chaque détail est déjà uniformisé.

Sources principales : [tokens communs](../../shared/design-tokens.css), [styles Angular](../../frontend-angular/src/styles/index.css), [styles React](../../frontend-react/src/styles/index.css), [maquettes](../maquettes/README.md) et [écarts de recette](../historique/2026-11-refonte-frontends/recette-visuelle.md). Les statuts de livraison restent dans la [checklist](../suivi/checklist.md).

## 1. Intention et identité

L’interface doit aider à choisir une action puis à s’y tenir. L’identité combine un violet lumineux, des fonds lavande très légers, des cartes arrondies et une typographie Inter. L’impression recherchée est calme, personnelle et lisible, avec une hiérarchie suffisamment nette pour des données denses.

Le violet porte l’identité et les actions principales. Les quatre couleurs d’Eisenhower portent une **signification métier**, pas un classement décoratif. Le vert confirme un accomplissement, l’ambre prévient et le rose/rouge signale retard, erreur ou suppression. Ne pas assimiler une tâche Q4 à une erreur.

Règles de conception : une action principale clairement identifiable dans un bloc ; actions secondaires visuellement plus discrètes ; pas de nombre fictif pour remplir une carte ; message de vide utile ; texte explicatif quand deux métriques proches pourraient être confondues.

## 2. Architecture de l’information

| Destination                | Question de l’utilisateur                            | Action principale                           |
| -------------------------- | ---------------------------------------------------- | ------------------------------------------- |
| Tableau de bord `/`        | Que faire aujourd’hui ?                              | Choisir les priorités ou commencer          |
| Matrice `/matrix`          | Qu’est-ce qui est important et urgent ?              | Classer/déplacer une tâche                  |
| Mes tâches `/tasks`        | Où en est ma liste ?                                 | Filtrer, créer, ouvrir une tâche            |
| Focus `/focus`             | Sur quoi travailler maintenant ?                     | Démarrer/reprendre ; configurer le minuteur |
| Calendrier `/calendar`     | Quand faire les tâches ?                             | Choisir un jour ou replanifier              |
| Statistiques `/statistics` | Comment mon travail évolue-t-il ?                    | Choisir une période et lire les mesures     |
| Projets `/projects`        | Comment progressent mes regroupements ?              | Créer ou ouvrir un projet                   |
| Notes & idées `/notes`     | Quelles idées ai-je, lesquelles concrétiser ?        | Noter, développer, créer une tâche          |
| Archives `/archives`       | Quel travail ai-je terminé ?                         | Consulter ou restaurer                      |
| Paramètres `/settings`     | Comment adapter l’application et gérer mes données ? | Régler l’apparence/région ou exporter       |

La configuration du Pomodoro appartient à Focus. Ne pas réintroduire un second formulaire des durées dans Paramètres. Les exports et les réglages généraux restent dans Paramètres.

## 3. Palette commune : couleurs de structure

Valeurs relevées dans `shared/design-tokens.css`. Les deux frontends doivent consommer les variables sémantiques plutôt que recopier des couleurs dans leurs vues.

| Token / rôle                         | Clair     | Sombre    |
| ------------------------------------ | --------- | --------- |
| `--page` fond de page                | `#faf8ff` | `#0d0c21` |
| `--surface` carte principale         | `#ffffff` | `#19172e` |
| `--surface-2` surface secondaire     | `#f5f1ff` | `#242039` |
| `--surface-3` piste / contraste doux | `#ebe5f7` | `#352c48` |
| `--fg` texte principal               | `#1b1835` | `#f6f2ff` |
| `--muted` texte secondaire           | `#625b7c` | `#bbb2d1` |
| `--subtle` texte discret             | `#6d6385` | `#ada3c4` |
| `--line` bordure douce               | `#e6dcfb` | `#38314e` |
| `--line-strong` bordure renforcée    | `#c9bade` | `#645578` |
| `--brand` action / identité          | `#7437f6` | `#b17aff` |
| `--brand-hover` survol primaire      | `#6123db` | `#c59aff` |
| `--brand-soft` sélection tonale      | `#eee5ff` | `#342251` |
| `--brand-fg` texte sur primaire      | `#ffffff` | `#160d28` |
| `--ring` contour de focus            | `#8a49ff` | `#c58cff` |

Le texte d’une action primaire sombre n’est pas automatiquement blanc : employer `--brand-fg`. La bordure doit rester perceptible sur les cartes sombres sans devenir plus importante que le contenu.

## 4. Palette métier : quadrants et états

| État          | Texte clair / sombre  | Fond clair / sombre   | Signification                          |
| ------------- | --------------------- | --------------------- | -------------------------------------- |
| Q1            | `#bc2446` / `#ff9ab3` | `#fff0f4` / `#2d1729` | Urgent et important, faire maintenant  |
| Q2            | `#0867be` / `#79d7ff` | `#edf5ff` / `#101f38` | Important non urgent, planifier        |
| Q3            | `#915207` / `#ffd080` | `#fff6e9` / `#302418` | Urgent non important, limiter/déléguer |
| Q4            | `#7830c4` / `#d9a7ff` | `#f6efff` / `#251638` | Ni urgent ni important, plus tard      |
| Succès        | `#087d66` / `#69ddbd` | `#e6faf4` / `#13362e` | Accompli / confirmation                |
| Danger        | `#b72042` / `#ff9ab3` | `#ffeaf0` / `#3a1b2a` | Erreur, retard ou action destructive   |
| Avertissement | `#895009` / `#ffd080` | `#fff5df` / `#382916` | Attention ou interruption              |
| Information   | `#0867be` / `#79d7ff` | `#edf5ff` / `#102c45` | Explication et état informatif         |

Les accents de quadrant sont `#ff4769`, `#168cf5`, `#f4a11a`, `#a64dff`. Ils sont définis à la racine et restent hérités en sombre ; les textes/fonds/bordures changent. Ne pas employer un accent décoratif comme couleur de petit texte sans vérifier son contraste.

Chaque quadrant doit porter `Q1`…`Q4`, un libellé et, quand utile, une icône. Une tâche en retard porte un texte ou un symbole nommé en plus de sa couleur. Les états TODO/IN_PROGRESS/DONE doivent pouvoir se lire sans distinction des couleurs.

## 5. Thèmes et contraste

Les modes explicites utilisent `data-theme="light"` ou `data-theme="dark"` sur la racine. Le mode Système utilise la préférence du navigateur. La préférence est persistée via l’API et un cache d’affichage évite certains flashs de thème.

À vérifier pour chaque ajout : texte principal/secondaire, bordures de formulaire, état désactivé, focus clavier, badges sur fond teinté, contenu d’un dialogue et contraste des graphiques. Une ombre légère peut disparaître en sombre ; la carte doit encore se distinguer par sa surface ou sa bordure.

Les audits axe existants ont couvert une partie des pages et thèmes. Ils n’équivalent pas à une certification WCAG complète. Les valeurs numériques d’un ratio de contraste ne sont pas inventées ici ; mesurer les nouveaux couples de couleurs avant validation.

## 6. Typographie et densité

Inter Variable est embarquée via `@fontsource-variable/inter`, avec police système de repli. Les règles actuelles diffèrent légèrement : base Angular à 15 px environ (`0.9375rem`) et base React à 14 px avec interligne 1,5. Les titres de page sont renforcés et diminuent en mobile ; certaines valeurs KPI sont plus grandes que le titre d’une carte.

| Niveau                   | Repère de conception                                                   | Usage                                                                                  |
| ------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Titre de page            | Environ 28 px desktop ; autour de 23–24 px mobile                      | Un `h1` par page                                                                       |
| Titre de carte / section | Environ 18–21 px, gras                                                 | Rendre les cartes repérables au balayage                                               |
| Texte courant            | 14–16 px selon contexte                                                | Privilégier 16 px pour les textes longs et les champs mobiles lors d’une harmonisation |
| Texte secondaire         | 12–14 px lisibles                                                      | Métadonnées et aides, sans contenir l’unique information critique                      |
| Sur-titre                | Petites capitales espacées, court                                      | Introduction et catégories, jamais un paragraphe                                       |
| KPI                      | Environ 24–32 px                                                       | Valeur + unité + libellé                                                               |
| Horloge Focus            | Grandes valeurs tabulaires ; React 64 px sur l’anneau principal actuel | Limiter les décalages de largeur à chaque seconde                                      |

Ces repères ne remplacent pas la feuille du composant. Conserver l’ordre sémantique `h1` → `h2` → `h3`, la lisibilité à 200 % et les retours à la ligne. Les textes longs, titres de tâches et traductions futures ne doivent pas casser les grilles.

## 7. Espacement, formes et élévation

Tokens de rayon : `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 22px`. Certains blocs de la refonte emploient 24 px ; ne pas augmenter les rayons au hasard d’un écran.

Ombres claires : `0 3px 6px #542a9010`, `0 8px 24px #542a9014`, `0 20px 70px #190d4638`. Les variantes sombres renforcent le noir transparent. Utiliser la faible élévation pour les cartes, la moyenne pour les surfaces temporaires et la forte pour les dialogues.

Repères : espacements courts 4/8/12 px, internes 16/20/24 px, séparation de sections 24/32 px. Les cartes React ont couramment 22 px de padding ; les ajustements mobiles le réduisent. Garder les alignements des titres, valeurs, champs et actions plutôt qu’une succession arbitraire de marges.

Une carte n’est pas forcément cliquable dans toute sa surface. Ne pas donner un comportement de bouton à une grande carte contenant déjà plusieurs commandes sans gérer les événements et le clavier.

## 8. Shell, navigation et responsive

### 8.1 Ordinateur

La barre latérale principale mesure environ **246 px**. Repliée, elle est à **72 px dans Angular** et **76 px dans React**. La variante React réduit aussi sa barre dans certains paliers intermédiaires. La largeur de contenu React est plafonnée à 1600 px dans le layout actuel.

La navigation garde un ordre stable, un état actif violet et des noms accessibles quand les libellés visuels sont masqués. Le paysage CSS en bas de la barre est décoratif ; il ne doit porter aucune information indispensable.

La barre utilitaire contient la recherche/palette et les commandes globales disponibles. Le contenu de page commence par un titre, son contexte et l’action principale. Éviter de déplacer les mêmes commandes à des endroits imprévisibles d’une page à l’autre.

### 8.2 Tablette et mobile

| Palier               | Comportement présent / attendu                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| Au-dessus de 1600 px | React peut afficher six KPI en ligne ; conserver un contenu lisible, pas une largeur illimitée.      |
| Vers 1200 px         | Plusieurs grilles se réduisent ; la colonne secondaire peut passer sous le contenu.                  |
| Sous 1024 px         | Matrice à un quadrant sélectionné ; adaptation des layouts de calendrier et Focus.                   |
| Sous 768 px          | Barre latérale remplacée par navigation inférieure ; marges réduites, formulaires et cartes empilés. |
| Vers 480 px          | Champs Pomodoro sur une colonne dans les composants dédiés.                                          |

La matrice Angular utilise une règle locale à `64rem` ; d’autres composants utilisent les paliers Tailwind ou les feuilles responsive React. Les paliers ne sont donc pas une abstraction unique déjà partagée.

En mobile : réserver de l’espace sous le contenu pour la barre fixe et la safe area, autoriser les titres sur plusieurs lignes, garder l’action principale atteignable et éviter toute barre de défilement horizontale de page. Les tableaux de données peuvent avoir leur propre défilement si leur alternative est clairement accessible.

## 9. Composants et comportements

| Composant          | Contenu / comportement                           | États à prévoir                                                         |
| ------------------ | ------------------------------------------------ | ----------------------------------------------------------------------- |
| En-tête de page    | Icône, titre, contexte, action principale        | Titre long, petite largeur, action désactivée                           |
| Carte              | Surface, bordure douce, titre et contenu alignés | Vide, chargement, erreur, données partielles                            |
| Bouton principal   | Fond identité et texte `brand-fg`                | Repos, hover, focus, actif, occupé, désactivé                           |
| Bouton secondaire  | Surface neutre/tonale, bordure                   | Même hiérarchie de focus ; pas de confusion avec une action destructive |
| Action destructive | Libellé explicite et couleur danger              | Confirmation si nécessaire ; conserver un chemin d’annulation           |
| Bouton icône       | Icône Lucide et nom accessible                   | Focus visible ; cible tactile à vérifier                                |
| Champ              | Label explicite, valeur, aide, erreur proche     | Vide, valide, invalide, désactivé, saisie non enregistrée               |
| Select / checkbox  | Relation label/contrôle sans ambiguïté           | Clavier, checked, autorisation refusée, options longues                 |
| Badge              | Texte court + couleur métier                     | Statut, quadrant, retard, interruption                                  |
| Progression        | Libellé et valeur bornée                         | 0 %, partiel, 100 %, objectif désactivé                                 |
| Dialogue           | Titre, contenu, action primaire, annulation      | Focus initial, Échap, retour du focus, erreur de validation             |
| Toast / alerte     | Message court, rôle approprié, fermeture         | Succès, échec, annulation éventuelle, expiration                        |
| Vide               | Icône et explication contextuelle                | Créer une première tâche ou retirer les filtres                         |
| Erreur de lecture  | Message et Réessayer                             | Ne pas confondre avec un résultat vide                                  |
| Skeleton           | Structure de chargement discrète                 | Ne pas exposer un faux contenu comme résultat réel                      |

Cible de conception pour les commandes tactiles fréquentes : **44 × 44 px** ou espace équivalent. Certaines petites commandes existantes nécessitent encore une revue ; ne pas déclarer cette cible acquise partout.

## 10. Tableau de bord : composition détaillée

Hiérarchie : en-tête → carte de bienvenue → indicateurs → priorités et minuteur → mini-matrice et activité. La bienvenue est secondaire par rapport aux actions ; ses textes personnalisés ne doivent pas masquer un état vide ou un problème réseau.

Les KPI associent valeur, unité et libellé. Zéro est une donnée valide ; une donnée indisponible doit avoir son état propre. Le Top 3 propose la sélection du jour et une progression, puis des tâches ouvrables ou démarrables. La mini-matrice reprend les quatre identités sans créer une nouvelle palette.

Angular et React diffèrent dans les icônes, courbes et géométries. Toute harmonisation doit d’abord préserver la signification des indicateurs, puis les espacements, et seulement ensuite la décoration.

Références : [clair](../maquettes/FocusWithAkram_Tableau_de_bord_clair.png), [sombre](../maquettes/FocusWithAkram_Tableau_de_bord_sombre.png).

## 11. Matrice d’Eisenhower : composition détaillée

Structure : titre/action → filtres → états de lecture → onglets mobiles → quatre panneaux. Chaque panneau contient icône, intitulé, explication courte, nombre de tâches, signalement du retard, ajout local, liste et ajout rapide.

Les panneaux utilisent les variables couleur/fond/bordure du quadrant. Les filtres doivent rester utilisables sur plusieurs lignes ; la recherche conserve son label même avec une icône décorative. En mobile, afficher un seul quadrant ne doit pas faire croire que les autres sont vides : les onglets portent leurs comptes.

Une carte doit conserver titre, statut, repères de date et commandes pertinentes. Les zones de déplacement, le focus et les commandes clavier donnent un retour perceptible. Ne pas modifier le quadrant seulement à l’écran sans attendre ou vérifier sa persistance.

La page Angular utilise [son template](../../frontend-angular/src/app/features/eisenhower/pages/matrix/matrix.page.html) et [sa feuille CSS](../../frontend-angular/src/app/features/eisenhower/pages/matrix/matrix.page.css) avec des classes sémantiques. `data-quadrant` et `is-active` expriment la donnée et l’état ; les règles visuelles restent dans la feuille.

**Tutoriel** (lot 15, composant partagé `ff-tour`) : bouton discret **Comment ça marche ?** dans l’en-tête, à côté de **Nouvelle tâche**. Le schéma est la matrice elle-même : grille 2 × 2 dans la disposition de la page (Q1 en haut à gauche), axes visuels « Urgent / Pas urgent » en tête de colonnes et « Important / Pas important » en tête de lignes, cases aux couleurs des quadrants (tokens `q1`–`q4`) avec badge Q1–Q4, icône (flamme, calendrier coché, personnes, archive), intitulé et phrase courte. La grille reste en 2 × 2 sur téléphone. À l’étape « Planifier », Q2 reçoit l’anneau de mise en avant et les autres cases passent en neutre, texte toujours lisible.

Références : [clair](../maquettes/Matrice_Eisenhower_clair.png), [sombre](../maquettes/Matrice_Eisenhower_sombre.png).

## 12. Mes tâches, formulaires et détail

Les vues de liste commencent par les modes, puis l’ajout rapide et les filtres. Les cartes/lignes gardent une lecture uniforme : titre d’abord, informations secondaires ensuite, actions à position stable. Un panneau de résumé peut accompagner la liste sur grand écran et passer dessous sur petit écran.

Le formulaire de tâche sépare identité, classement, planification et contenu complémentaire. Le titre obligatoire est annoncé ; les limites de saisie correspondent au backend. Les champs de dates doivent permettre une valeur absente et afficher le fuseau lorsqu’une ambiguïté est possible.

Le détail distingue prévu, réel et travail actif, puis sous-tâches, notes, sessions et cycles. Un temps absent ne doit pas devenir `0` si cela transforme son sens. La complétion d’une tâche jamais démarrée ouvre la demande de début réel au lieu de choisir arbitrairement une date.

Références : [clair](../maquettes/FocusWithAkram_Mes_taches_clair.png), [sombre](../maquettes/FocusWithAkram_Mes_taches_sombre.png).

## 13. Focus / Pomodoro : composition détaillée

### 13.1 Lecture principale

En-tête avec **Configurer** et plein écran → introduction courte → panneau de configuration s’il est ouvert → zone minuteur et synthèse → historique. Le minuteur reste le point focal : type de session, grand temps tabulaire, état et commandes. Les boutons disponibles doivent suivre l’état réel de la séance.

L’objectif quotidien et le cycle sont complémentaires ; ils ne doivent pas être présentés comme une durée restante de la session. La tâche associée est lisible et modifiable seulement quand le parcours le permet. L’historique s’affiche sous la zone principale pour ne pas comprimer le minuteur.

### 13.2 Panneau Minuteur Pomodoro

Le bouton Configurer annonce `aria-expanded` et cible le panneau. L’ouverture est volontaire ; le panneau ne remplace pas le minuteur et peut être refermé. Champs : travail, pauses courte/longue, sessions avant pause longue, objectif quotidien et son ; options : pauses automatiques, session suivante, son activé et notifications.

Grille à deux colonnes, puis une colonne en petite largeur. Les cases sont alignées avec leur libellé sur une ligne lisible et peuvent revenir à la ligne. Les contrôles ne doivent pas se centrer verticalement comme une suite d’icônes décoratives.

| Variante | Enregistrement actuel          | Message à rendre évident                                                                   |
| -------- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| Angular  | Au changement de champ         | « Enregistrement automatique » ; erreur de bornes ou de permission proche du parcours      |
| React    | Bouton Enregistrer le minuteur | Brouillon conservé pendant les actualisations ; contrôles occupés pendant l’enregistrement |

Le panneau explique que les durées modifiées concernent les prochaines sessions. Le choix du son possède un label distinct du texte de ses options. En cas de notification refusée, l’option reste désactivée avec une explication ; ne pas afficher une réussite trompeuse.

Sources : [composant Angular](../../frontend-angular/src/app/features/pomodoro/components/pomodoro-settings/pomodoro-settings.component.html), [composant React](../../frontend-react/src/features/pomodoro/components/pomodoro-settings/pomodoro-settings.tsx). Les maquettes [claire](../maquettes/FocusWithAkram_Focus_Pomodoro_clair.png) et [sombre](../maquettes/FocusWithAkram_Focus_Pomodoro_sombre.png) précèdent ce panneau complet ; une nouvelle capture est requise pour figer sa recette.

### 13.3 États du minuteur

| État                   | Affichage / action                                                           |
| ---------------------- | ---------------------------------------------------------------------------- |
| Prêt                   | Durée du type sélectionné ; Démarrer                                         |
| En cours               | Temps serveur calculé, tâche, Pause et action de fin/interruption disponible |
| En pause               | État textuel explicite ; Reprendre ; temps non consommé pendant la pause     |
| Terminé                | Résultat et proposition cohérente avec la prochaine séance                   |
| Interrompu             | Temps travaillé conservé ; statut distinct d’une séance terminée             |
| Désynchronisé / réseau | Message et resynchronisation ; pas de fausse confirmation de mutation        |

L’anneau est un support visuel ; le texte suffit à comprendre le temps et l’état. Éviter d’annoncer le temps toutes les 250 ms à un lecteur d’écran. Tester les annonces réelles avant toute modification des régions live.

## 14. Calendrier : composition détaillée

En-tête → commandes Mois/Semaine/Jour → période, navigation et filtres → calendrier → détail et tâches non planifiées. Une date sélectionnée et aujourd’hui ont des repères différents. Les jours hors mois sont atténués sans devenir illisibles.

La cellule desktop peut contenir des événements ; le mobile privilégie des repères compacts et une liste détaillée du jour. Ne pas faire tenir tout le titre d’une tâche dans une case étroite. La date et le nombre de tâches doivent être compréhensibles au clavier et via un nom accessible.

Le glisser-déposer ne doit pas être la seule voie de replanification ; le détail/formulaire reste accessible. Vérifier le mois de février, les semaines à cheval sur deux mois et le changement de fuseau.

Références : [clair](../maquettes/Calendrier_clair.png), [sombre](../maquettes/Calendrier_sombre.png).

## 15. Statistiques : composition détaillée

Commencer par la période et les indicateurs utiles, puis les tendances et les répartitions. Chaque graphique doit avoir un titre, une unité, une période et une alternative textuelle ou tabulaire disponible selon le composant.

Ne pas mélanger sur un même axe sans explication secondes, minutes, nombre de tâches et nombre de sessions. Distinguer durée prévue, durée réelle écoulée et temps actif. Les répartitions par quadrant reprennent les couleurs métier ; celles par projet peuvent employer la couleur du projet avec légende textuelle.

Les zéros de la fixture ne doivent pas être remplacés par des courbes décoratives. Un donut vide et un historique insuffisant ont un message adapté. La heatmap utilise une intensité calculée, jamais un niveau inventé par CSS sans relation aux données.

Angular utilise ECharts ; React a ses propres rendus SVG/CSS et tableaux. L’équivalence des données est plus importante que l’identité du composant de graphique.

Références : [clair](../maquettes/FocusWithAkram_Statistiques_clair.png), [sombre](../maquettes/FocusWithAkram_Statistiques_sombre.png).

## 16. Projets, archives et paramètres

### Projets

Titre/action → recherche et filtre d’archive → grille de cartes. Chaque projet porte couleur/icône, nom, description, progression et aperçu réel de tâches. L’aperçu ouvre le détail ; le pourcentage doit correspondre aux comptes du backend. Les menus distinguent modifier, archiver et supprimer.

Références : [clair](../maquettes/FocusWithAkram_Projets_clair.png), [sombre](../maquettes/FocusWithAkram_Projets_sombre.png).

### Notes & idées

- **Liste** (`/notes`) : titre et lien **Catégories** → carte de saisie rapide (icône ampoule, champ, **Noter**, **Développer**) → recherche, filtres catégorie/étiquette et tri → vues en pastilles (Toutes, Favorites, À transformer, Avec tâches) et compteur → grille de cartes (`auto-fill`, 17 rem minimum). Une carte porte un liseré supérieur à la couleur de sa catégorie (gris sans catégorie), le titre (2 lignes), l’extrait sans syntaxe (3 lignes), catégorie et étiquettes en `chip`, l’avancement des tâches (`badge-brand`, `badge-done` quand toutes sont terminées), la date de modification, l’étoile favori (`--warning`, icône pleine via `.icon-filled`) et la suppression.
- **Éditeur** (`/notes/:id`) : barre supérieure (retour, état d’enregistrement en `aria-live` : vert « Enregistré », gris « en attente / Enregistrement… », rouge avec **Réessayer**), titre en grand sur plusieurs lignes (`field-sizing: content`), catégorie et étiquettes, puis l’éditeur. À droite (sous l’éditeur sous 1024 px), le panneau collant **Tâches issues de cette idée** : bouton principal **Créer une tâche**, puis une carte par tâche avec statut et quadrant (barrée si terminée).
- **Éditeur de contenu** (`ff-note-editor`) : barre d’outils sur `--surface-2` (titre, gras, italique, listes, case à cocher, citation, code ; bouton actif en `--brand-soft` en mode visuel), onglets **Écrire / Aperçu** en mode Markdown, bascule **Markdown / Visuel** à droite. Saisie Markdown en police à chasse fixe ; rendu (`.note-prose`) en police de l’interface : titres 1,5 / 1,25 / 1,075 rem, cases à cocher alignées sur la première ligne, élément coché barré et atténué, citations à filet `--line-strong`, code sur `--surface-3`. Le cadre prend la bordure `--brand` et l’anneau `--ring` au focus.
- **Catégories** (`/notes/categories`) : liste unique en carte, pastille de couleur, nombre d’idées, **Modifier** et suppression. Dialogue : nom et palette des couleurs des projets.
- **Dialogues** : saisie rapide (titre obligatoire, détails facultatifs, **Enregistrer** / **Enregistrer et développer**) ; formulaire de tâche réutilisé avec le sous-titre « Idée : … » et, en cas de doublon, un encadré `bg-warning-soft` amené dans la vue avec **Créer quand même** ; suppression bloquée = dialogue de confirmation danger « Suppression bloquée » avec **Supprimer quand même**.
- **Matrice** : les cartes compactes n’affichent pas le repère « Idée » (comme le projet et les étiquettes) ; **Mes tâches** l’affiche en `chip`.
- **Tutoriel** (lot 14, composant partagé `ff-tour`) : bouton discret (`btn-ghost`) **Comment ça marche ?** (icône d’aide) dans l’en-tête, avant **Catégories**. Le schéma « de l’idée à l’action » est une suite de trois cartes numérotées (icône ronde, titre, phrase) : **ambre** (ampoule ; `--warning-soft`, `--q3-accent`), **violet** (étincelles ; `--brand-soft`, `--brand`) et **vert** (liste cochée ; `--success-soft`, `--success`), tirés des tokens pour rester justes en clair et en sombre. Flèches dessinées en CSS (`--muted`) entre les cartes ; de gauche à droite sur ordinateur, empilées de haut en bas sous 640 px (cartes en ligne, texte à gauche). L’étape mise en avant reçoit un anneau de 3 px à sa couleur ; les autres passent en neutre (`--surface-2`, `--line`, `--muted`) en gardant le texte en `--fg`, donc lisible. Les étapes ciblées sont éclairées par le projecteur et la bulle de la visite guidée de Mes achats.

### Archives

Présenter le contexte de période et les filtres, puis les groupes temporels. Chaque entrée distingue date réelle, temps et cycle. Restaurer ne ressemble pas à supprimer. Le vide doit préciser si aucun résultat correspond aux filtres ou si aucune tâche n’a encore été terminée.

### Paramètres

Apparence/région → préférences générales → Notes & idées (éditeur par défaut, deux cartes radio) → export/import → raccourcis. Il n’y a plus de bloc de durées Pomodoro. L’enregistrement automatique Angular et le bouton React doivent être visibles et cohérents avec leur mode de fonctionnement.

L’import montre d’abord les conséquences ; erreurs et doublons restent lisibles. Le bouton de confirmation ne doit pas suggérer qu’un fichier a déjà été importé au stade de l’aperçu.

## 17. États transversaux et microcopie

| Situation               | Message / intention de conception                                   |
| ----------------------- | ------------------------------------------------------------------- |
| Première utilisation    | « Votre matrice est vide » + créer une tâche                        |
| Filtre sans résultat    | Inviter à élargir la recherche, pas à recréer des données           |
| Lecture API échouée     | Décrire l’indisponibilité et proposer Réessayer                     |
| Enregistrement en cours | Éviter les doubles soumissions ; préserver la saisie                |
| Erreur métier           | Expliquer ce qu’il faut corriger, par exemple le début réel absent  |
| Conflit concurrent      | Proposer de recharger et recommencer à partir des données actuelles |
| Notification refusée    | Expliquer l’autorisation du navigateur ; ne pas réessayer en boucle |
| Import en aperçu        | Annoncer le nombre de créations/doublons avant confirmation         |

Ces formulations sont des intentions ; ne pas confondre les exemples avec des libellés garantis identiques dans chaque variante. Préférer verbes concrets et messages courts, sans jargon de framework ni codes HTTP bruts comme seule explication.

## 18. Accessibilité et interaction

- Garder un lien d’évitement vers le contenu principal, une navigation nommée et un titre de page.
- Employer des boutons pour les actions et des liens pour la navigation.
- Relier chaque label à son contrôle ; un placeholder ne remplace pas un label.
- Rendre sélection, expansion, état occupé et messages d’erreur perceptibles au clavier et par technologies d’assistance.
- Préserver le focus lors de l’ouverture/fermeture de dialogue ; éviter les pièges de clavier.
- Fournir une alternative aux déplacements souris et des indications suffisamment proches de l’action.
- Réduire les animations avec `prefers-reduced-motion` ; ne pas faire dépendre une information d’une animation.
- Vérifier les couleurs, le zoom, le contenu tronqué et l’espace au-dessus de la navigation mobile.

Le projet a des contrôles automatisés et des alternatives clavier, mais la navigation complète avec lecteur d’écran et les gestes réels sur téléphone restent à consigner.

## 19. Organisation du code de présentation

```text
Angular : features/<domaine>/pages/<page>/
  page.ts        état et orchestration
  page.html      structure et événements
  page.css       présentation locale si nécessaire

React : features/<domaine>/pages/<page>/
  page.tsx       assemblage du hook et de la vue
  page.view.tsx  JSX et événements de la vue
  use-page.ts    état, requêtes et actions
```

Un composant réutilisable a son sous-dossier `components/<nom>/` ou `shared/ui/<nom>/`. Les règles de domaine React peuvent être dans `features/<domaine>/styles/`. Les styles globaux restent dans `styles/` ; le point d’entrée `index.css` conserve l’ordre de cascade.

React utilise du JSX dans des fichiers `.tsx`, pas des templates HTML externes. La matrice Angular montre la séparation sémantique souhaitée. Les autres templates Tailwind ne doivent pas être présentés comme déjà convertis.

Pour les valeurs dynamiques, transmettre une variable CSS ou une donnée d’état ; laisser la règle visuelle dans la feuille. Exemple : la couleur d’un projet alimente `--project-color`, et la feuille définit la bordure et la couleur de son icône. Ne pas générer un grand bloc CSS dans une méthode TypeScript pour remplacer une feuille.

## 20. Écarts connus entre variantes

| Sujet                          | État actuel                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Police de base et densité      | Légèrement différentes ; harmonisation à faire par mesures, pas par affirmation.                       |
| Barre repliée                  | Angular 72 px ; React 76 px.                                                                           |
| Anneau Focus et actions        | Dimensions et composition différentes.                                                                 |
| Statistiques                   | ECharts côté Angular ; SVG/CSS/tableaux côté React.                                                    |
| Enregistrement des préférences | Automatique Angular ; explicite React.                                                                 |
| Écoute du son                  | Bouton présent dans le panneau Angular ; pas de bouton équivalent livré dans le nouveau panneau React. |
| CSS Angular                    | Conversion stricte effectuée pour la matrice ; utilitaires encore présents ailleurs.                   |
| Captures                       | Plusieurs sont antérieures au déplacement complet des réglages Focus.                                  |

Ces écarts doivent guider une recette ou une harmonisation ; ils ne justifient pas de masquer une donnée ou de supprimer une action utile.

## 21. Protocole de recette visuelle

1. Fixer même backend de test, même fixture, même période et même fuseau pour les deux interfaces.
2. Attendre la fin des builds ; ne pas reconstruire pendant les captures.
3. Ouvrir les neuf routes, en clair et sombre, avec données vides puis représentatives.
4. Capturer 1440×900, 768×1024 et 390×844. Ouvrir aussi les dialogues, menus et le panneau Configurer.
5. Tester le focus clavier, le zoom 200 %, les titres longs, le retour à la ligne et les états d’erreur.
6. Comparer aux références en séparant contenu réel, géométrie, couleur et interaction ; noter l’écart et son impact.
7. Enregistrer la date, le navigateur, la fixture et les limites ; ne pas écraser silencieusement une preuve plus ancienne.

Le rapport de [régression visuelle](../historique/2026-11-refonte-frontends/recette-visuelle.md) décrit la base historique. Les captures correspondantes sont actuellement absentes de la copie locale ; les régénérer avant une nouvelle comparaison visuelle. Les 28 audits axe sans violation et les contrôles de débordement sont des preuves ciblées ; l’approbation humaine du design reste distincte.

## 22. Faire évoluer le design

Pour une nouvelle fonctionnalité : définir son intention et ses états, réutiliser les tokens/composants, créer son répertoire, relier les données réelles, vérifier les deux thèmes et le mobile, puis mettre à jour cette référence et la checklist. Une nouvelle couleur sémantique doit être définie dans le fichier commun et justifiée par un nouveau rôle.

Priorités prochaines : nouvelle capture du panneau Focus, correction des petites cibles et contrastes éventuels, conversion progressive des utilitaires Angular, réduction des sélecteurs globaux trop dépendants de la structure HTML, puis harmonisation des écarts réellement gênants entre les deux interfaces.
