import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SILENT_ERRORS } from './app-error';
import {
  CreateNoteInput,
  CreateTaskInput,
  Note,
  NoteCategory,
  NoteCategoryInput,
  NoteFilters,
  NotePatch,
  NoteSummary,
  Page,
  Task,
} from './models';

const BASE = '/api/v1';

/** Le conflit est traite par l'appelant (confirmation ou avertissement), sans message automatique. */
const SILENT = new HttpHeaders({ [SILENT_ERRORS]: '1' });

function params(values: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(values)) {
    if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
  }
  return p;
}

@Injectable({ providedIn: 'root' })
export class NotesApi {
  private readonly http = inject(HttpClient);

  list(filters: NoteFilters = {}): Observable<Page<NoteSummary>> {
    return this.http.get<Page<NoteSummary>>(`${BASE}/notes`, { params: params({ ...filters }) });
  }

  get(id: string): Observable<Note> {
    return this.http.get<Note>(`${BASE}/notes/${id}`);
  }

  tags(): Observable<string[]> {
    return this.http.get<string[]>(`${BASE}/notes/tags`);
  }

  create(input: CreateNoteInput): Observable<Note> {
    return this.http.post<Note>(`${BASE}/notes`, input);
  }

  update(id: string, patch: NotePatch): Observable<Note> {
    return this.http.patch<Note>(`${BASE}/notes/${id}`, patch);
  }

  /** Sans `force`, refusee (409 NOTE_HAS_TASKS) si des taches sont issues de l'idee. */
  delete(id: string, force = false): Observable<void> {
    return this.http.delete<void>(`${BASE}/notes/${id}`, {
      params: params({ force: force || null }),
      headers: SILENT,
    });
  }

  /** Cree une tache issue de l'idee ; 409 NOTE_TASK_DUPLICATE tant que le doublon n'est pas confirme. */
  createTask(id: string, task: CreateTaskInput, allowDuplicate = false): Observable<Task> {
    return this.http.post<Task>(
      `${BASE}/notes/${id}/tasks`,
      { task, allowDuplicate },
      { headers: SILENT },
    );
  }

  // ---- Categories ----
  categories(): Observable<NoteCategory[]> {
    return this.http.get<NoteCategory[]>(`${BASE}/note-categories`);
  }

  createCategory(input: NoteCategoryInput): Observable<NoteCategory> {
    return this.http.post<NoteCategory>(`${BASE}/note-categories`, input, { headers: SILENT });
  }

  updateCategory(id: string, patch: Partial<NoteCategoryInput>): Observable<NoteCategory> {
    return this.http.patch<NoteCategory>(`${BASE}/note-categories/${id}`, patch, {
      headers: SILENT,
    });
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/note-categories/${id}`);
  }
}
