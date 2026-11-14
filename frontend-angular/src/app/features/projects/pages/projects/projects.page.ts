import { Dialog } from '@angular/cdk/dialog';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TransferApi } from '../../../../core/api/misc.api';
import { Project, ProjectFolder } from '../../../../core/api/models';
import { ProjectFoldersApi, ProjectsApi, TasksApi } from '../../../../core/api/tasks.api';
import { RefreshService } from '../../../../core/services/refresh.service';
import { SettingsStore } from '../../../../core/services/settings.store';
import { ToastService } from '../../../../core/services/toast.service';
import { saveBlob } from '../../../../core/util/download';
import { Loader } from '../../../../core/util/loader';
import { ConfirmDialogComponent } from '../../../../shared/ui/dialogs/index';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import {
  EmptyComponent,
  ErrorComponent,
  SkeletonComponent,
} from '../../../../shared/ui/states/index';
import { TaskActions } from '../../../tasks/services/task-actions.service';
import { FolderDialogComponent } from '../../components/folder-dialog/folder-dialog.component';
import {
  ProjectDialogComponent,
  ProjectDialogData,
} from '../../components/project-dialog/project-dialog.component';
import {
  FolderFilter,
  exportFileName,
  folderOf,
  groupByFolder,
  importSummary,
  projectsOnly,
} from '../../util/project-folders';

/**
 * Dossiers ouverts dans la vue « Tous », memorises dans ce navigateur (simple confort, facultatif).
 * Par defaut tout est replie, y compris un dossier qui vient d'etre cree.
 */
const OPEN_KEY = 'ff.projects.openFolders';

