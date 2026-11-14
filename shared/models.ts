import type { FinanceImportSummary } from "./finance";
import type { NoteEditorMode, NotesImportSummary } from "./notes";

/** Types alignes sur les DTO de l'API REST (voir backend, /swagger-ui.html). Les instants sont des chaines ISO-8601 UTC. */

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type Quadrant = "Q1" | "Q2" | "Q3" | "Q4";
export type Punctuality = "EARLY" | "ON_TIME" | "LATE";

export interface TaskTiming {
  plannedDurationSeconds: number | null;
  actualElapsedSeconds: number | null;
  activeSeconds: number;
  startVarianceSeconds: number | null;
  endVarianceSeconds: number | null;
  durationVarianceSeconds: number | null;
  punctuality: Punctuality | null;
}

export interface ProjectRef {
  id: string;
  name: string;
  color: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  position: number;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  status: TaskStatus;
  quadrant: Quadrant;
  important: boolean;
  urgent: boolean;
  position: number;
  estimatedMinutes: number | null;
  project: ProjectRef | null;
  tags: string[];
  subtasks: Subtask[];
  subtasksDone: number;
  subtasksTotal: number;
  createdAt: string;
  updatedAt: string;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  archivedAt: string | null;
  executionNumber: number;
  overdue: boolean;
  timeSpentSeconds: number;
  timing: TaskTiming;
  version: number;
  /** Idee (module Notes & idees) dont la tache est issue ; absent ou null sinon. */
  sourceNoteId?: string | null;
  /** Tous les projets de la tache, le principal (`project`) en premier (facultatif pour React). */
  projects?: ProjectRef[];
}

export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  notes?: string | null;
  quadrant?: Quadrant;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  estimatedMinutes?: number | null;
  projectId?: string | null;
  /** Projets de la tache (le premier est le principal) ; s'il est fourni, remplace `projectId`. */
  projectIds?: string[];
  tags?: string[];
  subtasks?: string[];
}

export type TaskPatch = Partial<
  Pick<
    Task,
    | "title"
    | "description"
    | "notes"
    | "plannedStartAt"
    | "plannedEndAt"
    | "estimatedMinutes"
  >
> & { projectId?: string | null; projectIds?: string[]; tags?: string[]; quadrant?: Quadrant };

export interface TaskFilters {
  q?: string;
  status?: TaskStatus | "";
  projectId?: string;
  tag?: string;
  overdue?: boolean;
}

export type PriorityMode =
  "PRIORITIES" | "TODAY" | "WEEK" | "ALL" | "OVERDUE" | "DONE";

export interface QuadrantView {
  quadrant: Quadrant;
  label: string;
  count: number;
  overdueCount: number;
  tasks: Task[];
}

export interface Matrix {
  quadrants: QuadrantView[];
  total: number;
}

export type ArchiveSection =
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "PREVIOUS_MONTHS"
  | "PREVIOUS_YEARS";

export interface ArchivedTask {
  task: Task;
  section: ArchiveSection;
  day: string;
}

export interface DayCount {
  date: string;
  count: number;
}

export type TimelineEventType =
  | "CREATED"
  | "PLANNED_START"
  | "ACTUAL_START"
  | "PLANNED_END"
  | "ACTUAL_END"
  | "ARCHIVED";

export interface TimelineEvent {
  type: TimelineEventType;
  at: string | null;
  occurred: boolean;
}

export interface SessionSummary {
  id: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  plannedSeconds: number;
  workedSeconds: number;
}

export interface TaskExecution {
  executionNumber: number;
  current: boolean;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  archivedAt: string | null;
  timing: TaskTiming;
  sessions: SessionSummary[];
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  dueAt: string | null;
  archived: boolean;
  createdAt: string;
  totalTasks: number;
  doneTasks: number;
  /**
   * Lot 27 : dossiers du projet (aucun, un ou plusieurs ; par nom de dossier). Les taches restent liees au projet.
   * Remplace `folderId` (lot 23), encore accepte en ecriture.
   */
  folderIds?: string[];
}

/** Lot 23 : dossier regroupant des projets (un seul niveau). */
export interface ProjectFolder {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  projectCount: number;
}

