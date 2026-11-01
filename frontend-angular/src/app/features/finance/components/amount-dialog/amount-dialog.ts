import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { amountInput, parseAmount } from '../../../../core/util/money';

export interface AmountDialogData {
  title: string;
  message?: string;
  amountLabel: string;
  amount?: number | null;
  allowNegative?: boolean;
  /** Accepte zero (liberer une reservation). */
  allowZero?: boolean;
  /** Demande aussi une date (AAAA-MM-JJ), bornee a `maxDate`. */
  date?: string;
  maxDate?: string;
  /** Demande une note facultative. */
  withNote?: boolean;
  confirmLabel: string;
}

export interface AmountDialogResult {
  amount: number;
  date: string | null;
  note: string | null;
}

/** Saisie d'un montant (et d'une date ou d'une note) : realisation d'une prevision, correction de solde. */
@Component({
  selector: 'ff-amount-dialog',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './amount-dialog.html',
})
export class AmountDialogComponent {
  protected readonly data = inject<AmountDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<AmountDialogResult>>(DialogRef);
  protected readonly amount = signal(amountInput(this.data.amount));
  protected readonly date = signal(this.data.date ?? '');
  protected readonly note = signal('');
  protected readonly error = signal('');

  protected submit(): void {
    const value = parseAmount(this.amount(), this.data.allowNegative);
    if (value === null || (!this.data.allowNegative && (value < 0 || (value === 0 && !this.data.allowZero)))) {
      this.error.set('Saisissez un montant valide, au centime près (ex. 12,50).');
      return;
    }
    if (this.data.date !== undefined) {
      if (!this.date()) {
        this.error.set('La date est obligatoire.');
        return;
      }
      if (this.data.maxDate && this.date() > this.data.maxDate) {
        this.error.set('Une opération réalisée ne peut pas être datée dans le futur.');
        return;
      }
    }
    this.ref.close({
      amount: value,
      date: this.data.date !== undefined ? this.date() : null,
      note: this.note().trim() || null,
    });
  }
}