function readOpened(): Set<string> {
  try {
    const raw = localStorage.getItem(OPEN_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

@Component({
  selector: 'ff-projects-page',
  imports: [
    IconComponent,
    EmptyComponent,
    ErrorComponent,
    SkeletonComponent,
    CdkMenu,
    CdkMenuItem,
    CdkMenuTrigger,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './projects.page.html',
})
export class ProjectsPage {
  protected readonly settings = inject(SettingsStore);
  protected readonly query = signal('');
  protected readonly sort = signal('name');
  protected readonly actions = inject(TaskActions);
  private readonly api = inject(ProjectsApi);
  private readonly foldersApi = inject(ProjectFoldersApi);
  private readonly transfer = inject(TransferApi);
  private readonly dialog = inject(Dialog);
  private readonly refresh = inject(RefreshService);
  private readonly toast = inject(ToastService);

  /** Faux : projets actifs ; vrai : projets inactifs (archives), toujours ranges dans leurs dossiers. */
  protected readonly inactive = signal(false);
  protected readonly folderFilter = signal<FolderFilter>('all');
  protected readonly opened = signal(readOpened());
  protected readonly busy = signal(false);
  protected readonly loader = new Loader(() => this.api.list());
  protected readonly folderLoader = new Loader(() => this.foldersApi.list());
  private readonly tasksApi = inject(TasksApi);
  protected readonly taskPreview = new Loader(() => this.tasksApi.priorities('PRIORITIES'));

  protected readonly folders = computed(() => this.folderLoader.data() ?? []);

  protected previewTasks(projectId: string) {
    return (this.taskPreview.data() ?? []).filter((t) => t.project?.id === projectId).slice(0, 2);
  }

  /** Projets de la vue courante (actifs ou inactifs) passant la recherche, tries. */
  protected visible(): Project[] {
    const q = this.query().toLowerCase();
    return this.inMode()
      .filter((p) => p.name.toLowerCase().includes(q))
      .sort((a, b) =>
        this.sort() === 'progress'
          ? this.pct(b) - this.pct(a) || a.name.localeCompare(b.name)
          : a.name.localeCompare(b.name),
      );
  }

  /** Projets actifs, ou inactifs, selon la vue choisie. */
  private inMode(): Project[] {
    return (this.loader.data() ?? []).filter((p) => p.archived === this.inactive());
  }

  protected inactiveCount(): number {
    return (this.loader.data() ?? []).filter((p) => p.archived).length;
  }

  /**
   * Sections affichees. Projets actifs sans recherche : les dossiers vides restent visibles pour pouvoir les
   * remplir. Projets inactifs : seulement les dossiers qui en contiennent.
   */
  protected sections() {
    return groupByFolder(
      this.visible(),
      this.folders(),
      this.folderFilter(),
      !this.query() && !this.inactive(),
    );
  }

  /** Nombre de projets de la vue courante pour un filtre de la barre des dossiers. */
  protected count(filter: FolderFilter): number {
    const all = this.inMode();
    if (filter === 'all') return all.length;
    return all.filter((p) => (folderOf(p, this.folders())?.id ?? 'none') === filter).length;
  }

  protected folderName(p: Project): string | null {
    return folderOf(p, this.folders())?.name ?? null;
  }

  /**
   * Une section est ouverte si on l'a ouverte dans la vue « Tous ». Un dossier choisi dans la barre, ou une
   * recherche en cours, montre directement les projets.
   */
  protected isOpen(key: string): boolean {
    return this.folderFilter() !== 'all' || !!this.query() || this.opened().has(key);
  }

  /** Le repli ne concerne que la vue « Tous » sans recherche. */
  protected canFold(): boolean {
    return this.folderFilter() === 'all' && !this.query();
  }

  protected toggleOpen(key: string): void {
    const next = new Set(this.opened());
    if (!next.delete(key)) next.add(key);
    this.opened.set(next);
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify([...next]));
    } catch {
      /* stockage indisponible : le repli vaut pour cette visite seulement */
    }
  }

  protected pct(p: Project): number {
    return p.totalTasks ? Math.round((p.doneTasks / p.totalTasks) * 100) : 0;
  }

  // ---- Projets -----------------------------------------------------------------------------

  /** Modifie un projet, ou en cree un (dans le dossier filtre ou celui de la section). */
  protected async edit(p: Project | null, folderId: string | null = null): Promise<void> {
    const filter = this.folderFilter();
    const data: ProjectDialogData =
      p ?? { folderId: folderId ?? (filter === 'all' || filter === 'none' ? null : filter) };
    const saved = await firstValueFrom(
      this.dialog.open<Project>(ProjectDialogComponent, { data, backdropClass: 'ff-backdrop' })
        .closed,
    );
    if (!saved) return;
    this.toast.success(p ? 'Projet mis à jour.' : 'Projet créé.');
    if (!p) {
      // Un nouveau projet est actif : on le montre, dans son dossier ouvert.
      this.inactive.set(false);
      this.reveal(saved.folderId ?? 'none');
    }
    this.refresh.bump();
  }

  private reveal(key: string): void {
    if (!this.opened().has(key)) this.toggleOpen(key);
  }

  protected async move(p: Project, folder: ProjectFolder | null): Promise<void> {
    if ((p.folderId ?? null) === (folder?.id ?? null)) return;
    try {
      await firstValueFrom(this.api.update(p.id, { folderId: folder?.id ?? null }));
      this.toast.success(
        folder ? `« ${p.name} » rangé dans ${folder.name}.` : `« ${p.name} » sorti de son dossier.`,
      );
      this.refresh.bump();
    } catch (e) {
      this.toast.errorFrom(e);
    }
  }

  protected async toggleArchive(p: Project): Promise<void> {
    try {
      await firstValueFrom(this.api.update(p.id, { archived: !p.archived }));
      this.toast.success(
        p.archived
          ? `« ${p.name} » est de nouveau actif.`
          : `« ${p.name} » est maintenant inactif — ses tâches sont conservées.`,
      );
      this.refresh.bump();
    } catch (e) {
      this.toast.errorFrom(e);
    }
  }

  protected async remove(p: Project): Promise<void> {
    const ok = await this.confirm({
      title: 'Supprimer ce projet ?',
      message: `« ${p.name} » sera supprimé. Ses tâches sont conservées, sans projet.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    await firstValueFrom(this.api.delete(p.id));
    this.toast.success('Projet supprimé.');
    this.refresh.bump();
  }

  // ---- Dossiers ----------------------------------------------------------------------------

  protected async editFolder(folder: ProjectFolder | null): Promise<void> {
    const saved = await firstValueFrom(
      this.dialog.open<ProjectFolder>(FolderDialogComponent, {
        data: folder,
        backdropClass: 'ff-backdrop',
      }).closed,
    );
    if (!saved) return;
    this.toast.success(folder ? 'Dossier modifié.' : `Dossier « ${saved.name} » créé.`);
    this.refresh.bump();
  }

  protected async removeFolder(folder: ProjectFolder): Promise<void> {
    const n = folder.projectCount;
    const ok = await this.confirm({
      title: 'Supprimer ce dossier ?',
      message: n
        ? `Le dossier « ${folder.name} » sera supprimé. Ses ${n} projet(s) et leurs tâches sont conservés, sans dossier.`
        : `Le dossier vide « ${folder.name} » sera supprimé.`,
      confirmLabel: 'Supprimer le dossier',
      danger: true,
    });
    if (!ok) return;
    try {
      await firstValueFrom(this.foldersApi.delete(folder.id));
      if (this.folderFilter() === folder.id) this.folderFilter.set('all');
      this.toast.success('Dossier supprimé — ses projets sont conservés.');
      this.refresh.bump();
    } catch (e) {
      this.toast.errorFrom(e);
    }
  }

  // ---- Export / import ---------------------------------------------------------------------

  protected async exportAll(withTasks: boolean): Promise<void> {
    await this.download({}, withTasks, 'tous');
  }

  protected async exportFolder(folder: ProjectFolder): Promise<void> {
    await this.download({ folderIds: [folder.id] }, true, folder.name);
  }

  protected async exportProject(p: Project): Promise<void> {
    await this.download({ ids: [p.id] }, true, p.name);
  }

  private async download(
    filter: { ids?: string[]; folderIds?: string[] },
    withTasks: boolean,
    target: string,
  ): Promise<void> {
    try {
      saveBlob(
        await firstValueFrom(this.transfer.exportProjects(filter, withTasks)),
        exportFileName(target, this.settings.today()),
      );
    } catch (e) {
      this.toast.errorFrom(e, 'L’export a échoué.');
    }
  }

  /** Verifie le fichier (import a blanc), montre ce qui sera cree, puis importe apres confirmation. */
  protected async importFile(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.busy.set(true);
    try {
      let body: Record<string, unknown>;
      try {
        body = projectsOnly(JSON.parse(await file.text()));
      } catch (e) {
        this.toast.error(e instanceof SyntaxError ? 'Fichier JSON invalide.' : (e as Error).message);
        return;
      }
      const preview = await firstValueFrom(this.transfer.importBackup(body, true));
      const ok = await this.confirm({
        title: `Importer « ${file.name} » ?`,
        message: importSummary(preview),
        confirmLabel: 'Importer',
      });
      if (!ok) return;
      const report = await firstValueFrom(this.transfer.importBackup(body, false));
      this.toast.success(`Import terminé. ${importSummary(report)}`);
      this.refresh.bump();
    } catch (e) {
      this.toast.errorFrom(e, 'L’import a échoué.');
    } finally {
      this.busy.set(false);
    }
  }

  private async confirm(data: {
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
  }): Promise<boolean> {
    return !!(await firstValueFrom(
      this.dialog.open<boolean>(ConfirmDialogComponent, { data, backdropClass: 'ff-backdrop' })
        .closed,
    ));
  }
}
