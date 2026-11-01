import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TransferApi } from '../../../../core/api/misc.api';
import { ImportReport, Settings } from '../../../../core/api/models';
import { AppError } from '../../../../core/interceptors/error.interceptor';
import { RefreshService } from '../../../../core/services/refresh.service';
import { SettingsStore } from '../../../../core/services/settings.store';
import { SHORTCUTS } from '../../../../core/services/shortcuts.service';
import { ToastService } from '../../../../core/services/toast.service';
import { saveBlob } from '../../../../core/util/download';
import { IconComponent } from '../../../../shared/ui/icon/icon';

@Component({
  selector: 'ff-settings-page',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.css',
})
export class SettingsPage {
  protected readonly store = inject(SettingsStore);
  private readonly transfer = inject(TransferApi);
  private readonly toast = inject(ToastService);
  private readonly refresh = inject(RefreshService);

  protected readonly s = this.store.settings;
  protected readonly shortcuts = SHORTCUTS;
  protected readonly zones = (
    Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
  ).supportedValuesOf?.('timeZone') ?? ['Europe/Paris', 'UTC'];
  protected readonly report = signal<ImportReport | null>(null);
  protected readonly pending = signal<unknown>(null);

  protected readonly themes = [
    { value: 'LIGHT' as const, label: 'Clair', icon: 'sun' },
    { value: 'DARK' as const, label: 'Sombre', icon: 'moon' },
    { value: 'SYSTEM' as const, label: 'Système', icon: 'monitor' },
  ];

  protected async set(patch: Partial<Settings>): Promise<void> {
    try {
      await this.store.update(patch);
      this.refresh.bump();
    } catch (e) {
      this.toast.error(e instanceof AppError ? e.problem.detail : 'Impossible d’enregistrer.');
    }
  }

  protected async export(
    format: 'csv' | 'json',
    scope: 'ACTIVE' | 'ARCHIVED' | 'ALL',
  ): Promise<void> {
    try {
      saveBlob(
        await firstValueFrom(this.transfer.exportTasks(format, scope)),
        `focusflow-taches.${format}`,
      );
    } catch {
      this.toast.error('L’export a échoué.');
    }
  }

  protected async backup(): Promise<void> {
    try {
      saveBlob(
        await firstValueFrom(this.transfer.backup()),
        `focusflow-sauvegarde-${this.store.today()}.json`,
      );
    } catch {
      this.toast.error('La sauvegarde a échoué.');
    }
  }

  protected async onFile(file: File | undefined): Promise<void> {
    this.report.set(null);
    this.pending.set(null);
    if (!file) return;
    try {
      const json: unknown = JSON.parse(await file.text());
      this.pending.set(json);
      this.report.set(await firstValueFrom(this.transfer.importBackup(json, true)));
    } catch (e) {
      this.pending.set(null);
      this.toast.error(e instanceof AppError ? e.problem.detail : 'Fichier JSON invalide.');
    }
  }

  protected async confirmImport(): Promise<void> {
    try {
      this.report.set(await firstValueFrom(this.transfer.importBackup(this.pending(), false)));
      this.pending.set(null);
      this.toast.success('Import terminé.');
      this.refresh.bump();
    } catch (e) {
      this.toast.error(e instanceof AppError ? e.problem.detail : 'L’import a échoué.');
    }
  }

  protected cancelImport(): void {
    this.pending.set(null);
    this.report.set(null);
  }
}
