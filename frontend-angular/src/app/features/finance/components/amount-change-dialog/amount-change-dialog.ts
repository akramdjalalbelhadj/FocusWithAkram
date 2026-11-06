import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { FinanceApi } from '../../../../core/api/finance.api';
import { AmountVersion } from '../../../../core/api/models';
import { RefreshService } from '../../../../core/services/refresh.service';
import { amountInput, formatMoney, parseAmount } from '../../../../core/util/money';
import { HelpTipComponent } from '../../../../shared/ui/help-tip/help-tip';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { MONTH_HELP } from '../../month-help';
import { isMonth, monthLabel } from '../../month-utils';

export interface AmountChangeDialogData {
  /** Echeancier (revenu, depense fixe) ou plafond d'une depense variable. */
  target: 'schedule' | 'envelope';
  id: string;
  /** Libelle de la ligne (« Loyer », « Courses »). */
  label: string;
  /** Mois affiche (AAAA-MM) : valeur proposee pour « à partir de ». */
  month: string;
  /** Montant prevu (ou plafond) du mois affiche. */
  current: number | null;
  /** Montants dates deja enregistres. */
  versions: AmountVersion[];
  /** Montant de l'echeancier, applique sans version. */
  baseAmount?: number | null;
  /** Premier mois possible (debut de l'echeancier ou de l'enveloppe). */
  minMonth?: string | null;
}

/**
 * Changement de montant « à partir de ce mois » : les mois precedents gardent leur montant. Affiche l'historique
 * des montants dates ; pour un echeancier, une version (sauf la premiere) peut etre retiree. Se ferme avec un
 * message de succes.
 */
@Component({
  selector: 'ff-amount-change-dialog',
  imports: [FormsModule, HelpTipComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './amount-change-dialog.html',
})
export class AmountChangeDialogComponent {
  private readonly api = inject(FinanceApi);
  private readonly refresh = inject(RefreshService);
  protected readonly data = inject<AmountChangeDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<string>>(DialogRef);
  protected readonly money = formatMoney;
  protected readonly monthLabel = monthLabel;
  protected readonly help = MONTH_HELP;
  protected readonly isCap = this.data.target === 'envelope';

  protected readonly amount = signal(amountInput(this.data.current));
  protected readonly fromMonth = signal(this.data.month);
  protected readonly versions = signal(sortVersions(this.data.versions));
  protected readonly saving = signal(false);
  protected readonly removing = signal<string | null>(null);
  protected readonly error = signal('');

  /** Premiere version : elle ne peut pas etre retiree. */
  protected readonly firstMonth = computed(() => this.versions()[0]?.fromMonth ?? null);
  protected readonly preview = computed(() => {
    const month = this.fromMonth();
    const value = parseAmount(this.amount());
    if (!isMonth(month) || value === null) return '';
    return `${formatMoney(value)} à partir de ${monthLabel(month)} ; les mois précédents ne changent pas.`;
  });

  protected async submit(): Promise<void> {
    const amount = parseAmount(this.amount());
    const month = this.fromMonth().trim();
    if (amount === null || amount <= 0) {
      this.error.set('Saisissez un montant positif, au centime près (ex. 400 ou 12,50).');
      return;
    }
    if (!isMonth(month)) {
      this.error.set('Indiquez le mois à partir duquel le montant change (format AAAA-MM).');
      return;
    }
    const min = this.data.minMonth;
    if (min && month < min) {
      this.error.set(`Le mois doit être au plus tôt ${monthLabel(min)}, premier mois suivi.`);
      return;
    }
    const change = { fromMonth: month, amount };
    const call: Observable<unknown> = this.isCap
      ? this.api.changeEnvelopeAmount(this.data.id, change)
      : this.api.changeScheduleAmount(this.data.id, change);
    this.saving.set(true);
    try {
      await firstValueFrom(call);
      const what = this.isCap ? 'Plafond' : 'Montant';
      this.ref.close(`${what} « ${this.data.label} » : ${formatMoney(amount)} à partir de ${monthLabel(month)}.`);
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.saving.set(false);
    }
  }

  /** Retire une version datee d'un echeancier : le montant precedent s'applique de nouveau. */
  protected async remove(version: AmountVersion): Promise<void> {
    this.removing.set(version.fromMonth);
    this.error.set('');
    try {
      const schedule = await firstValueFrom(this.api.deleteScheduleAmount(this.data.id, version.fromMonth));
      this.versions.set(sortVersions(schedule.amounts ?? []));
      this.refresh.bump();
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.removing.set(null);
    }
  }
}

function sortVersions(versions: AmountVersion[]): AmountVersion[] {
  return [...versions].sort((a, b) => a.fromMonth.localeCompare(b.fromMonth));
}
