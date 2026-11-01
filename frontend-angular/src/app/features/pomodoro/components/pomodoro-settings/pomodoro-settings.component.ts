import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Settings } from '../../../../core/api/models';
import { AppError } from '../../../../core/interceptors/error.interceptor';
import { SettingsStore } from '../../../../core/services/settings.store';
import { RefreshService } from '../../../../core/services/refresh.service';
import { SoundService } from '../../../../core/services/sound.service';
import { ToastService } from '../../../../core/services/toast.service';
import { IconComponent } from '../../../../shared/ui/icon/icon';

@Component({
  selector: 'ff-pomodoro-settings',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pomodoro-settings.component.html',
  styleUrl: './pomodoro-settings.component.css',
})
export class PomodoroSettingsComponent {
  protected readonly store = inject(SettingsStore);
  protected readonly sound = inject(SoundService);
  private readonly toast = inject(ToastService);
  private readonly refresh = inject(RefreshService);
  protected readonly s = this.store.settings;
  protected readonly permission = signal<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported',
  );
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
    if (on && !('Notification' in window)) {
      this.toast.error('Ce navigateur ne prend pas en charge les notifications.');
      return;
    }
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
}
