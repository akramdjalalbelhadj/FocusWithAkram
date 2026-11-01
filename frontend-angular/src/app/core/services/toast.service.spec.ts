import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../api/app-error';
import { ToastService } from './toast.service';

const problem = { status: 409, code: 'CONFLICT', detail: 'Conflit' };

describe('ToastService.errorFrom', () => {
  let toast: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    toast = TestBed.inject(ToastService);
  });

  it('ne repete pas une erreur deja affichee par l’intercepteur', () => {
    toast.errorFrom(new AppError(problem, false, true));
    expect(toast.toasts()).toHaveLength(0);
  });

  it('affiche une erreur que l’appelant doit traiter', () => {
    toast.errorFrom(new AppError({ ...problem, status: 422, detail: 'Règle métier' }));
    expect(toast.toasts().map((t) => t.message)).toEqual(['Règle métier']);
  });

  it('remplace une erreur inattendue par un message lisible', () => {
    toast.errorFrom(new SyntaxError('Unexpected token'), 'Fichier JSON invalide.');
    expect(toast.toasts().map((t) => t.message)).toEqual(['Fichier JSON invalide.']);
  });
});
