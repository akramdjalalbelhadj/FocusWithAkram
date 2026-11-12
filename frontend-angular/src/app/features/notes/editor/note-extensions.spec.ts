import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import { visualLosses } from '../util/markdown-blocks';
import { MARKDOWN_HELP } from '../util/markdown-help';
import { ASCII_EDIT_EVENT } from './code-block';
import { noteExtensions } from './note-extensions';

let editors: Editor[] = [];

function load(markdown: string, editable = true): Editor {
  const editor = new Editor({
    extensions: noteExtensions(),
    content: markdown,
    contentType: 'markdown',
    editable,
  });
  editors.push(editor);
  return editor;
}

/** Markdown -> editeur visuel -> Markdown, comme lors d'une modification en mode Visuel. */
const roundTrip = (markdown: string) => load(markdown).getMarkdown();

afterEach(() => {
  editors.forEach((e) => e.destroy());
  editors = [];
});

describe('alertes GitHub', () => {
  const types = [
    ['NOTE', 'note', 'Note'],
    ['TIP', 'tip', 'Conseil'],
    ['IMPORTANT', 'important', 'Important'],
    ['WARNING', 'warning', 'Attention'],
    ['CAUTION', 'caution', 'Danger'],
  ] as const;

  it.each(types)('rend [!%s] en bloc dedie et le reecrit a l identique', (marker, type, label) => {
    const md = `> [!${marker}]\n> Vérifie les informations avant de continuer.`;
    const ed = load(md);
    const block = ed.view.dom.querySelector(`div[data-callout="${type}"]`);
    expect(block).not.toBeNull();
    expect(block!.classList).toContain(`note-callout-${type}`);
    expect(block!.querySelector('.note-callout-title')!.textContent).toBe(label);
    expect(block!.querySelector('.note-callout-title svg')).not.toBeNull();
    expect(block!.querySelector('.note-callout-body')!.textContent).toBe(
      'Vérifie les informations avant de continuer.',
    );
    expect(ed.getMarkdown()).toBe(md);
  });

  it('conserve un contenu multiligne avec liste, lien, gras et code', () => {
    const md = [
      '> [!NOTE]',
      '> Prépare les **copies** des pages',
      '> contenant ton identité.',
      '>',
      '> - passeport `valide`',
      '> - [cachets](https://example.org)',
    ].join('\n');
    const ed = load(md);
    const body = ed.view.dom.querySelector('.note-callout-body')!;
    expect(body.querySelector('strong')!.textContent).toBe('copies');
    expect(body.querySelectorAll('li')).toHaveLength(2);
    expect(body.querySelector('a')!.getAttribute('href')).toBe('https://example.org');
    expect(body.querySelector('code')!.textContent).toBe('valide');
    // Stable : une seconde conversion ne change plus rien.
    const once = ed.getMarkdown();
    expect(roundTrip(once)).toBe(once);
    expect(once).toContain('> [!NOTE]\n> Prépare les **copies** des pages');
  });

  it('ne transforme pas une citation ordinaire, meme voisine d une alerte', () => {
    const md = '> Une citation.\n\n> [!TIP]\n> Un conseil.\n\n> [!WARNING]\n> Attention.';
    const ed = load(md);
    expect(ed.view.dom.querySelectorAll('blockquote')).toHaveLength(1);
    expect(ed.view.dom.querySelectorAll('[data-callout]')).toHaveLength(2);
    expect(ed.getMarkdown()).toBe(md);
  });

  it('accepte la casse libre et ignore un marqueur suivi de texte ou inconnu', () => {
    expect(load('> [!tip]\n> ok').view.dom.querySelector('[data-callout="tip"]')).not.toBeNull();
    const ed = load('> [!NOTE] texte sur la ligne\n\n> [!FOO]\n> inconnu');
    expect(ed.view.dom.querySelector('[data-callout]')).toBeNull();
    expect(ed.view.dom.querySelectorAll('blockquote')).toHaveLength(2);
  });

  it('gere une alerte vide et ne la confond pas avec du code', () => {
    expect(roundTrip('> [!CAUTION]')).toBe('> [!CAUTION]');
    const code = '```\n> [!NOTE]\n> pas une alerte\n```';
    const ed = load(code);
    expect(ed.view.dom.querySelector('[data-callout]')).toBeNull();
    expect(ed.getMarkdown()).toBe(code);
  });

  it('change le type, puis retire l alerte avec la commande de la barre d outils', () => {
    const ed = load('> [!NOTE]\n> Texte');
    ed.commands.setTextSelection(15);
    ed.commands.toggleCallout('warning');
    // Apres une commande, Tiptap ajoute un paragraphe vide final : seule la fin du texte change.
    expect(ed.getMarkdown().trimEnd()).toBe('> [!WARNING]\n> Texte');
    ed.commands.toggleCallout('warning');
    expect(ed.getMarkdown().trimEnd()).toBe('Texte');
    ed.commands.toggleCallout('tip');
    expect(ed.getMarkdown().trimEnd()).toBe('> [!TIP]\n> Texte');
  });
});

