import type { RetirementData, CalculationResult, ValidationResult, IncomeSource } from '../types';
import { IncomeManager } from './IncomeManager.js';

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
   * Calculate monthly loan payment using standard loan formula
   * Formula: PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
   * Where: P = principal, r = monthly rate, n = number of payments
   */
  calculateLoanPayment(principal: number, annualRate: number, termYears: number): number {
    if (principal <= 0) throw new Error('Principal must be positive');
    if (annualRate < 0 || annualRate > 0.5) throw new Error('Annual rate must be between 0% and 50%');
    if (termYears <= 0 || termYears > 50) throw new Error('Term must be between 1 and 50 years');
    
    // Handle zero interest rate case
    if (annualRate === 0) {
      return principal / (termYears * 12);
    }
    
    const monthlyRate = annualRate / 12;
    const numberOfPayments = termYears * 12;
    
    const numerator = monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments);
    const denominator = Math.pow(1 + monthlyRate, numberOfPayments) - 1;
    
    const monthlyPayment = principal * (numerator / denominator);
    
    if (!isFinite(monthlyPayment)) {
      throw new Error('Loan calculation resulted in an invalid number');
    }
    
    return Math.round(monthlyPayment * 100) / 100;
  }

  /**
   * Apply inflation adjustment to a monetary amount over a number of years
   */
  applyInflation(amount: number, inflationRate: number, years: number): number {
    if (amount < 0) throw new Error('Amount cannot be negative');
    if (inflationRate < 0 || inflationRate > 0.15) throw new Error('Inflation rate must be between 0% and 15%');
    if (years < 0) throw new Error('Years cannot be negative');
    
    return amount * Math.pow(1 + inflationRate, years);
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

    // Validate monthly retirement spending
    if (!isFinite(data.monthlyRetirementSpending) || isNaN(data.monthlyRetirementSpending)) {
      errors.push('Monthly retirement spending must be a valid number');
    } else if (data.monthlyRetirementSpending < 0) {
      errors.push('Monthly retirement spending cannot be negative');
    }

    // Validate inflation rate
    if (!isFinite(data.inflationRate) || isNaN(data.inflationRate)) {
      errors.push('Inflation rate must be a valid number');
    } else if (data.inflationRate < 0 || data.inflationRate > 0.15) {
      errors.push('Inflation rate must be between 0% and 15%');
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

    // Validate income sources if present
    if (data.incomeSources && Array.isArray(data.incomeSources)) {
      const incomeManager = new IncomeManager();
      const incomeValidation = incomeManager.setIncomeSources(data.incomeSources);
      if (!incomeValidation.isValid) {
        errors.push(...incomeValidation.errors);
      }
    }

    // Check for unrealistic scenarios
    // Legacy monthly contribution validation (for backward compatibility)
    if (data.monthlyContribution !== undefined && isFinite(data.monthlyContribution) && data.monthlyContribution > 50000) {
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
   * Calculate future value with time-based income sources that have varying contributions
   * This method accounts for income sources that start/end at different times and have annual increases
   */
  calculateFutureValueWithTimeBasedIncome(
    data: RetirementData
  ): { totalSavings: number; totalContributions: number; interestEarned: number } {
    const yearsToRetirement = data.retirementAge - data.currentAge;
    const monthsToRetirement = yearsToRetirement * 12;
    
    let balance = data.currentSavings;
    let totalContributions = 0;
    
    const incomeManager = new IncomeManager();
    if (data.incomeSources && data.incomeSources.length > 0) {
      incomeManager.setIncomeSources(data.incomeSources);
    }
    
    const currentDate = new Date();
    const monthlyRate = data.expectedAnnualReturn / 12;
    
    // Calculate month by month to account for time-based income changes
    for (let month = 0; month < monthsToRetirement; month++) {
      // Calculate the date for this month
      const projectionDate = new Date(currentDate);
      projectionDate.setMonth(projectionDate.getMonth() + month);
      
      // Calculate age at this point in time
      const ageAtProjection = data.currentAge + (month / 12);
      
      // Get monthly contribution for this specific month
      let monthlyContribution = 0;
      if (data.incomeSources && data.incomeSources.length > 0) {
        monthlyContribution = incomeManager.calculateMonthlyContributions(projectionDate, ageAtProjection);
      } else if (data.monthlyContribution !== undefined) {
        // Backward compatibility with legacy data
        monthlyContribution = data.monthlyContribution;
      }
      
      // Apply monthly interest to current balance
      balance = balance * (1 + monthlyRate);
      
      // Add monthly contribution
      balance += monthlyContribution;
      totalContributions += monthlyContribution;
    }
    
    const interestEarned = balance - data.currentSavings - totalContributions;
    
    return {
      totalSavings: balance,
      totalContributions,
      interestEarned
    };
  }

  /**
   * Calculate average monthly contribution over the retirement period
   * This is used for simpler calculations when time-based precision isn't needed
   */
  calculateAverageMonthlyContribution(data: RetirementData): number {
    if (!data.incomeSources || data.incomeSources.length === 0) {
      return data.monthlyContribution || 0;
    }
    
    const yearsToRetirement = data.retirementAge - data.currentAge;
    const monthsToRetirement = yearsToRetirement * 12;
    
    const incomeManager = new IncomeManager();
    incomeManager.setIncomeSources(data.incomeSources);
    
    const currentDate = new Date();
    let totalContributions = 0;
    
    // Sample contributions at regular intervals to get an average
    const samplePoints = Math.min(monthsToRetirement, 120); // Sample up to 10 years worth of months
    const interval = monthsToRetirement / samplePoints;
    
    for (let i = 0; i < samplePoints; i++) {
      const month = Math.floor(i * interval);
      const projectionDate = new Date(currentDate);
      projectionDate.setMonth(projectionDate.getMonth() + month);
      
      const ageAtProjection = data.currentAge + (month / 12);
      const monthlyContribution = incomeManager.calculateMonthlyContributions(projectionDate, ageAtProjection);
      totalContributions += monthlyContribution;
    }
    
    return totalContributions / samplePoints;
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
    
    // Use time-based calculation for more accurate results with multiple income sources
    let totalSavings: number;
    let totalContributions: number;
    let interestEarned: number;
    
    const hasTimeBased = data.incomeSources && data.incomeSources.length > 0 && this.hasTimeBasedIncome(data.incomeSources);
    
    if (hasTimeBased) {
      // Use precise month-by-month calculation for time-based income
      const timeBasedResult = this.calculateFutureValueWithTimeBasedIncome(data);
      totalSavings = timeBasedResult.totalSavings;
      totalContributions = timeBasedResult.totalContributions;
      interestEarned = timeBasedResult.interestEarned;
    } else {
      // Use simpler calculation for constant contributions
      const monthlyContribution = this.calculateAverageMonthlyContribution(data);
      totalSavings = this.calculateFutureValue(
        data.currentSavings,
        monthlyContribution,
        data.expectedAnnualReturn,
        yearsToRetirement
      );
      totalContributions = monthlyContribution * yearsToRetirement * 12;
      interestEarned = totalSavings - data.currentSavings - totalContributions;
    }

    // Calculate monthly retirement income (4% rule or based on spending needs)
    const monthlyRetirementIncome = data.monthlyRetirementSpending || this.calculateMonthlyIncome(totalSavings);

    // Calculate net monthly income from all sources (current income, not retirement income)
    let netMonthlyIncome = 0;
    if (data.incomeSources && data.incomeSources.length > 0) {
      const incomeManager = new IncomeManager();
      incomeManager.setIncomeSources(data.incomeSources);
      netMonthlyIncome = incomeManager.calculateMonthlyIncome(new Date(), data.currentAge);
    }

    return {
      totalSavings: Math.round(totalSavings * 100) / 100, // Round to 2 decimal places
      monthlyRetirementIncome: Math.round(monthlyRetirementIncome * 100) / 100,
      yearsToRetirement,
      totalContributions: Math.round(totalContributions * 100) / 100,
      interestEarned: Math.round(interestEarned * 100) / 100,
      monthlyProjections: [], // Will be implemented in Phase 2
      yearlyProjections: [], // Will be implemented in Phase 2
      netMonthlyIncome: Math.round(netMonthlyIncome * 100) / 100
    };
  }

  /**
   * Check if income sources have time-based characteristics that require month-by-month calculation
   */
  private hasTimeBasedIncome(incomeSources: IncomeSource[]): boolean {
    return incomeSources.some(source => 
      source.startDate || 
      source.endDate || 
      source.annualIncrease || 
      source.type === 'fixed_period' || 
      source.type === 'one_time'
    );
  }
}