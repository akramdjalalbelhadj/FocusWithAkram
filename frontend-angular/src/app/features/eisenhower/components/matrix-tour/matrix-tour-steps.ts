import type { TourDiagram, TourStep } from '../../../../shared/ui/tour/tour-model';

/**
 * Le principe de la matrice en un schema : deux questions (urgent ? important ?) donnent quatre cases, chacune avec
 * son action. Disposition et couleurs identiques a la matrice (Q1 en haut a gauche).
 */
export const EISENHOWER_MATRIX: TourDiagram = {
  label: 'Les quatre cases de la matrice d’Eisenhower',
  layout: 'matrix',
  axes: { columns: ['Urgent', 'Pas urgent'], rows: ['Important', 'Pas important'] },
  stages: [
    {
      badge: 'Q1',
      icon: 'flame',
      tone: 'q1',
      title: 'Faire maintenant',
      text: 'Urgent et important : à traiter en premier',
    },
    {
      badge: 'Q2',
      icon: 'calendar-check',
      tone: 'q2',
      title: 'Planifier',
      text: 'Important, pas urgent : réservez-lui du temps',
    },
    {
      badge: 'Q3',
      icon: 'users',
      tone: 'q3',
      title: 'Déléguer / limiter',
      text: 'Urgent, pas important : confiez-le ou faites court',
    },
    {
      badge: 'Q4',
      icon: 'archive',
      tone: 'q4',
      title: 'Éliminer / plus tard',
      text: 'Ni urgent ni important : abandonnez ou reportez',
    },
  ],
};

/**
 * Tutoriel de la matrice d'Eisenhower : le principe d'abord (schema), puis la page. Une etape dont la cible est absente
 * est sautee (onglets Q1 a Q4 seulement sur petit ecran, carte seulement s'il existe une tache).
 */
export const MATRIX_TOUR_STEPS: readonly TourStep[] = [
  {
    title: 'La matrice d’Eisenhower : décider quoi faire d’abord',
    text: 'Chaque tâche se range selon deux questions : est-elle urgente ? est-elle importante ? La case obtenue dit quoi en faire :',
    diagram: EISENHOWER_MATRIX,
  },
  {
    target: 'matrix-new-task',
    title: 'Ajoutez une tâche',
    text: '« Nouvelle tâche » ouvre le formulaire complet : titre, case de la matrice, échéance, projet, étiquettes. La touche N fait de même depuis n’importe quel écran.',
  },
  {
    target: 'matrix-tabs',
    title: 'Une case à la fois',
    text: 'Sur petit écran, la matrice montre une case à la fois : touchez Q1, Q2, Q3 ou Q4 pour changer. Le chiffre donne le nombre de tâches.',
  },
  {
    target: 'matrix-grid',
    title: 'Vos quatre cases',
    text: 'Chaque case a sa couleur, son nombre de tâches et ses retards. Son bouton « + » ou l’ajout rapide en bas (Entrée) crée une tâche directement au bon endroit.',
  },
  {
    target: 'matrix-task',
    title: 'Changez une tâche de case',
    text: 'Quand sa priorité change, glissez la carte vers une autre case. Au clavier : Alt + 1 à 4 la déplace, Alt + ↑ ou ↓ la remonte ou la descend. Ouvrez-la d’un clic ; son menu lance un Pomodoro.',
  },
  {
    title: 'Le secret : la case « Planifier »',
    text: 'Les tâches importantes mais pas urgentes (projets, apprentissage, santé) sont celles qui font vraiment avancer. Réservez-leur du temps avant qu’elles ne deviennent urgentes : la case Q1 se videra peu à peu.',
    diagram: { ...EISENHOWER_MATRIX, focus: 1 },
  },
  {
    target: 'matrix-filters',
    title: 'N’affichez que l’essentiel',
    text: 'Recherche, projet, statut, étiquette ou « En retard » : filtrez la matrice pour vous concentrer sur ce qui compte maintenant.',
  },
  {
    target: 'matrix-tour-button',
    title: 'Revoir ce tutoriel',
    text: 'Ce bouton relance le tutoriel quand vous le souhaitez.',
  },
];
