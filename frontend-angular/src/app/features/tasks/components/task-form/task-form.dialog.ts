import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { firstValueFrom, startWith } from 'rxjs';
import {
  CreateTaskInput,
  Project,
  QUADRANTS,
  QUADRANT_META,
  Quadrant,
  Task,
} from '../../../../core/api/models';
import { ProjectsApi, TasksApi } from '../../../../core/api/tasks.api';
import { AppError } from '../../../../core/api/app-error';
import { formatDuration } from '../../../../core/util/time';
import { DateTimeFieldComponent } from '../../../../shared/ui/datetime-field/datetime-field';
import { IconComponent } from '../../../../shared/ui/icon/icon';

export interface TaskFormData {
  task?: Task;
  quadrant?: Quadrant;
  projectId?: string | null;
}

function plannedOrder(group: AbstractControl): ValidationErrors | null {
  const start = group.get('plannedStartAt')?.value as string | null;
  const end = group.get('plannedEndAt')?.value as string | null;
  return start && end && Date.parse(start) >= Date.parse(end) ? { plannedOrder: true } : null;
}

@Component({
  selector: 'ff-task-form-dialog',
  imports: [ReactiveFormsModule, DateTimeFieldComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-form.dialog.html',
})
export class TaskFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly tasks = inject(TasksApi);
  private readonly projectsApi = inject(ProjectsApi);
  protected readonly data = inject<TaskFormData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<Task>>(DialogRef);

  protected readonly quadrants = QUADRANTS;
  protected readonly meta = QUADRANT_META;
  protected readonly editing = !!this.data.task;
  protected readonly projects = signal<Project[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly serverErrors = signal<Record<string, string>>({});

  protected readonly form = this.fb.group(
    {
      title: [
        this.data.task?.title ?? '',
        [
          Validators.required,
          Validators.maxLength(200),
          (c: AbstractControl) => (String(c.value ?? '').trim() ? null : { required: true }),
        ],
      ],
      description: [this.data.task?.description ?? ''],
      quadrant: [this.data.task?.quadrant ?? this.data.quadrant ?? ('Q2' as Quadrant)],
      plannedStartAt: [this.data.task?.plannedStartAt ?? (null as string | null)],
      plannedEndAt: [this.data.task?.plannedEndAt ?? (null as string | null)],
      projectId: [this.data.task?.project?.id ?? this.data.projectId ?? ''],
      estimatedMinutes: [
        this.data.task?.estimatedMinutes ?? (null as number | null),
        [Validators.min(1), Validators.max(100000)],
      ],
      tags: [this.data.task?.tags.join(', ') ?? ''],
      subtasks: [''],
      notes: [this.data.task?.notes ?? ''],
    },
    { validators: plannedOrder },
  );

  private readonly value = toSignal(this.form.valueChanges.pipe(startWith(this.form.value)), {
    initialValue: this.form.value,
  });
  protected readonly plannedSummary = computed(() => {
    const v = this.value();
    if (!v.plannedStartAt || !v.plannedEndAt) return '';
    const seconds = (Date.parse(v.plannedEndAt) - Date.parse(v.plannedStartAt)) / 1000;
    return seconds > 0 ? formatDuration(seconds) : '';
  });

  ngOnInit(): void {
    this.projectsApi.list().subscribe({
      next: (list) =>
        this.projects.set(list.filter((p) => !p.archived || p.id === this.data.task?.project?.id)),
    });
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    const v = this.form.getRawValue();
    const tags = v.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    this.saving.set(true);
    this.error.set('');
    this.serverErrors.set({});
    try {
      let saved: Task;
      if (this.data.task) {
        saved = await firstValueFrom(
          this.tasks.update(this.data.task.id, {
            title: v.title.trim(),
            description: v.description,
            notes: v.notes,
            quadrant: v.quadrant,
            plannedStartAt: v.plannedStartAt,
            plannedEndAt: v.plannedEndAt,
            estimatedMinutes: v.estimatedMinutes,
            projectId: v.projectId || null,
            tags,
          }),
        );
      } else {
        const input: CreateTaskInput = {
          title: v.title.trim(),
          description: v.description,
          notes: v.notes,
          quadrant: v.quadrant,
          plannedStartAt: v.plannedStartAt,
          plannedEndAt: v.plannedEndAt,
          estimatedMinutes: v.estimatedMinutes,
          projectId: v.projectId || null,
          tags,
          subtasks: v.subtasks
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
        };
        saved = await firstValueFrom(this.tasks.create(input));
      }
      this.ref.close(saved);
    } catch (e) {
      if (e instanceof AppError) {
        this.error.set(e.problem.detail);
        this.serverErrors.set(e.problem.errors ?? {});
      } else {
        this.error.set('Une erreur inattendue est survenue.');
      }
    } finally {
      this.saving.set(false);
    }
  }
}
