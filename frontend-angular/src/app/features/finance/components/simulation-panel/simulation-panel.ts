import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { FinanceApi } from '../../../../core/api/finance.api';
import { Goal, GoalFeasibility, SimulationBody, SimulationResult } from '../../../../core/api/models';
import { SettingsStore } from '../../../../core/services/settings.store';
import { formatMoney, formatSignedMoney, parseAmount } from '../../../../core/util/money';
import { longDate } from '../../../../core/util/time';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { VERDICT, feasibilitySentence } from '../../feasibility-text';

interface GoalChange {
  name: string;
  before: GoalFeasibility | null;
  after: GoalFeasibility | null;
}

/**
 * Simulation « Et si… ? » : hypotheses appliquees par le serveur au meme calcul que la prevision, sans rien
 * enregistrer ; le resultat est compare a la prevision actuelle.
 */
@Component({
  selector: 'ff-simulation-panel',
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './simulation-panel.html',
})
export class SimulationPanelComponent {
  private readonly api = inject(FinanceApi);
  protected readonly today = inject(SettingsStore).today();
  /** Objectifs ouverts, dans l'ordre de priorite. */
  readonly goals = input.required<Goal[]>();

  protected readonly salaryDelta = signal('');
  protected readonly variableReduction = signal('');
  protected readonly extraName = signal('');
  protected readonly extraPrice = signal('');
  protected readonly extraDate = signal('');
  protected readonly extraImportant = signal(true);
  protected readonly extraUrgent = signal(false);
  protected readonly postponeId = signal('');
  protected readonly postponeDate = signal('');
  protected readonly excluded = signal<string[]>([]);

  protected readonly running = signal(false);
  protected readonly error = signal('');
  protected readonly result = signal<SimulationResult | null>(null);
  protected readonly extraName$ = signal('');
  protected readonly money = formatMoney;
  protected readonly signed = formatSignedMoney;
  protected readonly longDate = longDate;
  protected readonly verdict = VERDICT;
  protected readonly sentence = feasibilitySentence;

  protected readonly changes = computed<GoalChange[]>(() => {
    const r = this.result();
    if (!r) return [];
    const before = new Map(r.baseline.goals.map((g) => [g.goalId, g]));
    const after = new Map(r.simulated.goals.map((g) => [g.goalId, g]));
    return this.goals()
      .map((g) => ({ name: g.name, before: before.get(g.id) ?? null, after: after.get(g.id) ?? null }))
      .filter((c) => c.before || c.after);
  });
  protected readonly extra = computed(() => {
    const r = this.result();
    return r?.extraGoalId ? (r.simulated.goals.find((g) => g.goalId === r.extraGoalId) ?? null) : null;
  });

  protected toggleExcluded(id: string, checked: boolean): void {
    this.excluded.update((list) => (checked ? [...list, id] : list.filter((x) => x !== id)));
  }

  protected reset(): void {
    for (const s of [this.salaryDelta, this.variableReduction, this.extraName, this.extraPrice, this.extraDate,
      this.postponeId, this.postponeDate]) s.set('');
    this.excluded.set([]);
    this.result.set(null);
    this.error.set('');
  }

  protected async run(): Promise<void> {
    this.error.set('');
    const body: SimulationBody = {};
    if (this.salaryDelta().trim()) {
      const v = parseAmount(this.salaryDelta(), true);
      if (v === null) return this.error.set('Variation de salaire invalide (ex. -200 ou 150).');
      body.salaryDelta = v;
    }
    if (this.variableReduction().trim()) {
      const v = parseAmount(this.variableReduction());
      if (v === null || v < 0) return this.error.set('Réduction des dépenses invalide (ex. 100).');
      body.variableReduction = v;
    }
    if (this.extraName().trim() || this.extraPrice().trim()) {
      const price = parseAmount(this.extraPrice());
      if (!this.extraName().trim() || price === null || price <= 0 || !this.extraDate())
        return this.error.set('Pour un achat supplémentaire, indiquez le nom, le prix et la date.');
      body.extraPurchase = {
        name: this.extraName().trim(),
        categoryId: null,
        description: null,
        estimatedPrice: price,
        maxPrice: null,
        targetDate: this.extraDate(),
        important: this.extraImportant(),
        urgent: this.extraUrgent(),
        status: 'PLANNED',
        fundedBySavings: false,
        notes: null,
      };
    }
    if (this.postponeId()) {
      if (!this.postponeDate()) return this.error.set('Choisissez la nouvelle date de l’achat reporté.');
      body.postponements = [{ goalId: this.postponeId(), targetDate: this.postponeDate() }];
    }
    if (this.excluded().length) body.excludedGoalIds = this.excluded();
    this.running.set(true);
    try {
      this.extraName$.set(this.extraName().trim());
      this.result.set(await firstValueFrom(this.api.simulate(body)));
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.running.set(false);
    }
  }
}
