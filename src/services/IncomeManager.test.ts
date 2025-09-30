import { describe, it, expect, beforeEach } from 'vitest';
import { IncomeManager } from './IncomeManager';
import type { IncomeSource } from '../types/index.js';

describe('IncomeManager', () => {
  let incomeManager: IncomeManager;

  beforeEach(() => {
    incomeManager = new IncomeManager();
  });

  describe('addIncomeSource', () => {
    it('should add a valid regular job income source', () => {
      const source = {
        name: 'Software Engineer',
        type: 'regular_job' as const,
        amount: 5000,
        frequency: 'monthly' as const,
        contributionPercentage: 0.15,
        annualIncrease: 0.03
      };

      const result = incomeManager.addIncomeSource(source);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);

      const sources = incomeManager.getAllIncomeSources();
      expect(sources).toHaveLength(1);
      expect(sources[0].name).toBe('Software Engineer');
      expect(sources[0].id).toBeDefined();
    });

    it('should add a valid fixed-period income source', () => {
      const source = {
        name: 'Contract Work',
        type: 'fixed_period' as const,
        amount: 3000,
        frequency: 'monthly' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        contributionPercentage: 0.10
      };

      const result = incomeManager.addIncomeSource(source);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should add a valid one-time income source', () => {
      const source = {
        name: 'Bonus Payment',
        type: 'one_time' as const,
        amount: 10000,
        frequency: 'one_time' as const,
        startDate: new Date('2024-06-15'),
        contributionPercentage: 0.50
      };

      const result = incomeManager.addIncomeSource(source);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should add a valid rental income source', () => {
      const source = {
        name: 'Rental Property',
        type: 'rental' as const,
        amount: 1500,
        frequency: 'monthly' as const,
        annualIncrease: 0.02,
        contributionPercentage: 0.80
      };

      const result = incomeManager.addIncomeSource(source);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should add a valid investment income source', () => {
      const source = {
        name: 'Stock Dividends',
        type: 'investment' as const,
        amount: 2000,
        frequency: 'annual' as const,
        expectedReturn: 0.08,
        contributionPercentage: 1.0
      };

      const result = incomeManager.addIncomeSource(source);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject income source with invalid data', () => {
      const source = {
        name: '',
        type: 'invalid_type' as any,
        amount: -1000,
        frequency: 'invalid_frequency' as any
      };

      const result = incomeManager.addIncomeSource(source);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject duplicate income source names', () => {
      const source1 = {
        name: 'Main Job',
        type: 'regular_job' as const,
        amount: 5000,
        frequency: 'monthly' as const
      };

      const source2 = {
        name: 'Main Job', // Same name
        type: 'regular_job' as const,
        amount: 6000,
        frequency: 'monthly' as const
      };

      incomeManager.addIncomeSource(source1);
      const result = incomeManager.addIncomeSource(source2);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('An income source with this name already exists');
    });

    it('should be case-insensitive for duplicate name checking', () => {
      const source1 = {
        name: 'Main Job',
        type: 'regular_job' as const,
        amount: 5000,
        frequency: 'monthly' as const
      };

      const source2 = {
        name: 'MAIN JOB', // Same name, different case
        type: 'regular_job' as const,
        amount: 6000,
        frequency: 'monthly' as const
      };

      incomeManager.addIncomeSource(source1);
      const result = incomeManager.addIncomeSource(source2);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('An income source with this name already exists');
    });
  });

  describe('removeIncomeSource', () => {
    it('should remove an existing income source', () => {
      const source = {
        name: 'Test Job',
        type: 'regular_job' as const,
        amount: 5000,
        frequency: 'monthly' as const
      };

      incomeManager.addIncomeSource(source);
      const sources = incomeManager.getAllIncomeSources();
      expect(sources).toHaveLength(1);

      const removed = incomeManager.removeIncomeSource(sources[0].id);
      expect(removed).toBe(true);
      expect(incomeManager.getAllIncomeSources()).toHaveLength(0);
    });

    it('should return false when removing non-existent income source', () => {
      const removed = incomeManager.removeIncomeSource('non-existent-id');
      expect(removed).toBe(false);
    });
  });

  describe('updateIncomeSource', () => {
    it('should update an existing income source', () => {
      const source = {
        name: 'Test Job',
        type: 'regular_job' as const,
        amount: 5000,
        frequency: 'monthly' as const
      };

      incomeManager.addIncomeSource(source);
      const sources = incomeManager.getAllIncomeSources();
      const sourceId = sources[0].id;

      const result = incomeManager.updateIncomeSource(sourceId, {
        amount: 6000,
        contributionPercentage: 0.20
      });

      expect(result.isValid).toBe(true);
      const updatedSource = incomeManager.getIncomeSourceById(sourceId);
      expect(updatedSource?.amount).toBe(6000);
      expect(updatedSource?.contributionPercentage).toBe(0.20);
    });

    it('should reject update with invalid data', () => {
      const source = {
        name: 'Test Job',
        type: 'regular_job' as const,
        amount: 5000,
        frequency: 'monthly' as const
      };

      incomeManager.addIncomeSource(source);
      const sources = incomeManager.getAllIncomeSources();
      const sourceId = sources[0].id;

      const result = incomeManager.updateIncomeSource(sourceId, {
        amount: -1000 // Invalid amount
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject update that creates duplicate name', () => {
      const source1 = {
        name: 'Job 1',
        type: 'regular_job' as const,
        amount: 5000,
        frequency: 'monthly' as const
      };

      const source2 = {
        name: 'Job 2',
        type: 'regular_job' as const,
        amount: 6000,
        frequency: 'monthly' as const
      };

      incomeManager.addIncomeSource(source1);
      incomeManager.addIncomeSource(source2);
      const sources = incomeManager.getAllIncomeSources();

      const result = incomeManager.updateIncomeSource(sources[1].id, {
        name: 'Job 1' // Duplicate name
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('An income source with this name already exists');
    });

    it('should return error for non-existent income source', () => {
      const result = incomeManager.updateIncomeSource('non-existent-id', {
        amount: 6000
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Income source not found');
    });
  });

  describe('calculateMonthlyIncome', () => {
    beforeEach(() => {
      // Add test income sources
      incomeManager.addIncomeSource({
        name: 'Regular Job',
        type: 'regular_job',
        amount: 5000,
        frequency: 'monthly',
        contributionPercentage: 0.15
      });

      incomeManager.addIncomeSource({
        name: 'Annual Bonus',
        type: 'investment',
        amount: 12000,
        frequency: 'annual',
        contributionPercentage: 0.50
      });

      incomeManager.addIncomeSource({
        name: 'Rental Income',
        type: 'rental',
        amount: 1500,
        frequency: 'monthly',
        annualIncrease: 0.03,
        startDate: new Date('2020-01-01'),
        contributionPercentage: 0.80
      });
    });

    it('should calculate total monthly income correctly', () => {
      const currentDate = new Date('2024-06-15');
      const currentAge = 30;
      
      const monthlyIncome = incomeManager.calculateMonthlyIncome(currentDate, currentAge);
      
      // Regular job: 5000
      // Annual bonus: 12000 / 12 = 1000
      // Rental with ~4.46 years of 3% increases from 2020-01-01 to 2024-06-15
      const yearsElapsed = (currentDate.getTime() - new Date('2020-01-01').getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      const rentalIncome = 1500 * Math.pow(1.03, yearsElapsed);
      const expectedIncome = 5000 + 1000 + rentalIncome;
      expect(monthlyIncome).toBeCloseTo(expectedIncome, 1);
    });

    it('should calculate monthly contributions correctly', () => {
      const currentDate = new Date('2024-06-15');
      const currentAge = 30;
      
      const monthlyContributions = incomeManager.calculateMonthlyContributions(currentDate, currentAge);
      
      // Regular job contribution: 5000 * 0.15 = 750
      // Annual bonus contribution: 1000 * 0.50 = 500
      // Rental contribution: calculated rental income * 0.80
      const yearsElapsed = (currentDate.getTime() - new Date('2020-01-01').getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      const rentalIncome = 1500 * Math.pow(1.03, yearsElapsed);
      const expectedContributions = (5000 * 0.15) + (1000 * 0.50) + (rentalIncome * 0.80);
      expect(monthlyContributions).toBeCloseTo(expectedContributions, 1);
    });

    it('should handle one-time income correctly', () => {
      // Create a fresh manager for this test
      const testManager = new IncomeManager();
      
      testManager.addIncomeSource({
        name: 'One-time Bonus',
        type: 'one_time',
        amount: 5000,
        frequency: 'one_time',
        startDate: new Date('2024-06-15'),
        contributionPercentage: 1.0
      });

      // Should include one-time income in June 2024
      const juneIncome = testManager.calculateMonthlyIncome(new Date('2024-06-15'), 30);
      const julyIncome = testManager.calculateMonthlyIncome(new Date('2024-07-15'), 30);
      
      expect(julyIncome).toBeLessThan(juneIncome);
      expect(juneIncome - julyIncome).toBe(5000);
    });

    it('should handle fixed-period income correctly', () => {
      // Create a fresh manager for this test
      const testManager = new IncomeManager();
      
      testManager.addIncomeSource({
        name: 'Contract Work',
        type: 'fixed_period',
        amount: 3000,
        frequency: 'monthly',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        contributionPercentage: 0.10
      });

      // Should include contract work in 2024
      const income2024 = testManager.calculateMonthlyIncome(new Date('2024-06-15'), 30);
      const income2025 = testManager.calculateMonthlyIncome(new Date('2025-06-15'), 31);
      
      expect(income2025).toBeLessThan(income2024);
      expect(income2024 - income2025).toBe(3000);
    });

    it('should handle future start dates correctly', () => {
      // Create a fresh manager for this test
      const testManager = new IncomeManager();
      
      testManager.addIncomeSource({
        name: 'Future Job',
        type: 'regular_job',
        amount: 2000,
        frequency: 'monthly',
        startDate: new Date('2025-01-01'),
        contributionPercentage: 0.10
      });

      // Should not include future job in 2024
      const income2024 = testManager.calculateMonthlyIncome(new Date('2024-06-15'), 30);
      const income2025 = testManager.calculateMonthlyIncome(new Date('2025-06-15'), 31);
      
      expect(income2025).toBeGreaterThan(income2024);
      expect(income2025 - income2024).toBe(2000);
    });
  });

  describe('getActiveIncomeSources', () => {
    beforeEach(() => {
      incomeManager.addIncomeSource({
        name: 'Current Job',
        type: 'regular_job',
        amount: 5000,
        frequency: 'monthly'
      });

      incomeManager.addIncomeSource({
        name: 'Future Job',
        type: 'regular_job',
        amount: 6000,
        frequency: 'monthly',
        startDate: new Date('2025-01-01')
      });

      incomeManager.addIncomeSource({
        name: 'Past Contract',
        type: 'fixed_period',
        amount: 3000,
        frequency: 'monthly',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31')
      });
    });

    it('should return only active sources for current date', () => {
      const activeSources = incomeManager.getActiveIncomeSources(new Date('2024-06-15'));
      expect(activeSources).toHaveLength(1);
      expect(activeSources[0].name).toBe('Current Job');
    });

    it('should return different active sources for future date', () => {
      const activeSources = incomeManager.getActiveIncomeSources(new Date('2025-06-15'));
      expect(activeSources).toHaveLength(2);
      const names = activeSources.map(s => s.name);
      expect(names).toContain('Current Job');
      expect(names).toContain('Future Job');
    });

    it('should return different active sources for past date', () => {
      const activeSources = incomeManager.getActiveIncomeSources(new Date('2023-06-15'));
      expect(activeSources).toHaveLength(2);
      const names = activeSources.map(s => s.name);
      expect(names).toContain('Current Job');
      expect(names).toContain('Past Contract');
    });
  });

  describe('validateAllSources', () => {
    it('should return valid for all valid sources', () => {
      incomeManager.addIncomeSource({
        name: 'Valid Job',
        type: 'regular_job',
        amount: 5000,
        frequency: 'monthly'
      });

      const validation = incomeManager.validateAllSources();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should return errors for invalid sources', () => {
      // Create a new IncomeManager and directly set invalid sources using private property access
      const testManager = new IncomeManager();
      
      // Add a valid source first
      testManager.addIncomeSource({
        name: 'Valid Job',
        type: 'regular_job',
        amount: 5000,
        frequency: 'monthly'
      });

      // Manually add an invalid source by accessing private property
      const sources = testManager.getAllIncomeSources();
      sources.push({
        id: 'invalid-source',
        name: '',
        type: 'invalid_type' as any,
        amount: -1000,
        frequency: 'invalid_frequency' as any
      });
      
      // Force set the sources by bypassing validation
      (testManager as any).incomeSources = sources;

      const validation = testManager.validateAllSources();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('setIncomeSources', () => {
    it('should set valid income sources', () => {
      const sources: IncomeSource[] = [
        {
          id: 'source-1',
          name: 'Job 1',
          type: 'regular_job',
          amount: 5000,
          frequency: 'monthly'
        },
        {
          id: 'source-2',
          name: 'Job 2',
          type: 'regular_job',
          amount: 6000,
          frequency: 'monthly'
        }
      ];

      const result = incomeManager.setIncomeSources(sources);
      expect(result.isValid).toBe(true);
      expect(incomeManager.getAllIncomeSources()).toHaveLength(2);
    });

    it('should reject sources with duplicate IDs', () => {
      const sources: IncomeSource[] = [
        {
          id: 'duplicate-id',
          name: 'Job 1',
          type: 'regular_job',
          amount: 5000,
          frequency: 'monthly'
        },
        {
          id: 'duplicate-id', // Duplicate ID
          name: 'Job 2',
          type: 'regular_job',
          amount: 6000,
          frequency: 'monthly'
        }
      ];

      const result = incomeManager.setIncomeSources(sources);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate income source IDs found: duplicate-id');
    });

    it('should reject sources with duplicate names', () => {
      const sources: IncomeSource[] = [
        {
          id: 'source-1',
          name: 'Same Name',
          type: 'regular_job',
          amount: 5000,
          frequency: 'monthly'
        },
        {
          id: 'source-2',
          name: 'Same Name', // Duplicate name
          type: 'regular_job',
          amount: 6000,
          frequency: 'monthly'
        }
      ];

      const result = incomeManager.setIncomeSources(sources);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate income source names found: same name');
    });
  });

  describe('getIncomeSummary', () => {
    beforeEach(() => {
      incomeManager.addIncomeSource({
        name: 'Regular Job',
        type: 'regular_job',
        amount: 5000,
        frequency: 'monthly',
        contributionPercentage: 0.15
      });

      incomeManager.addIncomeSource({
        name: 'Rental Income',
        type: 'rental',
        amount: 1500,
        frequency: 'monthly',
        contributionPercentage: 0.80
      });

      incomeManager.addIncomeSource({
        name: 'Future Job',
        type: 'regular_job',
        amount: 6000,
        frequency: 'monthly',
        startDate: new Date('2025-01-01'),
        contributionPercentage: 0.20
      });
    });

    it('should provide accurate income summary', () => {
      const summary = incomeManager.getIncomeSummary(new Date('2024-06-15'), 30);
      
      expect(summary.totalSources).toBe(3);
      expect(summary.activeSources).toBe(2); // Regular job and rental, not future job
      expect(summary.totalMonthlyIncome).toBe(6500); // 5000 + 1500
      expect(summary.totalMonthlyContributions).toBe(1950); // (5000 * 0.15) + (1500 * 0.80)
      expect(summary.contributionRate).toBeCloseTo(0.3, 2); // 1950 / 6500 = 0.3
      
      expect(summary.sourcesByType.regular_job).toHaveLength(2);
      expect(summary.sourcesByType.rental).toHaveLength(1);
    });
  });

  describe('clearAllSources', () => {
    it('should clear all income sources', () => {
      incomeManager.addIncomeSource({
        name: 'Test Job',
        type: 'regular_job',
        amount: 5000,
        frequency: 'monthly'
      });

      expect(incomeManager.getAllIncomeSources()).toHaveLength(1);
      
      incomeManager.clearAllSources();
      expect(incomeManager.getAllIncomeSources()).toHaveLength(0);
    });
  });

  describe('projectMonthlyIncome', () => {
    beforeEach(() => {
      incomeManager.addIncomeSource({
        name: 'Job with Increases',
        type: 'regular_job',
        amount: 5000,
        frequency: 'monthly',
        annualIncrease: 0.05,
        startDate: new Date('2024-01-01'),
        contributionPercentage: 0.15
      });
    });

    it('should project future income with annual increases', () => {
      const currentDate = new Date('2024-01-01');
      const futureDate = new Date('2026-01-01'); // 2 years later
      
      const projectedIncome = incomeManager.projectMonthlyIncome(futureDate, 30);
      
      // Should be 5000 * (1.05^2) = 5512.50
      const expectedIncome = 5000 * Math.pow(1.05, 2);
      expect(projectedIncome).toBeCloseTo(expectedIncome, 0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty income sources gracefully', () => {
      const monthlyIncome = incomeManager.calculateMonthlyIncome(new Date(), 30);
      const monthlyContributions = incomeManager.calculateMonthlyContributions(new Date(), 30);
      
      expect(monthlyIncome).toBe(0);
      expect(monthlyContributions).toBe(0);
    });

    it('should handle sources with zero contribution percentage', () => {
      incomeManager.addIncomeSource({
        name: 'No Contribution Job',
        type: 'regular_job',
        amount: 5000,
        frequency: 'monthly',
        contributionPercentage: 0
      });

      const monthlyIncome = incomeManager.calculateMonthlyIncome(new Date(), 30);
      const monthlyContributions = incomeManager.calculateMonthlyContributions(new Date(), 30);
      
      expect(monthlyIncome).toBe(5000);
      expect(monthlyContributions).toBe(0);
    });

    it('should handle sources without contribution percentage', () => {
      incomeManager.addIncomeSource({
        name: 'No Contribution Specified',
        type: 'regular_job',
        amount: 5000,
        frequency: 'monthly'
        // No contributionPercentage specified
      });

      const monthlyContributions = incomeManager.calculateMonthlyContributions(new Date(), 30);
      expect(monthlyContributions).toBe(0);
    });

    it('should handle invalid dates gracefully', () => {
      // This should be caught by validation, but test defensive programming
      const sources = incomeManager.getActiveIncomeSources(new Date('invalid-date'));
      expect(Array.isArray(sources)).toBe(true);
    });
  });
});