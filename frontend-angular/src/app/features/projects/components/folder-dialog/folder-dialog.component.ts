import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { ProjectFolder } from '../../../../core/api/models';
import { ProjectFoldersApi } from '../../../../core/api/tasks.api';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { COLORS } from '../../constants/colors';

/** Creation ou modification d'un dossier de projets ; se ferme avec le dossier enregistre. */
@Component({
  selector: 'ff-folder-dialog',
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './folder-dialog.html',
})
export class FolderDialogComponent {
  private readonly api = inject(ProjectFoldersApi);
  protected readonly data = inject<ProjectFolder | null>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<ProjectFolder>>(DialogRef);
  protected readonly colors = COLORS;
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.data?.name ?? '', [Validators.required, Validators.maxLength(80)]],
    color: [this.data?.color ?? '#64748b'],
  });

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    const name = this.form.value.name?.trim();
    if (this.form.invalid || !name) return;
    this.saving.set(true);
    const body = { name, color: this.form.getRawValue().color };
    try {
      const saved = await firstValueFrom(
        this.data ? this.api.update(this.data.id, body) : this.api.create(body),
      );
      this.ref.close(saved);
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.saving.set(false);
    }
  }
}
