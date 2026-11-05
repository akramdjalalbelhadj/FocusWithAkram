import { Dialog } from '@angular/cdk/dialog';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../core/api/app-error';
import { NOTE_ERRORS, Note, NoteCategory, Task } from '../../../core/api/models';
import { NotesApi } from '../../../core/api/notes.api';
import { RefreshService } from '../../../core/services/refresh.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmDialogComponent } from '../../../shared/ui/dialogs/index';
import { ConfirmData } from '../../../shared/ui/dialogs/confirm-dialog/confirm-data';
import { TaskActions } from '../../tasks/services/task-actions.service';
import { NoteCategoryDialogComponent } from '../components/note-category-dialog/note-category-dialog';
import {
  QuickNoteDialogComponent,
  QuickNoteResult,
} from '../components/quick-note-dialog/quick-note-dialog';

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

  /** Transforme l'idee en tache avec le formulaire de tache habituel ; l'idee reste intacte. */
  createTask(note: Note): Promise<Task | undefined> {
    return this.tasks.create({
      fromNote: { id: note.id, title: note.title, content: note.content, tags: note.tags },
    });
  }

  /**
   * Supprime une idee. Si des taches en sont issues, la suppression simple est bloquee : un avertissement en
   * explique la raison et propose une suppression forcee, qui conserve les taches sans lien vers l'idee.
   */
  async remove(note: NoteRef): Promise<boolean> {
    const force = note.taskCount > 0;
    if (
      !(await this.confirm(
        force ? blockedDeletion(note.title, note.taskCount) : simpleDeletion(note.title),
      ))
    ) {
      return false;
    }
    try {
      await firstValueFrom(this.api.delete(note.id, force));
    } catch (e) {
      // Des taches ont ete creees entre-temps (autre onglet) : meme avertissement, avec le message du serveur.
      if (!(e instanceof AppError) || e.problem.code !== NOTE_ERRORS.hasTasks) {
        this.toast.errorFrom(e, 'Suppression impossible.');
        return false;
      }
      if (!(await this.confirm(blockedDeletion(note.title, null, e.problem.detail)))) return false;
      try {
        await firstValueFrom(this.api.delete(note.id, true));
      } catch (again) {
        this.toast.errorFrom(again, 'Suppression impossible.');
        return false;
      }
    }
    this.toast.success(force ? 'Idée supprimée ; ses tâches sont conservées.' : 'Idée supprimée.');
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

  private async confirm(data: ConfirmData): Promise<boolean> {
    return !!(await firstValueFrom(
      this.dialog.open<boolean>(ConfirmDialogComponent, { data, backdropClass: 'ff-backdrop' })
        .closed,
    ));
  }
}

function simpleDeletion(title: string): ConfirmData {
  return {
    title: 'Supprimer cette idée ?',
    message: `« ${title} » sera supprimée définitivement.`,
    confirmLabel: 'Supprimer',
    danger: true,
  };
}

/** Avertissement de suppression bloquee ; `serverDetail` remplace le decompte quand il n'est pas connu. */
function blockedDeletion(title: string, count: number | null, serverDetail?: string): ConfirmData {
  const origin =
    count === null
      ? (serverDetail ?? 'Des tâches sont issues de cette idée.')
      : count === 1
        ? `« ${title} » a donné naissance à une tâche.`
        : `« ${title} » a donné naissance à ${count} tâches.`;
  return {
    title: 'Suppression bloquée',
    message:
      `${origin} La suppression simple est refusée pour ne pas perdre le lien entre l’idée et ce qu’elle a produit. ` +
      'Si vous forcez la suppression, l’idée disparaît définitivement ; ses tâches restent dans la matrice, sans lien vers elle.',
    confirmLabel: 'Supprimer quand même',
    danger: true,
  };
}
