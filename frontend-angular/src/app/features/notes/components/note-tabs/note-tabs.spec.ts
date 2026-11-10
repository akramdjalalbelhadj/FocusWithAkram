import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NoteTabs } from '../../services/note-tabs.service';
import { NoteTabsComponent } from './note-tabs';

describe('NoteTabsComponent', () => {
  let fixture: ComponentFixture<NoteTabsComponent>;
  let tabs: NoteTabs;
  let navigate: ReturnType<typeof vi.spyOn>;
  const el = () => fixture.nativeElement as HTMLElement;
  const links = () =>
    [...el().querySelectorAll<HTMLAnchorElement>('.ntab-link')].map((a) => a.textContent?.trim());
  const closeButton = (title: string) =>
    el().querySelector<HTMLButtonElement>(`button[aria-label="Fermer l’onglet « ${title} »"]`)!;

  async function render(active: string | null): Promise<void> {
    fixture.componentRef.setInput('active', active);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    tabs = TestBed.inject(NoteTabs);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    tabs.open({ id: 'a', title: 'Projet Krimou', category: { color: '#6366f1' } });
    tabs.open({ id: 'b', title: 'Mes achats' });
    tabs.open({ id: 'c', title: 'Lecture' });
    fixture = TestBed.createComponent(NoteTabsComponent);
  });

  it('affiche la liste puis un onglet par idée ouverte, l’idée affichée étant marquée', async () => {
    await render('b');
    expect(el().querySelector('.ntab-home')?.textContent).toContain('Notes & idées');
    expect(el().querySelector('.ntab-home')?.getAttribute('aria-current')).toBeNull();
    expect(links()).toEqual(['Projet Krimou', 'Mes achats', 'Lecture']);
    expect(el().querySelector('[aria-current="page"]')?.textContent).toContain('Mes achats');
  });

  it('marque « Notes & idées » sur la liste', async () => {
    await render(null);
    expect(el().querySelector('.ntab-home')?.getAttribute('aria-current')).toBe('page');
  });

  it('ferme un autre onglet sans quitter l’idée affichée', async () => {
    await render('b');
    closeButton('Lecture').click();
    await render('b');
    expect(links()).toEqual(['Projet Krimou', 'Mes achats']);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('fermer l’idée affichée ouvre sa voisine de droite, puis de gauche, puis la liste', async () => {
    await render('b');
    closeButton('Mes achats').click();
    expect(navigate).toHaveBeenLastCalledWith(['/notes', 'c']);
    await render('c');
    closeButton('Lecture').click();
    expect(navigate).toHaveBeenLastCalledWith(['/notes', 'a']);
    await render('a');
    closeButton('Projet Krimou').click();
    expect(navigate).toHaveBeenLastCalledWith(['/notes']);
    expect(tabs.tabs()).toEqual([]);
  });

  it('ferme un onglet au clic molette', async () => {
    await render(null);
    const link = el().querySelector<HTMLAnchorElement>('a[data-tab-id="a"]')!;
    link.dispatchEvent(new MouseEvent('auxclick', { button: 1, bubbles: true, cancelable: true }));
    expect(tabs.tabs().map((t) => t.id)).toEqual(['b', 'c']);
  });
});
