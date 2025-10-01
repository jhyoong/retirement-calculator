// Phase 1 Type Definitions

export interface UserData {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlyContribution: number;
  expectedReturnRate: number;
  inflationRate: number;
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
