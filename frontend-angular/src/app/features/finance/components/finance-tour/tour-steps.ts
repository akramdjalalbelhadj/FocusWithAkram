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
 * et tableau de bord du mois) ; une etape dont la cible est absente est sautee.
 */
export const FINANCE_TOUR_STEPS: readonly TourStep[] = [
  {
    target: 'finance-tabs',
    title: 'Cinq onglets pour s’y retrouver',
    text: '« Mon mois » donne l’essentiel du mois ; « Détails du mois » le montre ligne par ligne. « Opérations » garde l’historique et ce qui revient chaque mois. « Projets d’achat » dit si un achat est possible. « Analyses » montre vos statistiques et votre calendrier.',
  },
  {
    target: 'month-nav',
    title: 'Mois par mois',
    text: 'Changez de mois ici pour revoir un mois passé ou préparer un mois à venir.',
  },
  {
    target: 'month-balance',
    title: 'Votre solde',
    text: 'L’argent dont vous disposez aujourd’hui. S’il ne correspond plus à votre argent réel, « Corriger » enregistre l’écart.',
  },
  {
    target: 'month-revenue',
    title: 'Vos revenus reçus',
    text: 'Ils restent à 0 € tant que vous n’avez pas saisi le salaire du mois. Le salaire prévu de la période (2 290 € de novembre à janvier, par exemple) sert seulement à calculer si vos achats prévus sont possibles.',
  },
  {
    target: 'month-savings',
    title: 'L’épargne du mois',
    text: 'Ce qui reste réellement : revenus reçus moins dépenses payées. Elle est gardée mois par mois pour vos statistiques.',
  },
  {
    target: 'month-details-link',
    title: 'Le détail du mois',
    text: 'Revenus, dépenses fixes (loyer, téléphone…), dépenses variables avec leur plafond (courses…) et autres dépenses, ligne par ligne : c’est là que vous saisissez et corrigez.',
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