// ---- Pomodoro --------------------------------------------------------------

export type SessionType = "WORK" | "SHORT_BREAK" | "LONG_BREAK";
export type SessionStatus = "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED";

export interface NextSession {
  type: SessionType;
  plannedSeconds: number;
  sequenceNumber: number;
}

export interface PomodoroSession {
  id: string;
  type: SessionType;
  status: SessionStatus;
  taskId: string | null;
  taskTitle: string | null;
  plannedSeconds: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  workedSeconds: number;
  sequenceNumber: number;
  startedAt: string;
  lastResumedAt: string | null;
  expectedEndAt: string | null;
  endedAt: string | null;
  next: NextSession;
}

export interface SessionState {
  session: PomodoroSession | null;
  serverTime: string;
}

export interface HistoryEntry {
  id: string;
  status: SessionStatus;
  taskId: string | null;
  taskTitle: string | null;
  startedAt: string;
  endedAt: string;
  plannedSeconds: number;
  workedSeconds: number;
}

export interface DayHistory {
  date: string;
  workedSeconds: number;
  completedSessions: number;
  interruptedSessions: number;
  sessions: HistoryEntry[];
}

// ---- Parametres ------------------------------------------------------------

export type ThemePreference = "LIGHT" | "DARK" | "SYSTEM";

export interface Settings {
  timeZone: string;
  weekStartsOn: "MONDAY" | "SUNDAY" | "SATURDAY";
  theme: ThemePreference;
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLong: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  soundName: "bell" | "chime" | "soft";
  dailyFocusGoalMinutes: number;
  subtasksCompleteParent: boolean;
  shortcutsEnabled: boolean;
  compactMode: boolean;
  /** Mode par defaut de l'editeur des notes (facultatif : les interfaces sans module de notes l'ignorent). */
  noteEditorMode?: NoteEditorMode;
  /** Tutoriel de « Notes & idées » termine ou passe (facultatif : les interfaces sans module de notes l'ignorent). */
  notesTutorialDone?: boolean;
  /** Tutoriel de la matrice d'Eisenhower termine ou passe (facultatif : React l'ignore). */
  matrixTutorialDone?: boolean;
  /** Pseudo affiche dans le tableau de bord (« Hello pseudo »), null tant qu'il n'a pas ete saisi. */
  displayName?: string | null;
}

// ---- Dashboard / statistiques ---------------------------------------------

export interface DashboardSummary {
  today: string;
  timeZone: string;
  kpis: {
    remainingTasks: number;
    completedToday: number;
    completedThisWeek: number;
    focusSecondsToday: number;
    pomodorosToday: number;
    overdueTasks: number;
    dailyGoalMinutes: number;
    dailyGoalProgress: number;
  };
  top3: TopGoals;
  matrix: { quadrant: Quadrant; count: number; overdue: number }[];
  week: { date: string; tasksCompleted: number; focusSeconds: number }[];
  inProgress: Task | null;
}

export interface TopGoals {
  tasks: Task[];
  done: number;
  total: number;
}

export interface Productivity {
  from: string;
  to: string;
  timeZone: string;
  tasks: {
    created: number;
    completed: number;
    overdueNow: number;
    createdAndDone: number;
    completionRate: number;
    activeByQuadrant: Record<Quadrant, number>;
    byStatus: Record<TaskStatus, number>;
  };
  focus: {
    totalSeconds: number;
    completedSessions: number;
    interruptedSessions: number;
    averageSessionSeconds: number;
    dailyGoalMinutes: number;
    daysGoalReached: number;
    byProject: {
      projectId: string;
      name: string;
      color: string;
      focusSeconds: number;
    }[];
    byTask: { taskId: string; title: string; focusSeconds: number }[];
  };
  planning: {
    early: number;
    onTime: number;
    late: number;
    averageEndVarianceSeconds: number | null;
    totalPlannedSeconds: number;
    totalElapsedSeconds: number;
    totalActiveSeconds: number;
    completedThisWeek: number;
    comparisons: {
      taskId: string;
      title: string;
      completedAt: string;
      plannedSeconds: number;
      elapsedSeconds: number;
    }[];
  };
  daily: {
    date: string;
    tasksCompleted: number;
    focusSeconds: number;
    pomodoros: number;
  }[];
}

