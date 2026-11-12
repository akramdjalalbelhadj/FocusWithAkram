/**
 * Schemas ASCII des notes (arborescences, tableaux, bannieres) : outils communs. Un schema est enregistre dans
 * le Markdown comme un bloc de code ```ascii, lisible partout (GitHub, Obsidian, export).
 */

/** Langage des blocs de code qui contiennent un schema ASCII. */
export const ASCII_LANGUAGE = 'ascii';

export type AsciiKind = 'tree' | 'table' | 'banner';

/**
 * Largeur affichee d'un texte en police a chasse fixe : les accents combines ne comptent pas, les emojis et
 * les ideogrammes occupent deux colonnes.
 */
export function displayWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (/\p{Mn}|\p{Me}|[\u200b-\u200f\ufe0f]/u.test(char)) continue;
    if (
      /\p{Emoji_Presentation}/u.test(char) ||
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe4f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1faff) ||
      (code >= 0x20000 && code <= 0x3fffd)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/** Complete un texte par des espaces jusqu'a la largeur affichee demandee. */
export function padEnd(text: string, width: number): string {
  return text + ' '.repeat(Math.max(0, width - displayWidth(text)));
}

/** Branche d'arborescence suivie d'un nom (une bordure de tableau `+----+` ou `├───┼` ne compte pas). */
const TREE_HINT = /(?:^|\n)[ \t│|]*(?:[├└]──+ ?[^\s─┼┬┴┤]|[|`+\\]--+ ?[^\s\-+=|])/;
const TABLE_HINT =
  /(?:^|\n)\s*[+┌╭╔][-─═=+┬╦]+[+┐╮╗]\s*(?:\n|$)|(?:^|\n)\s*[|│║].*[|│║]\s*(?:\n|$)/;

/** Type probable d'un schema existant, pour ouvrir l'atelier sur le bon onglet. */
export function detectAsciiKind(text: string): AsciiKind {
  if (TREE_HINT.test(text)) return 'tree';
  if (TABLE_HINT.test(text)) return 'table';
  return 'banner';
}

/** Bloc ```ascii entourant le schema ; la cloture s'allonge si le schema contient lui-meme des ```. */
export function asciiFence(body: string): string {
  const longest = Math.max(2, ...[...body.matchAll(/`{3,}/g)].map((m) => m[0].length));
  const fence = '`'.repeat(longest + 1);
  return `${fence}${ASCII_LANGUAGE}\n${body.replace(/\s+$/, '')}\n${fence}`;
}

export interface AsciiFenceRange {
  /** Debut de la ligne d'ouverture. */
  from: number;
  /** Fin de la ligne de cloture (ou du texte si le bloc n'est pas ferme). */
  to: number;
  body: string;
}

/**
 * Bloc ```ascii (ou ~~~ascii) qui contient la position `pos` dans le Markdown, s'il y en a un. Les autres blocs
 * de code sont suivis pour ne pas confondre une cloture avec une ouverture.
 */
export function findAsciiFence(text: string, pos: number): AsciiFenceRange | null {
  const lines = text.split('\n');
  let offset = 0;
  let open: { marker: string; from: number; bodyFrom: number; ascii: boolean } | null = null;
  for (const line of lines) {
    const lineEnd = offset + line.length;
    if (!open) {
      const m = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)[^`]*$/.exec(line);
      if (m) {
        open = {
          marker: m[1],
          from: offset,
          bodyFrom: Math.min(lineEnd + 1, text.length),
          ascii: m[2].toLowerCase() === ASCII_LANGUAGE,
        };
      }
    } else {
      const close = new RegExp(
        `^ {0,3}${open.marker[0] === '`' ? '`' : '~'}{${open.marker.length},}\\s*$`,
      );
      if (close.test(line)) {
        if (open.ascii && pos >= open.from && pos <= lineEnd) {
          return {
            from: open.from,
            to: lineEnd,
            body: text.slice(open.bodyFrom, Math.max(open.bodyFrom, offset - 1)),
          };
        }
        open = null;
      }
    }
    offset = lineEnd + 1;
  }
  if (open?.ascii && pos >= open.from) {
    return { from: open.from, to: text.length, body: text.slice(open.bodyFrom) };
  }
  return null;
}

const PDF_SAFE: Record<string, string> = {
  '│': '|',
  '┃': '|',
  '║': '|',
  '─': '-',
  '━': '-',
  '═': '=',
  '█': '#',
  '▓': '#',
  '▒': '#',
  '░': '.',
};

/**
 * Remplace les traits et blocs Unicode par leurs equivalents ASCII (`|`, `-`, `+`, `#`) : la police Courier du
 * PDF ne sait pas les dessiner. Les colonnes restent alignees (un caractere pour un caractere).
 */
export function toPdfSafe(text: string): string {
  return text.replace(/[\u2500-\u259f]/g, (c) => PDF_SAFE[c] ?? '+');
}
