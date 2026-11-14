import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NoteArchiveReason, NoteSummary } from '../../../../core/api/models';
import { NotesApi } from '../../../../core/api/notes.api';
import { SettingsStore } from '../../../../core/services/settings.store';
import { debounced } from '../../../../core/util/debounced';
import { Loader } from '../../../../core/util/loader';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import { NoteActions } from '../../../notes/services/note-actions.service';

const REASON_LABEL: Record<NoteArchiveReason, string> = {
  CONVERTED: 'Transformée en tâche',
  ARCHIVED: 'Archivée',
  DELETED: 'Supprimée',
};

/**
 * Anciennes idees : transformees en tache, archivees a la main, ou supprimees et en attente d'effacement
 * definitif (72 heures, restaurables jusque-la).
 */
@Component({
  selector: 'ff-archived-notes',
  imports: [IconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './archived-notes.html',
})
export class ArchivedNotesComponent {
  private readonly api = inject(NotesApi);
  protected readonly actions = inject(NoteActions);
  protected readonly settings = inject(SettingsStore);

  protected readonly query = signal('');
  private readonly q = debounced(this.query);
  protected readonly limit = signal(50);
  protected readonly loader = new Loader(() =>
    this.api.list({ archived: true, q: this.q(), size: this.limit(), sort: 'updatedAt', dir: 'desc' }),
  );
  protected readonly notes = computed<NoteSummary[]>(() => this.loader.data()?.items ?? []);
  protected readonly total = computed(() => this.loader.data()?.totalItems ?? 0);

  protected label(n: NoteSummary): string {
    return n.archiveReason ? REASON_LABEL[n.archiveReason] : 'Archivée';
  }

  /** « dans 2 j 5 h », « dans 40 min » ou « imminente ». */
  protected remaining(iso: string): string {
    const ms = Date.parse(iso) - Date.now();
    if (ms <= 60_000) return 'imminente';
    const minutes = Math.round(ms / 60_000);
    if (minutes < 60) return `dans ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return hours < 24 ? `dans ${hours} h` : `dans ${Math.floor(hours / 24)} j ${hours % 24} h`;
  }
}
