import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { FinanceApi } from '../../../../core/api/finance.api';
import { Goal } from '../../../../core/api/models';
import { SettingsStore } from '../../../../core/services/settings.store';
import { amountInput, formatMoney, parseAmount } from '../../../../core/util/money';
import { FinanceReferenceStore } from '../../services/finance-reference.store';

/**
 * Achat reel d'un objectif : prix et date reels, compte debite. La depense creee est liee a l'objectif et ne
 * consomme pas le plafond variable ; la reservation est liberee.
 */
@Component({
  selector: 'ff-purchase-dialog',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './purchase-dialog.html',
})
export class PurchaseDialogComponent {
  private readonly api = inject(FinanceApi);
  protected readonly store = inject(FinanceReferenceStore);
  protected readonly goal = inject<Goal>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly today = inject(SettingsStore).today();
  protected readonly money = formatMoney;
  protected readonly amount = signal(amountInput(this.goal.estimatedPrice));
  protected readonly date = signal(this.today);
  protected readonly accountId = signal(
    this.store.activeAccounts().find((a) => a.type !== 'SAVINGS')?.id ?? '',
  );
  protected readonly categoryId = signal(this.goal.category?.id ?? '');
  protected readonly accounts = computed(() => this.store.activeAccounts());
  protected readonly categories = computed(() => this.store.activeCategories());
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected async submit(): Promise<void> {
    const amount = parseAmount(this.amount());
    if (amount === null || amount <= 0) return this.error.set('Saisissez le prix réellement payé.');
    if (!this.date() || this.date() > this.today) return this.error.set('La date d’achat ne peut pas être future.');
    if (!this.accountId()) return this.error.set('Choisissez le compte débité.');
    if (!this.categoryId()) return this.error.set('Choisissez la catégorie de la dépense.');
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.api.purchaseGoal(this.goal.id, {
          amount,
          date: this.date(),
          accountId: this.accountId(),
          categoryId: this.categoryId(),
          label: null,
        }),
      );
      this.ref.close(true);
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.saving.set(false);
    }
  }
}
