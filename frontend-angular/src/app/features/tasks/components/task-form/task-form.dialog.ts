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
  NOTE_ERRORS,
  Project,
  QUADRANTS,
  QUADRANT_META,
  Quadrant,
  Task,
} from '../../../../core/api/models';
import { NotesApi } from '../../../../core/api/notes.api';
import { ProjectsApi, TasksApi } from '../../../../core/api/tasks.api';
import { AppError } from '../../../../core/api/app-error';
import { formatDuration } from '../../../../core/util/time';
import { DateTimeFieldComponent } from '../../../../shared/ui/datetime-field/datetime-field';
import { IconComponent } from '../../../../shared/ui/icon/icon';

/** Idee (module Notes & idees) dont la nouvelle tache est issue. */
export interface TaskSourceNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

export interface TaskFormData {
  task?: Task;
  quadrant?: Quadrant;
  projectId?: string | null;
  /** Creation depuis une idee : formulaire prerempli, tache rattachee a l'idee. */
  fromNote?: TaskSourceNote;
}

/** Longueur maximale d'une description de tache (contrat de l'API). */
const DESCRIPTION_MAX = 10_000;

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
  private readonly notesApi = inject(NotesApi);
  protected readonly data = inject<TaskFormData>(DIALOG_DATA);
  protected readonly fromNote = this.data.task ? undefined : this.data.fromNote;
  protected readonly ref = inject<DialogRef<Task>>(DialogRef);

  protected readonly quadrants = QUADRANTS;
  protected readonly meta = QUADRANT_META;
  protected readonly editing = !!this.data.task;
  protected readonly projects = signal<Project[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly serverErrors = signal<Record<string, string>>({});
  /** Doublon signale par le serveur (meme titre deja issu de l'idee) : la creation attend une confirmation. */
  protected readonly duplicate = signal('');

  protected readonly form = this.fb.group(
    {
      title: [
        this.data.task?.title ?? this.fromNote?.title ?? '',
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
      tags: [this.data.task?.tags.join(', ') ?? this.fromNote?.tags.join(', ') ?? ''],
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

  constructor() {
    // Un autre titre n'est plus le doublon signale.
    this.form.controls.title.valueChanges.subscribe(() => this.duplicate.set(''));
  }

  /** Reprend le contenu de l'idee comme description (dans la limite acceptee par l'API). */
  protected useNoteContent(): void {
    const content = this.fromNote?.content ?? '';
    this.form.controls.description.setValue(content.slice(0, DESCRIPTION_MAX));
  }

  ngOnInit(): void {
    this.projectsApi.list().subscribe({
      next: (list) =>
        this.projects.set(list.filter((p) => !p.archived || p.id === this.data.task?.project?.id)),
    });
  }

  protected async submit(allowDuplicate = false): Promise<void> {
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
        saved = await firstValueFrom(
          this.fromNote
            ? this.notesApi.createTask(this.fromNote.id, input, allowDuplicate)
            : this.tasks.create(input),
        );
      }
      this.ref.close(saved);
    } catch (e) {
      if (e instanceof AppError && e.problem.code === NOTE_ERRORS.taskDuplicate) {
        this.duplicate.set(`Une tâche « ${v.title.trim()} » issue de cette idée existe déjà.`);
        // L'avertissement est en bas du formulaire : on l'amene dans la vue.
        setTimeout(() =>
          document.getElementById('tf-duplicate')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
        );
      } else if (e instanceof AppError) {
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
