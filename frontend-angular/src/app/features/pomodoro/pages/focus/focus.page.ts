import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { PomodoroApi } from '../../../../core/api/misc.api';
import { SessionType, Task } from '../../../../core/api/models';
import { TasksApi } from '../../../../core/api/tasks.api';
import { PomodoroEngine, SESSION_LABEL } from '../../../../core/services/pomodoro.engine';
import { SettingsStore } from '../../../../core/services/settings.store';
import { ToastService } from '../../../../core/services/toast.service';
import { Loader } from '../../../../core/util/loader';
import { addDays, dayLabel, formatDuration, formatTime } from '../../../../core/util/time';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { RingComponent } from '../../../../shared/ui/progress-ring/progress-ring';
import { EmptyComponent, ErrorComponent } from '../../../../shared/ui/states/index';

const TYPES: { type: SessionType; short: string }[] = [
  { type: 'WORK', short: 'Concentration' },
  { type: 'SHORT_BREAK', short: 'Pause courte' },
  { type: 'LONG_BREAK', short: 'Pause longue' },
];

@Component({
  selector: 'ff-focus-page',
  imports: [IconComponent, RingComponent, EmptyComponent, ErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './focus.page.html',
  styleUrl: './focus.page.css',
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
  protected readonly tasks = toSignal(this.tasksApi.priorities('ALL'), {
    initialValue: [] as Task[],
  });
  protected readonly formatDuration = formatDuration;

  protected readonly fields = [
    { key: 'workMinutes', label: 'Travail', min: 1, max: 180 },
    { key: 'shortBreakMinutes', label: 'Pause courte', min: 1, max: 60 },
    { key: 'longBreakMinutes', label: 'Pause longue', min: 1, max: 120 },
    { key: 'sessionsBeforeLong', label: 'Sessions avant pause longue', min: 1, max: 12 },
  ] as const;

  protected readonly history = new Loader(() =>
    this.pomodoroApi.dailyHistory(addDays(this.settings.today(), -13), this.settings.today()),
  );

  protected readonly ringSize = signal(
    typeof window !== 'undefined' && window.innerWidth < 480 ? 250 : 280,
  );
  protected readonly progressPct = computed(() => Math.round(this.engine.progress() * 100));

  protected readonly idleClock = computed(() => {
    const c = this.cfg();
    const m = {
      WORK: c.workMinutes,
      SHORT_BREAK: c.shortBreakMinutes,
      LONG_BREAK: c.longBreakMinutes,
    }[this.selectedType()];
    return `${String(m).padStart(2, '0')}:00`;
  });

  protected readonly todayEntry = computed(() =>
    this.history.data()?.find((d) => d.date === this.settings.today()),
  );
  protected readonly todaySeconds = computed(() => this.todayEntry()?.workedSeconds ?? 0);
  protected readonly todayCompleted = computed(() => this.todayEntry()?.completedSessions ?? 0);
  protected readonly goalProgress = computed(() => {
    const goal = this.cfg().dailyFocusGoalMinutes * 60;
    return goal > 0 ? Math.min(1, this.todaySeconds() / goal) : 0;
  });
  protected readonly nextSequence = computed(
    () => (this.todayCompleted() % this.cfg().sessionsBeforeLong) + 1,
  );

  protected readonly nextLabel = computed(() => {
    const s = this.engine.session();
    const c = this.cfg();
    if (s) {
      const n = s.next;
      return `${SESSION_LABEL[n.type]} de ${Math.round(n.plannedSeconds / 60)} min`;
    }
    return this.selectedType() === 'WORK'
      ? `Pause de ${c.shortBreakMinutes} min (longue de ${c.longBreakMinutes} min toutes les ${c.sessionsBeforeLong} sessions)`
      : `Session de ${c.workMinutes} min`;
  });

  constructor() {
    document.addEventListener('fullscreenchange', () =>
      this.fullscreen.set(!!document.fullscreenElement),
    );
  }

  protected label(t: SessionType): string {
    return SESSION_LABEL[t];
  }

  protected time(iso: string): string {
    return formatTime(iso, this.settings.timeZone());
  }

  protected dayTitle(day: string): string {
    return day === this.settings.today()
      ? "Aujourd'hui"
      : day === addDays(this.settings.today(), -1)
        ? 'Hier'
        : dayLabel(day);
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
    await this.engine.start(
      f.next.type,
      f.next.type === 'WORK' ? (this.engine.lastTaskId() ?? (this.taskId() || null)) : null,
    );
  }

  protected async reset(): Promise<void> {
    await this.engine.cancel();
    this.toast.info('Session réinitialisée. Le temps déjà travaillé reste enregistré.');
  }

  protected async saveField(
    key: 'workMinutes' | 'shortBreakMinutes' | 'longBreakMinutes' | 'sessionsBeforeLong',
    raw: string,
    min: number,
    max: number,
  ): Promise<void> {
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
