import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Task, TaskExecution, TimelineEvent, TimelineEventType } from '../../core/api/models';
import { TasksApi } from '../../core/api/tasks.api';
import { AppError } from '../../core/interceptors/error.interceptor';
import { RefreshService } from '../../core/services/refresh.service';
import { SettingsStore } from '../../core/services/settings.store';
import { formatDuration, formatTime } from '../../core/util/time';
import { QuadrantBadgeComponent, StatusBadgeComponent } from '../../shared/ui/badges';
import { IconComponent } from '../../shared/ui/icon';
import { ErrorComponent, SkeletonComponent } from '../../shared/ui/states';
import { TaskActions } from './task-actions.service';

const EVENT_LABEL: Record<TimelineEventType, string> = {
  CREATED: 'Création',
  PLANNED_START: 'Début prévu',
  ACTUAL_START: 'Début réel',
  PLANNED_END: 'Fin prévue',
  ACTUAL_END: 'Fin réelle',
  ARCHIVED: 'Archivage',
};

@Component({
  selector: 'ff-task-detail-panel',
  imports: [IconComponent, StatusBadgeComponent, QuadrantBadgeComponent, SkeletonComponent, ErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="h-full w-[min(34rem,100vw)] bg-surface border-l border-line shadow-modal flex flex-col anim-slide" role="dialog" aria-label="Détail de la tâche">
      <header class="flex items-start gap-3 p-5 border-b border-line">
        <div class="min-w-0 flex-1">
          @if (task(); as t) {
            <h2 class="text-lg font-bold leading-snug break-words">{{ t.title }}</h2>
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <ff-status-badge [status]="t.status" />
              <ff-quadrant-badge [q]="t.quadrant" />
              @if (t.overdue) { <span class="badge badge-danger"><ff-icon name="alert" [size]="12" />En retard</span> }
              @if (t.archivedAt) { <span class="badge badge-brand"><ff-icon name="archive" [size]="12" />Archivée</span> }
            </div>
          } @else { <div class="skeleton h-6 w-2/3"></div> }
        </div>
        <button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label="Fermer le panneau" (click)="ref.close()"><ff-icon name="x" /></button>
      </header>

      <div class="flex-1 overflow-y-auto p-5 space-y-6">
        @if (error()) { <ff-error [message]="error()" (retry)="load()" /> }
        @else if (!task()) { <ff-skeleton [count]="4" /> }
        @else {
          @let t = task()!;

          <div class="flex flex-wrap gap-2">
            @if (!t.archivedAt) {
              @if (t.status === 'TODO') { <button type="button" class="btn btn-primary btn-sm" (click)="actions.start(t)"><ff-icon name="play" [size]="14" />Commencer la tâche</button> }
              @if (t.status === 'IN_PROGRESS') { <button type="button" class="btn btn-secondary btn-sm" (click)="actions.pause(t)"><ff-icon name="pause" [size]="14" />Mettre en pause</button> }
              <button type="button" class="btn btn-secondary btn-sm" (click)="actions.complete(t)"><ff-icon name="circle-check" [size]="14" />Terminer la tâche</button>
              <button type="button" class="btn btn-secondary btn-sm" (click)="actions.focusOn(t); ref.close()"><ff-icon name="timer" [size]="14" />Pomodoro</button>
              <button type="button" class="btn btn-ghost btn-sm" (click)="actions.edit(t)"><ff-icon name="pencil" [size]="14" />Modifier</button>
              @if (t.actualStartAt) { <button type="button" class="btn btn-ghost btn-sm" (click)="actions.start(t, true)"><ff-icon name="clock" [size]="14" />Corriger le début</button> }
            } @else {
              <button type="button" class="btn btn-primary btn-sm" (click)="actions.restore(t)"><ff-icon name="restore" [size]="14" />Restaurer (nouveau cycle)</button>
            }
            <button type="button" class="btn btn-ghost btn-sm" (click)="actions.duplicate(t)"><ff-icon name="copy" [size]="14" />Dupliquer</button>
            <button type="button" class="btn btn-danger btn-sm" (click)="remove(t)"><ff-icon name="trash" [size]="14" />Supprimer</button>
          </div>

          @if (t.description) { <p class="whitespace-pre-wrap text-muted">{{ t.description }}</p> }

          <div class="flex flex-wrap gap-2 text-sm">
            @if (t.project) { <span class="chip"><span class="size-2 rounded-full" [style.background]="t.project.color"></span>{{ t.project.name }}</span> }
            @for (tag of t.tags; track tag) { <span class="chip"><ff-icon name="tag" [size]="11" />{{ tag }}</span> }
            @if (t.estimatedMinutes) { <span class="chip"><ff-icon name="hourglass" [size]="11" />Estimé {{ fmtMin(t.estimatedMinutes) }}</span> }
          </div>

          <section aria-labelledby="sum-h">
            <h3 id="sum-h" class="section-title mb-2">Planning et réalisation</h3>
            <table class="w-full text-sm">
              <caption class="sr-only-text">Comparaison entre le planning et la réalisation</caption>
              <tbody class="divide-y divide-line">
                @for (row of rows(); track row[0]) {
                  <tr>
                    <th scope="row" class="text-left font-normal text-muted py-1.5 pr-3">{{ row[0] }}</th>
                    <td class="py-1.5 text-right tabular-nums font-medium" [class]="row[2] ?? ''">{{ row[1] }}</td>
                  </tr>
                }
              </tbody>
            </table>
            <p class="field-hint">Un écart négatif signifie « plus tôt que prévu ». Le temps actif ne compte que les sessions Pomodoro de travail.</p>
          </section>

          <section aria-labelledby="tl-h">
            <h3 id="tl-h" class="section-title mb-3">Chronologie</h3>
            <ol class="relative border-l-2 border-line ml-2 space-y-4">
              @for (e of timeline(); track e.type) {
                <li class="pl-5 relative">
                  <span class="absolute -left-[7px] top-1 size-3 rounded-full border-2"
                    [class]="e.occurred ? 'bg-brand border-brand' : 'bg-surface border-line-strong'"></span>
                  <div class="flex items-baseline justify-between gap-3" [class.opacity-60]="!e.occurred">
                    <span class="font-medium text-sm">{{ label(e.type) }}</span>
                    <span class="text-sm tabular-nums text-muted">{{ e.at ? settings.fmt(e.at) : 'Non renseigné' }}</span>
                  </div>
                  @if (e.at && !e.occurred) { <span class="text-xs text-subtle">À venir</span> }
                </li>
              }
            </ol>
          </section>

          <section aria-labelledby="st-h">
            <div class="flex items-center justify-between mb-2">
              <h3 id="st-h" class="section-title">Sous-tâches</h3>
              @if (t.subtasksTotal) { <span class="text-xs text-muted tabular-nums">{{ t.subtasksDone }}/{{ t.subtasksTotal }}</span> }
            </div>
            @if (t.subtasksTotal) {
              <div class="h-1.5 rounded-full bg-surface-3 overflow-hidden mb-3" role="progressbar" aria-label="Progression des sous-tâches"
                [attr.aria-valuenow]="t.subtasksDone" aria-valuemin="0" [attr.aria-valuemax]="t.subtasksTotal">
                <div class="h-full bg-brand transition-all" [style.width.%]="(t.subtasksDone / t.subtasksTotal) * 100"></div>
              </div>
            }
            <ul class="space-y-1">
              @for (s of t.subtasks; track s.id) {
                <li class="flex items-center gap-2 group">
                  <input type="checkbox" class="size-4 accent-[var(--brand)]" [checked]="s.done" [attr.aria-label]="s.title" (change)="toggleSub(s.id, $any($event.target).checked)" />
                  <span class="flex-1" [class.line-through]="s.done" [class.text-muted]="s.done">{{ s.title }}</span>
                  <button type="button" class="btn btn-ghost btn-sm btn-icon opacity-0 group-hover:opacity-100 focus-visible:opacity-100" [attr.aria-label]="'Supprimer ' + s.title" (click)="deleteSub(s.id)"><ff-icon name="x" [size]="14" /></button>
                </li>
              }
            </ul>
            <form class="flex gap-2 mt-2" (submit)="$event.preventDefault(); addSub(newSub)">
              <input #newSub class="input !min-h-9" placeholder="Ajouter une sous-tâche" aria-label="Nouvelle sous-tâche" maxlength="200" />
              <button type="submit" class="btn btn-secondary btn-sm">Ajouter</button>
            </form>
          </section>

          @if (t.notes) {
            <section><h3 class="section-title mb-2">Notes</h3><p class="whitespace-pre-wrap text-muted">{{ t.notes }}</p></section>
          }

          @if (executions().length > 1 || (executions().length === 1 && executions()[0].sessions.length)) {
            <section aria-labelledby="ex-h">
              <h3 id="ex-h" class="section-title mb-2">Cycles d'exécution</h3>
              <div class="space-y-3">
                @for (ex of executions(); track ex.executionNumber) {
                  <div class="rounded-xl border border-line p-3 text-sm">
                    <div class="flex justify-between font-semibold">
                      <span>Cycle {{ ex.executionNumber }} {{ ex.current ? '(en cours)' : '' }}</span>
                      <span class="tabular-nums text-muted font-normal">Actif {{ dur(ex.timing.activeSeconds) }}</span>
                    </div>
                    <p class="text-muted tabular-nums">{{ settings.fmt(ex.actualStartAt) || '—' }} → {{ settings.fmt(ex.actualEndAt) || '…' }}</p>
                    @if (ex.sessions.length) {
                      <ul class="mt-2 space-y-0.5 text-xs text-muted">
                        @for (s of ex.sessions; track s.id) {
                          <li class="flex justify-between"><span class="tabular-nums">{{ settings.fmt(s.startedAt) }}</span><span class="tabular-nums">{{ dur(s.workedSeconds) }}{{ s.status === 'CANCELLED' ? ' · interrompue' : '' }}</span></li>
                        }
                      </ul>
                    }
                  </div>
                }
              </div>
            </section>
          }
        }
      </div>
    </aside>`,
})
export class TaskDetailPanelComponent {
  private readonly api = inject(TasksApi);
  private readonly refresh = inject(RefreshService);
  protected readonly data = inject<{ id: string }>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<void>>(DialogRef);
  protected readonly actions = inject(TaskActions);
  protected readonly settings = inject(SettingsStore);

  protected readonly task = signal<Task | null>(null);
  protected readonly timeline = signal<TimelineEvent[]>([]);
  protected readonly executions = signal<TaskExecution[]>([]);
  protected readonly error = signal('');

  constructor() {
    // Se recharge apres chaque action (demarrage, fin, sous-tache...) pour rester coherent.
    effect(() => {
      this.refresh.tick();
      void this.load();
    });
  }

  protected async load(): Promise<void> {
    try {
      const [task, timeline, executions] = await Promise.all([
        firstValueFrom(this.api.get(this.data.id)),
        firstValueFrom(this.api.timeline(this.data.id)),
        firstValueFrom(this.api.executions(this.data.id)),
      ]);
      this.task.set(task);
      this.timeline.set(timeline);
      this.executions.set(executions);
      this.error.set('');
    } catch (e) {
      if (e instanceof AppError && e.problem.status === 404) this.ref.close();
      else this.error.set('Impossible de charger la tâche.');
    }
  }

  protected readonly rows = computed<[string, string, string?][]>(() => {
    const t = this.task();
    if (!t) return [];
    const tm = t.timing;
    const f = (i: string | null) => this.settings.fmt(i) || '—';
    const variance = (s: number | null) => (s === null ? '—' : formatDuration(s, { signed: true }));
    const tone = (s: number | null) => (s === null || s === 0 ? undefined : s > 0 ? 'text-danger' : 'text-success');
    return [
      ['Création', f(t.createdAt)],
      ['Début prévu', f(t.plannedStartAt)],
      ['Fin prévue', f(t.plannedEndAt)],
      ['Début réel', f(t.actualStartAt)],
      ['Fin réelle', f(t.actualEndAt)],
      ['Archivage', f(t.archivedAt)],
      ['Durée prévue', formatDuration(tm.plannedDurationSeconds)],
      ['Durée réelle écoulée', formatDuration(tm.actualElapsedSeconds)],
      ['Temps actif (Pomodoro)', formatDuration(tm.activeSeconds)],
      ['Écart de début', variance(tm.startVarianceSeconds), tone(tm.startVarianceSeconds)],
      ['Écart de fin', variance(tm.endVarianceSeconds), tone(tm.endVarianceSeconds)],
      ['Écart de durée', variance(tm.durationVarianceSeconds), tone(tm.durationVarianceSeconds)],
    ];
  });

  protected label(t: TimelineEventType): string {
    return EVENT_LABEL[t];
  }

  protected dur(s: number): string {
    return formatDuration(s);
  }

  protected fmtMin(m: number): string {
    return formatDuration(m * 60);
  }

  protected async toggleSub(id: string, done: boolean): Promise<void> {
    const t = this.task();
    if (t) await this.actions.toggleSubtask(t, id, done);
  }

  protected async addSub(input: HTMLInputElement): Promise<void> {
    const title = input.value.trim();
    const t = this.task();
    if (!title || !t) return;
    await firstValueFrom(this.api.addSubtask(t.id, title));
    input.value = '';
    this.refresh.bump();
  }

  protected async deleteSub(id: string): Promise<void> {
    const t = this.task();
    if (!t) return;
    await firstValueFrom(this.api.deleteSubtask(t.id, id));
    this.refresh.bump();
  }

  protected async remove(t: Task): Promise<void> {
    if (await this.actions.remove(t)) this.ref.close();
  }
}
