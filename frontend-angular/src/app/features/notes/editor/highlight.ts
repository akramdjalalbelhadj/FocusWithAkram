import { Mark, markInputRule, markPasteRule, mergeAttributes } from '@tiptap/core';
import {
  HighlightColor,
  highlightMarkers,
  highlightStart,
  isHighlightColor,
  matchHighlight,
} from '../util/highlight';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    highlight: {
      /** Surligne la selection dans cette couleur, ou retire le surlignage s'il est deja de cette couleur. */
      toggleHighlight: (color: HighlightColor) => ReturnType;
      /** Surligne la selection dans cette couleur (remplace une autre couleur). */
      setHighlight: (color: HighlightColor) => ReturnType;
      /** Retire le surlignage de la selection (ou de tout le passage surligne autour du curseur). */
      unsetHighlight: () => ReturnType;
    };
  }
}

export interface NoteHighlightOptions {
  /** Couleur du raccourci Ctrl+Maj+H : celle choisie en dernier dans la barre d'outils. */
  shortcutColor: () => HighlightColor;
}

/** `==texte==` saisi au clavier en mode Visuel : surlignage jaune (meme regle que Tiptap). */
const INPUT = /(?:^|\s)(==(?!\s+==)((?:[^=]+))==(?!\s+==))$/;
const PASTE = /(?:^|\s)(==(?!\s+==)((?:[^=]+))==(?!\s+==))/g;

function colorOf(attrs: Record<string, unknown> | undefined): HighlightColor {
  const color = attrs?.['color'];
  return isHighlightColor(color) ? color : 'yellow';
}

/**
 * Surlignage en quatre couleurs (jaune, rouge, bleu ciel, violet). Une seule couleur a la fois sur un passage.
 * Markdown : `==texte==` (jaune) ou `<mark data-color="...">texte</mark>` ; voir `util/highlight.ts`.
 */
export const NoteHighlight = Mark.create<NoteHighlightOptions>({
  name: 'highlight',

  addOptions() {
    return { shortcutColor: () => 'yellow' };
  },

  addAttributes() {
    return {
      color: {
        default: 'yellow' as HighlightColor,
        parseHTML: (el) => colorOf({ color: el.getAttribute('data-color') }),
        renderHTML: (attrs) => ({ 'data-color': colorOf(attrs) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'mark' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(HTMLAttributes, { class: 'note-mark' }), 0];
  },

  markdownTokenizer: {
    name: 'highlight',
    level: 'inline',
    start: highlightStart,
    tokenize: (src, _tokens, lexer) => {
      const match = matchHighlight(src);
      if (!match) return undefined;
      return {
        type: 'highlight',
        raw: match.raw,
        color: match.color,
        tokens: lexer.inlineTokens(match.text),
      } as never;
    },
  },

  parseMarkdown: (token, helpers) =>
    helpers.applyMark('highlight', helpers.parseInline(token.tokens ?? []), {
      color: colorOf(token as Record<string, unknown>),
    }),

  renderMarkdown: (node, h) => {
    const { open, close } = highlightMarkers(colorOf(node.attrs));
    return `${open}${h.renderChildren(node)}${close}`;
  },

  addCommands() {
    return {
      toggleHighlight:
        (color) =>
        ({ commands }) =>
          commands.toggleMark(this.name, { color }),
      setHighlight:
        (color) =>
        ({ commands }) =>
          commands.setMark(this.name, { color }),
      unsetHighlight:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name, { extendEmptyMarkRange: true }),
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-h': () => this.editor.commands.toggleHighlight(this.options.shortcutColor()),
    };
  },

  addInputRules() {
    return [markInputRule({ find: INPUT, type: this.type, getAttributes: { color: 'yellow' } })];
  },

  addPasteRules() {
    return [markPasteRule({ find: PASTE, type: this.type, getAttributes: { color: 'yellow' } })];
  },
});
