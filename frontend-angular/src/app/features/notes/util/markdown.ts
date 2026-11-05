/**
 * Edition du Markdown brut des notes (mode « Markdown ») : actions de la barre d'outils et cases a cocher de
 * l'apercu. Fonctions pures, sans DOM : elles recoivent le texte et la selection et rendent le nouvel etat.
 */

export type MarkdownAction =
  'heading' | 'bold' | 'italic' | 'code' | 'bullet' | 'ordered' | 'task' | 'quote';

export interface TextEdit {
  text: string;
  start: number;
  end: number;
}

const WRAP: Partial<Record<MarkdownAction, string>> = { bold: '**', italic: '*', code: '`' };

/** Prefixes de ligne : `match` reconnait le prefixe deja present, `make` produit celui de la n-ieme ligne. */
const PREFIX: Partial<Record<MarkdownAction, { match: RegExp; make: (n: number) => string }>> = {
  heading: { match: /^#{1,6}\s+/, make: () => '## ' },
  bullet: { match: /^[-*+]\s+(?!\[[ xX]\])/, make: () => '- ' },
  ordered: { match: /^\d+[.)]\s+/, make: (n) => `${n + 1}. ` },
  task: { match: /^[-*+]\s+\[[ xX]\]\s+/, make: () => '- [ ] ' },
  quote: { match: /^>\s?/, make: () => '> ' },
};

/** Prefixes de liste remplaces quand on change de type de liste. */
const LIST_PREFIX = /^([-*+]\s+(\[[ xX]\]\s+)?|\d+[.)]\s+)/;

/** Applique une action de la barre d'outils a la selection [start, end[ ; une seconde application l'annule. */
export function applyMarkdown(
  text: string,
  start: number,
  end: number,
  action: MarkdownAction,
): TextEdit {
  const marker = WRAP[action];
  if (marker) return wrap(text, start, end, marker);
  const prefix = PREFIX[action]!;
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const nextBreak = text.indexOf('\n', Math.max(end - (end > start ? 1 : 0), start));
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  const lines = text.slice(lineStart, lineEnd).split('\n');
  const all = lines.every((l) => prefix.match.test(l));
  const changed = lines.map((line, i) => {
    if (all) return line.replace(prefix.match, '');
    const bare =
      action === 'quote'
        ? line
        : line.replace(action === 'heading' ? /^#{1,6}\s+/ : LIST_PREFIX, '');
    return prefix.make(i) + bare;
  });
  const block = changed.join('\n');
  const result = text.slice(0, lineStart) + block + text.slice(lineEnd);
  if (start === end) {
    const caret = Math.max(lineStart, start + (changed[0].length - lines[0].length));
    return { text: result, start: caret, end: caret };
  }
  return { text: result, start: lineStart, end: lineStart + block.length };
}

function wrap(text: string, start: number, end: number, marker: string): TextEdit {
  const m = marker.length;
  const before = text.slice(Math.max(0, start - m), start);
  const after = text.slice(end, end + m);
  if (before === marker && after === marker) {
    const result = text.slice(0, start - m) + text.slice(start, end) + text.slice(end + m);
    return { text: result, start: start - m, end: end - m };
  }
  const result = text.slice(0, start) + marker + text.slice(start, end) + marker + text.slice(end);
  return { text: result, start: start + m, end: end + m };
}

const TASK_ITEM = /^(\s*[-*+]\s+\[)([ xX])(\])/;
const FENCE = /^\s*(```|~~~)/;

/** Nombre de cases a cocher d'un texte Markdown (hors blocs de code). */
export function countTaskItems(markdown: string): number {
  let count = 0;
  forEachTaskLine(markdown, () => count++);
  return count;
}

/**
 * Coche ou decoche la `index`-ieme case (ordre du document, hors blocs de code) sans toucher au reste du texte :
 * l'ecriture de l'utilisateur est conservee a l'identique. Renvoie le texte inchange si la case n'existe pas.
 */
export function toggleTaskItem(markdown: string, index: number, checked: boolean): string {
  const lines = markdown.split('\n');
  let current = 0;
  let done = false;
  forEachTaskLine(markdown, (lineIndex) => {
    if (!done && current === index) {
      lines[lineIndex] = lines[lineIndex].replace(TASK_ITEM, `$1${checked ? 'x' : ' '}$3`);
      done = true;
    }
    current++;
  });
  return lines.join('\n');
}

function forEachTaskLine(markdown: string, visit: (lineIndex: number) => void): void {
  let inFence = false;
  markdown.split('\n').forEach((line, i) => {
    if (FENCE.test(line)) {
      inFence = !inFence;
      return;
    }
    if (!inFence && TASK_ITEM.test(line)) visit(i);
  });
}

/** Etiquettes saisies « a, b, c » : espaces retires, vides et doublons (casse ignoree) supprimes. */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(',')) {
    const tag = part.trim();
    if (tag && !seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase());
      result.push(tag);
    }
  }
  return result;
}
