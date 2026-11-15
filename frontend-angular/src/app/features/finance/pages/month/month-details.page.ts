import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { HelpTipComponent } from '../../../../shared/ui/help-tip/help-tip';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { ErrorComponent, SkeletonComponent } from '../../../../shared/ui/states';
import { OperationRowComponent } from '../../components/operation-row/operation-row';
import { expenseDefaultDate } from '../../month-utils';
import { EnvelopeRowsComponent } from './envelope-rows';
import { MonthNavComponent } from './month-nav';
import { MonthState } from './month-state';
import { savingsProgress } from './month-view';
import { SheetRowsComponent } from './sheet-rows';

/**
 * « Détails du mois » : la feuille complete du mois choisi. Revenus (prevu pour les calculs, recu une fois saisi),
 * depenses fixes, depenses variables plafonnees, autres depenses, puis l'epargne reelle du mois face a l'objectif.
 * La synthese du mois est sur « Mon mois ».
 */
@Component({
  selector: 'ff-finance-month-details',
  imports: [
    IconComponent,
    HelpTipComponent,
    ErrorComponent,
    SkeletonComponent,
    OperationRowComponent,
    SheetRowsComponent,
    EnvelopeRowsComponent,
    MonthNavComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './month-details.page.html',
  styleUrl: './month.page.css',
})
export class FinanceMonthDetailsPage extends MonthState {
  protected readonly savings = computed(() => {
    const s = this.sheet();
    return s ? savingsProgress(s.totals.savingsActual, s.savingsTarget) : null;
  });

  /** Depense ponctuelle : saisie rapide pour le mois en cours, datee dans le mois affiche sinon. */
  protected addOther(): void {
    const month = this.month();
    if (month === this.currentMonth) {
      void this.actions.quickExpense();
      return;
    }
    void this.actions.newOperation({
      type: 'EXPENSE',
      status: 'COMPLETED',
      date: expenseDefaultDate(month, this.settings.today()),
    });
  }
}
