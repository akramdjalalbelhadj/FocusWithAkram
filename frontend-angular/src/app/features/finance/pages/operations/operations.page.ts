import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { FinanceApi } from '../../../../core/api/finance.api';
import {
  Operation,
  OperationQuery,
  OperationStatus,
  OperationType,
} from '../../../../core/api/models';
import { RefreshService } from '../../../../core/services/refresh.service';
import { SettingsStore } from '../../../../core/services/settings.store';
import { debounced } from '../../../../core/util/debounced';
import { parseAmount } from '../../../../core/util/money';
import { addDays, longDate } from '../../../../core/util/time';
import { HelpTipComponent } from '../../../../shared/ui/help-tip/help-tip';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { EmptyComponent, ErrorComponent, SkeletonComponent } from '../../../../shared/ui/states';
import { OperationRowComponent } from '../../components/operation-row/operation-row';
import { OPERATION_TYPE_LABEL } from '../../finance-labels';
import { FinanceSchedulesPage } from '../schedules/schedules.page';
import { FinanceActions } from '../../services/finance-actions.service';
import { FinanceReferenceStore } from '../../services/finance-reference.store';

type Period = 'month' | 'previous' | 'quarter' | 'year' | 'all' | 'custom';
type Nature = '' | 'essential' | 'variable' | 'exceptional';

const PAGE_SIZE = 50;

/**
 * Operations : historique (filtres combinables, regroupement par jour, chargement par pages) ou revenus et charges
 * recurrents (echeancier). L'affichage choisi est dans l'adresse (`?vue=recurrents`).
 */
@Component({
  selector: 'ff-finance-operations',
  imports: [
    IconComponent,
    HelpTipComponent,
    EmptyComponent,
    ErrorComponent,
    SkeletonComponent,
    OperationRowComponent,
    FinanceSchedulesPage,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './operations.page.html',
})
export class FinanceOperationsPage {
  private readonly api = inject(FinanceApi);
  private readonly refresh = inject(RefreshService);
  protected readonly store = inject(FinanceReferenceStore);
  protected readonly actions = inject(FinanceActions);
  private readonly today = inject(SettingsStore).today();

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly view = toSignal(
    this.route.queryParamMap.pipe(map((p) => (p.get('vue') === 'recurrents' ? 'recurring' : 'history'))),
    { initialValue: 'history' as 'history' | 'recurring' },
  );
  /** Filtres peu utilises (statut, categorie, nature, montants), replies par defaut. */
  protected readonly moreFilters = signal(false);
  /** Les virements n'existent plus (un seul compte) ; les anciens restent filtrables s'il y en a. */
  protected readonly typeOptions = (Object.entries(OPERATION_TYPE_LABEL) as [OperationType, string][]).filter(
    ([t]) => t !== 'TRANSFER',
  );
  protected readonly period = signal<Period>('month');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly type = signal<OperationType | ''>('');
  protected readonly status = signal<OperationStatus | ''>('');
  protected readonly accountId = signal('');
  protected readonly categoryId = signal('');
  protected readonly nature = signal<Nature>('');
  protected readonly minAmount = signal('');
  protected readonly maxAmount = signal('');
  protected readonly q = signal('');
  private readonly search = debounced(this.q);
  private readonly amounts = debounced(computed(() => [this.minAmount(), this.maxAmount()] as const));

  protected readonly items = signal<Operation[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  private readonly page = signal(0);
  private readonly pages = signal(0);
  private seq = 0;
  protected readonly hasMore = computed(() => this.page() + 1 < this.pages());

  /** Jours, du plus recent au plus ancien, avec leurs operations. */
  protected readonly days = computed(() => {
    const byDay = new Map<string, Operation[]>();
    for (const op of this.items()) byDay.set(op.date, [...(byDay.get(op.date) ?? []), op]);
    return [...byDay.entries()].map(([day, ops]) => ({ day, ops }));
  });
  protected readonly filtered = computed(
    () =>
      this.period() !== 'month' ||
      !!(
        this.type() ||
        this.status() ||
        this.accountId() ||
        this.categoryId() ||
        this.nature() ||
        this.q() ||
        this.minAmount() ||
        this.maxAmount()
      ),
  );
  protected readonly longDate = longDate;

  private readonly query = computed<OperationQuery>(() => {
    const [from, to] = this.range();
    const [min, max] = this.amounts();
    const nature = this.nature();
    return {
      from,
      to,
      type: this.type() ? [this.type() as OperationType] : undefined,
      status: this.status() ? [this.status() as OperationStatus] : undefined,
      accountId: this.accountId() || undefined,
      categoryId: this.categoryId() || undefined,
      essential: nature === 'essential' ? true : nature === 'variable' ? false : undefined,
      exceptional: nature === 'exceptional' ? true : undefined,
      q: this.search() || undefined,
      minAmount: parseAmount(min) ?? undefined,
      maxAmount: parseAmount(max) ?? undefined,
    };
  });

  constructor() {
    this.store.ensure();
    // Rechargement depuis la premiere page a chaque changement de filtre ou apres une mutation.
    effect(() => {
      this.refresh.tick();
      const query = this.query();
      untracked(() => void this.load(query, true));
    });
    inject(DestroyRef).onDestroy(() => this.seq++);
  }

  protected setView(view: 'history' | 'recurring'): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { vue: view === 'recurring' ? 'recurrents' : null },
      replaceUrl: true,
    });
  }

  protected loadMore(): void {
    this.page.update((p) => p + 1);
    void this.load(this.query(), false);
  }

  protected retry(): void {
    void this.load(this.query(), true);
  }

  protected reset(): void {
    this.period.set('month');
    this.type.set('');
    this.status.set('');
    this.accountId.set('');
    this.categoryId.set('');
    this.nature.set('');
    this.minAmount.set('');
    this.maxAmount.set('');
    this.q.set('');
  }

  private range(): [string | undefined, string | undefined] {
    const today = this.today;
    const month = today.slice(0, 7);
    switch (this.period()) {
      case 'month':
        return [`${month}-01`, undefined];
      case 'previous': {
        const firstOfMonth = `${month}-01`;
        const lastOfPrevious = addDays(firstOfMonth, -1);
        return [`${lastOfPrevious.slice(0, 7)}-01`, lastOfPrevious];
      }
      case 'quarter':
        return [addDays(today, -90), undefined];
      case 'year':
        return [`${today.slice(0, 4)}-01-01`, undefined];
      case 'custom':
        return [this.from() || undefined, this.to() || undefined];
      case 'all':
        return [undefined, undefined];
    }
  }

  private async load(query: OperationQuery, replace: boolean): Promise<void> {
    if (replace) this.page.set(0);
    const seq = ++this.seq;
    if (replace) this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.api.operations({ ...query, page: this.page(), size: PAGE_SIZE }),
      );
      if (seq !== this.seq) return;
      this.items.set(replace ? res.items : [...this.items(), ...res.items]);
      this.total.set(res.totalItems);
      this.pages.set(res.totalPages);
      this.error.set(false);
    } catch {
      if (seq === this.seq) this.error.set(true);
    } finally {
      if (seq === this.seq) this.loading.set(false);
    }
  }
}
