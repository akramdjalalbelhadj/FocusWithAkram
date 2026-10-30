import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell';

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', title: 'Tableau de bord — FocusWithAkram', loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage) },
      { path: 'matrix', title: 'Matrice d’Eisenhower — FocusWithAkram', loadComponent: () => import('./features/eisenhower/matrix.page').then((m) => m.MatrixPage) },
      { path: 'tasks', title: 'Mes tâches — FocusWithAkram', loadComponent: () => import('./features/tasks/tasks.page').then((m) => m.TasksPage) },
      { path: 'focus', title: 'Focus — FocusWithAkram', loadComponent: () => import('./features/pomodoro/focus.page').then((m) => m.FocusPage) },
      { path: 'calendar', title: 'Calendrier — FocusWithAkram', loadComponent: () => import('./features/calendar/calendar.page').then((m) => m.CalendarPage) },
      { path: 'statistics', title: 'Statistiques — FocusWithAkram', loadComponent: () => import('./features/statistics/statistics.page').then((m) => m.StatisticsPage) },
      { path: 'projects', title: 'Projets — FocusWithAkram', loadComponent: () => import('./features/projects/projects.page').then((m) => m.ProjectsPage) },
      { path: 'archives', title: 'Archives — FocusWithAkram', loadComponent: () => import('./features/archives/archives.page').then((m) => m.ArchivesPage) },
      { path: 'settings', title: 'Paramètres — FocusWithAkram', loadComponent: () => import('./features/settings/settings.page').then((m) => m.SettingsPage) },
      { path: '**', redirectTo: '' },
    ],
  },
];
