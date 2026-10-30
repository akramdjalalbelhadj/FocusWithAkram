import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from './icon';

@Component({
  selector: 'ff-empty',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center text-center gap-2 py-8 px-4">
      <span class="grid place-items-center size-12 rounded-2xl bg-surface-2 text-subtle"><ff-icon [name]="icon()" [size]="24" /></span>
      <p class="font-semibold text-fg">{{ title() }}</p>
      @if (hint()) { <p class="text-sm text-muted max-w-xs">{{ hint() }}</p> }
      <ng-content />
    </div>`,
})
export class EmptyComponent {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly hint = input('');
}

@Component({
  selector: 'ff-error',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="alert" class="flex items-center gap-3 rounded-xl border border-line bg-danger-soft text-danger p-4">
      <ff-icon name="alert" />
      <span class="flex-1 text-sm font-medium">{{ message() }}</span>
      <button type="button" class="btn btn-sm btn-secondary" (click)="retry.emit()">Réessayer</button>
    </div>`,
})
export class ErrorComponent {
  readonly message = input('Impossible de charger les données.');
  readonly retry = output<void>();
}

@Component({
  selector: 'ff-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="space-y-3" aria-hidden="true" role="status"><span class="sr-only-text">Chargement…</span>
    @for (_ of rows(); track $index) { <div class="skeleton" [style.height.px]="height()"></div> }</div>`,
})
export class SkeletonComponent {
  readonly count = input(3);
  readonly height = input(56);
  protected rows() {
    return Array.from({ length: this.count() });
  }
}
