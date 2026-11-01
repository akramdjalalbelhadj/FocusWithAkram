import { effect, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { RefreshService } from '../services/refresh.service';

/**
 * Chargement de donnees d'une page avec etats loading / error / data. `fetch` est appele de facon synchrone
 * dans un effect : les signaux qu'il lit (filtres, periode...) et `RefreshService.tick` declenchent
 * automatiquement un rechargement. Seule la reponse la plus recente est conservee.
 * A instancier dans un contexte d'injection (constructeur ou initialiseur de champ).
 */
export class Loader<T> {
  readonly data = signal<T | null>(null);
  /** Vrai uniquement au premier chargement : les rechargements suivants gardent l'ecran stable. */
  readonly loading = signal(true);
  readonly error = signal(false);
  private seq = 0;

  constructor(private readonly fetch: () => Observable<T>) {
    const refresh = inject(RefreshService);
    effect(() => {
      refresh.tick();
      void this.load();
    });
  }

  async load(): Promise<void> {
    const id = ++this.seq;
    try {
      const result = await firstValueFrom(this.fetch());
      if (id !== this.seq) return;
      this.data.set(result);
      this.error.set(false);
    } catch {
      if (id === this.seq) this.error.set(true);
    } finally {
      if (id === this.seq) this.loading.set(false);
    }
  }
}
