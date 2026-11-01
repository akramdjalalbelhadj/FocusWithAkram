import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface DateDialogData {
  title: string;
  message: string;
  label: string;
  date: string;
  min?: string;
  confirmLabel: string;
}

/** Choix d'une date (report d'un achat). */
@Component({
  selector: 'ff-date-dialog',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './date-dialog.html',
})
export class DateDialogComponent {
  protected readonly data = inject<DateDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<string>>(DialogRef);
  protected readonly date = signal(this.data.date);
}
