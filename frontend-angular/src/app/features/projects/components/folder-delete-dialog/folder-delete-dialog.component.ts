import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import {
  FolderDeletionMode,
  FolderDeletionReport,
  ProjectFolder,
} from '../../../../core/api/models';
import { ProjectFoldersApi } from '../../../../core/api/tasks.api';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { deletionLines } from '../../util/project-folders';

export interface FolderDeleteDialogData {
  folders: ProjectFolder[];
  /** Dossiers coches a l'ouverture (tous si absent). */
  selected?: string[];
}

/**
 * Suppression d'un ou plusieurs dossiers (lot 27) : choix des dossiers, sort de leurs projets, apercu calcule par
 * le serveur sans ecriture, puis suppression. Se ferme avec le rapport, ou rien si l'utilisateur annule.
 */
@Component({
  selector: 'ff-folder-delete-dialog',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './folder-delete-dialog.html',
})
export class FolderDeleteDialogComponent {
  protected readonly data = inject<FolderDeleteDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<FolderDeletionReport>>(DialogRef);
  private readonly api = inject(ProjectFoldersApi);

  protected readonly selected = signal<Set<string>>(
    new Set(this.data.selected ?? this.data.folders.map((f) => f.id)),
  );
  /** Le choix le plus prudent est propose par defaut. */
  protected readonly mode = signal<FolderDeletionMode>('KEEP_PROJECTS');
  protected readonly preview = signal<FolderDeletionReport | null>(null);
  protected readonly loading = signal(false);
  protected readonly deleting = signal(false);
  protected readonly error = signal('');
  protected readonly lines = deletionLines;
  private requestNo = 0;

  protected readonly allChecked = computed(() =>
    this.data.folders.every((f) => this.selected().has(f.id)),
  );
  protected readonly count = computed(() => this.selected().size);

  /** Bilan court, toujours visible a cote des boutons (le detail est dans « Ce qui va se passer »). */
  protected readonly summary = computed(() => {
    const r = this.preview();
    if (!r || !this.count()) return '';
    const parts = [`${r.foldersDeleted} dossier(s)`];
    if (r.projectsDeleted) parts.push(`${r.projectsDeleted} projet(s)`);
    if (r.tasksDeleted) parts.push(`${r.tasksDeleted} tâche(s)`);
    return `À supprimer : ${parts.join(', ')}`;
  });

  constructor() {
    void this.refresh();
  }

  protected toggle(id: string, on: boolean): void {
    const next = new Set(this.selected());
    if (on) next.add(id);
    else next.delete(id);
    this.selected.set(next);
    void this.refresh();
  }

  protected toggleAll(): void {
    this.selected.set(this.allChecked() ? new Set() : new Set(this.data.folders.map((f) => f.id)));
    void this.refresh();
  }

  protected choose(mode: FolderDeletionMode): void {
    this.mode.set(mode);
    void this.refresh();
  }

  /** Apercu du serveur (rien n'est supprime) ; seule la derniere reponse est gardee. */
  private async refresh(): Promise<void> {
    const no = ++this.requestNo;
    this.error.set('');
    if (!this.count()) {
      this.preview.set(null);
      return;
    }
    this.loading.set(true);
    try {
      const r = await firstValueFrom(this.api.deleteMany([...this.selected()], this.mode(), true));
      if (no === this.requestNo) this.preview.set(r);
    } catch (e) {
      if (no === this.requestNo) {
        this.error.set(e instanceof AppError ? e.problem.detail : 'L’aperçu n’a pas pu être calculé.');
      }
    } finally {
      if (no === this.requestNo) this.loading.set(false);
    }
  }

  protected async confirm(): Promise<void> {
    if (!this.count()) return;
    this.deleting.set(true);
    this.error.set('');
    try {
      this.ref.close(
        await firstValueFrom(this.api.deleteMany([...this.selected()], this.mode(), false)),
      );
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'La suppression a échoué.');
    } finally {
      this.deleting.set(false);
    }
  }
}
