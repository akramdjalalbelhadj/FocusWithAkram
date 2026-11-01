import { describe, expect, it } from 'vitest';
import type { GoalFeasibility } from '../../core/api/models';
import { feasibilityDetails, feasibilityNotes, feasibilitySentence } from './feasibility-text';

function feasibility(over: Partial<GoalFeasibility>): GoalFeasibility {
  return {
    goalId: 'g',
    verdict: 'NOT_FEASIBLE',
    evaluatedDate: '2027-01-01',
    feasibleDate: '2027-01-31',
    retainedDate: '2027-01-31',
    need: 400,
    reserved: 0,
    remainingToFund: 400,
    availableAtDate: 150,
    lowestAfterPurchase: -250,
    margin: -250,
    fromSavings: 0,
    affordableAtDate: 150,
    monthlyEffort: 125,
    dependsOnLateIncome: false,
    notes: [],
    ...over,
  };
}

const plain = (s: string) => s.replace(/[  ]/g, ' ');

describe('feasibility-text', () => {
  it('propose une date réaliste quand l’achat n’est pas compatible', () => {
    expect(plain(feasibilitySentence(feasibility({})))).toBe(
      'Votre achat de 400,00 € n’est pas compatible avec votre budget prévisionnel au 1er janvier 2027. ' +
        'Selon vos revenus et dépenses prévus, une date plus réaliste serait le 31 janvier 2027.',
    );
  });

  it('signale l’absence de date réaliste dans l’horizon', () => {
    expect(feasibilitySentence(feasibility({ feasibleDate: null }))).toContain('ni dans les 24 prochains mois');
  });

  it('explique le calcul et ses limites', () => {
    const rows = feasibilityDetails(feasibility({ fromSavings: 100 }));
    expect(rows.map((r) => r.label)).toContain('Pris sur l’épargne');
    expect(feasibilityNotes(feasibility({ notes: ['NO_CAP', 'LATE_INCOME'] }))).toHaveLength(2);
  });
});
