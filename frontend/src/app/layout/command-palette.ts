import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { SearchResult } from '../core/api/models';
import { TasksApi } from '../core/api/tasks.api';
import { PomodoroEngine } from '../core/services/pomodoro.engine';
import { SettingsStore } from '../core/services/settings.store';
import { TaskActions } from '../features/tasks/task-actions.service';
import { IconComponent } from '../shared/ui/icon';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: string;
  run: () => void;
}

/** Palette de commandes (Ctrl/Cmd+K) : navigation, creation, Pomodoro et recherche de taches. */
@Component({
  selector: 'ff-command-palette',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card w-[min(36rem,calc(100vw-1.5rem))] anim-pop shadow-modal overflow-hidden mt-[12vh]" role="dialog" aria-label="Palette de commandes">
      <div class="flex items-center gap-3 px-4 border-b border-line">
        <ff-icon name="search" class="text-subtle" />
        <input class="flex-1 bg-transparent h-14 outline-none text-base" placeholder="Rechercher une tâche, une page ou une action…"
          role="combobox" aria-expanded="true" aria-controls="cp-list" [attr.aria-activedescendant]="'cp-' + active()"
          aria-label="Rechercher" cdkFocusInitial [value]="query()" (input)="query.set($any($event.target).value); active.set(0)"
          (keydown)="onKey($event)" />
        <span class="kbd">Échap</span>
      </div>
      <ul id="cp-list" role="listbox" class="max-h-[50vh] overflow-y-auto p-2">
        @for (c of items(); track c.id; let i = $index) {
          <li role="option" [id]="'cp-' + i" [attr.aria-selected]="i === active()">
            <button type="button" class="menu-item" [class.!bg-surface-2]="i === active()" (mouseenter)="active.set(i)" (click)="exec(c)">
              <ff-icon [name]="c.icon" [size]="16" class="text-subtle" />
              <span class="flex-1 truncate">{{ c.label }}</span>
              @if (c.hint) { <span class="text-xs text-subtle">{{ c.hint }}</span> }
            </button>
          </li>
        } @empty {
          <li class="p-6 text-center text-muted text-sm">Aucun résultat pour « {{ query() }} ».</li>
        }
      </ul>
    </div>`,
})
export class CommandPaletteComponent {
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  private readonly router = inject(Router);
  private readonly api = inject(TasksApi);
  private readonly actions = inject(TaskActions);
  private readonly engine = inject(PomodoroEngine);
  private readonly settings = inject(SettingsStore);

  protected readonly query = signal('');
  protected readonly active = signal(0);

  private readonly results = toSignal(
    toObservable(this.query).pipe(
      debounceTime(150),
      distinctUntilChanged(),
      switchMap((q) => (q.trim().length >= 2 ? this.api.search(q.trim()).pipe(catchError(() => of(null))) : of(null))),
    ),
    { initialValue: null as SearchResult | null },
  );

  private readonly commands = computed<Command[]>(() => [
    { id: 'new', label: 'Créer une tâche', icon: 'plus', hint: 'N', run: () => void this.actions.create() },
    { id: 'focus', label: this.engine.isActive() ? 'Ouvrir la session Focus' : 'Démarrer une session Focus', icon: 'timer', run: () => void this.startFocus() },
    { id: 'go-dash', label: 'Aller au tableau de bord', icon: 'dashboard', hint: 'G D', run: () => this.go('/') },
    { id: 'go-matrix', label: 'Aller à la matrice d’Eisenhower', icon: 'grid', hint: 'G M', run: () => this.go('/matrix') },
    { id: 'go-tasks', label: 'Aller à Mes tâches', icon: 'list-checks', hint: 'G T', run: () => this.go('/tasks') },
    { id: 'go-focus', label: 'Aller à Focus / Pomodoro', icon: 'timer', hint: 'G F', run: () => this.go('/focus') },
    { id: 'go-cal', label: 'Aller au calendrier', icon: 'calendar', hint: 'G C', run: () => this.go('/calendar') },
    { id: 'go-stats', label: 'Aller aux statistiques', icon: 'chart', hint: 'G S', run: () => this.go('/statistics') },
    { id: 'go-projects', label: 'Aller aux projets', icon: 'folder', run: () => this.go('/projects') },
    { id: 'go-archives', label: 'Aller aux archives', icon: 'archive', hint: 'G A', run: () => this.go('/archives') },
    { id: 'go-settings', label: 'Ouvrir les paramètres', icon: 'settings', run: () => this.go('/settings') },
    {
      id: 'theme', label: 'Basculer le thème clair / sombre', icon: 'moon',
      run: () => void this.settings.update({ theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'LIGHT' : 'DARK' }),
    },
  ]);

  protected readonly items = computed<Command[]>(() => {
    const q = this.query().trim().toLowerCase();
    const cmds = q ? this.commands().filter((c) => c.label.toLowerCase().includes(q)) : this.commands();
    const found = this.results();
    const tasks: Command[] = (found?.tasks ?? []).map((t) => ({
      id: 't-' + t.id, label: t.title, icon: t.archived ? 'archive' : 'circle', hint: t.archived ? 'Archivée' : t.quadrant,
      run: () => this.actions.openDetail(t.id),
    }));
    const projects: Command[] = (found?.projects ?? []).map((p) => ({
      id: 'p-' + p.id, label: p.name, icon: 'folder', hint: 'Projet', run: () => this.go('/projects'),
    }));
    return [...tasks, ...projects, ...cmds];
  });

  protected onKey(e: KeyboardEvent): void {
    const n = this.items().length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.active.update((i) => (i + 1) % Math.max(1, n));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.active.update((i) => (i - 1 + n) % Math.max(1, n));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const c = this.items()[this.active()];
      if (c) this.exec(c);
    }
  }

  protected exec(c: Command): void {
    this.ref.close();
    c.run();
  }

  private go(path: string): void {
    void this.router.navigateByUrl(path);
  }

  private async startFocus(): Promise<void> {
    if (!this.engine.isActive()) await this.engine.start('WORK', this.engine.lastTaskId());
    this.go('/focus');
  }
}
