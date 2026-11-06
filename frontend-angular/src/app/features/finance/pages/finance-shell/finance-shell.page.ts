import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { ErrorComponent, SkeletonComponent } from '../../../../shared/ui/states';
import { FinanceTourService } from '../../components/finance-tour/finance-tour.service';
import { TourComponent } from '../../../../shared/ui/tour/tour';
import { FinanceActions } from '../../services/finance-actions.service';
import { FinanceReferenceStore } from '../../services/finance-reference.store';

/**
 * Entree unique du module « Mes achats » : en-tete (depense rapide, visite guidee, reglages) et quatre onglets.
 * Tant qu'aucun compte n'existe, une seule question : l'argent disponible aujourd'hui. A la premiere visite avec un
 * compte, la visite guidee demarre d'elle-meme.
 */
@Component({
  selector: 'ff-finance-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IconComponent,
    ErrorComponent,
    SkeletonComponent,
    TourComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './finance-shell.page.html',
  styleUrl: './finance-shell.page.css',
})
export class FinanceShellPage {
  protected readonly store = inject(FinanceReferenceStore);
  protected readonly actions = inject(FinanceActions);
  protected readonly tour = inject(FinanceTourService);
  protected readonly tabs = [
    { path: 'month', label: 'Mon mois', icon: 'sheet' },
    { path: 'operations', label: 'Opérations', icon: 'receipt' },
    { path: 'purchases', label: 'Projets d’achat', icon: 'cart' },
    { path: 'analyses', label: 'Analyses', icon: 'chart' },
  ];
  protected readonly needsSetup = computed(
    () => this.store.loaded() && !this.store.error() && this.store.account() === null,
  );

  constructor() {
    this.store.ensure();
    effect(() => {
      if (this.store.loaded() && this.store.account()) untracked(() => void this.tour.autoStart());
    });
  }
}
