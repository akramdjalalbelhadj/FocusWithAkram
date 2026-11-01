import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { QUADRANTS, QUADRANT_META, Task } from '../../core/api/models';
import { SettingsStore } from '../../core/services/settings.store';
import { formatDuration } from '../../core/util/time';
import { StatusBadgeComponent } from '../../shared/ui/badges';
import { IconComponent } from '../../shared/ui/icon';
import { TaskActions } from './task-actions.service';

/** Carte de tache reutilisee par la matrice, les listes, le dashboard et le calendrier. */
@Component({
  selector: 'ff-task-card',
  imports: [IconComponent, StatusBadgeComponent, CdkMenuTrigger, CdkMenu, CdkMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <article class="group relative flex gap-3 rounded-xl border bg-surface p-3 shadow-card transition-shadow hover:shadow-pop"
      [class.compact-row]="compact()" [class]="task().status === 'IN_PROGRESS' ? 'border-info' : 'border-line'" [attr.aria-label]="task().title">
      <button type="button" class="mt-0.5 grid place-items-center size-6 rounded-full flex-none text-subtle hover:text-success"
        [attr.aria-label]="task().status === 'DONE' ? 'Tâche terminée' : 'Terminer la tâche'" [disabled]="!!task().archivedAt"
        (click)="$event.stopPropagation(); actions.complete(task())">
        <ff-icon [name]="task().status === 'DONE' ? 'circle-check' : task().status === 'IN_PROGRESS' ? 'circle-dot' : 'circle'" [size]="20"
          [class]="task().status === 'DONE' ? 'text-success' : task().status === 'IN_PROGRESS' ? 'text-info' : ''" />
      </button>

      <div class="min-w-0 flex-1">
        <button type="button" class="block w-full text-left font-semibold leading-snug break-words hover:text-brand"
          [class.line-through]="task().status === 'DONE'" [class.text-muted]="task().status === 'DONE'"
          (click)="actions.openDetail(task().id)">{{ task().title }}</button>

        <div class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
          @if (!compact()) { <ff-status-badge [status]="task().status" /> }
          @if (task().overdue) { <span class="badge badge-danger"><ff-icon name="alert" [size]="11" />En retard</span> }
          @if (due()) { <span class="chip" [class.!text-danger]="task().overdue"><ff-icon name="calendar" [size]="11" />{{ due() }}</span> }
          @if (!compact() && task().project; as p) { <span class="chip"><span class="size-2 rounded-full" [style.background]="p.color"></span>{{ p.name }}</span> }
          @for (tag of task().tags.slice(0, compact() ? 0 : 2); track tag) { <span class="chip"><ff-icon name="tag" [size]="10" />{{ tag }}</span> }
          @if (!compact() && task().tags.length > 2) { <span class="chip">+{{ task().tags.length - 2 }}</span> }
          @if (task().timeSpentSeconds > 0) { <span class="chip"><ff-icon name="timer" [size]="11" />{{ spent() }}</span> }
        </div>

        @if (!compact() && task().subtasksTotal > 0) {
          <div class="mt-2 flex items-center gap-2">
            <div class="h-1.5 flex-1 rounded-full bg-surface-3 overflow-hidden" role="progressbar" aria-label="Sous-tâches terminées"
              [attr.aria-valuenow]="task().subtasksDone" aria-valuemin="0" [attr.aria-valuemax]="task().subtasksTotal">
              <div class="h-full bg-brand" [style.width.%]="(task().subtasksDone / task().subtasksTotal) * 100"></div>
            </div>
            <span class="text-xs text-muted tabular-nums">{{ task().subtasksDone }}/{{ task().subtasksTotal }}</span>
          </div>
        }
      </div>

      <button type="button" class="btn btn-ghost btn-sm btn-icon flex-none self-start" aria-label="Actions sur la tâche"
        [cdkMenuTriggerFor]="menu"><ff-icon name="more" /></button>
    </article>

    <ng-template #menu>
      <div cdkMenu class="menu anim-pop" aria-label="Actions">
        <button cdkMenuItem class="menu-item" (click)="actions.openDetail(task().id)"><ff-icon name="info" [size]="16" />Ouvrir le détail</button>
        @if (!task().archivedAt) {
          <button cdkMenuItem class="menu-item" (click)="actions.edit(task())"><ff-icon name="pencil" [size]="16" />Modifier</button>
          @if (task().status === 'TODO') { <button cdkMenuItem class="menu-item" (click)="actions.start(task())"><ff-icon name="play" [size]="16" />Commencer la tâche</button> }
          @if (task().status === 'IN_PROGRESS') { <button cdkMenuItem class="menu-item" (click)="actions.pause(task())"><ff-icon name="pause" [size]="16" />Mettre en pause</button> }
          <button cdkMenuItem class="menu-item" (click)="actions.complete(task())"><ff-icon name="circle-check" [size]="16" />Terminer la tâche</button>
          <button cdkMenuItem class="menu-item" (click)="actions.focusOn(task())"><ff-icon name="timer" [size]="16" />Démarrer un Pomodoro</button>
          <div class="menu-sep" role="separator"></div>
          <p class="px-2.5 py-1 text-xs font-semibold text-muted">Déplacer vers</p>
          @for (q of quadrants; track q) {
            @if (q !== task().quadrant) {
              <button cdkMenuItem class="menu-item" (click)="actions.moveTo(task(), q)">
                <span class="size-2.5 rounded-sm" [style.background]="'var(--' + q.toLowerCase() + ')'"></span>{{ q }} · {{ meta[q].label }}
              </button>
            }
          }
        } @else {
          <button cdkMenuItem class="menu-item" (click)="actions.restore(task())"><ff-icon name="restore" [size]="16" />Restaurer</button>
        }
        <div class="menu-sep" role="separator"></div>
        <button cdkMenuItem class="menu-item" (click)="actions.duplicate(task())"><ff-icon name="copy" [size]="16" />Dupliquer</button>
        <button cdkMenuItem class="menu-item danger" (click)="actions.remove(task())"><ff-icon name="trash" [size]="16" />Supprimer</button>
      </div>
    </ng-template>
  `,
})
export class TaskCardComponent {
  protected readonly actions = inject(TaskActions);
  private readonly settings = inject(SettingsStore);

  readonly task = input.required<Task>();
  readonly compact = input(false);

  protected readonly quadrants = QUADRANTS;
  protected readonly meta = QUADRANT_META;

  protected readonly due = computed(() => {
    const end = this.task().plannedEndAt;
    return end ? this.settings.fmt(end) : '';
  });
  protected readonly spent = computed(() => formatDuration(this.task().timeSpentSeconds));
}
