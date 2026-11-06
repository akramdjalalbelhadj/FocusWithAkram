import { Injectable } from '@angular/core';
import { PageTourEngine } from '../../../../shared/ui/tour/page-tour';
import { NOTES_TOUR_STEPS } from './notes-tour-steps';

/**
 * Tutoriel de « Notes & idées » : demarre seul a la premiere visite de la liste des idees (parametre
 * `notesTutorialDone` faux), se relance par « Comment ça marche ? ». Termine ou passe, il est enregistre.
 */
@Injectable({ providedIn: 'root' })
export class NotesTourService extends PageTourEngine {
  protected readonly route = '/notes';
  /** La saisie rapide, puis la liste (ou son etat vide) une fois chargee. */
  protected readonly readyTargets = ['notes-capture', 'notes-list'];
  protected readonly tourSteps = NOTES_TOUR_STEPS;
  protected readonly setting = 'notesTutorialDone';
  protected readonly replayTarget = 'notes-tour-button';
}
