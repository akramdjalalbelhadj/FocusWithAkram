import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EChartsCoreOption } from 'echarts/core';
import { FinanceApi } from '../../../../core/api/finance.api';
import { SettingsStore } from '../../../../core/services/settings.store';
import { Loader } from '../../../../core/util/loader';
import { formatMoney } from '../../../../core/util/money';
import { monthName } from '../../../../core/util/time';
import { ChartComponent, chartTheme } from '../../../../shared/ui/chart/chart';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { EmptyComponent, ErrorComponent, SkeletonComponent } from '../../../../shared/ui/states';
import { OperationRowComponent } from '../../components/operation-row/operation-row';
import { ACCOUNT_TYPE_LABEL, ACCOUNT_TYPES } from '../../finance-labels';
import { FinanceActions } from '../../services/finance-actions.service';

/** Vue d'ensemble : soldes du jour, bilan du mois choisi, echeances et repartition des depenses. */
@Component({
  selector: 'ff-finance-overview',
  imports: [
    RouterLink,
    IconComponent,
    ChartComponent,
    EmptyComponent,
    ErrorComponent,
    SkeletonComponent,
    OperationRowComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './overview.page.html',
})
export class FinanceOverviewPage {
  private readonly api = inject(FinanceApi);
  protected readonly actions = inject(FinanceActions);
  private readonly currentMonth = inject(SettingsStore).today().slice(0, 7);

  protected readonly month = signal(this.currentMonth);
  protected readonly loader = new Loader(() => this.api.overview(this.month()));
  protected readonly data = computed(() => this.loader.data());
  protected readonly money = formatMoney;
  protected readonly typeLabel = ACCOUNT_TYPE_LABEL;
  protected readonly typeIcon = Object.fromEntries(ACCOUNT_TYPES.map((t) => [t.value, t.icon]));

  protected readonly isCurrentMonth = computed(() => this.month() === this.currentMonth);
  protected readonly monthTitle = computed(() => {
    const [y, m] = this.month().split('-').map(Number);
    return `${monthName(m)} ${y}`;
  });
  protected readonly activeAccounts = computed(
    () => this.data()?.accounts.filter((a) => !a.archived) ?? [],
  );
  protected readonly overdue = computed(() => this.data()?.upcoming.filter((o) => o.overdue) ?? []);
  protected readonly next = computed(() => this.data()?.upcoming.filter((o) => !o.overdue) ?? []);
  /** Part de chaque categorie dans les depenses payees du mois (pourcentage affiche, arrondi). */
  protected readonly categories = computed(() => {
    const d = this.data();
    if (!d) return [];
    const total = d.byCategory.reduce((sum, c) => sum + Math.max(0, c.amount), 0);
    return d.byCategory.map((c) => ({
      ...c,
      share: total > 0 ? Math.round((Math.max(0, c.amount) / total) * 100) : 0,
    }));
  });

  protected readonly chartHeight = computed(() => Math.max(140, this.categories().length * 34));

  protected shiftMonth(delta: number): void {
    const [y, m] = this.month().split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1 + delta, 1));
    this.month.set(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  }

  protected readonly categoryChart = (): EChartsCoreOption => {
    const c = chartTheme();
    const rows = [...this.categories()].reverse();
    return {
      grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'item',
        backgroundColor: c.surface,
        borderColor: c.line,
        textStyle: { color: c.fg },
        valueFormatter: (v: number) => formatMoney(v),
      },
      xAxis: {
        type: 'value',
        axisLabel: { color: c.muted, formatter: (v: number) => `${v} €` },
        splitLine: { lineStyle: { color: c.line } },
      },
      yAxis: {
        type: 'category',
        data: rows.map((r) => r.name),
        axisLabel: { color: c.fg },
        axisLine: { lineStyle: { color: c.line } },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 18,
          data: rows.map((r) => ({
            value: r.amount,
            itemStyle: { color: r.color ?? c.brand, borderRadius: [0, 6, 6, 0] },
          })),
        },
      ],
    };
  };
}
