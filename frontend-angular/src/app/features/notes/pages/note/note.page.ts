import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import {
  Note,
  NoteCategoryRef,
  NoteEditorMode,
  NotePatch,
  Task,
} from '../../../../core/api/models';
import { NotesApi } from '../../../../core/api/notes.api';
import { RefreshService } from '../../../../core/services/refresh.service';
import { SettingsStore } from '../../../../core/services/settings.store';
import { ToastService } from '../../../../core/services/toast.service';
import { saveBlob } from '../../../../core/util/download';
import { Loader } from '../../../../core/util/loader';
import { QuadrantBadgeComponent, StatusBadgeComponent } from '../../../../shared/ui/badges/index';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import {
  EmptyComponent,
  ErrorComponent,
  SkeletonComponent,
} from '../../../../shared/ui/states/index';
import { TaskActions } from '../../../tasks/services/task-actions.service';
import { NoteEditorComponent } from '../../components/note-editor/note-editor';
import { NoteTabsComponent } from '../../components/note-tabs/note-tabs';
import { NoteActions } from '../../services/note-actions.service';
import { NoteTabs } from '../../services/note-tabs.service';
import { parseTags } from '../../util/markdown';
import { noteFileName, noteToMarkdownFile } from '../../util/markdown-blocks';

/** Delai sans frappe avant l'enregistrement automatique. */
const SAVE_DELAY = 800;

type SaveState = 'saved' | 'pending' | 'saving' | 'error';
type EditableField = 'title' | 'content' | 'categoryIds' | 'tags';

/**
 * Enregistrements lances par un editeur qui se ferme (retour a la liste, changement d'onglet), par idee. Rouvrir
 * aussitot la meme idee attend la fin de l'envoi : sinon l'editeur relirait l'ancien texte et l'ecraserait.
 */
const closingSaves = new Map<string, Promise<void>>();

/**
 * Editeur d'une idee. Titre, contenu, categories et etiquettes sont enregistres automatiquement (champs modifies
 * seulement) ; le favori est enregistre immediatement. Les taches issues de l'idee sont rechargees apres chaque
 * mutation sans toucher a la saisie en cours.
 */
