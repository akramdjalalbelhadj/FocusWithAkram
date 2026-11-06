import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { FinanceApi } from '../../../../core/api/finance.api';
import { IncomeKind, ScheduleBody } from '../../../../core/api/models';
import { formatMoney, parseAmount } from '../../../../core/util/money';
import { HelpTipComponent } from '../../../../shared/ui/help-tip/help-tip';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { INCOME_KINDS } from '../../finance-labels';
import { MONTH_HELP } from '../../month-help';
import {
  Recurrence,
  RecurrenceMode,
  parseDayOfMonth,
  recurrenceDates,
  recurrenceError,
  recurrenceText,
} from '../../month-utils';
import { FinanceReferenceStore } from '../../services/finance-reference.store';

export interface IncomePlanDialogData {
  /** Mois propose (AAAA-MM). */
  month: string;
}

const KIND_LABEL = Object.fromEntries(INCOME_KINDS.map((k) => [k.value, k.label])) as Record<IncomeKind, string>;

/**
 * Revenu prevu : un montant attendu un jour du mois, pour un seul mois ou chaque mois d'une periode. Cree un
 * echeancier mensuel ; se ferme avec un message de succes explicite.
 */
@Component({
  selector: 'ff-income-plan-dialog',
  imports: [ReactiveFormsModule, HelpTipComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './income-plan-dialog.html',
})
export class IncomePlanDialogComponent {
  private readonly api = inject(FinanceApi);
  private readonly store = inject(FinanceReferenceStore);
  protected readonly data = inject<IncomePlanDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<string>>(DialogRef);
  protected readonly incomeKinds = INCOME_KINDS;
  protected readonly help = MONTH_HELP;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    label: ['Salaire'],
    amount: [''],
    incomeKind: ['SALARY' as IncomeKind],
    mode: ['monthly' as RecurrenceMode],
    from: [this.data.month],
    to: [''],
    day: [28 as number | string],
  });
  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly mode = computed(() => this.value().mode ?? 'monthly');
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  /** Resume de la saisie, mis a jour a chaque frappe (« 2 290,00 € le 28 de chaque mois, de … à … »). */
  protected readonly summary = computed(() => {
    const v = this.value();
    const amount = parseAmount(v.amount);
    const recurrence = this.recurrence();
    if (amount === null || amount <= 0 || recurrenceError(recurrence)) return '';
    return `${formatMoney(amount)} ${recurrenceText(recurrence)}.`;
  });

  constructor() {
    this.store.ensure();
    // Le libelle suit l'origine tant qu'il n'a pas ete personnalise (« Salaire » devient « Prime »).
    let previous = this.form.controls.incomeKind.value;
    this.form.controls.incomeKind.valueChanges.subscribe((kind) => {
      const label = this.form.controls.label.value.trim();
      if (!label || label === KIND_LABEL[previous]) this.form.controls.label.setValue(KIND_LABEL[kind]);
      previous = kind;
    });
  }

  private recurrence(): Recurrence {
    const v = this.value();
    return {
      mode: v.mode ?? 'monthly',
      from: (v.from ?? '').trim(),
      to: v.mode === 'monthly' && (v.to ?? '').trim() ? (v.to ?? '').trim() : null,
      day: parseDayOfMonth(v.day ?? null) ?? 0,
    };
  }

  protected async submit(): Promise<void> {
    const v = this.form.getRawValue();
    const fail = (message: string) => this.error.set(message);
    const label = v.label.trim();
    const amount = parseAmount(v.amount);
    if (!label) return fail('Le libellé est obligatoire.');
    if (amount === null || amount <= 0) return fail('Saisissez un montant positif, au centime près (ex. 2 290).');
    const recurrence = this.recurrence();
    const invalid = recurrenceError(recurrence);
    if (invalid) return fail(invalid);
    const accountId = this.store.account()?.id;
    if (!accountId) return fail('Saisissez d’abord le solde de votre compte.');
    const dates = recurrenceDates(recurrence);
    const body: ScheduleBody = {
      label,
      type: 'INCOME',
      kind: v.incomeKind === 'SALARY' ? 'SALARY' : 'OTHER',
      accountId,
      categoryId: null,
      incomeKind: v.incomeKind,
      amount,
      essential: false,
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
      this.ref.close(`Revenu prévu enregistré : ${label}, ${formatMoney(amount)} ${recurrenceText(recurrence)}.`);
    } catch (e) {
      fail(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.saving.set(false);
    }
  }
}
