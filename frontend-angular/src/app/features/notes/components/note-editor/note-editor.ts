import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  ViewEncapsulation,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import { NoteEditorMode } from '../../../../core/api/models';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { CALLOUT_META, CALLOUT_TYPES, CalloutType } from '../../editor/callout';
import { noteExtensions } from '../../editor/note-extensions';
import {
  MarkdownAction,
  TextEdit,
  applyMarkdown,
  countTaskItems,
  toggleTaskItem,
} from '../../util/markdown';
import {
  InsertKind,
  insertLink,
  insertMarkdown,
  normalizeUrl,
  visualLosses,
} from '../../util/markdown-blocks';
import { MarkdownHelpPanelComponent } from '../markdown-help/markdown-help.panel';

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
  { action: 'strike', label: 'Barré', icon: 'strike' },
  { action: 'bullet', label: 'Liste à puces', icon: 'list-bullet' },
  { action: 'ordered', label: 'Liste numérotée', icon: 'list-ordered' },
  { action: 'task', label: 'Case à cocher', icon: 'square-check' },
  { action: 'quote', label: 'Citation', icon: 'quote' },
  { action: 'code', label: 'Code', icon: 'code' },
];

/** Alertes du menu « Insérer » : icone de l'application et teinte du type. */
const CALLOUT_ICON: Record<CalloutType, string> = {
  note: 'info',
  tip: 'lightbulb',
  important: 'message-warning',
  warning: 'alert',
  caution: 'octagon-alert',
};

type TableAction = 'addRowAfter' | 'addColumnAfter' | 'deleteRow' | 'deleteColumn' | 'deleteTable';

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

/**
 * Editeur des notes. Le contenu est toujours du Markdown (`value`) : le mode « Markdown » le saisit directement
 * (barre d'outils, raccourcis, apercu), le mode « visuel » l'edite en WYSIWYG via Tiptap et le reserialise.
 * Simplement ouvrir une note en mode visuel ne la reecrit pas : seul un changement de l'utilisateur est emis.
 * Si le mode visuel ne sait pas representer tout le texte (HTML brut, notes de bas de page...), il reste en
 * lecture seule pour ne rien perdre, et propose de repasser en mode Markdown.
 */