export interface SearchResult {
  tasks: {
    id: string;
    title: string;
    status: TaskStatus;
    quadrant: Quadrant;
    archived: boolean;
  }[];
  projects: { id: string; name: string; color: string }[];
}

export interface ImportReport {
  dryRun: boolean;
  projectsCreated: number;
  projectsReused: number;
  tasksCreated: number;
  tasksSkipped: number;
  sessionsCreated: number;
  sessionsSkipped: number;
  errors: string[];
  /** Sauvegarde v2 : préférences restaurées depuis le fichier. */
  settingsRestored: boolean;
  /** Sauvegarde v2 : objectifs du Top 3 quotidien. */
  dailyGoalsCreated: number;
  dailyGoalsSkipped: number;
  /** Sauvegarde v3 : section « Mes achats » (absente si le fichier n'en contient pas). */
  finance: FinanceImportSummary | null;
  /** Sauvegarde v4 : section Notes & idees (absente si le fichier n'en contient pas). */
  notes?: NotesImportSummary | null;
  /** Sauvegarde v6 : dossiers de projets crees ou rapproches par nom. */
  foldersCreated?: number;
  foldersReused?: number;
  /** Lot 25 : dossiers du fichier deja presents (dossier ou projets de meme nom) et leur traitement. */
  conflicts?: ImportConflict[];
  conflictMode?: ConflictMode;
  projectsReplaced?: number;
  projectsIgnored?: number;
  tasksReplaced?: number;
  tasksIgnored?: number;
}

/**
 * Lot 25 : traitement des dossiers en conflit a l'import. MERGE (defaut, sauvegarde complete) rapproche par nom ;
 * SKIP ignore ces dossiers et importe le reste ; REPLACE laisse le fichier ecraser l'existant pour ces dossiers.
 */
export type ConflictMode = "MERGE" | "SKIP" | "REPLACE";

/** Dossier du fichier (ou ses projets sans dossier : `folder` absent) deja present dans l'application. */
export interface ImportConflict {
  folder?: string | null;
  folderExists: boolean;
  projectCount: number;
  existingProjects: { name: string; currentFolders: string[]; inactive: boolean }[];
}

/**
 * Lot 27 : sort des projets des dossiers supprimes. Un projet qui fait aussi partie d'un dossier conserve n'est
 * jamais supprime.
 */
export type FolderDeletionMode = "KEEP_PROJECTS" | "DELETE_PROJECTS" | "DELETE_PROJECTS_AND_TASKS";

/** Resultat (ou apercu) d'une suppression de dossiers. */
export interface FolderDeletionReport {
  dryRun: boolean;
  mode: FolderDeletionMode;
  foldersDeleted: number;
  /** Projets qui n'ont plus aucun dossier (mode KEEP_PROJECTS). */
  projectsUnfiled: number;
  projectsDeleted: number;
  /** Projets conserves car ils font aussi partie d'un autre dossier. */
  keptProjects: { name: string; otherFolders: string[] }[];
  tasksDeleted: number;
  tasksKept: number;
}

/** Erreur API normalisee (ProblemDetail RFC 9457). */
export interface ApiProblem {
  status: number;
  code: string;
  detail: string;
  errors?: Record<string, string>;
}

export const QUADRANTS: readonly Quadrant[] = ["Q1", "Q2", "Q3", "Q4"];

export const QUADRANT_META: Record<
  Quadrant,
  { label: string; short: string; hint: string; icon: string }
> = {
  Q1: {
    label: "Faire maintenant",
    short: "Urgent · Important",
    hint: "Urgent et important",
    icon: "flame",
  },
  Q2: {
    label: "Planifier",
    short: "Important",
    hint: "Important mais non urgent",
    icon: "calendar-check",
  },
  Q3: {
    label: "Déléguer / limiter",
    short: "Urgent",
    hint: "Urgent mais non important",
    icon: "users",
  },
  Q4: {
    label: "Éliminer / plus tard",
    short: "Ni urgent ni important",
    hint: "Ni urgent ni important",
    icon: "archive",
  },
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  DONE: "Terminée",
};
