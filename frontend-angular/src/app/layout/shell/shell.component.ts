import { Dialog } from '@angular/cdk/dialog';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NAV, NavItem } from '../../config/navigation';
import { PomodoroEngine, SESSION_LABEL } from '../../core/services/pomodoro.engine';
import { ShortcutsService } from '../../core/services/shortcuts.service';
import { TaskActions } from '../../features/tasks/services/task-actions.service';
import { IconComponent } from '../../shared/ui/icon/icon';
import { ToastHostComponent } from '../../shared/ui/toast-host/toast-host';
import { CommandPaletteComponent } from '../command-palette/command-palette';
import { readCollapsed } from './read-collapsed';
import { ShortcutsHelpComponent } from '../shortcuts-help/shortcuts-help.component';

@Component({
  selector: 'ff-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IconComponent,
    ToastHostComponent,
    CdkMenuTrigger,
    CdkMenu,
    CdkMenuItem,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.html',
})
export class ShellComponent {
  protected readonly engine = inject(PomodoroEngine);
  protected readonly actions = inject(TaskActions);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);
  private readonly shortcuts = inject(ShortcutsService);

  protected readonly nav = NAV;
  protected readonly mobileNav = NAV.filter((n) => n.mobile);
  protected readonly moreNav = NAV.filter((n) => !n.mobile);
  protected readonly collapsed = signal(readCollapsed());

  constructor() {
    this.shortcuts.register({ palette: () => this.openPalette(), help: () => this.openHelp() });
  }

  protected label(type: 'WORK' | 'SHORT_BREAK' | 'LONG_BREAK'): string {
    return SESSION_LABEL[type];
  }

  protected short(item: NavItem): string {
    return item.shortLabel ?? item.label;
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
    if (this.dialog.openDialogs.some((d) => d.componentInstance instanceof CommandPaletteComponent))
      return;
    this.dialog.open(CommandPaletteComponent, {
      backdropClass: 'ff-backdrop',
      panelClass: 'ff-palette',
      positionStrategy: undefined,
    });
  }

  protected openHelp(): void {
    this.dialog.open(ShortcutsHelpComponent, { backdropClass: 'ff-backdrop' });
  }

  protected async quickPomodoro(): Promise<void> {
    if (await this.engine.start('WORK', this.engine.lastTaskId()))
      void this.router.navigate(['/focus']);
  }
}
