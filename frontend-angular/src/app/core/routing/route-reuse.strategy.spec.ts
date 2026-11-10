import { ActivatedRouteSnapshot, Route } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { AppRouteReuseStrategy, recreateOnParamChange } from './route-reuse.strategy';

function snapshot(routeConfig: Route, params: Record<string, string>): ActivatedRouteSnapshot {
  return { routeConfig, params } as unknown as ActivatedRouteSnapshot;
}

describe('AppRouteReuseStrategy', () => {
  const strategy = new AppRouteReuseStrategy();
  const note = recreateOnParamChange({ path: ':id' });
  const task = { path: ':id' };

  it('recrée le composant d’une route marquée quand son paramètre change', () => {
    expect(
      strategy.shouldReuseRoute(snapshot(note, { id: 'b' }), snapshot(note, { id: 'a' })),
    ).toBe(false);
    expect(
      strategy.shouldReuseRoute(snapshot(note, { id: 'a' }), snapshot(note, { id: 'a' })),
    ).toBe(true);
  });

  it('garde le comportement d’Angular pour les autres routes', () => {
    expect(
      strategy.shouldReuseRoute(snapshot(task, { id: 'b' }), snapshot(task, { id: 'a' })),
    ).toBe(true);
    expect(
      strategy.shouldReuseRoute(snapshot(note, { id: 'a' }), snapshot(task, { id: 'a' })),
    ).toBe(false);
  });

  it('conserve les données déjà présentes sur la route', () => {
    expect(recreateOnParamChange({ path: 'x', data: { title: 'X' } }).data).toEqual({
      title: 'X',
      recreateOnParamChange: true,
    });
  });
});
