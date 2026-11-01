import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Project } from '../../../../core/api/models';
import { ProjectsApi, TasksApi } from '../../../../core/api/tasks.api';
import { AppError } from '../../../../core/interceptors/error.interceptor';
import { RefreshService } from '../../../../core/services/refresh.service';
import { SettingsStore } from '../../../../core/services/settings.store';
import { ToastService } from '../../../../core/services/toast.service';
import { Loader } from '../../../../core/util/loader';
import { ConfirmDialogComponent } from '../../../../shared/ui/dialogs/index';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import {
  EmptyComponent,
  ErrorComponent,
  SkeletonComponent,
} from '../../../../shared/ui/states/index';
import { TaskActions } from '../../../tasks/services/task-actions.service';
import { ProjectDialogComponent } from '../../components/project-dialog/project-dialog.component';

@Component({
  selector: 'ff-projects-page',
  imports: [IconComponent, EmptyComponent, ErrorComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './projects.page.html',
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
  protected previewTasks(projectId: string) {
    return (this.taskPreview.data() ?? []).filter((t) => t.project?.id === projectId).slice(0, 2);
  }

  protected visible(): Project[] {
    return (this.loader.data() ?? [])
      .filter(
        (p) =>
          (this.showArchived() || !p.archived) &&
          p.name.toLowerCase().includes(this.query().toLowerCase()),
      )
      .sort((a, b) =>
        this.sort() === 'due'
          ? (a.dueAt || 'z').localeCompare(b.dueAt || 'z')
          : a.name.localeCompare(b.name),
      );
  }

  protected pct(p: Project): number {
    return p.totalTasks ? Math.round((p.doneTasks / p.totalTasks) * 100) : 0;
  }

  protected async edit(p: Project | null): Promise<void> {
    const saved = await firstValueFrom(
      this.dialog.open<boolean>(ProjectDialogComponent, { data: p, backdropClass: 'ff-backdrop' })
        .closed,
    );
    if (saved) {
      this.toast.success(p ? 'Projet mis à jour.' : 'Projet créé.');
      this.refresh.bump();
    }
  }

  protected async toggleArchive(p: Project): Promise<void> {
    try {
      await firstValueFrom(this.api.update(p.id, { archived: !p.archived }));
      this.toast.success(
        p.archived ? 'Projet restauré.' : 'Projet archivé — ses tâches sont conservées.',
      );
      this.refresh.bump();
    } catch (e) {
      if (e instanceof AppError) this.toast.error(e.problem.detail);
    }
  }

  protected async remove(p: Project): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog.open<boolean>(ConfirmDialogComponent, {
        data: {
          title: 'Supprimer ce projet ?',
          message: `« ${p.name} » sera supprimé. Ses tâches sont conservées, sans projet.`,
          confirmLabel: 'Supprimer',
          danger: true,
        },
        backdropClass: 'ff-backdrop',
      }).closed,
    );
    if (!ok) return;
    await firstValueFrom(this.api.delete(p.id));
    this.toast.success('Projet supprimé.');
    this.refresh.bump();
  }
}
