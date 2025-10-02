// Phase 1 Type Definitions

export interface UserData {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlyContribution: number; // Kept for backward compatibility
  expectedReturnRate: number;
  inflationRate: number;
  // Phase 2 additions
  incomeSources?: IncomeStream[];
  oneOffReturns?: OneOffReturn[];
  // Phase 4 additions
  expenses?: RetirementExpense[];
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
}

// Phase 4 Type Definitions

export type ExpenseCategory = 'living' | 'healthcare' | 'travel' | 'other';

export interface RetirementExpense {
  id: string;
  name: string;
  category: ExpenseCategory;
  monthlyAmount: number;
  inflationRate: number; // Annual inflation rate as decimal (e.g., 0.03 for 3%)
  startAge?: number; // Optional, defaults to current age
  endAge?: number; // Optional, defaults to max projection age
}

export interface PostRetirementDataPoint {
  monthIndex: number; // 0-based index from retirement
  year: number;
  month: number; // 1-12
  age: number;
  expenses: number; // Total expenses this month (inflation-adjusted)
  portfolioValue: number; // Portfolio value at end of month
  growth: number; // Investment growth this month
}
