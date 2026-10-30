import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ArchivedTask,
  CreateTaskInput,
  DayCount,
  Matrix,
  Page,
  PriorityMode,
  Project,
  Quadrant,
  SearchResult,
  Task,
  TaskExecution,
  TaskFilters,
  TaskPatch,
  TaskStatus,
  TimelineEvent,
  TopGoals,
} from './models';

const BASE = '/api/v1';

function params(values: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(values)) {
    if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
  }
  return p;
}

@Injectable({ providedIn: 'root' })
export class TasksApi {
  private readonly http = inject(HttpClient);

  list(filters: TaskFilters & { page?: number; size?: number; sort?: string; dir?: 'asc' | 'desc'; unplanned?: boolean; dueFrom?: string; dueTo?: string }): Observable<Page<Task>> {
    return this.http.get<Page<Task>>(`${BASE}/tasks`, { params: params({ ...filters }) });
  }

  priorities(mode: PriorityMode, filters: TaskFilters = {}): Observable<Task[]> {
    return this.http.get<Task[]>(`${BASE}/tasks/priorities`, {
      params: params({ mode, q: filters.q, projectId: filters.projectId, tag: filters.tag }),
    });
  }

  matrix(filters: TaskFilters = {}): Observable<Matrix> {
    return this.http.get<Matrix>(`${BASE}/eisenhower/matrix`, {
      params: params({ q: filters.q, status: filters.status, projectId: filters.projectId, tag: filters.tag, overdue: filters.overdue }),
    });
  }

  get(id: string): Observable<Task> {
    return this.http.get<Task>(`${BASE}/tasks/${id}`);
  }

  create(input: CreateTaskInput): Observable<Task> {
    return this.http.post<Task>(`${BASE}/tasks`, input);
  }

  update(id: string, patch: TaskPatch): Observable<Task> {
    return this.http.patch<Task>(`${BASE}/tasks/${id}`, patch);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/tasks/${id}`);
  }

  duplicate(id: string): Observable<Task> {
    return this.http.post<Task>(`${BASE}/tasks/${id}/duplicate`, {});
  }

  changeStatus(id: string, status: TaskStatus, actualStartAt?: string | null): Observable<Task> {
    return this.http.patch<Task>(`${BASE}/tasks/${id}/status`, { status, actualStartAt: actualStartAt ?? null });
  }

  moveToQuadrant(id: string, quadrant: Quadrant): Observable<Task> {
    return this.http.patch<Task>(`${BASE}/tasks/${id}/quadrant`, { quadrant });
  }

  reorder(quadrant: Quadrant, taskIds: string[]): Observable<Task[]> {
    return this.http.patch<Task[]>(`${BASE}/tasks/reorder`, { quadrant, taskIds });
  }

  start(id: string, actualStartAt?: string | null): Observable<Task> {
    return this.http.post<Task>(`${BASE}/tasks/${id}/start`, actualStartAt ? { actualStartAt } : {});
  }

  complete(id: string, body: { actualStartAt?: string | null; actualEndAt?: string | null } = {}): Observable<Task> {
    return this.http.post<Task>(`${BASE}/tasks/${id}/complete`, body);
  }

  restore(id: string): Observable<Task> {
    return this.http.post<Task>(`${BASE}/tasks/${id}/restore`, {});
  }

  timeline(id: string): Observable<TimelineEvent[]> {
    return this.http.get<TimelineEvent[]>(`${BASE}/tasks/${id}/timeline`);
  }

  executions(id: string): Observable<TaskExecution[]> {
    return this.http.get<TaskExecution[]>(`${BASE}/tasks/${id}/executions`);
  }

  addSubtask(id: string, title: string): Observable<Task> {
    return this.http.post<Task>(`${BASE}/tasks/${id}/subtasks`, { title });
  }

  updateSubtask(id: string, subtaskId: string, patch: { title?: string; done?: boolean }): Observable<Task> {
    return this.http.patch<Task>(`${BASE}/tasks/${id}/subtasks/${subtaskId}`, patch);
  }

  deleteSubtask(id: string, subtaskId: string): Observable<Task> {
    return this.http.delete<Task>(`${BASE}/tasks/${id}/subtasks/${subtaskId}`);
  }

  tags(): Observable<string[]> {
    return this.http.get<string[]>(`${BASE}/tags`);
  }

  // ---- Archives ----
  archives(filters: { q?: string; projectId?: string; quadrant?: Quadrant | ''; from?: string; to?: string; page?: number; size?: number; order?: 'asc' | 'desc' }): Observable<Page<ArchivedTask>> {
    return this.http.get<Page<ArchivedTask>>(`${BASE}/tasks/archives`, { params: params({ ...filters }) });
  }

  archiveFacets(): Observable<DayCount[]> {
    return this.http.get<DayCount[]>(`${BASE}/tasks/archives/facets`);
  }

  // ---- Top 3 ----
  top3(): Observable<TopGoals> {
    return this.http.get<TopGoals>(`${BASE}/dashboard/top3`);
  }

  setTop3(taskIds: string[]): Observable<TopGoals> {
    return this.http.put<TopGoals>(`${BASE}/dashboard/top3`, { taskIds });
  }

  search(q: string): Observable<SearchResult> {
    return this.http.get<SearchResult>(`${BASE}/search`, { params: params({ q }) });
  }
}

@Injectable({ providedIn: 'root' })
export class ProjectsApi {
  private readonly http = inject(HttpClient);

  list(): Observable<Project[]> {
    return this.http.get<Project[]>(`${BASE}/projects`);
  }

  create(input: Partial<Project> & { name: string }): Observable<Project> {
    return this.http.post<Project>(`${BASE}/projects`, input);
  }

  update(id: string, patch: Partial<Project>): Observable<Project> {
    return this.http.patch<Project>(`${BASE}/projects/${id}`, patch);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/projects/${id}`);
  }
}
