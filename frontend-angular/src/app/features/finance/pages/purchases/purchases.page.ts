import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { FinanceApi } from '../../../../core/api/finance.api';
import { Goal } from '../../../../core/api/models';
import { Loader } from '../../../../core/util/loader';
import { formatMoney } from '../../../../core/util/money';
import { longDate } from '../../../../core/util/time';
import { ChartComponent, chartTheme } from '../../../../shared/ui/chart/chart';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { EmptyComponent, ErrorComponent, SkeletonComponent } from '../../../../shared/ui/states';
import { GoalCardComponent } from '../../components/goal-card/goal-card';
import { FinanceActions } from '../../services/finance-actions.service';

type QuadrantKey = 'Q1' | 'Q2' | 'Q3' | 'Q4';

const QUADRANTS: { key: QuadrantKey; label: string; hint: string; important: boolean; urgent: boolean }[] = [
  { key: 'Q1', label: 'Important et urgent', hint: 'Besoins à financer en premier', important: true, urgent: true },
  { key: 'Q2', label: 'Important, non urgent', hint: 'À planifier sereinement', important: true, urgent: false },
  { key: 'Q3', label: 'Urgent, non important', hint: 'Occasions à durée limitée', important: false, urgent: true },
  { key: 'Q4', label: 'Ni urgent ni important', hint: 'Envies facultatives', important: false, urgent: false },
];

/**
 * Achats prevus : prevision de tresorerie, liste par priorite ou matrice d'Eisenhower (distincte de celle des
 * taches), historique des achats realises et abandonnes.
 */
@Component({
  selector: 'ff-finance-purchases',
  imports: [
    IconComponent,
    EmptyComponent,
    ErrorComponent,
    SkeletonComponent,
    ChartComponent,
    GoalCardComponent,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './purchases.page.html',
  styleUrl: './purchases.page.css',
})
export class FinancePurchasesPage {
  private readonly api = inject(FinanceApi);
  protected readonly actions = inject(FinanceActions);
  protected readonly goals = new Loader(() => this.api.goals());
  protected readonly forecast = new Loader(() => this.api.forecast());
  protected readonly view = signal<'list' | 'matrix'>('list');
  protected readonly quadrants = QUADRANTS;
  protected readonly money = formatMoney;
  protected readonly longDate = longDate;

  private readonly all = computed(() => this.goals.data() ?? []);
  /** Objectifs ouverts dans l'ordre de priorite utilise par la prevision : quadrant, date cible. */
  protected readonly open = computed(() =>
    this.all()
      .filter((g) => ['CONSIDERED', 'PLANNED', 'POSTPONED'].includes(g.status))
      .sort((a, b) => a.quadrant.localeCompare(b.quadrant) || a.targetDate.localeCompare(b.targetDate)),
  );
  protected readonly closed = computed(() =>
    this.all()
      .filter((g) => g.status === 'PURCHASED' || g.status === 'ABANDONED')
      .sort((a, b) => (b.purchasedDate ?? b.targetDate).localeCompare(a.purchasedDate ?? a.targetDate)),
  );
  protected readonly byQuadrant = computed(() => {
    const map: Record<QuadrantKey, Goal[]> = { Q1: [], Q2: [], Q3: [], Q4: [] };
    for (const g of this.open()) map[g.quadrant].push(g);
    for (const key of Object.keys(map) as QuadrantKey[]) {
      map[key].sort((a, b) => a.position - b.position || a.targetDate.localeCompare(b.targetDate));
    }
    return map;
  });

  protected drop(event: CdkDragDrop<QuadrantKey>): void {
    const goal = event.item.data as Goal;
    const q = QUADRANTS.find((x) => x.key === event.container.data);
    if (!q || (event.previousContainer === event.container && event.previousIndex === event.currentIndex)) return;
    void this.actions.moveGoal(goal, q.important, q.urgent, event.currentIndex);
  }

  /** Disponible prevu avant et apres les achats retenus, avec la reserve de securite. */
  protected readonly forecastChart = (): EChartsCoreOption => {
    const f = this.forecast.data();
    const c = chartTheme();
    const points = f?.points ?? [];
    return {
      grid: { left: 8, right: 16, top: 30, bottom: 8, containLabel: true },
      legend: { top: 0, textStyle: { color: c.muted }, itemWidth: 14 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: c.surface,
        borderColor: c.line,
        textStyle: { color: c.fg },
        valueFormatter: (v: number) => formatMoney(v),
      },
      xAxis: {
        type: 'time',
        axisLabel: { color: c.muted },
        axisLine: { lineStyle: { color: c.line } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: c.muted, formatter: (v: number) => `${v} €` },
        splitLine: { lineStyle: { color: c.line } },
      },
      series: [
        {
          name: 'Disponible prévu',
          type: 'line',
          showSymbol: false,
          lineStyle: { width: 1.5, color: c.muted, type: 'dashed' },
          itemStyle: { color: c.muted },
          data: points.map((p) => [p.date, p.available]),
        },
        {
          name: 'Après achats prévus',
          type: 'line',
          showSymbol: false,
          lineStyle: { width: 2.5, color: c.brand },
          itemStyle: { color: c.brand },
          areaStyle: { color: c.brand, opacity: 0.08 },
          data: points.map((p) => [p.date, p.afterGoals]),
          markLine: f?.safetyReserve
            ? {
                symbol: 'none',
                label: { formatter: 'Réserve', color: c.danger },
                lineStyle: { color: c.danger, type: 'dotted' },
                data: [{ yAxis: f.safetyReserve }],
              }
            : undefined,
        },
      ],
    };
  };
}
