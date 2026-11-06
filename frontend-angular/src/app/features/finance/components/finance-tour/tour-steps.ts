import type { TourStep } from '../../../../shared/ui/tour/tour-model';

// Modele et calculs communs a toutes les visites guidees (partages avec « Notes & idées »).
export {
  PHONE_MAX_WIDTH,
  SPOT_PADDING,
  TOP_OFFSET,
  availableSteps,
  nextIndex,
  placeBubble,
  previousIndex,
  scrollTopFor,
  spotBox,
  stepLabel,
} from '../../../../shared/ui/tour/tour-model';
export type { Box, BubblePlacement, Size, TourStep } from '../../../../shared/ui/tour/tour-model';

/**
 * Visite guidee de « Mes achats ». Toutes les cibles sont visibles depuis l'onglet « Mon mois » (en-tete du module
 * et feuille du mois) ; une etape dont la cible est absente est sautee.
 */
export const FINANCE_TOUR_STEPS: readonly TourStep[] = [
  {
    target: 'finance-tabs',
    title: 'Quatre onglets pour s’y retrouver',
    text: '« Mon mois » est la feuille du mois. « Opérations » garde l’historique et ce qui revient chaque mois. « Projets d’achat » dit si un achat est possible. « Analyses » montre vos statistiques et votre calendrier.',
  },
  {
    target: 'month-nav',
    title: 'Mon mois, mois par mois',
    text: 'Chaque mois a sa feuille : ce qui était prévu et ce qui s’est réellement passé. Changez de mois ici pour revoir un mois passé ou préparer un mois à venir.',
  },
  {
    target: 'month-summary',
    title: 'Prévu, réel et épargne',
    text: 'Le prévu, c’est ce que vous attendiez ; le réel, ce qui a vraiment été reçu ou payé. L’épargne, c’est ce qui reste (revenus moins dépenses), comparée à votre objectif du mois.',
  },
  {
    target: 'month-income',
    title: 'Vos revenus',
    text: 'Saisissez un revenu une seule fois, pour un mois ou pour une période (par exemple votre salaire de novembre à février). Chaque mois, confirmez le montant réellement reçu : un salaire peut baisser, après une absence par exemple.',
  },
  {
    target: 'month-fixed',
    title: 'Vos dépenses fixes',
    text: 'Loyer, téléphone, transport… Saisies une fois, elles sont déjà remplies chaque mois : vous confirmez le paiement. Pour changer un montant, choisissez « à partir de ce mois » (les mois suivants changent aussi) ou « ce mois seulement ».',
  },
  {
    target: 'month-variable',
    title: 'Vos dépenses variables',
    text: 'Courses, restaurants… Chacune a un plafond par mois. Saisissez le total du mois ou vos dépenses au fil du mois. Au-delà du plafond, un commentaire vous est demandé pour expliquer le dépassement.',
  },
  {
    target: 'month-others',
    title: 'Les autres dépenses',
    text: 'Tout le reste : imprévus, achats ponctuels, projets d’achat réalisés. Elles comptent dans le réel du mois et dans votre épargne.',
  },
  {
    target: 'quick-expense',
    title: 'Une dépense en quelques secondes',
    text: 'Le bouton « Dépense » enregistre une dépense payée aujourd’hui. Astuce : la touche E l’ouvre depuis n’importe quel écran.',
  },
  {
    target: 'settings-link',
    title: 'Les réglages',
    text: 'Vos catégories, dont « Prêts » (l’argent prêté est une dépense, son remboursement un revenu), vos préférences, et « Corriger le solde » si le total ne correspond plus à votre argent réel.',
  },
  {
    target: 'tour-button',
    title: 'Revoir la visite',
    text: 'Ce bouton relance la visite guidée quand vous le souhaitez ; elle est aussi proposée dans les réglages.',
  },
];
