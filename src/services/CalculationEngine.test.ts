import { describe, it, expect, beforeEach } from 'vitest';
import { CalculationEngine } from './CalculationEngine';
import type { RetirementData } from '../types';

describe('CalculationEngine', () => {
  let engine: CalculationEngine;

  beforeEach(() => {
    engine = new CalculationEngine();
  });

  describe('calculateFutureValue', () => {
    it('should calculate future value with compound interest and monthly contributions', () => {
      // Test case: $10,000 principal, $500/month, 7% annual return, 30 years
      const result = engine.calculateFutureValue(10000, 500, 0.07, 30);
      
      // Expected: approximately $691,150 (calculated correctly)
      expect(result).toBeCloseTo(691150, -2); // Within $100
    });

    it('should handle zero interest rate correctly', () => {
      const result = engine.calculateFutureValue(10000, 500, 0, 10);
      
      // With 0% interest: 10000 + (500 * 12 * 10) = 70000
      expect(result).toBe(70000);
    });

    it('should handle zero monthly contribution', () => {
      const result = engine.calculateFutureValue(10000, 0, 0.05, 10);
      
      // Only principal grows with monthly compounding: 10000 * (1 + 0.05/12)^(12*10)
      expect(result).toBeCloseTo(16470.09, 2);
    });

    it('should handle zero principal', () => {
      const result = engine.calculateFutureValue(0, 1000, 0.06, 20);
      
      // Only contributions: annuity calculation with monthly compounding
      expect(result).toBeCloseTo(462041, -2);
    });

    it('should handle zero years correctly', () => {
      const result = engine.calculateFutureValue(10000, 500, 0.07, 0);
      expect(result).toBe(10000);
    });

    it('should throw error for negative annual rate', () => {
      expect(() => {
        engine.calculateFutureValue(10000, 500, -0.01, 10);
      }).toThrow('Annual return rate cannot be negative');
    });

    it('should throw error for negative principal', () => {
      expect(() => {
        engine.calculateFutureValue(-1000, 500, 0.07, 10);
      }).toThrow('Principal cannot be negative');
    });

    it('should throw error for negative monthly payment', () => {
      expect(() => {
        engine.calculateFutureValue(10000, -500, 0.07, 10);
      }).toThrow('Monthly payment cannot be negative');
    });

    it('should handle very high interest rates', () => {
      const result = engine.calculateFutureValue(1000, 100, 0.15, 5);
      expect(result).toBeGreaterThan(1000);
      expect(Number.isFinite(result)).toBe(true);
    });

    it('should handle very small amounts', () => {
      const result = engine.calculateFutureValue(1, 1, 0.01, 1);
      expect(result).toBeCloseTo(13.07, 2);
    });
  });

  describe('calculateMonthlyIncome', () => {
    it('should calculate monthly income using 4% withdrawal rule', () => {
      const result = engine.calculateMonthlyIncome(1000000);
      
      // 4% of $1M annually = $40,000/year = $3,333.33/month
      expect(result).toBeCloseTo(3333.33, 2);
    });

    it('should handle custom withdrawal rate', () => {
      const result = engine.calculateMonthlyIncome(500000, 0.03);
      
      // 3% of $500K annually = $15,000/year = $1,250/month
      expect(result).toBe(1250);
    });

    it('should handle zero savings', () => {
      const result = engine.calculateMonthlyIncome(0);
      expect(result).toBe(0);
    });

    it('should throw error for negative savings', () => {
      expect(() => {
        engine.calculateMonthlyIncome(-10000);
      }).toThrow('Total savings cannot be negative');
    });

    it('should throw error for invalid withdrawal rate', () => {
      expect(() => {
        engine.calculateMonthlyIncome(100000, -0.01);
      }).toThrow('Withdrawal rate must be between 0 and 1');

      expect(() => {
        engine.calculateMonthlyIncome(100000, 1.5);
      }).toThrow('Withdrawal rate must be between 0 and 1');
    });

    it('should handle very large savings amounts', () => {
      const result = engine.calculateMonthlyIncome(50000000, 0.04);
      expect(result).toBeCloseTo(166666.67, 2);
    });
  });

  describe('validateInputs', () => {
    const validData: RetirementData = {
      currentAge: 30,
      retirementAge: 65,
      currentSavings: 50000,
      monthlyContribution: 1000,
      expectedAnnualReturn: 0.07,
      inflationRate: 0.025,
      monthlyRetirementSpending: 4000,
      incomeSources: [],
      expenses: [],
      lastUpdated: new Date()
    };

    it('should validate correct input data', () => {
      const result = engine.validateInputs(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid current age', () => {
      const invalidData = { ...validData, currentAge: 17 };
      const result = engine.validateInputs(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current age must be between 18 and 100 years');
    });

    it('should reject current age over 100', () => {
      const invalidData = { ...validData, currentAge: 101 };
      const result = engine.validateInputs(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current age must be between 18 and 100 years');
    });

    it('should reject retirement age less than or equal to current age', () => {
      const invalidData = { ...validData, retirementAge: 30 };
      const result = engine.validateInputs(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Retirement age must be greater than current age and not exceed 100 years');
    });

    it('should reject retirement age over 100', () => {
      const invalidData = { ...validData, retirementAge: 101 };
      const result = engine.validateInputs(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Retirement age must be greater than current age and not exceed 100 years');
    });

    it('should reject negative current savings', () => {
      const invalidData = { ...validData, currentSavings: -1000 };
      const result = engine.validateInputs(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current savings cannot be negative');
    });

    it('should reject negative monthly retirement spending', () => {
      const invalidData = { ...validData, monthlyRetirementSpending: -500 };
      const result = engine.validateInputs(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Monthly retirement spending cannot be negative');
    });

    it('should reject negative expected return', () => {
      const invalidData = { ...validData, expectedAnnualReturn: -0.01 };
      const result = engine.validateInputs(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expected annual return must be between 0% and 20%');
    });

    it('should reject expected return over 20%', () => {
      const invalidData = { ...validData, expectedAnnualReturn: 0.25 };
      const result = engine.validateInputs(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expected annual return must be between 0% and 20%');
    });

    it('should warn about unrealistic monthly contribution', () => {
      const invalidData = { ...validData, monthlyContribution: 60000 };
      const result = engine.validateInputs(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Monthly contribution seems unrealistically high (over $50,000)');
    });

    it('should warn about unrealistic current savings', () => {
      const invalidData = { ...validData, currentSavings: 200000000 };
      const result = engine.validateInputs(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current savings seems unrealistically high (over $100 million)');
    });

    it('should collect multiple validation errors', () => {
      const invalidData: RetirementData = {
        currentAge: 15,
        retirementAge: 15,
        currentSavings: -1000,
        monthlyContribution: -500,
        expectedAnnualReturn: -0.05,
        inflationRate: -0.01,
        monthlyRetirementSpending: -1000,
        incomeSources: [],
        expenses: [],
        lastUpdated: new Date()
      };
      
      const result = engine.validateInputs(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('calculateRetirement', () => {
    const validData: RetirementData = {
      currentAge: 25,
      retirementAge: 65,
      currentSavings: 10000,
      monthlyContribution: 500,
      expectedAnnualReturn: 0.07,
      inflationRate: 0.025,
      monthlyRetirementSpending: 3000,
      incomeSources: [],
      expenses: [],
      lastUpdated: new Date()
    };

    it('should perform complete retirement calculation', () => {
      const result = engine.calculateRetirement(validData);
      
      expect(result.yearsToRetirement).toBe(40);
      expect(result.totalSavings).toBeGreaterThan(0);
      expect(result.monthlyRetirementIncome).toBeGreaterThan(0);
      expect(result.totalContributions).toBe(500 * 12 * 40); // $240,000
      expect(result.interestEarned).toBeGreaterThan(0);
      
      // Verify calculation consistency
      expect(result.totalSavings).toBeCloseTo(
        validData.currentSavings + result.totalContributions + result.interestEarned,
        2
      );
    });

    it('should round results to 2 decimal places', () => {
      const result = engine.calculateRetirement(validData);
      
      // Check that values are properly rounded to 2 decimal places
      expect(Number(result.totalSavings.toFixed(2))).toBe(result.totalSavings);
      expect(Number(result.monthlyRetirementIncome.toFixed(2))).toBe(result.monthlyRetirementIncome);
      expect(Number(result.totalContributions.toFixed(2))).toBe(result.totalContributions);
      expect(Number(result.interestEarned.toFixed(2))).toBe(result.interestEarned);
    });

    it('should throw error for invalid input data', () => {
      const invalidData = { ...validData, currentAge: 15 };
      
      expect(() => {
        engine.calculateRetirement(invalidData);
      }).toThrow('Invalid input data');
    });

    it('should handle edge case with zero contributions', () => {
      const zeroContributionData = { ...validData, monthlyContribution: 0 };
      const result = engine.calculateRetirement(zeroContributionData);
      
      expect(result.totalContributions).toBe(0);
      expect(result.totalSavings).toBeGreaterThan(validData.currentSavings);
      expect(result.interestEarned).toBeGreaterThan(0);
    });

    it('should handle edge case with zero current savings', () => {
      const zeroSavingsData = { ...validData, currentSavings: 0 };
      const result = engine.calculateRetirement(zeroSavingsData);
      
      expect(result.totalSavings).toBeGreaterThan(0);
      expect(result.totalContributions).toBeGreaterThan(0);
      expect(result.interestEarned).toBeGreaterThan(0);
    });

    it('should handle edge case with zero interest rate', () => {
      const zeroInterestData = { ...validData, expectedAnnualReturn: 0 };
      const result = engine.calculateRetirement(zeroInterestData);
      
      expect(result.interestEarned).toBe(0);
      expect(result.totalSavings).toBe(validData.currentSavings + result.totalContributions);
    });

    it('should handle very short retirement timeline', () => {
      const shortTimelineData = { ...validData, currentAge: 64, retirementAge: 65 };
      const result = engine.calculateRetirement(shortTimelineData);
      
      expect(result.yearsToRetirement).toBe(1);
      expect(result.totalContributions).toBe(500 * 12); // 1 year of contributions
    });
  });

  describe('calculateLoanPayment', () => {
    it('should calculate monthly loan payment correctly', () => {
      // $200,000 loan at 5% for 30 years
      const result = engine.calculateLoanPayment(200000, 0.05, 30);
      
      // Expected monthly payment: approximately $1,073.64
      expect(result).toBeCloseTo(1073.64, 2);
    });

    it('should handle zero interest rate', () => {
      const result = engine.calculateLoanPayment(120000, 0, 10);
      
      // With 0% interest: 120000 / (10 * 12) = 1000
      expect(result).toBe(1000);
    });

    it('should handle short-term loans', () => {
      const result = engine.calculateLoanPayment(10000, 0.06, 1);
      
      // 1-year loan should have higher monthly payments
      expect(result).toBeCloseTo(860.66, 2);
    });

    it('should throw error for invalid principal', () => {
      expect(() => {
        engine.calculateLoanPayment(0, 0.05, 30);
      }).toThrow('Principal must be positive');

      expect(() => {
        engine.calculateLoanPayment(-1000, 0.05, 30);
      }).toThrow('Principal must be positive');
    });

    it('should throw error for invalid interest rate', () => {
      expect(() => {
        engine.calculateLoanPayment(100000, -0.01, 30);
      }).toThrow('Annual rate must be between 0% and 50%');

      expect(() => {
        engine.calculateLoanPayment(100000, 0.6, 30);
      }).toThrow('Annual rate must be between 0% and 50%');
    });

    it('should throw error for invalid term', () => {
      expect(() => {
        engine.calculateLoanPayment(100000, 0.05, 0);
      }).toThrow('Term must be between 1 and 50 years');

      expect(() => {
        engine.calculateLoanPayment(100000, 0.05, 60);
      }).toThrow('Term must be between 1 and 50 years');
    });
  });

  describe('applyInflation', () => {
    it('should apply inflation correctly', () => {
      const result = engine.applyInflation(1000, 0.03, 10);
      
      // $1000 with 3% inflation for 10 years: 1000 * (1.03)^10
      expect(result).toBeCloseTo(1343.92, 2);
    });

    it('should handle zero inflation', () => {
      const result = engine.applyInflation(1000, 0, 5);
      expect(result).toBe(1000);
    });

    it('should handle zero years', () => {
      const result = engine.applyInflation(1000, 0.05, 0);
      expect(result).toBe(1000);
    });

    it('should throw error for negative amount', () => {
      expect(() => {
        engine.applyInflation(-100, 0.03, 5);
      }).toThrow('Amount cannot be negative');
    });

    it('should throw error for invalid inflation rate', () => {
      expect(() => {
        engine.applyInflation(1000, -0.01, 5);
      }).toThrow('Inflation rate must be between 0% and 15%');

      expect(() => {
        engine.applyInflation(1000, 0.2, 5);
      }).toThrow('Inflation rate must be between 0% and 15%');
    });
  });

  describe('Integration Tests - Complex Income Scenarios', () => {
    it('should handle multiple income sources with different start dates', () => {
      const complexIncomeData: RetirementData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 25000,
        expectedAnnualReturn: 0.07,
        inflationRate: 0.025,
        monthlyRetirementSpending: 4000,
        incomeSources: [
          {
            id: '1',
            name: 'Current Job',
            type: 'regular_job',
            amount: 5000,
            frequency: 'monthly',
            contributionPercentage: 0.15,
            annualIncrease: 0.03
          },
          {
            id: '2',
            name: 'Side Business',
            type: 'fixed_period',
            amount: 1000,
            frequency: 'monthly',
            startDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 2), // Starts in 2 years
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 10), // Ends in 10 years
            contributionPercentage: 0.20
          },
          {
            id: '3',
            name: 'Inheritance',
            type: 'one_time',
            amount: 50000,
            frequency: 'one_time',
            startDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 5), // In 5 years
            contributionPercentage: 1.0 // Contribute all of it
          }
        ],
        expenses: [],
        lastUpdated: new Date()
      };

      const result = engine.calculateRetirement(complexIncomeData);
      
      expect(result.yearsToRetirement).toBe(35);
      expect(result.totalSavings).toBeGreaterThan(complexIncomeData.currentSavings);
      expect(result.totalContributions).toBeGreaterThan(0);
      expect(result.interestEarned).toBeGreaterThan(0);
      expect(result.netMonthlyIncome).toBeGreaterThan(0);
      
      // Verify calculation consistency
      expect(result.totalSavings).toBeCloseTo(
        complexIncomeData.currentSavings + result.totalContributions + result.interestEarned,
        2
      );
    });

    it('should handle income sources with annual increases', () => {
      const growingIncomeData: RetirementData = {
        currentAge: 25,
        retirementAge: 60,
        currentSavings: 10000,
        expectedAnnualReturn: 0.06,
        inflationRate: 0.025,
        monthlyRetirementSpending: 3500,
        incomeSources: [
          {
            id: '1',
            name: 'Growing Salary',
            type: 'regular_job',
            amount: 4000,
            frequency: 'monthly',
            contributionPercentage: 0.12,
            annualIncrease: 0.04, // 4% annual raises
            startDate: new Date() // Start from current date
          }
        ],
        expenses: [],
        lastUpdated: new Date()
      };

      const result = engine.calculateRetirement(growingIncomeData);
      
      expect(result.yearsToRetirement).toBe(35);
      expect(result.totalSavings).toBeGreaterThan(growingIncomeData.currentSavings);
      
      // With annual increases, total contributions should be higher than simple calculation
      const simpleContribution = 4000 * 0.12 * 35 * 12; // Without increases: 201,600
      
      // The calculation should account for 4% annual salary increases
      // After 35 years with 4% annual increases, the final salary would be much higher
      expect(result.totalContributions).toBeGreaterThan(simpleContribution);
    });

    it('should handle mixed frequency income sources', () => {
      const mixedFrequencyData: RetirementData = {
        currentAge: 35,
        retirementAge: 65,
        currentSavings: 75000,
        expectedAnnualReturn: 0.08,
        inflationRate: 0.025,
        monthlyRetirementSpending: 5000,
        incomeSources: [
          {
            id: '1',
            name: 'Monthly Salary',
            type: 'regular_job',
            amount: 6000,
            frequency: 'monthly',
            contributionPercentage: 0.10
          },
          {
            id: '2',
            name: 'Annual Bonus',
            type: 'regular_job',
            amount: 15000,
            frequency: 'annual',
            contributionPercentage: 0.50 // Contribute 50% of bonus
          },
          {
            id: '3',
            name: 'Rental Income',
            type: 'rental',
            amount: 1200,
            frequency: 'monthly',
            contributionPercentage: 0.25,
            annualIncrease: 0.02 // 2% annual rent increases
          }
        ],
        expenses: [],
        lastUpdated: new Date()
      };

      const result = engine.calculateRetirement(mixedFrequencyData);
      
      expect(result.yearsToRetirement).toBe(30);
      expect(result.totalSavings).toBeGreaterThan(mixedFrequencyData.currentSavings);
      expect(result.netMonthlyIncome).toBeGreaterThan(6000 + 1200); // At least salary + rental
      
      // Should account for annual bonus in calculations
      expect(result.totalContributions).toBeGreaterThan(0);
    });

    it('should handle time-based income with gaps', () => {
      const gappedIncomeData: RetirementData = {
        currentAge: 28,
        retirementAge: 62,
        currentSavings: 15000,
        expectedAnnualReturn: 0.07,
        inflationRate: 0.025,
        monthlyRetirementSpending: 3000,
        incomeSources: [
          {
            id: '1',
            name: 'Contract Work',
            type: 'fixed_period',
            amount: 7000,
            frequency: 'monthly',
            startDate: new Date(), // Starts now
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 3), // Ends in 3 years
            contributionPercentage: 0.15
          },
          {
            id: '2',
            name: 'Future Job',
            type: 'regular_job',
            amount: 5500,
            frequency: 'monthly',
            startDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 5), // Starts in 5 years
            contributionPercentage: 0.12,
            annualIncrease: 0.025
          }
        ],
        expenses: [],
        lastUpdated: new Date()
      };

      const result = engine.calculateRetirement(gappedIncomeData);
      
      expect(result.yearsToRetirement).toBe(34);
      expect(result.totalSavings).toBeGreaterThan(gappedIncomeData.currentSavings);
      
      // Should handle the gap between contracts appropriately
      expect(result.totalContributions).toBeGreaterThan(0);
      expect(result.totalContributions).toBeLessThan(7000 * 0.15 * 34 * 12); // Less than if contract ran full time
    });

    it('should handle backward compatibility with legacy monthlyContribution', () => {
      const legacyData: RetirementData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 20000,
        monthlyContribution: 800, // Legacy field
        expectedAnnualReturn: 0.07,
        inflationRate: 0.025,
        monthlyRetirementSpending: 3500,
        incomeSources: [], // Empty income sources
        expenses: [],
        lastUpdated: new Date()
      };

      const result = engine.calculateRetirement(legacyData);
      
      expect(result.yearsToRetirement).toBe(35);
      expect(result.totalContributions).toBe(800 * 35 * 12); // Should use legacy contribution
      expect(result.totalSavings).toBeGreaterThan(legacyData.currentSavings);
    });

    it('should prioritize income sources over legacy monthlyContribution', () => {
      const mixedData: RetirementData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 20000,
        monthlyContribution: 800, // Legacy field - should be ignored
        expectedAnnualReturn: 0.07,
        inflationRate: 0.025,
        monthlyRetirementSpending: 3500,
        incomeSources: [
          {
            id: '1',
            name: 'New Job',
            type: 'regular_job',
            amount: 5000,
            frequency: 'monthly',
            contributionPercentage: 0.20 // $1000/month contribution
          }
        ],
        expenses: [],
        lastUpdated: new Date()
      };

      const result = engine.calculateRetirement(mixedData);
      
      expect(result.yearsToRetirement).toBe(35);
      // Should use income source calculation (1000/month) not legacy (800/month)
      expect(result.totalContributions).toBeCloseTo(1000 * 35 * 12, -2);
      expect(result.netMonthlyIncome).toBe(5000);
    });
  });
});