import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Task } from '../../../../core/api/models';
import { IconComponent } from '../../../../shared/ui/icon/icon';

export interface Top3Data {
  tasks: Task[];
  selected: string[];
}

/** Choix des (au plus) trois objectifs prioritaires du jour. */
@Component({
  selector: 'ff-top3-picker',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './top3-picker.dialog.html',
})
export class Top3PickerDialogComponent {
  protected readonly data = inject<Top3Data>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<string[]>>(DialogRef);
  protected readonly selected = signal<string[]>([...this.data.selected]);
  protected readonly count = computed(() => this.selected().length);

  protected toggle(id: string): void {
    this.selected.update((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length < 3 ? [...s, id] : s,
    );
  }
}
