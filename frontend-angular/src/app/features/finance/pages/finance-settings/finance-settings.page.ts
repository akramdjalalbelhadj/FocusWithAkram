import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FinanceCategory } from '../../../../core/api/models';
import { formatMoney } from '../../../../core/util/money';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { ACCOUNT_TYPE_LABEL, ACCOUNT_TYPES } from '../../finance-labels';
import { FinanceActions } from '../../services/finance-actions.service';
import { FinanceReferenceStore } from '../../services/finance-reference.store';

/** Gestion des comptes et des categories (creation, modification, archivage, suppression si inutilises). */
@Component({
  selector: 'ff-finance-settings',
  imports: [IconComponent, CdkMenuTrigger, CdkMenu, CdkMenuItem, NgTemplateOutlet],
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

  constructor() {
    this.store.ensure();
  }
}
