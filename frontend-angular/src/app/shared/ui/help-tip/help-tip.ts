import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '../icon/icon';

let nextId = 0;

/** Position de la bulle dans la fenetre (position fixe : jamais coupee par un conteneur a defilement). */
interface BubblePosition {
  left: number;
  width: number;
  top: number | null;
  bottom: number | null;
}

const MARGIN = 8;
const MAX_WIDTH = 288;
const HIDE_DELAY = 150;

/**
 * Bulle d'aide : petit bouton « ? » qui affiche une explication au survol, au focus ou au clic. Fermee par
 * Echap, par un clic ailleurs ou en quittant le bouton (sauf si elle a ete ouverte par un clic). Le texte est
 * aussi la description du bouton (aria-describedby) : un lecteur d'ecran l'annonce sans ouvrir la bulle.
 */
@Component({
  selector: 'ff-help-tip',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help-tip.html',
  styleUrl: './help-tip.css',
})
export class HelpTipComponent {
  /** Explication affichee dans la bulle. */
  readonly text = input.required<string>();
  /** Notion expliquee : le bouton s'appelle « Aide : {label} ». */
  readonly label = input.required<string>();

  protected readonly id = `ff-help-tip-${++nextId}`;
  protected readonly open = signal(false);
  protected readonly position = signal<BubblePosition>({ left: MARGIN, width: MAX_WIDTH, top: 0, bottom: null });

  private readonly doc = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');
  /** Ouverte par un clic : reste visible quand la souris ou le focus s'en va. */
  private pinned = false;
  private hovered = false;
  private focused = false;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly cleanup: (() => void)[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.cancelHide();
      this.unlisten();
    });
  }

  protected onClick(): void {
    if (this.pinned) {
      this.close();
    } else {
      this.pinned = true;
      this.show();
    }
  }

  protected onEnter(): void {
    this.hovered = true;
    this.cancelHide();
    this.show();
  }

  /** Laisse le temps de passer du bouton a la bulle (on peut la survoler pour la lire). */
  protected onLeave(): void {
    this.hovered = false;
    this.cancelHide();
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      if (!this.pinned && !this.focused && !this.hovered) this.close();
    }, HIDE_DELAY);
  }

  protected onFocus(): void {
    this.focused = true;
    this.show();
  }

  protected onBlur(): void {
    this.focused = false;
    if (!this.hovered) this.close();
  }

  protected onEscape(event: Event): void {
    if (!this.open()) return;
    // Echap ferme la bulle sans fermer le dialogue qui la contient.
    event.stopPropagation();
    this.close();
  }

  close(): void {
    this.pinned = false;
    this.cancelHide();
    if (!this.open()) return;
    this.open.set(false);
    this.unlisten();
  }

  private cancelHide(): void {
    if (this.hideTimer !== null) clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }

  private show(): void {
    this.place();
    if (this.open()) return;
    this.open.set(true);
    this.listen();
  }

  /** Place la bulle sous le bouton (au-dessus s'il est dans la moitie basse), sans deborder de l'ecran. */
  private place(): void {
    const view = this.doc.defaultView;
    const rect = this.button().nativeElement.getBoundingClientRect();
    const viewportWidth = this.doc.documentElement.clientWidth || view?.innerWidth || MAX_WIDTH;
    const viewportHeight = view?.innerHeight ?? 0;
    const width = Math.max(0, Math.min(MAX_WIDTH, viewportWidth - 2 * MARGIN));
    const centered = rect.left + rect.width / 2 - width / 2;
    const left = Math.max(MARGIN, Math.min(centered, viewportWidth - width - MARGIN));
    const above = viewportHeight > 0 && rect.top > viewportHeight / 2;
    this.position.set({
      left,
      width,
      top: above ? null : rect.bottom + 6,
      bottom: above ? viewportHeight - rect.top + 6 : null,
    });
  }

  private listen(): void {
    const onPointer = (event: Event) => {
      if (!this.host.nativeElement.contains(event.target as Node)) this.close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') this.close();
    };
    // La bulle est en position fixe : elle suit le bouton quand la page defile ou que la fenetre change de taille
    // (le focus clavier fait defiler la page jusqu'au bouton juste apres l'ouverture).
    const onMove = () => this.place();
    const view = this.doc.defaultView;
    this.doc.addEventListener('pointerdown', onPointer, true);
    this.doc.addEventListener('keydown', onKey);
    this.doc.addEventListener('scroll', onMove, true);
    view?.addEventListener('resize', onMove);
    this.cleanup.push(
      () => this.doc.removeEventListener('pointerdown', onPointer, true),
      () => this.doc.removeEventListener('keydown', onKey),
      () => this.doc.removeEventListener('scroll', onMove, true),
      () => view?.removeEventListener('resize', onMove),
    );
  }

  private unlisten(): void {
    while (this.cleanup.length) this.cleanup.pop()?.();
  }
}
