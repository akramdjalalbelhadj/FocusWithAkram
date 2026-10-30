import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DateTimeFieldComponent } from './datetime-field';
import { IconComponent } from './icon';

export interface ConfirmData {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

@Component({
  selector: 'ff-confirm-dialog',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card w-[min(28rem,calc(100vw-2rem))] p-6 anim-pop shadow-modal" role="alertdialog" aria-labelledby="cf-title" aria-describedby="cf-msg">
      <div class="flex gap-3">
        <span class="grid place-items-center size-10 rounded-xl flex-none"
          [class]="data.danger ? 'bg-danger-soft text-danger' : 'bg-brand-soft text-brand'"><ff-icon [name]="data.danger ? 'alert' : 'info'" /></span>
        <div>
          <h2 id="cf-title" class="text-lg font-bold">{{ data.title }}</h2>
          <p id="cf-msg" class="text-muted mt-1">{{ data.message }}</p>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-6">
        <button type="button" class="btn btn-secondary" (click)="ref.close(false)">Annuler</button>
        <button type="button" class="btn" [class]="data.danger ? 'btn-danger-solid' : 'btn-primary'" cdkFocusInitial (click)="ref.close(true)">
          {{ data.confirmLabel ?? 'Confirmer' }}
        </button>
      </div>
    </div>`,
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
}

export interface StartDateData {
  title: string;
  message: string;
  suggested: string | null;
  confirmLabel: string;
}

/**
 * Demande explicitement la date de debut reelle (tache terminee sans avoir ete demarree, ou correction
 * retroactive). Aucune valeur n'est inventee : il faut une date valide, anterieure a maintenant.
 */
@Component({
  selector: 'ff-start-date-dialog',
  imports: [DateTimeFieldComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card w-[min(28rem,calc(100vw-2rem))] p-6 anim-pop shadow-modal" role="dialog" aria-labelledby="sd-title">
      <h2 id="sd-title" class="text-lg font-bold">{{ data.title }}</h2>
      <p class="text-muted mt-1 mb-4">{{ data.message }}</p>
      <label class="field-label" for="sd-field">Début réel</label>
      <ff-datetime inputId="sd-field" [ngModel]="value()" (ngModelChange)="value.set($event)" />
      <p class="field-hint">Cette date est enregistrée telle quelle et n'est jamais remplacée par la date prévue.</p>
      <div class="flex justify-end gap-2 mt-6">
        <button type="button" class="btn btn-secondary" (click)="ref.close(null)">Annuler</button>
        <button type="button" class="btn btn-primary" [disabled]="!value()" (click)="ref.close(value())">{{ data.confirmLabel }}</button>
      </div>
    </div>`,
})
export class StartDateDialogComponent {
  protected readonly data = inject<StartDateData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<string | null>>(DialogRef);
  protected readonly value = signal<string | null>(this.data.suggested);
}
