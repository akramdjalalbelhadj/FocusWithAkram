import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import { noteExtensions } from '../editor/note-extensions';
import { notePdfDefinition } from './note-pdf';
import { noteToPdf } from './note-pdf-export';

let editors: Editor[] = [];

afterEach(() => {
  editors.forEach((e) => e.destroy());
  editors = [];
});

/** Definition PDF d'un Markdown, analyse comme dans l'editeur. */
function pdf(markdown: string, meta: string[] = []) {
  const editor = new Editor({
    extensions: noteExtensions(),
    content: markdown,
    contentType: 'markdown',
  });
  editors.push(editor);
  return notePdfDefinition({ title: 'Projet Krimou', meta, doc: editor.getJSON() });
}

/** Contenu de la note (apres le titre, les informations et le filet). */
function body(markdown: string): Record<string, unknown>[] {
  const content = pdf(markdown).content as unknown as Record<string, unknown>[];
  return content.slice(2);
}

const json = (value: unknown) => JSON.stringify(value);

describe('notePdfDefinition', () => {
  it('met le titre, les informations et les numéros de page', () => {
    const def = pdf('Texte', ['Catégorie : Projets', 'Créée le 10/11/2026']);
    const content = def.content as unknown as Record<string, unknown>[];
    expect(content[0]).toMatchObject({ text: 'Projet Krimou', bold: true, fontSize: 22 });
    expect(content[1]['text']).toBe('Catégorie : Projets   ·   Créée le 10/11/2026');
    expect(def.info?.title).toBe('Projet Krimou');
    const footer = (def.footer as (p: number, n: number) => { columns: { text: string }[] })(2, 3);
    expect(footer.columns[1].text).toBe('2 / 3');
  });

  it('signale une idée encore vide', () => {
    expect(json(body(''))).toContain('Pas encore développée.');
  });

  it('rend les titres et la mise en forme du texte, surlignage en couleur compris', () => {
    const [h2, p] = body(
      '## Plan\n\n**gras** *italique* ~~barré~~ `code` [lien](https://example.org) ==jaune== <mark data-color="sky">ciel</mark>',
    );
    expect(h2).toMatchObject({ fontSize: 16.5, bold: true });
    const parts = p['text'] as Record<string, unknown>[];
    const part = (text: string) => parts.find((x) => x['text'] === text);
    expect(part('gras')).toMatchObject({ bold: true });
    expect(part('italique')).toMatchObject({ italics: true });
    expect(part('barré')).toMatchObject({ decoration: ['lineThrough'] });
    expect(part('code')).toMatchObject({ font: 'Courier' });
    expect(part('lien')).toMatchObject({ link: 'https://example.org', decoration: ['underline'] });
    expect(part('jaune')).toMatchObject({ background: '#fef08a' });
    expect(part('ciel')).toMatchObject({ background: '#bae6fd' });
  });

  it('rend les listes, listes numérotées et cases à cocher', () => {
    const [ul, ol, tasks] = body(
      '- un\n  - sous-point\n- deux\n\n3. trois\n4. quatre\n\n- [x] fait\n- [ ] à faire',
    );
    expect((ul['ul'] as unknown[]).length).toBe(2);
    expect(json(ul)).toContain('sous-point');
    expect(ol).toMatchObject({ start: 3 });
    const items = tasks['stack'] as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(json(items[0])).toContain('polyline');
    expect(json(items[1])).not.toContain('polyline');
  });

  it('encadre les alertes, citations et blocs de code coloré', () => {
    const [callout, quote, code] = body(
      '> [!WARNING]\n> Vérifie avant.\n\n> Une citation\n\n```java\nint x = 1; // test\n```',
    );
    expect(json(callout)).toContain('"text":"Attention"');
    expect(json(callout)).toContain('#fff5df');
    expect(json(quote)).toContain('Une citation');
    const text = json(code);
    expect(text).toContain('Courier');
    // Mot-cle et commentaire colores comme dans l'editeur.
    expect(text).toMatch(/"text":"int","color":"#0867be"|"text":"int","color":"#7830c4"/);
    expect(text).toMatch(/"text":"\/\/ test","color":"#6d6385","italics":true/);
  });

  it('rend un tableau avec sa ligne d’en-tête', () => {
    const [table] = body('| Nom | Prix |\n| --- | --- |\n| Pain | 2 € |');
    const t = table['table'] as { headerRows: number; widths: string[]; body: unknown[][] };
    expect(t.headerRows).toBe(1);
    expect(t.widths).toEqual(['*', '*']);
    expect(json(t.body[0][0])).toContain('"bold":true');
    expect(json(t.body[1][1])).toContain('2 €');
  });
});

describe('noteToPdf', () => {
  it('produit un vrai fichier PDF', { timeout: 60000 }, async () => {
    const blob = await noteToPdf({
      title: 'Projet Krimou',
      content: '## Plan\n\n- [x] ==fait==\n\n```js\nconst a = 1;\n```',
      meta: ['Créée le 10/11/2026'],
    });
    const head = new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer());
    expect(head).toBe('%PDF-');
    expect(blob.size).toBeGreaterThan(5000);
  });
});
