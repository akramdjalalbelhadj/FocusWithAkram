import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TaskActions } from '../../features/tasks/services/task-actions.service';
import { PomodoroEngine } from './pomodoro.engine';
import { SettingsStore } from './settings.store';

export const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['Ctrl/⌘', 'K'], label: 'Ouvrir la palette de commandes' },
  { keys: ['N'], label: 'Créer une nouvelle tâche' },
  { keys: ['/'], label: 'Rechercher' },
  { keys: ['Espace'], label: 'Démarrer / mettre en pause le Pomodoro' },
  { keys: ['G', 'puis D'], label: 'Aller au tableau de bord' },
  { keys: ['G', 'puis M'], label: 'Aller à la matrice' },
  { keys: ['G', 'puis F'], label: 'Aller à Focus' },
  { keys: ['?'], label: 'Afficher les raccourcis' },
  { keys: ['Échap'], label: 'Fermer une fenêtre' },
];

const GO: Record<string, string> = {
  d: '/',
  m: '/matrix',
  t: '/tasks',
  f: '/focus',
  c: '/calendar',
  s: '/statistics',
  a: '/archives',
};

/** Raccourcis clavier globaux. Ignores dans les champs de saisie ; desactivables dans les parametres. */
@Injectable({ providedIn: 'root' })
export class ShortcutsService {
  private readonly settings = inject(SettingsStore);
  private readonly actions = inject(TaskActions);
  private readonly engine = inject(PomodoroEngine);
  private readonly router = inject(Router);
  private openPalette: (() => void) | null = null;
  private openHelp: (() => void) | null = null;
  private goPending = false;

  register(handlers: { palette: () => void; help: () => void }): void {
    this.openPalette = handlers.palette;
    this.openHelp = handlers.help;
    document.addEventListener('keydown', (e) => this.onKey(e));
  }

  private onKey(e: KeyboardEvent): void {
    // Ctrl/Cmd+K reste disponible meme dans un champ, et meme si les raccourcis simples sont desactives.
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.openPalette?.();
      return;
    }
    if (
      !this.settings.settings().shortcutsEnabled ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.defaultPrevented
    )
      return;
    const t = e.target as HTMLElement | null;
    if (
      t &&
      (t.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) ||
        t.closest('[role="dialog"]'))
    )
      return;
    const key = e.key.toLowerCase();

    if (this.goPending) {
      this.goPending = false;
      const route = GO[key];
      if (route) {
        e.preventDefault();
        void this.router.navigateByUrl(route);
      }
      return;
    }
    if (key === 'n') {
      e.preventDefault();
      void this.actions.create();
    } else if (key === '/') {
      e.preventDefault();
      this.openPalette?.();
    } else if (key === '?') {
      e.preventDefault();
      this.openHelp?.();
    } else if (key === 'g') {
      this.goPending = true;
      setTimeout(() => (this.goPending = false), 1200);
    } else if (
      e.key === ' ' &&
      this.engine.isActive() &&
      !(t instanceof HTMLButtonElement) &&
      !(t instanceof HTMLAnchorElement)
    ) {
      e.preventDefault();
      void this.engine.toggle();
    }
  }
}
