import type { AnyExtension } from '@tiptap/core';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { StarterKit } from '@tiptap/starter-kit';
import { Callout } from './callout';
import { NoteCodeBlock } from './code-block';

export interface NoteExtensionOptions {
  placeholder?: string;
  /** Apercu : clic sur une case a cocher (rend `false` pour laisser le Markdown decider de l'etat). */
  onReadOnlyChecked?: (node: unknown, checked: boolean) => boolean;
  /** Les liens s'ouvrent au clic (apercu) au lieu de placer le curseur (edition). */
  openLinks?: boolean;
}

/**
 * Extensions communes a l'editeur visuel, a l'apercu et a l'aide Markdown : le meme analyseur et le meme rendu
 * partout. Tout ce qui n'est pas declare ici (balises HTML, attributs, protocoles de liens douteux) est ecarte
 * par le schema ProseMirror : aucun HTML saisi n'est injecte tel quel dans la page.
 */
export function noteExtensions(options: NoteExtensionOptions = {}): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      // Remplace par le bloc de code colore.
      codeBlock: false,
      // Le soulignement n'a pas d'equivalent Markdown : il serait perdu a l'enregistrement.
      underline: false,
      link: {
        openOnClick: !!options.openLinks,
        autolink: true,
        defaultProtocol: 'https',
        protocols: ['http', 'https', 'mailto', 'tel'],
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      },
    }),
    NoteCodeBlock,
    Callout,
    TaskList,
    TaskItem.configure({
      nested: true,
      ...(options.onReadOnlyChecked ? { onReadOnlyChecked: options.onReadOnlyChecked } : {}),
    }),
    TableKit.configure({ table: { resizable: false, renderWrapper: true } }),
    ...(options.placeholder ? [Placeholder.configure({ placeholder: options.placeholder })] : []),
    Markdown,
  ];
}
