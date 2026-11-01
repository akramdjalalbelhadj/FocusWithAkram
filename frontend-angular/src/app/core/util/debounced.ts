import { DestroyRef, Signal, effect, inject, signal, untracked } from '@angular/core';

/**
 * Copie d'un signal qui ne suit sa source qu'apres `ms` millisecondes sans changement.
 * Sert aux champs de recherche : une requete par pause de frappe, pas une par touche.
 * A appeler dans un contexte d'injection.
 */
export function debounced<T>(source: Signal<T>, ms = 250): Signal<T> {
  const out = signal(untracked(source));
  let timer: ReturnType<typeof setTimeout> | undefined;
  effect(() => {
    const value = source();
    clearTimeout(timer);
    timer = setTimeout(() => out.set(value), ms);
  });
  inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  return out.asReadonly();
}
