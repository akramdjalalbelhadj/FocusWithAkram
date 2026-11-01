import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AppError, SILENT_ERRORS } from '../api/app-error';
import { ApiProblem } from '../api/models';
import { ToastService } from '../services/toast.service';

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
      return throwError(() => new AppError(problem, offline, !handledByCaller));
    }),
  );
};
