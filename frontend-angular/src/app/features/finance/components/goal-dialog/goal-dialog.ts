import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, firstValueFrom, map, of, switchMap } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { FinanceApi } from '../../../../core/api/finance.api';
import { Goal, GoalBody, GoalFeasibility } from '../../../../core/api/models';
import { SettingsStore } from '../../../../core/services/settings.store';
import { amountInput, formatMoney, parseAmount } from '../../../../core/util/money';
import { longDate } from '../../../../core/util/time';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { VERDICT, feasibilityDetails, feasibilityNotes, feasibilitySentence } from '../../feasibility-text';
import { FinanceReferenceStore } from '../../services/finance-reference.store';

/** Valeurs du formulaire (partielles pendant la saisie). */
interface GoalFormValue {
  name?: string;
  estimatedPrice?: string;
  maxPrice?: string;
  targetDate?: string;
  categoryId?: string;
  important?: boolean;
  urgent?: boolean;
  status?: 'CONSIDERED' | 'PLANNED';
  fundedBySavings?: boolean;
  description?: string;
  notes?: string;
}

/**
 * Creation ou modification d'un objectif d'achat, avec apercu de faisabilite recalcule pendant la saisie et
 * alternatives (reporter, reduire le budget, epargner davantage, changer la priorite). Un objectif ambitieux
 * s'enregistre toujours : l'avertissement n'est jamais bloquant.
 */
@Component({
  selector: 'ff-goal-dialog',
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './goal-dialog.html',
})
export class GoalDialogComponent {
  private readonly api = inject(FinanceApi);
  protected readonly store = inject(FinanceReferenceStore);
  protected readonly data = inject<{ goal: Goal | null; important?: boolean; urgent?: boolean }>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly g = this.data.goal;
  private readonly today = inject(SettingsStore).today();
  protected readonly verdicts = VERDICT;
  protected readonly money = formatMoney;
  protected readonly longDate = longDate;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.g?.name ?? ''],
    estimatedPrice: [amountInput(this.g?.estimatedPrice)],
    maxPrice: [amountInput(this.g?.maxPrice)],
    targetDate: [this.g?.targetDate ?? this.inMonths(2)],
    categoryId: [this.g?.category?.id ?? ''],
    important: [this.g?.important ?? this.data.important ?? false],
    urgent: [this.g?.urgent ?? this.data.urgent ?? false],
    status: [(this.g?.status === 'CONSIDERED' ? 'CONSIDERED' : 'PLANNED') as 'CONSIDERED' | 'PLANNED'],
    fundedBySavings: [this.g?.fundedBySavings ?? false],
    description: [this.g?.description ?? ''],
    notes: [this.g?.notes ?? ''],
  });
  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly categories = computed(() => this.store.activeCategories());
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  /** Apercu de faisabilite, recalcule 400 ms apres la derniere modification d'un champ utile. */
  protected readonly preview = toSignal(
    toObservable(computed(() => this.body(this.value()))).pipe(
      debounceTime(400),
      switchMap((body) =>
        body
          ? this.api.previewGoal(body, this.g?.id ?? null).pipe(
              map((f) => ({ loading: false, feasibility: f as GoalFeasibility | null })),
              catchError(() => of({ loading: false, feasibility: null })),
            )
          : of({ loading: false, feasibility: null }),
      ),
    ),
    { initialValue: { loading: true, feasibility: null as GoalFeasibility | null } },
  );
  protected readonly sentence = computed(() => {
    const f = this.preview().feasibility;
    return f ? feasibilitySentence(f) : '';
  });
  protected readonly details = computed(() => {
    const f = this.preview().feasibility;
    return f ? feasibilityDetails(f) : [];
  });
  protected readonly notes = computed(() => {
    const f = this.preview().feasibility;
    return f ? feasibilityNotes(f) : [];
  });

  constructor() {
    this.store.ensure();
  }

  // ---- Alternatives proposees quand l'achat n'est pas realisable ----

  protected postponeTo(date: string): void {
    this.form.patchValue({ targetDate: date });
  }

  protected reduceTo(amount: number): void {
    this.form.patchValue({ estimatedPrice: amountInput(Math.floor(amount * 100) / 100) });
  }

  protected raisePriority(): void {
    this.form.patchValue({ important: true });
  }

  protected async submit(): Promise<void> {
    const body = this.body(this.form.getRawValue());
    if (!body) {
      this.error.set(this.validationMessage());
      return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(this.g ? this.api.updateGoal(this.g.id, body) : this.api.createGoal(body));
      this.ref.close(true);
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.saving.set(false);
    }
  }

  private body(v: GoalFormValue): GoalBody | null {
    const price = parseAmount(v.estimatedPrice);
    const max = v.maxPrice?.trim() ? parseAmount(v.maxPrice) : null;
    if (!v.name?.trim() || price === null || price <= 0 || !v.targetDate) return null;
    if (v.maxPrice?.trim() && (max === null || max < price)) return null;
    return {
      name: v.name.trim(),
      categoryId: v.categoryId || null,
      description: v.description?.trim() || null,
      estimatedPrice: price,
      maxPrice: max,
      targetDate: v.targetDate,
      important: !!v.important,
      urgent: !!v.urgent,
      status: v.status ?? 'PLANNED',
      fundedBySavings: !!v.fundedBySavings,
      notes: v.notes?.trim() || null,
    };
  }

  private validationMessage(): string {
    const v = this.form.getRawValue();
    const price = parseAmount(v.estimatedPrice);
    if (!v.name.trim()) return 'Le nom est obligatoire.';
    if (price === null || price <= 0) return 'Saisissez un prix estimé positif, au centime près.';
    if (!v.targetDate) return 'La date cible est obligatoire.';
    return 'Le montant maximal acceptable doit être un montant supérieur ou égal au prix estimé.';
  }

  private inMonths(months: number): string {
    const [y, m, d] = this.today.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1 + months, Math.min(d, 28)));
    return date.toISOString().slice(0, 10);
  }
}
