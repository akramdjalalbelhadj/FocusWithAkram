/**
 * Tableaux ASCII : grille de cellules <-> texte encadre (`+---+`, `┌───┐`...). L'analyse accepte aussi un tableau
 * Markdown, ou des valeurs separees par des tabulations, points-virgules ou virgules (copie d'un tableur).
 */
import { displayWidth } from './ascii';

export type CellAlign = 'left' | 'center' | 'right';
export type TableStyle = 'ascii' | 'unicode' | 'rounded' | 'double';

export interface AsciiTable {
  /** Lignes de cellules, toutes de meme longueur ; la premiere est l'en-tete si `header`. */
  rows: string[][];
  header: boolean;
  align: CellAlign[];
  /** Trait entre chaque ligne de donnees. */
  rowLines: boolean;
}

interface Frame {
  top: [string, string, string];
  mid: [string, string, string];
  head: [string, string, string];
  bottom: [string, string, string];
  /** Trait du cadre (haut et bas). */
  h: string;
  /** Trait entre deux lignes de donnees. */
  mh: string;
  /** Trait sous l'en-tete : different de `mh` pour que l'en-tete soit reconnu a la relecture. */
  hh: string;
  v: string;
}

const FRAMES: Record<TableStyle, Frame> = {
  ascii: {
    top: ['+', '+', '+'],
    mid: ['+', '+', '+'],
    head: ['+', '+', '+'],
    bottom: ['+', '+', '+'],
    h: '-',
    mh: '-',
    hh: '=',
    v: '|',
  },
  unicode: {
    top: ['┌', '┬', '┐'],
    mid: ['├', '┼', '┤'],
    head: ['╞', '╪', '╡'],
    bottom: ['└', '┴', '┘'],
    h: '─',
    mh: '─',
    hh: '═',
    v: '│',
  },
  rounded: {
    top: ['╭', '┬', '╮'],
    mid: ['├', '┼', '┤'],
    head: ['╞', '╪', '╡'],
    bottom: ['╰', '┴', '╯'],
    h: '─',
    mh: '─',
    hh: '═',
    v: '│',
  },
  double: {
    top: ['╔', '╦', '╗'],
    mid: ['╟', '╫', '╢'],
    head: ['╠', '╬', '╣'],
    bottom: ['╚', '╩', '╝'],
    h: '═',
    mh: '─',
    hh: '═',
    v: '║',
  },
};

export function emptyTable(rows = 3, cols = 3): AsciiTable {
  return {
    rows: Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => (r === 0 ? `Colonne ${c + 1}` : '')),
    ),
    header: true,
    align: Array.from({ length: cols }, () => 'left'),
    rowLines: false,
  };
}

function pad(text: string, width: number, align: CellAlign): string {
  const space = Math.max(0, width - displayWidth(text));
  if (align === 'right') return ' '.repeat(space) + text;
  if (align === 'center') {
    const left = Math.floor(space / 2);
    return ' '.repeat(left) + text + ' '.repeat(space - left);
  }
  return text + ' '.repeat(space);
}

/** Texte encadre du tableau, colonnes a la largeur de leur plus long contenu. */
export function renderTable(table: AsciiTable, style: TableStyle = 'ascii'): string {
  const f = FRAMES[style];
  const cols = Math.max(1, ...table.rows.map((r) => r.length));
  const cells = table.rows.map((r) =>
    Array.from({ length: cols }, (_, c) => (r[c] ?? '').replace(/\s*\n\s*/g, ' ').trim()),
  );
  const widths = Array.from({ length: cols }, (_, c) =>
    Math.max(1, ...cells.map((r) => displayWidth(r[c]))),
  );
  const line = ([l, m, r]: [string, string, string], h: string) =>
    l + widths.map((w) => h.repeat(w + 2)).join(m) + r;
  const row = (r: string[], head: boolean) =>
    f.v +
    r
      .map((cell, c) => ` ${pad(cell, widths[c], head ? 'left' : (table.align[c] ?? 'left'))} `)
      .join(f.v) +
    f.v;

  const out = [line(f.top, f.h)];
  cells.forEach((r, i) => {
    const head = table.header && i === 0;
    if (i > 0) {
      if (table.header && i === 1) out.push(line(f.head, f.hh));
      else if (table.rowLines) out.push(line(f.mid, f.mh));
    }
    out.push(row(r, head));
  });
  out.push(line(f.bottom, f.h));
  return out.join('\n');
}

