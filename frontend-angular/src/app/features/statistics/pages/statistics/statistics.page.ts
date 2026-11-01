import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DashboardApi } from '../../../../core/api/misc.api';
import { QUADRANTS, STATUS_LABEL, TaskStatus } from '../../../../core/api/models';
import { SettingsStore } from '../../../../core/services/settings.store';
import { Loader } from '../../../../core/util/loader';
import { addDays, formatDuration, longDate } from '../../../../core/util/time';
import { ChartComponent, chartTheme } from '../../../../shared/ui/chart/chart';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { EmptyComponent, ErrorComponent } from '../../../../shared/ui/states/index';

type Preset = 'today' | '7' | '30' | 'custom';

@Component({
  selector: 'ff-statistics-page',
  imports: [ChartComponent, IconComponent, ErrorComponent, EmptyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './statistics.page.html',
})
export class StatisticsPage {
  protected readonly settings = inject(SettingsStore);
  private readonly api = inject(DashboardApi);

  protected readonly presets: { id: Preset; label: string }[] = [
    { id: 'today', label: "Aujourd'hui" },
    { id: '7', label: '7 jours' },
    { id: '30', label: '30 jours' },
    { id: 'custom', label: 'Personnalisée' },
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
      case 'today':
        return { from: today, to: today };
      case '7':
        return { from: addDays(today, -6), to: today };
      case '30':
        return { from: addDays(today, -29), to: today };
      default:
        return { from: this.customFrom() || today, to: this.customTo() || today };
    }
  });

  protected readonly loader = new Loader(() =>
    this.api.productivity(this.range().from, this.range().to),
  );
  protected readonly heat = new Loader(() =>
    this.api.productivity(addDays(this.settings.today(), -364), this.settings.today()),
  );

  protected readonly cards = computed(() => {
    const d = this.loader.data()!;
    return [
      {
        label: 'Tâches créées',
        value: String(d.tasks.created),
        sub: `${Math.round(d.tasks.completionRate * 100)} % terminées`,
        icon: 'plus',
      },
      {
        label: 'Tâches terminées',
        value: String(d.tasks.completed),
        sub: `${d.planning.completedThisWeek} cette semaine`,
        icon: 'circle-check',
      },
      {
        label: 'En retard (actuel)',
        value: String(d.tasks.overdueNow),
        sub: 'tâches actives',
        icon: 'alert',
      },
      {
        label: 'Temps de concentration',
        value: formatDuration(d.focus.totalSeconds),
        sub: `${d.focus.completedSessions} sessions · moy. ${formatDuration(d.focus.averageSessionSeconds)}`,
        icon: 'timer',
      },
      {
        label: 'Sessions interrompues',
        value: String(d.focus.interruptedSessions),
        sub: 'temps conservé',
        icon: 'pause',
      },
      {
        label: 'Objectifs atteints',
        value: String(d.focus.daysGoalReached),
        sub: `jours ≥ ${d.focus.dailyGoalMinutes} min`,
        icon: 'target',
      },
      {
        label: 'Durée prévue',
        value: formatDuration(d.planning.totalPlannedSeconds),
        sub: 'tâches terminées',
        icon: 'hourglass',
      },
      {
        label: 'Durée réelle',
        value: formatDuration(d.planning.totalElapsedSeconds),
        sub: 'écoulée (≠ temps actif)',
        icon: 'clock',
      },
    ];
  });

  protected readonly quadrantText = computed(() =>
    QUADRANTS.map((q) => `${q} ${this.loader.data()!.tasks.activeByQuadrant[q]}`).join(', '),
  );
  protected readonly statusText = computed(() =>
    (['TODO', 'IN_PROGRESS', 'DONE'] as TaskStatus[])
      .map((s) => `${STATUS_LABEL[s]} ${this.loader.data()!.tasks.byStatus[s]}`)
      .join(', '),
  );
  protected readonly heatText = computed(() => {
    const days = (this.heat.data()?.daily ?? []).filter((x) => x.focusSeconds > 0);
    return `${days.length} jours actifs sur 12 mois. Dernier : ${days.length ? longDate(days[days.length - 1].date) : 'aucun'}.`;
  });

  private axis() {
    const c = chartTheme();
    return {
      c,
      base: {
        aria: { enabled: true },
        textStyle: { color: c.fg },
        tooltip: { backgroundColor: c.surface, borderColor: c.line, textStyle: { color: c.fg } },
      },
    };
  }

  protected readonly dailyChart = () => {
    const { c, base } = this.axis();
    const daily = this.loader.data()?.daily ?? [];
    return {
      ...base,
      tooltip: { ...base.tooltip, trigger: 'axis' },
      grid: { left: 36, right: 40, top: 20, bottom: 56 },
      legend: { bottom: 0, textStyle: { color: c.muted } },
      xAxis: {
        type: 'category',
        data: daily.map((x) => x.date.slice(5)),
        axisLabel: { color: c.muted },
        axisLine: { lineStyle: { color: c.line } },
      },
      yAxis: [
        {
          type: 'value',
          minInterval: 1,
          axisLabel: { color: c.muted },
          splitLine: { lineStyle: { color: c.line } },
        },
        { type: 'value', axisLabel: { color: c.muted }, splitLine: { show: false } },
      ],
      dataZoom: daily.length > 40 ? [{ type: 'inside' }] : undefined,
      series: [
        {
          name: 'Tâches terminées',
          type: 'bar',
          data: daily.map((x) => x.tasksCompleted),
          itemStyle: { color: c.brand, borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 22,
        },
        {
          name: 'Concentration (min)',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          showSymbol: daily.length < 20,
          data: daily.map((x) => Math.round(x.focusSeconds / 60)),
          itemStyle: { color: c.success },
          lineStyle: { width: 3 },
        },
      ],
    };
  };

  protected readonly compareChart = () => {
    const { c, base } = this.axis();
    const rows = this.loader.data()?.planning.comparisons ?? [];
    return {
      ...base,
      tooltip: {
        ...base.tooltip,
        trigger: 'axis',
        valueFormatter: (v: number) => `${Math.round(v)} min`,
      },
      grid: { left: 44, right: 12, top: 20, bottom: 70 },
      legend: { bottom: 0, textStyle: { color: c.muted } },
      xAxis: {
        type: 'category',
        data: rows.map((r) => (r.title.length > 14 ? r.title.slice(0, 13) + '…' : r.title)),
        axisLabel: { color: c.muted, rotate: 30, interval: 0 },
        axisLine: { lineStyle: { color: c.line } },
      },
      yAxis: {
        type: 'value',
        name: 'min',
        axisLabel: { color: c.muted },
        splitLine: { lineStyle: { color: c.line } },
      },
      series: [
        {
          name: 'Prévue',
          type: 'bar',
          data: rows.map((r) => Math.round(r.plannedSeconds / 60)),
          itemStyle: { color: c.info, borderRadius: [4, 4, 0, 0] },
        },
        {
          name: 'Réelle écoulée',
          type: 'bar',
          data: rows.map((r) => Math.round(r.elapsedSeconds / 60)),
          itemStyle: { color: c.warning, borderRadius: [4, 4, 0, 0] },
        },
      ],
    };
  };

  private donut(data: { name: string; value: number; color: string }[]) {
    const { c, base } = this.axis();
    return {
      ...base,
      tooltip: { ...base.tooltip, trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: ['52%', '78%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: c.surface, borderWidth: 3, borderRadius: 6 },
          label: { color: c.fg, formatter: '{b}\n{c}' },
          data: data.map((d) => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
        },
      ],
    };
  }

  protected readonly quadrantChart = () => {
    const c = chartTheme();
    const d = this.loader.data()?.tasks.activeByQuadrant;
    return this.donut(
      QUADRANTS.map((q, i) => ({ name: q, value: d?.[q] ?? 0, color: c.q[i] })).filter(
        (x) => x.value > 0,
      ),
    );
  };

  protected readonly statusChart = () => {
    const c = chartTheme();
    const d = this.loader.data()?.tasks.byStatus;
    const colors: Record<TaskStatus, string> = {
      TODO: c.muted,
      IN_PROGRESS: c.info,
      DONE: c.success,
    };
    return this.donut(
      (['TODO', 'IN_PROGRESS', 'DONE'] as TaskStatus[])
        .map((s) => ({ name: STATUS_LABEL[s], value: d?.[s] ?? 0, color: colors[s] }))
        .filter((x) => x.value > 0),
    );
  };

  protected readonly projectChart = () =>
    this.donut(
      (this.loader.data()?.focus.byProject ?? []).map((p) => ({
        name: p.name,
        value: Math.round(p.focusSeconds / 60),
        color: p.color,
      })),
    );

  protected readonly heatChart = () => {
    const { c, base } = this.axis();
    const data = (this.heat.data()?.daily ?? []).map((x) => [
      x.date,
      Math.round(x.focusSeconds / 60),
    ]);
    const max = Math.max(30, ...data.map((d) => d[1] as number));
    const today = this.settings.today();
    return {
      ...base,
      tooltip: {
        ...base.tooltip,
        formatter: (p: { value: [string, number] }) =>
          `${longDate(p.value[0])}<br/><b>${p.value[1]} min</b> de concentration`,
      },
      visualMap: { min: 0, max, show: false, inRange: { color: [c.line, c.brand] } },
      calendar: {
        top: 24,
        left: 36,
        right: 12,
        cellSize: ['auto', 14],
        range: [addDays(today, -364), today],
        itemStyle: { borderWidth: 3, borderColor: c.surface, color: c.line },
        yearLabel: { show: false },
        dayLabel: { color: c.muted, firstDay: 1, nameMap: ['D', 'L', 'M', 'M', 'J', 'V', 'S'] },
        monthLabel: { color: c.muted, nameMap: 'fr' },
        splitLine: { show: false },
      },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data }],
    };
  };
}
