import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { StarterKit } from '@tiptap/starter-kit';
import { NoteEditorMode } from '../../../../core/api/models';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { MarkdownAction, applyMarkdown, countTaskItems, toggleTaskItem } from '../../util/markdown';

interface ToolbarItem {
  action: MarkdownAction;
  label: string;
  icon: string;
  /** Raccourci affiche dans l'infobulle. */
  keys?: string;
}

const TOOLBAR: ToolbarItem[] = [
  { action: 'heading', label: 'Titre', icon: 'heading' },
  { action: 'bold', label: 'Gras', icon: 'bold', keys: 'Ctrl+B' },
  { action: 'italic', label: 'Italique', icon: 'italic', keys: 'Ctrl+I' },
  { action: 'bullet', label: 'Liste à puces', icon: 'list-bullet' },
  { action: 'ordered', label: 'Liste numérotée', icon: 'list-ordered' },
  { action: 'task', label: 'Case à cocher', icon: 'square-check' },
  { action: 'quote', label: 'Citation', icon: 'quote' },
  { action: 'code', label: 'Code', icon: 'code' },
];

/**
 * Remplace le texte de la zone de saisie par la plus petite modification possible, via l'edition native du
 * navigateur : l'action de la barre d'outils peut alors etre annulee par Ctrl+Z. Repli : affectation directe.
 */
function replaceText(area: HTMLTextAreaElement, next: string): void {
  const previous = area.value;
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++;
  let end = 0;
  while (
    end < previous.length - start &&
    end < next.length - start &&
    previous[previous.length - 1 - end] === next[next.length - 1 - end]
  ) {
    end++;
  }
  const inserted = next.slice(start, next.length - end);
  area.focus();
  area.setSelectionRange(start, previous.length - end);
  // execCommand reste le seul moyen d'alimenter l'historique d'annulation natif d'un textarea.
  const done = inserted
    ? document.execCommand('insertText', false, inserted)
    : document.execCommand('delete');
  if (!done || area.value !== next) area.value = next;
}

/** Extensions communes a l'editeur visuel et a l'apercu : le meme analyseur Markdown pour les deux modes. */
function extensions(
  placeholder: string,
  onReadOnlyChecked?: (node: unknown, checked: boolean) => boolean,
) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      // Le soulignement n'a pas d'equivalent Markdown : il serait perdu a l'enregistrement.
      underline: false,
      link: { openOnClick: !!onReadOnlyChecked, autolink: true, defaultProtocol: 'https' },
    }),
    TaskList,
    TaskItem.configure({ nested: true, ...(onReadOnlyChecked ? { onReadOnlyChecked } : {}) }),
    Placeholder.configure({ placeholder }),
    Markdown,
  ];
}

/**
 * Editeur des notes. Le contenu est toujours du Markdown (`value`) : le mode « Markdown » le saisit directement
 * (barre d'outils, raccourcis, apercu), le mode « visuel » l'edite en WYSIWYG via Tiptap et le reserialise.
 * Simplement ouvrir une note en mode visuel ne la reecrit pas : seul un changement de l'utilisateur est emis.
 */
@Component({
  selector: 'ff-note-editor',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Le contenu de Tiptap est cree hors du template : ses styles ne peuvent pas etre encapsules.
  encapsulation: ViewEncapsulation.None,
  templateUrl: './note-editor.html',
  styleUrl: './note-editor.css',
})
export class NoteEditorComponent {
  /** Contenu Markdown (liaison bidirectionnelle). */
  readonly value = model.required<string>();
  /** Mode d'edition (liaison bidirectionnelle) : la page enregistre la preference. */
  readonly mode = model.required<NoteEditorMode>();
  readonly label = input('Contenu de la note');

  protected readonly toolbar = TOOLBAR;
  /** Onglet du mode Markdown. */
  protected readonly tab = signal<'write' | 'preview'>('write');
  /** Incremente a chaque transaction de l'editeur visuel : l'etat actif des boutons en depend. */
  private readonly tick = signal(0);

  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');
  private readonly richHost = viewChild<ElementRef<HTMLElement>>('richHost');
  private readonly previewHost = viewChild<ElementRef<HTMLElement>>('previewHost');

  private rich: Editor | null = null;
  private preview: Editor | null = null;
  /** Dernier Markdown connu de l'editeur visuel (emis par lui ou charge dans lui). */
  private richMarkdown: string | null = null;

