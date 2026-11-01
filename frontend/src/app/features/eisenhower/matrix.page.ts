import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { QUADRANTS, QUADRANT_META, Quadrant, QuadrantView, Task, TaskStatus } from '../../core/api/models';
import { ProjectsApi, TasksApi } from '../../core/api/tasks.api';
import { RefreshService } from '../../core/services/refresh.service';
import { ToastService } from '../../core/services/toast.service';
import { Loader } from '../../core/util/loader';
import { IconComponent } from '../../shared/ui/icon';
import { EmptyComponent, ErrorComponent } from '../../shared/ui/states';
import { TaskActions } from '../tasks/task-actions.service';
import { TaskCardComponent } from '../tasks/task-card';

@Component({
  selector: 'ff-matrix-page',
  imports: [CdkDropListGroup, CdkDropList, CdkDrag, IconComponent, TaskCardComponent, EmptyComponent, ErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 class="page-title"><span class="page-icon"><ff-icon name="grid" [size]="24" /></span>Matrice d’Eisenhower</h1>

      </div>
      <button type="button" class="btn btn-primary" (click)="actions.create({ quadrant: mobileQuadrant() })"><ff-icon name="plus" />Nouvelle tâche</button>
    </header>

    <!-- Filtres -->
    <div class="flex flex-wrap gap-2 mb-5" role="search">
      <div class="relative flex-1 min-w-48 max-w-sm">
        <ff-icon name="search" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
        <input class="input pl-9" type="search" placeholder="Rechercher dans la matrice" aria-label="Rechercher dans la matrice" [value]="q()" (input)="q.set($any($event.target).value)" />
      </div>
      <select class="input !w-auto" aria-label="Filtrer par projet" [value]="projectId()" (change)="projectId.set($any($event.target).value)">
        <option value="">Tous les projets</option>
        @for (p of projects(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
      </select>
      <select class="input !w-auto" aria-label="Filtrer par statut" [value]="status()" (change)="status.set($any($event.target).value)">
        <option value="">Tous les statuts</option>
        <option value="TODO">À faire</option>
        <option value="IN_PROGRESS">En cours</option>
      </select>
      <select class="input !w-auto" aria-label="Filtrer par étiquette" [value]="tag()" (change)="tag.set($any($event.target).value)">
        <option value="">Toutes les étiquettes</option>
        @for (t of tags(); track t) { <option [value]="t">{{ t }}</option> }
      </select>
      <label class="btn btn-secondary cursor-pointer has-[:checked]:!bg-danger-soft has-[:checked]:!text-danger">
        <input type="checkbox" class="sr-only-text" [checked]="overdue()" (change)="overdue.set($any($event.target).checked)" />
        <ff-icon name="alert" [size]="15" />En retard
      </label>
    </div>

    @if (loader.error()) { <ff-error (retry)="loader.load()" /> }
    @else if (loader.loading()) { <div class="grid lg:grid-cols-2 gap-4"> @for (_ of [1, 2, 3, 4]; track _) { <div class="skeleton h-64"></div> } </div> }
    @else {
      <!-- Selecteur de quadrant (mobile / tablette etroite) -->
      <div class="lg:hidden mb-4 grid grid-cols-4 gap-1 p-1 rounded-xl bg-surface-2" role="tablist" aria-label="Quadrants">
        @for (q of view(); track q.quadrant) {
          <button type="button" role="tab" class="rounded-lg py-2 text-xs font-bold transition-colors" [attr.aria-selected]="mobileQuadrant() === q.quadrant"
            [style.background]="mobileQuadrant() === q.quadrant ? 'var(--' + q.quadrant.toLowerCase() + '-soft)' : 'transparent'"
            [style.color]="mobileQuadrant() === q.quadrant ? 'var(--' + q.quadrant.toLowerCase() + ')' : 'var(--muted)'"
            (click)="mobileQuadrant.set(q.quadrant)">{{ q.quadrant }}<span class="block font-medium opacity-80">{{ q.tasks.length }}</span></button>
        }
      </div>

      <div class="matrix-grid grid lg:grid-cols-2 gap-4" cdkDropListGroup>
        @for (q of view(); track q.quadrant) {
          <section class="matrix-quadrant rounded-2xl border flex-col min-h-72"
            [style.--quadrant-accent]="'var(--' + q.quadrant.toLowerCase() + '-accent)'"
            [style.--quadrant-soft]="'var(--' + q.quadrant.toLowerCase() + '-soft)'"
            [style.--quadrant-line]="'var(--' + q.quadrant.toLowerCase() + '-line)'"
            [class]="q.quadrant === mobileQuadrant() ? 'flex' : 'hidden lg:flex'"
            [style.background]="'var(--' + q.quadrant.toLowerCase() + '-soft)'" [style.border-color]="'var(--' + q.quadrant.toLowerCase() + '-line)'"
            [attr.aria-labelledby]="'q-h-' + q.quadrant">
            <header class="flex items-center gap-3 px-4 pt-4 pb-3" [style.color]="'var(--' + q.quadrant.toLowerCase() + ')'">
              <span class="grid place-items-center size-9 rounded-xl bg-surface/70"><ff-icon [name]="meta[q.quadrant].icon" /></span>
              <div class="min-w-0 flex-1">
                <h2 [id]="'q-h-' + q.quadrant" class="font-extrabold uppercase tracking-wide text-sm">{{ meta[q.quadrant].label }}</h2>
                <p class="text-xs opacity-85">{{ q.tasks.length }} tâches · {{ meta[q.quadrant].hint }}</p>
              </div>
              @if (overdueOf(q) > 0) { <span class="badge badge-danger" title="Tâches en retard"><ff-icon name="alert" [size]="11" />{{ overdueOf(q) }}</span> }
              <span class="badge bg-surface/80" [attr.aria-label]="q.tasks.length + ' tâches'">{{ q.quadrant }}</span>
              <button type="button" class="btn btn-sm btn-icon bg-surface/70 hover:bg-surface" [attr.aria-label]="'Ajouter une tâche en ' + meta[q.quadrant].label"
                (click)="actions.create({ quadrant: q.quadrant })"><ff-icon name="plus" [size]="16" /></button>
            </header>

            <div cdkDropList [cdkDropListData]="q.quadrant" (cdkDropListDropped)="drop($event)"
              class="flex-1 px-3 pb-2 space-y-2 min-h-24" [attr.aria-label]="'Tâches ' + meta[q.quadrant].label">
              @for (t of q.tasks; track t.id; let i = $index) {
                <div cdkDrag [cdkDragData]="t" class="rounded-xl" (keydown)="onCardKey($event, t, q.quadrant, i)">
                  <ff-task-card [task]="t" [compact]="true" />
                </div>
              } @empty {
                <ff-empty icon="inbox" title="Aucune tâche" [hint]="hint(q.quadrant)" />
              }
            </div>

            <form class="px-3 pb-3" (submit)="$event.preventDefault(); quickAdd(q.quadrant, field)">
              <input #field class="input !bg-surface/80" placeholder="Ajout rapide… (Entrée)" [attr.aria-label]="'Ajout rapide dans ' + meta[q.quadrant].label" maxlength="200" />
            </form>
          </section>
        }
      </div>
      @if (loader.data()!.total === 0 && !filtersActive()) {
        <p class="text-center text-muted mt-6">Votre matrice est vide : créez une première tâche pour commencer.</p>
      }
    }
  `,
})
export class MatrixPage {
  protected readonly actions = inject(TaskActions);
  private readonly api = inject(TasksApi);
  private readonly toast = inject(ToastService);
  private readonly refresh = inject(RefreshService);

  protected readonly meta = QUADRANT_META;
  protected readonly q = signal('');
  protected readonly projectId = signal('');
  protected readonly status = signal<TaskStatus | ''>('');
  protected readonly tag = signal('');
  protected readonly overdue = signal(false);
  protected readonly mobileQuadrant = signal<Quadrant>('Q1');

  protected readonly projects = toSignal(inject(ProjectsApi).list(), { initialValue: [] });
  protected readonly tags = toSignal(this.api.tags(), { initialValue: [] as string[] });

  protected readonly loader = new Loader(() =>
    this.api.matrix({ q: this.q(), projectId: this.projectId(), status: this.status(), tag: this.tag(), overdue: this.overdue() || undefined }),
  );

  /** Copie locale modifiable : permet de refleter un glisser-deposer immediatement (optimiste). */
  protected readonly view = linkedSignal<QuadrantView[]>(() => this.loader.data()?.quadrants ?? []);
  protected readonly filtersActive = computed(() => !!(this.q() || this.projectId() || this.status() || this.tag() || this.overdue()));

  protected overdueOf(q: QuadrantView): number {
    return q.tasks.filter((t) => t.overdue).length;
  }

  protected hint(q: Quadrant): string {
    return this.filtersActive() ? 'Aucune tâche ne correspond aux filtres.' : { Q1: 'Rien d’urgent : bravo !', Q2: 'Planifiez ici vos projets importants.', Q3: 'Les interruptions à limiter.', Q4: 'Ce qui peut attendre ou disparaître.' }[q];
  }

  private lists(): Record<Quadrant, Task[]> {
    const out = {} as Record<Quadrant, Task[]>;
    for (const q of this.view()) out[q.quadrant] = [...q.tasks];
    return out;
  }

  private ids(lists: Record<Quadrant, Task[]>, q: Quadrant): string[] {
    return lists[q].map((t) => t.id);
  }

  protected async drop(e: CdkDragDrop<Quadrant, Quadrant, Task>): Promise<void> {
    const from = e.previousContainer.data;
    const to = e.container.data;
    if (from === to && e.previousIndex === e.currentIndex) return;
    const before = this.lists();
    const after = this.lists();
    const [moved] = after[from].splice(e.previousIndex, 1);
    after[to].splice(e.currentIndex, 0, moved);
    await this.commit(before, after, [from, to], moved);
  }

  /** Alternative clavier au glisser-deposer : Alt+↑/↓ reordonne, Alt+1…4 deplace vers un quadrant. */
  protected async onCardKey(e: KeyboardEvent, task: Task, q: Quadrant, index: number): Promise<void> {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const before = this.lists();
    const after = this.lists();
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const target = index + (e.key === 'ArrowUp' ? -1 : 1);
      if (target < 0 || target >= after[q].length) return;
      e.preventDefault();
      [after[q][index], after[q][target]] = [after[q][target], after[q][index]];
      await this.commit(before, after, [q], task);
    } else if (/^[1-4]$/.test(e.key)) {
      const dest = QUADRANTS[Number(e.key) - 1];
      if (dest === q) return;
      e.preventDefault();
      after[q].splice(index, 1);
      after[dest].push(task);
      await this.commit(before, after, [q, dest], task);
    }
  }

  private async commit(before: Record<Quadrant, Task[]>, after: Record<Quadrant, Task[]>, touched: Quadrant[], moved: Task): Promise<void> {
    const apply = (lists: Record<Quadrant, Task[]>) =>
      this.view.update((v) => v.map((qv) => ({ ...qv, tasks: lists[qv.quadrant], count: lists[qv.quadrant].length })));
    apply(after);
    const unique = [...new Set(touched)];
    try {
      for (const q of unique) {
        if (after[q].length) await firstValueFrom(this.api.reorder(q, this.ids(after, q)));
      }
      const target = unique.find((q) => after[q].some((t) => t.id === moved.id)) ?? moved.quadrant;
      const crossed = before[target].every((t) => t.id !== moved.id);
      this.toast.info(crossed ? `« ${moved.title} » déplacée vers ${QUADRANT_META[target].label}.` : 'Ordre enregistré.', {
        label: 'Annuler',
        run: () => void this.undo(before, unique),
      });
      this.refresh.bump();
    } catch {
      apply(before);
      this.toast.error('Le déplacement n’a pas pu être enregistré.');
    }
  }

  private async undo(before: Record<Quadrant, Task[]>, touched: Quadrant[]): Promise<void> {
    try {
      for (const q of touched) {
        if (before[q].length) await firstValueFrom(this.api.reorder(q, this.ids(before, q)));
      }
      this.toast.success('Déplacement annulé.');
    } catch {
      this.toast.error('Impossible d’annuler le déplacement.');
    } finally {
      this.refresh.bump();
    }
  }

  protected async quickAdd(quadrant: Quadrant, input: HTMLInputElement): Promise<void> {
    const title = input.value.trim();
    if (!title) return;
    input.value = '';
    try {
      await firstValueFrom(this.api.create({ title, quadrant }));
      this.refresh.bump();
    } catch {
      input.value = title;
      this.toast.error('La tâche n’a pas pu être créée.');
    }
  }
}
