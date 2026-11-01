import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { FinanceApi } from '../../../../core/api/finance.api';
import { Loan, LoanDirection } from '../../../../core/api/models';
import { SettingsStore } from '../../../../core/services/settings.store';
import { formatMoney, parseAmount } from '../../../../core/util/money';
import { FinanceReferenceStore } from '../../services/finance-reference.store';

export interface LoanDialogData {
  loan: Loan | null;
  direction?: LoanDirection;
}

/**
 * Nouveau pret accorde ou emprunt, ou modification (personne, echeance, notes). Le montant et la date d'un pret
 * existant decoulent du versement enregistre : en cas d'erreur, on annule puis on ressaisit.
 */
@Component({
  selector: 'ff-loan-dialog',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loan-dialog.html',
})
export class LoanDialogComponent {
  private readonly api = inject(FinanceApi);
  private readonly store = inject(FinanceReferenceStore);
  protected readonly data = inject<LoanDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly today = inject(SettingsStore).today();
  protected readonly money = formatMoney;
  protected readonly loan = this.data.loan;
  protected readonly directions: { value: LoanDirection; label: string }[] = [
    { value: 'LENT', label: 'J’ai prêté' },
    { value: 'BORROWED', label: 'J’ai emprunté' },
  ];

  protected readonly direction = signal<LoanDirection>(
    this.loan?.direction ?? this.data.direction ?? 'LENT',
  );
  protected readonly person = signal(this.loan?.person ?? '');
  protected readonly amount = signal('');
  protected readonly startDate = signal(this.today);
  protected readonly dueDate = signal(this.loan?.dueDate ?? '');
  protected readonly notes = signal(this.loan?.notes ?? '');
  /** Faux : pret anterieur au suivi, l'argent a bouge avant le solde de depart. */
  protected readonly recordDisbursement = signal(true);
  protected readonly accountId = signal(
    this.store.activeAccounts().find((a) => a.type !== 'SAVINGS')?.id ?? '',
  );
  protected readonly accounts = computed(() => this.store.activeAccounts());
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected async submit(): Promise<void> {
    const person = this.person().trim();
    if (!person) return this.error.set('Indiquez la personne.');
    const dueDate = this.dueDate() || null;
    const notes = this.notes().trim() || null;
    const amount = parseAmount(this.amount());
    if (!this.loan) {
      if (amount === null || amount <= 0)
        return this.error.set('Saisissez un montant valide (ex. 150 ou 49,90).');
      if (!this.startDate() || this.startDate() > this.today)
        return this.error.set('La date ne peut pas être future.');
      if (this.recordDisbursement() && !this.accountId())
        return this.error.set('Choisissez le compte concerné.');
    }
    const start = this.loan?.startDate ?? this.startDate();
    if (dueDate && dueDate < start) return this.error.set('L’échéance précède la date du prêt.');
    this.saving.set(true);
    try {
      if (this.loan) {
        await firstValueFrom(this.api.updateLoan(this.loan.id, { person, dueDate, notes }));
      } else {
        await firstValueFrom(
          this.api.createLoan({
            person,
            direction: this.direction(),
            amount: amount ?? 0,
            startDate: this.startDate(),
            dueDate,
            accountId: this.recordDisbursement() ? this.accountId() : null,
            recordDisbursement: this.recordDisbursement(),
            notes,
          }),
        );
      }
      this.ref.close(true);
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.saving.set(false);
    }
  }
}
