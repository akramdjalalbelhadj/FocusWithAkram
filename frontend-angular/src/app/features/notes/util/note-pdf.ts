import type { JSONContent } from '@tiptap/core';
import type { Content, Decoration, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { CalloutType } from '../editor/callout';
import { CALLOUT_META } from '../editor/callout';
import { noteLowlight } from '../editor/lowlight';
import { toPdfSafe } from './ascii';
import { HighlightColor, isHighlightColor } from './highlight';

/** Idee a mettre en page : titre, lignes d'information deja formatees, contenu analyse par l'editeur. */
export interface PdfNote {
  title: string;
  /** Categorie, etiquettes, dates... affichees sous le titre. */
  meta: string[];
  /** Document ProseMirror (meme analyse Markdown que l'editeur et l'apercu). */
  doc: JSONContent;
  /**
   * Police d'emojis enregistree aupres de pdfmake sous le nom `EMOJI_FONT` : les emojis y sont ecrits (Roboto et
   * Courier n'en ont pas). Absente : les emojis restent dans la police du texte (et n'apparaissent pas).
   */
  emojiFont?: boolean;
}

/** Nom pdfmake de la police d'emojis (Noto Emoji, monochrome : une police PDF n'a pas de couleurs). */
export const EMOJI_FONT = 'NotoEmoji';

/**
 * Un emoji complet : touche (1️⃣), drapeau (deux indicateurs regionaux), ou pictogramme avec selecteur de
 * variante, ton de peau et sequences liees par ZWJ (👨‍👩‍👧).
 */
const EMOJI =
  /[0-9#*]️?⃣|\p{Regional_Indicator}{2}|\p{Extended_Pictographic}[️\p{Emoji_Modifier}]*(?:‍\p{Extended_Pictographic}[️\p{Emoji_Modifier}]*)*/gu;
/** Pictogrammes que Roboto dessine deja (©, ®, ™, ‼...) : sans selecteur emoji, ils restent du texte. */
const TEXT_SYMBOLS = /^[©®™‼⁉]$/;

/** Le texte contient-il un emoji a ecrire avec la police d'emojis ? */
export function hasEmoji(text: string): boolean {
  return [...text.matchAll(EMOJI)].some((m) => !TEXT_SYMBOLS.test(m[0]));
}

/** Decoupe un texte en morceaux : les emojis a part, marques pour la police d'emojis. */
export function splitEmoji(text: string): { text: string; emoji: boolean }[] {
  const parts: { text: string; emoji: boolean }[] = [];
  let last = 0;
  for (const match of text.matchAll(EMOJI)) {
    if (TEXT_SYMBOLS.test(match[0])) continue;
    if (match.index > last) parts.push({ text: text.slice(last, match.index), emoji: false });
    parts.push({ text: match[0], emoji: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), emoji: false });
  return parts;
}

/**
 * Valeur de `text` (chaine ou suite de morceaux) dont les emojis passent dans la police d'emojis. Chaque morceau
 * n'est traite qu'une fois : un morceau emoji produit n'est jamais redecoupe.
 */
function emojiText(text: unknown): unknown {
  const piece = (item: unknown): unknown[] => {
    if (typeof item !== 'string' && (typeof item !== 'object' || item === null)) return [item];
    const value = typeof item === 'string' ? item : (item as { text?: unknown }).text;
    // Morceau compose (texte imbrique) : traite recursivement.
    if (typeof value !== 'string') return [withEmojiFont(item)];
    if (!hasEmoji(value)) return [item];
    const style = typeof item === 'string' ? {} : item;
    return splitEmoji(value).map((p) =>
      p.emoji ? { ...style, text: p.text, font: EMOJI_FONT } : { ...style, text: p.text },
    );
  };
  if (Array.isArray(text)) return text.flatMap(piece);
  if (typeof text === 'string') return hasEmoji(text) ? piece(text) : text;
  return withEmojiFont(text);
}

/** Applique la police d'emojis a tout le texte d'une definition (blocs, tableaux, colonnes...). */
function withEmojiFont<T>(node: T): T {
  if (Array.isArray(node)) return node.map(withEmojiFont) as T;
  if (!node || typeof node !== 'object') return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    // Dessins (canvas) et fonctions de mise en page : rien a ecrire.
    if (key === 'canvas' || typeof value === 'function') out[key] = value;
    else if (key === 'text') out[key] = emojiText(value);
    else out[key] = withEmojiFont(value);
  }
  return out as T;
}

/** Couleurs du theme clair de l'application : un PDF s'imprime et se lit sur fond blanc. */
const C = {
  fg: '#1b1835',
  muted: '#625b7c',
  subtle: '#6d6385',
  line: '#e6dcfb',
  lineStrong: '#c9bade',
  brand: '#7437f6',
  codeBg: '#f5f1ff',
  headerBg: '#f5f1ff',
};

const HIGHLIGHT_BG: Record<HighlightColor, string> = {
  yellow: '#fef08a',
  red: '#fecaca',
  sky: '#bae6fd',
  violet: '#ddd6fe',
};

const CALLOUT_COLORS: Record<CalloutType, { color: string; soft: string }> = {
  note: { color: '#0867be', soft: '#edf5ff' },
  tip: { color: '#087d66', soft: '#e6faf4' },
  important: { color: '#7830c4', soft: '#f6efff' },
  warning: { color: '#895009', soft: '#fff5df' },
  caution: { color: '#b72042', soft: '#ffeaf0' },
};

/** Couleurs de la coloration syntaxique (memes familles que `note-blocks.css`). */
const TOKEN_COLORS: [RegExp, string, boolean?][] = [
  [/^hljs-(comment|quote)$/, C.subtle, true],
  [/^hljs-(keyword|selector-tag|doctag)$/, '#7830c4'],
  [/^hljs-(string|regexp|addition|template-variable)$/, '#087d66'],
  [/^hljs-(number|literal|symbol|bullet)$/, '#915207'],
  [/^hljs-(title|section|name)$/, '#0867be'],
  [/^hljs-(attr|attribute|property|variable|selector-class|selector-id)$/, '#bc2446'],
  [/^hljs-(type|built_in)$/, '#0867be'],
  [/^hljs-(meta|punctuation)$/, C.muted],
  [/^hljs-deletion$/, '#b72042'],
];

const HEADING_SIZE = [0, 20, 16.5, 14, 12.5, 11.5, 11];
/** Largeur utile d'une page A4 avec les marges choisies (points). */
const PAGE_WIDTH = 595.28 - 2 * 48;

interface Inline {
  text: string;
  bold?: boolean;
  italics?: boolean;
  decoration?: Decoration[];
  font?: string;
  fontSize?: number;
  background?: string;
  color?: string;
  link?: string;
}

/** Definition pdfmake d'une idee : en-tete (titre, informations), contenu, numeros de page. */
export function notePdfDefinition(note: PdfNote): TDocumentDefinitions {
  const nodes = note.doc.content ?? [];
  // Une idee vide est analysee en un paragraphe vide : elle est signalee comme pas encore developpee.
  const empty = !textOf(note.doc).trim() && nodes.every((n) => n.type === 'paragraph');
  const body = empty ? [] : blocks(nodes, false);
  const emoji = note.emojiFont ? withEmojiFont : <T>(node: T) => node;
  // Titre court en pied de page, coupe sur des caracteres entiers (un emoji n'est jamais coupe en deux).
  const chars = [...note.title];
  const shortTitle = chars.length > 70 ? chars.slice(0, 69).join('') + '…' : note.title;
  return {
    info: { title: note.title, creator: 'FocusWithAkram', producer: 'FocusWithAkram' },
    pageSize: 'A4',
    pageMargins: [48, 48, 48, 56],
    defaultStyle: { font: 'Roboto', fontSize: 10.5, lineHeight: 1.35, color: C.fg },
    content: emoji([
      { text: note.title, fontSize: 22, bold: true, margin: [0, 0, 0, 4] },
      ...(note.meta.length
        ? [{ text: note.meta.join('   ·   '), fontSize: 9, color: C.muted, margin: [0, 0, 0, 8] }]
        : []),
      rule(C.lineStrong, [0, 2, 0, 14]),
      ...(body.length
        ? body
        : [{ text: 'Pas encore développée.', italics: true, color: C.subtle }]),
    ] as Content[]),
    footer: (page: number, pages: number) =>
      emoji({
        columns: [
          { text: shortTitle },
          { text: `${page} / ${pages}`, alignment: 'right', width: 'auto' },
        ],
        margin: [48, 18, 48, 0],
        fontSize: 8,
        color: C.subtle,
      }) as Content,
  };
}

// ---- Blocs ---------------------------------------------------------------------------------

/** `tight` : dans une liste, un tableau ou une alerte, paragraphes resserres. */
function blocks(nodes: JSONContent[], tight: boolean): Content[] {
  return nodes.map((n) => block(n, tight)).filter((c): c is Content => c !== null);
}

function block(node: JSONContent, tight: boolean): Content | null {
  const gap = tight ? 2 : 7;
  switch (node.type) {
    case 'paragraph':
      return { text: inline(node.content), margin: [0, 0, 0, gap] } as Content;
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.['level']) || 1));
      return {
        text: inline(node.content),
        fontSize: HEADING_SIZE[level],
        bold: true,
        margin: [0, level <= 2 ? 12 : 8, 0, 4],
        headlineLevel: level,
      } as Content;
    }
    case 'bulletList':
      return { ul: listItems(node), margin: [0, 0, 0, gap] } as Content;
    case 'orderedList':
      return {
        ol: listItems(node),
        start: Number(node.attrs?.['start']) || 1,
        margin: [0, 0, 0, gap],
      } as Content;
    case 'taskList':
      return {
        stack: (node.content ?? []).map((item) => taskItem(item)),
        margin: [0, 0, 0, gap],
      } as Content;
    case 'blockquote':
      return box(blocks(node.content ?? [], true), { bar: C.lineStrong, color: C.muted });
    case 'callout': {
      const type = (node.attrs?.['type'] as CalloutType) ?? 'note';
      const colors = CALLOUT_COLORS[type] ?? CALLOUT_COLORS.note;
      return box(
        [
          {
            text: (CALLOUT_META[type] ?? CALLOUT_META.note).label,
            bold: true,
            color: colors.color,
            margin: [0, 0, 0, 3],
          } as Content,
          ...blocks(node.content ?? [], true),
        ],
        { bar: colors.color, fill: colors.soft },
      );
    }
    case 'codeBlock':
      return box(
        [
          {
            text: code(toPdfSafe(textOf(node)), node.attrs?.['language'] as string | null),
            font: 'Courier',
            fontSize: 8.5,
            lineHeight: 1.2,
            preserveLeadingSpaces: true,
          } as Content,
        ],
        { fill: C.codeBg },
      );
    case 'horizontalRule':
      return rule(C.line, [0, 6, 0, 12]);
    case 'table':
      return table(node);
    case 'hardBreak':
      return null;
    default:
      // Noeud inconnu : son texte n'est jamais perdu.
      return node.content
        ? ({ stack: blocks(node.content, tight) } as Content)
        : node.text
          ? ({ text: node.text, margin: [0, 0, 0, gap] } as Content)
          : null;
  }
}

