import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiProblem } from '../api/models';
import { ToastService } from '../services/toast.service';

/** Erreur applicative normalisee, levee pour tous les echecs HTTP. */
export class AppError extends Error {
  constructor(
    readonly problem: ApiProblem,
    readonly offline = false,
  ) {
    super(problem.detail);
  }
}

/** Requetes pour lesquelles l'appelant gere lui-meme l'affichage de l'erreur (pas de toast automatique). */
export const SILENT_ERRORS = 'X-Silent-Errors';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) return throwError(() => err);
      const offline = err.status === 0;
      const body = err.error as Partial<ApiProblem> | null;
      const problem: ApiProblem = {
        status: err.status,
        code: body?.code ?? (offline ? 'NETWORK' : 'HTTP_ERROR'),
        detail: offline
          ? 'Impossible de joindre le serveur. Vérifiez votre connexion : vos données locales sont conservées.'
          : (body?.detail ?? `Erreur ${err.status}`),
        errors: body?.errors,
      };
      // Les erreurs de validation de formulaire et les regles metier traitees par l'appelant restent silencieuses.
      const handledByCaller =
        err.status === 400 ||
        err.status === 422 ||
        err.status === 404 ||
        req.headers.has(SILENT_ERRORS);
      if (!handledByCaller) toast.error(problem.detail);
      return throwError(() => new AppError(problem, offline));
    }),
  );
};
