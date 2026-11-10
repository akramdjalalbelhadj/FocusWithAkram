import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { noteExtensions } from '../editor/note-extensions';
import { EMOJI_FONT, hasEmoji, notePdfDefinition, splitEmoji } from './note-pdf';
import { noteToPdf } from './note-pdf-export';

let editors: Editor[] = [];

afterEach(() => {
  editors.forEach((e) => e.destroy());
  editors = [];
});

/** Definition PDF d'un Markdown, analyse comme dans l'editeur. */
function pdf(markdown: string, meta: string[] = [], emojiFont = false, title = 'Projet Krimou') {
  const editor = new Editor({
    extensions: noteExtensions(),
    content: markdown,
    contentType: 'markdown',
  });
  editors.push(editor);
  return notePdfDefinition({ title, meta, doc: editor.getJSON(), emojiFont });
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

describe('émojis', () => {
  it('reconnaît chaque émoji en entier : drapeau, famille, ton de peau, touche', () => {
    expect(splitEmoji('Go 🚀 ! 🇫🇷 👨‍👩‍👧 👍🏽 1️⃣ ❤️')).toEqual([
      { text: 'Go ', emoji: false },
      { text: '🚀', emoji: true },
      { text: ' ! ', emoji: false },
      { text: '🇫🇷', emoji: true },
      { text: ' ', emoji: false },
      { text: '👨‍👩‍👧', emoji: true },
      { text: ' ', emoji: false },
      { text: '👍🏽', emoji: true },
      { text: ' ', emoji: false },
      { text: '1️⃣', emoji: true },
      { text: ' ', emoji: false },
      { text: '❤️', emoji: true },
    ]);
  });

  it('laisse au texte les symboles que la police dessine déjà et les chiffres seuls', () => {
    expect(hasEmoji('© 2026 ® ™ — 3 # * « » é')).toBe(false);
    expect(splitEmoji('Prix © 3 €')).toEqual([{ text: 'Prix © 3 €', emoji: false }]);
  });

  it('écrit les émojis avec la police d’émojis partout, mise en forme conservée', () => {
    const def = pdf(
      '## Départ 🚀\n\n**Bravo 🎉** et ==surligné 👍==\n\n| Statut |\n| --- |\n| ✅ fait |\n\n```js\nlog("🔥");\n```',
      ['Étiquettes : 🏷️ perso'],
      true,
      'Idée 💡',
    );
    const text = json(def.content);
    // Chaque emoji dans la police d'emojis, avec le style de son passage (surlignage, couleur du code...).
    for (const emoji of ['💡', '🏷️', '🚀', '👍', '✅', '🔥']) {
      expect(text).toMatch(new RegExp(`"text":"${emoji}"[^{}]*"font":"${EMOJI_FONT}"`, 'u'));
    }
    expect(text).toContain(`"text":"👍","background":"#fef08a","font":"${EMOJI_FONT}"`);
    // Le gras du passage est garde sur l'emoji, seule la police change.
    expect(text).toContain(`"text":"🎉","bold":true,"font":"${EMOJI_FONT}"`);
    const footer = (def.footer as (p: number, n: number) => unknown)(1, 1);
    expect(json(footer)).toContain(`"text":"💡","font":"${EMOJI_FONT}"`);
  });

  it('ne change rien sans police d’émojis', () => {
    expect(json(pdf('Go 🚀').content)).not.toContain(EMOJI_FONT);
  });
});

describe('noteToPdf', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('produit un vrai fichier PDF', { timeout: 60000 }, async () => {
    const { pdf: blob, emojiMissing } = await noteToPdf({
      title: 'Projet Krimou',
      content: '## Plan\n\n- [x] ==fait==\n\n```js\nconst a = 1;\n```',
      meta: ['Créée le 10/11/2026'],
    });
    const head = new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer());
    expect(head).toBe('%PDF-');
    expect(blob.size).toBeGreaterThan(5000);
    expect(emojiMissing).toBe(false);
  });

  it(
    'produit quand même le PDF si la police d’émojis est indisponible, et le signale',
    { timeout: 60000 },
    async () => {
      vi.stubGlobal('fetch', () => Promise.reject(new Error('hors ligne')));
      const { pdf: blob, emojiMissing } = await noteToPdf({
        title: 'Départ 🚀',
        content: 'Bravo 🎉',
        meta: [],
      });
      expect(emojiMissing).toBe(true);
      expect(new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer())).toBe('%PDF-');
    },
  );
});
