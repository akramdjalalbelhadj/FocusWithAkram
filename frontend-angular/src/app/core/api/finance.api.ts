import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BudgetBody,
  BudgetView,
  CategoryBody,
  CreateAccountBody,
  FinanceAccount,
  FinanceCategory,
  FinanceOverview,
  FinancePreferences,
  Forecast,
  Goal,
  GoalBody,
  GoalFeasibility,
  Loan,
  LoanBody,
  Operation,
  OperationBody,
  OperationQuery,
  OperationType,
  Page,
  PurchaseBody,
  Schedule,
  ScheduleBody,
  UpdateAccountBody,
} from './models';

const BASE = '/api/v1/finance';

/** Client du module « Mes achats ». Les montants et totaux sont calculés par le serveur. */
@Injectable({ providedIn: 'root' })
export class FinanceApi {
  private readonly http = inject(HttpClient);

  overview(month?: string): Observable<FinanceOverview> {
    return this.http.get<FinanceOverview>(`${BASE}/overview`, {
      params: month ? { month } : {},
    });
  }

  accounts(): Observable<FinanceAccount[]> {
    return this.http.get<FinanceAccount[]>(`${BASE}/accounts`);
  }

  createAccount(body: CreateAccountBody): Observable<FinanceAccount> {
    return this.http.post<FinanceAccount>(`${BASE}/accounts`, body);
  }

  updateAccount(id: string, body: UpdateAccountBody): Observable<FinanceAccount> {
    return this.http.put<FinanceAccount>(`${BASE}/accounts/${id}`, body);
  }

