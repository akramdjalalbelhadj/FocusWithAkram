import { Routes } from '@angular/router';
import { FinanceShellPage } from './pages/finance-shell/finance-shell.page';

/** Module « Mes achats » : une entree de navigation, des onglets en routes enfants. */
export const FINANCE_ROUTES: Routes = [
  {
    path: '',
    component: FinanceShellPage,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        title: 'Mes achats — FocusWithAkram',
        loadComponent: () =>
          import('./pages/overview/overview.page').then((m) => m.FinanceOverviewPage),
      },
      {
        path: 'operations',
        title: 'Opérations — Mes achats',
        loadComponent: () =>
          import('./pages/operations/operations.page').then((m) => m.FinanceOperationsPage),
      },
      {
        path: 'budget',
        title: 'Budget — Mes achats',
        loadComponent: () => import('./pages/budget/budget.page').then((m) => m.FinanceBudgetPage),
      },
      {
        path: 'purchases',
        title: 'Achats prévus — Mes achats',
        loadComponent: () =>
          import('./pages/purchases/purchases.page').then((m) => m.FinancePurchasesPage),
      },
      {
        path: 'loans',
        title: 'Prêts — Mes achats',
        loadComponent: () => import('./pages/loans/loans.page').then((m) => m.FinanceLoansPage),
      },
      {
        path: 'schedules',
        title: 'Échéancier — Mes achats',
        loadComponent: () =>
          import('./pages/schedules/schedules.page').then((m) => m.FinanceSchedulesPage),
      },
      {
        path: 'calendar',
        title: 'Calendrier — Mes achats',
        loadComponent: () =>
          import('./pages/calendar/finance-calendar.page').then((m) => m.FinanceCalendarPage),
      },
      {
        path: 'statistics',
        title: 'Statistiques — Mes achats',
        loadComponent: () =>
          import('./pages/statistics/finance-statistics.page').then((m) => m.FinanceStatisticsPage),
      },
      {
        path: 'settings',
        title: 'Comptes et catégories — Mes achats',
        loadComponent: () =>
          import('./pages/finance-settings/finance-settings.page').then(
            (m) => m.FinanceSettingsPage,
          ),
      },
    ],
  },
];
