import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  CategoryBody,
  CreateAccountBody,
  FinanceAccount,
  FinanceCategory,
  FinanceOverview,
  Operation,
  OperationBody,
  OperationQuery,
  OperationType,
  Page,
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
}
