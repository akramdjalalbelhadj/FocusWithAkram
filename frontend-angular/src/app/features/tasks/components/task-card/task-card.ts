import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { QUADRANTS, QUADRANT_META, Task } from '../../../../core/api/models';
import { SettingsStore } from '../../../../core/services/settings.store';
import { formatDuration } from '../../../../core/util/time';
import { StatusBadgeComponent } from '../../../../shared/ui/badges/index';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { TaskActions } from '../../services/task-actions.service';

/** Carte de tache reutilisee par la matrice, les listes, le dashboard et le calendrier. */
@Component({
  selector: 'ff-task-card',
  imports: [IconComponent, StatusBadgeComponent, CdkMenuTrigger, CdkMenu, CdkMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './task-card.html',
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
