import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { PomodoroApi } from '../../core/api/misc.api';
import { SessionType, Task } from '../../core/api/models';
import { TasksApi } from '../../core/api/tasks.api';
import { PomodoroEngine, SESSION_LABEL } from '../../core/services/pomodoro.engine';
import { SettingsStore } from '../../core/services/settings.store';
import { ToastService } from '../../core/services/toast.service';
import { Loader } from '../../core/util/loader';
import { addDays, dayLabel, formatDuration, formatTime } from '../../core/util/time';
import { IconComponent } from '../../shared/ui/icon';
import { RingComponent } from '../../shared/ui/progress-ring';
import { EmptyComponent, ErrorComponent } from '../../shared/ui/states';

const TYPES: { type: SessionType; short: string }[] = [
  { type: 'WORK', short: 'Concentration' },
  { type: 'SHORT_BREAK', short: 'Pause courte' },
  { type: 'LONG_BREAK', short: 'Pause longue' },
];

@Component({
  selector: 'ff-focus-page',
  imports: [IconComponent, RingComponent, EmptyComponent, ErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #stage class="focus-stage" [class.fullscreen-mode]="fullscreen()">
      <header class="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 class="page-title">Focus</h1>
          <p class="page-sub">Une tâche, un minuteur, aucune distraction.</p>
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn btn-secondary" (click)="showConfig.set(!showConfig())" [attr.aria-expanded]="showConfig()"><ff-icon name="settings" />Configurer</button>
          <button type="button" class="btn btn-secondary" (click)="toggleFullscreen()"><ff-icon [name]="fullscreen() ? 'minimize' : 'maximize'" />{{ fullscreen() ? 'Quitter' : 'Plein écran' }}</button>
        </div>
      </header>

      @if (engine.offline()) {
        <div class="rounded-xl border border-line bg-warning-soft text-warning px-4 py-3 mb-4 flex items-center gap-2" role="status">
          <ff-icon name="alert" /> Hors ligne : le minuteur continue grâce aux horodatages enregistrés, mais pause, reprise et fin nécessitent le serveur.
        </div>
      }

      @if (showConfig()) {
        <section class="card p-5 mb-6 anim-pop" aria-label="Durées des sessions">
          <h2 class="font-bold mb-3">Durées (en minutes)</h2>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            @for (f of fields; track f.key) {
              <div>
                <label class="field-label" [for]="'cfg-' + f.key">{{ f.label }}</label>
                <input class="input" type="number" [id]="'cfg-' + f.key" [min]="f.min" [max]="f.max" [value]="cfg()[f.key]" (change)="saveField(f.key, $any($event.target).value, f.min, f.max)" />
              </div>
            }
          </div>
          <div class="flex flex-wrap gap-6 mt-4">
            <label class="flex items-center gap-2"><input type="checkbox" class="size-4 accent-[var(--brand)]" [checked]="cfg().autoStartBreaks" (change)="settings.update({ autoStartBreaks: $any($event.target).checked })" />Démarrer automatiquement les pauses</label>
            <label class="flex items-center gap-2"><input type="checkbox" class="size-4 accent-[var(--brand)]" [checked]="cfg().autoStartWork" (change)="settings.update({ autoStartWork: $any($event.target).checked })" />Enchaîner automatiquement la session suivante</label>
          </div>
          <p class="field-hint">Les valeurs appliquées à la prochaine session. Une session déjà lancée garde sa durée.</p>
        </section>
      }

      <div class="grid xl:grid-cols-[minmax(0,1fr)_24rem] gap-6">
        <!-- Minuteur -->
        <section class="card p-6 md:p-10 flex flex-col items-center" aria-label="Minuteur">
          @let s = engine.session();

          <div class="flex gap-1 p-1 rounded-xl bg-surface-2 mb-8" role="group" aria-label="Type de session">
            @for (t of types; track t.type) {
              <button type="button" class="px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                [class]="(s ? s.type : selectedType()) === t.type ? 'bg-surface shadow-card text-brand' : 'text-muted hover:text-fg'"
                [disabled]="!!s" [attr.aria-pressed]="(s ? s.type : selectedType()) === t.type" (click)="selectedType.set(t.type)">{{ t.short }}</button>
            }
          </div>

          <ff-ring [value]="s ? engine.progress() : 0" [size]="ringSize()" [stroke]="14" [color]="s && s.type !== 'WORK' ? 'var(--success)' : 'var(--brand)'" [label]="'Progression : ' + progressPct() + ' %'">
            <div class="text-center">
              <div class="font-extrabold tabular-nums tracking-tight text-5xl sm:text-7xl" role="timer" [attr.aria-label]="'Temps restant ' + engine.clock()">{{ s ? engine.clock() : idleClock() }}</div>
              <div class="text-sm font-semibold text-muted mt-1">{{ s ? label(s.type) : label(selectedType()) }}@if (s?.status === 'PAUSED') { · en pause }</div>
              @if (s || selectedType() === 'WORK') { <div class="text-xs text-subtle mt-0.5">Pomodoro n° {{ s ? s.sequenceNumber : nextSequence() }}</div> }
            </div>
          </ff-ring>

          <div class="mt-6 text-center min-h-12">
            @if (s?.taskTitle) {
              <p class="text-muted text-sm">Tâche en cours</p>
              <p class="font-bold text-lg">{{ s!.taskTitle }}</p>
            } @else if (!s && selectedType() === 'WORK') {
              <label class="field-label" for="focus-task">Sur quelle tâche travaillez-vous ?</label>
              <select id="focus-task" class="input max-w-sm" [value]="taskId()" (change)="taskId.set($any($event.target).value)">
                <option value="">Sans tâche associée</option>
                @for (t of tasks(); track t.id) { <option [value]="t.id">{{ t.quadrant }} · {{ t.title }}</option> }
              </select>
            } @else if (s) { <p class="text-muted">{{ s.type === 'WORK' ? 'Session libre (sans tâche)' : 'Respirez, étirez-vous, buvez un verre d’eau.' }}</p> }
          </div>

          <div class="flex flex-wrap items-center justify-center gap-3 mt-6">
            @if (!s) {
              <button type="button" class="btn btn-primary btn-lg" [disabled]="engine.busy()" (click)="start()"><ff-icon name="play" />Démarrer</button>
            } @else {
              @if (engine.isRunning()) {
                <button type="button" class="btn btn-primary btn-lg" [disabled]="engine.busy()" (click)="engine.pause()"><ff-icon name="pause" />Pause</button>
              } @else {
                <button type="button" class="btn btn-primary btn-lg" [disabled]="engine.busy()" (click)="engine.resume()"><ff-icon name="play" />Reprendre</button>
              }
              <button type="button" class="btn btn-secondary btn-lg" [disabled]="engine.busy()" (click)="reset()"><ff-icon name="restore" />Réinitialiser</button>
              <button type="button" class="btn btn-ghost btn-lg" [disabled]="engine.busy()" (click)="engine.skip()"><ff-icon name="skip" />Passer</button>
            }
          </div>
          <p class="text-xs text-subtle mt-4"><kbd class="kbd">Espace</kbd> pour démarrer / mettre en pause</p>

          <p class="mt-6 text-sm text-muted flex items-center gap-2" aria-live="polite">
            <ff-icon name="arrow-right" [size]="14" />Ensuite :
            <strong class="text-fg">{{ nextLabel() }}</strong>
          </p>

          @if (engine.finished(); as f) {
            <div class="mt-6 w-full max-w-md rounded-xl border border-line bg-brand-soft p-4 anim-pop" role="status">
              <p class="font-bold text-brand flex items-center gap-2"><ff-icon name="circle-check" />{{ f.type === 'WORK' ? 'Session terminée — bravo !' : 'Pause terminée' }}</p>
              @if (f.type === 'WORK') { <p class="text-sm text-muted mt-1">{{ minutes(f.workedSeconds) }} de concentration enregistrées{{ f.taskTitle ? ' sur « ' + f.taskTitle + ' »' : '' }}.</p> }
              <div class="flex flex-wrap gap-2 mt-3">
                <button type="button" class="btn btn-primary btn-sm" (click)="startNext()">
                  <ff-icon name="play" [size]="14" />{{ f.next.type === 'WORK' ? 'Nouvelle session' : f.next.type === 'LONG_BREAK' ? 'Pause longue' : 'Pause courte' }}
                </button>
                @if (f.type !== 'WORK') { <button type="button" class="btn btn-secondary btn-sm" (click)="engine.dismissFinished()">Choisir une autre tâche</button> }
                <button type="button" class="btn btn-ghost btn-sm" (click)="engine.dismissFinished()">Plus tard</button>
              </div>
            </div>
          }
        </section>

        <!-- Objectif + historique -->
        <div class="space-y-6">
          <section class="card p-5" aria-labelledby="goal-h">
            <h2 id="goal-h" class="section-title mb-3">Objectif du jour</h2>
            <div class="flex items-center gap-4">
              <ff-ring [value]="goalProgress()" [size]="84" [stroke]="9" color="var(--success)" label="Progression de l’objectif quotidien"><span class="font-bold text-sm tabular-nums">{{ (goalProgress() * 100).toFixed(0) }}%</span></ff-ring>
              <div>
                <p class="text-2xl font-extrabold tabular-nums">{{ formatDuration(todaySeconds()) }}</p>
                <p class="text-sm text-muted">sur {{ formatDuration(cfg().dailyFocusGoalMinutes * 60) }} · {{ todayCompleted() }} Pomodoro{{ todayCompleted() > 1 ? 's' : '' }}</p>
              </div>
            </div>
          </section>

          <section class="card p-5" aria-labelledby="hist-h">
            <h2 id="hist-h" class="font-bold flex items-center gap-2 mb-1"><ff-icon name="history" />Historique des Pomodoros</h2>
            <p class="text-sm text-muted mb-4">14 derniers jours — date, heure et durée de chaque session.</p>
            @if (history.error()) { <ff-error (retry)="history.load()" /> }
            @else if (history.loading()) { <div class="skeleton h-32"></div> }
            @else if (!history.data()!.length) { <ff-empty icon="timer" title="Aucun Pomodoro enregistré" hint="Vos sessions de concentration apparaîtront ici, jour par jour." /> }
            @else {
              <div class="space-y-5 max-h-[34rem] overflow-y-auto pr-1">
                @for (d of history.data()!; track d.date) {
                  <div>
                    <div class="flex items-baseline justify-between mb-1.5">
                      <h3 class="font-semibold capitalize">{{ dayTitle(d.date) }}</h3>
                      <span class="text-sm tabular-nums text-muted"><strong class="text-fg">{{ formatDuration(d.workedSeconds) }}</strong> · {{ d.completedSessions }} 🍅</span>
                    </div>
                    <ul class="divide-y divide-line rounded-xl border border-line">
                      @for (e of d.sessions; track e.id) {
                        <li class="flex items-center gap-3 px-3 py-2 text-sm">
                          <span class="size-2 rounded-full flex-none" [class]="e.status === 'COMPLETED' ? 'bg-success' : 'bg-warning'" [attr.aria-label]="e.status === 'COMPLETED' ? 'Terminée' : 'Interrompue'"></span>
                          <span class="tabular-nums text-muted">{{ time(e.startedAt) }}–{{ time(e.endedAt) }}</span>
                          <span class="flex-1 truncate">{{ e.taskTitle ?? 'Sans tâche' }}</span>
                          <span class="tabular-nums font-semibold">{{ formatDuration(e.workedSeconds) }}</span>
                          @if (e.status !== 'COMPLETED') { <span class="chip">interrompue</span> }
                        </li>
                      }
                    </ul>
                  </div>
                }
              </div>
            }
          </section>
        </div>
      </div>
    </div>
  `,
  styles: `
    .fullscreen-mode { background: var(--page); padding: 2rem; overflow-y: auto; min-height: 100dvh; }
  `,
})
export class FocusPage {
  protected readonly engine = inject(PomodoroEngine);
  protected readonly settings = inject(SettingsStore);
  private readonly toast = inject(ToastService);
  private readonly tasksApi = inject(TasksApi);
  private readonly pomodoroApi = inject(PomodoroApi);

  protected readonly types = TYPES;
  protected readonly selectedType = signal<SessionType>('WORK');
  protected readonly taskId = signal(this.engine.lastTaskId() ?? '');
  protected readonly showConfig = signal(false);
  protected readonly fullscreen = signal(false);
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');

  protected readonly cfg = this.settings.settings;
  protected readonly tasks = toSignal(this.tasksApi.priorities('ALL'), { initialValue: [] as Task[] });
  protected readonly formatDuration = formatDuration;

  protected readonly fields = [
    { key: 'workMinutes', label: 'Travail', min: 1, max: 180 },
    { key: 'shortBreakMinutes', label: 'Pause courte', min: 1, max: 60 },
    { key: 'longBreakMinutes', label: 'Pause longue', min: 1, max: 120 },
    { key: 'sessionsBeforeLong', label: 'Sessions avant pause longue', min: 1, max: 12 },
  ] as const;

  protected readonly history = new Loader(() => this.pomodoroApi.dailyHistory(addDays(this.settings.today(), -13), this.settings.today()));

  protected readonly ringSize = signal(typeof window !== 'undefined' && window.innerWidth < 480 ? 250 : 340);
  protected readonly progressPct = computed(() => Math.round(this.engine.progress() * 100));

  protected readonly idleClock = computed(() => {
    const c = this.cfg();
    const m = { WORK: c.workMinutes, SHORT_BREAK: c.shortBreakMinutes, LONG_BREAK: c.longBreakMinutes }[this.selectedType()];
    return `${String(m).padStart(2, '0')}:00`;
  });

  protected readonly todayEntry = computed(() => this.history.data()?.find((d) => d.date === this.settings.today()));
  protected readonly todaySeconds = computed(() => this.todayEntry()?.workedSeconds ?? 0);
  protected readonly todayCompleted = computed(() => this.todayEntry()?.completedSessions ?? 0);
  protected readonly goalProgress = computed(() => {
    const goal = this.cfg().dailyFocusGoalMinutes * 60;
    return goal > 0 ? Math.min(1, this.todaySeconds() / goal) : 0;
  });
  protected readonly nextSequence = computed(() => (this.todayCompleted() % this.cfg().sessionsBeforeLong) + 1);

  protected readonly nextLabel = computed(() => {
    const s = this.engine.session();
    const c = this.cfg();
    if (s) {
      const n = s.next;
      return `${SESSION_LABEL[n.type]} de ${Math.round(n.plannedSeconds / 60)} min`;
    }
    return this.selectedType() === 'WORK' ? `Pause de ${c.shortBreakMinutes} min (longue de ${c.longBreakMinutes} min toutes les ${c.sessionsBeforeLong} sessions)` : `Session de ${c.workMinutes} min`;
  });

  constructor() {
    document.addEventListener('fullscreenchange', () => this.fullscreen.set(!!document.fullscreenElement));
  }

  protected label(t: SessionType): string {
    return SESSION_LABEL[t];
  }

  protected time(iso: string): string {
    return formatTime(iso, this.settings.timeZone());
  }

  protected dayTitle(day: string): string {
    return day === this.settings.today() ? "Aujourd'hui" : day === addDays(this.settings.today(), -1) ? 'Hier' : dayLabel(day);
  }

  protected minutes(s: number): string {
    return formatDuration(s);
  }

  protected async start(): Promise<void> {
    const type = this.selectedType();
    await this.engine.start(type, type === 'WORK' && this.taskId() ? this.taskId() : null);
  }

  protected async startNext(): Promise<void> {
    const f = this.engine.finished();
    if (!f) return;
    await this.engine.start(f.next.type, f.next.type === 'WORK' ? (this.engine.lastTaskId() ?? (this.taskId() || null)) : null);
  }

  protected async reset(): Promise<void> {
    await this.engine.cancel();
    this.toast.info('Session réinitialisée. Le temps déjà travaillé reste enregistré.');
  }

  protected async saveField(key: 'workMinutes' | 'shortBreakMinutes' | 'longBreakMinutes' | 'sessionsBeforeLong', raw: string, min: number, max: number): Promise<void> {
    const v = Math.round(Number(raw));
    if (!Number.isFinite(v) || v < min || v > max) {
      this.toast.error(`Valeur comprise entre ${min} et ${max} attendue.`);
      return;
    }
    await this.settings.update({ [key]: v });
  }

  protected async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await this.stage()?.nativeElement.requestFullscreen();
    } catch {
      this.toast.error('Le mode plein écran n’est pas disponible dans ce navigateur.');
    }
  }
}
