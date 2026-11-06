import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Operation } from '../../../../core/api/models';
import { formatMoney } from '../../../../core/util/money';
import { longDate } from '../../../../core/util/time';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { OPERATION_TYPE_LABEL, operationSign, statusLabel } from '../../finance-labels';
import { FinanceActions } from '../../services/finance-actions.service';

/** Ligne d'operation : libelle, categorie, compte, etat et montant signe, avec ses actions. */
@Component({
  selector: 'ff-operation-row',
  imports: [IconComponent, CdkMenuTrigger, CdkMenu, CdkMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './operation-row.html',
})
export class OperationRowComponent {
  protected readonly actions = inject(FinanceActions);
  readonly op = input.required<Operation>();
  /** Affiche la date (listes non regroupees par jour). */
  readonly showDate = input(false);

  protected readonly sign = computed(() => operationSign(this.op()));
  protected readonly amount = computed(() => {
    const prefix = this.sign() > 0 ? '+' : this.sign() < 0 ? '−' : '';
    return prefix + formatMoney(this.op().amount);
  });
  protected readonly gap = computed(() => {
    const o = this.op();
    return o.plannedAmount !== null && o.plannedAmount !== o.amount ? o.amount - o.plannedAmount : null;
  });
  protected readonly icon = computed(() => {
    const o = this.op();
    if (o.category?.icon) return o.category.icon;
    return (
      {
        INCOME: 'trending-up',
        EXPENSE: 'receipt',
        PURCHASE_REFUND: 'restore',
        TRANSFER: 'transfer',
        OPENING_BALANCE: 'landmark',
        ADJUSTMENT: 'scale',
      } as const
    )[o.type];
  });
  protected readonly status = computed(() => statusLabel(this.op()));
  protected readonly typeLabel = computed(() => OPERATION_TYPE_LABEL[this.op().type]);
  protected readonly editable = computed(
    () =>
      !this.op().virtual &&
      !['OPENING_BALANCE', 'ADJUSTMENT'].includes(this.op().type),
  );
  protected readonly money = formatMoney;
  protected readonly longDate = longDate;
}
