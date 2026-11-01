import type {
  AccountType,
  BudgetState,
  Frequency,
  IncomeKind,
  Operation,
  OperationStatus,
  OperationType,
  ScheduleKind,
} from '../../core/api/models';

export const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: 'CURRENT', label: 'Compte courant', icon: 'landmark' },
  { value: 'SAVINGS', label: 'Épargne', icon: 'piggy-bank' },
  { value: 'CASH', label: 'Espèces', icon: 'banknote' },
];

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  CURRENT: 'Compte courant',
  SAVINGS: 'Épargne',
  CASH: 'Espèces',
};

export const OPERATION_TYPE_LABEL: Record<OperationType, string> = {
  INCOME: 'Revenu',
  EXPENSE: 'Dépense',
  PURCHASE_REFUND: 'Remboursement d’achat',
  TRANSFER: 'Virement',
  OPENING_BALANCE: 'Solde initial',
  ADJUSTMENT: 'Correction du solde',
  LOAN_GIVEN: 'Prêt accordé',
  LOAN_COLLECTED: 'Remboursement reçu',
  LOAN_TAKEN: 'Emprunt reçu',
  LOAN_REPAID: 'Remboursement versé',
};

/** Types saisis directement (le solde initial et les corrections naissent du compte). */
export const ENTRY_TYPES: { value: OperationType; label: string; icon: string }[] = [
  { value: 'EXPENSE', label: 'Dépense', icon: 'receipt' },
  { value: 'INCOME', label: 'Revenu', icon: 'trending-up' },
  { value: 'TRANSFER', label: 'Virement', icon: 'transfer' },
  { value: 'PURCHASE_REFUND', label: 'Remboursement d’achat', icon: 'restore' },
];

export const INCOME_KINDS: { value: IncomeKind; label: string }[] = [
  { value: 'SALARY', label: 'Salaire' },
  { value: 'BONUS', label: 'Prime' },
  { value: 'GIFT', label: 'Cadeau' },
  { value: 'SIDE_ACTIVITY', label: 'Activité ponctuelle' },
  { value: 'OTHER', label: 'Autre revenu' },
];

export function statusLabel(op: Pick<Operation, 'status' | 'type' | 'overdue'>): string {
  const labels: Record<OperationStatus, string> = {
    PLANNED: op.overdue ? 'En retard' : 'Prévue',
    COMPLETED: op.type === 'INCOME' ? 'Reçue' : op.type === 'EXPENSE' ? 'Payée' : 'Réalisée',
    CANCELLED: 'Annulée',
  };
  return labels[op.status];
}

/** Effet d'une opération pour l'utilisateur : entrée (+), sortie (−) ou mouvement interne (0). */
export function operationSign(op: Pick<Operation, 'type' | 'direction'>): 1 | -1 | 0 {
  if (op.type === 'TRANSFER') return 0;
  return op.direction === 'CREDIT' ? 1 : -1;
}

export const CATEGORY_ICONS: { value: string; label: string }[] = [
  { value: 'house', label: 'Maison' },
  { value: 'cart', label: 'Panier' },
  { value: 'repeat', label: 'Récurrent' },
  { value: 'utensils', label: 'Repas' },
  { value: 'health', label: 'Santé' },
  { value: 'monitor', label: 'Numérique' },
  { value: 'gift', label: 'Cadeau' },
  { value: 'shirt', label: 'Vêtement' },
  { value: 'scissors', label: 'Soins' },
  { value: 'car', label: 'Transport' },
  { value: 'party', label: 'Loisirs' },
  { value: 'more', label: 'Autre' },
  { value: 'coins', label: 'Argent' },
  { value: 'tag', label: 'Étiquette' },
];

export const SCHEDULE_KINDS: { value: ScheduleKind; label: string; icon: string }[] = [
  { value: 'SALARY', label: 'Salaire', icon: 'banknote' },
  { value: 'SUBSCRIPTION', label: 'Abonnement', icon: 'repeat' },
  { value: 'BILL', label: 'Charge ou facture', icon: 'receipt' },
  { value: 'INSTALLMENT', label: 'Paiement en plusieurs fois', icon: 'credit-card' },
  { value: 'OTHER', label: 'Autre', icon: 'more' },
];

/** « Chaque mois », « Tous les 3 mois », « Toutes les 2 semaines »… */
export function frequencyLabel(frequency: Frequency, interval: number): string {
  if (frequency === 'WEEKLY') return interval === 1 ? 'Chaque semaine' : `Toutes les ${interval} semaines`;
  if (frequency === 'MONTHLY') return interval === 1 ? 'Chaque mois' : `Tous les ${interval} mois`;
  return interval === 1 ? 'Chaque année' : `Tous les ${interval} ans`;
}

/** Couleur et libelle de l'etat du plafond variable. */
export const BUDGET_STATE: Record<BudgetState, { label: string; tone: string; bar: string }> = {
  NONE: { label: 'Aucun plafond défini', tone: 'text-muted', bar: 'var(--line-strong)' },
  OK: { label: 'Budget confortable', tone: 'text-success', bar: 'var(--success)' },
  WARNING: { label: 'Plafond bientôt atteint', tone: 'text-warning', bar: 'var(--q3-accent)' },
  OVER: { label: 'Plafond dépassé', tone: 'text-danger', bar: 'var(--danger)' },
};
