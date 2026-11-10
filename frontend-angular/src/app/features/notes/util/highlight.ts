import type { TextEdit } from './markdown';

/** Couleurs de surlignage proposees, dans l'ordre de la barre d'outils. */
export const HIGHLIGHT_COLORS = ['yellow', 'red', 'sky', 'violet'] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export const HIGHLIGHT_LABEL: Record<HighlightColor, string> = {
  yellow: 'Jaune',
  red: 'Rouge',
  sky: 'Bleu ciel',
  violet: 'Violet',
};

export function isHighlightColor(value: unknown): value is HighlightColor {
  return (HIGHLIGHT_COLORS as readonly unknown[]).includes(value);
}

/**
 * Syntaxe Markdown d'un surlignage. Jaune : `==texte==`, la syntaxe la plus repandue (Obsidian, Typora...).
 * Autres couleurs : balise HTML `<mark data-color="...">`, que GitHub et la plupart des visionneuses Markdown
 * affichent surlignee (en jaune) ; la couleur n'est rendue que par l'application.
 */
export function highlightMarkers(color: HighlightColor): { open: string; close: string } {
  return color === 'yellow'
    ? { open: '==', close: '==' }
    : { open: `<mark data-color="${color}">`, close: '</mark>' };
}

export interface HighlightMatch {
  /** Texte Markdown reconnu, balises comprises. */
  raw: string;
  color: HighlightColor;
  /** Contenu surligne (Markdown en ligne). */
  text: string;
}

/** `==texte==` : contenu non vide, sans espace contre les `==` (« a == b » n'est pas un surlignage). */
const EQUALS = /^==(?=[^\s=])([\s\S]*?[^\s=])==(?!=)/;
/** `<mark>` ou `<mark data-color="...">` (couleur inconnue : jaune). */
const TAG = /^<mark(?:\s+data-color=["']?([a-z-]+)["']?)?\s*>([\s\S]*?)<\/mark>/i;
const TAG_START = /<mark[\s>]/i;

/** Surlignage au debut de `src`, ou undefined. */
export function matchHighlight(src: string): HighlightMatch | undefined {
  const equals = EQUALS.exec(src);
  if (equals) return { raw: equals[0], color: 'yellow', text: equals[1] };
  const tag = TAG.exec(src);
  if (!tag || !tag[2].trim()) return undefined;
  const color = tag[1]?.toLowerCase();
  return { raw: tag[0], color: isHighlightColor(color) ? color : 'yellow', text: tag[2] };
}

/** Position du prochain surlignage possible dans `src` (-1 : aucun) : evite d'analyser tout le paragraphe. */
export function highlightStart(src: string): number {
  const positions = [src.indexOf('=='), src.search(TAG_START)].filter((i) => i >= 0);
  return positions.length ? Math.min(...positions) : -1;
}

/** Surlignage qui entoure exactement [start, end[, balises a l'exterieur de la selection. */
function around(text: string, start: number, end: number) {
  for (const color of HIGHLIGHT_COLORS) {
    for (const { open, close } of [
      highlightMarkers(color),
      ...(color === 'yellow' ? [{ open: '<mark>', close: '</mark>' }] : []),
    ]) {
      if (
        text.slice(start - open.length, start) === open &&
        text.slice(end, end + close.length) === close
      ) {
        return { color, from: start - open.length, to: end + close.length };
      }
    }
  }
  return undefined;
}

/**
 * Surligne la selection [start, end[ du mode Markdown. `toggle` (bouton principal) : la meme couleur retire le
 * surlignage, une autre le remplace. Sinon (choix dans le menu), la couleur est simplement appliquee.
 * `color` null retire le surlignage. La selection peut porter sur le texte seul ou sur le surlignage entier.
 */
export function applyHighlight(
  text: string,
  start: number,
  end: number,
  color: HighlightColor | null,
  toggle = false,
): TextEdit {
  let existing = around(text, start, end);
  let inner = text.slice(start, end);
  if (!existing) {
    const whole = matchHighlight(inner);
    if (whole && whole.raw === inner) {
      existing = { color: whole.color, from: start, to: end };
      inner = whole.text;
    }
  }
  if (existing) {
    // Deja de cette couleur : rien a changer.
    if (color === existing.color && !toggle) return { text, start, end };
    const base = text.slice(0, existing.from) + inner + text.slice(existing.to);
    if (color === null || color === existing.color) {
      return { text: base, start: existing.from, end: existing.from + inner.length };
    }
    return wrapWith(base, existing.from, existing.from + inner.length, color);
  }
  if (color === null) return { text, start, end };
  return wrapWith(text, start, end, color);
}

function wrapWith(text: string, start: number, end: number, color: HighlightColor): TextEdit {
  const { open, close } = highlightMarkers(color);
  const result = text.slice(0, start) + open + text.slice(start, end) + close + text.slice(end);
  return { text: result, start: start + open.length, end: end + open.length };
}
