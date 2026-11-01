import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { QUADRANT_META, Quadrant, STATUS_LABEL, TaskStatus } from '../../core/api/models';
import { IconComponent } from './icon';

@Component({
  selector: 'ff-status-badge',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="cls()"><ff-icon [name]="icon()" [size]="12" />{{ label() }}</span>`,
})
export class StatusBadgeComponent {
  readonly status = input.required<TaskStatus>();
  protected readonly label = computed(() => STATUS_LABEL[this.status()]);
  protected readonly cls = computed(() => ({ TODO: 'badge-todo', IN_PROGRESS: 'badge-progress', DONE: 'badge-done' })[this.status()]);
  protected readonly icon = computed(() => ({ TODO: 'circle', IN_PROGRESS: 'circle-dot', DONE: 'circle-check' })[this.status()]);
}

@Component({
  selector: 'ff-quadrant-badge',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [style.background]="'var(--' + q().toLowerCase() + '-soft)'" [style.color]="'var(--' + q().toLowerCase() + ')'">
    <ff-icon [name]="meta().icon" [size]="12" />{{ q() }}@if (!compact()) { · {{ meta().label }} }</span>`,
})
export class QuadrantBadgeComponent {
  readonly compact = input(false);
  readonly q = input.required<Quadrant>();
  protected readonly meta = computed(() => QUADRANT_META[this.q()]);
}
