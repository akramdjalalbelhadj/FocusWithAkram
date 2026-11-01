import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Task, TaskExecution, TimelineEvent, TimelineEventType } from '../../../../core/api/models';
import { TasksApi } from '../../../../core/api/tasks.api';
import { AppError } from '../../../../core/api/app-error';
import { RefreshService } from '../../../../core/services/refresh.service';
import { SettingsStore } from '../../../../core/services/settings.store';
import { formatDuration } from '../../../../core/util/time';
import { QuadrantBadgeComponent, StatusBadgeComponent } from '../../../../shared/ui/badges/index';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { ErrorComponent, SkeletonComponent } from '../../../../shared/ui/states/index';
import { TaskActions } from '../../services/task-actions.service';

const EVENT_LABEL: Record<TimelineEventType, string> = {
  CREATED: 'Création',
  PLANNED_START: 'Début prévu',
  ACTUAL_START: 'Début réel',
  PLANNED_END: 'Fin prévue',
  ACTUAL_END: 'Fin réelle',
  ARCHIVED: 'Archivage',
};

@Component({
  selector: 'ff-task-detail-panel',
  imports: [
    IconComponent,
    StatusBadgeComponent,
    QuadrantBadgeComponent,
    SkeletonComponent,
    ErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-detail.panel.html',
})
export class TaskDetailPanelComponent {
  private readonly api = inject(TasksApi);
  private readonly refresh = inject(RefreshService);
  protected readonly data = inject<{ id: string }>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<void>>(DialogRef);
  protected readonly actions = inject(TaskActions);
  protected readonly settings = inject(SettingsStore);

  protected readonly task = signal<Task | null>(null);
  protected readonly timeline = signal<TimelineEvent[]>([]);
  protected readonly executions = signal<TaskExecution[]>([]);
  protected readonly error = signal('');

  constructor() {
    // Se recharge apres chaque action (demarrage, fin, sous-tache...) pour rester coherent.
    effect(() => {
      this.refresh.tick();
      void this.load();
    });
  }

  protected async load(): Promise<void> {
    try {
      const [task, timeline, executions] = await Promise.all([
        firstValueFrom(this.api.get(this.data.id)),
        firstValueFrom(this.api.timeline(this.data.id)),
        firstValueFrom(this.api.executions(this.data.id)),
      ]);
      this.task.set(task);
      this.timeline.set(timeline);
      this.executions.set(executions);
      this.error.set('');
    } catch (e) {
      if (e instanceof AppError && e.problem.status === 404) this.ref.close();
      else this.error.set('Impossible de charger la tâche.');
    }
  }

  protected readonly rows = computed<[string, string, string?][]>(() => {
    const t = this.task();
    if (!t) return [];
    const tm = t.timing;
    const f = (i: string | null) => this.settings.fmt(i) || '—';
    const variance = (s: number | null) => (s === null ? '—' : formatDuration(s, { signed: true }));
    const tone = (s: number | null) =>
      s === null || s === 0 ? undefined : s > 0 ? 'text-danger' : 'text-success';
    return [
      ['Création', f(t.createdAt)],
      ['Début prévu', f(t.plannedStartAt)],
      ['Fin prévue', f(t.plannedEndAt)],
      ['Début réel', f(t.actualStartAt)],
      ['Fin réelle', f(t.actualEndAt)],
      ['Archivage', f(t.archivedAt)],
      ['Durée prévue', formatDuration(tm.plannedDurationSeconds)],
      ['Durée réelle écoulée', formatDuration(tm.actualElapsedSeconds)],
      ['Temps actif (Pomodoro)', formatDuration(tm.activeSeconds)],
      ['Écart de début', variance(tm.startVarianceSeconds), tone(tm.startVarianceSeconds)],
      ['Écart de fin', variance(tm.endVarianceSeconds), tone(tm.endVarianceSeconds)],
      ['Écart de durée', variance(tm.durationVarianceSeconds), tone(tm.durationVarianceSeconds)],
    ];
  });

  protected label(t: TimelineEventType): string {
    return EVENT_LABEL[t];
  }

  protected dur(s: number): string {
    return formatDuration(s);
  }

  protected fmtMin(m: number): string {
    return formatDuration(m * 60);
  }

  protected async toggleSub(id: string, done: boolean): Promise<void> {
    const t = this.task();
    if (t) await this.actions.toggleSubtask(t, id, done);
  }

  protected async addSub(input: HTMLInputElement): Promise<void> {
    const title = input.value.trim();
    const t = this.task();
    if (!title || !t) return;
    await firstValueFrom(this.api.addSubtask(t.id, title));
    input.value = '';
    this.refresh.bump();
  }

  protected async deleteSub(id: string): Promise<void> {
    const t = this.task();
    if (!t) return;
    await firstValueFrom(this.api.deleteSubtask(t.id, id));
    this.refresh.bump();
  }

  protected async remove(t: Task): Promise<void> {
    if (await this.actions.remove(t)) this.ref.close();
  }
}