describe('compatibilite Markdown', () => {
  it.each([
    ['titres 1 a 6', '# H1\n\n## H2\n\n### H3\n\n#### H4\n\n##### H5\n\n###### H6'],
    ['emphases', '**gras** *italique* ***les deux*** ~~barré~~ `code`'],
    ['listes imbriquees', '- a\n  - b\n    - c\n\n1. x\n2. y'],
    ['cases', '- [x] fait\n- [ ] à faire'],
    ['citations imbriquees', '> a\n>\n> > b'],
    ['separateur', 'a\n\n---\n\nb'],
    ['lien', '[ok](https://a.fr)'],
    ['code java', '```java\nclass A {\n    int x;\n\n    void f() {}\n}\n```'],
  ])('%s : aller-retour sans perte', (_name, md) => {
    expect(roundTrip(md)).toBe(md);
  });

  it('rend les titres H4 a H6 a leur niveau', () => {
    const ed = load('#### a\n\n###### b');
    expect(ed.view.dom.querySelector('h4')).not.toBeNull();
    expect(ed.view.dom.querySelector('h6')).not.toBeNull();
  });

  it('rend un tableau aligne avec du Markdown dans les cellules et le conserve', () => {
    const md = '| A | B | C |\n| :-- | :-: | --: |\n| **x** | `y` | [z](https://z.fr) |';
    const ed = load(md);
    const cells = ed.view.dom.querySelectorAll('td');
    expect(cells).toHaveLength(3);
    expect(cells[0].querySelector('strong')).not.toBeNull();
    expect(cells[1].getAttribute('style')).toContain('center');
    expect(cells[2].getAttribute('style')).toContain('right');
    expect(ed.view.dom.querySelector('.tableWrapper')).not.toBeNull();
    const out = ed.getMarkdown();
    expect(roundTrip(out)).toBe(out);
    expect(visualLosses(md, out)).toEqual([]);
    expect(out).toMatch(/\|\s*:-+\s*\|\s*:-+:\s*\|\s*-+:\s*\|/);
  });

  it('colore le code et affiche le bandeau de langage et de copie', () => {
    const ed = load('```typescript\nconst n: number = 1;\n```', false);
    expect(ed.view.dom.querySelector('.note-code-lang')!.textContent).toBe('TypeScript');
    expect(ed.view.dom.querySelector('.note-code-copy')).not.toBeNull();
    expect(ed.view.dom.querySelector('.hljs-keyword')).not.toBeNull();
    // Langage inconnu : texte brut conserve, sans coloration.
    const plain = load('```\nSELECT 1;\n```', false);
    expect(plain.view.dom.querySelector('[class^="hljs-"]')).toBeNull();
  });

  it('propose le choix du langage dans l editeur visuel', () => {
    const ed = load('```sql\nSELECT 1;\n```');
    const select = ed.view.dom.querySelector<HTMLSelectElement>('select.note-code-lang')!;
    expect(select.value).toBe('sql');
    select.value = 'java';
    select.dispatchEvent(new Event('change'));
    expect(ed.getMarkdown().trimEnd()).toBe('```java\nSELECT 1;\n```');
  });

  it('rend tous les exemples de l aide sans perte', () => {
    for (const section of MARKDOWN_HELP) {
      for (const ex of section.examples) {
        expect(visualLosses(ex.markdown, roundTrip(ex.markdown)), ex.title).toEqual([]);
      }
    }
  });

  it('conserve un schema ```ascii et propose « Modifier » dans l editeur visuel seulement', () => {
    const md = '```ascii\nprojet/\n├── src/\n│   └── main.ts\n└── README.md\n```';
    expect(roundTrip(md).trimEnd()).toBe(md);
    const ed = load(md);
    expect(ed.view.dom.querySelector('select.note-code-lang')!.querySelector('option:checked')!.textContent).toBe(
      'Schéma ASCII',
    );
    const edit = ed.view.dom.querySelector<HTMLButtonElement>('.note-code-ascii')!;
    expect(edit.hidden).toBe(false);
    let request: unknown = null;
    ed.view.dom.addEventListener(ASCII_EDIT_EVENT, (e) => (request = (e as CustomEvent).detail));
    edit.click();
    expect(request).toEqual({ pos: 0, text: 'projet/\n├── src/\n│   └── main.ts\n└── README.md' });
    // Autre langage : pas de bouton ; apercu : pas de bouton.
    const other = load('```sql\nSELECT 1;\n```');
    expect(other.view.dom.querySelector<HTMLButtonElement>('.note-code-ascii')!.hidden).toBe(true);
    expect(load(md, false).view.dom.querySelector('.note-code-ascii')).toBeNull();
  });
});

