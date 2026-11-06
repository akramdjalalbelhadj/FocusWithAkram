import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FinanceApi } from '../../../core/api/finance.api';
import { FinanceAccount, FinanceCategory } from '../../../core/api/models';
import { RefreshService } from '../../../core/services/refresh.service';

/**
 * Comptes et categories, partages par les pages et les dialogues du module. Relus apres chaque mutation
 * (RefreshService) ; le chargement commence a la premiere lecture.
 */
@Injectable({ providedIn: 'root' })
export class FinanceReferenceStore {
  private readonly api = inject(FinanceApi);
  private readonly refresh = inject(RefreshService);
  private started = false;

  readonly accounts = signal<FinanceAccount[]>([]);
  readonly categories = signal<FinanceCategory[]>([]);
  readonly loaded = signal(false);
  readonly error = signal(false);

  readonly activeAccounts = computed(() => this.accounts().filter((a) => !a.archived));
  /** Le compte unique, qui represente tout l'argent (null tant que le solde de depart n'est pas saisi). */
  readonly account = computed(() => this.activeAccounts()[0] ?? this.accounts()[0] ?? null);
  /** Categories actives, chaque racine avec ses sous-categories actives. */
  readonly activeCategories = computed(() =>
    this.categories()
      .filter((c) => !c.archived)
      .map((c) => ({ ...c, children: c.children.filter((s) => !s.archived) })),
  );

  constructor() {
    effect(() => {
      this.refresh.tick();
      if (untracked(() => this.started)) void this.load();
    });
  }

  /** Demarre le chargement s'il n'a pas encore eu lieu. */
  ensure(): void {
    if (this.started) return;
    this.started = true;
    void this.load();
  }

  async load(): Promise<void> {
    try {
      const [accounts, categories] = await Promise.all([
        firstValueFrom(this.api.accounts()),
        firstValueFrom(this.api.categories()),
      ]);
      this.accounts.set(accounts);
      this.categories.set(categories);
      this.error.set(false);
    } catch {
      this.error.set(true);
    } finally {
      this.loaded.set(true);
    }
  }

  /** Recherche dans l'arbre (racines et sous-categories). */
  category(id: string | null | undefined): FinanceCategory | undefined {
    if (!id) return undefined;
    for (const root of this.categories()) {
      if (root.id === id) return root;
      const child = root.children.find((c) => c.id === id);
      if (child) return child;
    }
    return undefined;
  }
}
