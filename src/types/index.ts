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
}

export interface RetirementData {
  version: string;
  exportDate: string;
  user: UserData;
}

export interface CalculationResult {
  futureValue: number;
  totalContributions: number;
  investmentGrowth: number;
  inflationAdjustedValue: number;
  yearsToRetirement: number;
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
  contributions: number; // Total contributions up to this month
  portfolioValue: number; // Portfolio value at end of month
  growth: number; // Growth this month (investment returns)
}
