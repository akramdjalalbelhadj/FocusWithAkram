import { Injectable, signal } from '@angular/core';

/**
 * Compteur de versions des donnees. Toute mutation (tache, session, projet...) l'incremente ; les pages
 * observent `tick()` dans un effect pour se recharger, ce qui garde matrice, listes, dashboard et
 * calendrier coherents sans etat dupliquee.
 */
@Injectable({ providedIn: 'root' })
export class RefreshService {
  readonly tick = signal(0);

  bump(): void {
    this.tick.update((n) => n + 1);
  }
}
