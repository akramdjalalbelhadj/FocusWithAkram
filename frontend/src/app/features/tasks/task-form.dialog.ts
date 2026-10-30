import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { firstValueFrom, startWith } from 'rxjs';
import { ProjectsApi, TasksApi } from '../../core/api/tasks.api';
import { CreateTaskInput, Project, QUADRANTS, QUADRANT_META, Quadrant, Task } from '../../core/api/models';
import { AppError } from '../../core/interceptors/error.interceptor';
import { formatDuration } from '../../core/util/time';
import { DateTimeFieldComponent } from '../../shared/ui/datetime-field';
import { IconComponent } from '../../shared/ui/icon';

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
  template: `
    <form class="card w-[min(40rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-2rem)] flex flex-col anim-pop shadow-modal"
      [formGroup]="form" (ngSubmit)="submit()" role="dialog" aria-labelledby="tf-title">
      <header class="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 id="tf-title" class="text-lg font-bold">{{ editing ? 'Modifier la tâche' : 'Nouvelle tâche' }}</h2>
        <button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label="Fermer" (click)="ref.close()"><ff-icon name="x" /></button>
      </header>

      <div class="overflow-y-auto px-6 pb-2 space-y-4">
        <div>
          <label class="field-label" for="tf-title-input">Titre <span class="text-danger" aria-hidden="true">*</span></label>
          <input id="tf-title-input" class="input" formControlName="title" maxlength="200" placeholder="Que faut-il faire ?" cdkFocusInitial
            [attr.aria-invalid]="form.controls.title.invalid && form.controls.title.touched" />
          @if (form.controls.title.touched && form.controls.title.invalid) { <p class="field-error">Le titre est obligatoire.</p> }
          @if (serverErrors()['title']) { <p class="field-error">{{ serverErrors()['title'] }}</p> }
        </div>

        <div>
          <label class="field-label" for="tf-desc">Description</label>
          <textarea id="tf-desc" class="input" formControlName="description" rows="3" placeholder="Détails, contexte, critères de réussite…"></textarea>
        </div>

        <fieldset>
          <legend class="field-label">Quadrant (matrice d'Eisenhower)</legend>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup">
            @for (q of quadrants; track q) {
              <label class="cursor-pointer rounded-xl border px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
                [style.background]="form.value.quadrant === q ? 'var(--' + q.toLowerCase() + '-soft)' : 'var(--surface)'"
                [style.border-color]="form.value.quadrant === q ? 'var(--' + q.toLowerCase() + ')' : 'var(--line)'"
                [style.color]="form.value.quadrant === q ? 'var(--' + q.toLowerCase() + ')' : 'var(--fg)'">
                <input type="radio" class="sr-only-text" formControlName="quadrant" [value]="q" />
                <span class="font-semibold block">{{ q }} · {{ meta[q].label }}</span>
                <span class="text-xs opacity-80">{{ meta[q].hint }}</span>
              </label>
            }
          </div>
        </fieldset>

        <fieldset class="rounded-xl border border-line p-4 space-y-3">
          <legend class="field-label px-1">Planification</legend>
          <div class="grid sm:grid-cols-2 gap-3">
            <div>
              <label class="field-label" for="tf-start">Début prévisionnel</label>
              <ff-datetime inputId="tf-start" formControlName="plannedStartAt" />
            </div>
            <div>
              <label class="field-label" for="tf-end">Fin prévisionnelle</label>
              <ff-datetime inputId="tf-end" formControlName="plannedEndAt" />
            </div>
          </div>
          @if (form.hasError('plannedOrder')) { <p class="field-error" role="alert">Le début prévu doit précéder la fin prévue.</p> }
          @else if (plannedSummary()) { <p class="text-sm text-muted flex items-center gap-2"><ff-icon name="hourglass" [size]="14" />Durée prévue : <strong class="text-fg">{{ plannedSummary() }}</strong></p> }
        </fieldset>

        <div class="grid sm:grid-cols-2 gap-3">
          <div>
            <label class="field-label" for="tf-project">Projet</label>
            <select id="tf-project" class="input" formControlName="projectId">
              <option value="">Aucun projet</option>
              @for (p of projects(); track p.id) { <option [value]="p.id">{{ p.name }}</option> }
            </select>
          </div>
          <div>
            <label class="field-label" for="tf-est">Estimation (minutes)</label>
            <input id="tf-est" class="input" type="number" min="1" max="100000" formControlName="estimatedMinutes" placeholder="ex. 90" />
            @if (form.controls.estimatedMinutes.invalid) { <p class="field-error">Entre 1 et 100000 minutes.</p> }
          </div>
        </div>

        <div>
          <label class="field-label" for="tf-tags">Étiquettes</label>
          <input id="tf-tags" class="input" formControlName="tags" placeholder="séparées par des virgules : api, revue, perso" />
          @if (serverErrors()['tags']) { <p class="field-error">{{ serverErrors()['tags'] }}</p> }
        </div>

        @if (!editing) {
          <div>
            <label class="field-label" for="tf-sub">Sous-tâches</label>
            <textarea id="tf-sub" class="input" formControlName="subtasks" rows="3" placeholder="Une sous-tâche par ligne"></textarea>
          </div>
        }

        <div>
          <label class="field-label" for="tf-notes">Notes</label>
          <textarea id="tf-notes" class="input" formControlName="notes" rows="2"></textarea>
        </div>

        @if (error()) { <p class="field-error" role="alert">{{ error() }}</p> }
      </div>

      <footer class="flex justify-end gap-2 px-6 py-4 border-t border-line">
        <button type="button" class="btn btn-secondary" (click)="ref.close()">Annuler</button>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">{{ editing ? 'Enregistrer' : 'Créer la tâche' }}</button>
      </footer>
    </form>`,
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
      title: [this.data.task?.title ?? '', [Validators.required, Validators.maxLength(200), (c: AbstractControl) => (String(c.value ?? '').trim() ? null : { required: true })]],
      description: [this.data.task?.description ?? ''],
      quadrant: [this.data.task?.quadrant ?? this.data.quadrant ?? ('Q2' as Quadrant)],
      plannedStartAt: [this.data.task?.plannedStartAt ?? (null as string | null)],
      plannedEndAt: [this.data.task?.plannedEndAt ?? (null as string | null)],
      projectId: [this.data.task?.project?.id ?? this.data.projectId ?? ''],
      estimatedMinutes: [this.data.task?.estimatedMinutes ?? (null as number | null), [Validators.min(1), Validators.max(100000)]],
      tags: [this.data.task?.tags.join(', ') ?? ''],
      subtasks: [''],
      notes: [this.data.task?.notes ?? ''],
    },
    { validators: plannedOrder },
  );

  private readonly value = toSignal(this.form.valueChanges.pipe(startWith(this.form.value)), { initialValue: this.form.value });
  protected readonly plannedSummary = computed(() => {
    const v = this.value();
    if (!v.plannedStartAt || !v.plannedEndAt) return '';
    const seconds = (Date.parse(v.plannedEndAt) - Date.parse(v.plannedStartAt)) / 1000;
    return seconds > 0 ? formatDuration(seconds) : '';
  });

  ngOnInit(): void {
    this.projectsApi.list().subscribe({ next: (list) => this.projects.set(list.filter((p) => !p.archived || p.id === this.data.task?.project?.id)) });
  }

  protected async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    const v = this.form.getRawValue();
    const tags = v.tags.split(',').map((t) => t.trim()).filter(Boolean);
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
          subtasks: v.subtasks.split('\n').map((s) => s.trim()).filter(Boolean),
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
