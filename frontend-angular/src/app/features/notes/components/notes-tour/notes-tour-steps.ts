import type { TourDiagram, TourStep } from '../../../../shared/ui/tour/tour-model';

/** Le but du module en un schema : une idee captee, developpee, puis transformee en actions. */
export const IDEA_FLOW: TourDiagram = {
  label: 'Le parcours d’une idée, en trois étapes',
  stages: [
    {
      icon: 'lightbulb',
      tone: 'amber',
      title: 'Nouvelle idée',
      text: 'Capturer une pensée spontanée',
    },
    {
      icon: 'sparkles',
      tone: 'violet',
      title: 'Brainstorming',
      text: 'Développer, enrichir et organiser l’idée',
    },
    {
      icon: 'list-checks',
      tone: 'green',
      title: 'Transformation en tâches',
      text: 'Créer une ou plusieurs actions réalisables',
    },
  ],
};

/**
 * Tutoriel de « Notes & idées », affiche sur la liste des idees. Il suit le parcours d'une idee : le schema d'abord,
 * puis chaque etape a l'endroit ou elle se fait. Une etape dont la cible est absente est sautee.
 */
export const NOTES_TOUR_STEPS: readonly TourStep[] = [
  {
    title: 'Notes & idées : de l’idée à l’action',
    text: 'Ce module sert à ne perdre aucune idée et à la faire avancer jusqu’à l’action. Chaque idée suit le même chemin, en trois étapes :',
    diagram: IDEA_FLOW,
  },
  {
    target: 'notes-capture',
    title: '1. Nouvelle idée : notez-la tout de suite',
    text: 'Une pensée vous vient ? Un titre suffit. « Noter » l’enregistre sans quitter la page ; « Développer » l’ouvre aussitôt pour la travailler. Depuis n’importe quel écran, la touche I ouvre la saisie rapide.',
  },
  {
    target: 'notes-list',
    title: '2. Brainstorming : développez vos idées',
    text: 'Ouvrez une idée pour la développer : texte libre, titres, listes, cases à cocher, en Markdown ou en éditeur visuel. Tout est enregistré automatiquement : revenez-y autant de fois qu’il le faut.',
  },
  {
    target: 'notes-categories',
    title: 'Organisez vos idées',
    text: 'Rangez chaque idée dans une catégorie colorée (travail, perso, projet…) et ajoutez des étiquettes : la recherche et les filtres les retrouvent en un instant.',
  },
  {
    title: '3. Transformation en tâches',
    text: 'Quand une idée est mûre, ouvrez-la et utilisez « Créer une tâche » : chaque action réalisable rejoint la matrice d’Eisenhower. L’idée reste ici, garde le lien vers ses tâches et affiche leur avancement.',
    diagram: { ...IDEA_FLOW, focus: 2 },
  },
  {
    target: 'notes-views',
    title: 'Où en est chaque idée ?',
    text: '« À transformer » liste les idées qui n’ont encore aucune tâche, « Avec tâches » celles déjà passées à l’action, « Favorites » celles à garder sous la main.',
  },
  {
    target: 'notes-tour-button',
    title: 'Revoir ce tutoriel',
    text: 'Ce bouton relance le tutoriel quand vous le souhaitez.',
  },
];
