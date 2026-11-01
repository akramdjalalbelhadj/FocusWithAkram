import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { Task } from '../../../../core/api/models';
import { ProjectsApi, TasksApi } from '../../../../core/api/tasks.api';
import { RefreshService } from '../../../../core/services/refresh.service';
import { SettingsStore } from '../../../../core/services/settings.store';
import { ToastService } from '../../../../core/services/toast.service';
import { Loader } from '../../../../core/util/loader';
import {
  addDays,
  dayLabel,
  formatDay,
  formatTime,
  localToInstant,
  monthName,
  startOfDayInstant,
  startOfWeek,
  weekdayName,
} from '../../../../core/util/time';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { EmptyComponent, ErrorComponent } from '../../../../shared/ui/states/index';
import { TaskActions } from '../../../tasks/services/task-actions.service';

type View = 'month' | 'week' | 'day';

@Component({
  selector: 'ff-calendar-page',
  imports: [
    NgTemplateOutlet,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    IconComponent,
    EmptyComponent,
    ErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calendar.page.html',
})
export class CalendarPage {
  protected readonly actions = inject(TaskActions);
  private readonly api = inject(TasksApi);
  private readonly settings = inject(SettingsStore);
  private readonly toast = inject(ToastService);
  private readonly refresh = inject(RefreshService);

  protected readonly views: { id: View; label: string }[] = [
    { id: 'month', label: 'Mois' },
    { id: 'week', label: 'Semaine' },
    { id: 'day', label: 'Jour' },
  ];
  protected readonly view = signal<View>('month');
  protected readonly anchor = signal(this.settings.today());
  protected readonly selected = signal(this.settings.today());
  protected readonly projectId = signal('');
  protected readonly projects = toSignal(inject(ProjectsApi).list(), { initialValue: [] });
  protected readonly today = computed(() => this.settings.today());
  protected readonly dayLabel = dayLabel;

  /** Jours affichés selon la vue (42 cases en mois, 7 en semaine, 1 en jour). */
  protected readonly days = computed<string[]>(() => {
    const a = this.anchor();
    const ws = this.settings.settings().weekStartsOn;
    if (this.view() === 'day') return [a];
    if (this.view() === 'week')
      return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(a, ws), i));
    const start = startOfWeek(`${a.slice(0, 7)}-01`, ws);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  });

  protected readonly weekHeader = computed(() =>
    this.days()
      .slice(0, 7)
      .map((d) => weekdayName(d).slice(0, 3)),
  );

  protected readonly title = computed(() => {
    const a = this.anchor();
    if (this.view() === 'month') return `${monthName(Number(a.slice(5, 7)))} ${a.slice(0, 4)}`;
    if (this.view() === 'day') return dayLabel(a);
    const d = this.days();
    return `${dayLabel(d[0])} – ${dayLabel(d[6])}`;
  });

  protected readonly loader = new Loader(() => {
    const d = this.days();
    const tz = this.settings.timeZone();
    return this.api.list({
      dueFrom: startOfDayInstant(d[0], tz),
      dueTo: startOfDayInstant(addDays(d[d.length - 1], 1), tz),
      projectId: this.projectId(),
      size: 200,
      sort: 'plannedEndAt',
      dir: 'asc',
    });
  });

  protected readonly unplanned = new Loader(() =>
    this.api.list({
      unplanned: true,
      size: 30,
      projectId: this.projectId(),
      sort: 'createdAt',
      dir: 'desc',
    }),
  );

  protected readonly byDay = computed(() => {
    const map = new Map<string, Task[]>();
    for (const t of this.loader.data()?.items ?? []) {
      if (!t.plannedEndAt) continue;
      const day = formatDay(t.plannedEndAt, this.settings.timeZone());
      map.set(day, [...(map.get(day) ?? []), t]);
    }
    return map;
  });

  protected dayNum(day: string): number {
    return Number(day.slice(8));
  }

  protected inMonth(day: string): boolean {
    return day.slice(0, 7) === this.anchor().slice(0, 7);
  }

  protected time(iso: string | null): string {
    return formatTime(iso, this.settings.timeZone());
  }

  protected shift(dir: 1 | -1): void {
    const a = this.anchor();
    if (this.view() === 'month') {
      const d = new Date(Date.UTC(Number(a.slice(0, 4)), Number(a.slice(5, 7)) - 1 + dir, 1));
      const next = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
      this.anchor.set(next);
      this.selected.set(next);
    } else {
      const next = addDays(a, dir * (this.view() === 'week' ? 7 : 1));
      this.anchor.set(next);
      this.selected.set(next);
    }
  }

  /** Replanifie par glisser-deposer : conserve l'heure locale et decale le debut prevu du meme nombre de jours. */
  protected async drop(e: CdkDragDrop<string, string, Task>): Promise<void> {
    const task = e.item.data;
    const target = e.container.data;
    if (!task.plannedEndAt || e.previousContainer.data === target) return;
    const tz = this.settings.timeZone();
    const move = (iso: string | null): string | null => {
      if (!iso) return null;
      const local = this.settings.fmt(iso).slice(11);
      return localToInstant(`${target} ${local}`, tz);
    };
    const newEnd = move(task.plannedEndAt);
    const deltaDays = Math.round(
      (Date.parse(`${target}T00:00:00Z`) - Date.parse(`${e.previousContainer.data}T00:00:00Z`)) /
        86_400_000,
    );
    const newStart = task.plannedStartAt
      ? localToInstant(
          `${addDays(formatDay(task.plannedStartAt, tz), deltaDays)} ${this.settings.fmt(task.plannedStartAt).slice(11)}`,
          tz,
        )
      : null;
    try {
      await firstValueFrom(
        this.api.update(task.id, { plannedEndAt: newEnd, plannedStartAt: newStart }),
      );
      this.toast.success(`Échéance déplacée au ${dayLabel(target)}.`);
      this.refresh.bump();
    } catch {
      this.toast.error('Impossible de modifier l’échéance.');
    }
  }
}
