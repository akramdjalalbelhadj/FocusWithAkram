import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Anneau de progression SVG anime (pas d'animation si prefers-reduced-motion, via la regle globale). */
@Component({
  selector: 'ff-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display:inline-grid;place-items:center;position:relative', role: 'img', '[attr.aria-label]': 'label()' },
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" [attr.viewBox]="'0 0 ' + size() + ' ' + size()" style="transform:rotate(-90deg)">
      <circle [attr.cx]="size() / 2" [attr.cy]="size() / 2" [attr.r]="r()" fill="none" stroke="var(--surface-3)" [attr.stroke-width]="stroke()" />
      <circle [attr.cx]="size() / 2" [attr.cy]="size() / 2" [attr.r]="r()" fill="none" [attr.stroke]="color()" [attr.stroke-width]="stroke()"
        stroke-linecap="round" [attr.stroke-dasharray]="circumference()" [attr.stroke-dashoffset]="offset()"
        style="transition: stroke-dashoffset 0.4s linear" />
    </svg>
    <div class="absolute inset-0 grid place-items-center"><ng-content /></div>`,
})
export class RingComponent {
  readonly value = input.required<number>();
  readonly size = input(120);
  readonly stroke = input(10);
  readonly color = input('var(--brand)');
  readonly label = input('Progression');
  protected readonly r = computed(() => (this.size() - this.stroke()) / 2);
  protected readonly circumference = computed(() => 2 * Math.PI * this.r());
  protected readonly offset = computed(() => this.circumference() * (1 - Math.min(1, Math.max(0, this.value()))));
}
