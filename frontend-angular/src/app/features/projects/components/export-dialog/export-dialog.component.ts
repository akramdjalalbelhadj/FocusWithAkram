import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Project, ProjectFolder } from '../../../../core/api/models';
import { IconComponent } from '../../../../shared/ui/icon/icon';

export interface ExportDialogData {
  folders: ProjectFolder[];
  /** Tous les projets (actifs et inactifs) : sert a compter et a designer les projets sans dossier. */
  projects: Project[];
}

/** Ce qu'il faut exporter ; `label` sert a nommer le fichier. */
export interface ExportChoice {
  ids?: string[];
  folderIds?: string[];
  withTasks: boolean;
  label: string;
}

type Kind = 'all' | 'structure' | 'folders';

/** Cle de la case « projets sans dossier » dans la selection. */
const LOOSE = 'none';

@Component({
  selector: 'ff-export-dialog',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './export-dialog.html',
})
export class ExportDialogComponent {
  protected readonly data = inject<ExportDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<ExportChoice>>(DialogRef);
  protected readonly kind = signal<Kind>('all');
  protected readonly withTasks = signal(true);
  protected readonly selected = signal<Set<string>>(new Set());
  protected readonly loose = this.data.projects.filter(
    (p) => !p.folderId || !this.data.folders.some((f) => f.id === p.folderId),
  );
  protected readonly LOOSE = LOOSE;

  protected countIn(folder: ProjectFolder): number {
    return this.data.projects.filter((p) => p.folderId === folder.id).length;
  }

  protected toggle(key: string, on: boolean): void {
    const next = new Set(this.selected());
    if (on) next.add(key);
    else next.delete(key);
    this.selected.set(next);
  }

  protected readonly allKeys = computed(() => [
    ...this.data.folders.map((f) => f.id),
    ...(this.loose.length ? [LOOSE] : []),
  ]);

  protected readonly allChecked = computed(
    () => this.allKeys().length > 0 && this.allKeys().every((k) => this.selected().has(k)),
  );

  protected toggleAll(): void {
    this.selected.set(this.allChecked() ? new Set() : new Set(this.allKeys()));
  }

  /** Projets que contiendra le fichier, pour le resume sous la liste. */
  protected readonly projectCount = computed(() => {
    if (this.kind() !== 'folders') return this.data.projects.length;
    const sel = this.selected();
    return this.data.projects.filter((p) =>
      this.loose.includes(p) ? sel.has(LOOSE) : sel.has(p.folderId ?? ''),
    ).length;
  });

  protected readonly folderCount = computed(() =>
    this.kind() !== 'folders'
      ? this.data.folders.length
      : this.data.folders.filter((f) => this.selected().has(f.id)).length,
  );

  protected readonly canExport = computed(() => this.projectCount() > 0);

  /** Nombre de cases cochees (dossiers et « Projets sans dossier »). */
  protected readonly selectedCount = computed(
    () => this.allKeys().filter((k) => this.selected().has(k)).length,
  );

  protected readonly includesTasks = computed(
    () => this.kind() === 'all' || (this.kind() === 'folders' && this.withTasks()),
  );

  protected submit(): void {
    if (!this.canExport()) return;
    const kind = this.kind();
    if (kind === 'all') return this.ref.close({ withTasks: true, label: 'tous' });
    if (kind === 'structure') return this.ref.close({ withTasks: false, label: 'structure' });
    const sel = this.selected();
    const folderIds = this.data.folders.filter((f) => sel.has(f.id)).map((f) => f.id);
    const ids = sel.has(LOOSE) ? this.loose.map((p) => p.id) : [];
    const names = this.data.folders.filter((f) => sel.has(f.id)).map((f) => f.name);
    const label =
      names.length === 1 && !ids.length ? names[0] : `${folderIds.length + (ids.length ? 1 : 0)}-dossiers`;
    this.ref.close({ folderIds, ids, withTasks: this.withTasks(), label });
  }
}
