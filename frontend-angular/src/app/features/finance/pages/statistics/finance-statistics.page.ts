import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { FinanceApi } from '../../../../core/api/finance.api';
import { SettingsStore } from '../../../../core/services/settings.store';
import { Loader } from '../../../../core/util/loader';
import { formatMoney, formatSignedMoney } from '../../../../core/util/money';
import { longDate, monthName } from '../../../../core/util/time';
import { ChartComponent, chartTheme } from '../../../../shared/ui/chart/chart';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { EmptyComponent, ErrorComponent, SkeletonComponent } from '../../../../shared/ui/states';

/** Mois AAAA-MM decale de `delta` mois. */
function shift(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Statistiques de « Mes achats » sur des mois complets : revenus, depenses (indispensables, variables, achats
 * prevus), epargne, categories, plus grosses depenses et ecarts entre prix estimes et prix payes.
 */
@Component({
  selector: 'ff-finance-statistics',
  imports: [IconComponent, ChartComponent, EmptyComponent, ErrorComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './finance-statistics.page.html',
})
export class FinanceStatisticsPage {
  private readonly api = inject(FinanceApi);
  private readonly currentMonth = inject(SettingsStore).today().slice(0, 7);
  protected readonly periods = [3, 6, 12, 24];
  protected readonly span = signal(12);
  protected readonly loader = new Loader(() =>
    this.api.statistics(shift(this.currentMonth, 1 - this.span()), this.currentMonth),
  );
  protected readonly data = computed(() => this.loader.data());
  protected readonly expanded = signal<string | null>(null);
  protected readonly money = formatMoney;
  protected readonly signed = formatSignedMoney;
  protected readonly longDate = longDate;

  protected readonly empty = computed(() => {
    const t = this.data()?.totals;
    return !!t && t.incomeReceived === 0 && t.expensesPaid === 0 && t.savedToSavings === 0;
  });
  protected readonly varianceTotal = computed(() =>
    (this.data()?.purchases ?? []).reduce((sum, p) => Math.round((sum + p.variance) * 100) / 100, 0),
  );

  protected monthLabel(month: string): string {
    const [y, m] = month.split('-').map(Number);
    return `${monthName(m).slice(0, 3)}. ${String(y).slice(2)}`;
  }

  protected toggle(id: string): void {
    this.expanded.update((v) => (v === id ? null : id));
  }

  /** Revenus recus face aux depenses empilees par nature, et epargne mise de cote, mois par mois. */
  protected readonly monthsChart = (): EChartsCoreOption => {
    const months = this.data()?.months ?? [];
    const c = chartTheme();
    const bar = (name: string, color: string, stack: string | undefined, values: number[]) => ({
      name,
      type: 'bar',
      stack,
      barMaxWidth: 22,
      itemStyle: { color, borderRadius: stack ? 0 : [4, 4, 0, 0] },
      data: values,
    });
    return {
      grid: { left: 8, right: 8, top: 34, bottom: 8, containLabel: true },
      legend: { top: 0, textStyle: { color: c.muted }, itemWidth: 12 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: c.surface,
        borderColor: c.line,
        textStyle: { color: c.fg },
        valueFormatter: (v: number) => formatMoney(v),
      },
      xAxis: {
        type: 'category',
        data: months.map((m) => this.monthLabel(m.month)),
        axisLabel: { color: c.muted },
        axisLine: { lineStyle: { color: c.line } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: c.muted, formatter: (v: number) => `${v} €` },
        splitLine: { lineStyle: { color: c.line } },
      },
      series: [
        bar('Revenus reçus', c.success, undefined, months.map((m) => m.incomeReceived)),
        bar('Indispensables', c.q[0], 'exp', months.map((m) => m.essentialPaid)),
        bar('Variables', c.q[1], 'exp', months.map((m) => m.variablePaid)),
        bar('Achats prévus', c.q[2], 'exp', months.map((m) => m.goalPurchasesPaid)),
        {
          name: 'Épargne mise de côté',
          type: 'line',
          symbolSize: 6,
          lineStyle: { width: 2, color: c.brand },
          itemStyle: { color: c.brand },
          data: months.map((m) => m.savedToSavings),
        },
      ],
    };
  };
}
