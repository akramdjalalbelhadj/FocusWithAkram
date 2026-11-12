import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { copyText } from '../../editor/code-block';
import { AsciiKind } from '../../util/ascii';
import { BANNER_STYLES, BannerStyle, renderBanner } from '../../util/ascii-banner';
import {
  AsciiTable,
  CellAlign,
  TableStyle,
  emptyTable,
  parseTable,
  renderTable,
} from '../../util/ascii-table';
import {
  FlatNode,
  NodePath,
  Shell,
  TreeEdit,
  TreeNode,
  TreeStyle,
  commandsToTree,
  editTree,
  flattenTree,
  parseTree,
  renderTree,
  treeToCommands,
} from '../../util/ascii-tree';

export interface AsciiStudioData {
  /** Onglet ouvert. */
  kind: AsciiKind;
  /** Schema existant a modifier (vide : nouveau schema). */
  text?: string;
}

const SAMPLE_TREE = 'projet/\n├── src/\n│   ├── app/\n│   └── main.ts\n├── docs/\n└── README.md';

const KINDS: readonly { id: AsciiKind; label: string; icon: string }[] = [
  { id: 'tree', label: 'Arborescence', icon: 'folder-tree' },
  { id: 'table', label: 'Tableau', icon: 'table' },
  { id: 'banner', label: 'Bannière', icon: 'type' },
];

const TABLE_STYLES: readonly { id: TableStyle; label: string }[] = [
  { id: 'ascii', label: 'ASCII +---+' },
  { id: 'unicode', label: 'Traits ┌───┐' },
  { id: 'rounded', label: 'Arrondi ╭───╮' },
  { id: 'double', label: 'Double ╔═══╗' },
];

const ALIGNS: readonly { id: CellAlign; label: string; icon: string }[] = [
  { id: 'left', label: 'à gauche', icon: 'align-left' },
  { id: 'center', label: 'au centre', icon: 'align-center' },
  { id: 'right', label: 'à droite', icon: 'align-right' },
];

/**
 * Atelier ASCII (panneau lateral) : arborescence de dossiers et fichiers (texte, hierarchie et commandes
 * mkdir/touch synchronises dans les deux sens), tableau encadre (grille et texte) et banniere. Se ferme sur le
 * texte du schema de l'onglet actif, que l'editeur insere dans un bloc ```ascii.
 */
