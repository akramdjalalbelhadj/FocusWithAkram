import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FinanceApi } from '../../../../core/api/finance.api';
import { SettingsStore } from '../../../../core/services/settings.store';
import { Loader } from '../../../../core/util/loader';
import { formatMoney } from '../../../../core/util/money';
import { monthName } from '../../../../core/util/time';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { EmptyComponent, ErrorComponent, SkeletonComponent } from '../../../../shared/ui/states';
import { OperationRowComponent } from '../../components/operation-row/operation-row';
import { BUDGET_STATE } from '../../finance-labels';
import { FinanceActions } from '../../services/finance-actions.service';

/** Budget du mois : plafond variable, depenses indispensables, revenus attendus et epargne. */
@Component({
  selector: 'ff-finance-budget',
  imports: [IconComponent, EmptyComponent, ErrorComponent, SkeletonComponent, OperationRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './budget.page.html',
})
export class FinanceBudgetPage {
  private readonly api = inject(FinanceApi);
  protected readonly actions = inject(FinanceActions);
  protected readonly currentMonth = inject(SettingsStore).today().slice(0, 7);
  protected readonly month = signal(this.currentMonth);
  protected readonly loader = new Loader(() => this.api.budget(this.month()));
  protected readonly money = formatMoney;
  protected readonly states = BUDGET_STATE;

  protected readonly monthTitle = computed(() => {
    const [y, m] = this.month().split('-').map(Number);
    return `${monthName(m)} ${y}`;
  });
  /** Largeur de la barre, bornee a 100 % (le depassement est signale par la couleur et le texte). */
  protected readonly barWidth = computed(() => Math.min(100, this.loader.data()?.variableUsedPercent ?? 0));

  protected shiftMonth(delta: number): void {
    const [y, m] = this.month().split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1 + delta, 1));
    this.month.set(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  }

  protected edit(): void {
    const budget = this.loader.data();
    if (budget) void this.actions.editBudget({ month: this.month(), monthTitle: this.monthTitle(), budget });
  }
}
