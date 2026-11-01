import { Dialog } from '@angular/cdk/dialog';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { FinanceApi } from '../../../core/api/finance.api';
import {
  FinanceAccount,
  FinanceCategory,
  FinancePreferences,
  Goal,
  Loan,
  LoanDirection,
  Operation,
  OperationBody,
  Schedule,
  ScheduleKind,
} from '../../../core/api/models';
import { RefreshService } from '../../../core/services/refresh.service';
import { SettingsStore } from '../../../core/services/settings.store';
import { ToastService } from '../../../core/services/toast.service';
import { formatMoney } from '../../../core/util/money';
import { ConfirmData, ConfirmDialogComponent } from '../../../shared/ui/dialogs';
import { AccountDialogComponent } from '../components/account-dialog/account-dialog';
import { BudgetDialogComponent, BudgetDialogData } from '../components/budget-dialog/budget-dialog';
import { DateDialogComponent, DateDialogData } from '../components/date-dialog/date-dialog';
import { GoalDialogComponent } from '../components/goal-dialog/goal-dialog';
import { LoanDialogComponent } from '../components/loan-dialog/loan-dialog';
import { RepaymentDialogComponent } from '../components/repayment-dialog/repayment-dialog';
import { PurchaseDialogComponent } from '../components/purchase-dialog/purchase-dialog';
import { ScheduleDialogComponent } from '../components/schedule-dialog/schedule-dialog';
import {
  AmountDialogComponent,
  AmountDialogData,
  AmountDialogResult,
} from '../components/amount-dialog/amount-dialog';
import {
  CategoryDialogComponent,
  CategoryDialogData,
} from '../components/category-dialog/category-dialog';
import {
  OperationDialogComponent,
  OperationDialogData,
} from '../components/operation-dialog/operation-dialog';

/** Actions du module « Mes achats » : dialogues, appels serveur, message de retour et rafraichissement. */
@Injectable({ providedIn: 'root' })
export class FinanceActions {
  private readonly dialog = inject(Dialog);
  private readonly api = inject(FinanceApi);
  private readonly toast = inject(ToastService);
  private readonly refresh = inject(RefreshService);
  private readonly settings = inject(SettingsStore);

  /** Saisie rapide : une depense payee aujourd'hui, sur le compte par defaut. */
  quickExpense(): Promise<boolean> {
    return this.newOperation({ type: 'EXPENSE', status: 'COMPLETED' });
  }

  async newOperation(preset?: Partial<OperationBody>): Promise<boolean> {
    return this.openOperation({ preset }, 'Opération enregistrée.');
  }

  editOperation(operation: Operation): Promise<boolean> {
    return this.openOperation({ operation }, 'Opération modifiée.');
  }

  /** Remboursement (retour produit, geste commercial) d'une depense : meme categorie, rattache a l'achat. */
  refundOf(expense: Operation): Promise<boolean> {
    return this.newOperation({
      type: 'PURCHASE_REFUND',
      status: 'COMPLETED',
      accountId: expense.account.id,
      categoryId: expense.category?.id,
      label: `Remboursement — ${expense.label}`,
      refundOfId: expense.id ?? undefined,
    });
  }

  /** Realise une operation prevue avec le montant et la date reels (le montant prevu reste visible). */
  async complete(op: Operation): Promise<boolean> {
    const verb = op.type === 'INCOME' ? 'reçu' : 'payé';
    const result = await this.askAmount({
      title: op.type === 'INCOME' ? 'Marquer comme reçu' : 'Marquer comme payé',
      message: `${op.label} — prévu ${formatMoney(op.amount)}. Indiquez le montant réellement ${verb}.`,
      amountLabel: `Montant ${verb}`,
      amount: op.amount,
      date: this.settings.today() < op.date ? this.settings.today() : op.date,
      maxDate: this.settings.today(),
      confirmLabel: 'Valider',
    });
    if (!result?.date) return false;
    const date = result.date;
    if (op.scheduleId && op.dueDate) {
      const scheduleId = op.scheduleId;
      const due = op.dueDate;
      return this.run(
        () => this.api.completeOccurrence(scheduleId, due, result.amount, date),
        'Échéance réalisée.',
      );
    }
    const id = op.id;
    return !!id && this.run(() => this.api.complete(id, result.amount, date), 'Opération réalisée.');
  }

  /** Saute une échéance (mois sans salaire, abonnement non renouvelé) : elle n'est plus attendue. */
  async skip(op: Operation): Promise<boolean> {
    if (!op.scheduleId || !op.dueDate) return false;
    const scheduleId = op.scheduleId;
    const due = op.dueDate;
    const ok = await this.confirm({
      title: 'Sauter cette échéance ?',
      message: `« ${op.label} » du ${due.split('-').reverse().join('/')} ne sera plus attendue. L’échéancier continue pour les suivantes.`,
      confirmLabel: 'Sauter',
    });
    return ok && this.run(() => this.api.skipOccurrence(scheduleId, due), 'Échéance sautée.');
  }

