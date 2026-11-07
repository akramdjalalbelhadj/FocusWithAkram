import { describe, expect, it } from 'vitest';
import { applyMarkdown } from './markdown';
import {
  insertLink,
  insertMarkdown,
  markdownFileName,
  normalizeUrl,
  noteToMarkdownFile,
  visualLosses,
} from './markdown-blocks';

const selected = (e: { text: string; start: number; end: number }) => e.text.slice(e.start, e.end);

describe('insertMarkdown', () => {
  it('insere une alerte apres la ligne courante et selectionne le texte a remplacer', () => {
    const edit = insertMarkdown('Intro', 2, 2, 'note');
    expect(edit.text).toBe('Intro\n\n> [!NOTE]\n> Votre texte');
    expect(selected(edit)).toBe('Votre texte');
  });

  it('entoure les lignes selectionnees d une alerte', () => {
    const text = 'avant\nligne 1\n\nligne 2\napres';
    const edit = insertMarkdown(text, 8, 22, 'warning');
    expect(edit.text).toBe('avant\n\n> [!WARNING]\n> ligne 1\n>\n> ligne 2\n\napres');
  });

  it('insere un tableau aligne, un separateur et un bloc de code', () => {
    const table = insertMarkdown('', 0, 0, 'table');
    expect(table.text.split('\n')[1]).toBe('| :-- | :-: | --: |');
    expect(selected(table)).toBe('Colonne 1');
    expect(insertMarkdown('a\nb', 1, 1, 'hr').text).toBe('a\n\n---\n\nb');
    const code = insertMarkdown('x', 1, 1, 'codeblock');
    expect(code.text).toBe('x\n\n```\ncode\n```');
    expect(selected(code)).toBe('code');
    expect(insertMarkdown('let a = 1;', 0, 10, 'codeblock').text).toBe('```\nlet a = 1;\n```');
  });
});

describe('liens', () => {
  it('normalise les adresses autorisees et refuse les autres', () => {
    expect(normalizeUrl('angular.dev/guide')).toBe('https://angular.dev/guide');
    expect(normalizeUrl('https://a.fr/x (1)')).toBe('https://a.fr/x%20%281%29');
    expect(normalizeUrl('mailto:moi@a.fr')).toBe('mailto:moi@a.fr');
    expect(normalizeUrl('#plan')).toBe('#plan');
    expect(normalizeUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeUrl('data:text/html,x')).toBeNull();
    expect(normalizeUrl('pas une adresse')).toBeNull();
  });

  it('cree le lien sur la selection ou insere un texte a remplacer', () => {
    expect(insertLink('voir doc', 5, 8, 'https://d.fr').text).toBe('voir [doc](https://d.fr)');
    const empty = insertLink('voir ', 5, 5, 'https://d.fr');
    expect(empty.text).toBe('voir [texte du lien](https://d.fr)');
    expect(selected(empty)).toBe('texte du lien');
  });

  it('barre la selection et l annule', () => {
    const struck = applyMarkdown('un mot', 3, 6, 'strike');
    expect(struck.text).toBe('un ~~mot~~');
    expect(applyMarkdown(struck.text, struck.start, struck.end, 'strike').text).toBe('un mot');
  });
});

describe('visualLosses', () => {
  it('ignore les differences de forme et detecte le texte perdu', () => {
    expect(visualLosses('* a\n* b', '- a\n- b')).toEqual([]);
    expect(visualLosses('2 &lt; 3 &amp; ok', '2 < 3 & ok')).toEqual([]);
    expect(visualLosses('<!-- secret -->\ntexte', 'texte')).toEqual(['secret']);
  });
});

describe('export Markdown', () => {
  const note = {
    title: 'Visa « Canada »',
    content: '> [!NOTE]\n> Copies du passeport\n',
    category: 'Administratif',
    tags: ['visa', 'voyage'],
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-06T08:30:00Z',
  };

  it('produit un en-tete YAML, le titre puis le contenu intact', () => {
    expect(noteToMarkdownFile(note)).toBe(
      [
        '---',
        'title: "Visa « Canada »"',
        'category: "Administratif"',
        'tags: ["visa", "voyage"]',
        'created: 2026-11-01T10:00:00Z',
        'updated: 2026-11-06T08:30:00Z',
        '---',
        '',
        '# Visa « Canada »',
        '',
        '> [!NOTE]',
        '> Copies du passeport',
        '',
      ].join('\n'),
    );
  });

  it('echappe les guillemets, omet la categorie absente et le titre deja present', () => {
    const file = noteToMarkdownFile({
      ...note,
      title: 'Plan "B"',
      category: null,
      tags: [],
      content: '# Plan "B"\n\ntexte',
    });
    expect(file).toContain('title: "Plan \\"B\\""');
    expect(file).not.toContain('category:');
    expect(file).toContain('tags: []');
    expect(file.match(/# Plan "B"/g)).toHaveLength(1);
  });

  it('tire un nom de fichier portable du titre', () => {
    expect(markdownFileName('Visa « Canada » : étapes !')).toBe('visa-canada-etapes.md');
    expect(markdownFileName('???')).toBe('note.md');
  });
});
