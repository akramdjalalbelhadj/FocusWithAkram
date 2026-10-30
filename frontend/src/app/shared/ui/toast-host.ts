import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from './icon';

@Component({
  selector: 'ff-toast-host',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed z-[1100] bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 w-[min(26rem,calc(100vw-1.5rem))] flex flex-col gap-2 pointer-events-none"
      role="region" aria-label="Notifications" aria-live="polite">
      @for (t of toasts.toasts(); track t.id) {
        <div class="pointer-events-auto flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-pop" style="animation: toast-in .2s ease-out"
          [attr.role]="t.kind === 'error' ? 'alert' : 'status'">
          <ff-icon [name]="t.kind === 'error' ? 'alert' : t.kind === 'success' ? 'circle-check' : 'info'"
            [class]="t.kind === 'error' ? 'text-danger' : t.kind === 'success' ? 'text-success' : 'text-info'" />
          <span class="flex-1 text-sm font-medium">{{ t.message }}</span>
          @if (t.action) { <button type="button" class="btn btn-ghost btn-sm text-brand" (click)="t.action.run(); toasts.dismiss(t.id)">{{ t.action.label }}</button> }
          <button type="button" class="btn btn-ghost btn-sm btn-icon" aria-label="Fermer la notification" (click)="toasts.dismiss(t.id)"><ff-icon name="x" [size]="14" /></button>
        </div>
      }
    </div>`,
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);
}
