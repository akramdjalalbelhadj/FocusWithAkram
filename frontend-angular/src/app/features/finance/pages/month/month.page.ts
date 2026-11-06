import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FinanceApi } from '../../../../core/api/finance.api';
import { MonthSheet } from '../../../../core/api/models';
import { SettingsStore } from '../../../../core/services/settings.store';
import { Loader } from '../../../../core/util/loader';
import { formatMoney } from '../../../../core/util/money';
import { HelpTipComponent } from '../../../../shared/ui/help-tip/help-tip';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { ErrorComponent, SkeletonComponent } from '../../../../shared/ui/states';
import { AlertView, SEVERITY_TONE, alertView } from '../../alert-text';
import { OperationRowComponent } from '../../components/operation-row/operation-row';
import { MONTH_HELP } from '../../month-help';
import { addMonths, expenseDefaultDate, isMonth, monthLabel } from '../../month-utils';
import { FinanceActions } from '../../services/finance-actions.service';
import { EnvelopeRowsComponent } from './envelope-rows';
import { savingsProgress, sheetIsEmpty } from './month-view';
import { SheetRowsComponent } from './sheet-rows';

/**
 * « Mon mois » : la feuille du mois choisi. Revenus, depenses fixes, depenses variables plafonnees et autres
 * depenses, chacune avec son prevu et son reel, puis l'epargne du mois face a l'objectif. Le mois affiche est dans
 * l'adresse (`?mois=AAAA-MM`) ; sans parametre, c'est le mois en cours.
 */
@Component({
  selector: 'ff-finance-month',
  imports: [
    RouterLink,
    IconComponent,
    HelpTipComponent,
    ErrorComponent,
    SkeletonComponent,
    OperationRowComponent,
    SheetRowsComponent,
    EnvelopeRowsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './month.page.html',
  styleUrl: './month.page.css',
})
export class FinanceMonthPage {
  private readonly api = inject(FinanceApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly settings = inject(SettingsStore);
  protected readonly actions = inject(FinanceActions);
  protected readonly help = MONTH_HELP;
  protected readonly money = formatMoney;
  protected readonly tone = SEVERITY_TONE;
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
  /** Alertes du jour : affichees sur le mois en cours. */
  protected readonly alertsLoader = new Loader(() => this.api.alerts());
  protected readonly alerts = computed(() =>
    this.month() === this.currentMonth
      ? (this.alertsLoader.data() ?? []).map(alertView).filter((a): a is AlertView => !!a)
      : [],
  );

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
  protected readonly savings = computed(() => {
    const s = this.sheet();
    return s ? savingsProgress(s.totals.savingsActual, s.savingsTarget) : null;
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

  /** Depense ponctuelle : saisie rapide pour le mois en cours, datee dans le mois affiche sinon. */
  protected addOther(): void {
    const month = this.month();
    if (month === this.currentMonth) {
      void this.actions.quickExpense();
      return;
    }
    void this.actions.newOperation({
      type: 'EXPENSE',
      status: 'COMPLETED',
      date: expenseDefaultDate(month, this.settings.today()),
    });
  }
}
