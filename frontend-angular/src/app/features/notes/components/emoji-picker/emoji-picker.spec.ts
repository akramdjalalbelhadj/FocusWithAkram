import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { EMOJI_GROUPS } from '../../util/emoji-list';
import { EmojiPickerComponent } from './emoji-picker';

describe('EmojiPickerComponent', () => {
  let fixture: ComponentFixture<EmojiPickerComponent>;
  let picked: string[];
  let cancelled: number;
  const el = () => fixture.nativeElement as HTMLElement;
  const search = () => el().querySelector<HTMLInputElement>('input[type="search"]')!;
  const headings = () => [...el().querySelectorAll('h3')].map((h) => h.textContent?.trim());
  const cells = () => [...el().querySelectorAll<HTMLButtonElement>('button.emoji-cell')];

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function type(text: string): Promise<void> {
    search().value = text;
    search().dispatchEvent(new Event('input'));
    await render();
  }

  function key(target: HTMLElement, name: string): void {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    fixture = TestBed.createComponent(EmojiPickerComponent);
    picked = [];
    cancelled = 0;
    fixture.componentInstance.picked.subscribe((c) => picked.push(c));
    fixture.componentInstance.cancel.subscribe(() => cancelled++);
    await render();
  });

  it('affiche les catégories, chaque émoji nommé, un seul atteint par Tab', () => {
    expect(headings()).toEqual(EMOJI_GROUPS.map((g) => g.label));
    expect(cells()[0].getAttribute('aria-label')).toBe(EMOJI_GROUPS[0].emojis[0].name);
    expect(cells().filter((c) => c.tabIndex === 0)).toHaveLength(1);
  });

  it('filtre par la recherche, annonce le nombre de résultats, Entrée insère le premier', async () => {
    await type('fusee');
    expect(headings()).toEqual(['1 résultat']);
    expect(cells().map((c) => c.textContent?.trim())).toEqual(['🚀']);
    key(search(), 'Enter');
    expect(picked).toEqual(['🚀']);
    await type('xyzzy');
    expect(headings()).toEqual(['Aucun émoji ne correspond']);
  });

  it('se parcourt aux flèches et ferme sur Échap', async () => {
    key(search(), 'ArrowDown');
    await render();
    expect(document.activeElement).toBe(cells()[0]);
    key(cells()[0], 'ArrowRight');
    await render();
    expect(document.activeElement).toBe(cells()[1]);
    key(cells()[1], 'ArrowDown');
    await render();
    expect(document.activeElement).toBe(cells()[9]);
    key(cells()[9], 'End');
    await render();
    expect(document.activeElement).toBe(cells().at(-1));
    key(cells()[0], 'Escape');
    expect(cancelled).toBe(1);
  });

  it('propose les émojis récents en premier', async () => {
    cells()[3].click();
    expect(picked).toEqual([EMOJI_GROUPS[0].emojis[3].char]);
    const again = TestBed.createComponent(EmojiPickerComponent);
    again.detectChanges();
    const first = (again.nativeElement as HTMLElement).querySelector('h3')?.textContent?.trim();
    expect(first).toBe('Récents');
    again.destroy();
  });
});
