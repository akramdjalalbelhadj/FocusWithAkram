import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { QUADRANT_META, Quadrant } from '../../../../core/api/models';
import { IconComponent } from '../../icon/icon';

@Component({
  selector: 'ff-quadrant-badge',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quadrant-badge.html',
})
export class QuadrantBadgeComponent {
  readonly compact = input(false);
  readonly q = input.required<Quadrant>();
  protected readonly meta = computed(() => QUADRANT_META[this.q()]);
}
