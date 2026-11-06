import { Dialog } from '@angular/cdk/dialog';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FinanceApi } from '../../../../core/api/finance.api';
import { TourEngine } from '../../../../shared/ui/tour/tour-engine';
import { FINANCE_TOUR_STEPS } from './tour-steps';

/** Repere que la feuille du mois affiche une fois chargee : la visite attend qu'il soit la. */
const SHEET_READY = 'month-summary';

/**
 * Visite guidee de « Mes achats » : demarre seule a la premiere visite (preference `tutorialDone` fausse), se relance
 * par le bouton « ? » ou depuis les reglages. Terminee ou passee, elle est enregistree dans les preferences.
 */
@Injectable({ providedIn: 'root' })
export class FinanceTourService extends TourEngine {
  private readonly api = inject(FinanceApi);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);

  protected readonly replayTarget = 'tour-button';

  /** La preference n'est consultee qu'une fois par session : passer la visite ne la fait pas revenir. */
  private autoChecked = false;

  /** Premiere visite du module (un compte existe) : lance la visite si elle n'a jamais ete terminee ni passee. */
  async autoStart(): Promise<void> {
    if (this.autoChecked) return;
    this.autoChecked = true;
    try {
      const prefs = await firstValueFrom(this.api.preferences());
      if (prefs.tutorialDone) return;
    } catch {
      return;
    }
    // Un dialogue ouvert (saisie du solde de depart, depense) se termine d'abord.
    if (this.dialog.openDialogs.length) await firstValueFrom(this.dialog.afterAllClosed);
    await this.start();
  }

  /** Ouvre « Mon mois », attend la feuille puis montre les etapes dont la cible est presente. */
  async start(): Promise<void> {
    if (this.active() || this.starting()) return;
    this.autoChecked = true;
    this.starting.set(true);
    try {
      // Deja sur Mon mois : le mois affiche (parametres de l'adresse) est conserve.
      if (this.router.url.split(/[?#;]/)[0] !== '/finance/month') {
        const ok = await this.router.navigate(['/finance', 'month']);
        if (!ok) return;
      }
      await this.waitFor(() => this.present(SHEET_READY), 4000);
      // Laisse les sections de la feuille finir leur affichage.
      await new Promise((resolve) => setTimeout(resolve, 150));
      this.begin(FINANCE_TOUR_STEPS);
    } finally {
      this.starting.set(false);
    }
  }

  /** Enregistre `tutorialDone` en conservant les autres preferences (lecture puis ecriture du corps complet). */
  protected async markDone(): Promise<void> {
    try {
      const prefs = await firstValueFrom(this.api.preferences());
      if (prefs.tutorialDone) return;
      await firstValueFrom(this.api.updatePreferences({ ...prefs, tutorialDone: true }));
    } catch {
      // Sans enregistrement, la visite sera simplement proposee a nouveau lors d'une prochaine session.
    }
  }
}