function listItems(list: JSONContent): Content[] {
  return (list.content ?? []).map(
    (item) => ({ stack: blocks(item.content ?? [], true) }) as Content,
  );
}

/** Case a cocher dessinee (la police n'a pas de glyphe de case), texte grise si elle est cochee. */
function taskItem(item: JSONContent): Content {
  const checked = !!item.attrs?.['checked'];
  const square = {
    type: 'rect',
    x: 0,
    y: 2.5,
    w: 9,
    h: 9,
    r: 2,
    lineWidth: 0.9,
    lineColor: checked ? C.brand : C.lineStrong,
    ...(checked ? { color: C.brand } : {}),
  };
  const tick = {
    type: 'polyline',
    lineWidth: 1.4,
    lineColor: '#ffffff',
    points: [
      { x: 2.2, y: 7 },
      { x: 4, y: 8.8 },
      { x: 7, y: 5 },
    ],
  };
  return {
    columns: [
      { width: 14, canvas: checked ? [square, tick] : [square] },
      {
        width: '*',
        stack: blocks(item.content ?? [], true),
        ...(checked ? { color: C.muted } : {}),
      },
    ],
    columnGap: 2,
  } as Content;
}

/** Bloc encadre (citation, alerte, code) : trait colore a gauche et fond facultatifs. */
function box(stack: Content[], style: { bar?: string; fill?: string; color?: string }): Content {
  return {
    table: {
      widths: ['*'],
      body: [
        [
          {
            stack,
            ...(style.fill ? { fillColor: style.fill } : {}),
            ...(style.color ? { color: style.color } : {}),
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (i: number) => (i === 0 && style.bar ? 3 : 0),
      vLineColor: () => style.bar ?? C.line,
      paddingLeft: () => (style.bar ? 10 : 8),
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 4,
    },
    margin: [0, 2, 0, 9],
  } as Content;
}

function table(node: JSONContent): Content {
  const rows = node.content ?? [];
  const columns = Math.max(1, ...rows.map((r) => (r.content ?? []).length));
  const header = (rows[0]?.content ?? []).every((cell) => cell.type === 'tableHeader');
  const body = rows.map((row) => {
    const cells = (row.content ?? []).map((cell) => {
      const isHeader = cell.type === 'tableHeader';
      return {
        stack: blocks(cell.content ?? [], true),
        ...(isHeader ? { bold: true, fillColor: C.headerBg } : {}),
      };
    });
    while (cells.length < columns) cells.push({ stack: [] });
    return cells;
  });
  return {
    table: {
      headerRows: header && rows.length > 1 ? 1 : 0,
      widths: Array.from({ length: columns }, () => '*'),
      body,
    },
    layout: {
      hLineWidth: () => 0.6,
      vLineWidth: () => 0.6,
      hLineColor: () => C.lineStrong,
      vLineColor: () => C.lineStrong,
      paddingLeft: () => 5,
      paddingRight: () => 5,
      paddingTop: () => 3,
      paddingBottom: () => 1,
    },
    margin: [0, 2, 0, 9],
  } as Content;
}

function rule(color: string, margin: [number, number, number, number]): Content {
  return {
    canvas: [
      { type: 'line', x1: 0, y1: 0, x2: PAGE_WIDTH, y2: 0, lineWidth: 0.75, lineColor: color },
    ],
    margin,
  } as Content;
}

// ---- Texte -------------------------------------------------------------------------------

function inline(nodes: JSONContent[] | undefined): Inline[] {
  const parts: Inline[] = [];
  for (const node of nodes ?? []) {
    if (node.type === 'hardBreak') {
      parts.push({ text: '\n' });
    } else if (node.type === 'text' && node.text) {
      parts.push(styled(node));
    } else if (node.content) {
      parts.push(...inline(node.content));
    }
  }
  // Paragraphe vide : une ligne blanche, comme dans l'editeur.
  return parts.length ? parts : [{ text: ' ' }];
}

function styled(node: JSONContent): Inline {
  const part: Inline = { text: node.text ?? '' };
  const decoration: Decoration[] = [];
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case 'bold':
        part.bold = true;
        break;
      case 'italic':
        part.italics = true;
        break;
      case 'strike':
        decoration.push('lineThrough');
        break;
      case 'code':
        part.font = 'Courier';
        part.fontSize = 9.5;
        part.background ??= C.codeBg;
        break;
      case 'link': {
        const href = String(mark.attrs?.['href'] ?? '');
        if (/^(https?:|mailto:|tel:)/i.test(href)) part.link = href;
        part.color = C.brand;
        decoration.push('underline');
        break;
      }
      case 'highlight': {
        const color = mark.attrs?.['color'];
        part.background = HIGHLIGHT_BG[isHighlightColor(color) ? color : 'yellow'];
        break;
      }
    }
  }
  if (decoration.length) part.decoration = decoration;
  return part;
}

function textOf(node: JSONContent): string {
  if (node.text) return node.text;
  return (node.content ?? []).map(textOf).join('');
}

interface HastNode {
  type: string;
  value?: string;
  properties?: { className?: string[] };
  children?: HastNode[];
}

/** Code colore comme dans l'editeur quand son langage est connu, en texte brut sinon. */
function code(text: string, language: string | null | undefined): Inline[] {
  const plain = [{ text: text || ' ' }];
  if (!language || !noteLowlight.registered(language)) return plain;
  try {
    const parts: Inline[] = [];
    const walk = (node: HastNode, color?: string, italics?: boolean) => {
      if (node.type === 'text') {
        if (node.value)
          parts.push({
            text: node.value,
            ...(color ? { color } : {}),
            ...(italics ? { italics } : {}),
          });
        return;
      }
      let c = color;
      let i = italics;
      for (const cls of node.properties?.className ?? []) {
        const match = TOKEN_COLORS.find(([re]) => re.test(cls));
        if (match) {
          c = match[1];
          i = i || !!match[2];
        }
      }
      for (const child of node.children ?? []) walk(child, c, i);
    };
    walk(noteLowlight.highlight(language, text) as unknown as HastNode);
    return parts.length ? parts : plain;
  } catch {
    return plain;
  }
}
