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
  | "ADJUSTMENT"
  | "LOAN_GIVEN"
  | "LOAN_COLLECTED"
  | "LOAN_TAKEN"
  | "LOAN_REPAID";
export type OperationStatus = "PLANNED" | "COMPLETED" | "CANCELLED";
export type Direction = "CREDIT" | "DEBIT";
export type IncomeKind = "SALARY" | "BONUS" | "GIFT" | "SIDE_ACTIVITY" | "OTHER";
export type ScheduleKind = "SALARY" | "SUBSCRIPTION" | "BILL" | "INSTALLMENT" | "OTHER";
export type Frequency = "WEEKLY" | "MONTHLY" | "YEARLY";
export type ScheduleStatus = "ACTIVE" | "PAUSED" | "ENDED";
export type BudgetState = "NONE" | "OK" | "WARNING" | "OVER";
export type ValueSource = "MONTH" | "DEFAULT" | "NONE";
export type LoanDirection = "LENT" | "BORROWED";
export type LoanStatus = "OPEN" | "SETTLED" | "WRITTEN_OFF" | "CANCELLED";
export type GoalStatus = "CONSIDERED" | "PLANNED" | "POSTPONED" | "PURCHASED" | "ABANDONED";
export type Verdict = "FEASIBLE" | "RISKY" | "NOT_FEASIBLE" | "UNKNOWN";
export type GoalNote = "NO_ACCOUNT" | "NO_INCOME" | "NO_CAP" | "TARGET_PASSED" | "LATE_INCOME";

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
  /** Absent pour une échéance calculée non encore enregistrée (`virtual`). */
  id: string | null;
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
  /** Échéancier dont l'opération est l'échéance `dueDate`. */
  scheduleId: string | null;
  dueDate: string | null;
  /** Échéance calculée, pas encore enregistrée : on la réalise, la saute ou l'ajuste depuis son échéancier. */
  virtual: boolean;
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
  essentialPlanned: number;
  variablePlanned: number;
  /** Achats d'objectifs : comptés dans les dépenses, hors plafond variable. */
  goalPurchasesPaid: number;
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
  budget: BudgetGauge;
  safetyReserve: number;
  /** Restes dus des prêts accordés en cours. */
  receivables: number;
  /** Restes dus des emprunts en cours. */
  debts: number;
}

/** Jauge du plafond variable : vert (OK), orange (WARNING, du seuil au plafond), rouge (OVER) ou NONE. */
export interface BudgetGauge {
  cap: number | null;
  used: number;
  remaining: number | null;
  percent: number | null;
  state: BudgetState;
}

export interface BudgetView {
  month: string;
  variableCap: number | null;
  capSource: ValueSource;
  savingsTarget: number | null;
  savingsTargetSource: ValueSource;
  warningPercent: number;
  totals: MonthTotals;
  essentialExpected: number;
  variableRemaining: number | null;
  variableUsedPercent: number | null;
  state: BudgetState;
  /** Revenus attendus − indispensables attendues − plafond variable (null sans plafond). */
  theoreticalSavings: number | null;
  incomes: Operation[];
  essentials: Operation[];
  plannedVariable: Operation[];
}

export interface BudgetBody {
  variableCap: number | null;
  savingsTarget: number | null;
}

export interface FinancePreferences {
  safetyReserve: number;
  savingsFloor: number;
  defaultVariableCap: number | null;
  defaultSavingsTarget: number | null;
  warningPercent: number;
}

export interface Schedule {
  id: string;
  label: string;
  type: "INCOME" | "EXPENSE";
  kind: ScheduleKind;
  account: AccountRef;
  category: CategoryRef | null;
  incomeKind: IncomeKind | null;
  amount: number;
  essential: boolean;
  frequency: Frequency;
  intervalCount: number;
  startDate: string;
  endDate: string | null;
  status: ScheduleStatus;
  notes: string | null;
  nextDueDate: string | null;
  monthlyEquivalent: number;
  annualEquivalent: number;
  hasOperations: boolean;
}

export interface ScheduleBody {
  label: string;
  type: "INCOME" | "EXPENSE";
  kind: ScheduleKind;
  accountId: string;
  categoryId: string | null;
  incomeKind: IncomeKind | null;
  amount: number;
  essential: boolean;
  frequency: Frequency;
  intervalCount: number;
  startDate: string;
  endDate: string | null;
  /** Paiement en plusieurs fois : nombre d'échéances (fixe la date de fin). */
  occurrences: number | null;
  notes: string | null;
}

export interface FinanceImportSummary {
  accountsCreated: number;
  accountsReused: number;
  categoriesCreated: number;
  categoriesReused: number;
  operationsCreated: number;
  operationsSkipped: number;
  schedulesCreated: number;
  schedulesSkipped: number;
  budgetsRestored: number;
  preferencesRestored: boolean;
  goalsCreated: number;
  goalsSkipped: number;
  loansCreated: number;
  loansSkipped: number;
}

/** Faisabilité d'un objectif calculée par la prévision de trésorerie (montants en euros). */
export interface GoalFeasibility {
  goalId: string;
  verdict: Verdict;
  evaluatedDate: string;
  /** Première date où l'achat est réalisable (null : aucune dans l'horizon). */
  feasibleDate: string | null;
  retainedDate: string | null;
  need: number;
  reserved: number;
  remainingToFund: number;
  availableAtDate: number;
  lowestAfterPurchase: number;
  margin: number;
  fromSavings: number;
  /** Montant le plus élevé réalisable à la date cible. */
  affordableAtDate: number;
  /** Épargne supplémentaire par mois qui rendrait l'achat réalisable à la date cible. */
  monthlyEffort: number | null;
  dependsOnLateIncome: boolean;
  notes: GoalNote[];
}

