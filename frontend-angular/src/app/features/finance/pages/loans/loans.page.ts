import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FinanceApi } from '../../../../core/api/finance.api';
import { Loan, LoanDirection } from '../../../../core/api/models';
import { Loader } from '../../../../core/util/loader';
import { formatMoney } from '../../../../core/util/money';
import { sumMoney } from '../../../../core/util/money-sum';
import { longDate } from '../../../../core/util/time';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { EmptyComponent, ErrorComponent, SkeletonComponent } from '../../../../shared/ui/states';
import { OPERATION_TYPE_LABEL } from '../../finance-labels';
import { FinanceActions } from '../../services/finance-actions.service';

interface Side {
  direction: LoanDirection;
  title: string;
  hint: string;
  items: Loan[];
  /** Total des restes dus en cours. */
  outstanding: number;
}

/**
 * Prets accordes et emprunts : reste du, remboursements partiels, regularisation explicite. Les mouvements ne sont
 * ni des revenus ni des depenses ; un remboursement attendu n'est jamais compte comme disponible.
 */
@Component({
  selector: 'ff-finance-loans',
  imports: [IconComponent, EmptyComponent, ErrorComponent, SkeletonComponent, CdkMenuTrigger, CdkMenu, CdkMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loans.page.html',
})
export class FinanceLoansPage {
  private readonly api = inject(FinanceApi);
  protected readonly actions = inject(FinanceActions);
  protected readonly loader = new Loader(() => this.api.loans());
  protected readonly showClosed = signal(false);
  protected readonly expanded = signal<string | null>(null);
  protected readonly money = formatMoney;
  protected readonly longDate = longDate;
  protected readonly typeLabel = OPERATION_TYPE_LABEL;

  protected readonly sides = computed<Side[]>(() => {
    const all = this.loader.data() ?? [];
    const visible = all.filter((l) => this.showClosed() || l.status === 'OPEN');
    const side = (direction: LoanDirection, title: string, hint: string): Side => ({
      direction,
      title,
      hint,
      items: visible.filter((l) => l.direction === direction),
      outstanding: sumMoney(
        all.filter((l) => l.direction === direction && l.status === 'OPEN').map((l) => l.remaining),
      ),
    });
    return [
      side('LENT', 'On me doit', 'Argent prêté : non compté comme disponible tant qu’il n’est pas rendu.'),
      side('BORROWED', 'Je dois', 'Argent emprunté : son remboursement est déduit des prévisions à l’échéance.'),
    ];
  });
  protected readonly empty = computed(() => (this.loader.data() ?? []).length === 0);

  protected toggle(id: string): void {
    this.expanded.update((v) => (v === id ? null : id));
  }

  protected progress(l: Loan): number {
    return l.principal > 0 ? Math.round(((l.repaid + l.writtenOffAmount) / l.principal) * 100) : 0;
  }
}
