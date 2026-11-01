import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon';

@Component({
  selector: 'ff-toast-host',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toast-host.html',
  styleUrl: './toast-host.css',
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);
}
