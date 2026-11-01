import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DashboardSummary,
  DayHistory,
  ImportReport,
  Page,
  PomodoroSession,
  Productivity,
  SessionState,
  SessionType,
  Settings,
} from './models';

const BASE = '/api/v1';

@Injectable({ providedIn: 'root' })
export class PomodoroApi {
  private readonly http = inject(HttpClient);

  active(): Observable<SessionState> {
    return this.http.get<SessionState>(`${BASE}/pomodoro/sessions/active`);
  }

  start(body: {
    type: SessionType;
    taskId?: string | null;
    plannedSeconds?: number | null;
  }): Observable<SessionState> {
    return this.http.post<SessionState>(`${BASE}/pomodoro/sessions`, body);
  }

  pause(id: string): Observable<SessionState> {
    return this.http.post<SessionState>(`${BASE}/pomodoro/sessions/${id}/pause`, {});
  }

  resume(id: string): Observable<SessionState> {
    return this.http.post<SessionState>(`${BASE}/pomodoro/sessions/${id}/resume`, {});
  }

  complete(id: string): Observable<SessionState> {
    return this.http.post<SessionState>(`${BASE}/pomodoro/sessions/${id}/complete`, {});
  }

  cancel(id: string): Observable<SessionState> {
    return this.http.post<SessionState>(`${BASE}/pomodoro/sessions/${id}/cancel`, {});
  }

  dailyHistory(from?: string, to?: string): Observable<DayHistory[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<DayHistory[]>(`${BASE}/pomodoro/history/daily`, { params });
  }

  history(page = 0, size = 30): Observable<Page<PomodoroSession>> {
    return this.http.get<Page<PomodoroSession>>(`${BASE}/pomodoro/history`, {
      params: { page, size },
    });
  }
}

@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private readonly http = inject(HttpClient);

  summary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${BASE}/dashboard/summary`);
  }

  productivity(from?: string, to?: string): Observable<Productivity> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<Productivity>(`${BASE}/statistics/productivity`, { params });
  }
}

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  private readonly http = inject(HttpClient);

  get(): Observable<Settings> {
    return this.http.get<Settings>(`${BASE}/settings`);
  }

  update(patch: Partial<Settings>): Observable<Settings> {
    return this.http.patch<Settings>(`${BASE}/settings`, patch);
  }
}

@Injectable({ providedIn: 'root' })
export class TransferApi {
  private readonly http = inject(HttpClient);

  exportTasks(format: 'csv' | 'json', scope: 'ACTIVE' | 'ARCHIVED' | 'ALL'): Observable<Blob> {
    return this.http.get(`${BASE}/export/tasks`, {
      params: { format, scope },
      responseType: 'blob',
    });
  }

  backup(): Observable<Blob> {
    return this.http.get(`${BASE}/export/backup`, { responseType: 'blob' });
  }

  importBackup(file: unknown, dryRun: boolean): Observable<ImportReport> {
    return this.http.post<ImportReport>(`${BASE}/import`, file, { params: { dryRun } });
  }
}
