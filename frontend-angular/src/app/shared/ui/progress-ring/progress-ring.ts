import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Anneau de progression SVG anime (pas d'animation si prefers-reduced-motion, via la regle globale). */
@Component({
  selector: 'ff-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    style: 'display:inline-grid;place-items:center;position:relative',
    role: 'img',
    '[attr.aria-label]': 'label()',
  },
  templateUrl: './progress-ring.html',
  styleUrl: './progress-ring.css',
})
export class RingComponent {
  readonly value = input.required<number>();
  readonly size = input(120);
  readonly stroke = input(10);
  readonly color = input('var(--brand)');
  readonly label = input('Progression');
  protected readonly r = computed(() => (this.size() - this.stroke()) / 2);
  protected readonly circumference = computed(() => 2 * Math.PI * this.r());
  protected readonly offset = computed(
    () => this.circumference() * (1 - Math.min(1, Math.max(0, this.value()))),
  );
}