  /** Ajuste le montant ou la date d'une seule échéance, sans modifier l'échéancier. */
  async adjust(op: Operation): Promise<boolean> {
    if (!op.scheduleId || !op.dueDate) return false;
    const scheduleId = op.scheduleId;
    const due = op.dueDate;
    const result = await this.askAmount({
      title: 'Ajuster cette échéance',
      message: `${op.label} : montant et date prévus pour cette fois seulement.`,
      amountLabel: 'Montant prévu',
      amount: op.amount,
      date: op.date,
      confirmLabel: 'Ajuster',
    });
    if (!result?.date) return false;
    const date = result.date;
    return this.run(
      () => this.api.adjustOccurrence(scheduleId, due, result.amount, date),
      'Échéance ajustée.',
    );
  }

  async cancel(op: Operation): Promise<boolean> {
    const id = op.id;
    if (!id) return false;
    const ok = await this.confirm({
      title: 'Annuler l’opération ?',
      message: `« ${op.label} » restera dans l’historique, sans effet sur les soldes ni les budgets.`,
      confirmLabel: 'Annuler l’opération',
    });
    return ok && this.run(() => this.api.cancel(id), 'Opération annulée.');
  }

  async delete(op: Operation): Promise<boolean> {
    const id = op.id;
    if (!id) return false;
    const ok = await this.confirm({
      title: 'Supprimer l’opération ?',
      message: `« ${op.label} » (${formatMoney(op.amount)}) sera définitivement effacée. Pour une opération qui n’a pas eu lieu, préférez « Annuler », qui la conserve dans l’historique.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    return ok && this.run(() => this.api.deleteOperation(id), 'Opération supprimée.');
  }

  async editAccount(account: FinanceAccount | null): Promise<boolean> {
    const ok = await firstValueFrom(
      this.dialog.open<boolean>(AccountDialogComponent, {
        data: account,
        backdropClass: 'ff-backdrop',
      }).closed,
    );
    if (ok) this.done(account ? 'Compte modifié.' : 'Compte créé.');
    return !!ok;
  }

  /** Correction tracee : l'ecart entre le solde calcule et le solde constate devient une operation. */
  async reconcile(account: FinanceAccount): Promise<boolean> {
    const result = await this.askAmount({
      title: 'Corriger le solde',
      message: `Solde calculé : ${formatMoney(account.balance)}. Saisissez le solde réellement constaté : l’écart sera enregistré comme une correction visible dans l’historique.`,
      amountLabel: 'Solde constaté',
      amount: account.balance,
      allowNegative: true,
      withNote: true,
      confirmLabel: 'Corriger',
    });
    if (!result) return false;
    return this.run(
      () => this.api.reconcile(account.id, result.amount, result.note),
      'Solde corrigé.',
    );
  }

  async toggleArchiveAccount(account: FinanceAccount): Promise<boolean> {
    return this.run(
      () =>
        this.api.updateAccount(account.id, {
          name: account.name,
          type: account.type,
          archived: !account.archived,
          position: account.position,
        }),
      account.archived ? 'Compte réactivé.' : 'Compte archivé.',
    );
  }

  async deleteAccount(account: FinanceAccount): Promise<boolean> {
    const ok = await this.confirm({
      title: 'Supprimer le compte ?',
      message: `« ${account.name} » n’a aucune opération : il sera définitivement supprimé.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    return ok && this.run(() => this.api.deleteAccount(account.id), 'Compte supprimé.');
  }

  async editCategory(data: CategoryDialogData): Promise<boolean> {
    const ok = await firstValueFrom(
      this.dialog.open<boolean>(CategoryDialogComponent, { data, backdropClass: 'ff-backdrop' })
        .closed,
    );
    if (ok) this.done(data.category ? 'Catégorie modifiée.' : 'Catégorie créée.');
    return !!ok;
  }

  async toggleArchiveCategory(category: FinanceCategory): Promise<boolean> {
    return this.run(
      () =>
        this.api.updateCategory(category.id, {
          name: category.name,
          parentId: category.parentId,
          icon: category.icon,
          color: category.color,
          position: category.position,
          archived: !category.archived,
        }),
      category.archived ? 'Catégorie réactivée.' : 'Catégorie archivée.',
    );
  }

  async deleteCategory(category: FinanceCategory): Promise<boolean> {
    const ok = await this.confirm({
      title: 'Supprimer la catégorie ?',
      message: `« ${category.name} » n’est utilisée par aucune opération : elle sera définitivement supprimée.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    return ok && this.run(() => this.api.deleteCategory(category.id), 'Catégorie supprimée.');
  }

  async editSchedule(schedule: Schedule | null, kind?: ScheduleKind): Promise<boolean> {
    const ok = await firstValueFrom(
      this.dialog.open<boolean>(ScheduleDialogComponent, {
        data: { schedule, kind },
        backdropClass: 'ff-backdrop',
      }).closed,
    );
    if (ok) this.done(schedule ? 'Échéancier modifié.' : 'Échéancier créé.');
    return !!ok;
  }

  async scheduleAction(schedule: Schedule, action: 'pause' | 'resume' | 'end'): Promise<boolean> {
    if (action === 'end') {
      const ok = await this.confirm({
        title: 'Résilier l’échéancier ?',
        message: `« ${schedule.label} » ne produira plus d’échéance après aujourd’hui. Son historique est conservé.`,
        confirmLabel: 'Résilier',
        danger: true,
      });
      if (!ok) return false;
    }
    const messages = { pause: 'Échéancier suspendu.', resume: 'Échéancier repris.', end: 'Échéancier résilié.' };
    return this.run(() => this.api.scheduleAction(schedule.id, action), messages[action]);
  }

  async deleteSchedule(schedule: Schedule): Promise<boolean> {
    const ok = await this.confirm({
      title: 'Supprimer l’échéancier ?',
      message: `« ${schedule.label} » n’a aucune échéance enregistrée : il sera définitivement supprimé.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    return ok && this.run(() => this.api.deleteSchedule(schedule.id), 'Échéancier supprimé.');
  }

  async editBudget(data: BudgetDialogData): Promise<boolean> {
    const ok = await firstValueFrom(
      this.dialog.open<boolean>(BudgetDialogComponent, { data, backdropClass: 'ff-backdrop' }).closed,
    );
    if (ok) this.done('Budget enregistré.');
    return !!ok;
  }

  savePreferences(body: FinancePreferences): Promise<boolean> {
    return this.run(() => this.api.updatePreferences(body), 'Préférences enregistrées.');
  }

  // ---- Achats prévus ----

  async editGoal(goal: Goal | null, quadrant?: { important: boolean; urgent: boolean }): Promise<boolean> {
    const ok = await firstValueFrom(
      this.dialog.open<boolean>(GoalDialogComponent, {
        data: { goal, ...quadrant },
        backdropClass: 'ff-backdrop',
      }).closed,
    );
    if (ok) this.done(goal ? 'Achat prévu modifié.' : 'Achat prévu ajouté.');
    return !!ok;
  }

  /** Réserve une part du disponible libre pour l'objectif (0 pour libérer la réservation). */
  async reserveGoal(goal: Goal): Promise<boolean> {
    const result = await this.askAmount({
      title: 'Réserver pour cet achat',
      message: `${goal.name} — ${formatMoney(goal.estimatedPrice)}. L’argent réservé reste sur vos comptes mais n’est plus compté comme libre pour les autres achats. Saisissez 0 pour libérer la réservation.`,
      amountLabel: 'Montant réservé au total',
      amount: goal.reservedAmount,
      confirmLabel: 'Réserver',
      allowZero: true,
    });
    if (!result) return false;
    return this.run(() => this.api.reserveGoal(goal.id, result.amount), 'Réservation enregistrée.');
  }

  async purchaseGoal(goal: Goal): Promise<boolean> {
    const ok = await firstValueFrom(
      this.dialog.open<boolean>(PurchaseDialogComponent, { data: goal, backdropClass: 'ff-backdrop' }).closed,
    );
    if (ok) this.done('Achat enregistré.');
    return !!ok;
  }

  async postponeGoal(goal: Goal, suggested?: string | null): Promise<boolean> {
    const data: DateDialogData = {
      title: 'Reporter l’achat',
      message: `${goal.name} : nouvelle date cible. La réservation éventuelle est conservée.`,
      label: 'Nouvelle date cible',
      date: suggested ?? goal.targetDate,
      min: this.settings.today(),
      confirmLabel: 'Reporter',
    };
    const date = await firstValueFrom(
      this.dialog.open<string>(DateDialogComponent, { data, backdropClass: 'ff-backdrop' }).closed,
    );
    if (!date) return false;
    return this.run(() => this.api.postponeGoal(goal.id, date), 'Achat reporté.');
  }

  async abandonGoal(goal: Goal): Promise<boolean> {
    const ok = await this.confirm({
      title: 'Abandonner cet achat ?',
      message: `« ${goal.name} » reste dans l’historique ; sa réservation de ${formatMoney(goal.reservedAmount)} est libérée.`,
      confirmLabel: 'Abandonner',
    });
    return ok && this.run(() => this.api.goalAction(goal.id, 'abandon'), 'Achat abandonné.');
  }

  reopenGoal(goal: Goal): Promise<boolean> {
    return this.run(() => this.api.goalAction(goal.id, 'reopen'), 'Achat de nouveau envisagé.');
  }

  async deleteGoal(goal: Goal): Promise<boolean> {
    const ok = await this.confirm({
      title: 'Supprimer cet achat prévu ?',
      message: `« ${goal.name} » sera définitivement supprimé. Pour garder une trace, préférez « Abandonner ».`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    return ok && this.run(() => this.api.deleteGoal(goal.id), 'Achat prévu supprimé.');
  }

  /** Déplacement dans la matrice : sans message, la carte change simplement de quadrant. */
  async moveGoal(goal: Goal, important: boolean, urgent: boolean, position: number): Promise<boolean> {
    try {
      await firstValueFrom(this.api.moveGoal(goal.id, important, urgent, position));
      this.refresh.bump();
      return true;
    } catch (e) {
      this.toast.errorFrom(e);
      this.refresh.bump();
      return false;
    }
  }

  // ---- Prêts et emprunts ----

  async editLoan(loan: Loan | null, direction?: LoanDirection): Promise<boolean> {
    const ok = await firstValueFrom(
      this.dialog.open<boolean>(LoanDialogComponent, {
        data: { loan, direction },
        backdropClass: 'ff-backdrop',
      }).closed,
    );
    if (ok) this.done(loan ? 'Prêt modifié.' : 'Prêt enregistré.');
    return !!ok;
  }

  async repayLoan(loan: Loan): Promise<boolean> {
    const ok = await firstValueFrom(
      this.dialog.open<boolean>(RepaymentDialogComponent, { data: loan, backdropClass: 'ff-backdrop' })
        .closed,
    );
    if (ok) this.done('Remboursement enregistré.');
    return !!ok;
  }

  /** Abandon explicite du reste dû : aucun mouvement d'argent, le prêt est clos. */
  async writeOffLoan(loan: Loan): Promise<boolean> {
    const result = await this.askAmount({
      title: loan.direction === 'LENT' ? 'Abandonner le reste dû ?' : 'Dette remise ?',
      message: `${loan.person} : ${formatMoney(loan.remaining)} ne ${loan.direction === 'LENT' ? 'vous seront' : 'seront'} plus ${loan.direction === 'LENT' ? 'remboursés' : 'à rembourser'}. Aucun argent ne bouge ; le prêt est clos et reste dans l’historique.`,
      amountLabel: 'Montant régularisé',
      amount: loan.remaining,
      readonlyAmount: true,
      withNote: true,
      confirmLabel: 'Régulariser',
    });
    if (!result) return false;
    return this.run(() => this.api.writeOffLoan(loan.id, result.note), 'Prêt régularisé.');
  }

  async cancelLoan(loan: Loan): Promise<boolean> {
    const ok = await this.confirm({
      title: 'Annuler ce prêt ?',
      message: `Pour un prêt saisi par erreur : le prêt de ${formatMoney(loan.principal)} (${loan.person}) et ses remboursements sont annulés et n’ont plus d’effet sur les soldes.`,
      confirmLabel: 'Annuler le prêt',
      danger: true,
    });
    return ok && this.run(() => this.api.cancelLoan(loan.id), 'Prêt annulé.');
  }

  private async openOperation(data: OperationDialogData, success: string): Promise<boolean> {
    const ok = await firstValueFrom(
      this.dialog.open<boolean>(OperationDialogComponent, { data, backdropClass: 'ff-backdrop' })
        .closed,
    );
    if (ok) this.done(success);
    return !!ok;
  }

  private async askAmount(data: AmountDialogData): Promise<AmountDialogResult | undefined> {
    return firstValueFrom(
      this.dialog.open<AmountDialogResult>(AmountDialogComponent, {
        data,
        backdropClass: 'ff-backdrop',
      }).closed,
    );
  }

  private async confirm(data: ConfirmData): Promise<boolean> {
    return !!(await firstValueFrom(
      this.dialog.open<boolean>(ConfirmDialogComponent, { data, backdropClass: 'ff-backdrop' })
        .closed,
    ));
  }

  private done(message: string): void {
    this.toast.success(message);
    this.refresh.bump();
  }

  private async run(call: () => Observable<unknown>, success: string): Promise<boolean> {
    try {
      await firstValueFrom(call());
      this.done(success);
      return true;
    } catch (e) {
      this.toast.errorFrom(e);
      return false;
    }
  }
}
