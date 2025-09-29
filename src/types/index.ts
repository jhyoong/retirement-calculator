// Core data types for the retirement calculator
// This file will contain all TypeScript interfaces and types

export interface RetirementData {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlyContribution: number;
  expectedAnnualReturn: number;
  lastUpdated: Date;
}

export interface CalculationResult {
  totalSavings: number;
  monthlyRetirementIncome: number;
  yearsToRetirement: number;
  totalContributions: number;
  interestEarned: number;
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