import { describe, expect, it } from 'vitest';
import { applyMarkdown, countTaskItems, parseTags, toggleTaskItem } from './markdown';

describe('applyMarkdown', () => {
  it('entoure la selection et annule a la seconde application', () => {
    const bold = applyMarkdown('une idee forte', 9, 14, 'bold');
    expect(bold).toEqual({ text: 'une idee **forte**', start: 11, end: 16 });
    expect(applyMarkdown(bold.text, bold.start, bold.end, 'bold')).toEqual({
      text: 'une idee forte',
      start: 9,
      end: 14,
    });
  });

  it('place le curseur entre les marqueurs sans selection', () => {
    expect(applyMarkdown('ab', 1, 1, 'italic')).toEqual({ text: 'a**b', start: 2, end: 2 });
  });

  it('transforme les lignes selectionnees en cases a cocher puis les retablit', () => {
    const text = 'Pistes\nVisualiser\nStatistiques';
    const tasks = applyMarkdown(text, 7, text.length, 'task');
    expect(tasks.text).toBe('Pistes\n- [ ] Visualiser\n- [ ] Statistiques');
    expect(applyMarkdown(tasks.text, tasks.start, tasks.end, 'task').text).toBe(text);
  });

  it('numerote une liste et remplace un autre type de liste', () => {
    expect(applyMarkdown('- a\n- [ ] b', 0, 11, 'ordered').text).toBe('1. a\n2. b');
  });

  it('applique un titre a la ligne du curseur et deplace le curseur', () => {
    expect(applyMarkdown('intro\nIdee', 8, 8, 'heading')).toEqual({
      text: 'intro\n## Idee',
      start: 11,
      end: 11,
    });
    expect(applyMarkdown('# Titre', 3, 3, 'heading').text).toBe('Titre');
  });
});

describe('cases a cocher', () => {
  const md = '- [ ] a\n* [x] b\n```\n- [ ] dans du code\n```\n  - [ ] imbriquee\n- pas une case';

  it('compte les cases hors blocs de code', () => {
    expect(countTaskItems(md)).toBe(3);
  });

  it('coche la bonne case sans modifier le reste du texte', () => {
    expect(toggleTaskItem(md, 2, true)).toBe(md.replace('  - [ ] imbriquee', '  - [x] imbriquee'));
    expect(toggleTaskItem(md, 1, false)).toBe(md.replace('* [x] b', '* [ ] b'));
    expect(toggleTaskItem(md, 9, true)).toBe(md);
  });
});

describe('parseTags', () => {
  it('nettoie et dedoublonne sans tenir compte de la casse', () => {
    expect(parseTags(' Produit, produit ,, stats ')).toEqual(['Produit', 'stats']);
  });
});
