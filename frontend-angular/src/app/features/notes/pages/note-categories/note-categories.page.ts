import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotesApi } from '../../../../core/api/notes.api';
import { Loader } from '../../../../core/util/loader';
import { IconComponent } from '../../../../shared/ui/icon/icon';
import {
  EmptyComponent,
  ErrorComponent,
  SkeletonComponent,
} from '../../../../shared/ui/states/index';
import { NoteActions } from '../../services/note-actions.service';

/** Ecran dedie aux categories d'idees : creer, renommer, colorer, supprimer. */
@Component({
  selector: 'ff-note-categories-page',
  imports: [IconComponent, EmptyComponent, ErrorComponent, SkeletonComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './note-categories.page.html',
})
export class NoteCategoriesPage {
  private readonly api = inject(NotesApi);
  protected readonly actions = inject(NoteActions);
  protected readonly loader = new Loader(() => this.api.categories());
  protected readonly categories = computed(() => this.loader.data() ?? []);
}
