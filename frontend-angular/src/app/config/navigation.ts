/**
 * Source unique de la navigation : menu lateral, barre mobile, palette de commandes et raccourcis
 * « G puis touche » en derivent. Ajouter une page = ajouter une entree ici (et sa route).
 */
export interface NavItem {
  path: string;
  /** Libelle du menu lateral et du menu « Plus ». */
  label: string;
  /** Libelle court de la barre mobile ; a defaut, `label`. */
  shortLabel?: string;
  /** Action proposee dans la palette de commandes. */
  command: string;
  icon: string;
  /** Lien actif uniquement sur le chemin exact (accueil). */
  exact?: boolean;
  /** Touche du raccourci « G puis touche ». */
  goKey?: string;
  /** Affiche dans la barre mobile principale ; sinon dans le menu « Plus ». Quatre entrees au plus. */
  mobile?: boolean;
}

export const NAV: readonly NavItem[] = [
  {
    path: '/',
    label: 'Tableau de bord',
    shortLabel: 'Accueil',
    command: 'Aller au tableau de bord',
    icon: 'dashboard',
    exact: true,
    goKey: 'd',
    mobile: true,
  },
  {
    path: '/matrix',
    label: 'Matrice d’Eisenhower',
    shortLabel: 'Matrice',
    command: 'Aller à la matrice d’Eisenhower',
    icon: 'grid',
    goKey: 'm',
    mobile: true,
  },
  {
    path: '/tasks',
    label: 'Mes tâches',
    shortLabel: 'Tâches',
    command: 'Aller à Mes tâches',
    icon: 'list-checks',
    goKey: 't',
    mobile: true,
  },
  {
    path: '/focus',
    label: 'Focus / Pomodoro',
    shortLabel: 'Focus',
    command: 'Aller à Focus / Pomodoro',
    icon: 'timer',
    goKey: 'f',
    mobile: true,
  },
  { path: '/calendar', label: 'Calendrier', command: 'Aller au calendrier', icon: 'calendar', goKey: 'c' },
  {
    path: '/statistics',
    label: 'Statistiques',
    command: 'Aller aux statistiques',
    icon: 'chart',
    goKey: 's',
  },
  { path: '/projects', label: 'Projets', command: 'Aller aux projets', icon: 'folder' },
  {
    path: '/finance',
    label: 'Mes achats',
    command: 'Aller à Mes achats',
    icon: 'wallet',
    goKey: 'b',
  },
  { path: '/archives', label: 'Archives', command: 'Aller aux archives', icon: 'archive', goKey: 'a' },
  { path: '/settings', label: 'Paramètres', command: 'Ouvrir les paramètres', icon: 'settings' },
];
