import { Dialog } from '@angular/cdk/dialog';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { FinanceApi } from '../../../core/api/finance.api';
import {
  Envelope,
  EnvelopeRow,
  FinanceAccount,
  FinanceCategory,
  FinancePreferences,
  Goal,
  Operation,
  OperationBody,
  Schedule,
  ScheduleKind,
  SheetRow,
} from '../../../core/api/models';
import { RefreshService } from '../../../core/services/refresh.service';
import { SettingsStore } from '../../../core/services/settings.store';
import { ToastService } from '../../../core/services/toast.service';
import { formatMoney } from '../../../core/util/money';
import { longDate } from '../../../core/util/time';
import { ConfirmData, ConfirmDialogComponent } from '../../../shared/ui/dialogs';
import { MONTH_HELP } from '../month-help';
import { actualDefaultDate, expenseDefaultDate, monthLabel } from '../month-utils';
import { AccountDialogComponent } from '../components/account-dialog/account-dialog';
import {
  ActualDialogComponent,
  ActualDialogData,
} from '../components/actual-dialog/actual-dialog';
import {
  AmountChangeDialogComponent,
  AmountChangeDialogData,
} from '../components/amount-change-dialog/amount-change-dialog';
import { EnvelopeDialogComponent } from '../components/envelope-dialog/envelope-dialog';
import { FixedChargeDialogComponent } from '../components/fixed-charge-dialog/fixed-charge-dialog';
import { BudgetDialogComponent, BudgetDialogData } from '../components/budget-dialog/budget-dialog';
import { DateDialogComponent, DateDialogData } from '../components/date-dialog/date-dialog';
import { GoalDialogComponent } from '../components/goal-dialog/goal-dialog';
import { IncomePlanDialogComponent } from '../components/income-plan-dialog/income-plan-dialog';
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
    if (ok) this.done('Objectif d’épargne enregistré.');
    return !!ok;
  }

  /** Objectif d'epargne du mois (AAAA-MM), depuis la feuille du mois. */
  async editSavingsTarget(month: string): Promise<boolean> {
    try {
      const budget = await firstValueFrom(this.api.budget(month));
      return this.editBudget({ month, monthTitle: monthLabel(month), budget });
    } catch (e) {
      this.toast.errorFrom(e);
      return false;
    }
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

  // ---- Revenu prévu ----

  /** Revenu attendu pour un mois, ou chaque mois sur une période (échéancier mensuel). */
  async planIncome(month?: string): Promise<boolean> {
    const message = await firstValueFrom(
      this.dialog.open<string>(IncomePlanDialogComponent, {
        data: { month: month ?? this.settings.today().slice(0, 7) },
        backdropClass: 'ff-backdrop',
      }).closed,
    );
    if (message) this.done(message);
    return !!message;
  }

  // ---- Feuille du mois : revenus et dépenses fixes ----

  /** Depense fixe (loyer, telephone, transport) : echeancier mensuel indispensable a partir d'un mois. */
  async newFixedCharge(month: string): Promise<boolean> {
    const message = await firstValueFrom(
      this.dialog.open<string>(FixedChargeDialogComponent, { data: { month }, backdropClass: 'ff-backdrop' })
        .closed,
    );
    if (message) this.done(message);
    return !!message;
  }

  /**
   * Saisit ou corrige le reel d'une ligne (montant, date, commentaire facultatif). Le prevu est conserve. Une
   * operation ponctuelle passe par les dialogues habituels.
   */
  async recordActual(row: SheetRow, income: boolean): Promise<boolean> {
    if (!row.scheduleId || !row.dueDate) {
      const op = await this.fetchOperation(row.operationId);
      if (!op) return false;
      return op.status === 'PLANNED' ? this.complete(op) : this.editOperation(op);
    }
    const scheduleId = row.scheduleId;
    const due = row.dueDate;
    const today = this.settings.today();
    const verb = income ? 'reçu' : 'payé';
    const ok = await this.openActual({
      title: row.status === 'DONE' ? `Modifier le montant ${verb}` : income ? 'Montant reçu' : 'Montant payé',
      message: `${row.label} — prévu ${formatMoney(row.planned)} le ${longDate(due)}.`,
      help: { label: 'Réel', text: MONTH_HELP.actual },
      amount: row.actual ?? row.planned,
      amountLabel: `Montant ${verb}`,
      date: actualDefaultDate(row.date, today),
      dateLabel: income ? 'Reçu le' : 'Payé le',
      maxDate: today,
      comment: row.comment,
      commentLabel: 'Commentaire',
      commentPlaceholder: income ? 'Ex. absence de deux jours, prime incluse…' : 'Ex. régularisation, hausse du tarif…',
      hint: 'Le montant prévu est conservé : l’écart s’affiche dans le tableau.',
      confirmLabel: 'Enregistrer',
      save: (v) => this.api.completeOccurrence(scheduleId, due, v.amount ?? 0, v.date ?? today, v.comment),
    });
    if (ok) this.done(income ? `Montant reçu enregistré : ${row.label}.` : `Paiement enregistré : ${row.label}.`);
    return ok;
  }

  /** « Ce mois seulement » : montant et date prevus pour ce mois, sans toucher aux autres mois. */
  async adjustThisMonth(row: SheetRow): Promise<boolean> {
    if (!row.scheduleId || !row.dueDate) return false;
    const scheduleId = row.scheduleId;
    const due = row.dueDate;
    const ok = await this.openActual({
      title: 'Ce mois seulement',
      help: { label: 'Ce mois seulement', text: MONTH_HELP.thisMonthOnly },
      message: `${row.label} : montant prévu pour ${monthLabel(due.slice(0, 7))} uniquement. Les autres mois ne changent pas.`,
      amount: row.planned,
      amountLabel: 'Montant prévu ce mois-ci',
      date: row.date,
      dateLabel: 'Date prévue',
      confirmLabel: 'Enregistrer',
      save: (v) => this.api.adjustOccurrence(scheduleId, due, v.amount ?? 0, v.date ?? row.date),
    });
    if (ok) this.done(`Montant de ${monthLabel(due.slice(0, 7))} modifié : ${row.label}.`);
    return ok;
  }

  /** « À partir de ce mois » : nouveau montant pour ce mois et les suivants ; les mois precedents ne changent pas. */
  async changeAmountFrom(row: SheetRow, month: string): Promise<boolean> {
    const schedule = await this.fetchSchedule(row.scheduleId);
    if (!schedule) return false;
    return this.openAmountChange({
      target: 'schedule',
      id: schedule.id,
      label: schedule.label,
      month,
      current: row.planned,
      versions: schedule.amounts ?? [],
      baseAmount: schedule.amount,
      minMonth: schedule.startDate.slice(0, 7),
    });
  }

  /** « Pas reçu / pas payé ce mois » : l'echeance du mois est sautee, les autres mois continuent. */
  async skipRow(row: SheetRow, income: boolean): Promise<boolean> {
    if (!row.scheduleId || !row.dueDate) return false;
    const scheduleId = row.scheduleId;
    const due = row.dueDate;
    const ok = await this.confirm({
      title: income ? 'Pas reçu ce mois-ci ?' : 'Pas payé ce mois-ci ?',
      message: `« ${row.label} » de ${monthLabel(due.slice(0, 7))} ne sera plus attendu et sort des totaux du mois. Les autres mois ne changent pas ; « Annuler la saisie » le rétablit.`,
      confirmLabel: income ? 'Pas reçu ce mois' : 'Pas payé ce mois',
    });
    return (
      ok &&
      this.run(
        () => this.api.skipOccurrence(scheduleId, due),
        `« ${row.label} » retiré de ${monthLabel(due.slice(0, 7))}.`,
      )
    );
  }

  /** Annule l'enregistrement de l'echeance (reel, saut ou ajustement) : la ligne redevient prevue. */
  async resetRow(row: SheetRow, income: boolean): Promise<boolean> {
    if (!row.scheduleId || !row.dueDate) return false;
    const scheduleId = row.scheduleId;
    const due = row.dueDate;
    const verb = income ? 'reçu' : 'payé';
    const message =
      row.status === 'DONE'
        ? `Le montant ${verb} (${formatMoney(row.actual)}) est effacé : « ${row.label} » redevient prévu pour ce mois.`
        : row.status === 'SKIPPED'
          ? `« ${row.label} » est de nouveau attendu ce mois-ci.`
          : `« ${row.label} » reprend son montant habituel ce mois-ci.`;
    const ok = await this.confirm({
      title: row.status === 'DONE' ? 'Annuler la saisie ?' : 'Revenir au montant prévu ?',
      message,
      confirmLabel: row.status === 'DONE' ? 'Annuler la saisie' : 'Rétablir',
    });
    return (
      ok &&
      this.run(() => this.api.resetOccurrence(scheduleId, due), `« ${row.label} » est de nouveau prévu ce mois-ci.`)
    );
  }

  /** Modifier ou arreter le revenu ou la depense fixe (echeancier complet). */
  async editRowSchedule(row: SheetRow): Promise<boolean> {
    const schedule = await this.fetchSchedule(row.scheduleId);
    return !!schedule && this.editSchedule(schedule);
  }

  /** Modifier une operation ponctuelle de la feuille. */
  async editRowOperation(row: SheetRow): Promise<boolean> {
    const op = await this.fetchOperation(row.operationId);
    return !!op && this.editOperation(op);
  }

  /** Supprimer une operation ponctuelle de la feuille. */
  async deleteRowOperation(row: SheetRow): Promise<boolean> {
    const op = await this.fetchOperation(row.operationId);
    return !!op && this.delete(op);
  }

  // ---- Feuille du mois : dépenses variables plafonnées ----

  async newEnvelope(month: string, takenCategoryIds: string[] = []): Promise<boolean> {
    const message = await firstValueFrom(
      this.dialog.open<string>(EnvelopeDialogComponent, {
        data: { month, takenCategoryIds },
        backdropClass: 'ff-backdrop',
      }).closed,
    );
    if (message) this.done(message);
    return !!message;
  }

  /** Une depense de la categorie, payee, datee dans le mois affiche. */
  addEnvelopeExpense(row: EnvelopeRow, month: string): Promise<boolean> {
    return this.newOperation({
      type: 'EXPENSE',
      status: 'COMPLETED',
      categoryId: row.category.id,
      date: expenseDefaultDate(month, this.settings.today()),
    });
  }

  /** Total depense du mois : une operation de total complete les depenses deja saisies. */
  async envelopeTotal(row: EnvelopeRow, month: string): Promise<boolean> {
    const ok = await this.openActual({
      title: 'Total du mois',
      message: `${row.label} — plafond de ${formatMoney(row.cap)} en ${monthLabel(month)}. Indiquez le total dépensé : les dépenses déjà saisies restent comptées, une opération de total complète la différence.`,
      amount: row.spent,
      amountLabel: 'Total dépensé ce mois-ci',
      allowZero: true,
      comment: row.comment,
      commentLabel: 'Commentaire',
      commentPlaceholder: 'Ex. invités, fêtes de fin d’année…',
      commentRequiredAbove: row.cap,
      confirmLabel: 'Enregistrer',
      save: (v) => this.api.envelopeActual(row.envelopeId, month, v.amount ?? 0, v.comment),
    });
    if (ok) this.done(`Total de ${monthLabel(month)} enregistré : ${row.label}.`);
    return ok;
  }

  /** Commentaire du mois ; obligatoire en cas de depassement (vide sinon : supprime). */
  async envelopeComment(row: EnvelopeRow, month: string): Promise<boolean> {
    const over = row.exceeded;
    const ok = await this.openActual({
      title: over ? 'Expliquer le dépassement' : 'Commentaire du mois',
      message: over
        ? `${row.label} : ${formatMoney(row.spent)} dépensés pour un plafond de ${formatMoney(row.cap)} en ${monthLabel(month)} (${formatMoney(-row.remaining)} de plus). Expliquez-le en quelques mots.`
        : `${row.label} — ${monthLabel(month)}.`,
      comment: row.comment,
      commentLabel: over ? 'Explication' : 'Commentaire',
      commentPlaceholder: over ? 'Ex. invités, courses de fêtes…' : '',
      commentRequired: over,
      confirmLabel: 'Enregistrer',
      save: (v) => this.api.envelopeComment(row.envelopeId, month, v.comment ?? ''),
    });
    if (ok) this.done('Commentaire enregistré.');
    return ok;
  }

  /** Nouveau plafond a partir d'un mois ; les mois precedents gardent le leur. */
  async changeEnvelopeCapFrom(row: EnvelopeRow, month: string): Promise<boolean> {
    const envelope = await this.fetchEnvelope(row.envelopeId);
    if (!envelope) return false;
    return this.openAmountChange({
      target: 'envelope',
      id: envelope.id,
      label: envelope.label,
      month,
      current: row.cap,
      versions: envelope.amounts ?? [],
      minMonth: envelope.startMonth,
    });
  }

  /** Plus de plafond apres le mois affiche ; les mois precedents et les depenses restent. */
  async stopEnvelope(row: EnvelopeRow, month: string): Promise<boolean> {
    const ok = await this.confirm({
      title: 'Arrêter cette dépense variable ?',
      message: `« ${row.label} » n’aura plus de plafond après ${monthLabel(month)}. Les mois précédents et les dépenses déjà saisies sont conservés.`,
      confirmLabel: 'Arrêter',
    });
    return (
      ok &&
      this.run(
        () => this.api.endEnvelope(row.envelopeId, month),
        `« ${row.label} » : plus de plafond après ${monthLabel(month)}.`,
      )
    );
  }

  async deleteEnvelope(row: EnvelopeRow): Promise<boolean> {
    const ok = await this.confirm({
      title: 'Supprimer cette dépense variable ?',
      message: `Le plafond « ${row.label} » disparaît de tous les mois. Les dépenses saisies restent dans l’historique. Pour ne plus la suivre à partir d’un mois, préférez « Arrêter après ce mois ».`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    return ok && this.run(() => this.api.deleteEnvelope(row.envelopeId), 'Dépense variable supprimée.');
  }

  private async openActual(data: ActualDialogData): Promise<boolean> {
    return !!(await firstValueFrom(
      this.dialog.open<boolean>(ActualDialogComponent, { data, backdropClass: 'ff-backdrop' }).closed,
    ));
  }

  private async openAmountChange(data: AmountChangeDialogData): Promise<boolean> {
    const message = await firstValueFrom(
      this.dialog.open<string>(AmountChangeDialogComponent, { data, backdropClass: 'ff-backdrop' }).closed,
    );
    if (message) this.done(message);
    return !!message;
  }

  private async fetchSchedule(id: string | null): Promise<Schedule | null> {
    if (!id) return null;
    return this.fetch(
      async () => (await firstValueFrom(this.api.schedules())).find((s) => s.id === id),
      'Échéancier introuvable : il a peut-être été supprimé.',
    );
  }

  private async fetchEnvelope(id: string): Promise<Envelope | null> {
    return this.fetch(
      async () => (await firstValueFrom(this.api.envelopes())).find((e) => e.id === id),
      'Dépense variable introuvable : elle a peut-être été supprimée.',
    );
  }

  private async fetchOperation(id: string | null): Promise<Operation | null> {
    if (!id) return null;
    return this.fetch(() => firstValueFrom(this.api.operation(id)), 'Opération introuvable.');
  }

  /** Relit un element avant de l'ouvrir dans un dialogue ; signale une absence ou une erreur. */
  private async fetch<T>(load: () => Promise<T | undefined>, missing: string): Promise<T | null> {
    try {
      const value = await load();
      if (value === undefined) {
        this.toast.error(missing);
        this.refresh.bump();
        return null;
      }
      return value;
    } catch (e) {
      this.toast.errorFrom(e);
      return null;
    }
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
