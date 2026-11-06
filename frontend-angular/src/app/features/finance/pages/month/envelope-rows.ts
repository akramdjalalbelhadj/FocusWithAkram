import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { EnvelopeRow, MonthSheet } from '../../../../core/api/models';
import { formatMoney } from '../../../../core/util/money';
import { HelpTipComponent } from '../../../../shared/ui/help-tip/help-tip';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { MONTH_HELP } from '../../month-help';
import { FinanceActions } from '../../services/finance-actions.service';
import { GaugeTone, envelopePercent, envelopeTone } from './month-view';

/**
 * Tableau des depenses variables plafonnees d'un mois : plafond, depense, reste, jauge et commentaire. Un
 * depassement met la ligne en avertissement et invite a l'expliquer. Sous 640 px, chaque ligne devient une carte.
 */
@Component({
  selector: 'ff-envelope-rows',
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger, IconComponent, HelpTipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './envelope-rows.html',
  styleUrl: './sheet-table.css',
})
export class EnvelopeRowsComponent {
  protected readonly actions = inject(FinanceActions);
  readonly rows = input.required<EnvelopeRow[]>();
  /** Mois affiche (AAAA-MM). */
  readonly month = input.required<string>();
  readonly period = input.required<MonthSheet['period']>();
  readonly caption = input.required<string>();

  protected readonly future = computed(() => this.period() === 'FUTURE');
  protected readonly help = MONTH_HELP;
  protected readonly money = formatMoney;

  protected percent(row: EnvelopeRow): number {
    return envelopePercent(row);
  }

  /** Remplissage de la jauge, borne a 100 % (le depassement se lit dans le pourcentage et la couleur). */
  protected fill(row: EnvelopeRow): number {
    return Math.min(100, envelopePercent(row));
  }

  protected tone(row: EnvelopeRow): GaugeTone {
    return envelopeTone(row);
  }

  protected count(row: EnvelopeRow): string {
    const n = row.operationCount;
    return n === 0 ? 'Aucune dépense' : n === 1 ? '1 dépense' : `${n} dépenses`;
  }
}