@Component({
  selector: 'ff-note-page',
  imports: [
    IconComponent,
    RouterLink,
    NoteEditorComponent,
    NoteTabsComponent,
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    StatusBadgeComponent,
    QuadrantBadgeComponent,
    EmptyComponent,
    ErrorComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './note.page.html',
  styleUrl: './note.page.css',
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class NotePage {
  /** Identifiant de l'idee (parametre de route). */
  readonly id = input.required<string>();

  private readonly api = inject(NotesApi);
  private readonly router = inject(Router);
  private readonly refresh = inject(RefreshService);
  private readonly toast = inject(ToastService);
  private readonly noteActions = inject(NoteActions);
  private readonly tabs = inject(NoteTabs);
  protected readonly taskActions = inject(TaskActions);
  protected readonly settings = inject(SettingsStore);

  protected readonly note = signal<Note | null>(null);
  protected readonly loadError = signal(false);
  protected readonly notFound = signal(false);

  // Saisie en cours (source de verite de l'ecran tant qu'elle n'est pas enregistree).
  protected readonly title = signal('');
  protected readonly content = signal('');
  /** Categories cochees (une idee peut en avoir plusieurs, ou aucune). */
  protected readonly categoryIds = signal<string[]>([]);
  /** Liste des categories ouverte (fenetre a cocher sous le champ). */
  protected readonly categoriesOpen = signal(false);
  protected readonly tagsText = signal('');

  protected readonly saveState = signal<SaveState>('saved');
  /** Export PDF en cours (premier export : chargement de pdfmake). */
  protected readonly exportingPdf = signal(false);
  protected readonly saveError = signal('');
  private readonly dirty = new Set<EditableField>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private saving: Promise<void> | null = null;
  /** Page quittee : un chargement qui se termine apres coup ne doit pas rouvrir l'onglet ferme entre-temps. */
  private destroyed = false;

  protected readonly categories = new Loader(() => this.api.categories());
  protected readonly mode = computed<NoteEditorMode>(
    () => this.settings.settings().noteEditorMode ?? 'MARKDOWN',
  );
  /**
   * Categories cochees, par nom, avec leur couleur : celles de la liste chargee, sinon celles de l'idee (liste pas
   * encore chargee).
   */
  protected readonly chosenCategories = computed<NoteCategoryRef[]>(() => {
    const known = new Map<string, NoteCategoryRef>();
    for (const c of this.note()?.categories ?? []) known.set(c.id, c);
    for (const c of this.categories.data() ?? []) known.set(c.id, c);
    return this.categoryIds()
      .map((id) => known.get(id))
      .filter((c): c is NoteCategoryRef => !!c)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
  });
  protected readonly titleInvalid = computed(() => !this.title().trim());
  protected readonly tasks = computed<Task[]>(() => this.note()?.tasks ?? []);
  protected readonly activeTasks = computed(() => this.tasks().filter((t) => !t.archivedAt));
  protected readonly doneTasks = computed(() => this.tasks().filter((t) => t.status === 'DONE'));

  constructor() {
    // Chargement complet a l'ouverture (ou si l'identifiant change).
    effect(() => {
      const id = this.id();
      untracked(() => void this.open(id));
    });
    // Apres une mutation ailleurs (tache terminee depuis le panneau, tache creee...), seules les taches sont relues.
    let first = true;
    effect(() => {
      this.refresh.tick();
      if (first) {
        first = false;
        return;
      }
      untracked(() => void this.reloadTasks());
    });
    // L'onglet suit la saisie : titre (s'il n'est pas vide) et couleur de la premiere categorie cochee.
    effect(() => {
      const note = this.note();
      if (!note) return;
      const title = this.title();
      const color = this.chosenCategories()[0]?.color ?? null;
      untracked(() => this.tabs.update(note.id, { title, color }));
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      // Quitter la page enregistre immediatement la saisie en attente (ou attend l'envoi en cours).
      const id = this.note()?.id;
      if (id && (this.dirty.size || this.saving)) {
        const done = this.flush().catch(() => undefined);
        closingSaves.set(id, done);
        void done.then(() => {
          if (closingSaves.get(id) === done) closingSaves.delete(id);
        });
      }
      clearTimeout(this.timer);
    });
  }

  // ---- Chargement ------------------------------------------------------------------------

  private async open(id: string): Promise<void> {
    try {
      await closingSaves.get(id);
      const note = await firstValueFrom(this.api.get(id));
      if (this.destroyed) return;
      // Ouvrir une idee l'ajoute aux onglets ; elle y reste jusqu'a « Fermer l'onglet ».
      this.tabs.open(note);
      this.note.set(note);
      this.title.set(note.title);
      this.content.set(note.content);
      this.categoryIds.set(note.categories.map((c) => c.id));
      this.tagsText.set(note.tags.join(', '));
      this.dirty.clear();
      this.saveState.set('saved');
      this.loadError.set(false);
    } catch (e) {
      if (e instanceof AppError && e.problem.status === 404) {
        // Idee supprimee (ailleurs, ou depuis un autre appareil) : son onglet disparait.
        this.tabs.close(id);
        this.notFound.set(true);
      } else {
        this.loadError.set(true);
      }
    }
  }

  protected retry(): void {
    this.loadError.set(false);
    void this.open(this.id());
  }

  private async reloadTasks(): Promise<void> {
    const current = this.note();
    if (!current) return;
    try {
      const fresh = await firstValueFrom(this.api.get(current.id));
      this.note.update((n) => (n ? { ...n, tasks: fresh.tasks, favorite: fresh.favorite } : n));
    } catch {
      /* l'idee a pu etre supprimee depuis un autre onglet : l'ecran reste en l'etat */
    }
  }

  // ---- Saisie et enregistrement automatique -----------------------------------------------

  protected edit(field: Exclude<EditableField, 'categoryIds'>, raw: string): void {
    // Un titre colle sur plusieurs lignes reste un titre d'une ligne.
    const value = field === 'title' ? raw.replace(/\s*[\r\n]+\s*/g, ' ') : raw;
    const target = {
      title: this.title,
      content: this.content,
      tags: this.tagsText,
    }[field];
    if (target() === value) return;
    target.set(value);
    this.markDirty(field);
  }

  /** Coche ou decoche une categorie ; enregistre aussitot (comme l'ancienne liste deroulante). */
  protected toggleCategory(id: string, on: boolean): void {
    const current = this.categoryIds();
    if (on === current.includes(id)) return;
    this.categoryIds.set(on ? [...current, id] : current.filter((c) => c !== id));
    this.markDirty('categoryIds');
  }

  /** Retire toutes les categories de l'idee. */
  protected clearCategories(): void {
    if (!this.categoryIds().length) return;
    this.categoryIds.set([]);
    this.markDirty('categoryIds');
  }

  protected isChosen(id: string): boolean {
    return this.categoryIds().includes(id);
  }

  /** Ouvre la liste a cocher ; le focus va sur la premiere case. */
  protected onCategoriesAttached(): void {
    setTimeout(() =>
      document.querySelector<HTMLElement>('#note-categories-panel :is(input, a)')?.focus(),
    );
  }

  /** Echap ferme la liste et rend le focus au champ. */
  protected onCategoriesKey(event: KeyboardEvent, trigger: HTMLElement): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.categoriesOpen.set(false);
      trigger.focus();
    }
  }

  private markDirty(field: EditableField): void {
    this.dirty.add(field);
    this.saveState.set('pending');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), field === 'categoryIds' ? 0 : SAVE_DELAY);
  }

  /** Valeur comparable d'un champ (saisie en cours), pour savoir s'il a change pendant un envoi. */
  private snapshot(field: EditableField): string {
    switch (field) {
      case 'title':
        return this.title();
      case 'content':
        return this.content();
      case 'categoryIds':
        return [...this.categoryIds()].sort().join(',');
      case 'tags':
        return this.tagsText();
    }
  }

  /** Enregistre les champs modifies ; une saisie faite pendant l'envoi reste a enregistrer. */
  protected async flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.saving) await this.saving;
    const note = this.note();
    if (!note || !this.dirty.size) return;
    const patch: NotePatch = {};
    const sent = new Map<EditableField, string>();
    for (const field of this.dirty) {
      if (field === 'title') {
        // Un titre vide n'est pas envoye : l'erreur reste affichee jusqu'a correction.
        if (this.titleInvalid()) continue;
        patch.title = this.title().trim();
      } else if (field === 'content') {
        patch.content = this.content();
      } else if (field === 'categoryIds') {
        patch.categoryIds = this.categoryIds();
      } else {
        patch.tags = parseTags(this.tagsText());
      }
      sent.set(field, this.snapshot(field));
    }
    if (!sent.size) {
      this.saveState.set('error');
      this.saveError.set('Le titre est obligatoire.');
      return;
    }
    this.saveState.set('saving');
    this.saving = (async () => {
      try {
        const saved = await firstValueFrom(this.api.update(note.id, patch));
        this.note.set(saved);
        for (const [field, value] of sent) {
          if (this.snapshot(field) === value) this.dirty.delete(field);
        }
        this.saveError.set('');
        this.saveState.set(this.dirty.size ? 'pending' : 'saved');
        if (this.dirty.size) this.timer = setTimeout(() => void this.flush(), SAVE_DELAY);
      } catch (e) {
        // Message affiche a cote de l'indicateur d'enregistrement ; l'intercepteur signale deja les pannes reseau.
        // 404 : l'idee a ete supprimee ailleurs (autre onglet) ; le texte reste a l'ecran pour pouvoir le copier.
        this.saveState.set('error');
        this.saveError.set(
          e instanceof AppError && e.problem.status === 404
            ? 'Cette idée a été supprimée entre-temps (autre onglet ?). Copiez votre texte si vous voulez le garder.'
            : e instanceof AppError
              ? e.problem.detail
              : 'Enregistrement impossible.',
        );
      } finally {
        this.saving = null;
      }
    })();
    await this.saving;
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.dirty.size || this.saveState() === 'saving') {
      void this.flush();
      event.preventDefault();
    }
  }

  // ---- Actions -----------------------------------------------------------------------------

  protected async setMode(mode: NoteEditorMode): Promise<void> {
    try {
      await this.settings.update({ noteEditorMode: mode });
    } catch (e) {
      this.toast.errorFrom(e, 'Impossible d’enregistrer le mode d’édition.');
    }
  }

  protected async toggleFavorite(): Promise<void> {
    const note = this.note();
    if (!note) return;
    this.note.set({ ...note, favorite: !note.favorite });
    try {
      await firstValueFrom(this.api.update(note.id, { favorite: !note.favorite }));
    } catch (e) {
      this.note.update((n) => (n ? { ...n, favorite: note.favorite } : n));
      this.toast.errorFrom(e);
    }
  }

  protected async restore(): Promise<void> {
    const note = this.note();
    if (!note) return;
    if (await this.noteActions.restore(note.id)) {
      this.note.set({ ...note, archivedAt: null, archiveReason: null, purgeAt: null });
    }
  }

  /** Enregistre d'abord la saisie en cours, puis ouvre le formulaire de tache prerempli. */
  protected async createTask(): Promise<void> {
    await this.flush();
    const note = this.note();
    if (!note) return;
    const task = await this.noteActions.createTask({
      ...note,
      title: this.title().trim() || note.title,
      content: this.content(),
      tags: parseTags(this.tagsText()),
    });
    // L'idee devient une tache : elle quitte la liste des idees et rejoint les Archives.
    if (task && !note.archivedAt) {
      this.tabs.close(note.id);
      void this.router.navigate(['/notes']);
    }
  }

  /** Categories cochees a l'ecran (saisie en cours comprise), pour les exports. */
  private categoryNames(): string[] {
    return this.chosenCategories().map((c) => c.name);
  }

  /** Telecharge la note en .md (en-tete de metadonnees + contenu), saisie en cours comprise. */
  protected exportMarkdown(): void {
    const note = this.note();
    if (!note) return;
    const title = this.title().trim() || note.title;
    const file = noteToMarkdownFile({
      title,
      content: this.content(),
      categories: this.categoryNames(),
      tags: parseTags(this.tagsText()),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    });
    saveBlob(new Blob([file], { type: 'text/markdown;charset=utf-8' }), noteFileName(title, 'md'));
    this.toast.success('Note exportée en Markdown.');
  }

  /**
   * Telecharge la note en PDF mis en page (titre, categorie, etiquettes, dates, contenu, numeros de page), saisie
   * en cours comprise. pdfmake n'est charge qu'au premier export.
   */
  protected async exportPdf(): Promise<void> {
    const note = this.note();
    if (!note || this.exportingPdf()) return;
    this.exportingPdf.set(true);
    const title = this.title().trim() || note.title;
    const categories = this.categoryNames();
    const tags = parseTags(this.tagsText());
    const meta = [
      ...(categories.length
        ? [`${categories.length > 1 ? 'Catégories' : 'Catégorie'} : ${categories.join(', ')}`]
        : []),
      ...(tags.length ? [`Étiquettes : ${tags.join(', ')}`] : []),
      `Créée le ${this.settings.fmt(note.createdAt)}`,
      `Modifiée le ${this.settings.fmt(note.updatedAt)}`,
    ];
    try {
      const { noteToPdf } = await import('../../util/note-pdf-export');
      const { pdf, emojiMissing } = await noteToPdf({ title, content: this.content(), meta });
      saveBlob(pdf, noteFileName(title, 'pdf'));
      if (emojiMissing) {
        this.toast.info(
          'Note exportée en PDF, sans les émojis : leur police n’a pas pu être chargée.',
        );
      } else {
        this.toast.success('Note exportée en PDF.');
      }
    } catch (e) {
      this.toast.errorFrom(e, 'Export PDF impossible. Réessayez, ou exportez en Markdown.');
    } finally {
      this.exportingPdf.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const note = this.note();
    if (!note) return;
    clearTimeout(this.timer);
    const deleted = await this.noteActions.remove({
      id: note.id,
      title: note.title,
      taskCount: note.tasks.length,
    });
    if (deleted) {
      this.dirty.clear();
      void this.router.navigate(['/notes']);
    } else if (this.dirty.size) {
      void this.flush();
    }
  }
}
