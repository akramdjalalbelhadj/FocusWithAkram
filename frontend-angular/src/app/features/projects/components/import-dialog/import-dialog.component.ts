import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { TransferApi } from '../../../../core/api/misc.api';
import { ConflictMode, ImportReport } from '../../../../core/api/models';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { conflictDetail, conflictTitle, importLines } from '../../util/project-folders';

export interface ImportDialogData {
  fileName: string;
  /** Contenu du fichier, deja limite aux sections des projets. */
  body: Record<string, unknown>;
}

/**
 * Import de projets en deux temps : apercu sans ecriture (avec les conflits eventuels et le choix de leur
 * traitement), puis import reel. Se ferme avec le rapport de l'import, ou rien si l'utilisateur annule.
 */
@Component({
  selector: 'ff-import-dialog',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './import-dialog.html',
})
export class ImportDialogComponent {
  protected readonly data = inject<ImportDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<ImportReport>>(DialogRef);
  private readonly api = inject(TransferApi);

  /** Ignorer les dossiers en conflit est le choix sans risque, propose par defaut. */
  protected readonly mode = signal<ConflictMode>('SKIP');
  protected readonly preview = signal<ImportReport | null>(null);
  protected readonly loading = signal(true);
  protected readonly importing = signal(false);
  protected readonly error = signal('');
  protected readonly lines = importLines;
  protected readonly title = conflictTitle;
  protected readonly detail = conflictDetail;

  constructor() {
    void this.check();
  }

  protected async choose(mode: ConflictMode): Promise<void> {
    if (mode === this.mode()) return;
    this.mode.set(mode);
    await this.check();
  }

  /** Import a blanc avec le traitement choisi : rien n'est ecrit, le rapport dit ce qui se passera. */
  private async check(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.preview.set(await firstValueFrom(this.api.importBackup(this.data.body, true, this.mode())));
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'Le fichier n’a pas pu être vérifié.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async confirm(): Promise<void> {
    this.importing.set(true);
    this.error.set('');
    try {
      this.ref.close(await firstValueFrom(this.api.importBackup(this.data.body, false, this.mode())));
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'L’import a échoué.');
    } finally {
      this.importing.set(false);
    }
  }
}
