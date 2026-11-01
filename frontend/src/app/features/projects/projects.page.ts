import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Project } from '../../core/api/models';
import { ProjectsApi, TasksApi } from '../../core/api/tasks.api';
import { AppError } from '../../core/interceptors/error.interceptor';
import { RefreshService } from '../../core/services/refresh.service';
import { ToastService } from '../../core/services/toast.service';
import { Loader } from '../../core/util/loader';
import { ConfirmDialogComponent } from '../../shared/ui/dialogs';
import { DateTimeFieldComponent } from '../../shared/ui/datetime-field';
import { IconComponent } from '../../shared/ui/icon';
import { EmptyComponent, ErrorComponent, SkeletonComponent } from '../../shared/ui/states';
import { SettingsStore } from '../../core/services/settings.store';
import { TaskActions } from '../tasks/task-actions.service';

const COLORS = ['#4f46e5', '#0ea5e9', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#64748b'];

@Component({
  selector: 'ff-project-dialog',
  imports: [ReactiveFormsModule, IconComponent, DateTimeFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="card w-[min(30rem,calc(100vw-1.5rem))] p-6 anim-pop shadow-modal" [formGroup]="form" (ngSubmit)="submit()" role="dialog" aria-labelledby="pj-title">
      <h2 id="pj-title" class="text-lg font-bold mb-4">{{ data ? 'Modifier le projet' : 'Nouveau projet' }}</h2>
      <div class="space-y-4">
        <div>
          <label class="field-label" for="pj-name">Nom</label>
          <input id="pj-name" class="input" formControlName="name" maxlength="120" cdkFocusInitial />
          @if (form.controls.name.touched && form.controls.name.invalid) { <p class="field-error">Le nom est obligatoire.</p> }
          @if (error()) { <p class="field-error">{{ error() }}</p> }
        </div>
        <div>
          <label class="field-label" for="pj-desc">Description</label>
          <textarea id="pj-desc" class="input" rows="2" formControlName="description"></textarea>
        </div>
        <div><label class="field-label" for="pj-icon">Icône</label><select id="pj-icon" class="input" formControlName="icon"><option value="folder">Dossier</option><option value="target">Objectif</option><option value="coffee">Personnel</option><option value="layers">Apprentissage</option></select></div>
        <fieldset>
          <legend class="field-label">Couleur</legend>
          <div class="flex flex-wrap gap-2" role="radiogroup">
            @for (c of colors; track c) {
              <label class="cursor-pointer has-[:focus-visible]:outline-2 outline-offset-2 rounded-full">
                <input type="radio" class="sr-only-text" formControlName="color" [value]="c" />
                <span class="grid place-items-center size-8 rounded-full border-2" [style.background]="c" [style.border-color]="form.value.color === c ? 'var(--fg)' : 'transparent'">
                  @if (form.value.color === c) { <ff-icon name="check" [size]="14" class="text-white" /> }
                </span>
                <span class="sr-only-text">{{ c }}</span>
              </label>
            }
          </div>
        </fieldset>
        <div>
          <label class="field-label" for="pj-due">Échéance (facultative)</label>
          <ff-datetime inputId="pj-due" formControlName="dueAt" />
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-6">
        <button type="button" class="btn btn-secondary" (click)="ref.close()">Annuler</button>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">{{ data ? 'Enregistrer' : 'Créer' }}</button>
      </div>
    </form>`,
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
    const body = { name: v.name.trim(), description: v.description, color: v.color, icon: v.icon, dueAt: v.dueAt };
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

@Component({
  selector: 'ff-projects-page',
  imports: [IconComponent, EmptyComponent, ErrorComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 class="page-title"><span class="page-icon"><ff-icon name="folder" [size]="24" /></span>Projets</h1>
        <p class="page-sub">Regroupez vos tâches par projet et suivez leur avancement.</p>
      </div>
      <div class="flex gap-2">
        <label class="flex items-center gap-2 text-sm text-muted"><input type="checkbox" class="size-4 accent-[var(--brand)]" [checked]="showArchived()" (change)="showArchived.set($any($event.target).checked)" />Afficher les archivés</label>
        <button type="button" class="btn btn-primary" (click)="edit(null)"><ff-icon name="plus" />Nouveau projet</button>
      </div>
    </header>

    <div class="flex flex-wrap gap-2 mb-4"><input class="input flex-1" type="search" aria-label="Rechercher un projet" placeholder="Rechercher un projet…" [value]="query()" (input)="query.set($any($event.target).value)" /><select class="input w-auto" aria-label="Trier les projets" [value]="sort()" (change)="sort.set($any($event.target).value)"><option value="name">Nom</option><option value="due">Échéance</option></select></div>
    @if (taskPreview.error()) { <ff-error (retry)="taskPreview.load()" /> }
    @if (loader.error()) { <ff-error (retry)="loader.load()" /> }
    @else if (loader.loading()) { <ff-skeleton [count]="3" [height]="120" /> }
    @else if (!visible().length) {
      <div class="card"><ff-empty icon="folder" title="Aucun projet" hint="Créez un projet pour regrouper des tâches liées."><button type="button" class="btn btn-primary btn-sm mt-2" (click)="edit(null)">Créer un projet</button></ff-empty></div>
    } @else {
      <div class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        @for (p of visible(); track p.id) {
          <article class="card p-5 flex flex-col gap-3" [class.opacity-70]="p.archived" [style.border-top-color]="p.color">
            <div class="flex items-start gap-3">
              <span class="size-10 rounded-xl grid place-items-center text-white flex-none" [style.background]="p.color"><ff-icon [name]="p.icon || 'folder'" /></span>
              <div class="min-w-0 flex-1">
                <h2 class="font-bold truncate">{{ p.name }}</h2>
                @if (p.description) { <p class="text-sm text-muted line-clamp-2">{{ p.description }}</p> }
              </div>
              @if (p.archived) { <span class="badge badge-todo">Archivé</span> }
            </div>
            <div>
              <div class="flex justify-between text-xs text-muted mb-1"><span>{{ p.doneTasks }}/{{ p.totalTasks }} terminées</span><span class="tabular-nums">{{ pct(p) }}%</span></div>
              <div class="h-2 rounded-full bg-surface-3 overflow-hidden" role="progressbar" [attr.aria-label]="'Avancement de ' + p.name" [attr.aria-valuenow]="pct(p)" aria-valuemin="0" aria-valuemax="100">
                <div class="h-full transition-all" [style.width.%]="pct(p)" [style.background]="p.color"></div>
              </div>
            </div>
            <div class="project-preview">@for (t of previewTasks(p.id); track t.id) { <button type="button" (click)="actions.openDetail(t.id)">□ {{ t.title }}</button> }</div>
            <p class="text-sm text-muted">{{ settings.fmt(p.dueAt) || 'Sans échéance' }}</p>
            <div class="flex flex-wrap gap-1 mt-auto">
              <button type="button" class="btn btn-secondary btn-sm" (click)="actions.create({ projectId: p.id })"><ff-icon name="plus" [size]="14" />Tâche</button>
              <button type="button" class="btn btn-ghost btn-sm" (click)="edit(p)"><ff-icon name="pencil" [size]="14" />Modifier</button>
              <button type="button" class="btn btn-ghost btn-sm" (click)="toggleArchive(p)"><ff-icon name="archive" [size]="14" />{{ p.archived ? 'Restaurer' : 'Archiver' }}</button>
              <button type="button" class="btn btn-ghost btn-sm text-danger" (click)="remove(p)" [attr.aria-label]="'Supprimer ' + p.name"><ff-icon name="trash" [size]="14" /></button>
            </div>
          </article>
        }
        <button type="button" class="card p-6 flex flex-col items-center justify-center gap-3 border-dashed min-h-64" (click)="edit(null)"><ff-icon name="plus" [size]="32" /><strong>Un nouveau projet ?</strong><span class="text-sm text-muted">Donne une place à ta prochaine idée.</span></button>
      </div>
    }
  `,
})
export class ProjectsPage {
  protected readonly settings = inject(SettingsStore);
  protected readonly query = signal('');
  protected readonly sort = signal('name');
  protected readonly actions = inject(TaskActions);
  private readonly api = inject(ProjectsApi);
  private readonly dialog = inject(Dialog);
  private readonly refresh = inject(RefreshService);
  private readonly toast = inject(ToastService);

  protected readonly showArchived = signal(false);
  protected readonly loader = new Loader(() => this.api.list());
  private readonly tasksApi = inject(TasksApi);
  protected readonly taskPreview = new Loader(() => this.tasksApi.priorities('PRIORITIES'));
  protected previewTasks(projectId: string) {return (this.taskPreview.data() ?? []).filter(t => t.project?.id === projectId).slice(0,2); }

  protected visible(): Project[] {
    return (this.loader.data() ?? []).filter((p) => (this.showArchived() || !p.archived) && p.name.toLowerCase().includes(this.query().toLowerCase())).sort((a,b) => this.sort() === 'due' ? (a.dueAt || 'z').localeCompare(b.dueAt || 'z') : a.name.localeCompare(b.name));
  }

  protected pct(p: Project): number {
    return p.totalTasks ? Math.round((p.doneTasks / p.totalTasks) * 100) : 0;
  }

  protected async edit(p: Project | null): Promise<void> {
    const saved = await firstValueFrom(this.dialog.open<boolean>(ProjectDialogComponent, { data: p, backdropClass: 'ff-backdrop' }).closed);
    if (saved) {
      this.toast.success(p ? 'Projet mis à jour.' : 'Projet créé.');
      this.refresh.bump();
    }
  }

  protected async toggleArchive(p: Project): Promise<void> {
    try {
      await firstValueFrom(this.api.update(p.id, { archived: !p.archived }));
      this.toast.success(p.archived ? 'Projet restauré.' : 'Projet archivé — ses tâches sont conservées.');
      this.refresh.bump();
    } catch (e) {
      if (e instanceof AppError) this.toast.error(e.problem.detail);
    }
  }

  protected async remove(p: Project): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog.open<boolean>(ConfirmDialogComponent, {
        data: { title: 'Supprimer ce projet ?', message: `« ${p.name} » sera supprimé. Ses tâches sont conservées, sans projet.`, confirmLabel: 'Supprimer', danger: true },
        backdropClass: 'ff-backdrop',
      }).closed,
    );
    if (!ok) return;
    await firstValueFrom(this.api.delete(p.id));
    this.toast.success('Projet supprimé.');
    this.refresh.bump();
  }
}
