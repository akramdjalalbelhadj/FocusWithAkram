import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FinanceApi } from '../../../../core/api/finance.api';
import { Schedule, ScheduleKind } from '../../../../core/api/models';
import { Loader } from '../../../../core/util/loader';
import { formatMoney } from '../../../../core/util/money';
import { sumMoney } from '../../../../core/util/money-sum';
import { longDate } from '../../../../core/util/time';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { EmptyComponent, ErrorComponent, SkeletonComponent } from '../../../../shared/ui/states';
import { SCHEDULE_KINDS, frequencyLabel } from '../../finance-labels';
import { FinanceActions } from '../../services/finance-actions.service';

interface Group {
  key: string;
  title: string;
  icon: string;
  items: Schedule[];
  /** Equivalents mensuel et annuel des echeanciers actifs du groupe. */
  monthly: number;
  annual: number;
}

/** Echeancier : revenus reguliers, abonnements, charges et paiements en plusieurs fois. */
@Component({
  selector: 'ff-finance-schedules',
  imports: [
    IconComponent,
    EmptyComponent,
    ErrorComponent,
    SkeletonComponent,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './schedules.page.html',
})
export class FinanceSchedulesPage {
  private readonly api = inject(FinanceApi);
  protected readonly actions = inject(FinanceActions);
  protected readonly loader = new Loader(() => this.api.schedules());
  protected readonly showEnded = signal(false);
  protected readonly money = formatMoney;
  protected readonly longDate = longDate;
  protected readonly frequency = frequencyLabel;
  protected readonly kindLabel = Object.fromEntries(SCHEDULE_KINDS.map((k) => [k.value, k.label]));

  protected readonly groups = computed<Group[]>(() => {
    const all = (this.loader.data() ?? []).filter((s) => this.showEnded() || s.status !== 'ENDED');
    const of = (kinds: ScheduleKind[], type: 'INCOME' | 'EXPENSE') =>
      all.filter((s) => s.type === type && kinds.includes(s.kind));
    const groups: Omit<Group, 'monthly' | 'annual'>[] = [
      { key: 'income', title: 'Revenus réguliers', icon: 'banknote', items: all.filter((s) => s.type === 'INCOME') },
      { key: 'sub', title: 'Abonnements', icon: 'repeat', items: of(['SUBSCRIPTION'], 'EXPENSE') },
      { key: 'bill', title: 'Charges et factures', icon: 'receipt', items: of(['BILL', 'SALARY', 'OTHER'], 'EXPENSE') },
      { key: 'inst', title: 'Paiements en plusieurs fois', icon: 'credit-card', items: of(['INSTALLMENT'], 'EXPENSE') },
    ];
    return groups
      .filter((g) => g.items.length)
      .map((g) => {
        const active = g.items.filter((s) => s.status === 'ACTIVE');
        return {
          ...g,
          monthly: sumMoney(active.map((s) => s.monthlyEquivalent)),
          annual: sumMoney(active.map((s) => s.annualEquivalent)),
        };
      });
  });
  protected readonly empty = computed(() => (this.loader.data() ?? []).length === 0);
}
