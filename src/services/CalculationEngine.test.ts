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

    it('should reject negative monthly contribution', () => {
      const invalidData = { ...validData, monthlyContribution: -500 };
      const result = engine.validateInputs(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Monthly contribution cannot be negative');
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
});