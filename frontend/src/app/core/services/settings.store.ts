import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SettingsApi } from '../api/misc.api';
import { Settings } from '../api/models';
import { formatDateTime, formatDay } from '../util/time';

const DEFAULTS: Settings = {
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
  weekStartsOn: 'MONDAY',
  theme: 'SYSTEM',
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLong: 4,
  autoStartBreaks: false,
  autoStartWork: false,
  notificationsEnabled: false,
  soundEnabled: true,
  soundName: 'bell',
  dailyFocusGoalMinutes: 120,
  subtasksCompleteParent: false,
  shortcutsEnabled: true,
  compactMode: false,
};

const THEME_KEY = 'ff.theme';

/** Parametres utilisateur partages (signal) ; applique le theme et fournit le fuseau aux formateurs de dates. */
@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly api = inject(SettingsApi);
  private readonly doc = inject(DOCUMENT);

  readonly settings = signal<Settings>({ ...DEFAULTS, theme: cachedTheme() });
  readonly loaded = signal(false);
  readonly timeZone = computed(() => this.settings().timeZone);

  constructor() {
    effect(() => this.applyTheme(this.settings().theme));
    // Evite un flash de theme au chargement : on reprend la derniere preference connue.
    try {
      const cached = localStorage.getItem(THEME_KEY) as Settings['theme'] | null;
      if (cached) this.applyTheme(cached);
    } catch {
      /* stockage indisponible */
    }
  }

  async load(): Promise<void> {
    try {
      this.settings.set(await firstValueFrom(this.api.get()));
    } catch {
      /* serveur indisponible : valeurs par defaut, l'application reste affichable */
    } finally {
      this.loaded.set(true);
    }
  }

  async update(patch: Partial<Settings>): Promise<void> {
    const previous = this.settings();
    this.settings.set({ ...previous, ...patch });
    try {
      this.settings.set(await firstValueFrom(this.api.update(patch)));
    } catch (e) {
      this.settings.set(previous);
      throw e;
    }
  }

  fmt(instant: string | null | undefined): string {
    return formatDateTime(instant, this.timeZone());
  }

  day(instant: string): string {
    return formatDay(instant, this.timeZone());
  }

  today(): string {
    return formatDay(new Date(), this.timeZone());
  }

  private applyTheme(theme: Settings['theme']): void {
    const root = this.doc.documentElement;
    if (theme === 'SYSTEM') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme.toLowerCase());
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }
}

function cachedTheme(): Settings['theme'] { try { const value = localStorage.getItem(THEME_KEY); return value === 'LIGHT' || value === 'DARK' ? value : 'SYSTEM'; } catch { return 'SYSTEM'; } }
