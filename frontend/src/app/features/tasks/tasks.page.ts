import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { PriorityMode, Task } from '../../core/api/models';
import { ProjectsApi, TasksApi } from '../../core/api/tasks.api';
import { SettingsStore } from '../../core/services/settings.store';
import { RefreshService } from '../../core/services/refresh.service';
import { ToastService } from '../../core/services/toast.service';
import { Loader } from '../../core/util/loader';
import { QuadrantBadgeComponent } from '../../shared/ui/badges';
import { IconComponent } from '../../shared/ui/icon';
import { EmptyComponent, ErrorComponent, SkeletonComponent } from '../../shared/ui/states';
import { TaskActions } from './task-actions.service';
import { TaskCardComponent } from './task-card';

type SortKey = 'priority' | 'due' | 'title' | 'created';

const MODES: { mode: PriorityMode; label: string; icon: string; empty: string }[] = [
  { mode: 'PRIORITIES', label: 'Priorités', icon: 'flag', empty: 'Aucune tâche active. Profitez-en ou créez-en une !' },
  { mode: 'TODAY', label: "Aujourd'hui", icon: 'calendar-check', empty: "Rien de prévu aujourd'hui." },
  { mode: 'WEEK', label: 'Cette semaine', icon: 'calendar-days', empty: 'Aucune échéance cette semaine.' },
  { mode: 'ALL', label: 'Toutes', icon: 'layers', empty: 'Aucune tâche active.' },
  { mode: 'OVERDUE', label: 'En retard', icon: 'alert', empty: 'Aucune tâche en retard. 🎉' },
  { mode: 'DONE', label: 'Terminées', icon: 'circle-check', empty: 'Aucune tâche terminée pour le moment.' },
];

