import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { NOTE_ERRORS, NoteCategory } from '../../../../core/api/models';
import { NotesApi } from '../../../../core/api/notes.api';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { COLORS } from '../../../projects/constants/colors';

/** Creation ou modification d'une categorie d'idees : nom unique et couleur. */
@Component({
  selector: 'ff-note-category-dialog',
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './note-category-dialog.html',
})
export class NoteCategoryDialogComponent {
  private readonly api = inject(NotesApi);
  protected readonly data = inject<NoteCategory | null>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly colors = COLORS;
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [
      this.data?.name ?? '',
      [
        Validators.required,
        Validators.maxLength(60),
        (c: AbstractControl) => (String(c.value ?? '').trim() ? null : { required: true }),
      ],
    ],
    color: [this.data?.color ?? COLORS[0]],
  });

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    const v = this.form.getRawValue();
    const body = { name: v.name.trim(), color: v.color };
    this.saving.set(true);
    this.error.set('');
    try {
      await firstValueFrom(
        this.data ? this.api.updateCategory(this.data.id, body) : this.api.createCategory(body),
      );
      this.ref.close(true);
    } catch (e) {
      this.error.set(
        e instanceof AppError && e.problem.code === NOTE_ERRORS.categoryNameTaken
          ? 'Une catégorie porte déjà ce nom.'
          : e instanceof AppError
            ? e.problem.detail
            : 'Une erreur inattendue est survenue.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
