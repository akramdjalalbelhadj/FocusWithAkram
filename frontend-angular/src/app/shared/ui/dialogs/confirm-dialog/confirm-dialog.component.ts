import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { ConfirmData } from './confirm-data';
import { IconComponent } from '../../icon/icon';

@Component({
  selector: 'ff-confirm-dialog',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.html',
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean | 'alt'>>(DialogRef);
}