describe('securite', () => {
  it('n injecte ni script, ni gestionnaire d evenement, ni lien javascript', () => {
    const ed = load(
      '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[js](javascript:alert(1))\n\n' +
        '> [!NOTE]\n> <iframe src="https://evil"></iframe> [x](javascript:alert(2))',
      false,
    );
    const dom = ed.view.dom;
    expect(dom.querySelector('script, iframe, img')).toBeNull();
    const attributes = Array.from(dom.querySelectorAll('*')).flatMap((el) =>
      Array.from(el.attributes),
    );
    expect(attributes.filter((a) => /^on/i.test(a.name))).toEqual([]);
    expect(attributes.filter((a) => /^\s*javascript:/i.test(a.value))).toEqual([]);
  });

  it('signale ce que le mode visuel perdrait', () => {
    const md = 'Texte[^1]\n\n[^1]: source\n\n<details><summary>Plus</summary>\n\ncorps\n</details>';
    expect(visualLosses(md, roundTrip(md)).length).toBeGreaterThan(0);
  });
});

describe('robustesse', () => {
  // Pas d'assertion de duree : le DOM simule de jsdom est trop lent et irregulier pour etre representatif.
  it('supporte un document volumineux et des syntaxes incompletes', { timeout: 60000 }, () => {
    const chunk =
      '## Section\n\n> [!TIP]\n> Conseil **gras**\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n' +
      '```java\nint x = 1;\n```\n\n- [ ] tâche\n\n';
    const big = chunk.repeat(100) + '> [!NOTE\n**non fermé\n| a |\n```\nfence ouverte';
    const ed = load(big);
    const out = ed.getMarkdown();
    expect(ed.view.dom.querySelectorAll('[data-callout]')).toHaveLength(100);
    expect(visualLosses(big, out)).toEqual([]);
  });

  it('conserve les caracteres speciaux et les accents', () => {
    const md = 'Prix : 5 € — « citation » & 2 \\< 3, émoji 🚀, \\*littéral\\*';
    expect(visualLosses(md, roundTrip(md))).toEqual([]);
  });
});

describe('surlignage', () => {
  it.each([
    ['==jaune==', 'yellow'],
    ['<mark data-color="red">rouge</mark>', 'red'],
    ['<mark data-color="sky">bleu ciel</mark>', 'sky'],
    ['<mark data-color="violet">violet</mark>', 'violet'],
  ])('rend %s en <mark> de couleur et le réécrit à l’identique', (syntax, color) => {
    const md = `Avant ${syntax} après.`;
    const ed = load(md);
    const mark = ed.view.dom.querySelector('mark');
    expect(mark?.getAttribute('data-color')).toBe(color);
    expect(mark?.classList).toContain('note-mark');
    expect(ed.getMarkdown()).toBe(md);
    expect(visualLosses(md, ed.getMarkdown())).toEqual([]);
  });

  it('garde la mise en forme à l’intérieur et le surlignage dans une liste', () => {
    const md =
      '- ==**très** important== et <mark data-color="sky">[lien](https://example.org)</mark>';
    // Le lien passe a l'exterieur du surlignage : meme rendu, aucun mot perdu, forme stable ensuite.
    const out = roundTrip(md);
    expect(out).toBe(
      '- ==**très** important== et [<mark data-color="sky">lien</mark>](https://example.org)',
    );
    expect(visualLosses(md, out)).toEqual([]);
    expect(roundTrip(out)).toBe(out);
  });

  it('lit <mark> sans couleur en jaune sans passer le mode Visuel en lecture seule', () => {
    const md = 'Un <mark>passage</mark> clé.';
    const out = roundTrip(md);
    expect(out).toBe('Un ==passage== clé.');
    expect(visualLosses(md, out)).toEqual([]);
  });

  it('ne prend ni une comparaison ni du code pour un surlignage', () => {
    const ed = load('si a == b alors `x==y==z`');
    expect(ed.view.dom.querySelector('mark')).toBeNull();
  });

  it('applique, change et retire une couleur depuis la barre d’outils', () => {
    const ed = load('Un mot clé.');
    ed.commands.setTextSelection({ from: 4, to: 7 });
    ed.commands.setHighlight('red');
    expect(ed.getMarkdown()).toBe('Un <mark data-color="red">mot</mark> clé.');
    ed.commands.toggleHighlight('violet');
    expect(ed.getMarkdown()).toBe('Un <mark data-color="violet">mot</mark> clé.');
    ed.commands.toggleHighlight('violet');
    expect(ed.getMarkdown()).toBe('Un mot clé.');
    ed.commands.setHighlight('yellow');
    ed.commands.setTextSelection(5);
    ed.commands.unsetHighlight();
    expect(ed.getMarkdown()).toBe('Un mot clé.');
  });

  it('tape ==texte== pour surligner en jaune en mode Visuel', () => {
    const ed = load('');
    ed.commands.focus('end');
    for (const ch of 'Voir ==ceci==') {
      const { from, to } = ed.state.selection;
      if (
        !ed.view.someProp('handleTextInput', (f) => f(ed.view, from, to, ch, () => ed.state.tr))
      ) {
        ed.commands.insertContent(ch);
      }
    }
    expect(ed.getMarkdown()).toBe('Voir ==ceci==');
    expect(ed.view.dom.querySelector('mark')?.textContent).toBe('ceci');
  });
});
