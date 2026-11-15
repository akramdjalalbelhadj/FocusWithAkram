import { Directive, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FinanceApi } from '../../../../core/api/finance.api';
import { MonthSheet } from '../../../../core/api/models';
import { SettingsStore } from '../../../../core/services/settings.store';
import { Loader } from '../../../../core/util/loader';
import { formatMoney } from '../../../../core/util/money';
import { MONTH_HELP } from '../../month-help';
import { addMonths, isMonth, monthLabel } from '../../month-utils';
import { FinanceActions } from '../../services/finance-actions.service';
import { sheetIsEmpty } from './month-view';

/**
 * Etat commun a « Mon mois » (tableau de bord) et a « Détails du mois » : le mois affiche, lu dans l'adresse
 * (`?mois=AAAA-MM`, le mois en cours sans parametre), et sa feuille chargee depuis le serveur.
 */
@Directive()
export abstract class MonthState {
  private readonly api = inject(FinanceApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly settings = inject(SettingsStore);
  protected readonly actions = inject(FinanceActions);
  protected readonly help = MONTH_HELP;
  protected readonly money = formatMoney;
  protected readonly currentMonth = this.settings.today().slice(0, 7);

  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly month = computed(() => {
    const value = this.params().get('mois');
    return value && isMonth(value) ? value : this.currentMonth;
  });
  protected readonly loader = new Loader(() => this.api.monthSheet(this.month()));
  protected readonly sheet = computed(() => this.loader.data());
  /** Feuille du mois precedemment affiche, encore visible pendant le chargement du mois choisi. */
  protected readonly stale = computed(() => {
    const s = this.sheet();
    return !!s && s.month !== this.month();
  });
  protected readonly monthTitle = computed(() => monthLabel(this.month()));
  protected readonly period = computed<MonthSheet['period']>(() => {
    const month = this.month();
    if (month === this.currentMonth) return 'CURRENT';
    return month < this.currentMonth ? 'PAST' : 'FUTURE';
  });
  protected readonly future = computed(() => this.period() === 'FUTURE');
  protected readonly empty = computed(() => {
    const s = this.sheet();
    return !!s && sheetIsEmpty(s);
  });
  /** Categories deja suivies par une depense variable (une seule par categorie). */
  protected readonly takenCategories = computed(() => this.sheet()?.variable.map((v) => v.category.id) ?? []);

  protected shift(delta: number): void {
    this.goTo(addMonths(this.month(), delta));
  }

  protected goTo(month: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mois: month === this.currentMonth ? null : month },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
