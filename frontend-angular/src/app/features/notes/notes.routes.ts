import { Routes } from '@angular/router';

/** Module Notes & idees : liste, ecran des categories et editeur d'une idee. */
export const NOTES_ROUTES: Routes = [
  {
    path: '',
    title: 'Notes & idées — FocusWithAkram',
    loadComponent: () => import('./pages/notes/notes.page').then((m) => m.NotesPage),
  },
  {
    path: 'categories',
    title: 'Catégories d’idées — FocusWithAkram',
    loadComponent: () =>
      import('./pages/note-categories/note-categories.page').then((m) => m.NoteCategoriesPage),
  },
  {
    path: ':id',
    title: 'Idée — FocusWithAkram',
    loadComponent: () => import('./pages/note/note.page').then((m) => m.NotePage),
  },
];
