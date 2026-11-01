import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Project } from '../../../../core/api/models';
import { ProjectsApi } from '../../../../core/api/tasks.api';
import { AppError } from '../../../../core/interceptors/error.interceptor';
import { DateTimeFieldComponent } from '../../../../shared/ui/datetime-field/datetime-field';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { COLORS } from '../../constants/colors';

@Component({
  selector: 'ff-project-dialog',
  imports: [ReactiveFormsModule, IconComponent, DateTimeFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-dialog.html',
})
export class ProjectDialogComponent {
  private readonly api = inject(ProjectsApi);
  protected readonly data = inject<Project | null>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly colors = COLORS;
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.data?.name ?? '', [Validators.required, Validators.maxLength(120)]],
    description: [this.data?.description ?? ''],
    color: [this.data?.color ?? COLORS[0]],
    icon: [this.data?.icon ?? 'folder'],
    dueAt: [this.data?.dueAt ?? (null as string | null)],
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
