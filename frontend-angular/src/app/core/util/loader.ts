import { DestroyRef, effect, inject, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { RefreshService } from '../services/refresh.service';

/**
 * Chargement de donnees d'une page avec etats loading / error / data. `fetch` est appele de facon synchrone
 * dans un effect : les signaux qu'il lit (filtres, periode...) et `RefreshService.tick` declenchent
 * automatiquement un rechargement. Un nouveau chargement annule la requete precedente encore en cours.
 * A instancier dans un contexte d'injection (constructeur ou initialiseur de champ).
 */
export class Loader<T> {
  readonly data = signal<T | null>(null);
  /** Vrai uniquement au premier chargement : les rechargements suivants gardent l'ecran stable. */
  readonly loading = signal(true);
  readonly error = signal(false);
  private current: Subscription | null = null;
  private readonly fetch: () => Observable<T>;

  constructor(fetch: () => Observable<T>) {
    this.fetch = fetch;
    const refresh = inject(RefreshService);
    effect(() => {
      refresh.tick();
      this.load();
    });
    inject(DestroyRef).onDestroy(() => this.current?.unsubscribe());
  }

  load(): void {
    // Se desabonner d'une requete HttpClient l'interrompt : la reponse obsolete n'arrive jamais.
    this.current?.unsubscribe();
    this.current = this.fetch().subscribe({
      next: (result) => {
        this.data.set(result);
        this.error.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
