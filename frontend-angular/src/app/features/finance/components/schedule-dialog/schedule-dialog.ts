import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { FinanceApi } from '../../../../core/api/finance.api';
import {
  Frequency,
  IncomeKind,
  Schedule,
  ScheduleBody,
  ScheduleKind,
} from '../../../../core/api/models';
import { SettingsStore } from '../../../../core/services/settings.store';
import { amountInput, parseAmount } from '../../../../core/util/money';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { INCOME_KINDS, SCHEDULE_KINDS } from '../../finance-labels';
import { FinanceReferenceStore } from '../../services/finance-reference.store';

type EndMode = 'none' | 'date' | 'count';

/**
 * Creation ou modification d'un echeancier : salaire, abonnement, charge ou paiement en plusieurs fois.
 * Modifier le montant ne change que les echeances futures non encore enregistrees.
 */
@Component({
  selector: 'ff-schedule-dialog',
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './schedule-dialog.html',
})
export class ScheduleDialogComponent {
  private readonly api = inject(FinanceApi);
  protected readonly store = inject(FinanceReferenceStore);
  protected readonly data = inject<{ schedule: Schedule | null; kind?: ScheduleKind }>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly kinds = SCHEDULE_KINDS;
  protected readonly incomeKinds = INCOME_KINDS;
  private readonly s = this.data.schedule;
  private readonly today = inject(SettingsStore).today();

  private readonly initialKind: ScheduleKind = this.s?.kind ?? this.data.kind ?? 'SUBSCRIPTION';
  protected readonly form = inject(FormBuilder).nonNullable.group({
    kind: [this.initialKind],
    type: [(this.s?.type ?? (this.initialKind === 'SALARY' ? 'INCOME' : 'EXPENSE')) as 'INCOME' | 'EXPENSE'],
    label: [this.s?.label ?? (this.initialKind === 'SALARY' ? 'Salaire' : '')],
    amount: [amountInput(this.s?.amount)],
    categoryId: [this.s?.category?.id ?? ''],
    incomeKind: [(this.s?.incomeKind ?? 'SALARY') as IncomeKind],
    essential: [this.s?.essential ?? false],
    frequency: [(this.s?.frequency ?? 'MONTHLY') as Frequency],
    intervalCount: [this.s?.intervalCount ?? 1],
    startDate: [this.s?.startDate ?? this.today],
    endMode: [(this.s?.endDate ? 'date' : this.initialKind === 'INSTALLMENT' ? 'count' : 'none') as EndMode],
    endDate: [this.s?.endDate ?? ''],
    occurrences: [3],
    notes: [this.s?.notes ?? ''],
  });
  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly type = computed(() => this.value().type ?? 'EXPENSE');
  protected readonly endMode = computed(() => this.value().endMode ?? 'none');
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly categories = computed(() => this.store.activeCategories());

  constructor() {
    this.store.ensure();
    // Un salaire est un revenu ; un abonnement, une charge ou un paiement en plusieurs fois, une depense.
    this.form.controls.kind.valueChanges.subscribe((kind) => {
      if (kind === 'SALARY') this.form.patchValue({ type: 'INCOME', incomeKind: 'SALARY' });
      else if (kind !== 'OTHER') this.form.patchValue({ type: 'EXPENSE' });
      if (kind === 'INSTALLMENT') this.form.patchValue({ endMode: 'count' });
    });
  }

  protected async submit(): Promise<void> {
    const v = this.form.getRawValue();
    const amount = parseAmount(v.amount);
    const fail = (m: string) => this.error.set(m);
    if (!v.label.trim()) return fail('Le libellé est obligatoire.');
    if (amount === null || amount <= 0) return fail('Saisissez un montant positif, au centime près.');
    const accountId = this.s?.account.id ?? this.store.account()?.id;
    if (!accountId) return fail('Saisissez d’abord le solde de votre compte.');
    if (v.type === 'EXPENSE' && !v.categoryId) return fail('Choisissez une catégorie.');
    if (!v.startDate) return fail('Indiquez la première échéance.');
    const interval = Number(v.intervalCount);
    if (!Number.isInteger(interval) || interval < 1 || interval > 24) {
      return fail('L’intervalle doit être un nombre entier entre 1 et 24.');
    }
    if (v.endMode === 'date' && (!v.endDate || v.endDate < v.startDate)) {
      return fail('La date de fin doit suivre la première échéance.');
    }
    const count = Number(v.occurrences);
    if (v.endMode === 'count' && (!Number.isInteger(count) || count < 1 || count > 600)) {
      return fail('Le nombre d’échéances doit être compris entre 1 et 600.');
    }
    const body: ScheduleBody = {
      label: v.label.trim(),
      type: v.type,
      kind: v.kind,
      accountId,
      categoryId: v.type === 'EXPENSE' ? v.categoryId : null,
      incomeKind: v.type === 'INCOME' ? v.incomeKind : null,
      amount,
      essential: v.type === 'EXPENSE' && v.essential,
      frequency: v.frequency,
      intervalCount: interval,
      startDate: v.startDate,
      endDate: v.endMode === 'date' ? v.endDate : null,
      occurrences: v.endMode === 'count' ? count : null,
      notes: v.notes.trim() || null,
    };
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.s ? this.api.updateSchedule(this.s.id, body) : this.api.createSchedule(body),
      );
      this.ref.close(true);
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.saving.set(false);
    }
  }
}
