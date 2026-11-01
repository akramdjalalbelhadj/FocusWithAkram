import { describe, expect, it } from 'vitest';
import { routes } from '../routes/app.routes';
import { NAV } from './navigation';

describe('NAV', () => {
  it('chaque entree correspond a une route declaree', () => {
    const paths = new Set(routes.flatMap((r) => (r.children ?? [r]).map((c) => `/${c.path ?? ''}`)));
    for (const item of NAV) expect(paths).toContain(item.path);
  });

  it('les raccourcis « G puis touche » sont uniques', () => {
    const keys = NAV.flatMap((n) => (n.goKey ? [n.goKey] : []));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('la barre mobile garde au plus quatre entrees', () => {
    expect(NAV.filter((n) => n.mobile).length).toBeLessThanOrEqual(4);
  });
});
