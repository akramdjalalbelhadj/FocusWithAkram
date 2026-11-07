import { Node, mergeAttributes } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';
import {
  Info,
  Lightbulb,
  MessageSquareWarning,
  OctagonAlert,
  TriangleAlert,
  type IconNode,
} from 'lucide';
import { iconSpec } from './dom-icon';

/** Types d'alertes GitHub (`> [!NOTE]`...), dans l'ordre de la documentation GitHub. */
export const CALLOUT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'] as const;
export type CalloutType = (typeof CALLOUT_TYPES)[number];

export const CALLOUT_META: Record<CalloutType, { label: string; marker: string; icon: IconNode }> =
  {
    note: { label: 'Note', marker: 'NOTE', icon: Info },
    tip: { label: 'Conseil', marker: 'TIP', icon: Lightbulb },
    important: { label: 'Important', marker: 'IMPORTANT', icon: MessageSquareWarning },
    warning: { label: 'Attention', marker: 'WARNING', icon: TriangleAlert },
    caution: { label: 'Danger', marker: 'CAUTION', icon: OctagonAlert },
  };

/**
 * Premiere ligne d'une alerte : `> [!TYPE]` seul sur sa ligne (casse indifferente, comme GitHub). Les lignes
 * suivantes de la citation forment le contenu. Une citation ordinaire n'est jamais concernee.
 */
const FIRST_LINE = /^ {0,3}>[ \t]?\[!(note|tip|important|warning|caution)\][ \t]*$/i;
const QUOTE_LINE = /^ {0,3}>/;
/** Debut possible d'une alerte dans le texte restant (permet d'interrompre un paragraphe). */
const START = /^ {0,3}>[ \t]?\[!(?:note|tip|important|warning|caution)\][ \t]*$/im;

export interface CalloutToken {
  type: 'callout';
  raw: string;
  calloutType: CalloutType;
  tokens: unknown[];
}

/** Decoupe une alerte en tete de `src` : lignes `>` consecutives dont la premiere porte le marqueur. */
export function tokenizeCallout(
  src: string,
  blockTokens: (src: string) => unknown[],
): CalloutToken | undefined {
  const lines = src.split('\n');
  const first = FIRST_LINE.exec(lines[0]);
  if (!first) return undefined;
  let count = 1;
  while (count < lines.length && QUOTE_LINE.test(lines[count])) count++;
  const raw = lines.slice(0, count).join('\n') + (count < lines.length ? '\n' : '');
  const body = lines
    .slice(1, count)
    .map((line) => line.replace(/^ {0,3}>[ \t]?/, ''))
    .join('\n');
  return {
    type: 'callout',
    raw,
    calloutType: first[1].toLowerCase() as CalloutType,
    tokens: body.trim() ? blockTokens(body) : [],
  };
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      /** Entoure la selection d'une alerte, change son type, ou la retire si elle est deja de ce type. */
      toggleCallout: (type: CalloutType) => ReturnType;
    };
  }
}

/**
 * Alerte Markdown facon GitHub. Le contenu reste editable dans le mode visuel (listes, liens, code...) ; le
 * titre est un decor non editable derive du type. Le Markdown produit est toujours `> [!TYPE]` + citation.
 */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  // Avant la citation : une alerte est une citation particuliere.
  priority: 110,

  addAttributes() {
    return {
      type: {
        default: 'note' as CalloutType,
        parseHTML: (el) => {
          const value = el.getAttribute('data-callout');
          return (CALLOUT_TYPES as readonly string[]).includes(value ?? '') ? value : 'note';
        },
        renderHTML: (attrs) => ({ 'data-callout': attrs['type'] }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]', contentElement: '.note-callout-body' }];
  },

  renderHTML({ node, HTMLAttributes }): DOMOutputSpec {
    const type = node.attrs['type'] as CalloutType;
    const meta = CALLOUT_META[type] ?? CALLOUT_META.note;
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: `note-callout note-callout-${type}`,
        role: 'note',
        'aria-label': meta.label,
      }),
      [
        'div',
        { class: 'note-callout-title', contenteditable: 'false' },
        iconSpec(meta.icon),
        ['span', {}, meta.label],
      ],
      ['div', { class: 'note-callout-body' }, 0],
    ];
  },

  markdownTokenizer: {
    name: 'callout',
    level: 'block',
    // Appele par marked pour chaque paragraphe : un indexOf evite d'analyser tout le reste du document.
    start: (src: string) => {
      if (src.indexOf('[!') === -1) return -1;
      const match = START.exec(src);
      return match ? match.index : -1;
    },
    tokenize: (src, _tokens, lexer) => tokenizeCallout(src, (s) => lexer.blockTokens(s)) as never,
  },

  parseMarkdown: (token, helpers) => {
    const children = helpers.parseBlockChildren
      ? helpers.parseBlockChildren(token.tokens ?? [])
      : helpers.parseChildren(token.tokens ?? []);
    const content = children.length ? children : [helpers.createNode('paragraph')];
    return helpers.createNode('callout', { type: token['calloutType'] ?? 'note' }, content);
  },

  renderMarkdown: (node, h) => {
    const type = (node.attrs?.['type'] as CalloutType) ?? 'note';
    const head = `> [!${(CALLOUT_META[type] ?? CALLOUT_META.note).marker}]`;
    const blocks = (node.content ?? []).map((child, index) =>
      (h.renderChild?.(child, index) ?? h.renderChildren([child]))
        .split('\n')
        .map((line) => (line.trim() === '' ? '>' : `> ${line}`))
        .join('\n'),
    );
    // Un paragraphe vide (alerte juste inseree) ne produit pas de ligne parasite.
    const body = blocks.filter((b) => b.replace(/>/g, '').trim() !== '').join('\n>\n');
    return body ? `${head}\n${body}` : head;
  },

  addCommands() {
    return {
      toggleCallout:
        (type) =>
        ({ editor, commands }) => {
          if (editor.isActive(this.name, { type })) return commands.lift(this.name);
          if (editor.isActive(this.name)) return commands.updateAttributes(this.name, { type });
          return commands.wrapIn(this.name, { type });
        },
    };
  },
});
