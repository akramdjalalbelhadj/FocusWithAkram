import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, firstValueFrom, of } from 'rxjs';
import { Project, ProjectFolder } from '../../../../core/api/models';
import { ProjectFoldersApi, ProjectsApi } from '../../../../core/api/tasks.api';
import { AppError } from '../../../../core/api/app-error';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { COLORS } from '../../constants/colors';

/** Projet a modifier, ou valeurs initiales d'un nouveau projet (dossier choisi), ou rien. */
export type ProjectDialogData = Project | { folderIds?: string[] } | null;

@Component({
  selector: 'ff-project-dialog',
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-dialog.html',
})
export class ProjectDialogComponent {
  private readonly api = inject(ProjectsApi);
  private readonly input = inject<ProjectDialogData>(DIALOG_DATA);
  /** Projet modifie (null en creation). */
  protected readonly data: Project | null = this.input && 'id' in this.input ? this.input : null;
  /** Se ferme avec le projet enregistre. */
  protected readonly ref = inject<DialogRef<Project>>(DialogRef);
  protected readonly colors = COLORS;
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly folders = toSignal(
    inject(ProjectFoldersApi)
      .list()
      .pipe(catchError(() => of([] as ProjectFolder[]))),
    { initialValue: [] as ProjectFolder[] },
  );
  /** Dossiers coches (un projet peut en avoir plusieurs, ou aucun). */
  protected readonly chosen = signal<Set<string>>(new Set(this.input?.folderIds ?? []));

  protected toggleFolder(id: string, on: boolean): void {
    const next = new Set(this.chosen());
    if (on) next.add(id);
    else next.delete(id);
    this.chosen.set(next);
  }

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.data?.name ?? '', [Validators.required, Validators.maxLength(120)]],
    description: [this.data?.description ?? ''],
    color: [this.data?.color ?? COLORS[0]],
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
      folderIds: [...this.chosen()],
    };
    try {
      this.ref.close(
        await firstValueFrom(this.data ? this.api.update(this.data.id, body) : this.api.create(body)),
      );
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.saving.set(false);
    }
  }
}
