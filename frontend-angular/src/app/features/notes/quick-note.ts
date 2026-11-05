import { Injector } from '@angular/core';

/**
 * Ouvre la saisie rapide d'une idee (raccourci I, palette) en chargeant le module des notes a la demande :
 * l'editeur et ses dependances ne pesent pas sur le chargement initial.
 */
export async function openQuickNote(injector: Injector): Promise<void> {
  const { NoteActions } = await import('./services/note-actions.service');
  await injector.get(NoteActions).quickCapture();
}
