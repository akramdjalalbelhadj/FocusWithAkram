/**
 * Arborescences de dossiers et fichiers : texte ASCII <-> hierarchie <-> commandes de creation (mkdir/touch ou
 * New-Item). Fonctions pures, sans DOM.
 */
import { displayWidth, padEnd } from './ascii';

export interface TreeNode {
  name: string;
  dir: boolean;
  /** Commentaire affiche au bout de la ligne (`src/  # sources`). */
  comment?: string;
  children: TreeNode[];
}

export type TreeStyle = 'unicode' | 'ascii';
export type Shell = 'bash' | 'powershell';

const BRANCHES: Record<TreeStyle, { tee: string; last: string; pipe: string; blank: string }> = {
  unicode: { tee: '├── ', last: '└── ', pipe: '│   ', blank: '    ' },
  ascii: { tee: '|-- ', last: '`-- ', pipe: '|   ', blank: '    ' },
};

/**
 * Debut de ligne fait de traits d'arborescence : `│   `, `├── `, `|-- `, `` `-- ``, `+-- `, puces `- ` ou `* `,
 * espaces et tabulations. Un tiret colle a un nom (`-config`) appartient au nom.
 */
const PREFIX =
  /^(?:[ \t│┃]|\|(?=[\s\-─])|[├└┣┗╟╚][─━═]*|[`+\\](?=[-─])|[─━═]|-(?=[-─\s])|\*(?=\s))*/;
/** Commentaire de fin de ligne : `# texte`, `<- texte` ou `← texte`, precede d'un espace. */
const COMMENT = /\s+(?:#|<-+|←)(?:\s+(.*))?$/;

export function emptyNode(name: string, dir: boolean): TreeNode {
  return { name, dir, children: [] };
}

/** Analyse une arborescence saisie (sortie de `tree`, traits ASCII, liste indentee ou a puces). */
export function parseTree(text: string): { nodes: TreeNode[]; style: TreeStyle } {
  const roots: TreeNode[] = [];
  const stack: { col: number; node: TreeNode }[] = [];
  for (const raw of text.replace(/\t/g, '    ').split('\n')) {
    const prefix = PREFIX.exec(raw)?.[0] ?? '';
    let rest = raw.slice(prefix.length).trim();
    if (!rest) continue;
    let comment: string | undefined;
    const c = COMMENT.exec(rest);
    if (c && c.index > 0) {
      comment = (c[1] ?? '').trim() || undefined;
      rest = rest.slice(0, c.index).trim();
    }
    const dir = /[/\\]$/.test(rest) || rest === '.';
    const name = rest === '.' ? '.' : rest.replace(/[/\\]+$/, '');
    if (!name) continue;
    const node: TreeNode = { name, dir, children: [] };
    if (comment) node.comment = comment;

    const col = displayWidth(prefix);
    while (stack.length && stack[stack.length - 1].col >= col) stack.pop();
    const parent = stack[stack.length - 1]?.node;
    if (parent) {
      parent.dir = true;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
    stack.push({ col, node });
  }
  const style: TreeStyle = /[├└│]/.test(text) || !/[|`+\\]--/.test(text) ? 'unicode' : 'ascii';
  return { nodes: roots, style };
}

function label(node: TreeNode): string {
  return node.name + (node.dir && node.name !== '.' ? '/' : '');
}

/**
 * Texte de l'arborescence, facon commande `tree` : les noeuds de premier niveau sans trait, les dossiers
 * termines par `/`, les commentaires alignes en colonne.
 */
export function renderTree(nodes: readonly TreeNode[], style: TreeStyle = 'unicode'): string {
  const b = BRANCHES[style];
  const lines: { text: string; comment?: string }[] = [];
  const walk = (children: readonly TreeNode[], prefix: string) => {
    children.forEach((child, i) => {
      const last = i === children.length - 1;
      lines.push({ text: prefix + (last ? b.last : b.tee) + label(child), comment: child.comment });
      walk(child.children, prefix + (last ? b.blank : b.pipe));
    });
  };
  for (const root of nodes) {
    lines.push({ text: label(root), comment: root.comment });
    walk(root.children, '');
  }
  const width = Math.max(0, ...lines.filter((l) => l.comment).map((l) => displayWidth(l.text)));
  return lines
    .map((l) => (l.comment ? `${padEnd(l.text, width)}  # ${l.comment}` : l.text))
    .join('\n');
}

// ---- Commandes ---------------------------------------------------------------------------------

function quoteBash(path: string): string {
  return /^[\w@%+=:,./-]+$/.test(path) ? path : `'${path.replace(/'/g, `'\\''`)}'`;
}

function quotePowerShell(path: string): string {
  return `'${path.replace(/'/g, "''")}'`;
}

/** Chemins a creer : dossiers sans sous-dossier (les parents suivent) et fichiers, dans l'ordre du texte. */
export function treePaths(nodes: readonly TreeNode[]): { dirs: string[]; files: string[] } {
  const dirs: string[] = [];
  const files: string[] = [];
  const walk = (children: readonly TreeNode[], base: string) => {
    for (const node of children) {
      const path = node.name === '.' ? base : base ? `${base}/${node.name}` : node.name;
      if (node.dir) {
        if (path && !node.children.some((c) => c.dir)) dirs.push(path);
        walk(node.children, path);
      } else if (path) {
        files.push(path);
      }
    }
  };
  walk(nodes, '');
  return { dirs, files };
}

/**
 * Commandes qui creent l'arborescence : `mkdir -p` puis `touch` (Bash), ou `New-Item` (PowerShell). Les
 * dossiers d'abord, pour que chaque fichier trouve son dossier. Un fichier existant n'est jamais ecrase.
 */
export function treeToCommands(nodes: readonly TreeNode[], shell: Shell = 'bash'): string {
  const { dirs, files } = treePaths(nodes);
  if (shell === 'powershell') {
    return [
      ...dirs.map((d) => `New-Item -ItemType Directory -Force -Path ${quotePowerShell(d)}`),
      ...files.map((f) => `New-Item -ItemType File -Path ${quotePowerShell(f)}`),
    ].join('\n');
  }
  return [
    ...dirs.map((d) => `mkdir -p ${quoteBash(d)}`),
    ...files.map((f) => `touch ${quoteBash(f)}`),
  ].join('\n');
}

interface Token {
  text: string;
  quoted: boolean;
}

/** Decoupe une ligne de commandes en commandes (`;`, `&&`, `||`, `|`) et mots (guillemets, echappements). */
function splitCommands(line: string): Token[][] {
  const commands: Token[][] = [];
  let tokens: Token[] = [];
  let current = '';
  let quoted = false;
  let started = false;
  let quote: '"' | "'" | null = null;
  const endToken = () => {
    if (started) tokens.push({ text: current, quoted });
    current = '';
    quoted = false;
    started = false;
  };
  const endCommand = () => {
    endToken();
    if (tokens.length) commands.push(tokens);
    tokens = [];
  };
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) {
        // PowerShell : '' dans une chaine simple vaut une apostrophe.
        if (quote === "'" && line[i + 1] === "'") {
          current += "'";
          i++;
        } else {
          quote = null;
        }
      } else if (ch === '\\' && quote === '"' && (line[i + 1] === '"' || line[i + 1] === '\\')) {
        current += line[++i];
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      quoted = true;
      started = true;
    } else if (ch === '\\' && /[\s'"]/.test(line[i + 1] ?? '')) {
      current += line[++i];
      started = true;
    } else if (ch === '#' && !started) {
      break;
    } else if (/\s/.test(ch)) {
      endToken();
    } else if (ch === ';' || ch === '|' || (ch === '&' && line[i + 1] === '&')) {
      if ((ch === '&' || ch === '|') && line[i + 1] === ch) i++;
      endCommand();
    } else if (ch === '>') {
      endToken();
      if (line[i + 1] === '>') i++;
      tokens.push({ text: '>', quoted: false });
    } else {
      current += ch;
      started = true;
    }
  }
  endCommand();
  return commands;
}

/** Expansion des accolades de Bash : `src/{app,lib}` -> `src/app`, `src/lib`. */
export function expandBraces(word: string): string[] {
  const m = /^(.*?)\{([^{}]*,[^{}]*)\}(.*)$/.exec(word);
  if (!m) return [word];
  return m[2].split(',').flatMap((part) => expandBraces(m[1] + part + m[3]));
}

/** Chemin relatif normalise (`/` comme separateur, `.` et `..` resolus), en segments. */
function resolvePath(cwd: readonly string[], path: string): string[] {
  const parts = path
    .replace(/\\/g, '/')
    .replace(/^~(?=\/|$)/, '')
    .split('/');
  const out = path.startsWith('/') || path.startsWith('\\') ? [] : [...cwd];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out;
}

const NULL_TARGETS = /^(?:\/dev\/null|nul|\$null)$/i;
/** Parametres de New-Item / mkdir / touch qui attendent une valeur. */
const VALUED = new Set([
  '-path',
  '-itemtype',
  '-type',
  '-name',
  '-value',
  '-m',
  '-mode',
  '-literalpath',
]);

export interface CommandsResult {
  nodes: TreeNode[];
  /** Lignes non reconnues (autres commandes), ignorees. */
  ignored: string[];
}

/**
 * Arborescence decrite par des commandes : `mkdir`/`md` (avec `-p`, accolades), `touch`, `New-Item`/`ni`
 * (`-ItemType Directory|File`, `-Path`, `-Name`), redirection `> fichier` et `cd`. Les autres lignes sont
 * ignorees et rendues pour etre signalees.
 */
export function commandsToTree(text: string): CommandsResult {
  const nodes: TreeNode[] = [];
  const ignored: string[] = [];
  let cwd: string[] = [];

  const add = (segments: readonly string[], dir: boolean) => {
    let level = nodes;
    segments.forEach((name, i) => {
      const isLast = i === segments.length - 1;
      let node = level.find((n) => n.name === name);
      if (!node) {
        node = emptyNode(name, !isLast || dir);
        level.push(node);
      } else if (!isLast || dir) {
        node.dir = true;
      }
      level = node.children;
    });
  };

  for (const line of text.split('\n')) {
    if (!line.trim() || /^\s*(?:#|::|rem\s)/i.test(line)) continue;
    let recognized = false;
    for (const tokens of splitCommands(line)) {
      const words = tokens.filter((t) => t.text !== '>');
      // Redirection vers un fichier : `echo > notes.md`, `type nul > a.txt`.
      tokens.forEach((t, i) => {
        const target = tokens[i + 1];
        if (t.text === '>' && !t.quoted && target && !NULL_TARGETS.test(target.text)) {
          add(resolvePath(cwd, target.text), false);
          recognized = true;
        }
      });
      const cmd = words[0]?.text.toLowerCase();
      if (!cmd) continue;
      const params = new Map<string, string>();
      const args: string[] = [];
      const redirected = new Set(
        tokens.flatMap((t, i) => (t.text === '>' && tokens[i + 1] ? [tokens[i + 1]] : [])),
      );
      for (let i = 1; i < words.length; i++) {
        const w = words[i];
        if (redirected.has(w)) continue;
        if (!w.quoted && w.text.startsWith('-')) {
          const key = w.text.toLowerCase().replace(/:$/, '');
          if (VALUED.has(key) && i + 1 < words.length) params.set(key, words[++i].text);
          continue;
        }
        args.push(...(w.quoted ? [w.text] : expandBraces(w.text)));
      }
      // New-Item accepte plusieurs chemins separes par des virgules.
      const paths = [
        ...(params.get('-path') ?? params.get('-literalpath') ?? '').split(','),
        ...args,
      ]
        .map((p) => p.trim())
        .filter(Boolean);

      if (cmd === 'mkdir' || cmd === 'md') {
        paths.forEach((p) => add(resolvePath(cwd, p), true));
        recognized = true;
      } else if (cmd === 'touch') {
        paths.forEach((p) => add(resolvePath(cwd, p), false));
        recognized = true;
      } else if (cmd === 'new-item' || cmd === 'ni') {
        const type = (params.get('-itemtype') ?? params.get('-type') ?? 'file').toLowerCase();
        const dir = type.startsWith('d');
        const name = params.get('-name');
        const targets = paths.length ? paths : ['.'];
        targets.forEach((p) => add(resolvePath(cwd, name ? `${p}/${name}` : p), dir));
        recognized = true;
      } else if (cmd === 'cd' || cmd === 'set-location' || cmd === 'pushd') {
        if (paths[0] && paths[0] !== '-') cwd = resolvePath(cwd, paths[0]);
        recognized = true;
      } else if (['echo', 'type', 'cat', 'printf', 'set-content', 'out-file'].includes(cmd)) {
        recognized = recognized || tokens.some((t) => t.text === '>');
      }
    }
    if (!recognized) ignored.push(line.trim());
  }
  return { nodes, ignored };
}

// ---- Edition de la hierarchie ------------------------------------------------------------------

/** Chemin d'un noeud : indices successifs depuis la racine. */
export type NodePath = readonly number[];

export function cloneTree(nodes: readonly TreeNode[]): TreeNode[] {
  return nodes.map((n) => ({ ...n, children: cloneTree(n.children) }));
}

function siblingsOf(nodes: TreeNode[], path: NodePath): TreeNode[] {
  let level = nodes;
  for (const i of path.slice(0, -1)) level = level[i].children;
  return level;
}

export interface FlatNode {
  node: TreeNode;
  path: number[];
  depth: number;
  /** L'element juste au-dessus, au meme niveau, est un dossier : on peut y ranger celui-ci. */
  canIndent: boolean;
}

/** Noeuds a plat, dans l'ordre d'affichage, pour l'editeur de hierarchie. */
export function flattenTree(nodes: readonly TreeNode[]): FlatNode[] {
  const out: FlatNode[] = [];
  const walk = (children: readonly TreeNode[], base: number[]) =>
    children.forEach((node, i) => {
      const path = [...base, i];
      out.push({ node, path, depth: base.length, canIndent: !!children[i - 1]?.dir });
      walk(node.children, path);
    });
  walk(nodes, []);
  return out;
}

export type TreeEdit =
  | { kind: 'rename'; path: NodePath; name: string }
  | { kind: 'comment'; path: NodePath; comment: string }
  | { kind: 'toggle-dir'; path: NodePath }
  | { kind: 'add-child'; path: NodePath; dir: boolean }
  | { kind: 'add-sibling'; path: NodePath; dir: boolean }
  | { kind: 'add-root'; dir: boolean }
  | { kind: 'remove'; path: NodePath }
  | { kind: 'move'; path: NodePath; delta: -1 | 1 }
  | { kind: 'indent'; path: NodePath }
  | { kind: 'outdent'; path: NodePath };

/**
 * Applique une modification de la hierarchie sur une copie. Rend le nouvel arbre et le chemin du noeud
 * concerne (pour garder le focus dessus), ou null si le noeud n'existe plus.
 */
export function editTree(
  source: readonly TreeNode[],
  edit: TreeEdit,
): { nodes: TreeNode[]; focus: number[] | null } {
  const nodes = cloneTree(source);
  if (edit.kind === 'add-root') {
    nodes.push(emptyNode(edit.dir ? 'dossier' : 'fichier.txt', edit.dir));
    return { nodes, focus: [nodes.length - 1] };
  }
  const path = [...edit.path];
  const siblings = siblingsOf(nodes, path);
  const index = path[path.length - 1];
  const node = siblings[index];
  if (!node) return { nodes, focus: null };

  switch (edit.kind) {
    case 'rename': {
      const name = edit.name.replace(/[/\\]+$/, '');
      if (/[/\\]$/.test(edit.name)) node.dir = true;
      node.name = name;
      return { nodes, focus: path };
    }
    case 'comment':
      node.comment = edit.comment.trim() || undefined;
      if (!node.comment) delete node.comment;
      return { nodes, focus: path };
    case 'toggle-dir':
      // Un dossier qui a du contenu reste un dossier.
      if (!node.dir || !node.children.length) node.dir = !node.dir;
      return { nodes, focus: path };
    case 'add-child': {
      node.dir = true;
      node.children.push(emptyNode(edit.dir ? 'dossier' : 'fichier.txt', edit.dir));
      return { nodes, focus: [...path, node.children.length - 1] };
    }
    case 'add-sibling':
      siblings.splice(index + 1, 0, emptyNode(edit.dir ? 'dossier' : 'fichier.txt', edit.dir));
      return { nodes, focus: [...path.slice(0, -1), index + 1] };
    case 'remove':
      siblings.splice(index, 1);
      if (siblings.length) {
        return { nodes, focus: [...path.slice(0, -1), Math.min(index, siblings.length - 1)] };
      }
      return { nodes, focus: path.length > 1 ? path.slice(0, -1) : null };
    case 'move': {
      const target = index + edit.delta;
      if (target < 0 || target >= siblings.length) return { nodes, focus: path };
      [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
      return { nodes, focus: [...path.slice(0, -1), target] };
    }
    case 'indent': {
      // Devient le dernier enfant du dossier juste au-dessus (un fichier ne recoit rien).
      const parent = siblings[index - 1];
      if (!parent?.dir) return { nodes, focus: path };
      siblings.splice(index, 1);
      parent.children.push(node);
      return { nodes, focus: [...path.slice(0, -1), index - 1, parent.children.length - 1] };
    }
    case 'outdent': {
      // Remonte juste apres son dossier parent.
      if (path.length < 2) return { nodes, focus: path };
      const parentPath = path.slice(0, -1);
      const grand = siblingsOf(nodes, parentPath);
      const parentIndex = parentPath[parentPath.length - 1];
      siblings.splice(index, 1);
      grand.splice(parentIndex + 1, 0, node);
      return { nodes, focus: [...parentPath.slice(0, -1), parentIndex + 1] };
    }
  }
}
