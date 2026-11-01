# Design system des deux frontends

La référence complète est désormais [design.md](design.md) : tokens, écrans, composants, états, responsive, accessibilité et écarts entre variantes. Ce document conserve un résumé de l’identité initiale.

Les tokens communs sont dans `shared/design-tokens.css`. Angular et React importent ce fichier. Aucune maquette PNG ne sert de fond d’interface.

| Rôle | Clair | Sombre |
|---|---|---|
| Fond | #faf8ff | #0d0c21 |
| Surface | #ffffff | #19172e |
| Texte | #1b1835 | #f6f2ff |
| Secondaire | #625b7c | #bbb2d1 |
| Marque | #7437f6 | #b17aff |

Q1 corail, Q2 bleu, Q3 ambre, Q4 violet. Chaque quadrant a un texte contrasté, un accent, un fond et un contour distincts. La couleur est doublée de badges Q1–Q4, libellés et icônes. Boutons principaux en dégradé violet, navigation active avec contour et lueur légère.

Inter variable locale, icônes Lucide, rayons 8/12/22 px, ombres transparentes, espacements fondés sur 4/8 px. Sidebar 246 px, repliante, navigation mobile en bas. Décor de paysage en CSS. Listes denses et focus visible.

La matrice comprend uniquement quatre quadrants, en 2×2 sur grand écran, puis en onglets sur téléphone. Aucun widget Focus ni panneau droit. Le calendrier possède les panneaux de détail du jour et tâches non planifiées ; la liste quotidienne reste accessible au clavier lorsque les petites cellules ne peuvent pas tout montrer.

Les six KPI métier du dashboard sont conservés. Compteurs, progressions, anneaux et graphiques proviennent des API. Les composants absents des images (cycles, six dates, imports) reprennent les mêmes cartes et champs. Les exemples de données résident exclusivement dans la base de recette.

Thème LIGHT/DARK/SYSTEM persistant sur le serveur. Cache local pour le premier rendu, puis synchronisation avec le serveur. `prefers-reduced-motion` désactive les animations non essentielles. Dialogues Angular CDK et React natifs : Échap, confinement et restitution du focus. Erreurs ProblemDetail visibles dans les formulaires ; aucun succès avant confirmation serveur.

Composants propres à chaque framework ; DTO, dates et tokens partagés. Styles Angular dans `frontend-angular/src/styles/layout.css`, React dans `frontend-react/src/styles/index.css`.
