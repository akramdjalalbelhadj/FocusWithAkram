import { describe, expect, it } from 'vitest';
import { ImportReport, Project, ProjectFolder } from '../../../core/api/models';
import { exportFileName, groupByFolder, importSummary, projectsOnly } from './project-folders';

const folder = (id: string, name: string): ProjectFolder => ({
  id,
  name,
  color: '#64748b',
  createdAt: '2026-11-14T10:00:00Z',
  projectCount: 0,
});
const project = (id: string, folderId?: string | null): Project => ({
  id,
  name: id,
  description: null,
  color: '#4f46e5',
  icon: null,
  dueAt: null,
  archived: false,
  createdAt: '2026-11-14T10:00:00Z',
  totalTasks: 0,
  doneTasks: 0,
  folderId,
});

const names = (sections: ReturnType<typeof groupByFolder>) =>
  sections.map((s) => `${s.folder?.name ?? '—'}:${s.projects.map((p) => p.id).join(',')}`);

describe('dossiers de projets', () => {
  const folders = [folder('m', 'MES'), folder('d', 'DMP'), folder('v', 'Vide')];
  const projects = [project('a1', 'd'), project('l1', 'm'), project('a2', 'd'), project('x'), project('o', 'supprime')];

  it('regroupe par dossier (ordre alphabétique) puis « Sans dossier »', () => {
    expect(names(groupByFolder(projects, folders, 'all', false))).toEqual([
      'DMP:a1,a2',
      'MES:l1',
      '—:x,o',
    ]);
  });

  it('montre les dossiers vides seulement si demandé', () => {
    expect(names(groupByFolder(projects, folders, 'all', true))).toContain('Vide:');
  });

  it('filtre un dossier ou les projets sans dossier', () => {
    expect(names(groupByFolder(projects, folders, 'd', false))).toEqual(['DMP:a1,a2']);
    expect(names(groupByFolder(projects, folders, 'v', false))).toEqual(['Vide:']);
    expect(names(groupByFolder(projects, folders, 'none', false))).toEqual(['—:x,o']);
    expect(groupByFolder(projects, folders, 'inconnu', false)).toEqual([]);
  });

  it('ne garde du fichier importé que les sections des projets', () => {
    const kept = projectsOnly({
      version: 6,
      projects: [],
      folders: [],
      tasks: [],
      settings: { theme: 'DARK' },
      finance: {},
      notes: {},
      dailyGoals: [],
    });
    expect(Object.keys(kept).sort()).toEqual(['folders', 'projects', 'tasks', 'version']);
    expect(() => projectsOnly([])).toThrow();
    expect(() => projectsOnly({ version: 6 })).toThrow();
    expect(() => projectsOnly('texte')).toThrow();
  });

  it('résume un rapport d’import', () => {
    const report: ImportReport = {
      dryRun: true,
      projectsCreated: 20,
      projectsReused: 1,
      tasksCreated: 140,
      tasksSkipped: 0,
      sessionsCreated: 3,
      sessionsSkipped: 0,
      errors: [],
      settingsRestored: false,
      dailyGoalsCreated: 0,
      dailyGoalsSkipped: 0,
      finance: null,
      foldersCreated: 1,
      foldersReused: 0,
    };
    const text = importSummary(report);
    expect(text).toContain('Dossiers : 1 à créer');
    expect(text).toContain('Projets : 20 à créer, 1 déjà présent');
    expect(text).toContain('Tâches : 140 à créer');
    expect(text).toContain('3 sessions');
  });

  it('nomme le fichier d’export sans accents ni espaces', () => {
    expect(exportFileName('Dossier « Été 2026 »', '2026-11-14')).toBe(
      'focusflow-projets-dossier-ete-2026-2026-11-14.json',
    );
    expect(exportFileName('', '2026-11-14')).toBe('focusflow-projets-export-2026-11-14.json');
  });
});
