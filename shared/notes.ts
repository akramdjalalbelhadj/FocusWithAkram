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
  /** Premiere categorie (ancien contrat) ; voir `categories`. */
  category: NoteCategoryRef | null;
  /** Toutes les categories de l'idee (aucune, une ou plusieurs), par nom. */
  categories: NoteCategoryRef[];
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  tasksDone: number;
  /** Archives (facultatif pour React) : date, raison et effacement programme d'une idee supprimee. */
  archivedAt?: string | null;
  archiveReason?: NoteArchiveReason | null;
  purgeAt?: string | null;
}

/** CONVERTED : transformee en tache ; ARCHIVED : archivee a la main ; DELETED : effacee a `purgeAt` (72 h). */
export type NoteArchiveReason = "CONVERTED" | "ARCHIVED" | "DELETED";

/** Idee complete : contenu Markdown et taches qui en sont issues (terminees et archivees comprises). */
export interface Note {
  id: string;
  title: string;
  content: string;
  /** Premiere categorie (ancien contrat) ; voir `categories`. */
  category: NoteCategoryRef | null;
  /** Toutes les categories de l'idee (aucune, une ou plusieurs), par nom. */
  categories: NoteCategoryRef[];
  tags: string[];
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  tasks: Task[];
  archivedAt?: string | null;
  archiveReason?: NoteArchiveReason | null;
  purgeAt?: string | null;
}

export interface CreateNoteInput {
  title: string;
  content?: string;
  /** Ancienne forme : une seule categorie. */
  categoryId?: string | null;
  /** Categories de l'idee (prioritaire sur `categoryId`). */
  categoryIds?: string[];
  tags?: string[];
  favorite?: boolean;
}

/**
 * Modification partielle : un champ absent est conserve. `categoryIds` remplace la liste des categories (`[]` les
 * retire toutes) ; `categoryId` (ancienne forme) n'en garde qu'une, `null` les retire.
 */
export interface NotePatch {
  title?: string;
  content?: string;
  categoryId?: string | null;
  categoryIds?: string[];
  tags?: string[];
  favorite?: boolean;
}

export type NoteSort = "updatedAt" | "createdAt" | "title";

export interface NoteFilters {
  q?: string;
  /** Idees ayant cette categorie (parmi d'autres eventuellement). */
  categoryId?: string;
  tag?: string;
  favorite?: boolean;
  /** Vrai : idees ayant donne des taches ; faux : idees encore a transformer. */
  withTasks?: boolean;
  /** Vrai : idees des archives ; sinon idees actives. */
  archived?: boolean;
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
