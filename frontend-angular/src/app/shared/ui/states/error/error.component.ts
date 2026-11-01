import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../icon/icon';

@Component({
  selector: 'ff-error',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './error.html',
})
export class ErrorComponent {
  readonly message = input('Impossible de charger les données.');
  readonly retry = output<void>();
}
