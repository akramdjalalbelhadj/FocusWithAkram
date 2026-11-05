/**
 * Contrats du module Notes & idees (API `/api/v1/notes` et `/api/v1/note-categories`).
 * Une idee n'a pas de statut : seules les taches qui en sont issues en ont un.
 */
import type { Task } from "./models";

/** Mode de l'editeur des notes : saisie Markdown avec apercu, ou editeur visuel. Le contenu reste du Markdown. */
export type NoteEditorMode = "MARKDOWN" | "RICH";

export interface NoteCategoryRef {
  id: string;
  name: string;
  color: string;
}

export interface NoteCategory extends NoteCategoryRef {
  createdAt: string;
  noteCount: number;
}

/** Idee dans une liste : extrait sans syntaxe Markdown et avancement de ses taches (calcule par le serveur). */
export interface NoteSummary {
  id: string;
  title: string;
  excerpt: string;
  category: NoteCategoryRef | null;
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  tasksDone: number;
}

/** Idee complete : contenu Markdown et taches qui en sont issues (terminees et archivees comprises). */
export interface Note {
  id: string;
  title: string;
  content: string;
  category: NoteCategoryRef | null;
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  tasks: Task[];
}

export interface CreateNoteInput {
  title: string;
  content?: string;
  categoryId?: string | null;
  tags?: string[];
  favorite?: boolean;
}

/** Modification partielle : un champ absent est conserve, `categoryId: null` retire la categorie. */
export interface NotePatch {
  title?: string;
  content?: string;
  categoryId?: string | null;
  tags?: string[];
  favorite?: boolean;
}

export type NoteSort = "updatedAt" | "createdAt" | "title";

export interface NoteFilters {
  q?: string;
  categoryId?: string;
  tag?: string;
  favorite?: boolean;
  /** Vrai : idees ayant donne des taches ; faux : idees encore a transformer. */
  withTasks?: boolean;
  sort?: NoteSort;
  dir?: "asc" | "desc";
  page?: number;
  size?: number;
}

export interface NoteCategoryInput {
  name: string;
  color?: string;
}

/** Section « notes » du rapport d'import (sauvegarde v4). */
export interface NotesImportSummary {
  categoriesCreated: number;
  categoriesReused: number;
  notesCreated: number;
  notesSkipped: number;
}

/** Codes d'erreur propres au module. */
export const NOTE_ERRORS = {
  /** Une tache de meme titre est deja issue de cette idee : confirmer avec `allowDuplicate`. */
  taskDuplicate: "NOTE_TASK_DUPLICATE",
  /** Des taches sont issues de l'idee : la suppression exige `force=true`. */
  hasTasks: "NOTE_HAS_TASKS",
  categoryNameTaken: "NOTE_CATEGORY_NAME_TAKEN",
} as const;