@Component({
  selector: 'ff-note-editor',
  imports: [IconComponent, CdkMenu, CdkMenuItem, CdkMenuTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Le contenu de Tiptap est cree hors du template : ses styles ne peuvent pas etre encapsules.
  encapsulation: ViewEncapsulation.None,
  templateUrl: './note-editor.html',
  styleUrls: ['./note-editor.css', '../../editor/note-prose.css', '../../editor/note-blocks.css'],
})
export class NoteEditorComponent {
  /** Contenu Markdown (liaison bidirectionnelle). */
  readonly value = model.required<string>();
  /** Mode d'edition (liaison bidirectionnelle) : la page enregistre la preference. */
  readonly mode = model.required<NoteEditorMode>();
  readonly label = input('Contenu de la note');

  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);

  protected readonly toolbar = TOOLBAR;
  protected readonly callouts = CALLOUT_TYPES.map((type) => ({
    type,
    label: CALLOUT_META[type].label,
    marker: CALLOUT_META[type].marker,
    icon: CALLOUT_ICON[type],
  }));
  /** Onglet du mode Markdown. */
  protected readonly tab = signal<'write' | 'preview'>('write');
  /** Incremente a chaque transaction de l'editeur visuel : l'etat actif des boutons en depend. */
  private readonly tick = signal(0);
  /** Mots que le mode visuel perdrait (vide : edition visuelle sans risque). */
  protected readonly losses = signal<string[]>([]);
  protected readonly visualLocked = computed(
    () => this.mode() === 'RICH' && this.losses().length > 0,
  );
  protected readonly inTable = computed(() => {
    this.tick();
    return this.mode() === 'RICH' && !!this.rich?.isActive('table');
  });

  /** Saisie d'une adresse de lien (null : formulaire ferme). */
  protected readonly linkDraft = signal<string | null>(null);
  protected readonly linkError = signal('');
  protected readonly linkActive = computed(() => {
    this.tick();
    return this.mode() === 'RICH' && !!this.rich?.isActive('link');
  });
  /** Selection du mode Markdown au moment d'ouvrir le formulaire de lien ou l'aide. */
  private savedSelection: [number, number] | null = null;

  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');
  private readonly richHost = viewChild<ElementRef<HTMLElement>>('richHost');
  private readonly previewHost = viewChild<ElementRef<HTMLElement>>('previewHost');
  private readonly linkInput = viewChild<ElementRef<HTMLInputElement>>('linkInput');

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
          this.checkLosses(value);
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
            extensions: noteExtensions({
              placeholder: 'Rien à afficher pour le moment.',
              openLinks: true,
              onReadOnlyChecked: (_node, checked) => this.checkFromPreview(checked),
            }),
            content: value,
            contentType: 'markdown',
            editorProps: { attributes: { class: 'note-prose-content', 'aria-label': 'Aperçu' } },
          });
        } else {
          this.preview.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
        }
      });
    });
    // Le formulaire de lien recoit le focus a son ouverture.
    effect(() => {
      const input = this.linkInput()?.nativeElement;
      if (input) untracked(() => input.focus());
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyRich();
      this.preview?.destroy();
    });
  }

  protected setMode(mode: NoteEditorMode): void {
    this.linkDraft.set(null);
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
      case 'strike':
        return ed.isActive('strike');
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

  protected isCalloutActive(type: CalloutType): boolean {
    this.tick();
    return this.mode() === 'RICH' && !!this.rich?.isActive('callout', { type });
  }

  protected apply(action: MarkdownAction): void {
    if (this.mode() === 'RICH') {
      this.applyRich(action);
      return;
    }
    this.editText((text, start, end) => applyMarkdown(text, start, end, action));
  }

  /** Commande du menu « Insérer ». */
  protected insert(kind: InsertKind): void {
    if (this.mode() === 'RICH') {
      const chain = this.rich?.chain().focus();
      if (!chain) return;
      if (kind === 'table') chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      else if (kind === 'codeblock') chain.toggleCodeBlock().run();
      else if (kind === 'hr') chain.setHorizontalRule().run();
      else chain.toggleCallout(kind).run();
      return;
    }
    this.editText((text, start, end) => insertMarkdown(text, start, end, kind));
  }

  protected tableAction(action: TableAction): void {
    const chain = this.rich?.chain().focus();
    if (!chain) return;
    switch (action) {
      case 'addRowAfter':
        chain.addRowAfter().run();
        break;
      case 'addColumnAfter':
        chain.addColumnAfter().run();
        break;
      case 'deleteRow':
        chain.deleteRow().run();
        break;
      case 'deleteColumn':
        chain.deleteColumn().run();
        break;
      case 'deleteTable':
        chain.deleteTable().run();
        break;
    }
  }

  // ---- Liens -------------------------------------------------------------------------------

  protected openLink(): void {
    this.linkError.set('');
    if (this.mode() === 'RICH') {
      const href = this.rich?.getAttributes('link')['href'] as string | undefined;
      this.linkDraft.set(href ?? '');
    } else {
      this.saveSelection();
      this.linkDraft.set('');
    }
  }

  protected applyLink(event: Event): void {
    event.preventDefault();
    const url = normalizeUrl(this.linkDraft() ?? '');
    if (!url) {
      this.linkError.set('Adresse non valide : http(s)://…, mailto:, tel: ou #ancre.');
      return;
    }
    this.linkDraft.set(null);
    if (this.mode() === 'RICH') {
      const ed = this.rich;
      if (!ed) return;
      if (ed.state.selection.empty && !ed.isActive('link')) {
        ed.chain()
          .focus()
          .insertContent({
            type: 'text',
            text: url,
            marks: [{ type: 'link', attrs: { href: url } }],
          })
          .run();
      } else {
        ed.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }
      return;
    }
    this.editText((text, start, end) => insertLink(text, start, end, url), true);
  }

  protected removeLink(): void {
    this.linkDraft.set(null);
    this.rich?.chain().focus().extendMarkRange('link').unsetLink().run();
  }

  protected cancelLink(): void {
    this.linkDraft.set(null);
    if (this.mode() === 'RICH') this.rich?.commands.focus();
    else this.restoreSelection();
  }

  // ---- Aide Markdown -------------------------------------------------------------------------

  protected openHelp(): void {
    if (this.mode() === 'MARKDOWN') this.saveSelection();
    const ref = this.dialog.open<string>(MarkdownHelpPanelComponent, {
      backdropClass: 'ff-backdrop',
      positionStrategy: this.overlay.position().global().right('0').top('0'),
      height: '100dvh',
      maxWidth: '100vw',
      panelClass: 'ff-side-panel',
    });
    ref.closed.subscribe((markdown) => {
      if (markdown) this.insertSnippet(markdown);
      else if (this.mode() === 'MARKDOWN' && this.tab() === 'write') this.restoreSelection();
    });
  }

  /** Ajoute un exemple de l'aide a la position du curseur, comme un bloc separe. */
  private insertSnippet(markdown: string): void {
    if (this.mode() === 'RICH') {
      if (this.visualLocked()) return;
      this.rich?.chain().focus().insertContent(markdown, { contentType: 'markdown' }).run();
      return;
    }
    // Aide ouverte depuis l'apercu (pas de curseur) : l'exemple va a la fin de la note.
    if (!this.textarea()) this.savedSelection = [this.value().length, this.value().length];
    this.tab.set('write');
    // L'onglet « Écrire » peut devoir etre recree avant l'insertion.
    afterNextRender(
      () =>
        this.editText((text, start, end) => {
          const lineEnd = text.indexOf('\n', end);
          const pos = lineEnd === -1 ? text.length : lineEnd;
          const before = text.slice(0, pos);
          const after = text.slice(pos);
          const lead = !before.trim()
            ? ''
            : before.endsWith('\n\n')
              ? ''
              : before.endsWith('\n')
                ? '\n'
                : '\n\n';
          const trail = !after
            ? ''
            : after.startsWith('\n\n')
              ? ''
              : after.startsWith('\n')
                ? '\n'
                : '\n\n';
          const caret = before.length + lead.length + markdown.length;
          return { text: before + lead + markdown + trail + after, start: caret, end: caret };
        }, true),
      { injector: this.injector },
    );
  }

  // ---- Saisie ------------------------------------------------------------------------------

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLTextAreaElement).value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'b' || key === 'i') {
      event.preventDefault();
      this.apply(key === 'b' ? 'bold' : 'italic');
    } else if (key === 'k') {
      event.preventDefault();
      this.openLink();
    }
  }

  protected backToMarkdown(): void {
    this.tab.set('write');
    this.setMode('MARKDOWN');
  }

  /** Applique une modification au texte du mode Markdown (annulable par Ctrl+Z). */
  private editText(
    edit: (text: string, start: number, end: number) => TextEdit,
    useSaved = false,
  ): void {
    const area = this.textarea()?.nativeElement;
    if (!area) return;
    const [start, end] =
      useSaved && this.savedSelection
        ? this.savedSelection
        : [area.selectionStart, area.selectionEnd];
    this.savedSelection = null;
    const result = edit(area.value, start, end);
    replaceText(area, result.text);
    area.setSelectionRange(result.start, result.end);
    this.value.set(area.value);
  }

  private saveSelection(): void {
    const area = this.textarea()?.nativeElement;
    this.savedSelection = area ? [area.selectionStart, area.selectionEnd] : null;
  }

  private restoreSelection(): void {
    const area = this.textarea()?.nativeElement;
    const saved = this.savedSelection;
    this.savedSelection = null;
    if (!area) return;
    area.focus();
    if (saved) area.setSelectionRange(saved[0], saved[1]);
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
      case 'strike':
        chain.toggleStrike().run();
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
      extensions: noteExtensions({
        placeholder: 'Développez votre idée : contexte, pistes, questions…',
      }),
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
    this.checkLosses(value);
  }

  /** Verrouille l'editeur visuel si sa conversion du Markdown perdrait du texte. */
  private checkLosses(value: string): void {
    const ed = this.rich;
    if (!ed) return;
    const lost = value.trim() ? visualLosses(value, ed.getMarkdown()) : [];
    this.losses.set(lost);
    ed.setEditable(lost.length === 0, false);
    ed.view.dom.setAttribute('aria-readonly', String(lost.length > 0));
  }

  private destroyRich(): void {
    this.rich?.destroy();
    this.rich = null;
    this.richMarkdown = null;
    this.losses.set([]);
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
