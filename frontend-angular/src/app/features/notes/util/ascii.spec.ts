import { describe, expect, it } from 'vitest';
import { asciiFence, detectAsciiKind, displayWidth, findAsciiFence, toPdfSafe } from './ascii';
import { renderBanner } from './ascii-banner';
import { parseTable, renderTable } from './ascii-table';
import {
  commandsToTree,
  editTree,
  flattenTree,
  parseTree,
  renderTree,
  treeToCommands,
} from './ascii-tree';

const TREE = [
  'projet/',
  '├── src/               # sources',
  '│   ├── app/',
  '│   │   └── main.ts',
  '│   └── styles.css',
  '├── docs/',
  '└── README.md',
].join('\n');

describe('arborescence ASCII', () => {
  it('relit la sortie de `tree` et la reecrit a l’identique', () => {
    const { nodes, style } = parseTree(TREE);
    expect(style).toBe('unicode');
    expect(nodes).toHaveLength(1);
    expect(nodes[0].children.map((n) => n.name)).toEqual(['src', 'docs', 'README.md']);
    expect(nodes[0].children[0].comment).toBe('sources');
    expect(nodes[0].children[1].dir).toBe(true);
    expect(renderTree(nodes, 'unicode')).toBe(TREE.replace('/               #', '/  #'));
  });

  it('accepte les traits ASCII, les listes indentees et a puces', () => {
    const ascii = parseTree('app\n|-- lib/\n|   `-- a.js\n`-- b.js');
    expect(ascii.style).toBe('ascii');
    expect(renderTree(ascii.nodes, 'ascii')).toBe('app/\n|-- lib/\n|   `-- a.js\n`-- b.js');
    const bullets = parseTree('- app/\n  - lib\n    - -config.json\n  - b.js');
    expect(flattenTree(bullets.nodes).map((f) => `${f.depth}:${f.node.name}`)).toEqual([
      '0:app',
      '1:lib',
      '2:-config.json',
      '1:b.js',
    ]);
    expect(bullets.nodes[0].children[0].dir).toBe(true);
  });

  it('produit les commandes Bash et PowerShell, dossiers d’abord', () => {
    const { nodes } = parseTree(TREE);
    expect(treeToCommands(nodes, 'bash').split('\n')).toEqual([
      'mkdir -p projet/src/app',
      'mkdir -p projet/docs',
      'touch projet/src/app/main.ts',
      'touch projet/src/styles.css',
      'touch projet/README.md',
    ]);
    const ps = treeToCommands(parseTree("mon dossier/\n└── l'idée.md").nodes, 'powershell');
    expect(ps).toBe(
      "New-Item -ItemType Directory -Force -Path 'mon dossier'\nNew-Item -ItemType File -Path 'mon dossier/l''idée.md'",
    );
    expect(treeToCommands(parseTree("a b/\n└── c'd").nodes, 'bash')).toBe(
      "mkdir -p 'a b'\ntouch 'a b/c'\\''d'",
    );
  });

  it('reconstruit l’arborescence depuis les commandes (aller-retour)', () => {
    const { nodes } = parseTree(TREE);
    for (const shell of ['bash', 'powershell'] as const) {
      const back = commandsToTree(treeToCommands(nodes, shell));
      expect(back.ignored).toEqual([]);
      expect(renderTree(back.nodes)).toBe(
        'projet/\n├── src/\n│   ├── app/\n│   │   └── main.ts\n│   └── styles.css\n├── docs/\n└── README.md',
      );
    }
  });

  it('comprend accolades, cd, redirections, New-Item -Name et signale le reste', () => {
    const { nodes, ignored } = commandsToTree(
      [
        '# creation',
        'mkdir -p api/{src,test} && cd api',
        'touch src/App.java "test/Mon Test.java"',
        'echo > README.md',
        'cd ..',
        'New-Item -Path web -Name index.html -ItemType File | Out-Null',
        'npm install',
      ].join('\n'),
    );
    expect(ignored).toEqual(['npm install']);
    expect(renderTree(nodes)).toBe(
      [
        'api/',
        '├── src/',
        '│   └── App.java',
        '├── test/',
        '│   └── Mon Test.java',
        '└── README.md',
        'web/',
        '└── index.html',
      ].join('\n'),
    );
  });

  it('modifie la hierarchie : ajout, renommage, indentation, deplacement, suppression', () => {
    let { nodes } = parseTree('app/\n├── lib/\n└── b.ts');
    let r = editTree(nodes, { kind: 'add-child', path: [0], dir: false });
    expect(r.focus).toEqual([0, 2]);
    r = editTree(r.nodes, { kind: 'rename', path: [0, 2], name: 'c.ts' });
    r = editTree(r.nodes, { kind: 'indent', path: [0, 1] });
    expect(r.focus).toEqual([0, 0, 0]);
    expect(renderTree(r.nodes)).toBe('app/\n├── lib/\n│   └── b.ts\n└── c.ts');
    expect(flattenTree(r.nodes).map((f) => f.canIndent)).toEqual([false, false, false, true]);
    // Rien ne se range dans un fichier.
    expect(editTree(parseTree('a.ts\nb.ts').nodes, { kind: 'indent', path: [1] }).focus).toEqual([
      1,
    ]);
    r = editTree(r.nodes, { kind: 'outdent', path: [0, 0, 0] });
    r = editTree(r.nodes, { kind: 'toggle-dir', path: [0, 0] });
    r = editTree(r.nodes, { kind: 'move', path: [0, 2], delta: -1 });
    r = editTree(r.nodes, { kind: 'remove', path: [0, 0] });
    nodes = r.nodes;
    expect(renderTree(nodes)).toBe('app/\n├── c.ts\n└── b.ts');
    // La source n'est jamais modifiee.
    expect(renderTree(parseTree('app/\n├── a.ts\n└── b.ts').nodes)).toBe(
      'app/\n├── a.ts\n└── b.ts',
    );
  });
});

