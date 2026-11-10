import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  input,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { NoteTab, NoteTabs } from '../../services/note-tabs.service';

/**
 * Barre d'onglets de Notes & idees : « Notes & idées » (la liste) puis une idee par onglet ouvert. Un clic bascule
 * d'une idee a l'autre ; la croix (ou le clic molette, ou Suppr sur l'onglet) ferme l'onglet. Fermer l'idee
 * affichee ouvre sa voisine, ou la liste s'il n'en reste aucune.
 */
@Component({
  selector: 'ff-note-tabs',
  imports: [RouterLink, IconComponent, CdkMenu, CdkMenuItem, CdkMenuTrigger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './note-tabs.html',
  styleUrl: './note-tabs.css',
})
export class NoteTabsComponent {
  /** Idee affichee (null : la liste des idees). */
  readonly active = input<string | null>(null);

  protected readonly tabs = inject(NoteTabs);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  constructor() {
    // L'onglet affiche reste visible quand la barre defile (beaucoup d'onglets, petit ecran).
    effect(() => {
      const id = this.active();
      if (!id || !this.tabs.has(id)) return;
      afterNextRender(
        () => this.tabElement(id)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }),
        { injector: this.injector },
      );
    });
  }

  protected close(tab: NoteTab): void {
    const displayed = tab.id === this.active();
    const next = this.tabs.neighbor(tab.id);
    this.tabs.close(tab.id);
    if (displayed) void this.router.navigate(next ? ['/notes', next] : ['/notes']);
    // Le focus passe a l'onglet voisin (ou a la liste) au lieu de se perdre avec le bouton retire.
    afterNextRender(
      () => {
        const target = next ? this.tabElement(next) : null;
        (target ?? this.host.nativeElement.querySelector<HTMLElement>('.ntab-home'))?.focus();
      },
      { injector: this.injector },
    );
  }

  /** Clic molette : ferme l'onglet, comme dans un navigateur. */
  protected onAuxClick(event: MouseEvent, tab: NoteTab): void {
    if (event.button !== 1) return;
    event.preventDefault();
    this.close(tab);
  }

  protected closeOthers(): void {
    const id = this.active();
    if (id && this.tabs.has(id)) this.tabs.closeOthers(id);
    else this.tabs.closeAll();
  }

  protected closeAll(): void {
    const displayed = !!this.active();
    this.tabs.closeAll();
    if (displayed) void this.router.navigate(['/notes']);
  }

  private tabElement(id: string): HTMLElement | null {
    return this.host.nativeElement.querySelector<HTMLElement>(`a[data-tab-id="${CSS.escape(id)}"]`);
  }
}
