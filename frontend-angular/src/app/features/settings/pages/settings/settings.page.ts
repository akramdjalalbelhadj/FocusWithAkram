import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TransferApi } from '../../../../core/api/misc.api';
import { ImportReport, Settings } from '../../../../core/api/models';
import { AppError } from '../../../../core/interceptors/error.interceptor';
import { RefreshService } from '../../../../core/services/refresh.service';
import { SettingsStore } from '../../../../core/services/settings.store';
import { SHORTCUTS } from '../../../../core/services/shortcuts.service';
import { SoundService } from '../../../../core/services/sound.service';
import { ToastService } from '../../../../core/services/toast.service';
import { saveBlob } from '../../../../core/util/download';
import { IconComponent } from '../../../../shared/ui/icon/icon';

@Component({
  selector: 'ff-settings-page',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.page.html',
})
export class SettingsPage {
  protected readonly store = inject(SettingsStore);
  protected readonly sound = inject(SoundService);
  private readonly transfer = inject(TransferApi);
  private readonly toast = inject(ToastService);
  private readonly refresh = inject(RefreshService);

  protected readonly s = this.store.settings;
  protected readonly shortcuts = SHORTCUTS;
  protected readonly zones = (
    Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
  ).supportedValuesOf?.('timeZone') ?? ['Europe/Paris', 'UTC'];
  protected readonly permission = signal<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported',
  );
  protected readonly report = signal<ImportReport | null>(null);
  protected readonly pending = signal<unknown>(null);

  protected readonly themes = [
    { value: 'LIGHT' as const, label: 'Clair', icon: 'sun' },
    { value: 'DARK' as const, label: 'Sombre', icon: 'moon' },
    { value: 'SYSTEM' as const, label: 'Système', icon: 'monitor' },
  ];

  protected readonly fields = [
    { key: 'workMinutes', label: 'Travail (min)', min: 1, max: 180 },
    { key: 'shortBreakMinutes', label: 'Pause courte (min)', min: 1, max: 60 },
    { key: 'longBreakMinutes', label: 'Pause longue (min)', min: 1, max: 120 },
    { key: 'sessionsBeforeLong', label: 'Sessions avant pause longue', min: 1, max: 12 },
  ] as const;

  protected async set(patch: Partial<Settings>): Promise<void> {
    try {
      await this.store.update(patch);
      this.refresh.bump();
    } catch (e) {
      this.toast.error(e instanceof AppError ? e.problem.detail : 'Impossible d’enregistrer.');
    }
  }

  protected async num(key: keyof Settings, raw: string, min: number, max: number): Promise<void> {
    const v = Math.round(Number(raw));
    if (!Number.isFinite(v) || v < min || v > max) {
      this.toast.error(`Valeur comprise entre ${min} et ${max} attendue.`);
      return;
    }
    await this.set({ [key]: v } as Partial<Settings>);
  }

  protected async toggleNotifications(on: boolean): Promise<void> {
    if (on && 'Notification' in window && Notification.permission !== 'granted') {
      const p = await Notification.requestPermission();
      this.permission.set(p);
      if (p !== 'granted') {
        this.toast.error('Permission refusée : les notifications restent désactivées.');
        await this.set({ notificationsEnabled: false });
        return;
      }
    }
    await this.set({ notificationsEnabled: on });
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
