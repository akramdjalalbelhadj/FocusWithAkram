import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DashboardApi } from '../../core/api/misc.api';
import { QUADRANT_META, QUADRANTS, STATUS_LABEL, TaskStatus } from '../../core/api/models';
import { SettingsStore } from '../../core/services/settings.store';
import { Loader } from '../../core/util/loader';
import { addDays, formatDuration, longDate } from '../../core/util/time';
import { ChartComponent, chartTheme } from '../../shared/ui/chart';
import { IconComponent } from '../../shared/ui/icon';
import { EmptyComponent, ErrorComponent } from '../../shared/ui/states';

type Preset = 'today' | '7' | '30' | 'custom';

@Component({
  selector: 'ff-statistics-page',
  imports: [ChartComponent, IconComponent, ErrorComponent, EmptyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 class="page-title">Statistiques</h1>
        <p class="page-sub">Calculées à partir de vos tâches et sessions réellement enregistrées (fuseau {{ settings.timeZone() }}).</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="flex gap-1 p-1 rounded-xl bg-surface-2" role="group" aria-label="Période">
          @for (p of presets; track p.id) {
            <button type="button" class="px-3 py-1.5 rounded-lg text-sm font-semibold" [class]="preset() === p.id ? 'bg-surface shadow-card text-brand' : 'text-muted'" [attr.aria-pressed]="preset() === p.id" (click)="preset.set(p.id)">{{ p.label }}</button>
          }
        </div>
        @if (preset() === 'custom') {
          <input class="input !w-auto" type="date" aria-label="Du" [value]="customFrom()" (change)="customFrom.set($any($event.target).value)" />
          <input class="input !w-auto" type="date" aria-label="Au" [value]="customTo()" (change)="customTo.set($any($event.target).value)" />
        }
      </div>
    </header>

    @if (loader.error()) { <ff-error (retry)="loader.load()" /> }
    @else if (loader.loading()) { <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-3"> @for (_ of [1, 2, 3, 4]; track _) { <div class="skeleton h-24"></div> } </div> }
    @else {
      @let d = loader.data()!;

      <section class="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6" aria-label="Chiffres clés">
        @for (k of cards(); track k.label) {
          <div class="card p-4"><p class="text-xs font-semibold text-muted flex items-center gap-1.5"><ff-icon [name]="k.icon" [size]="14" />{{ k.label }}</p>
            <p class="text-2xl font-extrabold tabular-nums mt-1">{{ k.value }}</p><p class="text-xs text-subtle">{{ k.sub }}</p></div>
        }
      </section>

      <div class="grid xl:grid-cols-2 gap-6">
        <section class="card p-5" aria-labelledby="c1"><h2 id="c1" class="font-bold mb-1">Évolution quotidienne</h2>
          <p class="text-sm text-muted">Tâches terminées et minutes de concentration par jour.</p>
          <ff-chart [option]="dailyChart" [height]="280" label="Courbe : tâches terminées et minutes de concentration par jour" />
          <details class="mt-2 text-sm"><summary class="cursor-pointer text-brand font-semibold">Afficher les données</summary>
            <div class="max-h-56 overflow-auto mt-2"><table class="w-full"><thead><tr class="text-left text-muted"><th scope="col">Jour</th><th scope="col">Terminées</th><th scope="col">Concentration</th><th scope="col">Pomodoros</th></tr></thead>
              <tbody>@for (x of d.daily; track x.date) { <tr class="border-t border-line"><th scope="row" class="font-normal">{{ x.date }}</th><td>{{ x.tasksCompleted }}</td><td>{{ fmt(x.focusSeconds) }}</td><td>{{ x.pomodoros }}</td></tr> }</tbody></table></div></details>
        </section>

        <section class="card p-5" aria-labelledby="c2"><h2 id="c2" class="font-bold mb-1">Durée prévue vs durée réelle</h2>
          <p class="text-sm text-muted">Dernières tâches terminées ayant des dates prévues.</p>
          @if (d.planning.comparisons.length) {
            <ff-chart [option]="compareChart" [height]="280" label="Barres : durée prévue et durée réelle écoulée par tâche terminée" />
            <details class="mt-2 text-sm"><summary class="cursor-pointer text-brand font-semibold">Afficher les données</summary>
              <table class="w-full mt-2"><thead><tr class="text-left text-muted"><th scope="col">Tâche</th><th scope="col">Prévu</th><th scope="col">Réel</th></tr></thead>
                <tbody>@for (c of d.planning.comparisons; track c.taskId + c.completedAt) { <tr class="border-t border-line"><th scope="row" class="font-normal">{{ c.title }}</th><td>{{ fmt(c.plannedSeconds) }}</td><td>{{ fmt(c.elapsedSeconds) }}</td></tr> }</tbody></table></details>
          } @else { <ff-empty icon="chart" title="Pas encore de comparaison" hint="Terminez des tâches planifiées (début et fin prévus) pour comparer prévu et réel." /> }
        </section>

        <section class="card p-5" aria-labelledby="c3"><h2 id="c3" class="font-bold mb-1">Répartition des tâches</h2>
          <div class="grid sm:grid-cols-2 gap-2">
            <div><p class="text-xs font-semibold text-muted text-center">Actives par quadrant</p>
              <ff-chart [option]="quadrantChart" [height]="220" label="Anneau : tâches actives par quadrant" /></div>
            <div><p class="text-xs font-semibold text-muted text-center">Par statut</p>
              <ff-chart [option]="statusChart" [height]="220" label="Anneau : tâches par statut" /></div>
          </div>
          <p class="sr-only-text">Quadrants : {{ quadrantText() }}. Statuts : {{ statusText() }}.</p>
          <ul class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted justify-center">
            @for (q of quadrants; track q) { <li>{{ q }} : <strong class="text-fg">{{ d.tasks.activeByQuadrant[q] }}</strong></li> }
          </ul>
        </section>

        <section class="card p-5" aria-labelledby="c4"><h2 id="c4" class="font-bold mb-1">Temps par projet</h2>
          @if (d.focus.byProject.length) {
            <ff-chart [option]="projectChart" [height]="240" label="Anneau : temps de concentration par projet" />
            <ul class="text-sm mt-2 space-y-1">@for (p of d.focus.byProject; track p.projectId) { <li class="flex justify-between"><span class="flex items-center gap-2"><span class="size-2.5 rounded-sm" [style.background]="p.color"></span>{{ p.name }}</span><span class="tabular-nums font-semibold">{{ fmt(p.focusSeconds) }}</span></li> }</ul>
          } @else { <ff-empty icon="folder" title="Aucun temps par projet" hint="Lancez des Pomodoros sur des tâches rattachées à un projet." /> }
          @if (d.focus.byTask.length) {
            <h3 class="section-title mt-5 mb-2">Temps par tâche</h3>
            <ul class="text-sm space-y-1">@for (t of d.focus.byTask; track t.taskId) { <li class="flex justify-between gap-3"><span class="truncate">{{ t.title }}</span><span class="tabular-nums font-semibold">{{ fmt(t.focusSeconds) }}</span></li> }</ul>
          }
        </section>

        <section class="card p-5 xl:col-span-2" aria-labelledby="c5"><h2 id="c5" class="font-bold mb-1">Activité des 12 derniers mois</h2>
          <p class="text-sm text-muted">Minutes de concentration par jour.</p>
          @if (heat.data(); as h) {
            <ff-chart [option]="heatChart" [height]="190" label="Carte de chaleur : minutes de concentration par jour sur 12 mois" />
            <p class="sr-only-text">{{ heatText() }}</p>
          }
        </section>

        <section class="card p-5 xl:col-span-2" aria-labelledby="c6"><h2 id="c6" class="font-bold mb-3">Respect du planning</h2>
          <div class="grid sm:grid-cols-4 gap-3 text-center">
            <div class="rounded-xl bg-success-soft text-success p-3"><p class="text-2xl font-extrabold">{{ d.planning.early }}</p><p class="text-xs font-semibold">En avance</p></div>
            <div class="rounded-xl bg-info-soft text-info p-3"><p class="text-2xl font-extrabold">{{ d.planning.onTime }}</p><p class="text-xs font-semibold">À l'heure (±5 min)</p></div>
            <div class="rounded-xl bg-danger-soft text-danger p-3"><p class="text-2xl font-extrabold">{{ d.planning.late }}</p><p class="text-xs font-semibold">En retard</p></div>
            <div class="rounded-xl bg-surface-2 p-3"><p class="text-2xl font-extrabold tabular-nums">{{ d.planning.averageEndVarianceSeconds === null ? '—' : fmtSigned(d.planning.averageEndVarianceSeconds) }}</p><p class="text-xs font-semibold text-muted">Écart moyen fin prévue / réelle</p></div>
          </div>
          <dl class="grid sm:grid-cols-3 gap-3 mt-4 text-sm">
            <div><dt class="text-muted">Durée prévue totale</dt><dd class="font-bold tabular-nums">{{ fmt(d.planning.totalPlannedSeconds) }}</dd></div>
            <div><dt class="text-muted">Durée réelle écoulée totale</dt><dd class="font-bold tabular-nums">{{ fmt(d.planning.totalElapsedSeconds) }}</dd></div>
            <div><dt class="text-muted">Temps de concentration actif</dt><dd class="font-bold tabular-nums">{{ fmt(d.planning.totalActiveSeconds) }}</dd></div>
          </dl>
        </section>
      </div>
    }
  `,
})
export class StatisticsPage {
  protected readonly settings = inject(SettingsStore);
  private readonly api = inject(DashboardApi);

  protected readonly presets: { id: Preset; label: string }[] = [
    { id: 'today', label: "Aujourd'hui" }, { id: '7', label: '7 jours' }, { id: '30', label: '30 jours' }, { id: 'custom', label: 'Personnalisée' },
  ];
  protected readonly preset = signal<Preset>('30');
  protected readonly customFrom = signal(addDays(this.settings.today(), -29));
  protected readonly customTo = signal(this.settings.today());
  protected readonly quadrants = QUADRANTS;
  protected readonly fmt = (s: number) => formatDuration(s);
  protected readonly fmtSigned = (s: number) => formatDuration(s, { signed: true });

  private readonly range = computed(() => {
    const today = this.settings.today();
    switch (this.preset()) {
      case 'today': return { from: today, to: today };
      case '7': return { from: addDays(today, -6), to: today };
      case '30': return { from: addDays(today, -29), to: today };
      default: return { from: this.customFrom() || today, to: this.customTo() || today };
    }
  });

  protected readonly loader = new Loader(() => this.api.productivity(this.range().from, this.range().to));
  protected readonly heat = new Loader(() => this.api.productivity(addDays(this.settings.today(), -364), this.settings.today()));

  protected readonly cards = computed(() => {
    const d = this.loader.data()!;
    return [
      { label: 'Tâches créées', value: String(d.tasks.created), sub: `${Math.round(d.tasks.completionRate * 100)} % terminées`, icon: 'plus' },
      { label: 'Tâches terminées', value: String(d.tasks.completed), sub: `${d.planning.completedThisWeek} cette semaine`, icon: 'circle-check' },
      { label: 'En retard (actuel)', value: String(d.tasks.overdueNow), sub: 'tâches actives', icon: 'alert' },
      { label: 'Temps de concentration', value: formatDuration(d.focus.totalSeconds), sub: `${d.focus.completedSessions} sessions · moy. ${formatDuration(d.focus.averageSessionSeconds)}`, icon: 'timer' },
      { label: 'Sessions interrompues', value: String(d.focus.interruptedSessions), sub: 'temps conservé', icon: 'pause' },
      { label: 'Objectifs atteints', value: String(d.focus.daysGoalReached), sub: `jours ≥ ${d.focus.dailyGoalMinutes} min`, icon: 'target' },
      { label: 'Durée prévue', value: formatDuration(d.planning.totalPlannedSeconds), sub: 'tâches terminées', icon: 'hourglass' },
      { label: 'Durée réelle', value: formatDuration(d.planning.totalElapsedSeconds), sub: 'écoulée (≠ temps actif)', icon: 'clock' },
    ];
  });

  protected readonly quadrantText = computed(() => QUADRANTS.map((q) => `${q} ${this.loader.data()!.tasks.activeByQuadrant[q]}`).join(', '));
  protected readonly statusText = computed(() => (['TODO', 'IN_PROGRESS', 'DONE'] as TaskStatus[]).map((s) => `${STATUS_LABEL[s]} ${this.loader.data()!.tasks.byStatus[s]}`).join(', '));
  protected readonly heatText = computed(() => {
    const days = (this.heat.data()?.daily ?? []).filter((x) => x.focusSeconds > 0);
    return `${days.length} jours actifs sur 12 mois. Dernier : ${days.length ? longDate(days[days.length - 1].date) : 'aucun'}.`;
  });

  private axis() {
    const c = chartTheme();
    return { c, base: { aria: { enabled: true }, textStyle: { color: c.fg }, tooltip: { backgroundColor: c.surface, borderColor: c.line, textStyle: { color: c.fg } } } };
  }

  protected readonly dailyChart = () => {
    const { c, base } = this.axis();
    const daily = this.loader.data()?.daily ?? [];
    return {
      ...base,
      tooltip: { ...base.tooltip, trigger: 'axis' },
      grid: { left: 36, right: 40, top: 20, bottom: 56 },
      legend: { bottom: 0, textStyle: { color: c.muted } },
      xAxis: { type: 'category', data: daily.map((x) => x.date.slice(5)), axisLabel: { color: c.muted }, axisLine: { lineStyle: { color: c.line } } },
      yAxis: [
        { type: 'value', minInterval: 1, axisLabel: { color: c.muted }, splitLine: { lineStyle: { color: c.line } } },
        { type: 'value', axisLabel: { color: c.muted }, splitLine: { show: false } },
      ],
      dataZoom: daily.length > 40 ? [{ type: 'inside' }] : undefined,
      series: [
        { name: 'Tâches terminées', type: 'bar', data: daily.map((x) => x.tasksCompleted), itemStyle: { color: c.brand, borderRadius: [4, 4, 0, 0] }, barMaxWidth: 22 },
        { name: 'Concentration (min)', type: 'line', yAxisIndex: 1, smooth: true, showSymbol: daily.length < 20, data: daily.map((x) => Math.round(x.focusSeconds / 60)), itemStyle: { color: c.success }, lineStyle: { width: 3 } },
      ],
    };
  };

  protected readonly compareChart = () => {
    const { c, base } = this.axis();
    const rows = this.loader.data()?.planning.comparisons ?? [];
    return {
      ...base,
      tooltip: { ...base.tooltip, trigger: 'axis', valueFormatter: (v: number) => `${Math.round(v)} min` },
      grid: { left: 44, right: 12, top: 20, bottom: 70 },
      legend: { bottom: 0, textStyle: { color: c.muted } },
      xAxis: { type: 'category', data: rows.map((r) => (r.title.length > 14 ? r.title.slice(0, 13) + '…' : r.title)), axisLabel: { color: c.muted, rotate: 30, interval: 0 }, axisLine: { lineStyle: { color: c.line } } },
      yAxis: { type: 'value', name: 'min', axisLabel: { color: c.muted }, splitLine: { lineStyle: { color: c.line } } },
      series: [
        { name: 'Prévue', type: 'bar', data: rows.map((r) => Math.round(r.plannedSeconds / 60)), itemStyle: { color: c.info, borderRadius: [4, 4, 0, 0] } },
        { name: 'Réelle écoulée', type: 'bar', data: rows.map((r) => Math.round(r.elapsedSeconds / 60)), itemStyle: { color: c.warning, borderRadius: [4, 4, 0, 0] } },
      ],
    };
  };

  private donut(data: { name: string; value: number; color: string }[]) {
    const { c, base } = this.axis();
    return {
      ...base,
      tooltip: { ...base.tooltip, trigger: 'item' },
      series: [{
        type: 'pie', radius: ['52%', '78%'], avoidLabelOverlap: true, itemStyle: { borderColor: c.surface, borderWidth: 3, borderRadius: 6 },
        label: { color: c.fg, formatter: '{b}\n{c}' }, data: data.map((d) => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
      }],
    };
  }

  protected readonly quadrantChart = () => {
    const c = chartTheme();
    const d = this.loader.data()?.tasks.activeByQuadrant;
    return this.donut(QUADRANTS.map((q, i) => ({ name: q, value: d?.[q] ?? 0, color: c.q[i] })).filter((x) => x.value > 0));
  };

  protected readonly statusChart = () => {
    const c = chartTheme();
    const d = this.loader.data()?.tasks.byStatus;
    const colors: Record<TaskStatus, string> = { TODO: c.muted, IN_PROGRESS: c.info, DONE: c.success };
    return this.donut((['TODO', 'IN_PROGRESS', 'DONE'] as TaskStatus[]).map((s) => ({ name: STATUS_LABEL[s], value: d?.[s] ?? 0, color: colors[s] })).filter((x) => x.value > 0));
  };

  protected readonly projectChart = () =>
    this.donut((this.loader.data()?.focus.byProject ?? []).map((p) => ({ name: p.name, value: Math.round(p.focusSeconds / 60), color: p.color })));

  protected readonly heatChart = () => {
    const { c, base } = this.axis();
    const data = (this.heat.data()?.daily ?? []).map((x) => [x.date, Math.round(x.focusSeconds / 60)]);
    const max = Math.max(30, ...data.map((d) => d[1] as number));
    const today = this.settings.today();
    return {
      ...base,
      tooltip: { ...base.tooltip, formatter: (p: { value: [string, number] }) => `${longDate(p.value[0])}<br/><b>${p.value[1]} min</b> de concentration` },
      visualMap: { min: 0, max, show: false, inRange: { color: [c.line, c.brand] } },
      calendar: {
        top: 24, left: 36, right: 12, cellSize: ['auto', 14], range: [addDays(today, -364), today],
        itemStyle: { borderWidth: 3, borderColor: c.surface, color: c.line }, yearLabel: { show: false },
        dayLabel: { color: c.muted, firstDay: 1, nameMap: ['D', 'L', 'M', 'M', 'J', 'V', 'S'] }, monthLabel: { color: c.muted, nameMap: 'fr' }, splitLine: { show: false },
      },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data }],
    };
  };
}
