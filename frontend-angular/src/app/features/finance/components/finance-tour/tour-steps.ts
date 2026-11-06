/** Etape de la visite guidee : l'element montre (attribut `data-tour`), un titre et une explication courte. */
export interface TourStep {
  target: string;
  title: string;
  text: string;
}

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

/** Etapes dont la cible est presente a l'ecran, dans l'ordre de la visite. */
export function availableSteps(
  steps: readonly TourStep[],
  isPresent: (target: string) => boolean,
): TourStep[] {
  return steps.filter((s) => isPresent(s.target));
}

/** « Étape x sur n » (index a partir de 0). */
export function stepLabel(index: number, total: number): string {
  return `Étape ${index + 1} sur ${total}`;
}

/** Etape suivante, ou null apres la derniere (fin de la visite). */
export function nextIndex(index: number, total: number): number | null {
  return index + 1 < total ? index + 1 : null;
}

/** Etape precedente ; la premiere reste la premiere. */
export function previousIndex(index: number): number {
  return Math.max(0, index - 1);
}

export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

/** En dessous de cette largeur (telephone), la bulle occupe le bas de l'ecran. */
export const PHONE_MAX_WIDTH = 640;
/** Hauteur de la barre superieure collante de l'application, plus une marge. */
export const TOP_OFFSET = 72;
/** Marge autour de la cible mise en valeur. */
export const SPOT_PADDING = 6;

/**
 * Position de la bulle : `sheet` en bas de l'ecran (telephone), `below` ou `above` la cible selon la place,
 * `pinned` en bas de l'ecran par-dessus une cible trop haute, `center` sans cible.
 */
export interface BubblePlacement {
  mode: 'sheet' | 'below' | 'above' | 'pinned' | 'center';
  top: number | null;
  left: number | null;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), Math.max(min, max));

/** Zone mise en valeur : la cible elargie d'une petite marge. */
export function spotBox(rect: Box, padding = SPOT_PADDING): Box {
  return {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + 2 * padding,
    height: rect.height + 2 * padding,
  };
}

/** Place la bulle pres de la cible (coordonnees de la fenetre), sans deborder de l'ecran. */
export function placeBubble(
  target: Box | null,
  bubble: Size,
  viewport: Size,
  gap = 12,
): BubblePlacement {
  if (viewport.width < PHONE_MAX_WIDTH) return { mode: 'sheet', top: null, left: null };
  if (!target) return { mode: 'center', top: null, left: null };
  const left = clamp(target.left, gap, viewport.width - bubble.width - gap);
  const below = target.top + target.height + gap;
  if (below + bubble.height <= viewport.height - gap) return { mode: 'below', top: below, left };
  const above = target.top - gap - bubble.height;
  if (above >= gap) return { mode: 'above', top: above, left };
  return { mode: 'pinned', top: Math.max(gap, viewport.height - bubble.height - gap), left };
}

/**
 * Defilement vertical de la fenetre qui montre la cible et sa bulle : inchange si tout est deja visible ; sinon la
 * cible (et la bulle sous elle, sur ordinateur) est centree dans l'espace libre, ou alignee sous la barre superieure
 * si elle est trop haute. Sur telephone, l'espace libre s'arrete au-dessus de la bulle.
 */
export function scrollTopFor(
  target: Box,
  bubble: Size,
  viewport: Size,
  scrollY: number,
  gap = 12,
): number {
  const phone = viewport.width < PHONE_MAX_WIDTH;
  const bottom = viewport.height - (phone ? bubble.height + 2 * gap : 0);
  const visible = target.top >= TOP_OFFSET && target.top + target.height <= bottom;
  if (visible && (phone || placeBubble(target, bubble, viewport, gap).mode !== 'pinned')) {
    return scrollY;
  }
  const room = bottom - TOP_OFFSET;
  const block = phone ? target.height : target.height + gap + bubble.height;
  const offset = block < room ? (room - block) / 2 : 0;
  return Math.max(0, Math.round(target.top + scrollY - TOP_OFFSET - offset));
}
