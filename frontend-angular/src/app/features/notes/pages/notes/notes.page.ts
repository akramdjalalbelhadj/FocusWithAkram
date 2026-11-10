import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NoteSort, NoteSummary } from '../../../../core/api/models';
import { NotesApi } from '../../../../core/api/notes.api';
import { RefreshService } from '../../../../core/services/refresh.service';
import { SettingsStore } from '../../../../core/services/settings.store';
import { ToastService } from '../../../../core/services/toast.service';
import { debounced } from '../../../../core/util/debounced';
import { Loader } from '../../../../core/util/loader';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import {
  EmptyComponent,
  ErrorComponent,
  SkeletonComponent,
} from '../../../../shared/ui/states/index';
import { TourComponent } from '../../../../shared/ui/tour/tour';
import { NoteTabsComponent } from '../../components/note-tabs/note-tabs';
import { NotesTourService } from '../../components/notes-tour/notes-tour.service';
import { NoteActions } from '../../services/note-actions.service';
import { NoteTabs } from '../../services/note-tabs.service';

/** Vues rapides : toutes, favorites, encore a transformer (sans tache), deja transformees (avec taches). */
type NoteView = 'all' | 'favorites' | 'open' | 'converted';

const PAGE = 60;

@Component({
  selector: 'ff-notes-page',
  imports: [
    IconComponent,
    EmptyComponent,
    ErrorComponent,
    SkeletonComponent,
    RouterLink,
    TourComponent,
    NoteTabsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notes.page.html',
  styleUrl: './notes.page.css',
})
export class NotesPage {
  private readonly api = inject(NotesApi);
  private readonly router = inject(Router);
  private readonly refresh = inject(RefreshService);
  private readonly toast = inject(ToastService);
  protected readonly actions = inject(NoteActions);
  protected readonly settings = inject(SettingsStore);
  /** Tutoriel « de l’idée à l’action » : propose seul a la premiere visite, relance par « Comment ça marche ? ». */
  protected readonly tour = inject(NotesTourService);
  /** Idees ouvertes en onglets : la barre n'apparait que s'il y en a. */
  protected readonly tabs = inject(NoteTabs);

  protected readonly views: { value: NoteView; label: string }[] = [
    { value: 'all', label: 'Toutes' },
    { value: 'favorites', label: 'Favorites' },
    { value: 'open', label: 'À transformer' },
    { value: 'converted', label: 'Avec tâches' },
  ];

  protected readonly query = signal('');
  private readonly q = debounced(this.query);
  protected readonly view = signal<NoteView>('all');
  protected readonly categoryId = signal('');
  protected readonly tag = signal('');
  protected readonly sort = signal<NoteSort>('updatedAt');
  protected readonly limit = signal(PAGE);

  protected readonly loader = new Loader(() =>
    this.api.list({
      q: this.q(),
      categoryId: this.categoryId() || undefined,
      tag: this.tag() || undefined,
      favorite: this.view() === 'favorites' ? true : undefined,
      withTasks: this.view() === 'converted' ? true : this.view() === 'open' ? false : undefined,
      sort: this.sort(),
      dir: this.sort() === 'title' ? 'asc' : 'desc',
      size: this.limit(),
    }),
  );
  protected readonly categories = new Loader(() => this.api.categories());
  protected readonly tags = new Loader(() => this.api.tags());

  protected readonly notes = computed(() => this.loader.data()?.items ?? []);
  protected readonly total = computed(() => this.loader.data()?.totalItems ?? 0);
  protected readonly hasMore = computed(
    () => this.notes().length < this.total() && this.limit() < 200,
  );
  protected readonly filtered = computed(
    () => !!(this.query().trim() || this.categoryId() || this.tag() || this.view() !== 'all'),
  );

  constructor() {
    void this.tour.autoStart();
    // Un titre ou une categorie modifies (autre appareil, categorie renommee) se retrouvent dans les onglets.
    effect(() => {
      const notes = this.notes();
      untracked(() => this.tabs.refresh(notes));
    });
  }

  /** Saisie rapide en tete de page. */
  protected readonly draft = signal('');
  protected readonly capturing = signal(false);

  protected async capture(open = false): Promise<void> {
    const title = this.draft().trim();
    if (!title || this.capturing()) return;
    this.capturing.set(true);
    try {
      const note = await firstValueFrom(this.api.create({ title }));
      this.draft.set('');
      this.refresh.bump();
      if (open) void this.router.navigate(['/notes', note.id]);
      else this.toast.success('Idée enregistrée.');
    } catch (e) {
      this.toast.errorFrom(e, 'Impossible d’enregistrer l’idée.');
    } finally {
      this.capturing.set(false);
    }
  }

  protected async toggleFavorite(note: NoteSummary): Promise<void> {
    try {
      await firstValueFrom(this.api.update(note.id, { favorite: !note.favorite }));
      this.refresh.bump();
    } catch (e) {
      this.toast.errorFrom(e);
    }
  }

  protected remove(note: NoteSummary): void {
    void this.actions.remove({ id: note.id, title: note.title, taskCount: note.taskCount });
  }

  protected setView(view: NoteView): void {
    this.view.set(view);
    this.limit.set(PAGE);
  }

  protected clearFilters(): void {
    this.query.set('');
    this.categoryId.set('');
    this.tag.set('');
    this.view.set('all');
    this.limit.set(PAGE);
  }

  protected loadMore(): void {
    this.limit.update((n) => Math.min(200, n + PAGE));
  }

  protected progress(note: NoteSummary): string {
    if (!note.taskCount) return '';
    const tasks = note.taskCount === 1 ? '1 tâche' : `${note.taskCount} tâches`;
    if (!note.tasksDone) return tasks;
    return note.tasksDone === note.taskCount
      ? `${tasks} · toutes terminées`
      : `${tasks} · ${note.tasksDone} terminée${note.tasksDone > 1 ? 's' : ''}`;
  }
}
