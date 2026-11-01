import { Routes } from '@angular/router';
import { ShellComponent } from '../layout/shell/index';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        title: 'Tableau de bord — FocusWithAkram',
        loadComponent: () =>
          import('../features/dashboard/pages/dashboard/dashboard.page').then(
            (m) => m.DashboardPage,
          ),
      },
      {
        path: 'matrix',
        title: 'Matrice d’Eisenhower — FocusWithAkram',
        loadComponent: () =>
          import('../features/eisenhower/pages/matrix/matrix.page').then((m) => m.MatrixPage),
      },
      {
        path: 'tasks',
        title: 'Mes tâches — FocusWithAkram',
        loadComponent: () =>
          import('../features/tasks/pages/tasks/tasks.page').then((m) => m.TasksPage),
      },
      {
        path: 'focus',
        title: 'Focus — FocusWithAkram',
        loadComponent: () =>
          import('../features/pomodoro/pages/focus/focus.page').then((m) => m.FocusPage),
      },
      {
        path: 'calendar',
        title: 'Calendrier — FocusWithAkram',
        loadComponent: () =>
          import('../features/calendar/pages/calendar/calendar.page').then((m) => m.CalendarPage),
      },
      {
        path: 'statistics',
        title: 'Statistiques — FocusWithAkram',
        loadComponent: () =>
          import('../features/statistics/pages/statistics/statistics.page').then(
            (m) => m.StatisticsPage,
          ),
      },
      {
        path: 'projects',
        title: 'Projets — FocusWithAkram',
        loadComponent: () => import('../features/projects/index').then((m) => m.ProjectsPage),
      },
      {
        path: 'archives',
        title: 'Archives — FocusWithAkram',
        loadComponent: () =>
          import('../features/archives/pages/archives/archives.page').then((m) => m.ArchivesPage),
      },
      {
        path: 'settings',
        title: 'Paramètres — FocusWithAkram',
        loadComponent: () =>
          import('../features/settings/pages/settings/settings.page').then((m) => m.SettingsPage),
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
