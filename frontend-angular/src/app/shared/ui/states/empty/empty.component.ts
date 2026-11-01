import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../../icon/icon';

@Component({
  selector: 'ff-empty',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empty.html',
})
export class EmptyComponent {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly hint = input('');
}
