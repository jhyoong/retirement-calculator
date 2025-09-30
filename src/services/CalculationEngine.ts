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
    
    // Handle extreme values that could cause overflow
    if (principal > Number.MAX_SAFE_INTEGER / 1000) {
      throw new Error('Principal amount is too large for accurate calculation');
    }
    if (monthlyPayment > Number.MAX_SAFE_INTEGER / 1000) {
      throw new Error('Monthly payment is too large for accurate calculation');
    }
    if (annualRate > 1) {
      throw new Error('Annual return rate over 100% is not supported');
    }
    if (years > 200) {
      throw new Error('Calculation period over 200 years is not supported');
    }
    
    // Convert annual rate to monthly rate
    const monthlyRate = annualRate / 12;
    const numberOfMonths = years * 12;
    
    // Handle zero interest rate case
    if (monthlyRate === 0) {
      const result = principal + (monthlyPayment * numberOfMonths);
      if (!isFinite(result)) {
        throw new Error('Calculation resulted in an invalid number');
      }
      return result;
    }
    
    // Check for potential overflow in compound interest calculation
    const maxExponent = Math.log(Number.MAX_SAFE_INTEGER) / Math.log(1 + monthlyRate);
    if (numberOfMonths > maxExponent) {
      throw new Error('Calculation period is too long and would cause overflow');
    }
    
    // Calculate compound growth of principal
    const compoundFactor = Math.pow(1 + monthlyRate, numberOfMonths);
    if (!isFinite(compoundFactor)) {
      throw new Error('Compound interest calculation resulted in overflow');
    }
    
    const principalGrowth = principal * compoundFactor;
    
    // Calculate future value of monthly contributions (annuity)
    const contributionGrowth = monthlyPayment * ((compoundFactor - 1) / monthlyRate);
    
    const result = principalGrowth + contributionGrowth;
    
    // Final validation
    if (!isFinite(result) || result < 0) {
      throw new Error('Calculation resulted in an invalid number');
    }
    
    return result;
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

    // Check for NaN or invalid numbers
    if (!isFinite(data.currentAge) || isNaN(data.currentAge)) {
      errors.push('Current age must be a valid number');
    } else if (!Number.isInteger(data.currentAge) || data.currentAge < 18 || data.currentAge > 100) {
      errors.push('Current age must be between 18 and 100 years');
    }

    if (!isFinite(data.retirementAge) || isNaN(data.retirementAge)) {
      errors.push('Retirement age must be a valid number');
    } else if (!Number.isInteger(data.retirementAge) || data.retirementAge <= data.currentAge || data.retirementAge > 100) {
      errors.push('Retirement age must be greater than current age and not exceed 100 years');
    }

    if (!isFinite(data.currentSavings) || isNaN(data.currentSavings)) {
      errors.push('Current savings must be a valid number');
    } else if (data.currentSavings < 0) {
      errors.push('Current savings cannot be negative');
    }

    if (!isFinite(data.monthlyContribution) || isNaN(data.monthlyContribution)) {
      errors.push('Monthly contribution must be a valid number');
    } else if (data.monthlyContribution < 0) {
      errors.push('Monthly contribution cannot be negative');
    }

    if (!isFinite(data.expectedAnnualReturn) || isNaN(data.expectedAnnualReturn)) {
      errors.push('Expected annual return must be a valid number');
    } else if (data.expectedAnnualReturn < 0 || data.expectedAnnualReturn > 0.20) {
      errors.push('Expected annual return must be between 0% and 20%');
    }

    // Check for extreme values that could cause calculation issues
    if (isFinite(data.currentSavings) && data.currentSavings > Number.MAX_SAFE_INTEGER / 1000) {
      errors.push('Current savings amount is too large for accurate calculation');
    }

    if (isFinite(data.monthlyContribution) && data.monthlyContribution > Number.MAX_SAFE_INTEGER / 1000) {
      errors.push('Monthly contribution amount is too large for accurate calculation');
    }

    // Check for unrealistic scenarios
    if (isFinite(data.monthlyContribution) && data.monthlyContribution > 50000) {
      errors.push('Monthly contribution seems unrealistically high (over $50,000)');
    }

    if (isFinite(data.currentSavings) && data.currentSavings > 100000000) {
      errors.push('Current savings seems unrealistically high (over $100 million)');
    }

    // Check for very long retirement periods that could cause overflow
    if (isFinite(data.currentAge) && isFinite(data.retirementAge)) {
      const yearsToRetirement = data.retirementAge - data.currentAge;
      if (yearsToRetirement > 82) {
        errors.push('Retirement period over 82 years may cause calculation issues');
      }
    }

    // Validate lastUpdated if present
    if (data.lastUpdated && !(data.lastUpdated instanceof Date)) {
      const dateStr = typeof data.lastUpdated === 'string' ? data.lastUpdated : String(data.lastUpdated);
      if (isNaN(Date.parse(dateStr))) {
        errors.push('Last updated timestamp is invalid');
      }
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