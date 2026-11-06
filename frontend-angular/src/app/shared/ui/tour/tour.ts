import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../icon/icon';
import { TourEngine } from './tour-engine';
import {
  Box,
  BubblePlacement,
  PHONE_MAX_WIDTH,
  TourStep,
  placeBubble,
  scrollTopFor,
  spotBox,
} from './tour-model';

const sameBox = (a: Box | null, b: Box | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height);
const samePlacement = (a: BubblePlacement, b: BubblePlacement) =>
  a.mode === b.mode && a.top === b.top && a.left === b.left;

/**
 * Visite guidee affichee par-dessus l'ecran : la cible de l'etape est mise en valeur (le reste de l'ecran est
 * assombri) et une bulle explique l'etape, avec un schema colore si l'etape en a un. La bulle est un dialogue nomme
 * qui garde le focus ; Echap passe la visite. Sur telephone, la bulle occupe le bas de l'ecran et la cible est
 * ramenee au-dessus.
 */
@Component({
  selector: 'ff-tour',
  imports: [CdkTrapFocus, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tour.html',
  styleUrl: './tour.css',
  host: { '(document:keydown.escape)': 'onEscape($event)' },
})
export class TourComponent {
  /** Visite affichee (etat et navigation). */
  readonly engine = input.required<TourEngine>();

  private readonly injector = inject(Injector);
  private readonly bubble = viewChild<ElementRef<HTMLElement>>('bubble');

  protected readonly spot = signal<Box | null>(null, { equal: sameBox });
  protected readonly placement = signal<BubblePlacement>(
    { mode: window.innerWidth < PHONE_MAX_WIDTH ? 'sheet' : 'center', top: null, left: null },
    { equal: samePlacement },
  );

  private frame = 0;
  private wasActive = false;
  private observer: ResizeObserver | null = null;
  private readonly onMove = () => this.schedule();

  constructor() {
    // A chaque etape : cible ramenee a l'ecran, puis projecteur et bulle replaces ; focus sur la bulle au depart.
    effect(() => {
      const step = this.engine().current();
      untracked(() => {
        const starting = !!step && !this.wasActive;
        this.wasActive = !!step;
        if (!step) {
          this.observer?.disconnect();
          return;
        }
        afterNextRender(() => this.show(step, starting), { injector: this.injector });
      });
    });

    window.addEventListener('resize', this.onMove, { passive: true });
    document.addEventListener('scroll', this.onMove, { capture: true, passive: true });
    if (typeof ResizeObserver !== 'undefined') this.observer = new ResizeObserver(this.onMove);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('resize', this.onMove);
      document.removeEventListener('scroll', this.onMove, { capture: true });
      this.observer?.disconnect();
      cancelAnimationFrame(this.frame);
      this.engine().stop();
    });
  }

  protected onEscape(event: Event): void {
    if (!this.engine().active()) return;
    event.preventDefault();
    this.engine().skip();
  }

  /** Les clics hors de la bulle sont ignores ; le focus reste dans la bulle. */
  protected block(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  private show(step: TourStep, focus: boolean): void {
    const bubble = this.bubble()?.nativeElement;
    if (!bubble) return;
    const el = this.engine().element(step.target);
    this.observer?.disconnect();
    if (el) {
      this.observer?.observe(el);
      this.observer?.observe(document.body);
      const box = spotBox(el.getBoundingClientRect());
      const y = scrollTopFor(box, this.size(bubble), this.viewport(), window.scrollY);
      if (Math.abs(y - window.scrollY) > 1) {
        const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      }
    }
    this.layout();
    if (focus) bubble.focus({ preventScroll: true });
  }

  private schedule(): void {
    if (this.frame || !this.engine().active()) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.layout();
    });
  }

  private layout(): void {
    const step = this.engine().current();
    const bubble = this.bubble()?.nativeElement;
    if (!step || !bubble) return;
    const el = this.engine().element(step.target);
    const box = el ? spotBox(el.getBoundingClientRect()) : null;
    this.spot.set(box);
    this.placement.set(placeBubble(box, this.size(bubble), this.viewport()));
  }

  private size(el: HTMLElement): { width: number; height: number } {
    return { width: el.offsetWidth, height: el.offsetHeight };
  }

  private viewport(): { width: number; height: number } {
    return { width: window.innerWidth, height: window.innerHeight };
  }
}
