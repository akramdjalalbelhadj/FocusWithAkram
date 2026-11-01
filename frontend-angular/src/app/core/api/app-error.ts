import { ApiProblem } from './models';

/** Erreur applicative normalisee, levee pour tous les echecs HTTP. */
export class AppError extends Error {
  constructor(
    readonly problem: ApiProblem,
    readonly offline = false,
    /** Vrai si l'intercepteur a deja affiche l'erreur : l'appelant ne doit pas la repeter. */
    readonly notified = false,
  ) {
    super(problem.detail);
  }
}

/** Requetes pour lesquelles l'appelant gere lui-meme l'affichage de l'erreur (pas de toast automatique). */
export const SILENT_ERRORS = 'X-Silent-Errors';
