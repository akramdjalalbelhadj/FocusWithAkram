import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { FinanceApi } from '../../../../core/api/finance.api';
import { AccountType, FinanceAccount } from '../../../../core/api/models';
import { SettingsStore } from '../../../../core/services/settings.store';
import { parseAmount } from '../../../../core/util/money';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { ACCOUNT_TYPES } from '../../finance-labels';

/** Creation d'un compte (avec son solde actuel) ou modification de son nom et de son type. */
@Component({
  selector: 'ff-account-dialog',
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-dialog.html',
})
export class AccountDialogComponent {
  private readonly api = inject(FinanceApi);
  protected readonly data = inject<FinanceAccount | null>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly today = inject(SettingsStore).today();
  protected readonly types = ACCOUNT_TYPES;
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.data?.name ?? '', [Validators.required, Validators.maxLength(80)]],
    type: [this.data?.type ?? ('CURRENT' as AccountType)],
    opening: [''],
    openingDate: [this.today],
  });

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    if (this.form.invalid || !v.name.trim()) return;
    const opening = v.opening.trim() ? parseAmount(v.opening, true) : 0;
    if (opening === null) {
      this.error.set('Solde invalide : saisissez un montant au centime près (ex. 1 500,00 ou -20).');
      return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.data
          ? this.api.updateAccount(this.data.id, {
              name: v.name.trim(),
              type: v.type,
              archived: this.data.archived,
              position: this.data.position,
            })
          : this.api.createAccount({
              name: v.name.trim(),
              type: v.type,
              openingBalance: opening,
              openingDate: v.openingDate || null,
            }),
      );
      this.ref.close(true);
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.saving.set(false);
    }
  }
}
