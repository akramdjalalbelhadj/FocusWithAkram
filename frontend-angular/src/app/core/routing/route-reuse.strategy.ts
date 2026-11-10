import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy, Route } from '@angular/router';

/** Donnee de route : le composant est recree (et non reutilise) quand les parametres de la route changent. */
export const RECREATE_ON_PARAM_CHANGE = 'recreateOnParamChange';

export function recreateOnParamChange(route: Route): Route {
  return { ...route, data: { ...route.data, [RECREATE_ON_PARAM_CHANGE]: true } };
}

/**
 * Par defaut, Angular garde le meme composant quand seul un parametre change (`/notes/a` → `/notes/b`). Un editeur
 * qui enregistre a la fermeture (saisie en attente, envoi en cours) doit au contraire etre detruit puis recree :
 * chaque instance ne travaille que sur sa propre idee.
 */
@Injectable()
export class AppRouteReuseStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    if (!super.shouldReuseRoute(future, curr)) return false;
    if (!future.routeConfig?.data?.[RECREATE_ON_PARAM_CHANGE]) return true;
    return sameParams(future.params, curr.params);
  }
}

function sameParams(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
}
