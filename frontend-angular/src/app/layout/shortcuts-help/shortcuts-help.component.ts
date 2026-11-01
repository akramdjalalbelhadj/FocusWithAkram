import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SHORTCUTS } from '../../core/services/shortcuts.service';
import { IconComponent } from '../../shared/ui/icon/icon';

@Component({
  selector: 'ff-shortcuts-help',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shortcuts-help.html',
})
export class ShortcutsHelpComponent {
  private readonly dialog = inject(Dialog);
  protected readonly shortcuts = SHORTCUTS;
  protected close(): void {
    this.dialog.closeAll();
  }
}
