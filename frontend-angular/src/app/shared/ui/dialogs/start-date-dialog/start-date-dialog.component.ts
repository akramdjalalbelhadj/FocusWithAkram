import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DateTimeFieldComponent } from '../../datetime-field/datetime-field';
import type { StartDateData } from './start-date-data';

@Component({
  selector: 'ff-start-date-dialog',
  imports: [DateTimeFieldComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './start-date-dialog.html',
})
export class StartDateDialogComponent {
  protected readonly data = inject<StartDateData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<string | null>>(DialogRef);
  protected readonly value = signal<string | null>(this.data.suggested);
}
