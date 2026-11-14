import { Dialog } from '@angular/cdk/dialog';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Note, NoteCategory, Task } from '../../../core/api/models';
import { NotesApi } from '../../../core/api/notes.api';
import { RefreshService } from '../../../core/services/refresh.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent } from '../../../shared/ui/dialogs/index';
import { ConfirmData, ConfirmResult } from '../../../shared/ui/dialogs/confirm-dialog/confirm-data';
import { TaskActions } from '../../tasks/services/task-actions.service';
import { NoteCategoryDialogComponent } from '../components/note-category-dialog/note-category-dialog';
import {
  QuickNoteDialogComponent,
  QuickNoteResult,
} from '../components/quick-note-dialog/quick-note-dialog';
import { NoteTabs } from './note-tabs.service';

/** Ce qu'il faut connaitre d'une idee pour la supprimer (depuis la liste ou depuis l'editeur). */
export interface NoteRef {
  id: string;
  title: string;
  taskCount: number;
}

/**
 * Actions du module Notes & idees partagees par les pages (liste, editeur, categories), la palette et les
 * raccourcis. Chaque mutation informe l'utilisateur et incremente `RefreshService`.
 */
@Injectable({ providedIn: 'root' })
export class NoteActions {
  private readonly dialog = inject(Dialog);
  private readonly api = inject(NotesApi);
  private readonly refresh = inject(RefreshService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly tasks = inject(TaskActions);
  private readonly tabs = inject(NoteTabs);

  /** Saisie rapide d'une idee depuis n'importe quelle page (raccourci I, palette). */
  async quickCapture(): Promise<void> {
    const result = await firstValueFrom(
      this.dialog.open<QuickNoteResult>(QuickNoteDialogComponent, {
        backdropClass: 'ff-backdrop',
        ariaModal: true,
        maxWidth: '100vw',
      }).closed,
    );
    if (!result) return;
    this.refresh.bump();
    if (result.open) {
      void this.router.navigate(['/notes', result.note.id]);
    } else {
      this.toast.success('Idée enregistrée.');
    }
  }

  /** Transforme l'idee en tache avec le formulaire de tache habituel ; l'idee rejoint ensuite les Archives. */
  createTask(note: Note): Promise<Task | undefined> {
    return this.tasks.create({
      fromNote: { id: note.id, title: note.title, content: note.content, tags: note.tags },
    });
  }

  /**
   * Supprime ou archive une idee (choix propose). Supprimer une idee dont des taches sont issues la garde 72 heures
   * dans les archives, restaurable, avant son effacement definitif ; ses taches restent, sans lien vers elle.
   */
  async remove(note: NoteRef): Promise<boolean> {
    const linked = note.taskCount > 0;
    const choice = await this.ask({
      title: 'Supprimer ou archiver cette idée ?',
      message: linked
        ? `« ${note.title} » a donné naissance à ${note.taskCount === 1 ? 'une tâche' : `${note.taskCount} tâches`}. ` +
          'Si vous la supprimez, elle reste 72 heures dans les Archives (vous pouvez encore changer d’avis), puis elle est ' +
          'supprimée définitivement ; ses tâches restent, sans lien vers elle. Vous pouvez aussi simplement l’archiver.'
        : `« ${note.title} » : la supprimer l’efface définitivement ; l’archiver la range dans les Archives.`,
      confirmLabel: 'Supprimer',
      altLabel: 'Archiver',
      danger: true,
    });
    if (!choice) return false;
    const mode = choice === 'alt' ? 'archive' : 'delete';
    let archived: Note | null;
    try {
      archived = await firstValueFrom(this.api.remove(note.id, mode));
    } catch (e) {
      this.toast.errorFrom(e, mode === 'archive' ? 'Archivage impossible.' : 'Suppression impossible.');
      return false;
    }
    this.toast.success(
      mode === 'archive'
        ? 'Idée archivée.'
        : archived
          ? 'Idée placée dans les Archives : suppression définitive dans 72 heures.'
          : 'Idée supprimée.',
    );
    this.tabs.close(note.id);
    this.refresh.bump();
    return true;
  }

  /** Sort une idee des archives (annule aussi une suppression programmee). */
  async restore(id: string): Promise<boolean> {
    try {
      await firstValueFrom(this.api.restore(id));
    } catch (e) {
      this.toast.errorFrom(e, 'Restauration impossible.');
      return false;
    }
    this.toast.success('Idée restaurée dans Notes & idées.');
    this.refresh.bump();
    return true;
  }

  async editCategory(category: NoteCategory | null): Promise<boolean> {
    const saved = await firstValueFrom(
      this.dialog.open<boolean>(NoteCategoryDialogComponent, {
        data: category,
        backdropClass: 'ff-backdrop',
      }).closed,
    );
    if (saved) {
      this.toast.success(category ? 'Catégorie mise à jour.' : 'Catégorie créée.');
      this.refresh.bump();
    }
    return !!saved;
  }

  async removeCategory(category: NoteCategory): Promise<void> {
    const count = category.noteCount;
    const ok = await this.confirm({
      title: 'Supprimer cette catégorie ?',
      message:
        count === 0
          ? `« ${category.name} » sera supprimée.`
          : `« ${category.name} » sera supprimée. ${count === 1 ? 'Son idée est conservée' : `Ses ${count} idées sont conservées`}, sans catégorie.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.api.deleteCategory(category.id));
      this.toast.success('Catégorie supprimée.');
      this.refresh.bump();
    } catch (e) {
      this.toast.errorFrom(e, 'Suppression impossible.');
    }
  }

  private async ask(data: ConfirmData): Promise<ConfirmResult> {
    return await firstValueFrom(
      this.dialog.open<boolean | 'alt'>(ConfirmDialogComponent, { data, backdropClass: 'ff-backdrop' })
        .closed,
    );
  }

  private async confirm(data: ConfirmData): Promise<boolean> {
    return !!(await firstValueFrom(
      this.dialog.open<boolean>(ConfirmDialogComponent, { data, backdropClass: 'ff-backdrop' })
        .closed,
    ));
  }
}
