import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, firstValueFrom } from 'rxjs';
import { AppError } from '../../../../core/api/app-error';
import { amountInput, formatMoney, parseAmount } from '../../../../core/util/money';
import { HelpTipComponent } from '../../../../shared/ui/help-tip/help-tip';
import { IconComponent } from '../../../../shared/ui/icon/icon';

export interface ActualDialogValue {
  amount: number | null;
  date: string | null;
  comment: string | null;
}

export interface ActualDialogData {
  title: string;
  /** Phrase sous le titre (prevu, plafond…). */
  message?: string;
  /** Bulle d'aide a cote du titre. */
  help?: { label: string; text: string };
  /** Champ montant ; absent : pas de montant (commentaire seul). */
  amount?: number | null;
  amountLabel?: string;
  allowZero?: boolean;
  /** Champ date (AAAA-MM-JJ) ; absent : pas de date. */
  date?: string;
  dateLabel?: string;
  /** Date maximale (aujourd'hui pour un reel : une operation realisee n'est pas datee dans le futur). */
  maxDate?: string;
  /** Champ commentaire ; absent : pas de commentaire. */
  comment?: string | null;
  commentLabel?: string;
  commentPlaceholder?: string;
  /** Commentaire obligatoire. */
  commentRequired?: boolean;
  /** Commentaire obligatoire quand le montant depasse ce plafond (depense variable). */
  commentRequiredAbove?: number | null;
  hint?: string;
  confirmLabel: string;
  /** Enregistrement : une erreur du serveur s'affiche dans le dialogue, qui reste ouvert. */
  save: (value: ActualDialogValue) => Observable<unknown>;
}

/**
 * Saisie d'un reel (montant, date, commentaire) ou d'un commentaire seul, depuis la feuille du mois. Le dialogue
 * enregistre lui-meme et se ferme avec `true` en cas de succes.
 */
@Component({
  selector: 'ff-actual-dialog',
  imports: [FormsModule, HelpTipComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './actual-dialog.html',
})
export class ActualDialogComponent {
  protected readonly data = inject<ActualDialogData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly hasAmount = this.data.amount !== undefined;
  protected readonly hasDate = this.data.date !== undefined;
  protected readonly hasComment = this.data.comment !== undefined;
  protected readonly amount = signal(amountInput(this.data.amount));
  protected readonly date = signal(this.data.date ?? '');
  protected readonly comment = signal(this.data.comment ?? '');
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly money = formatMoney;

  /** Montant saisi au-dessus du plafond : le commentaire devient obligatoire. */
  protected readonly overCap = computed(() => {
    const cap = this.data.commentRequiredAbove;
    if (cap === null || cap === undefined) return false;
    const value = parseAmount(this.amount());
    return value !== null && value > cap;
  });
  protected readonly commentRequired = computed(() => !!this.data.commentRequired || this.overCap());

  protected async submit(): Promise<void> {
    let amount: number | null = null;
    if (this.hasAmount) {
      amount = parseAmount(this.amount());
      if (amount === null || amount < 0 || (amount === 0 && !this.data.allowZero)) {
        this.error.set('Saisissez un montant valide, au centime près (ex. 12,50).');
        return;
      }
    }
    if (this.hasDate) {
      if (!this.date()) {
        this.error.set('La date est obligatoire.');
        return;
      }
      if (this.data.maxDate && this.date() > this.data.maxDate) {
        this.error.set('Une opération réalisée ne peut pas être datée dans le futur.');
        return;
      }
    }
    const comment = this.comment().trim() || null;
    if (this.hasComment && this.commentRequired() && !comment) {
      this.error.set(
        this.overCap()
          ? `Le plafond (${formatMoney(this.data.commentRequiredAbove)}) est dépassé : expliquez pourquoi dans le commentaire.`
          : 'Le commentaire est obligatoire.',
      );
      return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(
        this.data.save({
          amount,
          date: this.hasDate ? this.date() : null,
          comment: this.hasComment ? comment : null,
        }),
      );
      this.ref.close(true);
    } catch (e) {
      this.error.set(e instanceof AppError ? e.problem.detail : 'Erreur inattendue.');
    } finally {
      this.saving.set(false);
    }
  }
}
