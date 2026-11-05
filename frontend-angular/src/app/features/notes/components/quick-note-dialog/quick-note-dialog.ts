import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { Note } from '../../../../core/api/models';
import { NotesApi } from '../../../../core/api/notes.api';
import { IconComponent } from '../../../../shared/ui/icon/icon';

export interface QuickNoteResult {
  note: Note;
  /** Vrai si l'utilisateur veut developper l'idee tout de suite dans l'editeur. */
  open: boolean;
}

/** Saisie rapide d'une idee : un titre suffit, quelques mots facultatifs. */
@Component({
  selector: 'ff-quick-note-dialog',
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quick-note-dialog.html',
})
export class QuickNoteDialogComponent {
  private readonly api = inject(NotesApi);
  protected readonly ref = inject<DialogRef<QuickNoteResult>>(DialogRef);
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    title: [
      '',
      [
        Validators.required,
        Validators.maxLength(200),
        (c: AbstractControl) => (String(c.value ?? '').trim() ? null : { required: true }),
      ],
    ],
    content: [''],
  });

  protected async submit(open: boolean): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');
    try {
      const note = await firstValueFrom(
        this.api.create({ title: v.title.trim(), content: v.content }),
      );
      this.ref.close({ note, open });
    } catch (e) {
      this.error.set(
        e instanceof AppError ? e.problem.detail : 'Une erreur inattendue est survenue.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