@Component({
  selector: 'ff-ascii-studio',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ascii-studio.html',
  styleUrl: './ascii-studio.css',
})
export class AsciiStudioComponent {
  protected readonly ref = inject<DialogRef<string, AsciiStudioComponent>>(DialogRef);
  private readonly data = inject<AsciiStudioData | null>(DIALOG_DATA, { optional: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly kinds = KINDS;
  protected readonly tableStyles = TABLE_STYLES;
  protected readonly aligns = ALIGNS;
  protected readonly bannerStyles = BANNER_STYLES;
  /** Modification d'un schema existant (le bouton dit « Mettre à jour »). */
  protected readonly editing = !!this.data?.text?.trim();
  protected readonly kind = signal<AsciiKind>(this.data?.kind ?? 'tree');

  // ---- Arborescence --------------------------------------------------------------------------
  protected readonly treeNodes = signal<TreeNode[]>([]);
  protected readonly treeStyle = signal<TreeStyle>('unicode');
  protected readonly treeText = signal('');
  protected readonly shell = signal<Shell>('bash');
  protected readonly commandsText = signal('');
  /** Lignes de commandes non reconnues lors du dernier import. */
  protected readonly ignored = signal<string[]>([]);
  protected readonly flat = computed(() => flattenTree(this.treeNodes()));

  // ---- Tableau -------------------------------------------------------------------------------
  protected readonly table = signal<AsciiTable>(emptyTable());
  protected readonly tableStyle = signal<TableStyle>('unicode');
  protected readonly tableText = signal('');
  protected readonly tableError = signal(false);

  // ---- Banniere ------------------------------------------------------------------------------
  protected readonly bannerInput = signal('FocusFlow');
  protected readonly bannerStyle = signal<BannerStyle>('block');
  protected readonly bannerText = computed(() =>
    renderBanner(this.bannerInput(), this.bannerStyle()),
  );

  /** Schema produit par l'onglet actif. */
  protected readonly result = computed(() => {
    switch (this.kind()) {
      case 'tree':
        return this.treeText();
      case 'table':
        return this.tableText();
      case 'banner':
        return this.bannerText();
    }
  });
  protected readonly copied = signal<'result' | 'commands' | null>(null);
  private copyTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const text = this.data?.text?.replace(/\s+$/, '') ?? '';
    const kind = this.kind();
    if (kind === 'tree' && text) this.onTreeText(text);
    else this.setTree(parseTree(SAMPLE_TREE).nodes);

    const parsed = kind === 'table' && text ? parseTable(text) : null;
    if (parsed) {
      this.table.set(parsed.table);
      this.tableStyle.set(parsed.style);
      this.tableText.set(text);
    } else {
      this.tableText.set(renderTable(this.table(), this.tableStyle()));
    }
    if (kind === 'banner' && text) this.bannerInput.set(text);
  }

  protected onTabKeydown(event: KeyboardEvent): void {
    const i = KINDS.findIndex((k) => k.id === this.kind());
    let next = -1;
    if (event.key === 'ArrowRight') next = (i + 1) % KINDS.length;
    else if (event.key === 'ArrowLeft') next = (i - 1 + KINDS.length) % KINDS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = KINDS.length - 1;
    if (next < 0) return;
    event.preventDefault();
    this.kind.set(KINDS[next].id);
    this.focus(`#ascii-tab-${KINDS[next].id}`);
  }

  // ---- Arborescence : trois vues synchronisees -------------------------------------------------

  /** Texte saisi : la hierarchie et les commandes suivent, le texte reste tel quel. */
  protected onTreeText(text: string): void {
    const { nodes, style } = parseTree(text);
    this.treeText.set(text);
    this.treeNodes.set(nodes);
    if (/[├└│|`]/.test(text)) this.treeStyle.set(style);
    this.commandsText.set(treeToCommands(nodes, this.shell()));
    this.ignored.set([]);
  }

  /** Commandes saisies ou collees : la hierarchie et le texte suivent. */
  protected onCommands(text: string): void {
    const { nodes, ignored } = commandsToTree(text);
    this.commandsText.set(text);
    this.treeNodes.set(nodes);
    this.treeText.set(renderTree(nodes, this.treeStyle()));
    this.ignored.set(ignored);
  }

  protected setTreeStyle(style: TreeStyle): void {
    this.treeStyle.set(style);
    this.treeText.set(renderTree(this.treeNodes(), style));
  }

  protected setShell(shell: Shell): void {
    this.shell.set(shell);
    this.commandsText.set(treeToCommands(this.treeNodes(), shell));
    this.ignored.set([]);
  }

  /** Modification depuis la hierarchie ; le focus suit le noeud concerne (sauf saisie dans un champ). */
  protected edit(change: TreeEdit, refocus = true): void {
    const { nodes, focus } = editTree(this.treeNodes(), change);
    this.setTree(nodes);
    if (!refocus) return;
    if (focus) {
      this.focus(`[data-tree-path="${focus.join('-')}"]`, change.kind.startsWith('add'));
    } else {
      this.focus('.ascii-tree-add button');
    }
  }

  protected pathKey(path: NodePath): string {
    return path.join('-');
  }

  /** Raccourcis du nom : Entree ajoute un voisin, Tab / Maj+Tab indentent, Alt+fleches deplacent. */
  protected onNameKeydown(event: KeyboardEvent, item: FlatNode): void {
    const { path, node, canIndent } = item;
    let change: TreeEdit | null = null;
    if (event.key === 'Enter') change = { kind: 'add-sibling', path, dir: node.dir };
    // Tab sans effet possible (pas de dossier au-dessus, racine) : le focus continue normalement.
    else if (event.key === 'Tab' && !event.shiftKey && canIndent) change = { kind: 'indent', path };
    else if (event.key === 'Tab' && event.shiftKey && path.length > 1)
      change = { kind: 'outdent', path };
    else if (event.altKey && event.key === 'ArrowUp') change = { kind: 'move', path, delta: -1 };
    else if (event.altKey && event.key === 'ArrowDown') change = { kind: 'move', path, delta: 1 };
    if (!change) return;
    event.preventDefault();
    this.edit(change);
  }

  private setTree(nodes: TreeNode[]): void {
    this.treeNodes.set(nodes);
    this.treeText.set(renderTree(nodes, this.treeStyle()));
    this.commandsText.set(treeToCommands(nodes, this.shell()));
    this.ignored.set([]);
  }

  // ---- Tableau --------------------------------------------------------------------------------

  protected onTableText(text: string): void {
    this.tableText.set(text);
    const parsed = parseTable(text);
    this.tableError.set(!parsed && !!text.trim());
    if (parsed) {
      this.table.set(parsed.table);
      this.tableStyle.set(parsed.style);
    }
  }

  protected setCell(row: number, col: number, value: string): void {
    this.updateTable((t) => {
      t.rows[row][col] = value;
    });
  }

  protected setAlign(col: number, align: CellAlign): void {
    this.updateTable((t) => {
      t.align[col] = align;
    });
  }

  protected setHeader(value: boolean): void {
    this.updateTable((t) => {
      t.header = value;
    });
  }

  protected setRowLines(value: boolean): void {
    this.updateTable((t) => {
      t.rowLines = value;
    });
  }

  protected setTableStyle(style: string): void {
    this.tableStyle.set(style as TableStyle);
    this.updateTable(() => undefined);
  }

  protected addRow(): void {
    this.updateTable((t) => {
      t.rows.push(t.align.map(() => ''));
    });
    this.focus(`[data-cell="${this.table().rows.length - 1}-0"]`);
  }

  protected addColumn(): void {
    this.updateTable((t) => {
      t.rows.forEach((r, i) => r.push(i === 0 && t.header ? `Colonne ${r.length + 1}` : ''));
      t.align.push('left');
    });
    this.focus(`[data-cell="0-${this.table().align.length - 1}"]`);
  }

  protected removeRow(row: number): void {
    if (this.table().rows.length <= 1) return;
    this.updateTable((t) => {
      t.rows.splice(row, 1);
    });
  }

  protected removeColumn(col: number): void {
    if (this.table().align.length <= 1) return;
    this.updateTable((t) => {
      t.rows.forEach((r) => r.splice(col, 1));
      t.align.splice(col, 1);
    });
  }

  private updateTable(change: (t: AsciiTable) => void): void {
    const current = this.table();
    const next: AsciiTable = {
      ...current,
      rows: current.rows.map((r) => [...r]),
      align: [...current.align],
    };
    change(next);
    this.table.set(next);
    this.tableText.set(renderTable(next, this.tableStyle()));
    this.tableError.set(false);
  }

  // ---- Banniere -------------------------------------------------------------------------------

  protected setBannerStyle(style: string): void {
    this.bannerStyle.set(style as BannerStyle);
  }

  // ---- Validation -----------------------------------------------------------------------------

  protected async copy(what: 'result' | 'commands'): Promise<void> {
    if (await copyText(what === 'result' ? this.result() : this.commandsText())) {
      this.copied.set(what);
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copied.set(null), 1500);
    }
  }

  protected submit(): void {
    const text = this.result().replace(/\s+$/, '');
    if (text) this.ref.close(text);
  }

  protected value(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
  }

  protected checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  /** Focus apres le prochain rendu (l'element vient peut-etre d'etre cree). */
  private focus(selector: string, select = false): void {
    afterNextRender(
      () => {
        const el = this.host.nativeElement.querySelector<HTMLElement>(selector);
        el?.focus();
        if (select && el instanceof HTMLInputElement) el.select();
      },
      { injector: this.injector },
    );
  }
}
