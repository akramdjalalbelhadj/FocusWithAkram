import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { NOTE_TABS_KEY, NoteTabs, readNoteTabs } from './note-tabs.service';

const krimou = { id: 'a', title: 'Projet Krimou', category: { color: '#6366f1' } };
const achats = { id: 'b', title: 'Mes achats', category: null };
const lecture = { id: 'c', title: 'Lecture', category: null };

function fresh(): NoteTabs {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(NoteTabs);
}

describe('NoteTabs', () => {
  let tabs: NoteTabs;

  beforeEach(() => {
    localStorage.clear();
    tabs = fresh();
  });

  it('ouvre une idée dans un nouvel onglet, à la fin, une seule fois', () => {
    tabs.open(krimou);
    tabs.open(achats);
    tabs.open(krimou);
    expect(tabs.tabs()).toEqual([
      { id: 'a', title: 'Projet Krimou', color: '#6366f1' },
      { id: 'b', title: 'Mes achats', color: null },
    ]);
  });

  it('garde les onglets après un rechargement de la page', () => {
    tabs.open(krimou);
    tabs.open(achats);
    expect(
      fresh()
        .tabs()
        .map((t) => t.id),
    ).toEqual(['a', 'b']);
  });

  it('ne garde un onglet fermé que si l’idée est rouverte', () => {
    tabs.open(krimou);
    tabs.open(achats);
    tabs.close('a');
    expect(
      fresh()
        .tabs()
        .map((t) => t.id),
    ).toEqual(['b']);
    tabs.open(krimou);
    expect(tabs.tabs().map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('suit le titre et la catégorie, sans rouvrir un onglet fermé ni accepter un titre vide', () => {
    tabs.open(krimou);
    tabs.update('a', { title: '  Krimou v2 ', color: null });
    tabs.update('a', { title: '   ' });
    tabs.update('z', { title: 'Inconnue' });
    expect(tabs.tabs()).toEqual([{ id: 'a', title: 'Krimou v2', color: null }]);
  });

  it('rafraîchit les onglets depuis la liste sans ouvrir les autres idées', () => {
    tabs.open(krimou);
    tabs.refresh([{ ...krimou, title: 'Krimou renommé', category: null }, achats]);
    expect(tabs.tabs()).toEqual([{ id: 'a', title: 'Krimou renommé', color: null }]);
  });

  it('désigne l’onglet voisin à afficher après une fermeture', () => {
    tabs.open(krimou);
    tabs.open(achats);
    tabs.open(lecture);
    expect(tabs.neighbor('b')).toBe('c');
    expect(tabs.neighbor('c')).toBe('b');
    tabs.closeOthers('a');
    expect(tabs.neighbor('a')).toBeNull();
    expect(tabs.neighbor('z')).toBeNull();
  });

  it('ferme tous les onglets', () => {
    tabs.open(krimou);
    tabs.open(achats);
    tabs.closeAll();
    expect(tabs.tabs()).toEqual([]);
    expect(localStorage.getItem(NOTE_TABS_KEY)).toBeNull();
  });

  it('s’aligne sur une autre fenêtre de l’application', () => {
    localStorage.setItem(NOTE_TABS_KEY, JSON.stringify([{ id: 'b', title: 'Mes achats' }]));
    window.dispatchEvent(new StorageEvent('storage', { key: NOTE_TABS_KEY }));
    expect(tabs.tabs().map((t) => t.title)).toEqual(['Mes achats']);
  });
});

describe('readNoteTabs', () => {
  it('ignore une sauvegarde illisible ou des entrées invalides et en double', () => {
    expect(readNoteTabs(null)).toEqual([]);
    expect(readNoteTabs('{pas du json')).toEqual([]);
    expect(readNoteTabs('{"id":"a"}')).toEqual([]);
    expect(
      readNoteTabs(
        JSON.stringify([
          { id: 'a', title: 'A', color: '#fff' },
          { id: 'a', title: 'Doublon' },
          { id: '', title: 'Sans id' },
          { id: 'b' },
          null,
          { id: 'c', title: 'C', color: 3 },
        ]),
      ),
    ).toEqual([
      { id: 'a', title: 'A', color: '#fff' },
      { id: 'c', title: 'C', color: null },
    ]);
  });
});
