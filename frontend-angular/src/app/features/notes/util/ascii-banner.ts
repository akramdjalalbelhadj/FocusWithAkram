/**
 * Bannieres ASCII : gros caracteres sur 5 lignes (police maison), ou texte encadre. Les accents sont retires
 * (É -> E) ; un caractere inconnu devient `?`.
 */
import { displayWidth, padEnd } from './ascii';

export type BannerStyle = 'block' | 'hash' | 'letters' | 'box' | 'box-round' | 'box-double';

export const BANNER_STYLES: readonly { id: BannerStyle; label: string }[] = [
  { id: 'block', label: 'Gros caractères █' },
  { id: 'hash', label: 'Gros caractères #' },
  { id: 'letters', label: 'Gros caractères en lettres' },
  { id: 'box', label: 'Cadre ASCII +--+' },
  { id: 'box-round', label: 'Cadre arrondi ╭─╮' },
  { id: 'box-double', label: 'Cadre double ╔═╗' },
];

/** Police 5 lignes : `#` = trace. */
const FONT: Record<string, readonly string[]> = {
  A: [' ### ', '#   #', '#####', '#   #', '#   #'],
  B: ['#### ', '#   #', '#### ', '#   #', '#### '],
  C: [' ####', '#    ', '#    ', '#    ', ' ####'],
  D: ['#### ', '#   #', '#   #', '#   #', '#### '],
  E: ['#####', '#    ', '#### ', '#    ', '#####'],
  F: ['#####', '#    ', '#### ', '#    ', '#    '],
  G: [' ####', '#    ', '#  ##', '#   #', ' ####'],
  H: ['#   #', '#   #', '#####', '#   #', '#   #'],
  I: ['###', ' # ', ' # ', ' # ', '###'],
  J: ['  ###', '   # ', '   # ', '#  # ', ' ##  '],
  K: ['#   #', '#  # ', '###  ', '#  # ', '#   #'],
  L: ['#    ', '#    ', '#    ', '#    ', '#####'],
  M: ['#   #', '## ##', '# # #', '#   #', '#   #'],
  N: ['#   #', '##  #', '# # #', '#  ##', '#   #'],
  O: [' ### ', '#   #', '#   #', '#   #', ' ### '],
  P: ['#### ', '#   #', '#### ', '#    ', '#    '],
  Q: [' ### ', '#   #', '# # #', '#  # ', ' ## #'],
  R: ['#### ', '#   #', '#### ', '#  # ', '#   #'],
  S: [' ####', '#    ', ' ### ', '    #', '#### '],
  T: ['#####', '  #  ', '  #  ', '  #  ', '  #  '],
  U: ['#   #', '#   #', '#   #', '#   #', ' ### '],
  V: ['#   #', '#   #', '#   #', ' # # ', '  #  '],
  W: ['#   #', '#   #', '# # #', '## ##', '#   #'],
  X: ['#   #', ' # # ', '  #  ', ' # # ', '#   #'],
  Y: ['#   #', ' # # ', '  #  ', '  #  ', '  #  '],
  Z: ['#####', '   # ', '  #  ', ' #   ', '#####'],
  '0': [' ### ', '#  ##', '# # #', '##  #', ' ### '],
  '1': [' # ', '## ', ' # ', ' # ', '###'],
  '2': [' ### ', '#   #', '  ## ', ' #   ', '#####'],
  '3': ['#### ', '    #', ' ### ', '    #', '#### '],
  '4': ['#   #', '#   #', '#####', '    #', '    #'],
  '5': ['#####', '#    ', '#### ', '    #', '#### '],
  '6': [' ### ', '#    ', '#### ', '#   #', ' ### '],
  '7': ['#####', '    #', '   # ', '  #  ', '  #  '],
  '8': [' ### ', '#   #', ' ### ', '#   #', ' ### '],
  '9': [' ### ', '#   #', ' ####', '    #', ' ### '],
  ' ': ['   ', '   ', '   ', '   ', '   '],
  '!': ['#', '#', '#', ' ', '#'],
  '?': ['### ', '   #', ' ## ', '    ', ' #  '],
  '.': [' ', ' ', ' ', ' ', '#'],
  ',': ['  ', '  ', '  ', ' #', '# '],
  ':': [' ', '#', ' ', '#', ' '],
  ';': ['  ', ' #', '  ', ' #', '# '],
  "'": ['#', '#', ' ', ' ', ' '],
  '"': ['# #', '# #', '   ', '   ', '   '],
  '-': ['    ', '    ', '####', '    ', '    '],
  _: ['    ', '    ', '    ', '    ', '####'],
  '+': ['   ', ' # ', '###', ' # ', '   '],
  '=': ['    ', '####', '    ', '####', '    '],
  '*': ['   ', '# #', ' # ', '# #', '   '],
  '/': ['    #', '   # ', '  #  ', ' #   ', '#    '],
  '\\': ['#    ', ' #   ', '  #  ', '   # ', '    #'],
  '(': [' #', '# ', '# ', '# ', ' #'],
  ')': ['# ', ' #', ' #', ' #', '# '],
  '[': ['##', '# ', '# ', '# ', '##'],
  ']': ['##', ' #', ' #', ' #', '##'],
  '<': ['  #', ' # ', '#  ', ' # ', '  #'],
  '>': ['#  ', ' # ', '  #', ' # ', '#  '],
  '#': [' # # ', '#####', ' # # ', '#####', ' # # '],
  '%': ['#   #', '   # ', '  #  ', ' #   ', '#   #'],
  '&': [' ##  ', '#  # ', ' ##  ', '#  # ', ' ## #'],
  '@': [' ### ', '#   #', '# ###', '#    ', ' ####'],
  $: [' ####', '# #  ', ' ### ', '  # #', '#### '],
};

