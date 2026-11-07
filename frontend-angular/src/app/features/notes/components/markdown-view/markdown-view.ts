import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import { noteExtensions } from '../../editor/note-extensions';

/**
 * Rendu en lecture seule d'un texte Markdown, avec exactement le moteur de l'editeur de notes. Le contenu passe
 * par le schema ProseMirror : aucun HTML saisi n'est insere tel quel.
 */
@Component({
  selector: 'ff-markdown-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Le contenu est cree par Tiptap hors du template : styles non encapsules (partages avec l'editeur).
  encapsulation: ViewEncapsulation.None,
  host: { class: 'note-prose note-prose-inline' },
  templateUrl: './markdown-view.html',
  styleUrls: ['../../editor/note-prose.css', '../../editor/note-blocks.css'],
})
export class MarkdownViewComponent {
  readonly markdown = input.required<string>();
  readonly label = input<string>('Rendu');

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    let editor: Editor | null = null;
    effect(() => {
      const markdown = this.markdown();
      const label = this.label();
      untracked(() => {
        if (editor) {
          editor.commands.setContent(markdown, { contentType: 'markdown', emitUpdate: false });
          return;
        }
        editor = new Editor({
          element: host,
          editable: false,
          extensions: noteExtensions({ openLinks: true }),
          content: markdown,
          contentType: 'markdown',
          editorProps: { attributes: { class: 'note-prose-content', 'aria-label': label } },
        });
      });
    });
    inject(DestroyRef).onDestroy(() => editor?.destroy());
  }
}
