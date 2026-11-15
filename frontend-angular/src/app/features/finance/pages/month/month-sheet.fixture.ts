import { CategoryRef, MonthSheet } from '../../../../core/api/models';

/** Feuille de mois de test, partagee par Mon mois et Details du mois. */
const housing: CategoryRef = {
  id: 'c1',
  name: 'Logement',
  rootId: 'c1',
  rootName: 'Logement',
  icon: 'house',
  color: null,
};
const groceries: CategoryRef = { ...housing, id: 'c2', name: 'Courses', rootId: 'c2', rootName: 'Courses' };

export function sheet(month: string, overrides: Partial<MonthSheet> = {}): MonthSheet {
  return {
    month,
    today: `${month}-05`,
    period: 'CURRENT',
    account: {
      id: 'a1',
      name: 'Compte',
      type: 'CURRENT',
      archived: false,
      position: 0,
      balance: 1234.5,
      hasOperations: true,
    },
    incomes: [
      {
        key: `s1/${month}-28`,
        scheduleId: 's1',
        dueDate: `${month}-28`,
        operationId: 'o1',
        label: 'Salaire',
        category: null,
        incomeKind: 'SALARY',
        date: `${month}-03`,
        planned: 2290,
        actual: 2240,
        difference: -50,
        status: 'DONE',
        comment: 'Absence de deux jours',
        adjusted: false,
        essential: false,
      },
    ],
    fixed: [
      {
        key: `s2/${month}-05`,
        scheduleId: 's2',
        dueDate: `${month}-05`,
        operationId: null,
        label: 'Loyer',
        category: housing,
        incomeKind: null,
        date: `${month}-05`,
        planned: 350,
        actual: null,
        difference: null,
        status: 'PLANNED',
        comment: null,
        adjusted: false,
        essential: true,
      },
    ],
    variable: [
      {
        envelopeId: 'e1',
        label: 'Courses',
        category: groceries,
        cap: 300,
        spent: 345,
        remaining: -45,
        exceeded: true,
        comment: null,
        commentRequired: true,
        operationCount: 6,
      },
    ],
    others: [],
    totals: {
      incomePlanned: 2290,
      incomeActual: 2240,
      fixedPlanned: 350,
      fixedActual: 0,
      variablePlanned: 300,
      variableActual: 345,
      othersActual: 0,
      expensesPlanned: 650,
      expensesActual: 345,
      savingsActual: 1895,
    },
    savingsTarget: 300,
    ...overrides,
  };
}
