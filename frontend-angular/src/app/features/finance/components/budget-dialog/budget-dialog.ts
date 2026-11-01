import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { FinanceApi } from '../../../../core/api/finance.api';
import { BudgetView } from '../../../../core/api/models';
import { amountInput, formatMoney, parseAmount } from '../../../../core/util/money';

export interface BudgetDialogData {
  month: string;
  monthTitle: string;
  budget: BudgetView;
}

/** Plafond variable et objectif d'epargne d'un mois ; vide = valeur par defaut des preferences. */
@Component({
  selector: 'ff-budget-dialog',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './budget-dialog.html',
})
export class BudgetDialogComponent {
  private readonly api = inject(FinanceApi);
  protected readonly data = inject<BudgetDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly money = formatMoney;
  protected readonly cap = signal(
    this.data.budget.capSource === 'MONTH' ? amountInput(this.data.budget.variableCap) : '',
  );
  protected readonly target = signal(
    this.data.budget.savingsTargetSource === 'MONTH' ? amountInput(this.data.budget.savingsTarget) : '',
  );
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected async submit(): Promise<void> {
    const cap = this.cap().trim() ? parseAmount(this.cap()) : null;
    const target = this.target().trim() ? parseAmount(this.target()) : null;
    if ((this.cap().trim() && cap === null) || (this.target().trim() && target === null)) {
      this.error.set('Montant invalide : saisissez un montant positif au centime près, ou laissez vide.');
      return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.api.updateBudget(this.data.month, { variableCap: cap, savingsTarget: target }),
      );
      this.ref.close(true);
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.saving.set(false);
    }
  }
}