/** Caracteres que la police sait dessiner (les autres deviennent `?`). */
export const BANNER_CHARS = Object.keys(FONT).join('');

function glyph(char: string): readonly string[] {
  const base = char
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toUpperCase();
  const mapped = base === 'Œ' ? 'OE' : base === 'Æ' ? 'AE' : base;
  if (mapped.length > 1) {
    const parts = [...mapped].map(glyph);
    return parts[0].map((_, row) => parts.map((p) => p[row]).join(' '));
  }
  return FONT[mapped] ?? FONT['?'];
}

function bigText(line: string, style: 'block' | 'hash' | 'letters'): string {
  const chars = [...line];
  const rows = ['', '', '', '', ''];
  chars.forEach((char, i) => {
    const g = glyph(char);
    const fill =
      style === 'block'
        ? '█'
        : style === 'hash'
          ? '#'
          : (
              char
                .normalize('NFD')
                .replace(/\p{Mn}/gu, '')
                .toUpperCase()[0] ?? '#'
            ).trim() || '#';
    for (let r = 0; r < 5; r++) rows[r] += (i ? ' ' : '') + g[r].replace(/#/g, fill);
  });
  return rows.map((r) => r.replace(/\s+$/, '')).join('\n');
}

function boxed(lines: string[], style: 'box' | 'box-round' | 'box-double'): string {
  const [tl, tr, bl, br, h, v] =
    style === 'box'
      ? ['+', '+', '+', '+', '-', '|']
      : style === 'box-round'
        ? ['╭', '╮', '╰', '╯', '─', '│']
        : ['╔', '╗', '╚', '╝', '═', '║'];
  const width = Math.max(0, ...lines.map(displayWidth));
  const pad = (l: string) => padEnd(l, width);
  return [
    tl + h.repeat(width + 4) + tr,
    ...lines.map((l) => `${v}  ${pad(l)}  ${v}`),
    bl + h.repeat(width + 4) + br,
  ].join('\n');
}

/** Banniere d'un texte (une banniere par ligne pour les gros caracteres, un seul cadre sinon). */
export function renderBanner(text: string, style: BannerStyle = 'block'): string {
  const lines = text.split('\n').map((l) => l.trim());
  while (lines.length && !lines[lines.length - 1]) lines.pop();
  while (lines.length && !lines[0]) lines.shift();
  if (!lines.length) return '';
  if (style === 'box' || style === 'box-round' || style === 'box-double')
    return boxed(lines, style);
  return lines.map((l) => (l ? bigText(l, style) : '')).join('\n\n');
}
