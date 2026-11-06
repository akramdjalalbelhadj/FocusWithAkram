import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { FinanceApi } from '../../../../core/api/finance.api';
import { formatMoney, parseAmount } from '../../../../core/util/money';
import { HelpTipComponent } from '../../../../shared/ui/help-tip/help-tip';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { MONTH_HELP } from '../../month-help';
import { isMonth, monthLabel } from '../../month-utils';
import { FinanceReferenceStore } from '../../services/finance-reference.store';

export interface EnvelopeDialogData {
  /** Premier mois propose (AAAA-MM). */
  month: string;
  /** Categories deja suivies par une depense variable (une seule enveloppe par categorie). */
  takenCategoryIds?: string[];
}

/**
 * Depense variable plafonnee (« enveloppe ») : une categorie et un plafond mensuel a partir d'un mois. Les depenses
 * de la categorie sont comptees automatiquement. Se ferme avec un message de succes.
 */
@Component({
  selector: 'ff-envelope-dialog',
  imports: [FormsModule, HelpTipComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './envelope-dialog.html',
})
export class EnvelopeDialogComponent {
  private readonly api = inject(FinanceApi);
  protected readonly store = inject(FinanceReferenceStore);
  protected readonly data = inject<EnvelopeDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<string>>(DialogRef);
  protected readonly help = MONTH_HELP;
  private readonly taken = new Set(this.data.takenCategoryIds ?? []);

  protected readonly categoryId = signal('');
  protected readonly amount = signal('');
  protected readonly fromMonth = signal(this.data.month);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly categories = computed(() => this.store.activeCategories());

  protected readonly summary = computed(() => {
    const amount = parseAmount(this.amount());
    const category = this.store.category(this.categoryId());
    if (!category || amount === null || amount <= 0 || !isMonth(this.fromMonth())) return '';
    return `${category.name} : ${formatMoney(amount)} au plus chaque mois, à partir de ${monthLabel(this.fromMonth())}.`;
  });

  constructor() {
    this.store.ensure();
  }

  protected isTaken(id: string): boolean {
    return this.taken.has(id);
  }

  protected async submit(): Promise<void> {
    const fail = (message: string) => this.error.set(message);
    const category = this.store.category(this.categoryId());
    const amount = parseAmount(this.amount());
    const month = this.fromMonth().trim();
    if (!category) return fail('Choisissez une catégorie (ex. Courses).');
    if (amount === null || amount <= 0) return fail('Saisissez un plafond positif, au centime près (ex. 300).');
    if (!isMonth(month)) return fail('Indiquez le premier mois (format AAAA-MM).');
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.createEnvelope({ categoryId: category.id, amount, fromMonth: month }));
      this.ref.close(
        `Dépense variable ajoutée : ${category.name}, plafond de ${formatMoney(amount)} par mois à partir de ${monthLabel(month)}.`,
      );
    } catch (e) {
      fail(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.saving.set(false);
    }
  }
}
