import { ImportConflict, ImportReport, Project, ProjectFolder } from '../../../core/api/models';

/** Filtre de la page Projets : tous les dossiers, les projets sans dossier, ou un dossier. */
export type FolderFilter = 'all' | 'none' | string;

/** Section affichee : un dossier (ou `null` = « Sans dossier ») et ses projets visibles. */
export interface FolderSection {
  folder: ProjectFolder | null;
  projects: Project[];
}

/** Dossier d'un projet, si ce dossier existe encore (sinon le projet est considere sans dossier). */
export function folderOf(p: Project, folders: ProjectFolder[]): ProjectFolder | null {
  return (p.folderId && folders.find((f) => f.id === p.folderId)) || null;
}

/**
 * Regroupe les projets visibles par dossier : les dossiers par nom, puis « Sans dossier ».
 * Avec un filtre, une seule section. Un dossier vide n'apparait que si `keepEmpty` (gestion des dossiers)
 * ou s'il est le dossier filtre.
 */
export function groupByFolder(
  projects: Project[],
  folders: ProjectFolder[],
  filter: FolderFilter,
  keepEmpty: boolean,
): FolderSection[] {
  const byFolder = new Map<string | null, Project[]>();
  for (const p of projects) {
    const key = folderOf(p, folders)?.id ?? null;
    byFolder.set(key, [...(byFolder.get(key) ?? []), p]);
  }
  if (filter === 'none') return [{ folder: null, projects: byFolder.get(null) ?? [] }];
  if (filter !== 'all') {
    const folder = folders.find((f) => f.id === filter);
    return folder ? [{ folder, projects: byFolder.get(folder.id) ?? [] }] : [];
  }
  const sections: FolderSection[] = [...folders]
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
    .map((folder) => ({ folder, projects: byFolder.get(folder.id) ?? [] }))
    .filter((s) => keepEmpty || s.projects.length > 0);
  const loose = byFolder.get(null) ?? [];
  if (loose.length) sections.push({ folder: null, projects: loose });
  return sections;
}

/**
 * Ne garde d'un fichier importe que ce qui concerne les projets (dossiers, projets, taches, sessions) :
 * importer des projets ne doit jamais remplacer les preferences ni toucher aux achats, idees ou Top 3,
 * meme si le fichier choisi est une sauvegarde complete.
 */
export function projectsOnly(file: unknown): Record<string, unknown> {
  if (!file || typeof file !== 'object' || Array.isArray(file)) {
    throw new Error('Ce fichier n’est pas un export de projets.');
  }
  const f = file as Record<string, unknown>;
  if (typeof f['version'] !== 'number' || !Array.isArray(f['projects'])) {
    throw new Error('Ce fichier n’est pas un export de projets FocusWithAkram.');
  }
  const kept: Record<string, unknown> = {};
  for (const key of ['version', 'exportedAt', 'folders', 'projects', 'tasks', 'sessions']) {
    if (key in f) kept[key] = f[key];
  }
  return kept;
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * Ce que fait (ou fera, en apercu) un import de projets, ligne par ligne, en langage simple.
 * Les lignes sans objet (aucun remplacement, aucune session...) sont omises.
 */
export function importLines(r: ImportReport): string[] {
  const will = r.dryRun;
  const created = (n: number, one: string, many: string) =>
    `${plural(n, one, many)} ${will ? (n > 1 ? 'seront créés' : 'sera créé') : n > 1 ? 'créés' : 'créé'}`;
  const createdF = (n: number, one: string, many: string) =>
    `${plural(n, one, many)} ${will ? (n > 1 ? 'seront créées' : 'sera créée') : n > 1 ? 'créées' : 'créée'}`;
  const lines: string[] = [];

  const folders = [created(r.foldersCreated ?? 0, 'dossier', 'dossiers')];
  if (r.foldersReused) folders.push(`${plural(r.foldersReused, 'existait déjà', 'existaient déjà')}`);
  lines.push(`Dossiers : ${folders.join(', ')}.`);

  const projects = [created(r.projectsCreated, 'projet', 'projets')];
  if (r.projectsReplaced) projects.push(`${r.projectsReplaced} remplacé(s) par le fichier`);
  if (r.projectsIgnored) projects.push(`${r.projectsIgnored} ignoré(s) (dossiers en conflit)`);
  if (r.projectsReused) projects.push(`${r.projectsReused} déjà présent(s), conservé(s)`);
  lines.push(`Projets : ${projects.join(', ')}.`);

  const tasks = [createdF(r.tasksCreated, 'tâche', 'tâches')];
  if (r.tasksReplaced) tasks.push(`${r.tasksReplaced} remplacée(s) par le fichier`);
  if (r.tasksIgnored) tasks.push(`${r.tasksIgnored} ignorée(s) (dossiers en conflit)`);
  if (r.tasksSkipped) tasks.push(`${r.tasksSkipped} déjà présente(s), conservée(s)`);
  lines.push(`Tâches : ${tasks.join(', ')}.`);

  if (r.sessionsCreated) {
    lines.push(`Sessions Pomodoro : ${createdF(r.sessionsCreated, 'session', 'sessions')}.`);
  }
  return lines;
}

/** Resume d'un rapport d'import en une phrase (message de fin d'import). */
export function importSummary(r: ImportReport): string {
  const lines = importLines(r);
  if (r.errors.length) {
    lines.push(`${plural(r.errors.length, 'élément signalé', 'éléments signalés')} : ${r.errors.slice(0, 3).join(' ; ')}`);
  }
  return lines.join(' ');
}

/** Nombre de projets nommes dans l'explication d'un conflit ; les suivants sont seulement comptes. */
const MAX_LISTED = 5;

/** Titre d'un conflit : le dossier du fichier, ou ses projets sans dossier. */
export function conflictTitle(c: ImportConflict): string {
  return c.folder ? `Dossier « ${c.folder} »` : 'Projets sans dossier';
}

/** Explication d'un conflit : ce qui existe deja, et ou se trouvent aujourd'hui les projets concernes. */
export function conflictDetail(c: ImportConflict): string {
  const parts: string[] = [];
  if (c.folderExists) parts.push('un dossier de ce nom existe déjà dans l’application');
  const n = c.existingProjects.length;
  if (n) {
    const shown = c.existingProjects.slice(0, MAX_LISTED);
    const more = n - shown.length;
    const list = shown
      .map((p) => {
        const where = p.currentFolder ? `dans « ${p.currentFolder} »` : 'sans dossier';
        return `${p.name} (${where}${p.inactive ? ', inactif' : ''})`;
      })
      .join(', ')
      .concat(more > 0 ? ` et ${plural(more, 'autre', 'autres')}` : '');
    parts.push(
      `${n} de ses ${c.projectCount} projets ${n > 1 ? 'existent' : 'existe'} déjà : ${list}`,
    );
  }
  const text = parts.join(' ; ');
  return text.charAt(0).toUpperCase() + text.slice(1) + '.';
}

/** Nom du fichier d'export : `focusflow-projets-<cible>-<date>.json`, sans caracteres genants. */
export function exportFileName(target: string, today: string): string {
  const slug = target
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `focusflow-projets-${slug || 'export'}-${today}.json`;
}
