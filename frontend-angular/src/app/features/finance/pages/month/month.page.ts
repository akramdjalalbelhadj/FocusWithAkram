import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FinanceApi } from '../../../../core/api/finance.api';
import { Loader } from '../../../../core/util/loader';
import { HelpTipComponent } from '../../../../shared/ui/help-tip/help-tip';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { ErrorComponent, SkeletonComponent } from '../../../../shared/ui/states';
import { AlertView, SEVERITY_TONE, alertView } from '../../alert-text';
import { shortDate } from '../../month-utils';
import { MonthNavComponent } from './month-nav';
import { MonthState } from './month-state';
import { incomeState } from './month-view';

/**
 * « Mon mois » : tableau de bord du mois choisi, sans le detail. Solde du compte, revenus recus (0 tant que le
 * salaire du mois n'est pas saisi ; le salaire prevu de la periode sert aux calculs des achats prevus), depenses
 * payees et epargne reelle du mois. Le detail ligne par ligne est dans « Détails du mois ».
 */
@Component({
  selector: 'ff-finance-month',
  imports: [RouterLink, IconComponent, HelpTipComponent, ErrorComponent, SkeletonComponent, MonthNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './month.page.html',
  styleUrl: './month.page.css',
})
export class FinanceMonthPage extends MonthState {
  private readonly financeApi = inject(FinanceApi);
  protected readonly tone = SEVERITY_TONE;
  protected readonly shortDate = shortDate;

  /** Alertes du jour : affichees sur le mois en cours. */
  protected readonly alertsLoader = new Loader(() => this.financeApi.alerts());
  protected readonly alerts = computed(() =>
    this.month() === this.currentMonth
      ? (this.alertsLoader.data() ?? []).map(alertView).filter((a): a is AlertView => !!a)
      : [],
  );
  protected readonly income = computed(() => incomeState(this.sheet()?.incomes ?? []));
}
