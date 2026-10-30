import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { SettingsStore } from './core/services/settings.store';
import { PomodoroEngine } from './core/services/pomodoro.engine';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([errorInterceptor])),
    // Les parametres (theme, fuseau) sont charges avant le premier rendu ; le moteur Pomodoro se reconnecte
    // a la session active des le demarrage, quelle que soit la page ouverte.
    provideAppInitializer(async () => {
      // inject() n'est valide qu'avant le premier await.
      const settings = inject(SettingsStore);
      inject(PomodoroEngine);
      await settings.load();
    }),
  ],
};
