import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { FinanceApi } from '../../../../core/api/finance.api';
import { ScheduleBody } from '../../../../core/api/models';
import { formatMoney, parseAmount } from '../../../../core/util/money';
import { HelpTipComponent } from '../../../../shared/ui/help-tip/help-tip';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { MONTH_HELP } from '../../month-help';
import { Recurrence, parseDayOfMonth, recurrenceDates, recurrenceError, recurrenceText } from '../../month-utils';
import { FinanceReferenceStore } from '../../services/finance-reference.store';

export interface FixedChargeDialogData {
  /** Premier mois propose (AAAA-MM). */
  month: string;
}

type FixedKind = 'BILL' | 'SUBSCRIPTION';

/**
 * Depense fixe (loyer, telephone, abonnement de transport) : saisie une fois, elle remplit la feuille de chaque mois.
 * Cree un echeancier mensuel de depense indispensable ; se ferme avec un message de succes.
 */
@Component({
  selector: 'ff-fixed-charge-dialog',
  imports: [ReactiveFormsModule, HelpTipComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fixed-charge-dialog.html',
})
export class FixedChargeDialogComponent {
  private readonly api = inject(FinanceApi);
  protected readonly store = inject(FinanceReferenceStore);
  protected readonly data = inject<FixedChargeDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<string>>(DialogRef);
  protected readonly help = MONTH_HELP;
  protected readonly categories = computed(() => this.store.activeCategories());

  protected readonly form = inject(FormBuilder).nonNullable.group({
    kind: ['BILL' as FixedKind],
    label: [''],
    categoryId: [''],
    amount: [''],
    day: [5 as number | string],
    from: [this.data.month],
    to: [''],
  });
  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly kind = computed(() => this.value().kind ?? 'BILL');
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected readonly summary = computed(() => {
    const amount = parseAmount(this.value().amount);
    const recurrence = this.recurrence();
    if (amount === null || amount <= 0 || recurrenceError(recurrence)) return '';
    return `${formatMoney(amount)} ${recurrenceText(recurrence)}.`;
  });

  constructor() {
    this.store.ensure();
  }

  private recurrence(): Recurrence {
    const v = this.value();
    const to = (v.to ?? '').trim();
    return {
      mode: 'monthly',
      from: (v.from ?? '').trim(),
      to: to || null,
      day: parseDayOfMonth(v.day ?? null) ?? 0,
    };
  }

  protected async submit(): Promise<void> {
    const v = this.form.getRawValue();
    const fail = (message: string) => this.error.set(message);
    const label = v.label.trim();
    const amount = parseAmount(v.amount);
    if (!label) return fail('Le libellé est obligatoire (ex. Loyer).');
    if (!v.categoryId) return fail('Choisissez une catégorie.');
    if (amount === null || amount <= 0) return fail('Saisissez un montant positif, au centime près (ex. 350).');
    const recurrence = this.recurrence();
    const invalid = recurrenceError(recurrence);
    if (invalid) return fail(invalid);
    const accountId = this.store.account()?.id;
    if (!accountId) return fail('Saisissez d’abord le solde de votre compte.');
    const dates = recurrenceDates(recurrence);
    const body: ScheduleBody = {
      label,
      type: 'EXPENSE',
      kind: v.kind,
      accountId,
      categoryId: v.categoryId,
      incomeKind: null,
      amount,
      essential: true,
      frequency: 'MONTHLY',
      intervalCount: 1,
      startDate: dates.startDate,
      endDate: dates.endDate,
      occurrences: null,
      notes: null,
    };
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.createSchedule(body));
      this.ref.close(`Dépense fixe ajoutée : ${label}, ${formatMoney(amount)} ${recurrenceText(recurrence)}.`);
    } catch (e) {
      fail(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.saving.set(false);
    }
  }
}
