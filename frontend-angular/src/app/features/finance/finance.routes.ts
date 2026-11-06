import { inject } from '@angular/core';
import { RedirectFunction, Router, Routes } from '@angular/router';
import { FinanceShellPage } from './pages/finance-shell/finance-shell.page';

/** Ancienne adresse redirigee vers un onglet et un affichage (`?vue=`), les autres parametres conserves. */
function toView(tab: string, vue: string): RedirectFunction {
  return ({ queryParams }) =>
    inject(Router).createUrlTree(['/finance', tab], { queryParams: { ...queryParams, vue } });
}

/**
 * Module « Mes achats » : une entree de navigation, quatre onglets (Mon mois, Operations, Projets d'achat, Analyses)
 * et les reglages. Les adresses des anciens onglets restent valides et menent a leur nouvel emplacement.
 */
export const FINANCE_ROUTES: Routes = [
  {
    path: '',
    component: FinanceShellPage,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'month' },
      {
        path: 'month',
        title: 'Mon mois — Mes achats',
        loadComponent: () => import('./pages/month/month.page').then((m) => m.FinanceMonthPage),
      },
      {
        path: 'operations',
        title: 'Opérations — Mes achats',
        loadComponent: () =>
          import('./pages/operations/operations.page').then((m) => m.FinanceOperationsPage),
      },
      {
        path: 'purchases',
        title: 'Projets d’achat — Mes achats',
        loadComponent: () =>
          import('./pages/purchases/purchases.page').then((m) => m.FinancePurchasesPage),
      },
      {
        path: 'analyses',
        title: 'Analyses — Mes achats',
        loadComponent: () =>
          import('./pages/analyses/analyses.page').then((m) => m.FinanceAnalysesPage),
      },
      {
        path: 'settings',
        title: 'Réglages — Mes achats',
        loadComponent: () =>
          import('./pages/finance-settings/finance-settings.page').then(
            (m) => m.FinanceSettingsPage,
          ),
      },
      // Anciennes adresses (lots 7 a 12)
      { path: 'overview', redirectTo: 'month' },
      { path: 'budget', redirectTo: 'month' },
      { path: 'loans', redirectTo: 'month' },
      { path: 'schedules', redirectTo: toView('operations', 'recurrents') },
      { path: 'statistics', redirectTo: 'analyses' },
      { path: 'calendar', redirectTo: toView('analyses', 'calendrier') },
    ],
  },
];
