import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DashboardApi } from '../../../../core/api/misc.api';
import { QUADRANTS, QUADRANT_META } from '../../../../core/api/models';
import { TasksApi } from '../../../../core/api/tasks.api';
import { PomodoroEngine } from '../../../../core/services/pomodoro.engine';
import { RefreshService } from '../../../../core/services/refresh.service';
import { SettingsStore } from '../../../../core/services/settings.store';
import { ToastService } from '../../../../core/services/toast.service';
import { Loader } from '../../../../core/util/loader';
import { dayLabel, formatDuration, weekdayName } from '../../../../core/util/time';
import { ChartComponent, chartTheme } from '../../../../shared/ui/chart/chart';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { RingComponent } from '../../../../shared/ui/progress-ring/progress-ring';
import { EmptyComponent, ErrorComponent } from '../../../../shared/ui/states/index';
import { TaskActions } from '../../../tasks/services/task-actions.service';
import { TaskCardComponent } from '../../../tasks/components/task-card/task-card';
import { Top3PickerDialogComponent } from '../../components/top3-picker/top3-picker.dialog';

@Component({
  selector: 'ff-dashboard-page',
  imports: [
    RouterLink,
    IconComponent,
    RingComponent,
    ChartComponent,
    TaskCardComponent,
    EmptyComponent,
    ErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.page.html',
})
export class DashboardPage {
  protected readonly actions = inject(TaskActions);
  protected readonly engine = inject(PomodoroEngine);
  private readonly settings = inject(SettingsStore);
  private readonly dialog = inject(Dialog);
  private readonly tasksApi = inject(TasksApi);
  private readonly refresh = inject(RefreshService);
  private readonly toast = inject(ToastService);

  private readonly dashboardApi = inject(DashboardApi);
  protected readonly loader = new Loader(() => this.dashboardApi.summary());
  protected readonly quadrants = QUADRANTS;
  protected readonly meta = QUADRANT_META;
  protected readonly fmt = formatDuration;

  protected readonly today = computed(() =>
    dayLabel(this.loader.data()?.today ?? this.settings.today()),
  );

  protected readonly greeting = computed(() => {
    const h = Number(
      new Intl.DateTimeFormat('fr-FR', {
        hour: 'numeric',
        hourCycle: 'h23',
        timeZone: this.settings.timeZone(),
      })
        .formatToParts(new Date())
        .find((p) => p.type === 'hour')?.value,
    );
    return h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  });

  protected readonly summaryLine = computed(() => {
    const k = this.loader.data()?.kpis;
    if (!k) return '';
    return `${k.remainingTasks} tâche${k.remainingTasks > 1 ? 's' : ''} à faire · ${k.completedToday} terminée${k.completedToday > 1 ? 's' : ''} aujourd’hui · ${formatDuration(k.focusSecondsToday)} de concentration`;
  });

  protected readonly idle = computed(
    () => `${String(this.settings.settings().workMinutes).padStart(2, '0')}:00`,
  );

  protected readonly kpis = computed(() => {
    const k = this.loader.data()!.kpis;
    return [
      {
        label: 'Restantes',
        value: String(k.remainingTasks),
        sub: 'tâches actives',
        icon: 'list-todo',
        link: '/tasks',
      },
      {
        label: 'Terminées',
        value: String(k.completedToday),
        sub: `${k.completedThisWeek} cette semaine`,
        icon: 'circle-check',
        link: '/archives',
        tone: 'text-success',
      },
      {
        label: 'Concentration',
        value: formatDuration(k.focusSecondsToday),
        sub: "aujourd'hui",
        icon: 'timer',
        link: '/focus',
      },
      {
        label: 'Pomodoros',
        value: String(k.pomodorosToday),
        sub: 'sessions terminées',
        icon: 'target',
        link: '/focus',
      },
      {
        label: 'En retard',
        value: String(k.overdueTasks),
        sub: k.overdueTasks ? 'à replanifier' : 'aucune',
        icon: 'alert',
        link: '/tasks',
        tone: k.overdueTasks ? 'text-danger' : '',
      },
      {
        label: 'Objectif',
        value: `${Math.round(k.dailyGoalProgress * 100)}%`,
        sub: `sur ${formatDuration(k.dailyGoalMinutes * 60)}`,
        icon: 'zap',
        link: '/focus',
      },
    ];
  });

  protected readonly motivation = computed(() => {
    const k = this.loader.data()?.kpis;
    if (!k) return '';
    if (k.dailyGoalProgress >= 1)
      return 'Objectif de concentration atteint : excellente journée. Pensez à vous reposer.';
    if (k.completedToday >= 3)
      return `${k.completedToday} tâches terminées aujourd’hui — belle régularité.`;
    if (k.focusSecondsToday > 0)
      return 'Vous avancez à votre rythme. Une session de plus et la journée sera bien remplie.';
    if (k.overdueTasks > 0)
      return 'Quelques tâches ont dépassé leur échéance : replanifiez-en une seule, la plus simple.';
    return 'Choisissez une seule tâche et lancez un Pomodoro : le plus dur est de commencer.';
  });

  protected countOf(q: string): number {
    return this.loader.data()!.matrix.find((m) => m.quadrant === q)?.count ?? 0;
  }

  protected overdueOf(q: string): number {
    return this.loader.data()!.matrix.find((m) => m.quadrant === q)?.overdue ?? 0;
  }

  protected readonly weekChart = () => {
    const w = this.loader.data()?.week ?? [];
    const c = chartTheme();
    return {
      aria: { enabled: true },
      grid: { left: 36, right: 36, top: 24, bottom: 60 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: c.surface,
        borderColor: c.line,
        textStyle: { color: c.fg },
      },
      legend: {
        bottom: 0,
        textStyle: { color: c.muted },
        data: ['Tâches terminées', 'Concentration (min)'],
      },
      xAxis: {
        type: 'category',
        data: w.map((x) => weekdayName(x.date).slice(0, 3)),
        axisLine: { lineStyle: { color: c.line } },
        axisLabel: { color: c.muted },
      },
      yAxis: [
        {
          type: 'value',
          minInterval: 1,
          splitLine: { lineStyle: { color: c.line } },
          axisLabel: { color: c.muted },
        },
        { type: 'value', splitLine: { show: false }, axisLabel: { color: c.muted } },
      ],
      series: [
        {
          name: 'Tâches terminées',
          type: 'bar',
          data: w.map((x) => x.tasksCompleted),
          itemStyle: { color: c.brand, borderRadius: [6, 6, 0, 0] },
          barMaxWidth: 28,
        },
        {
          name: 'Concentration (min)',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: w.map((x) => Math.round(x.focusSeconds / 60)),
          itemStyle: { color: c.success },
          lineStyle: { width: 3 },
        },
      ],
    };
  };

  protected async pickTop3(): Promise<void> {
    const [tasks, current] = await Promise.all([
      firstValueFrom(this.tasksApi.priorities('ALL')),
      firstValueFrom(this.tasksApi.top3()),
    ]);
    const ids = await firstValueFrom(
      this.dialog.open<string[]>(Top3PickerDialogComponent, {
        data: { tasks, selected: current.tasks.filter((t) => !t.archivedAt).map((t) => t.id) },
        backdropClass: 'ff-backdrop',
      }).closed,
    );
    if (!ids) return;
    try {
      await firstValueFrom(this.tasksApi.setTop3(ids));
      this.toast.success('Priorités du jour enregistrées.');
      this.refresh.bump();
    } catch {
      this.toast.error('Impossible d’enregistrer les priorités.');
    }
  }
}
