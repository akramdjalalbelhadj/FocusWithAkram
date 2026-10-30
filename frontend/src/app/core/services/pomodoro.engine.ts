import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PomodoroApi } from '../api/misc.api';
import { PomodoroSession, SessionState, SessionType } from '../api/models';
import { AppError } from '../interceptors/error.interceptor';
import { formatClock } from '../util/time';
import { RefreshService } from './refresh.service';
import { SettingsStore } from './settings.store';
import { SoundService } from './sound.service';
import { ToastService } from './toast.service';

const CACHE_KEY = 'ff.pomodoro.v1';

export const SESSION_LABEL: Record<SessionType, string> = {
  WORK: 'Concentration',
  SHORT_BREAK: 'Pause courte',
  LONG_BREAK: 'Pause longue',
};

interface Cache {
  session: PomodoroSession | null;
  offsetMs: number;
  lastTaskId: string | null;
}

/**
 * Moteur du minuteur. Le temps restant n'est JAMAIS decremente par un compteur : il est recalcule a chaque
 * affichage depuis l'instant de fin theorique fourni par le serveur, corrige de l'ecart d'horloge
 * (offset = heure serveur - heure client, mesure a chaque reponse). setInterval ne sert qu'a rafraichir
 * l'affichage ; apres un onglet en arriere-plan, une veille, un rechargement ou une coupure reseau,
 * l'etat est resynchronise depuis le serveur (source de verite) sans derive ni double comptage.
 */
@Injectable({ providedIn: 'root' })
export class PomodoroEngine {
  private readonly api = inject(PomodoroApi);
  private readonly settings = inject(SettingsStore);
  private readonly refresh = inject(RefreshService);
  private readonly sound = inject(SoundService);
  private readonly toast = inject(ToastService);
  private readonly doc = inject(DOCUMENT);

  readonly session = signal<PomodoroSession | null>(null);
  /** Derniere session terminee : declenche l'invite « et maintenant ? » sur la page Focus. */
  readonly finished = signal<PomodoroSession | null>(null);
  readonly busy = signal(false);
  readonly offline = signal(false);
  readonly lastTaskId = signal<string | null>(null);
  private readonly offsetMs = signal(0);
  private readonly now = signal(Date.now());
  private completing = false;

  readonly isActive = computed(() => this.session() !== null);
  readonly isRunning = computed(() => this.session()?.status === 'RUNNING');
  readonly isPaused = computed(() => this.session()?.status === 'PAUSED');

  readonly remainingSeconds = computed(() => {
    const s = this.session();
    if (!s) return 0;
    if (s.status === 'RUNNING' && s.expectedEndAt) {
      return Math.max(0, (Date.parse(s.expectedEndAt) - (this.now() + this.offsetMs())) / 1000);
    }
    return s.remainingSeconds;
  });

  readonly progress = computed(() => {
    const s = this.session();
    return s ? Math.min(1, Math.max(0, 1 - this.remainingSeconds() / s.plannedSeconds)) : 0;
  });

  readonly clock = computed(() => formatClock(this.remainingSeconds()));

  constructor() {
    this.restoreCache();
    void this.sync();

    setInterval(() => {
      if (this.isRunning()) {
        this.now.set(Date.now());
        if (this.remainingSeconds() <= 0) void this.complete();
      }
    }, 250);

    // Reprise apres onglet cache / ecran verrouille / retour du reseau : on relit l'etat serveur.
    this.doc.addEventListener('visibilitychange', () => {
      if (!this.doc.hidden) void this.sync();
    });
    window.addEventListener('focus', () => void this.sync());
    window.addEventListener('online', () => void this.sync());

    effect(() => {
      const s = this.session();
      this.doc.title = s ? `${this.clock()} · ${SESSION_LABEL[s.type]} — FocusWithAkram` : 'FocusWithAkram';
    });
  }

  /** Relit la session active. Hors ligne, on conserve l'etat local (toujours exact grace aux horodatages). */
  async sync(): Promise<void> {
    try {
      this.apply(await firstValueFrom(this.api.active()));
      this.offline.set(false);
    } catch (e) {
      if (e instanceof AppError && e.offline) this.offline.set(true);
    }
  }

  async start(type: SessionType, taskId: string | null = null, plannedSeconds: number | null = null): Promise<boolean> {
    this.finished.set(null);
    if (type === 'WORK') this.lastTaskId.set(taskId);
    return this.run(() => this.api.start({ type, taskId, plannedSeconds }));
  }

