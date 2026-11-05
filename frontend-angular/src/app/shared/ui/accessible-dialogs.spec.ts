import { describe, expect, it, vi } from 'vitest';
import { nameDialogFromContent } from './accessible-dialogs';

function overlay(inner: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = `<div class="cdk-dialog-container" role="dialog">${inner}</div>`;
  return el;
}

describe('nameDialogFromContent', () => {
  it('le titre du contenu nomme le conteneur ; le role en double disparait', () => {
    const el = overlay('<form role="dialog" aria-labelledby="op-title"><h2 id="op-title">Nouvelle opération</h2></form>');
    const container = { _addAriaLabelledBy: vi.fn() };

    nameDialogFromContent(el, container);

    const host = el.querySelector('.cdk-dialog-container')!;
    expect(container._addAriaLabelledBy).toHaveBeenCalledWith('op-title');
    expect(host.getAttribute('aria-labelledby')).toBe('op-title');
    expect(el.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(el.querySelector('form')!.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('un nom donne par aria-label passe aussi au conteneur', () => {
    const el = overlay('<div role="dialog" aria-label="Palette de commandes"></div>');

    nameDialogFromContent(el, {});

    expect(el.querySelector('.cdk-dialog-container')!.getAttribute('aria-label')).toBe('Palette de commandes');
    expect(el.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  });

  it('une confirmation (alertdialog) donne son role, son nom et sa description au conteneur', () => {
    const el = overlay(
      '<div role="alertdialog" aria-labelledby="cf-title" aria-describedby="cf-msg">' +
        '<h2 id="cf-title">Suppression bloquée</h2><p id="cf-msg">Explication</p></div>',
    );

    nameDialogFromContent(el, {});

    const host = el.querySelector('.cdk-dialog-container')!;
    expect(host.getAttribute('role')).toBe('alertdialog');
    expect(host.getAttribute('aria-labelledby')).toBe('cf-title');
    expect(host.getAttribute('aria-describedby')).toBe('cf-msg');
    expect(el.querySelectorAll('[role="alertdialog"], [role="dialog"]')).toHaveLength(1);
  });

  it('un contenu sans role="dialog" est laisse tel quel', () => {
    const el = overlay('<section aria-labelledby="x"><h2 id="x">Titre</h2></section>');

    nameDialogFromContent(el, {});

    expect(el.querySelector('section')!.getAttribute('aria-labelledby')).toBe('x');
    expect(el.querySelector('.cdk-dialog-container')!.hasAttribute('aria-labelledby')).toBe(false);
  });
});
