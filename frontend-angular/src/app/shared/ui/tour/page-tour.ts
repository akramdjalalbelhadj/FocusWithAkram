import { Dialog } from '@angular/cdk/dialog';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Settings } from '../../../core/api/models';
import { SettingsStore } from '../../../core/services/settings.store';
import { TourEngine } from './tour-engine';
import { TourStep } from './tour-model';

/** Parametres utilisateur qui retiennent qu'un tutoriel de page a ete termine ou passe. */
export type TutorialSetting = 'notesTutorialDone' | 'matrixTutorialDone';

const pathOf = (url: string) => url.split(/[?#;]/)[0];

/**
 * Tutoriel d'une page (Notes & idées, matrice…) : demarre seul a la premiere visite de la page tant que le parametre
 * `setting` est faux, se relance par le bouton de la page. Termine ou passe, il est enregistre dans les parametres.
 */
export abstract class PageTourEngine extends TourEngine {
  private readonly settings = inject(SettingsStore);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);

  /** Adresse de la page (ex. « /notes »). */
  protected abstract readonly route: string;
  /** Reperes a attendre avant de commencer (la page et son contenu charge). */
  protected abstract readonly readyTargets: readonly string[];
  /** Etapes du tutoriel ; celles dont la cible est absente sont sautees. */
  protected abstract readonly tourSteps: readonly TourStep[];
  /** Parametre qui retient le tutoriel termine ou passe. */
  protected abstract readonly setting: TutorialSetting;

  /** Le parametre n'est consulte qu'une fois par session : passer le tutoriel ne le fait pas revenir. */
  private autoChecked = false;

  /** Premiere visite de la page : lance le tutoriel s'il n'a jamais ete termine ni passe. */
  async autoStart(): Promise<void> {
    if (this.autoChecked) return;
    this.autoChecked = true;
    await this.waitFor(() => this.settings.loaded(), 5000);
    // Parametres absents (serveur injoignable) : rien n'est affiche plutot qu'un tutoriel deja vu.
    if (this.settings.settings()[this.setting] !== false) return;
    // Une saisie en cours (tache, idee rapide) se termine d'abord.
    if (this.dialog.openDialogs.length) await firstValueFrom(this.dialog.afterAllClosed);
    // L'utilisateur a quitte la page entre-temps : le tutoriel attendra sa prochaine visite.
    if (!this.onPage()) {
      this.autoChecked = false;
      return;
    }
    await this.start();
  }

  /** Ouvre la page, attend son affichage puis montre les etapes dont la cible est presente. */
  async start(): Promise<void> {
    if (this.active() || this.starting()) return;
    this.autoChecked = true;
    this.starting.set(true);
    try {
      if (!this.onPage()) {
        const ok = await this.router.navigateByUrl(this.route);
        if (!ok) return;
      }
      await this.waitFor(() => this.readyTargets.every((t) => this.present(t)), 4000);
      // Laisse la page finir son affichage.
      await new Promise((resolve) => setTimeout(resolve, 150));
      this.begin(this.tourSteps);
    } finally {
      this.starting.set(false);
    }
  }

  protected async markDone(): Promise<void> {
    if (this.settings.settings()[this.setting]) return;
    try {
      await this.settings.update({ [this.setting]: true } as Partial<Settings>);
    } catch {
      // Sans enregistrement, le tutoriel sera simplement propose a nouveau lors d'une prochaine session.
    }
  }

  private onPage(): boolean {
    return pathOf(this.router.url) === this.route;
  }
}
