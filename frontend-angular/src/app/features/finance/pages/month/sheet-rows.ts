import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { IncomeKind, MonthSheet, SheetRow } from '../../../../core/api/models';
import { formatMoney, formatSignedMoney } from '../../../../core/util/money';
import { HelpTipComponent } from '../../../../shared/ui/help-tip/help-tip';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { INCOME_KINDS } from '../../finance-labels';
import { MONTH_HELP } from '../../month-help';
import { shortDate } from '../../month-utils';
import { FinanceActions } from '../../services/finance-actions.service';
import { ROW_STATUS_BADGE, SheetKind, differenceTone, rowStatusLabel } from './month-view';

const KIND_LABEL = Object.fromEntries(INCOME_KINDS.map((k) => [k.value, k.label])) as Record<IncomeKind, string>;

/**
 * Tableau des revenus ou des depenses fixes d'un mois : prevu, reel, ecart et etat de chaque ligne, avec ses
 * actions. Sous 640 px, chaque ligne devient une carte.
 */
@Component({
  selector: 'ff-sheet-rows',
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger, IconComponent, HelpTipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sheet-rows.html',
  styleUrl: './sheet-table.css',
})
export class SheetRowsComponent {
  protected readonly actions = inject(FinanceActions);
  readonly rows = input.required<SheetRow[]>();
  readonly kind = input.required<SheetKind>();
  /** Mois affiche (AAAA-MM). */
  readonly month = input.required<string>();
  readonly period = input.required<MonthSheet['period']>();
  /** Legende du tableau, pour les lecteurs d'ecran. */
  readonly caption = input.required<string>();

  protected readonly income = computed(() => this.kind() === 'income');
  /** Mois futur : le reel n'est pas encore saisissable. */
  protected readonly future = computed(() => this.period() === 'FUTURE');
  protected readonly help = MONTH_HELP;
  protected readonly money = formatMoney;
  protected readonly shortDate = shortDate;
  protected readonly badge = ROW_STATUS_BADGE;

  protected status(row: SheetRow): string {
    return rowStatusLabel(row.status, this.kind());
  }

  protected tone(row: SheetRow): string {
    return differenceTone(row.difference, this.kind());
  }

  protected difference(row: SheetRow): string {
    if (row.difference === null) return '—';
    return row.difference === 0 ? formatMoney(0) : formatSignedMoney(row.difference);
  }

  /** Categorie (depense) ou origine (revenu) de la ligne, sauf si elle repete le libelle. */
  protected detail(row: SheetRow): string {
    const c = row.category;
    const text = c
      ? c.rootId === c.id
        ? c.name
        : `${c.rootName} › ${c.name}`
      : row.incomeKind
        ? KIND_LABEL[row.incomeKind]
        : '';
    return text.trim().toLowerCase() === row.label.trim().toLowerCase() ? '' : text;
  }

  /** Le reel se saisit (ou se corrige) sauf pour un mois futur ou une ligne sautee. */
  protected canRecord(row: SheetRow): boolean {
    return !this.future() && row.status !== 'SKIPPED';
  }

  protected recordLabel(row: SheetRow): string {
    return `${this.income() ? 'Saisir le montant reçu' : 'Saisir le montant payé'} : ${row.label}`;
  }
}
