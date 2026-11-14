import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, firstValueFrom, of } from 'rxjs';
import { Project, ProjectFolder } from '../../../../core/api/models';
import { ProjectFoldersApi, ProjectsApi } from '../../../../core/api/tasks.api';
import { AppError } from '../../../../core/api/app-error';
import { DateTimeFieldComponent } from '../../../../shared/ui/datetime-field/datetime-field';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { COLORS } from '../../constants/colors';

/** Projet a modifier, ou valeurs initiales d'un nouveau projet (dossier choisi), ou rien. */
export type ProjectDialogData = Project | { folderId?: string | null } | null;

@Component({
  selector: 'ff-project-dialog',
  imports: [ReactiveFormsModule, IconComponent, DateTimeFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-dialog.html',
})
export class ProjectDialogComponent {
  private readonly api = inject(ProjectsApi);
  private readonly input = inject<ProjectDialogData>(DIALOG_DATA);
  /** Projet modifie (null en creation). */
  protected readonly data: Project | null = this.input && 'id' in this.input ? this.input : null;
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly colors = COLORS;
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly folders = toSignal(
    inject(ProjectFoldersApi)
      .list()
      .pipe(catchError(() => of([] as ProjectFolder[]))),
    { initialValue: [] as ProjectFolder[] },
  );
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.data?.name ?? '', [Validators.required, Validators.maxLength(120)]],
    description: [this.data?.description ?? ''],
    color: [this.data?.color ?? COLORS[0]],
    icon: [this.data?.icon ?? 'folder'],
    dueAt: [this.data?.dueAt ?? (null as string | null)],
    folderId: [this.input?.folderId ?? ''],
  });

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.form.value.name?.trim()) return;
    this.saving.set(true);
    const v = this.form.getRawValue();
    const body = {
      name: v.name.trim(),
      description: v.description,
      color: v.color,
      icon: v.icon,
      dueAt: v.dueAt,
      folderId: v.folderId || null,
    };
    try {
      await firstValueFrom(this.data ? this.api.update(this.data.id, body) : this.api.create(body));
      this.ref.close(true);
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.saving.set(false);
    }
  }
}