describe('tableau ASCII', () => {
  const table = {
    rows: [
      ['Nom', 'Âge', 'Ville'],
      ['Akram', '30', 'Marseille'],
      ['Léa', '7', 'Aix'],
    ],
    header: true,
    align: ['left', 'right', 'center'] as const,
    rowLines: false,
  };

  it('dessine les quatre styles et les relit (aller-retour)', () => {
    const t = { ...table, align: [...table.align] };
    expect(renderTable(t, 'ascii')).toBe(
      [
        '+-------+-----+-----------+',
        '| Nom   | Âge | Ville     |',
        '+=======+=====+===========+',
        '| Akram |  30 | Marseille |',
        '| Léa   |   7 |    Aix    |',
        '+-------+-----+-----------+',
      ].join('\n'),
    );
    for (const style of ['ascii', 'unicode', 'rounded', 'double'] as const) {
      for (const rowLines of [false, true]) {
        const text = renderTable({ ...t, rowLines }, style);
        expect(parseTable(text)).toEqual({ table: { ...t, rowLines }, style });
      }
    }
  });

  it('importe un tableau Markdown ou des valeurs de tableur', () => {
    const md = parseTable('| A | B |\n| :-: | --: |\n| 1 | 2 |');
    expect(md?.table).toEqual({
      rows: [
        ['A', 'B'],
        ['1', '2'],
      ],
      header: true,
      align: ['center', 'right'],
      rowLines: false,
    });
    expect(parseTable('Nom\tPrix\nPain\t1,20')?.table.rows).toEqual([
      ['Nom', 'Prix'],
      ['Pain', '1,20'],
    ]);
    expect(parseTable('   ')).toBeNull();
  });

  it('compte les emojis sur deux colonnes', () => {
    expect(displayWidth('✅ ok')).toBe(5);
    expect(displayWidth('🚀')).toBe(2);
    expect(displayWidth('é')).toBe(1);
  });
});

describe('banniere ASCII', () => {
  it('dessine en gros caracteres sans espace en fin de ligne', () => {
    expect(renderBanner('Hé!', 'hash')).toBe(
      ['#   # ##### #', '#   # #     #', '##### ####  #', '#   # #', '#   # ##### #'].join('\n'),
    );
    expect(renderBanner('ab', 'letters').split('\n')[0]).toBe(' AAA  BBBB');
    expect(renderBanner('~', 'block')).toContain('███');
    expect(renderBanner('  \n ', 'block')).toBe('');
  });

  it('encadre le texte', () => {
    expect(renderBanner('Bonjour\nFocus', 'box')).toBe(
      ['+-----------+', '|  Bonjour  |', '|  Focus    |', '+-----------+'].join('\n'),
    );
    expect(renderBanner('Hi', 'box-double').split('\n')[0]).toBe('╔══════╗');
  });
});

describe('blocs ```ascii', () => {
  it('reconnait le type d’un schema', () => {
    expect(detectAsciiKind(TREE)).toBe('tree');
    expect(detectAsciiKind('+---+\n| a |\n+---+')).toBe('table');
    expect(detectAsciiKind('█   █')).toBe('banner');
  });

  it('trouve le bloc sous le curseur, sans confondre les autres blocs', () => {
    const text = 'Intro\n```bash\nls\n```\n\n```ascii\na/\n└── b\n```\nFin';
    const at = text.indexOf('└');
    expect(findAsciiFence(text, at)).toEqual({
      from: text.indexOf('```ascii'),
      to: text.lastIndexOf('```') + 3,
      body: 'a/\n└── b',
    });
    expect(findAsciiFence(text, text.indexOf('ls'))).toBeNull();
    expect(findAsciiFence(text, 0)).toBeNull();
  });

  it('entoure le schema d’une cloture assez longue', () => {
    expect(asciiFence('a\n')).toBe('```ascii\na\n```');
    expect(asciiFence('```')).toBe('````ascii\n```\n````');
  });

  it('remplace les traits Unicode pour le PDF, colonne pour colonne', () => {
    expect(toPdfSafe('├── a\n│   └── b\n╔═╗ █')).toBe('+-- a\n|   +-- b\n+=+ #');
  });
});