  deleteAccount(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/accounts/${id}`);
  }

  reconcile(id: string, actualBalance: number, note: string | null): Observable<Operation> {
    return this.http.post<Operation>(`${BASE}/accounts/${id}/reconcile`, { actualBalance, note });
  }

  categories(): Observable<FinanceCategory[]> {
    return this.http.get<FinanceCategory[]>(`${BASE}/categories`);
  }

  createCategory(body: CategoryBody): Observable<FinanceCategory[]> {
    return this.http.post<FinanceCategory[]>(`${BASE}/categories`, body);
  }

  updateCategory(id: string, body: CategoryBody): Observable<FinanceCategory[]> {
    return this.http.put<FinanceCategory[]>(`${BASE}/categories/${id}`, body);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/categories/${id}`);
  }

  operations(query: OperationQuery): Observable<Page<Operation>> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      for (const v of Array.isArray(value) ? value : [value]) params = params.append(key, String(v));
    }
    return this.http.get<Page<Operation>>(`${BASE}/operations`, { params });
  }

  duplicates(
    accountId: string,
    type: OperationType,
    amount: number,
    date: string,
    excludeId: string | null,
  ): Observable<Operation[]> {
    const params: Record<string, string> = { accountId, type, amount: String(amount), date };
    if (excludeId) params['excludeId'] = excludeId;
    return this.http.get<Operation[]>(`${BASE}/operations/duplicates`, { params });
  }

  createOperation(body: OperationBody): Observable<Operation> {
    return this.http.post<Operation>(`${BASE}/operations`, body);
  }

  updateOperation(id: string, body: OperationBody): Observable<Operation> {
    return this.http.put<Operation>(`${BASE}/operations/${id}`, body);
  }

  complete(id: string, amount: number, date: string): Observable<Operation> {
    return this.http.post<Operation>(`${BASE}/operations/${id}/complete`, { amount, date });
  }

  cancel(id: string): Observable<Operation> {
    return this.http.post<Operation>(`${BASE}/operations/${id}/cancel`, {});
  }

  deleteOperation(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/operations/${id}`);
  }

  // ---- Échéanciers ----

  schedules(): Observable<Schedule[]> {
    return this.http.get<Schedule[]>(`${BASE}/schedules`);
  }

  createSchedule(body: ScheduleBody): Observable<Schedule> {
    return this.http.post<Schedule>(`${BASE}/schedules`, body);
  }

  updateSchedule(id: string, body: ScheduleBody): Observable<Schedule> {
    return this.http.put<Schedule>(`${BASE}/schedules/${id}`, body);
  }

  deleteSchedule(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/schedules/${id}`);
  }

  scheduleAction(id: string, action: 'pause' | 'resume' | 'end'): Observable<Schedule> {
    return this.http.post<Schedule>(`${BASE}/schedules/${id}/${action}`, {});
  }

  completeOccurrence(scheduleId: string, due: string, amount: number, date: string): Observable<Operation> {
    return this.http.post<Operation>(`${BASE}/schedules/${scheduleId}/occurrences/${due}/complete`, {
      amount,
      date,
    });
  }

  skipOccurrence(scheduleId: string, due: string): Observable<Operation> {
    return this.http.post<Operation>(`${BASE}/schedules/${scheduleId}/occurrences/${due}/skip`, {});
  }

  adjustOccurrence(scheduleId: string, due: string, amount: number, date: string): Observable<Operation> {
    return this.http.put<Operation>(`${BASE}/schedules/${scheduleId}/occurrences/${due}`, {
      amount,
      date,
    });
  }

  // ---- Budget et préférences ----

  budget(month: string): Observable<BudgetView> {
    return this.http.get<BudgetView>(`${BASE}/budget`, { params: { month } });
  }

  updateBudget(month: string, body: BudgetBody): Observable<BudgetView> {
    return this.http.put<BudgetView>(`${BASE}/budget/${month}`, body);
  }

  preferences(): Observable<FinancePreferences> {
    return this.http.get<FinancePreferences>(`${BASE}/preferences`);
  }

  updatePreferences(body: FinancePreferences): Observable<FinancePreferences> {
    return this.http.put<FinancePreferences>(`${BASE}/preferences`, body);
  }

  // ---- Achats prévus et prévision ----

  forecast(): Observable<Forecast> {
    return this.http.get<Forecast>(`${BASE}/forecast`);
  }

  goals(): Observable<Goal[]> {
    return this.http.get<Goal[]>(`${BASE}/goals`);
  }

  previewGoal(body: GoalBody, id: string | null): Observable<GoalFeasibility> {
    return this.http.post<GoalFeasibility>(`${BASE}/goals/preview`, body, {
      params: id ? { id } : {},
    });
  }

  createGoal(body: GoalBody): Observable<Goal> {
    return this.http.post<Goal>(`${BASE}/goals`, body);
  }

  updateGoal(id: string, body: GoalBody): Observable<Goal> {
    return this.http.put<Goal>(`${BASE}/goals/${id}`, body);
  }

  deleteGoal(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/goals/${id}`);
  }

  reserveGoal(id: string, amount: number): Observable<Goal> {
    return this.http.put<Goal>(`${BASE}/goals/${id}/reservation`, { amount });
  }

  purchaseGoal(id: string, body: PurchaseBody): Observable<Goal> {
    return this.http.post<Goal>(`${BASE}/goals/${id}/purchase`, body);
  }

  postponeGoal(id: string, targetDate: string): Observable<Goal> {
    return this.http.post<Goal>(`${BASE}/goals/${id}/postpone`, { targetDate });
  }

  goalAction(id: string, action: 'abandon' | 'reopen'): Observable<Goal> {
    return this.http.post<Goal>(`${BASE}/goals/${id}/${action}`, {});
  }

  moveGoal(id: string, important: boolean, urgent: boolean, position: number): Observable<Goal> {
    return this.http.put<Goal>(`${BASE}/goals/${id}/position`, { important, urgent, position });
  }
  // ---- Prêts et emprunts ----

  loans(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${BASE}/loans`);
  }

  createLoan(body: LoanBody): Observable<Loan> {
    return this.http.post<Loan>(`${BASE}/loans`, body);
  }

  updateLoan(id: string, body: { person: string; dueDate: string | null; notes: string | null }): Observable<Loan> {
    return this.http.put<Loan>(`${BASE}/loans/${id}`, body);
  }

  repayLoan(id: string, amount: number, date: string, accountId: string): Observable<Loan> {
    return this.http.post<Loan>(`${BASE}/loans/${id}/repayments`, { amount, date, accountId });
  }

  writeOffLoan(id: string, reason: string | null): Observable<Loan> {
    return this.http.post<Loan>(`${BASE}/loans/${id}/write-off`, { reason });
  }

  cancelLoan(id: string): Observable<Loan> {
    return this.http.post<Loan>(`${BASE}/loans/${id}/cancel`, {});
  }
}
