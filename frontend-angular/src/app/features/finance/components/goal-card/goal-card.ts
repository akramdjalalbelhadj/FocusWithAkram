import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Goal } from '../../../../core/api/models';
import { formatMoney } from '../../../../core/util/money';
import { longDate } from '../../../../core/util/time';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { VERDICT, feasibilityNotes, feasibilitySentence } from '../../feasibility-text';
import { FinanceActions } from '../../services/finance-actions.service';

const STATUS_LABEL: Record<Goal['status'], string> = {
  CONSIDERED: 'Envisagé',
  PLANNED: 'Planifié',
  POSTPONED: 'Reporté',
  PURCHASED: 'Acheté',
  ABANDONED: 'Abandonné',
};

const QUADRANT_MOVES = [
  { key: 'Q1', label: 'Q1 · Important et urgent', important: true, urgent: true },
  { key: 'Q2', label: 'Q2 · Important, non urgent', important: true, urgent: false },
  { key: 'Q3', label: 'Q3 · Urgent, non important', important: false, urgent: true },
  { key: 'Q4', label: 'Q4 · Ni urgent ni important', important: false, urgent: false },
] as const;

/** Carte d'un objectif d'achat : prix, date, reservation, verdict de faisabilite explique et actions. */
@Component({
  selector: 'ff-goal-card',
  imports: [IconComponent, CdkMenuTrigger, CdkMenu, CdkMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './goal-card.html',
})
export class GoalCardComponent {
  protected readonly actions = inject(FinanceActions);
  readonly goal = input.required<Goal>();
  /** Version resserree pour la matrice (sans phrase explicative). */
  readonly compact = input(false);

  protected readonly money = formatMoney;
  protected readonly longDate = longDate;
  protected readonly verdicts = VERDICT;
  protected readonly statusLabel = STATUS_LABEL;
  /** Deplacement au clavier vers un autre quadrant (alternative au glisser-deposer). */
  protected readonly moves = computed(() => QUADRANT_MOVES.filter((q) => q.key !== this.goal().quadrant));
  protected readonly open = computed(() => ['CONSIDERED', 'PLANNED', 'POSTPONED'].includes(this.goal().status));
  /** Part du prix deja reservee (affichage seulement). */
  protected readonly funded = computed(() => {
    const g = this.goal();
    return Math.min(100, Math.round((g.reservedAmount / g.estimatedPrice) * 100));
  });
  protected readonly sentence = computed(() => {
    const f = this.goal().feasibility;
    return f ? feasibilitySentence(f) : '';
  });
  protected readonly notes = computed(() => {
    const f = this.goal().feasibility;
    return f ? feasibilityNotes(f) : [];
  });
  protected readonly gap = computed(() => {
    const g = this.goal();
    return g.purchasedAmount === null ? null : Math.round((g.purchasedAmount - g.estimatedPrice) * 100) / 100;
  });
}
