import {
  FolderDeletionReport,
  ImportConflict,
  ImportReport,
  Project,
  ProjectFolder,
} from '../../../core/api/models';

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * Dossier par defaut : il regroupe les projets qui n'ont aucun dossier. Il n'existe pas en base (le serveur
 * reserve son nom), il est toujours affiche et ne peut etre ni renomme ni supprime.
 */
export const DEFAULT_FOLDER = 'Projets sans dossier';

/** Filtre de la page Projets : tous les dossiers, le dossier par defaut (`none`), ou un dossier. */
export type FolderFilter = 'all' | 'none' | string;

/** Section affichee : un dossier (ou `null` = le dossier par defaut « Projets sans dossier »). */
export interface FolderSection {
  folder: ProjectFolder | null;
  projects: Project[];
}

/** Dossiers d'un projet qui existent encore, par nom (aucun : le projet est « sans dossier »). */
export function foldersOf(p: Project, folders: ProjectFolder[]): ProjectFolder[] {
  const ids = p.folderIds ?? [];
  return folders
    .filter((f) => ids.includes(f.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
}

/**
 * Regroupe les projets visibles par dossier : les dossiers par nom, puis le dossier par defaut « Projets sans
 * dossier ». Un projet range dans plusieurs dossiers apparait dans chacun. Avec un filtre, une seule section. Un
 * dossier vide (y compris le dossier par defaut) n'apparait que si `keepEmpty` ou s'il est le dossier filtre.
 */
export function groupByFolder(
  projects: Project[],
  folders: ProjectFolder[],
  filter: FolderFilter,
  keepEmpty: boolean,
): FolderSection[] {
  const byFolder = new Map<string | null, Project[]>();
  const add = (key: string | null, p: Project) => byFolder.set(key, [...(byFolder.get(key) ?? []), p]);
  for (const p of projects) {
    const own = foldersOf(p, folders);
    if (own.length) own.forEach((f) => add(f.id, p));
    else add(null, p);
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
  if (loose.length || keepEmpty) sections.push({ folder: null, projects: loose });
  return sections;
}

/** Ce que fera (ou a fait) une suppression de dossiers, ligne par ligne. */
export function deletionLines(r: FolderDeletionReport): string[] {
  const will = r.dryRun;
  const lines = [
    `${plural(r.foldersDeleted, 'dossier', 'dossiers')} ${will ? (r.foldersDeleted > 1 ? 'seront supprimés' : 'sera supprimé') : r.foldersDeleted > 1 ? 'supprimés' : 'supprimé'}.`,
  ];
  if (r.mode === 'KEEP_PROJECTS') {
    lines.push(
      r.projectsUnfiled
        ? `${plural(r.projectsUnfiled, 'projet', 'projets')} ${will ? (r.projectsUnfiled > 1 ? 'passeront' : 'passera') : r.projectsUnfiled > 1 ? 'sont passés' : 'est passé'} dans « ${DEFAULT_FOLDER} » (avec leurs tâches).`
        : `Aucun projet ne passe dans « ${DEFAULT_FOLDER} ».`,
    );
  } else {
    lines.push(
      r.projectsDeleted
        ? `${plural(r.projectsDeleted, 'projet', 'projets')} ${will ? (r.projectsDeleted > 1 ? 'seront supprimés' : 'sera supprimé') : r.projectsDeleted > 1 ? 'supprimés' : 'supprimé'}.`
        : 'Aucun projet supprimé.',
    );
    if (r.mode === 'DELETE_PROJECTS_AND_TASKS' && r.tasksDeleted) {
      lines.push(
        `${plural(r.tasksDeleted, 'tâche', 'tâches')} ${will ? (r.tasksDeleted > 1 ? 'seront supprimées' : 'sera supprimée') : r.tasksDeleted > 1 ? 'supprimées' : 'supprimée'} définitivement.`,
      );
    }
    if (r.tasksKept) {
      const many = r.tasksKept > 1;
      const kept = `${plural(r.tasksKept, 'tâche', 'tâches')} ${will ? (many ? 'seront gardées' : 'sera gardée') : many ? 'gardées' : 'gardée'}`;
      lines.push(
        r.mode === 'DELETE_PROJECTS'
          ? `${kept}, sans ces projets.`
          : `${kept} car ${many ? 'elles font' : 'elle fait'} aussi partie d’un projet conservé.`,
      );
    }
  }
  if (r.keptProjects.length) {
    const list = r.keptProjects
      .slice(0, 5)
      .map((k) => `${k.name} (aussi dans ${k.otherFolders.map((f) => `« ${f} »`).join(', ')})`)
      .join(', ');
    const more = r.keptProjects.length - 5;
    lines.push(
      `${plural(r.keptProjects.length, 'projet conservé', 'projets conservés')} car ${r.keptProjects.length > 1 ? 'ils font' : 'il fait'} aussi partie d’un autre dossier : ${list}${more > 0 ? ` et ${plural(more, 'autre', 'autres')}` : ''}.`,
    );
  }
  return lines;
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
  return c.folder ? `Dossier « ${c.folder} »` : DEFAULT_FOLDER;
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
        const where = p.currentFolders?.length
          ? `dans ${p.currentFolders.map((f) => `« ${f} »`).join(', ')}`
          : `dans « ${DEFAULT_FOLDER} »`;
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
