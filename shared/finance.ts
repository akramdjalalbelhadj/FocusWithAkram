// Contrats du module « Mes achats », alignés sur les DTO du backend (com.focusflow.finance.dto).
// Les montants sont des nombres décimaux au centime ; aucun calcul financier n'est fait côté client :
// les totaux, soldes et indicateurs viennent du serveur.

export type AccountType = "CURRENT" | "SAVINGS" | "CASH";
export type OperationType =
  | "INCOME"
  | "EXPENSE"
  | "PURCHASE_REFUND"
  | "TRANSFER"
  | "OPENING_BALANCE"
  | "ADJUSTMENT";
export type OperationStatus = "PLANNED" | "COMPLETED" | "CANCELLED";
export type Direction = "CREDIT" | "DEBIT";
export type IncomeKind = "SALARY" | "BONUS" | "GIFT" | "SIDE_ACTIVITY" | "OTHER";

export interface FinanceAccount {
  id: string;
  name: string;
  type: AccountType;
  archived: boolean;
  position: number;
  balance: number;
  hasOperations: boolean;
}

export interface CreateAccountBody {
  name: string;
  type: AccountType;
  openingBalance: number | null;
  openingDate: string | null;
}

export interface UpdateAccountBody {
  name: string;
  type: AccountType;
  archived: boolean;
  position: number;
}

export interface FinanceCategory {
  id: string;
  parentId: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  position: number;
  archived: boolean;
  operationCount: number;
  children: FinanceCategory[];
}

export interface CategoryBody {
  name: string;
  parentId: string | null;
  icon: string | null;
  color: string | null;
  position: number;
  archived: boolean;
}

export interface AccountRef {
  id: string;
  name: string;
  type: AccountType;
}

export interface CategoryRef {
  id: string;
  name: string;
  rootId: string;
  rootName: string;
  icon: string | null;
  color: string | null;
}

export interface Operation {
  id: string;
  account: AccountRef;
  targetAccount: AccountRef | null;
  type: OperationType;
  status: OperationStatus;
  direction: Direction;
  /** Date locale AAAA-MM-JJ. */
  date: string;
  amount: number;
  /** Montant prévu, conservé quand une opération prévue a été réalisée. */
  plannedAmount: number | null;
  category: CategoryRef | null;
  incomeKind: IncomeKind | null;
  label: string;
  description: string | null;
  essential: boolean;
  exceptional: boolean;
  refundOfId: string | null;
  /** Opération prévue dont la date est passée. */
  overdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OperationBody {
  accountId: string;
  type: OperationType;
  status: OperationStatus;
  date: string;
  amount: number;
  label: string;
  description: string | null;
  categoryId: string | null;
  incomeKind: IncomeKind | null;
  essential: boolean;
  exceptional: boolean;
  targetAccountId: string | null;
  refundOfId: string | null;
}

export interface OperationQuery {
  from?: string;
  to?: string;
  accountId?: string;
  type?: OperationType[];
  status?: OperationStatus[];
  categoryId?: string;
  essential?: boolean;
  exceptional?: boolean;
  q?: string;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  size?: number;
}

export interface MonthTotals {
  incomeExpected: number;
  incomeReceived: number;
  expensesPaid: number;
  essentialPaid: number;
  variablePaid: number;
  exceptionalPaid: number;
  refunds: number;
  expensesPlanned: number;
  savedToSavings: number;
  unspent: number;
}

export interface CategoryTotal {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  amount: number;
  count: number;
}

export interface FinanceOverview {
  /** Mois AAAA-MM. */
  month: string;
  today: string;
  accounts: FinanceAccount[];
  availableBalance: number;
  savingsBalance: number;
  totals: MonthTotals;
  byCategory: CategoryTotal[];
  upcoming: Operation[];
  overdueCount: number;
}

export interface FinanceImportSummary {
  accountsCreated: number;
  accountsReused: number;
  categoriesCreated: number;
  categoriesReused: number;
  operationsCreated: number;
  operationsSkipped: number;
}
