import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { PriorityMode, Task } from '../../../../core/api/models';
import { ProjectsApi, TasksApi } from '../../../../core/api/tasks.api';
import { RefreshService } from '../../../../core/services/refresh.service';
import { SettingsStore } from '../../../../core/services/settings.store';
import { ToastService } from '../../../../core/services/toast.service';
import { Loader } from '../../../../core/util/loader';
import { QuadrantBadgeComponent } from '../../../../shared/ui/badges/index';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import {
  EmptyComponent,
  ErrorComponent,
  SkeletonComponent,
} from '../../../../shared/ui/states/index';
import { TaskActions } from '../../services/task-actions.service';
import { TaskCardComponent } from '../../components/task-card/task-card';

type SortKey = 'priority' | 'due' | 'title' | 'created';

const MODES: { mode: PriorityMode; label: string; icon: string; empty: string }[] = [
  {
    mode: 'PRIORITIES',
    label: 'Priorités',
    icon: 'flag',
    empty: 'Aucune tâche active. Profitez-en ou créez-en une !',
  },
  {
    mode: 'TODAY',
    label: "Aujourd'hui",
    icon: 'calendar-check',
    empty: "Rien de prévu aujourd'hui.",
  },
  {
    mode: 'WEEK',
    label: 'Cette semaine',
    icon: 'calendar-days',
    empty: 'Aucune échéance cette semaine.',
  },
  { mode: 'ALL', label: 'Toutes', icon: 'layers', empty: 'Aucune tâche active.' },
  { mode: 'OVERDUE', label: 'En retard', icon: 'alert', empty: 'Aucune tâche en retard. 🎉' },
  {
    mode: 'DONE',
    label: 'Terminées',
    icon: 'circle-check',
    empty: 'Aucune tâche terminée pour le moment.',
  },
];

@Component({
  selector: 'ff-tasks-page',
  imports: [
    IconComponent,
    TaskCardComponent,
    QuadrantBadgeComponent,
    EmptyComponent,
    ErrorComponent,
    SkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tasks.page.html',
})
export class TasksPage {
  protected readonly actions = inject(TaskActions);
  protected readonly settings = inject(SettingsStore);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(
    () => this.sorted().find((t) => t.id === this.selectedId()) ?? this.sorted()[0] ?? null,
  );
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
      await firstValueFrom(
        this.api.create({ title, quadrant: 'Q2', projectId: this.projectId() || null }),
      );
      this.refresh.bump();
    } catch {
      input.value = title;
      this.toast.error('La tâche n’a pas pu être créée.');
    }
  }
}
