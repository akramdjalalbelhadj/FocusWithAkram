import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { FinanceApi } from '../../../../core/api/finance.api';
import { Loan } from '../../../../core/api/models';
import { SettingsStore } from '../../../../core/services/settings.store';
import { amountInput, formatMoney, parseAmount } from '../../../../core/util/money';
import { FinanceReferenceStore } from '../../services/finance-reference.store';

/** Remboursement, partiel ou total, d'un pret accorde (recu) ou d'un emprunt (verse). */
@Component({
  selector: 'ff-repayment-dialog',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './repayment-dialog.html',
})
export class RepaymentDialogComponent {
  private readonly api = inject(FinanceApi);
  private readonly store = inject(FinanceReferenceStore);
  protected readonly loan = inject<Loan>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly today = inject(SettingsStore).today();
  protected readonly money = formatMoney;
  protected readonly received = this.loan.direction === 'LENT';
  protected readonly amount = signal(amountInput(this.loan.remaining));
  protected readonly date = signal(this.today);
  protected readonly accounts = computed(() => this.store.activeAccounts());
  protected readonly accountId = signal(
    this.loan.movements.at(-1)?.account.id ??
      this.store.activeAccounts().find((a) => a.type !== 'SAVINGS')?.id ??
      '',
  );
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected async submit(): Promise<void> {
    const amount = parseAmount(this.amount());
    if (amount === null || amount <= 0) return this.error.set('Saisissez un montant valide.');
    if (amount > this.loan.remaining)
      return this.error.set(`Le reste dû n’est que de ${formatMoney(this.loan.remaining)}.`);
    if (!this.date() || this.date() > this.today)
      return this.error.set('La date ne peut pas être future.');
    if (!this.accountId()) return this.error.set('Choisissez le compte.');
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.api.repayLoan(this.loan.id, amount, this.date(), this.accountId()),
      );
      this.ref.close(true);
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.saving.set(false);
    }
  }
}