  constructor() {
    // Cree ou detruit l'editeur visuel selon la presence de son conteneur, puis le synchronise avec `value`.
    effect(() => {
      const host = this.richHost()?.nativeElement;
      const value = this.value();
      untracked(() => {
        if (!host) {
          this.destroyRich();
          return;
        }
        if (!this.rich) {
          this.createRich(host, value);
        } else if (value !== this.richMarkdown) {
          this.richMarkdown = value;
          this.rich.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
        }
      });
    });
    effect(() => {
      const host = this.previewHost()?.nativeElement;
      const value = this.value();
      untracked(() => {
        if (!host) {
          this.preview?.destroy();
          this.preview = null;
        } else if (!this.preview) {
          this.preview = new Editor({
            element: host,
            editable: false,
            extensions: extensions('Rien à afficher pour le moment.', (_node, checked) =>
              this.checkFromPreview(checked),
            ),
            content: value,
            contentType: 'markdown',
            editorProps: { attributes: { class: 'note-prose-content', 'aria-label': 'Aperçu' } },
          });
        } else {
          this.preview.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
        }
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyRich();
      this.preview?.destroy();
    });
  }

  protected setMode(mode: NoteEditorMode): void {
    if (mode !== this.mode()) this.mode.set(mode);
  }

  protected isActive(action: MarkdownAction): boolean {
    this.tick();
    const ed = this.rich;
    if (!ed || this.mode() !== 'RICH') return false;
    switch (action) {
      case 'heading':
        return ed.isActive('heading');
      case 'bold':
        return ed.isActive('bold');
      case 'italic':
        return ed.isActive('italic');
      case 'code':
        return ed.isActive('code');
      case 'bullet':
        return ed.isActive('bulletList');
      case 'ordered':
        return ed.isActive('orderedList');
      case 'task':
        return ed.isActive('taskList');
      case 'quote':
        return ed.isActive('blockquote');
    }
  }

  protected apply(action: MarkdownAction): void {
    if (this.mode() === 'RICH') {
      this.applyRich(action);
      return;
    }
    const area = this.textarea()?.nativeElement;
    if (!area) return;
    const edit = applyMarkdown(area.value, area.selectionStart, area.selectionEnd, action);
    replaceText(area, edit.text);
    area.setSelectionRange(edit.start, edit.end);
    this.value.set(area.value);
  }

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLTextAreaElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'b' || key === 'i') {
      event.preventDefault();
      this.apply(key === 'b' ? 'bold' : 'italic');
    }
  }

  private applyRich(action: MarkdownAction): void {
    const chain = this.rich?.chain().focus();
    if (!chain) return;
    switch (action) {
      case 'heading':
        chain.toggleHeading({ level: 2 }).run();
        break;
      case 'bold':
        chain.toggleBold().run();
        break;
      case 'italic':
        chain.toggleItalic().run();
        break;
      case 'code':
        chain.toggleCode().run();
        break;
      case 'bullet':
        chain.toggleBulletList().run();
        break;
      case 'ordered':
        chain.toggleOrderedList().run();
        break;
      case 'task':
        chain.toggleTaskList().run();
        break;
      case 'quote':
        chain.toggleBlockquote().run();
        break;
    }
  }

  private createRich(host: HTMLElement, value: string): void {
    this.richMarkdown = value;
    this.rich = new Editor({
      element: host,
      extensions: extensions('Développez votre idée : contexte, pistes, questions…'),
      content: value,
      contentType: 'markdown',
      editorProps: {
        attributes: {
          class: 'note-prose-content',
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': this.label(),
        },
      },
      onUpdate: ({ editor }) => {
        const markdown = editor.getMarkdown();
        this.richMarkdown = markdown;
        this.value.set(markdown);
      },
      onTransaction: () => this.tick.update((n) => n + 1),
    });
  }

  private destroyRich(): void {
    this.rich?.destroy();
    this.rich = null;
    this.richMarkdown = null;
  }

  /**
   * Case cochee dans l'apercu : on modifie la case correspondante du Markdown saisi, sans reecrire le reste du
   * texte. Si l'apercu et le texte ne comptent pas le meme nombre de cases (syntaxe inhabituelle), rien ne change.
   */
  private checkFromPreview(checked: boolean): boolean {
    const host = this.previewHost()?.nativeElement;
    const items = host
      ? Array.from(host.querySelectorAll<HTMLElement>('ul[data-type="taskList"] > li'))
      : [];
    // La case cliquee est la seule dont l'etat affiche differe deja de celui du document.
    const index = items.findIndex(
      (li) => li.querySelector('input')?.checked !== (li.dataset['checked'] === 'true'),
    );
    const source = this.value();
    if (index >= 0 && items.length === countTaskItems(source)) {
      this.value.set(toggleTaskItem(source, index, checked));
    }
    // L'apercu se redessine depuis le Markdown : la case n'est jamais modifiee directement.
    return false;
  }
}