const BORDER = /^[\s+\-=:─━═┌┐└┘├┤┬┴┼╭╮╰╯╔╗╚╝╠╣╦╩╬╞╡╪╟╢╫|│║]+$/;
const BAR = /[|│║]/;

function isBorder(line: string): boolean {
  return BORDER.test(line) && /[-=─━═]/.test(line);
}

function splitRow(line: string): string[] {
  let body = line.trim();
  if (BAR.test(body[0] ?? '')) body = body.slice(1);
  if (BAR.test(body[body.length - 1] ?? '')) body = body.slice(0, -1);
  return body.split(BAR);
}

/** Valeurs separees (tableur) : tabulations, sinon points-virgules, sinon virgules. */
function splitDelimited(lines: string[]): string[][] {
  const all = lines.join('\n');
  const sep = all.includes('\t') ? '\t' : all.includes(';') ? ';' : ',';
  return lines.map((l) => l.split(sep));
}

/**
 * Analyse un tableau saisi. Rend null si le texte ne contient aucune ligne de donnees. L'en-tete est reconnu a
 * son trait de separation, l'alignement aux marges des cellules (ou a `:--`, `:-:`, `--:` en Markdown).
 */
export function parseTable(text: string): { table: AsciiTable; style: TableStyle } | null {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.trim());
  if (!lines.length) return null;
  const hasBars = lines.some((l) => !isBorder(l) && BAR.test(l));

  const raw: string[][] = [];
  /** Indices des lignes de donnees suivies d'un trait, et ce trait. */
  const after = new Map<number, string>();
  let markdownAlign: CellAlign[] | null = null;
  if (hasBars) {
    for (const l of lines) {
      if (isBorder(l)) {
        if (raw.length) after.set(raw.length - 1, l.trim());
        if (/:-|-:/.test(l) && raw.length === 1) {
          markdownAlign = splitRow(l).map((c) => {
            const t = c.trim();
            return t.startsWith(':') && t.endsWith(':')
              ? 'center'
              : t.endsWith(':')
                ? 'right'
                : 'left';
          });
        }
      } else if (BAR.test(l)) {
        raw.push(splitRow(l));
      }
    }
  } else {
    // Sans « | » : valeurs separees d'un tableur, sinon ce n'est pas un tableau.
    const plain = lines.filter((l) => !isBorder(l));
    if (!plain.some((l) => /[\t;,]/.test(l))) return null;
    raw.push(...splitDelimited(plain));
  }
  if (!raw.length) return null;

  const cols = Math.max(...raw.map((r) => r.length));
  const padded = raw.map((r) => Array.from({ length: cols }, (_, c) => r[c] ?? ''));
  const rows = padded.map((r) => r.map((c) => c.trim()));

  const separated = [...after.keys()].filter((i) => i < rows.length - 1);
  const rowLines = rows.length > 2 && separated.length === rows.length - 1;
  let header: boolean;
  if (!hasBars) header = rows.length > 1;
  else if (rowLines) header = after.get(0) !== after.get(1);
  else header = after.has(0) && rows.length > 1;

  const align: CellAlign[] = Array.from({ length: cols }, (_, c) => {
    if (markdownAlign) return markdownAlign[c] ?? 'left';
    if (!hasBars) return 'left';
    const body = padded
      .slice(header ? 1 : 0)
      .map((r) => r[c])
      .filter((cell) => cell.trim());
    if (!body.length) return 'left';
    const lead = (s: string) => s.length - s.trimStart().length;
    const trail = (s: string) => s.length - s.trimEnd().length;
    if (body.every((s) => lead(s) <= 1)) return 'left';
    if (body.every((s) => trail(s) <= 1)) return 'right';
    return 'center';
  });

  const style: TableStyle = /[╔║]/.test(text)
    ? 'double'
    : /[╭╰]/.test(text)
      ? 'rounded'
      : /[│─┌]/.test(text)
        ? 'unicode'
        : 'ascii';
  return { table: { rows, header, align, rowLines }, style };
}
