import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  EMOJI_GROUPS,
  EmojiItem,
  findEmoji,
  readRecentEmojis,
  rememberEmoji,
  searchEmojis,
} from '../../util/emoji-list';

/** Emojis par ligne de la grille (voir `emoji-picker.css`) : les fleches haut et bas sautent d'une ligne. */
const COLUMNS = 8;

interface Section {
  id: string;
  label: string;
  emojis: EmojiItem[];
  /** Position du premier emoji de la section dans la liste complete (navigation au clavier). */
  offset: number;
}

/**
 * Liste d'emojis de la barre d'outils : recherche en francais, recents, categories. Un seul emoji de la grille
 * est atteint par Tab ; les fleches, Debut et Fin s'y deplacent, Entree ou un clic l'inserent, Echap ferme.
 */
@Component({
  selector: 'ff-emoji-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './emoji-picker.html',
  styleUrl: './emoji-picker.css',
})
export class EmojiPickerComponent {
  /** Emoji choisi, a inserer a la position du curseur. */
  readonly picked = output<string>();
  /** Fermeture sans choix (Echap). */
  readonly cancel = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');

  protected readonly query = signal('');
  private readonly recent = signal<string[]>(readRecentEmojis());
  /** Emoji atteint par Tab dans la grille. */
  protected readonly active = signal(0);

  protected readonly sections = computed<Section[]>(() => {
    const query = this.query().trim();
    let list: Omit<Section, 'offset'>[];
    if (query) {
      const found = searchEmojis(query);
      list = [
        {
          id: 'resultats',
          label: found.length
            ? `${found.length} résultat${found.length > 1 ? 's' : ''}`
            : 'Aucun émoji ne correspond',
          emojis: found,
        },
      ];
    } else {
      const recent = this.recent()
        .map((c) => findEmoji(c))
        .filter((e): e is EmojiItem => !!e);
      list = [
        ...(recent.length ? [{ id: 'recents', label: 'Récents', emojis: recent }] : []),
        ...EMOJI_GROUPS,
      ];
    }
    let offset = 0;
    return list.map((s) => {
      const section = { ...s, offset };
      offset += s.emojis.length;
      return section;
    });
  });

  private readonly count = computed(() => this.sections().reduce((n, s) => n + s.emojis.length, 0));

  constructor() {
    afterNextRender(() => this.searchInput()?.nativeElement.focus());
  }

  protected setQuery(value: string): void {
    this.query.set(value);
    this.active.set(0);
  }

  protected pick(emoji: EmojiItem): void {
    this.recent.set(rememberEmoji(this.recent(), emoji.char));
    this.picked.emit(emoji.char);
  }

  /** Entree dans la recherche : insere le premier resultat. */
  protected pickFirst(event: Event): void {
    event.preventDefault();
    const first = this.sections().find((s) => s.emojis.length)?.emojis[0];
    if (first) this.pick(first);
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' && this.count()) {
      event.preventDefault();
      this.focusEmoji(0);
    }
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    const current = this.active();
    const last = this.count() - 1;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = Math.min(last, current + 1);
        break;
      case 'ArrowLeft':
        next = Math.max(0, current - 1);
        break;
      case 'ArrowDown':
        next = Math.min(last, current + COLUMNS);
        break;
      case 'ArrowUp':
        if (current < COLUMNS) {
          // Premiere ligne : retour a la recherche.
          event.preventDefault();
          this.searchInput()?.nativeElement.focus();
          return;
        }
        next = current - COLUMNS;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.focusEmoji(next);
  }

  protected onEscape(event: Event): void {
    event.stopPropagation();
    this.cancel.emit();
  }

  private focusEmoji(index: number): void {
    this.active.set(index);
    const button = this.host.nativeElement.querySelector<HTMLButtonElement>(
      `button[data-index="${index}"]`,
    );
    button?.focus();
    button?.scrollIntoView?.({ block: 'nearest' });
  }
}
