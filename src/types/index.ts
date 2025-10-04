// Phase 1 Type Definitions

/**
 * User's financial and retirement planning data
 */
export interface UserData {
  /** Current age of the user */
  currentAge: number;

  /**
   * Personal target retirement age - when the user plans to stop working.
   * This is separate from government CPF milestones (age 55 for RA creation,
   * age 65/70 for CPF Life payouts). See CPFData.cpfLifePayoutAge for CPF-specific age.
   */
  retirementAge: number;

  /** Current total savings/portfolio value */
  currentSavings: number;

  /** Expected annual return rate (as decimal, e.g., 0.07 for 7%) */
  expectedReturnRate: number;

  /** Expected annual inflation rate (as decimal, e.g., 0.03 for 3%) */
  inflationRate: number;
  // Phase 2 additions
  incomeSources?: IncomeStream[];
  oneOffReturns?: OneOffReturn[];
  // Phase 4 additions
  expenses?: RetirementExpense[];
  // Phase 5 additions
  loans?: Loan[];
  oneTimeExpenses?: OneTimeExpense[];
  // Phase 6 additions
  cpf?: CPFData;
}

export interface RetirementData {
  exportDate: string;
  user: UserData;
}

export interface CalculationResult {
  futureValue: number;
  totalContributions: number;
  investmentGrowth: number;
  inflationAdjustedValue: number;
  yearsToRetirement: number;
  // Phase 4 additions
  yearsUntilDepletion: number | null; // null means sustainable/never depletes
  depletionAge: number | null; // exact age when portfolio depletes, null if sustainable
  sustainabilityWarning: boolean; // true if withdrawal rate is too high (>4-5%)
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Phase 2 Type Definitions

export type IncomeType = 'salary' | 'rental' | 'dividend' | 'business' | 'custom';
export type IncomeFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface IncomeStream {
  id: string;
  name: string;
  type: IncomeType;
  amount: number;
  frequency: IncomeFrequency;
  customFrequencyDays?: number; // Only used when frequency is 'custom'
  startDate: string; // YYYY-MM format
  endDate?: string; // YYYY-MM format or undefined for ongoing
  cpfEligible?: boolean; // Whether this income is subject to CPF contributions (default: false, typically true for salary)
}

export interface OneOffReturn {
  id: string;
  date: string; // YYYY-MM format
  amount: number;
  description: string;
}

// Phase 3 Type Definitions

export interface MonthlyDataPoint {
  monthIndex: number; // 0-based index from start
  year: number;
  month: number; // 1-12
  age: number;
  income: number; // Income received this month
  expenses: number; // Expenses paid this month
  contributions: number; // Total net contributions up to this month (income - expenses)
  portfolioValue: number; // Portfolio value at end of month
  growth: number; // Growth this month (investment returns)
  cpfLifeIncome?: number; // CPF Life income this month (from age 65, if CPF enabled)
  cpf?: CPFMonthlySnapshot; // CPF tracking (optional, only if CPF enabled)
}

// Phase 4 Type Definitions

export type ExpenseCategory = 'living' | 'healthcare' | 'travel' | 'other';

export interface RetirementExpense {
  id: string;
  name: string;
  category: ExpenseCategory;
  monthlyAmount: number;
  inflationRate: number; // Annual inflation rate as decimal (e.g., 0.03 for 3%)
  startDate?: string; // YYYY-MM format, optional - defaults to current month
  endDate?: string; // YYYY-MM format, optional - defaults to ongoing
}

export interface PostRetirementDataPoint {
  monthIndex: number; // 0-based index from retirement
  year: number;
  month: number; // 1-12
  age: number;
  expenses: number; // Total expenses this month (inflation-adjusted)
  cpfLifeIncome?: number; // CPF Life income this month (from age 65)
  portfolioValue: number; // Portfolio value at end of month
  growth: number; // Investment growth this month
}

// Phase 5 Type Definitions

export type LoanCategory = 'housing' | 'auto' | 'personal' | 'other';

export interface Loan {
  id: string;
  name: string;
  category: LoanCategory;
  principal: number; // Loan amount
  interestRate: number; // Annual interest rate as decimal (e.g., 0.05 for 5%)
  termMonths: number; // Loan term in months
  startDate: string; // YYYY-MM format
  extraPayments?: ExtraPayment[]; // Optional early repayment
  useCPF?: boolean; // Whether to use CPF OA for this loan payment (default: false for backward compatibility)
  cpfPercentage?: number; // Percentage of payment to pay from CPF OA (0-100, default: 100)
}

export interface ExtraPayment {
  date: string; // YYYY-MM format
  amount: number;
}

export interface OneTimeExpense {
  id: string;
  name: string;
  amount: number;
  date: string; // YYYY-MM format
  category: ExpenseCategory;
  description?: string;
}

// Phase 6 Type Definitions (CPF)

export interface CPFAccounts {
  ordinaryAccount: number;
  specialAccount: number;
  medisaveAccount: number;
  retirementAccount: number;
}

export interface CPFContribution {
  employee: number;
  employer: number;
  total: number;
  allocation: {
    toOA: number;
    toSA: number;
    toMA: number;
    toRA: number;
  };
}

/**
 * CPF (Central Provident Fund) configuration data for Singapore residents
 */
export interface CPFData {
  /** Whether CPF integration is enabled */
  enabled: boolean;

  /** Current balances in each CPF account */
  currentBalances: CPFAccounts;

  /** Retirement sum target at age 55 (basic/full/enhanced) */
  retirementSumTarget: 'basic' | 'full' | 'enhanced';

  /** CPF Life plan type (affects payout structure) */
  cpfLifePlan: 'standard' | 'basic' | 'escalating';

  /**
   * Government-mandated age when CPF Life payouts begin (65 or 70).
   * This is separate from the user's personal retirement age.
   * Default: 65 (can be deferred to 70 for higher monthly payouts)
   */
  cpfLifePayoutAge?: 65 | 70;

  /** Whether to use manual override for CPF calculations */
  manualOverride: boolean;
}

export interface CPFMonthlySnapshot {
  monthIndex: number;
  age: number;
  accounts: CPFAccounts;
  monthlyContribution: CPFContribution;
  monthlyInterest: {
    oa: number;
    sa: number;
    ma: number;
    ra: number;
    extraInterest: number;
    total: number;
  };
  yearToDateContributions: number;
}
