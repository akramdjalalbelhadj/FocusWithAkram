import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import {
  QUADRANTS,
  QUADRANT_META,
  Quadrant,
  QuadrantView,
  Task,
  TaskStatus,
} from '../../../../core/api/models';
import { ProjectsApi, TasksApi } from '../../../../core/api/tasks.api';
import { RefreshService } from '../../../../core/services/refresh.service';
import { ToastService } from '../../../../core/services/toast.service';
import { debounced } from '../../../../core/util/debounced';
import { Loader } from '../../../../core/util/loader';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { EmptyComponent, ErrorComponent } from '../../../../shared/ui/states/index';
import { TaskActions } from '../../../tasks/services/task-actions.service';
import { TaskCardComponent } from '../../../tasks/components/task-card/task-card';

@Component({
  selector: 'ff-matrix-page',
  imports: [
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    IconComponent,
    TaskCardComponent,
    EmptyComponent,
    ErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './matrix.page.html',
  styleUrl: './matrix.page.css',
})
export class MatrixPage {
  protected readonly actions = inject(TaskActions);
  private readonly api = inject(TasksApi);
  private readonly toast = inject(ToastService);
  private readonly refresh = inject(RefreshService);

  protected readonly meta = QUADRANT_META;
  protected readonly q = signal('');
  private readonly search = debounced(this.q);
  protected readonly projectId = signal('');
  protected readonly status = signal<TaskStatus | ''>('');
  protected readonly tag = signal('');
  protected readonly overdue = signal(false);
  protected readonly mobileQuadrant = signal<Quadrant>('Q1');

  protected readonly projects = toSignal(inject(ProjectsApi).list(), { initialValue: [] });
  protected readonly tags = toSignal(this.api.tags(), { initialValue: [] as string[] });

  protected readonly loader = new Loader(() =>
    this.api.matrix({
      q: this.search(),
      projectId: this.projectId(),
      status: this.status(),
      tag: this.tag(),
      overdue: this.overdue() || undefined,
    }),
  );

  /** Copie locale modifiable : permet de refleter un glisser-deposer immediatement (optimiste). */
  protected readonly view = linkedSignal<QuadrantView[]>(() => this.loader.data()?.quadrants ?? []);
  protected readonly filtersActive = computed(
    () => !!(this.q() || this.projectId() || this.status() || this.tag() || this.overdue()),
  );

  protected overdueOf(q: QuadrantView): number {
    return q.tasks.filter((t) => t.overdue).length;
  }

  protected hint(q: Quadrant): string {
    return this.filtersActive()
      ? 'Aucune tâche ne correspond aux filtres.'
      : {
          Q1: 'Rien d’urgent : bravo !',
          Q2: 'Planifiez ici vos projets importants.',
          Q3: 'Les interruptions à limiter.',
          Q4: 'Ce qui peut attendre ou disparaître.',
        }[q];
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
  protected async onCardKey(
    e: KeyboardEvent,
    task: Task,
    q: Quadrant,
    index: number,
  ): Promise<void> {
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

  private async commit(
    before: Record<Quadrant, Task[]>,
    after: Record<Quadrant, Task[]>,
    touched: Quadrant[],
    moved: Task,
  ): Promise<void> {
    const apply = (lists: Record<Quadrant, Task[]>) =>
      this.view.update((v) =>
        v.map((qv) => ({ ...qv, tasks: lists[qv.quadrant], count: lists[qv.quadrant].length })),
      );
    apply(after);
    const unique = [...new Set(touched)];
    try {
      for (const q of unique) {
        if (after[q].length) await firstValueFrom(this.api.reorder(q, this.ids(after, q)));
      }
      const target = unique.find((q) => after[q].some((t) => t.id === moved.id)) ?? moved.quadrant;
      const crossed = before[target].every((t) => t.id !== moved.id);
      this.toast.info(
        crossed
          ? `« ${moved.title} » déplacée vers ${QUADRANT_META[target].label}.`
          : 'Ordre enregistré.',
        {
          label: 'Annuler',
          run: () => void this.undo(before, unique),
        },
      );
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
