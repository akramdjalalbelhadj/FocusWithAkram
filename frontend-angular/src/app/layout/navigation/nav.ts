import type { NavItem } from './nav-item';

export const NAV: NavItem[] = [
  { path: '/', label: 'Tableau de bord', icon: 'dashboard', exact: true },
  { path: '/matrix', label: 'Matrice d’Eisenhower', icon: 'grid' },
  { path: '/tasks', label: 'Mes tâches', icon: 'list-checks' },
  { path: '/focus', label: 'Focus / Pomodoro', icon: 'timer' },
  { path: '/calendar', label: 'Calendrier', icon: 'calendar' },
  { path: '/statistics', label: 'Statistiques', icon: 'chart' },
  { path: '/projects', label: 'Projets', icon: 'folder' },
  { path: '/archives', label: 'Archives', icon: 'archive' },
  { path: '/settings', label: 'Paramètres', icon: 'settings' },
];
