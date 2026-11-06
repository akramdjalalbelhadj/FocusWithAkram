import { Injectable } from '@angular/core';
import { PageTourEngine } from '../../../../shared/ui/tour/page-tour';
import { MATRIX_TOUR_STEPS } from './matrix-tour-steps';

/**
 * Tutoriel de la matrice d'Eisenhower : demarre seul a la premiere visite de la matrice (parametre
 * `matrixTutorialDone` faux), se relance par « Comment ça marche ? ». Termine ou passe, il est enregistre.
 */
@Injectable({ providedIn: 'root' })
export class MatrixTourService extends PageTourEngine {
  protected readonly route = '/matrix';
  /** Le bouton de creation, puis les cases une fois la matrice chargee. */
  protected readonly readyTargets = ['matrix-new-task', 'matrix-grid'];
  protected readonly tourSteps = MATRIX_TOUR_STEPS;
  protected readonly setting = 'matrixTutorialDone';
  protected readonly replayTarget = 'matrix-tour-button';
}
