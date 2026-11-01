import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { ErrorComponent, SkeletonComponent } from '../../../../shared/ui/states';
import { FinanceActions } from '../../services/finance-actions.service';
import { FinanceReferenceStore } from '../../services/finance-reference.store';

/**
 * Entree unique du module « Mes achats » : en-tete, saisie rapide et onglets. Tant qu'aucun compte n'existe,
 * propose de saisir le solde de depart.
 */
@Component({
  selector: 'ff-finance-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ErrorComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './finance-shell.page.html',
  styleUrl: './finance-shell.page.css',
})
export class FinanceShellPage {
  protected readonly store = inject(FinanceReferenceStore);
  protected readonly actions = inject(FinanceActions);
  protected readonly tabs = [
    { path: 'overview', label: 'Vue d’ensemble', icon: 'dashboard' },
    { path: 'operations', label: 'Opérations', icon: 'receipt' },
    { path: 'settings', label: 'Réglages', icon: 'settings' },
  ];
  protected readonly needsSetup = computed(
    () => this.store.loaded() && !this.store.error() && this.store.accounts().length === 0,
  );

  constructor() {
    this.store.ensure();
  }
}
