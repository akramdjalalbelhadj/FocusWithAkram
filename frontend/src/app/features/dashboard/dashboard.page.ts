import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DashboardApi } from '../../core/api/misc.api';
import { QUADRANTS, QUADRANT_META } from '../../core/api/models';
import { TasksApi } from '../../core/api/tasks.api';
import { PomodoroEngine } from '../../core/services/pomodoro.engine';
import { RefreshService } from '../../core/services/refresh.service';
import { SettingsStore } from '../../core/services/settings.store';
import { ToastService } from '../../core/services/toast.service';
import { Loader } from '../../core/util/loader';
import { dayLabel, formatDuration, weekdayName } from '../../core/util/time';
import { ChartComponent, chartTheme } from '../../shared/ui/chart';
import { IconComponent } from '../../shared/ui/icon';
import { RingComponent } from '../../shared/ui/progress-ring';
import { EmptyComponent, ErrorComponent } from '../../shared/ui/states';
import { TaskActions } from '../tasks/task-actions.service';
import { TaskCardComponent } from '../tasks/task-card';
import { Top3PickerDialogComponent } from './top3-picker.dialog';

@Component({
  selector: 'ff-dashboard-page',
  imports: [RouterLink, IconComponent, RingComponent, ChartComponent, TaskCardComponent, EmptyComponent, ErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>

        <h1 class="page-title"><span class="page-icon"><ff-icon name="dashboard" [size]="24" /></span>Tableau de bord</h1>

      </div>
      <button type="button" class="btn btn-primary" (click)="actions.create()"><ff-icon name="plus" />Nouvelle tâche</button>
    </header>

    <section class="card welcome mb-5 p-6"><p class="text-xs font-bold text-brand">TON ESPACE DE PRODUCTIVITÉ</p><h2 class="text-3xl font-extrabold">{{ greeting() }} Akram 👋</h2><p class="text-muted mt-2">Une nouvelle journée pour avancer sur ce qui compte vraiment.</p></section>
    @if (loader.error()) { <ff-error (retry)="loader.load()" /> }
    @else if (loader.loading()) {
      <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">@for (_ of [1, 2, 3, 4, 5, 6]; track _) { <div class="skeleton h-24"></div> }</div>
      <div class="skeleton h-72"></div>
    } @else {
      @let d = loader.data()!;

      <section aria-label="Indicateurs du jour" class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        @for (k of kpis(); track k.label) {
          <a [routerLink]="k.link" class="card p-4 hover:shadow-pop transition-shadow block">
            <div class="flex items-center gap-2 text-muted text-xs font-semibold"><ff-icon [name]="k.icon" [size]="15" />{{ k.label }}</div>
            <p class="text-2xl font-extrabold tabular-nums mt-1.5" [class]="k.tone ?? ''">{{ k.value }}</p>
            <p class="text-xs text-subtle truncate">{{ k.sub }}</p>
          </a>
        }
      </section>

      <div class="dashboard-layout grid gap-6">
        <div class="dashboard-column space-y-6 min-w-0">
          <!-- Top 3 -->
          <section class="card p-5" aria-labelledby="top3-h" class-placeholder="top">
            <div class="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 id="top3-h" class="font-bold text-lg flex items-center gap-2"><ff-icon name="target" class="text-brand" />Priorités du jour</h2>
                @if (d.top3.total) { <p class="text-sm text-muted">{{ d.top3.done }}/{{ d.top3.total }} accomplie{{ d.top3.done > 1 ? 's' : '' }}</p> }
              </div>
              <button type="button" class="btn btn-secondary btn-sm" (click)="pickTop3()"><ff-icon name="pencil" [size]="14" />Choisir mes 3</button>
            </div>
            @if (d.top3.total) {
              <div class="h-2 rounded-full bg-surface-3 overflow-hidden mb-4" role="progressbar" aria-label="Progression du Top 3" [attr.aria-valuenow]="d.top3.done" aria-valuemin="0" [attr.aria-valuemax]="d.top3.total">
                <div class="h-full bg-success transition-all" [style.width.%]="(d.top3.done / d.top3.total) * 100"></div>
              </div>
              <div class="space-y-2">
                @for (t of d.top3.tasks; track t.id) {
                  <div class="flex items-start gap-2">
                    <div class="flex-1 min-w-0"><ff-task-card [task]="t" [compact]="true" /></div>
                    @if (!t.archivedAt) { <button type="button" class="btn btn-primary btn-sm mt-2.5" (click)="actions.focusOn(t)" [attr.aria-label]="'Commencer à travailler sur ' + t.title"><ff-icon name="play" [size]="14" /><span class="hidden sm:inline">Commencer</span></button> }
                  </div>
                }
              </div>
            } @else {
              <ff-empty icon="target" title="Aucune priorité choisie" hint="Sélectionnez jusqu’à trois tâches qui rendront votre journée réussie.">
                <button type="button" class="btn btn-primary btn-sm mt-2" (click)="pickTop3()">Choisir mes priorités</button>
              </ff-empty>
            }
          </section>

          <!-- Activite de la semaine -->
          <section class="card p-5" aria-labelledby="week-h">
            <h2 id="week-h" class="font-bold text-lg mb-1">Activité des 7 derniers jours</h2>
            <p class="text-sm text-muted mb-2">Tâches terminées et temps de concentration</p>
            <ff-chart [option]="weekChart" [height]="240" label="Graphique : tâches terminées et minutes de concentration sur 7 jours" />
            <table class="sr-only-text"><caption>Activité des 7 derniers jours</caption>
              <thead><tr><th scope="col">Jour</th><th scope="col">Tâches terminées</th><th scope="col">Concentration</th></tr></thead>
              <tbody>@for (w of d.week; track w.date) { <tr><th scope="row">{{ w.date }}</th><td>{{ w.tasksCompleted }}</td><td>{{ fmt(w.focusSeconds) }}</td></tr> }</tbody>
            </table>
          </section>
        </div>

        <aside class="dashboard-column space-y-6 min-w-0">
          <!-- Pomodoro -->
          <section class="card p-5 text-center" aria-labelledby="pomo-h">
            <h2 id="pomo-h" class="section-title mb-3">Pomodoro</h2>
            <ff-ring [value]="engine.session() ? engine.progress() : 0" [size]="150" [stroke]="11" [label]="'Progression du minuteur'">
              <div><div class="text-3xl font-extrabold tabular-nums">{{ engine.session() ? engine.clock() : idle() }}</div>
              <div class="text-xs text-muted">{{ engine.session() ? (engine.isPaused() ? 'En pause' : 'En cours') : 'Prêt' }}</div></div>
            </ff-ring>
            @if (engine.session()?.taskTitle; as title) { <p class="text-sm text-muted mt-3 truncate">{{ title }}</p> }
            <div class="flex justify-center gap-2 mt-4">
              @if (!engine.session()) { <button type="button" class="btn btn-primary" (click)="engine.start('WORK', engine.lastTaskId())"><ff-icon name="play" />Démarrer</button> }
              @else {
                <button type="button" class="btn btn-primary" (click)="engine.toggle()"><ff-icon [name]="engine.isRunning() ? 'pause' : 'play'" />{{ engine.isRunning() ? 'Pause' : 'Reprendre' }}</button>
              }
              <a routerLink="/focus" class="btn btn-secondary">Mode Focus</a>
            </div>
            <p class="text-sm text-muted mt-4">Objectif : <strong class="text-fg tabular-nums">{{ fmt(d.kpis.focusSecondsToday) }}</strong> / {{ fmt(d.kpis.dailyGoalMinutes * 60) }}</p>
            <div class="h-1.5 rounded-full bg-surface-3 overflow-hidden mt-2"><div class="h-full bg-success transition-all" [style.width.%]="d.kpis.dailyGoalProgress * 100"></div></div>
          </section>

          <!-- Mini matrice -->
          <section class="card p-5" aria-labelledby="mini-h">
            <div class="flex items-center justify-between mb-3">
              <h2 id="mini-h" class="section-title">Matrice</h2>
              <a routerLink="/matrix" class="text-sm font-semibold text-brand hover:underline">Ouvrir</a>
            </div>
            <div class="grid grid-cols-2 gap-2">
              @for (q of quadrants; track q) {
                <a routerLink="/matrix" class="rounded-xl p-3 block" [style.background]="'var(--' + q.toLowerCase() + '-soft)'" [style.color]="'var(--' + q.toLowerCase() + ')'" [attr.aria-label]="meta[q].label + ' : ' + countOf(q) + ' tâches'">
                  <span class="text-2xl font-extrabold tabular-nums">{{ countOf(q) }}</span>
                  <span class="block text-xs font-bold uppercase tracking-wide leading-tight">{{ meta[q].label }}</span>
                  @if (overdueOf(q)) { <span class="text-xs font-semibold">{{ overdueOf(q) }} en retard</span> }
                </a>
              }
            </div>
          </section>

          <section class="rounded-2xl bg-brand-soft text-brand p-5 flex gap-3" aria-label="Message du jour">
            <ff-icon name="sparkles" class="mt-0.5" />
            <p class="text-sm font-medium">{{ motivation() }}</p>
          </section>
        </aside>
      </div>
    }
  `,
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

  protected readonly today = computed(() => dayLabel(this.loader.data()?.today ?? this.settings.today()));

  protected readonly greeting = computed(() => {
    const h = Number(new Intl.DateTimeFormat('fr-FR', { hour: 'numeric', hourCycle: 'h23', timeZone: this.settings.timeZone() }).formatToParts(new Date()).find(p => p.type === 'hour')?.value);
    return h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  });

  protected readonly summaryLine = computed(() => {
    const k = this.loader.data()?.kpis;
    if (!k) return '';
    return `${k.remainingTasks} tâche${k.remainingTasks > 1 ? 's' : ''} à faire · ${k.completedToday} terminée${k.completedToday > 1 ? 's' : ''} aujourd’hui · ${formatDuration(k.focusSecondsToday)} de concentration`;
  });

  protected readonly idle = computed(() => `${String(this.settings.settings().workMinutes).padStart(2, '0')}:00`);

  protected readonly kpis = computed(() => {
    const k = this.loader.data()!.kpis;
    return [
      { label: 'Restantes', value: String(k.remainingTasks), sub: 'tâches actives', icon: 'list-todo', link: '/tasks' },
      { label: 'Terminées', value: String(k.completedToday), sub: `${k.completedThisWeek} cette semaine`, icon: 'circle-check', link: '/archives', tone: 'text-success' },
      { label: 'Concentration', value: formatDuration(k.focusSecondsToday), sub: "aujourd'hui", icon: 'timer', link: '/focus' },
      { label: 'Pomodoros', value: String(k.pomodorosToday), sub: 'sessions terminées', icon: 'target', link: '/focus' },
      { label: 'En retard', value: String(k.overdueTasks), sub: k.overdueTasks ? 'à replanifier' : 'aucune', icon: 'alert', link: '/tasks', tone: k.overdueTasks ? 'text-danger' : '' },
      { label: 'Objectif', value: `${Math.round(k.dailyGoalProgress * 100)}%`, sub: `sur ${formatDuration(k.dailyGoalMinutes * 60)}`, icon: 'zap', link: '/focus' },
    ];
  });

  protected readonly motivation = computed(() => {
    const k = this.loader.data()?.kpis;
    if (!k) return '';
    if (k.dailyGoalProgress >= 1) return 'Objectif de concentration atteint : excellente journée. Pensez à vous reposer.';
    if (k.completedToday >= 3) return `${k.completedToday} tâches terminées aujourd’hui — belle régularité.`;
    if (k.focusSecondsToday > 0) return 'Vous avancez à votre rythme. Une session de plus et la journée sera bien remplie.';
    if (k.overdueTasks > 0) return 'Quelques tâches ont dépassé leur échéance : replanifiez-en une seule, la plus simple.';
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
      tooltip: { trigger: 'axis', backgroundColor: c.surface, borderColor: c.line, textStyle: { color: c.fg } },
      legend: { bottom: 0, textStyle: { color: c.muted }, data: ['Tâches terminées', 'Concentration (min)'] },
      xAxis: { type: 'category', data: w.map((x) => weekdayName(x.date).slice(0, 3)), axisLine: { lineStyle: { color: c.line } }, axisLabel: { color: c.muted } },
      yAxis: [
        { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: c.line } }, axisLabel: { color: c.muted } },
        { type: 'value', splitLine: { show: false }, axisLabel: { color: c.muted } },
      ],
      series: [
        { name: 'Tâches terminées', type: 'bar', data: w.map((x) => x.tasksCompleted), itemStyle: { color: c.brand, borderRadius: [6, 6, 0, 0] }, barMaxWidth: 28 },
        { name: 'Concentration (min)', type: 'line', yAxisIndex: 1, smooth: true, data: w.map((x) => Math.round(x.focusSeconds / 60)), itemStyle: { color: c.success }, lineStyle: { width: 3 } },
      ],
    };
  };

  protected async pickTop3(): Promise<void> {
    const [tasks, current] = await Promise.all([firstValueFrom(this.tasksApi.priorities('ALL')), firstValueFrom(this.tasksApi.top3())]);
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
