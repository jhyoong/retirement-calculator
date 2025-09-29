import type { RetirementData, CalculationResult, ValidationResult } from '../types';

/**
 * CalculationEngine handles all retirement calculation logic
 * Implements compound interest calculations and retirement income projections
 */
export class CalculationEngine {
  
  /**
   * Calculate future value using compound interest formula with monthly contributions
   * Formula: FV = PV(1+r)^n + PMT[((1+r)^n - 1)/r]
   * Where: PV = present value, PMT = monthly payment, r = monthly rate, n = number of months
   */
  calculateFutureValue(
    principal: number, 
    monthlyPayment: number, 
    annualRate: number, 
    years: number
  ): number {
    // Handle edge cases
    if (years <= 0) return principal;
    if (annualRate < 0) throw new Error('Annual return rate cannot be negative');
    if (principal < 0) throw new Error('Principal cannot be negative');
    if (monthlyPayment < 0) throw new Error('Monthly payment cannot be negative');
    
    // Convert annual rate to monthly rate
    const monthlyRate = annualRate / 12;
    const numberOfMonths = years * 12;
    
    // Handle zero interest rate case
    if (monthlyRate === 0) {
      return principal + (monthlyPayment * numberOfMonths);
    }
    
    // Calculate compound growth of principal
    const principalGrowth = principal * Math.pow(1 + monthlyRate, numberOfMonths);
    
    // Calculate future value of monthly contributions (annuity)
    const contributionGrowth = monthlyPayment * 
      ((Math.pow(1 + monthlyRate, numberOfMonths) - 1) / monthlyRate);
    
    return principalGrowth + contributionGrowth;
  }

  /**
   * Calculate monthly retirement income using 4% withdrawal rule
   * This is a conservative estimate assuming 4% annual withdrawal rate
   */
  calculateMonthlyIncome(totalSavings: number, withdrawalRate: number = 0.04): number {
    if (totalSavings < 0) throw new Error('Total savings cannot be negative');
    if (withdrawalRate < 0 || withdrawalRate > 1) {
      throw new Error('Withdrawal rate must be between 0 and 1');
    }
    
    const monthlyIncome = (totalSavings * withdrawalRate) / 12;
    return Math.round(monthlyIncome * 100) / 100;
  }

  /**
   * Validate all input data for retirement calculations
   */
  validateInputs(data: RetirementData): ValidationResult {
    const errors: string[] = [];

    // Validate current age
    if (!Number.isInteger(data.currentAge) || data.currentAge < 18 || data.currentAge > 100) {
      errors.push('Current age must be between 18 and 100 years');
    }

    // Validate retirement age
    if (!Number.isInteger(data.retirementAge) || data.retirementAge <= data.currentAge || data.retirementAge > 100) {
      errors.push('Retirement age must be greater than current age and not exceed 100 years');
    }

    // Validate current savings
    if (data.currentSavings < 0) {
      errors.push('Current savings cannot be negative');
    }

    // Validate monthly contribution
    if (data.monthlyContribution < 0) {
      errors.push('Monthly contribution cannot be negative');
    }

    // Validate expected annual return
    if (data.expectedAnnualReturn < 0 || data.expectedAnnualReturn > 0.20) {
      errors.push('Expected annual return must be between 0% and 20%');
    }

    // Check for unrealistic scenarios
    if (data.monthlyContribution > 50000) {
      errors.push('Monthly contribution seems unrealistically high (over $50,000)');
    }

    if (data.currentSavings > 100000000) {
      errors.push('Current savings seems unrealistically high (over $100 million)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Perform complete retirement calculation
   */
  calculateRetirement(data: RetirementData): CalculationResult {
    // Validate inputs first
    const validation = this.validateInputs(data);
    if (!validation.isValid) {
      throw new Error(`Invalid input data: ${validation.errors.join(', ')}`);
    }

    const yearsToRetirement = data.retirementAge - data.currentAge;
    
    // Calculate total savings at retirement
    const totalSavings = this.calculateFutureValue(
      data.currentSavings,
      data.monthlyContribution,
      data.expectedAnnualReturn,
      yearsToRetirement
    );

    // Calculate monthly retirement income
    const monthlyRetirementIncome = this.calculateMonthlyIncome(totalSavings);

    // Calculate total contributions made
    const totalContributions = data.monthlyContribution * yearsToRetirement * 12;

    // Calculate interest earned
    const interestEarned = totalSavings - data.currentSavings - totalContributions;

    return {
      totalSavings: Math.round(totalSavings * 100) / 100, // Round to 2 decimal places
      monthlyRetirementIncome: Math.round(monthlyRetirementIncome * 100) / 100,
      yearsToRetirement,
      totalContributions: Math.round(totalContributions * 100) / 100,
      interestEarned: Math.round(interestEarned * 100) / 100
    };
  }
}