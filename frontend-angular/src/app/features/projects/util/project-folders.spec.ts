import { describe, expect, it } from 'vitest';
import { ImportReport, Project, ProjectFolder } from '../../../core/api/models';
import {
  conflictDetail,
  conflictTitle,
  exportFileName,
  groupByFolder,
  importLines,
  importSummary,
  projectsOnly,
} from './project-folders';

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
    expect(importLines(report)).toEqual([
      'Dossiers : 1 dossier sera créé.',
      'Projets : 20 projets seront créés, 1 déjà présent(s), conservé(s).',
      'Tâches : 140 tâches seront créées.',
      'Sessions Pomodoro : 3 sessions seront créées.',
    ]);
    const done = importLines({
      ...report,
      dryRun: false,
      projectsCreated: 0,
      projectsReused: 0,
      projectsReplaced: 2,
      tasksCreated: 1,
      tasksReplaced: 4,
      projectsIgnored: 0,
      sessionsCreated: 0,
    });
    expect(done[1]).toBe('Projets : 0 projet créé, 2 remplacé(s) par le fichier.');
    expect(done[2]).toBe('Tâches : 1 tâche créée, 4 remplacée(s) par le fichier.');
    expect(importSummary({ ...report, errors: ['Tâche x : invalide'] })).toContain(
      '1 élément signalé : Tâche x : invalide',
    );
  });

  it('explique un conflit en langage simple', () => {
    const c = {
      folder: 'DMP',
      folderExists: true,
      projectCount: 20,
      existingProjects: [
        { name: 'Appli A', currentFolder: 'DMP', inactive: false },
        { name: 'Appli B', currentFolder: null, inactive: true },
      ],
    };
    expect(conflictTitle(c)).toBe('Dossier « DMP »');
    expect(conflictDetail(c)).toBe(
      'Un dossier de ce nom existe déjà dans l’application ; 2 de ses 20 projets existent déjà : ' +
        'Appli A (dans « DMP »), Appli B (sans dossier, inactif).',
    );
    expect(conflictTitle({ ...c, folder: null })).toBe('Projets sans dossier');
    const many = Array.from({ length: 8 }, (_, i) => ({ name: `P${i}`, currentFolder: 'DMP', inactive: false }));
    expect(conflictDetail({ ...c, folderExists: false, existingProjects: many })).toBe(
      '8 de ses 20 projets existent déjà : P0 (dans « DMP »), P1 (dans « DMP »), P2 (dans « DMP »), ' +
        'P3 (dans « DMP »), P4 (dans « DMP ») et 3 autres.',
    );
    expect(conflictDetail({ ...c, folderExists: false, existingProjects: [c.existingProjects[0]] })).toBe(
      '1 de ses 20 projets existe déjà : Appli A (dans « DMP »).',
    );
  });

  it('nomme le fichier d’export sans accents ni espaces', () => {
    expect(exportFileName('Dossier « Été 2026 »', '2026-11-14')).toBe(
      'focusflow-projets-dossier-ete-2026-2026-11-14.json',
    );
    expect(exportFileName('', '2026-11-14')).toBe('focusflow-projets-export-2026-11-14.json');
  });
});
