import { Dialog } from '@angular/cdk/dialog';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PomodoroEngine, SESSION_LABEL } from '../core/services/pomodoro.engine';
import { SHORTCUTS, ShortcutsService } from '../core/services/shortcuts.service';
import { TaskActions } from '../features/tasks/task-actions.service';
import { IconComponent } from '../shared/ui/icon';
import { ToastHostComponent } from '../shared/ui/toast-host';
import { CommandPaletteComponent } from './command-palette';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

const NAV: NavItem[] = [
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

@Component({
  selector: 'ff-shortcuts-help',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card w-[min(30rem,calc(100vw-1.5rem))] p-6 anim-pop shadow-modal" role="dialog" aria-labelledby="sh-title">
      <div class="flex justify-between items-center mb-4">
        <h2 id="sh-title" class="text-lg font-bold">Raccourcis clavier</h2>
        <button class="btn btn-ghost btn-icon btn-sm" aria-label="Fermer" (click)="close()" cdkFocusInitial><ff-icon name="x" /></button>
      </div>
      <ul class="divide-y divide-line">
        @for (s of shortcuts; track s.label) {
          <li class="flex items-center justify-between py-2.5 gap-4">
            <span>{{ s.label }}</span>
            <span class="flex gap-1">@for (k of s.keys; track k) { <kbd class="kbd">{{ k }}</kbd> }</span>
          </li>
        }
      </ul>
      <p class="field-hint mt-3">Les raccourcis à une touche sont ignorés dans les champs de saisie et peuvent être désactivés dans les paramètres.</p>
    </div>`,
})
export class ShortcutsHelpComponent {
  private readonly dialog = inject(Dialog);
  protected readonly shortcuts = SHORTCUTS;
  protected close(): void {
    this.dialog.closeAll();
  }
}

@Component({
  selector: 'ff-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ToastHostComponent, CdkMenuTrigger, CdkMenu, CdkMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a href="#main" class="sr-only-text focus:not-sr-only focus:fixed focus:z-[2000] focus:top-2 focus:left-2 btn btn-primary">Aller au contenu</a>

    <div class="min-h-dvh md:grid" [style.grid-template-columns]="collapsed() ? '4.5rem 1fr' : '246px 1fr'">
      <!-- Sidebar (desktop / tablette) -->
      <aside class="hidden md:flex flex-col sticky top-0 h-dvh border-r border-line bg-surface p-3 gap-1" aria-label="Navigation principale">
        <div class="flex items-center gap-2.5 px-2 py-3 mb-1">
          <span class="grid place-items-center size-9 rounded-xl bg-brand text-brand-fg flex-none"><ff-icon name="target" [size]="20" /></span>
          @if (!collapsed()) { <span class="font-extrabold text-lg tracking-tight">FocusWithAkram</span> }
        </div>

        <nav class="flex flex-col gap-0.5 flex-1 overflow-y-auto">
          @for (n of nav; track n.path) {
            <a [routerLink]="n.path" routerLinkActive="nav-active !bg-brand-soft !text-brand" [routerLinkActiveOptions]="{ exact: !!n.exact }"
              class="flex items-center gap-3 rounded-xl px-3 min-h-10 text-muted font-medium hover:bg-surface-2 hover:text-fg"
              [attr.aria-label]="collapsed() ? n.label : null" [title]="collapsed() ? n.label : ''">
              <ff-icon [name]="n.icon" />
              @if (!collapsed()) { <span class="truncate">{{ n.label }}</span> }
              @if (n.path === '/focus' && engine.isActive()) { <span class="ml-auto size-2 rounded-full bg-success animate-pulse" aria-label="Session active"></span> }
            </a>
          }
        </nav>

        @if (engine.session(); as s) {
          <a routerLink="/focus" class="card p-3 flex items-center gap-3 hover:bg-surface-2" aria-label="Session de concentration active">
            <ff-icon [name]="s.type === 'WORK' ? 'timer' : 'coffee'" class="text-brand" />
            @if (!collapsed()) {
              <span class="min-w-0"><span class="block font-bold tabular-nums text-lg leading-none">{{ engine.clock() }}</span>
              <span class="block text-xs text-muted truncate">{{ label(s.type) }}{{ engine.isPaused() ? ' · en pause' : '' }}</span></span>
            }
          </a>
        }

        <div class="sidebar-landscape" aria-hidden="true"><i></i><b></b><span></span></div>
        <button type="button" class="btn btn-ghost w-full justify-start" (click)="toggleCollapsed()" [attr.aria-label]="collapsed() ? 'Déplier la barre latérale' : 'Replier la barre latérale'">
          <ff-icon [name]="collapsed() ? 'chevron-right' : 'chevron-left'" />@if (!collapsed()) { Replier }
        </button>
      </aside>

      <div class="min-w-0 flex flex-col min-h-dvh">
        <!-- Barre superieure -->
        <header class="sticky top-0 z-30 flex items-center gap-2 px-4 md:px-8 h-14 border-b border-line bg-page/85 backdrop-blur">
          <span class="md:hidden grid place-items-center size-8 rounded-lg bg-brand text-brand-fg"><ff-icon name="target" [size]="18" /></span>
          <button type="button" class="flex-1 max-w-md flex items-center gap-2 h-10 px-3 rounded-xl border border-line bg-surface text-subtle hover:border-line-strong"
            (click)="openPalette()" aria-label="Rechercher (Ctrl K)">
            <ff-icon name="search" [size]="16" /><span class="text-sm truncate">Rechercher ou lancer une commande…</span>
            <span class="ml-auto hidden sm:flex gap-1"><kbd class="kbd">Ctrl</kbd><kbd class="kbd">K</kbd></span>
          </button>
          <span class="flex-1 hidden md:block"></span>
          @if (engine.session(); as s) {
            <a routerLink="/focus" class="badge badge-brand !py-1.5 !px-3 tabular-nums md:hidden"><ff-icon name="timer" [size]="13" />{{ engine.clock() }}</a>
          } @else {
            <button type="button" class="btn btn-secondary btn-sm hidden sm:inline-flex" (click)="quickPomodoro()"><ff-icon name="timer" [size]="15" />Pomodoro</button>
          }
          <button type="button" class="btn btn-primary btn-sm md:hidden btn-icon" (click)="actions.create()" aria-label="Nouvelle tâche"><ff-icon name="plus" /></button>
          <button type="button" class="btn btn-ghost btn-sm btn-icon hidden md:inline-flex" (click)="openHelp()" aria-label="Raccourcis clavier"><ff-icon name="keyboard" /></button>
        </header>

        <main id="main" tabindex="-1" class="flex-1 px-4 md:px-8 py-6 pb-28 md:pb-10 max-w-[90rem] w-full mx-auto outline-none">
          <router-outlet />
        </main>
      </div>
    </div>

    <!-- Navigation mobile -->
    <nav class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-line grid grid-cols-5 pb-[env(safe-area-inset-bottom)]" aria-label="Navigation principale">
      @for (n of mobileNav; track n.path) {
        <a [routerLink]="n.path" routerLinkActive="!text-brand" [routerLinkActiveOptions]="{ exact: !!n.exact }"
          class="flex flex-col items-center justify-center gap-0.5 min-h-14 text-[0.7rem] font-semibold text-muted">
          <ff-icon [name]="n.icon" [size]="22" />{{ short(n.label) }}
        </a>
      }
      <button type="button" class="flex flex-col items-center justify-center gap-0.5 min-h-14 text-[0.7rem] font-semibold text-muted" [cdkMenuTriggerFor]="more" aria-label="Plus de pages">
        <ff-icon name="more" [size]="22" />Plus
      </button>
    </nav>
    <ng-template #more>
      <div cdkMenu class="menu anim-pop mb-2">
        @for (n of moreNav; track n.path) {
          <a cdkMenuItem class="menu-item" [routerLink]="n.path"><ff-icon [name]="n.icon" [size]="16" />{{ n.label }}</a>
        }
      </div>
    </ng-template>

    <ff-toast-host />
  `,
})
export class ShellComponent {
  protected readonly engine = inject(PomodoroEngine);
  protected readonly actions = inject(TaskActions);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly shortcuts = inject(ShortcutsService);

  protected readonly nav = NAV;
  protected readonly mobileNav = [NAV[0], NAV[1], NAV[2], NAV[3]];
  protected readonly moreNav = NAV.slice(4);
  protected readonly collapsed = signal(readCollapsed());

  constructor() {
    this.shortcuts.register({ palette: () => this.openPalette(), help: () => this.openHelp() });
  }

  protected label(type: 'WORK' | 'SHORT_BREAK' | 'LONG_BREAK'): string {
    return SESSION_LABEL[type];
  }

  protected short(label: string): string {
    return ({ 'Tableau de bord': 'Accueil', 'Matrice d’Eisenhower': 'Matrice', 'Mes tâches': 'Tâches', 'Focus / Pomodoro': 'Focus' } as Record<string, string>)[label] ?? label;
  }

  protected toggleCollapsed(): void {
    this.collapsed.update((v) => !v);
    try {
      localStorage.setItem('ff.sidebar.collapsed', String(this.collapsed()));
    } catch {
      /* ignore */
    }
  }

  protected openPalette(): void {
    if (this.dialog.openDialogs.some((d) => d.componentInstance instanceof CommandPaletteComponent)) return;
    this.dialog.open(CommandPaletteComponent, { backdropClass: 'ff-backdrop', panelClass: 'ff-palette', positionStrategy: undefined });
  }

  protected openHelp(): void {
    this.dialog.open(ShortcutsHelpComponent, { backdropClass: 'ff-backdrop' });
  }

  protected async quickPomodoro(): Promise<void> {
    if (await this.engine.start('WORK', this.engine.lastTaskId())) void this.router.navigate(['/focus']);
  }
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem('ff.sidebar.collapsed') === 'true';
  } catch {
    return false;
  }
}
