import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { STATUS_LABEL, TaskStatus } from '../../../../core/api/models';
import { IconComponent } from '../../icon/icon';

@Component({
  selector: 'ff-status-badge',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-badge.html',
})
export class StatusBadgeComponent {
  readonly status = input.required<TaskStatus>();
  protected readonly label = computed(() => STATUS_LABEL[this.status()]);
  protected readonly cls = computed(
    () =>
      ({ TODO: 'badge-todo', IN_PROGRESS: 'badge-progress', DONE: 'badge-done' })[this.status()],
  );
  protected readonly icon = computed(
    () => ({ TODO: 'circle', IN_PROGRESS: 'circle-dot', DONE: 'circle-check' })[this.status()],
  );
}
