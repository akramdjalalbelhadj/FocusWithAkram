/**
 * Visites guidees : modele des etapes et calculs de placement (sans dependance a Angular, testes a part).
 * Utilises par « Mes achats » et « Notes & idées ».
 */

/** Etape d'un schema : une icone, un titre et une phrase, dans une couleur du theme (q1 a q4 : quadrants). */
export interface TourStage {
  icon: string;
  title: string;
  text: string;
  tone: 'amber' | 'violet' | 'green' | 'blue' | 'q1' | 'q2' | 'q3' | 'q4';
  /** Repere affiche avant le titre (par exemple « Q1 ») ; par defaut, le numero de l'etape. */
  badge?: string;
}

/** Schema simple et colore, lu comme une liste numerotee par les lecteurs d'ecran. */
export interface TourDiagram {
  /** Nom de la liste pour les lecteurs d'ecran. */
  label: string;
  stages: readonly TourStage[];
  /** `flow` (par defaut) : etapes reliees par des fleches ; `matrix` : quatre cases en 2 × 2 avec leurs axes. */
  layout?: 'flow' | 'matrix';
  /** Axes d'une matrice : intitules des colonnes (en haut) et des lignes (a gauche), purement visuels. */
  axes?: { columns: readonly [string, string]; rows: readonly [string, string] };
  /** Etape mise en avant (index a partir de 0) ; les autres restent visibles en retrait. */
  focus?: number;
}

/**
 * Etape de la visite guidee : l'element montre (attribut `data-tour`), un titre et une explication courte.
 * Sans cible, la bulle est centree sur l'ecran assombri ; un schema peut accompagner le texte.
 */
export interface TourStep {
  target?: string;
  title: string;
  text: string;
  diagram?: TourDiagram;
}

/** Etapes dont la cible est presente a l'ecran (ou sans cible), dans l'ordre de la visite. */
export function availableSteps(
  steps: readonly TourStep[],
  isPresent: (target: string) => boolean,
): TourStep[] {
  return steps.filter((s) => !s.target || isPresent(s.target));
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
