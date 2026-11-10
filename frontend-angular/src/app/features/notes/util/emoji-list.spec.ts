import { beforeEach, describe, expect, it } from 'vitest';
import {
  EMOJI_GROUPS,
  RECENT_EMOJIS_KEY,
  RECENT_EMOJIS_MAX,
  readRecentEmojis,
  rememberEmoji,
  searchEmojis,
} from './emoji-list';

const chars = (list: { char: string }[]) => list.map((e) => e.char);

describe('liste d’émojis', () => {
  it('ne propose chaque émoji qu’une fois, chacun avec un nom', () => {
    const all = EMOJI_GROUPS.flatMap((g) => g.emojis);
    expect(new Set(chars(all)).size).toBe(all.length);
    expect(all.every((e) => e.name.trim().length > 0)).toBe(true);
    expect(EMOJI_GROUPS.map((g) => g.label)).toEqual([
      'Visages',
      'Gestes et personnes',
      'Cœurs et symboles',
      'Travail et objets',
      'Nature et météo',
      'Nourriture',
      'Activités et voyages',
      'Drapeaux',
    ]);
  });

  it('cherche en français, sans tenir compte des accents ni de la casse', () => {
    expect(chars(searchEmojis('fusée'))).toContain('🚀');
    expect(chars(searchEmojis('FUSEE'))).toContain('🚀');
    expect(chars(searchEmojis('coeur rouge'))).toEqual(['❤️']);
    expect(chars(searchEmojis('validé'))).toEqual(expect.arrayContaining(['✅', '☑️']));
    expect(chars(searchEmojis('algerie'))).toEqual(['🇩🇿']);
    expect(searchEmojis('   ')).toEqual([]);
    expect(searchEmojis('xyzzy')).toEqual([]);
  });
});

describe('émojis récents', () => {
  beforeEach(() => localStorage.clear());

  it('met le dernier choisi en tête, sans doublon, et le garde dans le navigateur', () => {
    let recent = rememberEmoji([], '🚀');
    recent = rememberEmoji(recent, '✅');
    recent = rememberEmoji(recent, '🚀');
    expect(recent).toEqual(['🚀', '✅']);
    expect(readRecentEmojis()).toEqual(['🚀', '✅']);
  });

  it(`n’en garde que ${RECENT_EMOJIS_MAX}`, () => {
    let recent: string[] = [];
    for (const e of EMOJI_GROUPS[0].emojis.slice(0, RECENT_EMOJIS_MAX + 4)) {
      recent = rememberEmoji(recent, e.char);
    }
    expect(recent).toHaveLength(RECENT_EMOJIS_MAX);
    expect(recent[0]).toBe(EMOJI_GROUPS[0].emojis[RECENT_EMOJIS_MAX + 3].char);
  });

  it('ignore une liste enregistrée illisible ou inconnue', () => {
    localStorage.setItem(RECENT_EMOJIS_KEY, '{pas du json');
    expect(readRecentEmojis()).toEqual([]);
    localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(['🚀', 42, 'abc']));
    expect(readRecentEmojis()).toEqual(['🚀']);
  });
});
