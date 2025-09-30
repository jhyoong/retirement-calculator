// Core data types for the retirement calculator
// This file will contain all TypeScript interfaces and types

export interface IncomeSource {
  id: string;
  name: string;
  type: 'regular_job' | 'fixed_period' | 'one_time' | 'rental' | 'investment';
  amount: number;
  frequency: 'monthly' | 'annual' | 'one_time';
  startDate?: Date;
  endDate?: Date;
  annualIncrease?: number;
  contributionPercentage?: number;
  expectedReturn?: number;
}

export interface Expense {
  id: string;
  name: string;
  type: 'regular' | 'loan' | 'annual' | 'one_time';
  amount: number;
  frequency: 'monthly' | 'annual' | 'one_time';
  startDate?: Date;
  endDate?: Date;
  inflationAdjusted: boolean;
  loanDetails?: {
    principal: number;
    interestRate: number;
    termYears: number;
  };
}

export interface RetirementData {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  expectedAnnualReturn: number;
  inflationRate: number;
  monthlyRetirementSpending: number;
  incomeSources: IncomeSource[];
  expenses: Expense[];
  lastUpdated: Date;
  // Legacy field for backward compatibility
  monthlyContribution?: number;
}

export interface MonthlyProjection {
  month: Date;
  age: number;
  grossIncome: number;
  totalExpenses: number;
  netContribution: number;
  balance: number;
  interestEarned: number;
  isRetired: boolean;
  monthlyWithdrawal?: number;
}

export interface CalculationResult {
  totalSavings: number;
  monthlyRetirementIncome: number;
  yearsToRetirement: number;
  totalContributions: number;
  interestEarned: number;
  monthlyProjections: MonthlyProjection[];
  yearlyProjections: MonthlyProjection[];
  netMonthlyIncome: number;
}

export interface ExportData {
  version: string;
  exportDate: Date;
  userData: RetirementData;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}