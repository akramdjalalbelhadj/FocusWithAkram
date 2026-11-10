import { describe, expect, it } from 'vitest';
import { applyHighlight, highlightStart, matchHighlight } from './highlight';

/** Applique le surlignage a la sous-chaine `part` de `text`. */
function on(
  text: string,
  part: string,
  color: Parameters<typeof applyHighlight>[3],
  toggle = false,
) {
  const start = text.indexOf(part);
  return applyHighlight(text, start, start + part.length, color, toggle);
}

describe('matchHighlight', () => {
  it('reconnaît ==jaune== et les balises <mark> de couleur', () => {
    expect(matchHighlight('==important== ensuite')).toEqual({
      raw: '==important==',
      color: 'yellow',
      text: 'important',
    });
    expect(matchHighlight('<mark data-color="sky">ciel</mark>!')).toEqual({
      raw: '<mark data-color="sky">ciel</mark>',
      color: 'sky',
      text: 'ciel',
    });
    expect(matchHighlight('<mark>sans couleur</mark>')?.color).toBe('yellow');
    expect(matchHighlight('<mark data-color="green">inconnue</mark>')?.color).toBe('yellow');
    expect(matchHighlight('==a=b==')?.text).toBe('a=b');
  });

  it('ignore les comparaisons et les surlignages vides', () => {
    expect(matchHighlight('== b ==')).toBeUndefined();
    expect(matchHighlight('====')).toBeUndefined();
    expect(matchHighlight('<mark> </mark>')).toBeUndefined();
    expect(matchHighlight('===a===')).toBeUndefined();
  });

  it('indique où peut commencer le prochain surlignage', () => {
    expect(highlightStart('rien ici')).toBe(-1);
    expect(highlightStart('voir ==ceci==')).toBe(5);
    expect(highlightStart('un <MARK>x</MARK> et ==y==')).toBe(3);
  });
});

describe('applyHighlight (mode Markdown)', () => {
  it('surligne en jaune avec == et dans les autres couleurs avec <mark>', () => {
    expect(on('un mot clé', 'mot', 'yellow')).toEqual({ text: 'un ==mot== clé', start: 5, end: 8 });
    expect(on('un mot clé', 'mot', 'violet').text).toBe(
      'un <mark data-color="violet">mot</mark> clé',
    );
  });

  it('le bouton retire un surlignage de la même couleur, en remplace un autre', () => {
    const yellow = on('un mot clé', 'mot', 'yellow');
    expect(applyHighlight(yellow.text, yellow.start, yellow.end, 'yellow', true)).toEqual({
      text: 'un mot clé',
      start: 3,
      end: 6,
    });
    const red = applyHighlight(yellow.text, yellow.start, yellow.end, 'red', true);
    expect(red.text).toBe('un <mark data-color="red">mot</mark> clé');
    expect(red.text.slice(red.start, red.end)).toBe('mot');
  });

  it('le menu applique la couleur sans jamais la retirer', () => {
    expect(on('un ==mot== clé', 'mot', 'yellow')).toEqual({
      text: 'un ==mot== clé',
      start: 5,
      end: 8,
    });
    expect(on('un ==mot== clé', 'mot', 'sky').text).toBe(
      'un <mark data-color="sky">mot</mark> clé',
    );
  });

  it('agit aussi quand la sélection englobe les balises', () => {
    expect(
      on('un <mark data-color="red">mot</mark> clé', '<mark data-color="red">mot</mark>', null),
    ).toEqual({ text: 'un mot clé', start: 3, end: 6 });
    expect(on('un ==mot== clé', '==mot==', 'violet').text).toBe(
      'un <mark data-color="violet">mot</mark> clé',
    );
  });

  it('retirer sans surlignage ne change rien ; <mark> sans couleur compte comme jaune', () => {
    expect(on('un mot clé', 'mot', null)).toEqual({ text: 'un mot clé', start: 3, end: 6 });
    expect(on('un <mark>mot</mark> clé', 'mot', 'yellow', true).text).toBe('un mot clé');
  });

  it('sans sélection, insère les balises et place le curseur entre elles', () => {
    expect(applyHighlight('ab', 1, 1, 'yellow')).toEqual({ text: 'a====b', start: 3, end: 3 });
  });
});
