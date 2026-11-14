import { ImportReport, Project, ProjectFolder } from '../../../core/api/models';

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

/** Resume lisible d'un rapport d'import de projets (apercu ou import termine). */
export function importSummary(r: ImportReport): string {
  const verb = r.dryRun ? 'à créer' : 'créé(s)';
  const parts = [
    `Dossiers : ${r.foldersCreated ?? 0} ${verb}, ${r.foldersReused ?? 0} déjà présent(s).`,
    `Projets : ${r.projectsCreated} ${verb}, ${r.projectsReused} déjà présent(s) (rapprochés par nom).`,
    `Tâches : ${r.tasksCreated} ${r.dryRun ? 'à créer' : 'créée(s)'}, ${r.tasksSkipped} déjà présente(s).`,
  ];
  if (r.sessionsCreated) parts.push(`${plural(r.sessionsCreated, 'session', 'sessions')} Pomodoro.`);
  if (r.errors.length) parts.push(`${plural(r.errors.length, 'élément ignoré', 'éléments ignorés')} : ${r.errors.slice(0, 3).join(' ; ')}`);
  return parts.join(' ');
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
