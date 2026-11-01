import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FinanceApi } from '../../../../core/api/finance.api';
import { FinanceCategory } from '../../../../core/api/models';
import { Loader } from '../../../../core/util/loader';
import { amountInput, formatMoney, parseAmount } from '../../../../core/util/money';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { ACCOUNT_TYPE_LABEL, ACCOUNT_TYPES } from '../../finance-labels';
import { FinanceActions } from '../../services/finance-actions.service';
import { FinanceReferenceStore } from '../../services/finance-reference.store';

/** Gestion des comptes et des categories (creation, modification, archivage, suppression si inutilises). */
@Component({
  selector: 'ff-finance-settings',
  imports: [IconComponent, CdkMenuTrigger, CdkMenu, CdkMenuItem, NgTemplateOutlet, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './finance-settings.page.html',
})
export class FinanceSettingsPage {
  protected readonly store = inject(FinanceReferenceStore);
  protected readonly actions = inject(FinanceActions);
  protected readonly money = formatMoney;
  protected readonly typeLabel = ACCOUNT_TYPE_LABEL;
  protected readonly typeIcon = Object.fromEntries(ACCOUNT_TYPES.map((t) => [t.value, t.icon]));
  protected readonly showArchived = signal(false);

  protected readonly accounts = computed(() =>
    this.store.accounts().filter((a) => this.showArchived() || !a.archived),
  );
  protected readonly categories = computed(() =>
    this.store
      .categories()
      .filter((c) => this.showArchived() || !c.archived)
      .map((c) => ({
        ...c,
        children: c.children.filter((s) => this.showArchived() || !s.archived),
      })),
  );

  /** Une categorie se supprime seulement si elle n'a jamais servi et n'a pas de sous-categorie. */
  protected deletable(c: FinanceCategory): boolean {
    return c.operationCount === 0 && c.children.length === 0;
  }

  /** Preferences financieres, editees comme textes (saisie a la francaise) puis validees a l'enregistrement. */
  private readonly api = inject(FinanceApi);
  protected readonly prefs = new Loader(() => this.api.preferences());
  protected readonly reserve = signal('');
  protected readonly floor = signal('');
  protected readonly cap = signal('');
  protected readonly target = signal('');
  protected readonly warning = signal('80');
  protected readonly prefsError = signal('');

  constructor() {
    this.store.ensure();
    effect(() => {
      const p = this.prefs.data();
      if (!p) return;
      this.reserve.set(amountInput(p.safetyReserve));
      this.floor.set(amountInput(p.savingsFloor));
      this.cap.set(amountInput(p.defaultVariableCap));
      this.target.set(amountInput(p.defaultSavingsTarget));
      this.warning.set(String(p.warningPercent));
    });
  }

  protected async savePreferences(): Promise<void> {
    const amount = (text: string, optional: boolean) => (optional && !text.trim() ? null : parseAmount(text || '0'));
    const reserve = amount(this.reserve(), false);
    const floor = amount(this.floor(), false);
    const cap = amount(this.cap(), true);
    const target = amount(this.target(), true);
    const warning = Number(this.warning());
    if (reserve === null || floor === null || (this.cap().trim() && cap === null) || (this.target().trim() && target === null)) {
      this.prefsError.set('Montant invalide : saisissez des montants positifs au centime près.');
      return;
    }
    if (!Number.isInteger(warning) || warning < 1 || warning > 100) {
      this.prefsError.set('Le seuil d’alerte est un pourcentage entier entre 1 et 100.');
      return;
    }
    this.prefsError.set('');
    await this.actions.savePreferences({
      safetyReserve: reserve,
      savingsFloor: floor,
      defaultVariableCap: cap,
      defaultSavingsTarget: target,
      warningPercent: warning,
    });
  }
}