  async pause(): Promise<void> {
    const s = this.session();
    if (s) await this.run(() => this.api.pause(s.id));
  }

  async resume(): Promise<void> {
    const s = this.session();
    if (s) await this.run(() => this.api.resume(s.id));
  }

  /** Reinitialise : interrompt la session (le temps deja travaille reste enregistre) sans la compter comme terminee. */
  async cancel(): Promise<void> {
    const s = this.session();
    if (s) await this.run(() => this.api.cancel(s.id));
  }

  /** « Passer » : interrompt puis propose la session suivante. */
  async skip(): Promise<void> {
    const s = this.session();
    if (!s) return;
    const ok = await this.run(() => this.api.cancel(s.id));
    if (ok) this.finished.set(s);
  }

  dismissFinished(): void {
    this.finished.set(null);
  }

  async toggle(): Promise<void> {
    if (this.isRunning()) await this.pause();
    else if (this.isPaused()) await this.resume();
  }

  private async complete(): Promise<void> {
    const s = this.session();
    if (!s || this.completing) return;
    this.completing = true;
    try {
      const state = await firstValueFrom(this.api.complete(s.id));
      this.apply(state);
      const done = state.session ?? { ...s, status: 'COMPLETED' as const };
      this.onFinished(done);
    } catch (e) {
      // Ecart d'horloge residuel : le serveur n'estime pas la session finie. On resynchronise et on reessaiera.
      if (e instanceof AppError && e.problem.code === 'SESSION_NOT_FINISHED') await this.sync();
    } finally {
      this.completing = false;
    }
  }

  private onFinished(done: PomodoroSession): void {
    const cfg = this.settings.settings();
    this.refresh.bump();
    if (cfg.soundEnabled) this.sound.play(cfg.soundName);
    const label = done.type === 'WORK' ? 'Session terminée — bravo ! Prenez une pause.' : 'Pause terminée — prêt à reprendre ?';
    this.toast.success(label);
    if (cfg.notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('FocusWithAkram', { body: label, tag: 'focusflow-session' });
    }
    this.finished.set(done);
    const autoStart = done.type === 'WORK' ? cfg.autoStartBreaks : cfg.autoStartWork;
    if (autoStart) {
      const next = done.next;
      void this.start(next.type, next.type === 'WORK' ? this.lastTaskId() : null);
    }
  }

  private async run(call: () => ReturnType<PomodoroApi['active']>): Promise<boolean> {
    if (this.busy()) return false;
    this.busy.set(true);
    try {
      this.apply(await firstValueFrom(call()));
      this.offline.set(false);
      this.refresh.bump();
      return true;
    } catch (e) {
      if (e instanceof AppError) {
        if (e.offline) this.offline.set(true);
        // Le serveur est la reference : on reaffiche son etat plutot que d'inventer un etat local.
        if (e.problem.status === 409 || e.problem.status === 422) {
          this.toast.error(e.problem.detail);
          await this.sync();
        }
      }
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  private apply(state: SessionState): void {
    this.offsetMs.set(Date.parse(state.serverTime) - Date.now());
    this.now.set(Date.now());
    const s = state.session;
    // Une session deja terminee cote serveur (echeance passee pendant l'absence) est presentee une fois.
    if (s && (s.status === 'COMPLETED' || s.status === 'CANCELLED')) {
      if (this.session() !== null || this.finished() === null) this.onSettledElsewhere(s);
      this.session.set(null);
    } else {
      this.session.set(s);
    }
    this.persist();
  }

  private onSettledElsewhere(s: PomodoroSession): void {
    if (s.status === 'COMPLETED') {
      this.refresh.bump();
      this.finished.set(s);
    }
  }

  private persist(): void {
    try {
      const cache: Cache = { session: this.session(), offsetMs: this.offsetMs(), lastTaskId: this.lastTaskId() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      /* stockage indisponible */
    }
  }

  private restoreCache(): void {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const cache = JSON.parse(raw) as Cache;
      this.offsetMs.set(cache.offsetMs ?? 0);
      this.lastTaskId.set(cache.lastTaskId ?? null);
      if (cache.session && (cache.session.status === 'RUNNING' || cache.session.status === 'PAUSED')) {
        this.session.set(cache.session);
      }
    } catch {
      /* cache corrompu : ignore, le serveur fera foi */
    }
  }
}