export interface Goal {
  id: string;
  name: string;
  category: CategoryRef | null;
  description: string | null;
  estimatedPrice: number;
  maxPrice: number | null;
  targetDate: string;
  important: boolean;
  urgent: boolean;
  quadrant: "Q1" | "Q2" | "Q3" | "Q4";
  status: GoalStatus;
  reservedAmount: number;
  fundedBySavings: boolean;
  position: number;
  notes: string | null;
  purchasedAmount: number | null;
  purchasedDate: string | null;
  purchaseOperationId: string | null;
  /** Absente pour un objectif acheté ou abandonné. */
  feasibility: GoalFeasibility | null;
  createdAt: string;
}

export interface GoalBody {
  name: string;
  categoryId: string | null;
  description: string | null;
  estimatedPrice: number;
  maxPrice: number | null;
  targetDate: string;
  important: boolean;
  urgent: boolean;
  status: "CONSIDERED" | "PLANNED" | "POSTPONED";
  fundedBySavings: boolean;
  notes: string | null;
}

export interface PurchaseBody {
  amount: number;
  date: string;
  accountId: string;
  categoryId: string | null;
  label: string | null;
}

export interface ForecastPoint {
  date: string;
  available: number;
  savings: number;
  afterGoals: number;
}

export interface Forecast {
  today: string;
  horizon: string;
  startAvailable: number;
  startSavings: number;
  safetyReserve: number;
  savingsFloor: number;
  capDefined: boolean;
  hasIncome: boolean;
  points: ForecastPoint[];
  lowest: ForecastPoint;
  goals: GoalFeasibility[];
  /** Remboursements attendus de prêts accordés : non comptés (scénario favorable). */
  expectedRepayments: number;
}

/** Prêt accordé ou emprunt, avec son état calculé par le serveur. */
export interface Loan {
  id: string;
  person: string;
  direction: LoanDirection;
  principal: number;
  startDate: string;
  dueDate: string | null;
  notes: string | null;
  repaid: number;
  writtenOffAmount: number;
  writtenOffDate: string | null;
  writtenOffReason: string | null;
  remaining: number;
  status: LoanStatus;
  overdue: boolean;
  movements: Operation[];
  createdAt: string;
}

export interface LoanBody {
  person: string;
  direction: LoanDirection;
  amount: number;
  startDate: string;
  dueDate: string | null;
  accountId: string | null;
  /** Faux : prêt antérieur au suivi, sans mouvement d'argent enregistré. */
  recordDisbursement: boolean;
  notes: string | null;
}

// ---- Analyses (lot 8) : alertes, statistiques, simulation ----

export type AlertCode =
  | "BUDGET_WARNING"
  | "BUDGET_OVER"
  | "INCOME_LATE"
  | "EXPENSES_OVERDUE"
  | "DUE_SOON"
  | "RESERVE_BREACH"
  | "GOAL_RISKY"
  | "GOAL_NOT_FEASIBLE"
  | "LOAN_OVERDUE_LENT"
  | "LOAN_OVERDUE_BORROWED";
export type AlertSeverity = "DANGER" | "WARNING" | "INFO";

/** Alerte calculée par le serveur ; le texte est formulé par l'interface à partir du code. */
export interface FinanceAlert {
  code: AlertCode;
  severity: AlertSeverity;
  label: string | null;
  date: string | null;
  amount: number | null;
  count: number | null;
  refId: string | null;
}

export interface MonthStat {
  month: string;
  incomeReceived: number;
  expensesPaid: number;
  essentialPaid: number;
  variablePaid: number;
  goalPurchasesPaid: number;
  savedToSavings: number;
  unspent: number;
}

export interface CategoryStat {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  amount: number;
  count: number;
  percent: number;
  children: { categoryId: string; name: string; amount: number }[];
}

export interface FinanceStatistics {
  from: string;
  to: string;
  months: MonthStat[];
  totals: {
    incomeReceived: number;
    expensesPaid: number;
    essentialPaid: number;
    variablePaid: number;
    goalPurchasesPaid: number;
    exceptionalPaid: number;
    refunds: number;
    savedToSavings: number;
    unspent: number;
    averageIncome: number;
    averageExpenses: number;
    /** Épargne mise de côté / revenus reçus, en % (null sans revenu). */
    savingsRate: number | null;
  };
  categories: CategoryStat[];
  topExpenses: Operation[];
  purchases: {
    goalId: string;
    name: string;
    date: string;
    estimated: number;
    actual: number;
    variance: number;
  }[];
  writtenOffLent: number;
  writtenOffBorrowed: number;
}

export interface SimulationBody {
  /** Ajouté à chaque salaire prévu (négatif pour une baisse). */
  salaryDelta?: number | null;
  /** Réduction mensuelle des dépenses variables anticipées. */
  variableReduction?: number | null;
  postponements?: { goalId: string; targetDate: string }[];
  excludedGoalIds?: string[];
  extraPurchase?: GoalBody | null;
}

export interface SimulationResult {
  baseline: Forecast;
  simulated: Forecast;
  extraGoalId: string | null;
}