@Component({
  selector: 'ff-tasks-page',
  imports: [IconComponent, TaskCardComponent, QuadrantBadgeComponent, EmptyComponent, ErrorComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 class="page-title"><span class="page-icon"><ff-icon name="list-checks" [size]="24" /></span>Mes tâches</h1>
        <p class="page-sub">Votre liste de priorités, issue de la matrice d’Eisenhower.</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="actions.create()"><ff-icon name="plus" />Nouvelle tâche</button>
    </header>

    <div class="tasks-layout"><section class="card p-5 min-w-0">
    <div class="flex gap-1 overflow-x-auto pb-1 mb-4 -mx-1 px-1" role="tablist" aria-label="Vues">
      @for (m of modes; track m.mode) {
        <button type="button" role="tab" class="btn btn-sm flex-none" [attr.aria-selected]="mode() === m.mode"
          [class]="mode() === m.mode ? 'btn-primary' : 'btn-secondary'" (click)="mode.set(m.mode)"><ff-icon [name]="m.icon" [size]="14" />{{ m.label }}</button>
      }
    </div>

    <form class="flex gap-2 mb-4" (submit)="$event.preventDefault(); quickAdd(quick)">
      <input #quick class="input" placeholder="Ajouter une tâche rapidement et appuyer sur Entrée…" aria-label="Ajout rapide" maxlength="200" />
      <button type="submit" class="btn btn-secondary">Ajouter</button>
    </form>

    <div class="flex flex-wrap gap-2 mb-5" role="search">
      <div class="relative flex-1 min-w-48 max-w-sm">
        <ff-icon name="search" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input class="input pl-9" type="search" placeholder="Rechercher" aria-label="Rechercher une tâche" [value]="q()" (input)="q.set($any($event.target).value)" />
      </div>
      <select class="input !w-auto" aria-label="Projet" [value]="projectId()" (change)="projectId.set($any($event.target).value)">
        <option value="">Tous les projets</option>
        @for (p of projects(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
      </select>
      <select class="input !w-auto" aria-label="Étiquette" [value]="tag()" (change)="tag.set($any($event.target).value)">
        <option value="">Toutes les étiquettes</option>
        @for (t of tags(); track t) { <option [value]="t">{{ t }}</option> }
      </select>
      <select class="input !w-auto" aria-label="Trier par" [value]="sort()" (change)="sort.set($any($event.target).value)">
        <option value="priority">Tri : priorité</option>
        <option value="due">Tri : échéance</option>
        <option value="title">Tri : titre</option>
        <option value="created">Tri : création</option>
      </select>
    </div>

    @if (loader.error()) { <ff-error (retry)="loader.load()" /> }
    @else if (loader.loading()) { <ff-skeleton [count]="5" /> }
    @else if (!sorted().length) {
      <div class="card"><ff-empty icon="inbox" [title]="current().empty" [hint]="q() ? 'Essayez d’élargir votre recherche.' : ''" /></div>
    } @else {
      <p class="text-sm text-muted mb-2" aria-live="polite">{{ sorted().length }} tâche{{ sorted().length > 1 ? 's' : '' }}</p>
      <ul class="space-y-2">
        @for (t of sorted(); track t.id) {
          <li class="flex flex-col sm:flex-row sm:items-start gap-2" (click)="selectedId.set(t.id)">
            <span class="sm:w-44 flex-none sm:pt-3"><ff-quadrant-badge [compact]="true" [q]="t.quadrant" /></span>
            <div class="flex-1 min-w-0"><ff-task-card [task]="t" /></div>
          </li>
        }
      </ul>
    }
    </section>
    @if (selected(); as t) {
      <aside class="card p-6 task-summary">
        <span class="badge badge-brand">{{ t.quadrant }} · {{ t.status === 'IN_PROGRESS' ? 'En cours' : t.status === 'DONE' ? 'Terminée' : 'À faire' }}</span>
        <h2 class="text-xl font-bold mt-5 mb-3">{{ t.title }}</h2><p class="text-sm text-muted mb-5">{{ t.description || 'Aucune description.' }}</p>
        <div class="border-y border-line py-4 space-y-3 text-sm"><p>Échéance : {{ settings.fmt(t.plannedEndAt) || 'Sans date' }}</p><p>Estimation : {{ t.estimatedMinutes ?? '—' }} min</p><p>Sous-tâches : {{ t.subtasksDone }}/{{ t.subtasksTotal }}</p></div>
        <div class="mt-5 space-y-3">@for (sub of t.subtasks; track sub.id) { <p class="text-sm text-muted">{{ sub.done ? '✓' : '□' }} {{ sub.title }}</p> }</div>
        <button class="btn btn-secondary mt-5 w-full" (click)="actions.openDetail(t.id)">Ouvrir le détail complet</button>
        @if (!t.archivedAt) { <button class="btn btn-primary mt-3 w-full" (click)="actions.focusOn(t)"><ff-icon name="play" />Démarrer un Pomodoro</button> }
      </aside>
    }
    </div>
  `,
})
export class TasksPage {
  protected readonly actions = inject(TaskActions);
  protected readonly settings = inject(SettingsStore);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(() => this.sorted().find(t => t.id === this.selectedId()) ?? this.sorted()[0] ?? null);
  private readonly api = inject(TasksApi);
  private readonly refresh = inject(RefreshService);
  private readonly toast = inject(ToastService);

  protected readonly modes = MODES;
  protected readonly mode = signal<PriorityMode>('PRIORITIES');
  protected readonly q = signal('');
  protected readonly projectId = signal('');
  protected readonly tag = signal('');
  protected readonly sort = signal<SortKey>('priority');

  protected readonly projects = toSignal(inject(ProjectsApi).list(), { initialValue: [] });
  protected readonly tags = toSignal(this.api.tags(), { initialValue: [] as string[] });
  protected readonly current = computed(() => MODES.find((m) => m.mode === this.mode())!);

  protected readonly loader = new Loader(() =>
    this.api.priorities(this.mode(), { q: this.q(), projectId: this.projectId(), tag: this.tag() }),
  );

  protected readonly sorted = computed<Task[]>(() => {
    const list = [...(this.loader.data() ?? [])];
    switch (this.sort()) {
      case 'due':
        return list.sort((a, b) => (a.plannedEndAt ?? '9').localeCompare(b.plannedEndAt ?? '9'));
      case 'title':
        return list.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
      case 'created':
        return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      default:
        return list; // ordre de priorite calcule par le serveur
    }
  });

  protected async quickAdd(input: HTMLInputElement): Promise<void> {
    const title = input.value.trim();
    if (!title) return;
    input.value = '';
    try {
      await firstValueFrom(this.api.create({ title, quadrant: 'Q2', projectId: this.projectId() || null }));
      this.refresh.bump();
    } catch {
      input.value = title;
      this.toast.error('La tâche n’a pas pu être créée.');
    }
  }
}
