import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { FinanceApi } from '../../../../core/api/finance.api';
import {
  IncomeKind,
  Operation,
  OperationBody,
  OperationStatus,
  OperationType,
} from '../../../../core/api/models';
import { SettingsStore } from '../../../../core/services/settings.store';
import { amountInput, formatMoney, parseAmount } from '../../../../core/util/money';
import { longDate } from '../../../../core/util/time';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { ENTRY_TYPES, INCOME_KINDS } from '../../finance-labels';
import { FinanceReferenceStore } from '../../services/finance-reference.store';

export interface OperationDialogData {
  /** Operation a modifier ; absente pour une creation. */
  operation?: Operation;
  /** Valeurs proposees a la creation (saisie rapide, remboursement d'un achat…). */
  preset?: Partial<OperationBody>;
}

/**
 * Saisie d'une operation. Les regles (montant au centime, categorie obligatoire pour une depense, date d'une
 * operation realisee…) sont verifiees ici pour guider la saisie, puis par le serveur, qui fait foi.
 */
@Component({
  selector: 'ff-operation-dialog',
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './operation-dialog.html',
})
export class OperationDialogComponent {
  private readonly api = inject(FinanceApi);
  protected readonly store = inject(FinanceReferenceStore);
  protected readonly data = inject<OperationDialogData>(DIALOG_DATA) ?? {};
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly today = inject(SettingsStore).today();
  protected readonly types = ENTRY_TYPES;
  protected readonly incomeKinds = INCOME_KINDS;
  protected readonly money = formatMoney;
  protected readonly longDate = longDate;

  private readonly op = this.data.operation;
  private readonly preset = this.data.preset ?? {};
  protected readonly editing = !!this.op;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    type: [(this.op?.type ?? this.preset.type ?? 'EXPENSE') as OperationType],
    status: [(this.op?.status === 'CANCELLED' ? 'PLANNED' : this.op?.status) ??
      this.preset.status ??
      ('COMPLETED' as OperationStatus)],
    amount: [amountInput(this.op?.amount ?? this.preset.amount)],
    label: [this.op?.label ?? this.preset.label ?? ''],
    date: [this.op?.date ?? this.preset.date ?? this.today],
    accountId: [this.op?.account.id ?? this.preset.accountId ?? ''],
    targetAccountId: [this.op?.targetAccount?.id ?? this.preset.targetAccountId ?? ''],
    categoryId: [this.op?.category?.id ?? this.preset.categoryId ?? ''],
    incomeKind: [(this.op?.incomeKind ?? this.preset.incomeKind ?? 'SALARY') as IncomeKind],
    essential: [this.op?.essential ?? this.preset.essential ?? false],
    exceptional: [this.op?.exceptional ?? this.preset.exceptional ?? false],
    description: [this.op?.description ?? this.preset.description ?? ''],
  });
  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly type = computed(() => this.value().type ?? 'EXPENSE');
  protected readonly needsCategory = computed(
    () => this.type() === 'EXPENSE' || this.type() === 'PURCHASE_REFUND',
  );

  protected readonly accounts = computed(() => {
    const current = this.op?.account.id;
    return this.store.accounts().filter((a) => !a.archived || a.id === current);
  });
  protected readonly targets = computed(() => {
    const current = this.op?.targetAccount?.id;
    return this.store
      .accounts()
      .filter((a) => (!a.archived || a.id === current) && a.id !== this.value().accountId);
  });
  protected readonly categories = computed(() => {
    const current = this.op?.category?.id;
    return this.store
      .categories()
      .filter((c) => !c.archived || c.id === current || c.children.some((s) => s.id === current))
      .map((c) => ({
        ...c,
        children: c.children.filter((s) => !s.archived || s.id === current),
      }));
  });

  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly showDetails = signal(!!this.op?.description);
  /** Doublons probables trouves ; l'enregistrement demande alors une confirmation. */
  protected readonly duplicates = signal<Operation[]>([]);
  private confirmedDuplicates = false;
  private readonly refundOfId = this.op?.refundOfId ?? this.preset.refundOfId ?? null;

  constructor() {
    this.store.ensure();
    // Compte propose par defaut : le premier compte courant ou especes, des que les comptes sont charges.
    effect(() => {
      const first = this.store.activeAccounts().find((a) => a.type !== 'SAVINGS');
      if (first && !untracked(() => this.form.controls.accountId.value)) {
        this.form.controls.accountId.setValue(first.id);
      }
    });
    // Toute modification invalide une confirmation de doublon deja donnee.
    this.form.valueChanges.subscribe(() => {
      this.confirmedDuplicates = false;
      this.duplicates.set([]);
      this.error.set('');
    });
  }

  protected setType(type: OperationType): void {
    this.form.controls.type.setValue(type);
    if (type !== 'EXPENSE') {
      this.form.patchValue({ essential: false, exceptional: false });
    }
  }

  protected async submit(): Promise<void> {
    const body = this.body();
    if (!body) return;
    this.saving.set(true);
    try {
      if (!this.confirmedDuplicates && this.shouldCheckDuplicates(body)) {
        const found = await firstValueFrom(
          this.api.duplicates(body.accountId, body.type, body.amount, body.date, this.op?.id ?? null),
        );
        if (found.length) {
          this.duplicates.set(found);
          this.confirmedDuplicates = true;
          return;
        }
      }
      await firstValueFrom(
        this.op?.id ? this.api.updateOperation(this.op.id, body) : this.api.createOperation(body),
      );
      this.ref.close(true);
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.saving.set(false);
    }
  }

  /** Construit le corps de la requete, ou affiche la premiere erreur de saisie. */
  private body(): OperationBody | null {
    const v = this.form.getRawValue();
    const amount = parseAmount(v.amount);
    const fail = (message: string) => {
      this.error.set(message);
      return null;
    };
    if (amount === null || amount <= 0) return fail('Saisissez un montant positif, au centime près (ex. 12,50).');
    if (!v.label.trim()) return fail('Le libellé est obligatoire.');
    if (!v.date) return fail('La date est obligatoire.');
    if (!v.accountId) return fail('Choisissez un compte.');
    if (v.status === 'COMPLETED' && v.date > this.today) {
      return fail('Une opération réalisée ne peut pas être datée dans le futur : choisissez « Prévue ».');
    }
    if (this.needsCategory() && !v.categoryId) return fail('Choisissez une catégorie.');
    if (v.type === 'TRANSFER' && (!v.targetAccountId || v.targetAccountId === v.accountId)) {
      return fail('Choisissez un compte destinataire différent.');
    }
    return {
      accountId: v.accountId,
      type: v.type,
      status: v.status,
      date: v.date,
      amount,
      label: v.label.trim(),
      description: v.description.trim() || null,
      categoryId: this.needsCategory() ? v.categoryId : null,
      incomeKind: v.type === 'INCOME' ? v.incomeKind : null,
      essential: v.type === 'EXPENSE' && v.essential,
      exceptional: v.type === 'EXPENSE' && v.exceptional,
      targetAccountId: v.type === 'TRANSFER' ? v.targetAccountId : null,
      refundOfId: v.type === 'PURCHASE_REFUND' ? this.refundOfId : null,
    };
  }

  /** On ne verifie les doublons qu'a la creation, ou si le montant, la date ou le compte changent. */
  private shouldCheckDuplicates(body: OperationBody): boolean {
    if (!this.op) return true;
    return (
      this.op.amount !== body.amount ||
      this.op.date !== body.date ||
      this.op.account.id !== body.accountId
    );
  }
}
