import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SettingsStore } from '../../core/services/settings.store';
import { ToastService } from '../../core/services/toast.service';

/** Demande du pseudo au premier lancement ; il s'affiche dans le tableau de bord (« Hello pseudo »). */
@Component({
  selector: 'ff-pseudo-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pseudo-dialog.html',
})
export class PseudoDialogComponent {
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly settings = inject(SettingsStore);
  private readonly toast = inject(ToastService);
  protected readonly name = signal(this.settings.settings().displayName ?? '');
  protected readonly saving = signal(false);

  protected async save(): Promise<void> {
    const displayName = this.name().trim();
    if (!displayName) return;
    this.saving.set(true);
    try {
      await this.settings.update({ displayName });
      this.ref.close(true);
    } catch (e) {
      this.toast.errorFrom(e, 'Impossible d’enregistrer le pseudo.');
    } finally {
      this.saving.set(false);
    }
  }
}
