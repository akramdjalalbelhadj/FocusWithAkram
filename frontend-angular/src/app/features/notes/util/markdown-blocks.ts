/**
 * Insertions du menu « Insérer » en mode Markdown, liens, controle de fidelite du mode visuel et export d'une
 * note. Fonctions pures, sans DOM ni Tiptap.
 */
import type { CalloutType } from '../editor/callout';
import type { TextEdit } from './markdown';

export type InsertKind = CalloutType | 'table' | 'codeblock' | 'hr';

const TABLE =
  '| Colonne 1 | Colonne 2 | Colonne 3 |\n| :-- | :-: | --: |\n| Gauche | Centre | Droite |';
const ALERT_PLACEHOLDER = 'Votre texte';
const CODE_PLACEHOLDER = 'code';

/**
 * Insere un bloc Markdown. Les alertes et le bloc de code entourent les lignes selectionnees ; le tableau et le
 * separateur s'inserent apres la ligne du curseur. Le bloc est toujours separe du texte voisin par une ligne
 * vide ; la selection rendue designe le texte a remplacer (ou le curseur apres le bloc).
 */
export function insertMarkdown(
  text: string,
  start: number,
  end: number,
  kind: InsertKind,
): TextEdit {
  const wraps = kind !== 'table' && kind !== 'hr';
  let from = start;
  let to = end;
  if (wraps && start !== end) {
    // Le bloc entoure des lignes entieres.
    from = text.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = text.indexOf('\n', end > start && text[end - 1] === '\n' ? end - 1 : end);
    to = lineEnd === -1 ? text.length : lineEnd;
  } else {
    // Insertion apres la ligne courante si elle contient du texte.
    const lineEnd = text.indexOf('\n', end);
    from = to = lineEnd === -1 ? text.length : lineEnd;
    const lineStart = text.lastIndexOf('\n', end - 1) + 1;
    if (!text.slice(lineStart, from).trim()) from = to = lineStart;
  }
  const selected = wraps ? text.slice(from, to) : '';

  let block: string;
  let focus: [number, number];
  if (kind === 'table') {
    block = TABLE;
    focus = [2, 2 + 'Colonne 1'.length];
  } else if (kind === 'hr') {
    block = '---';
    focus = [block.length, block.length];
  } else if (kind === 'codeblock') {
    const body = selected || CODE_PLACEHOLDER;
    block = '```\n' + body + '\n```';
    // Sans selection, le mot « code » est selectionne ; avec, le curseur va apres ``` pour saisir le langage.
    focus = selected ? [3, 3] : [4, 4 + body.length];
  } else {
    const head = `> [!${kind.toUpperCase()}]`;
    const lines = (selected || ALERT_PLACEHOLDER).split('\n');
    block = head + '\n' + lines.map((l) => (l.trim() ? `> ${l}` : '>')).join('\n');
    focus = selected ? [block.length, block.length] : [head.length + 3, block.length];
  }

  const before = text.slice(0, from);
  const after = text.slice(to);
  const lead = !before ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const trail = !after
    ? ''
    : after.startsWith('\n\n')
      ? ''
      : after.startsWith('\n')
        ? '\n'
        : '\n\n';
  const offset = before.length + lead.length;
  return {
    text: before + lead + block + trail + after,
    start: offset + focus[0],
    end: offset + focus[1],
  };
}

/**
 * Adresse saisie pour un lien : http(s), mailto, tel ou ancre interne (#titre). Un nom de domaine nu recoit
 * https://. Tout autre protocole (javascript:, data:...) est refuse : `null`.
 */
export function normalizeUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return null;
  if (url.startsWith('#')) return encodeUrl(url);
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url);
  if (scheme) {
    return ['http', 'https', 'mailto', 'tel'].includes(scheme[1].toLowerCase())
      ? encodeUrl(url)
      : null;
  }
  if (/^[\w-]+(\.[\w-]+)+([/?#:].*)?$/.test(url)) return encodeUrl(`https://${url}`);
  return null;
}

/** Les espaces et parentheses casseraient la syntaxe [texte](adresse). */
function encodeUrl(url: string): string {
  return url.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
}

/** Lien Markdown sur la selection ; sans selection, le texte du lien est insere et selectionne. */
export function insertLink(text: string, start: number, end: number, url: string): TextEdit {
  const label = text.slice(start, end).replace(/\n+/g, ' ') || 'texte du lien';
  const link = `[${label.replace(/[[\]]/g, '\\$&')}](${url})`;
  const result = text.slice(0, start) + link + text.slice(end);
  return start === end
    ? { text: result, start: start + 1, end: start + 1 + label.length }
    : { text: result, start: start + link.length, end: start + link.length };
}

/** Mots (lettres et chiffres) d'un texte Markdown, entites HTML ignorees, casse ignoree. */
function words(markdown: string): Map<string, number> {
  const counts = new Map<string, number>();
  const plain = markdown.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, ' ');
  for (const w of plain.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return counts;
}

/**
 * Mots du Markdown d'origine absents (ou moins nombreux) dans sa conversion par l'editeur visuel : HTML brut,
 * notes de bas de page, images... qu'il ne sait pas representer. Liste vide : aucune perte de texte detectee
 * (les differences de forme, `*` devenu `-` par exemple, ne comptent pas).
 */
export function visualLosses(original: string, converted: string): string[] {
  const after = words(converted);
  const lost: string[] = [];
  for (const [word, count] of words(original)) {
    if ((after.get(word) ?? 0) < count) lost.push(word);
  }
  return lost;
}

export interface ExportableNote {
  title: string;
  content: string;
  category: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Fichier Markdown d'une note : en-tete YAML (titre, categorie, etiquettes, dates : lu par Obsidian, GitHub,
 * les generateurs de sites...), titre, puis le contenu exactement tel qu'il est saisi.
 */
export function noteToMarkdownFile(note: ExportableNote): string {
  const q = (value: string) => JSON.stringify(value);
  const header = [
    '---',
    `title: ${q(note.title)}`,
    ...(note.category ? [`category: ${q(note.category)}`] : []),
    `tags: [${note.tags.map(q).join(', ')}]`,
    `created: ${note.createdAt}`,
    `updated: ${note.updatedAt}`,
    '---',
  ].join('\n');
  const content = note.content.replace(/\s+$/, '');
  // Pas de titre en double si la note commence deja par lui.
  const startsWithTitle = new RegExp(`^#\\s+${escapeRegExp(note.title.trim())}\\s*(\\n|$)`).test(
    content,
  );
  const title = startsWithTitle ? '' : `# ${note.title}\n\n`;
  return `${header}\n\n${title}${content}\n`;
}

/** Nom de fichier lisible et portable tire du titre : « Mon idée ! » -> « mon-idee.md ». */
export function markdownFileName(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${slug || 'note'}.md`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
