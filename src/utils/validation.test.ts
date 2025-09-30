import { describe, it, expect } from 'vitest';
import {
  validateRetirementData,
  validateIncomeSource,
  validateExpense,
  validateNumericField,
  validateExportData,
  sanitizeNumericInput,
  migrateLegacyRetirementData,
  needsMigration,
  generateUniqueId
} from './validation.js';
import type { RetirementData, IncomeSource, Expense } from '../types/index.js';

describe('validateRetirementData', () => {
  const validData: RetirementData = {
    currentAge: 30,
    retirementAge: 65,
    currentSavings: 50000,
    expectedAnnualReturn: 0.07,
    inflationRate: 0.03,
    monthlyRetirementSpending: 4000,
    incomeSources: [],
    expenses: [],
    lastUpdated: new Date()
  };

  it('should validate correct retirement data', () => {
    const result = validateRetirementData(validData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  describe('currentAge validation', () => {
    it('should reject missing current age', () => {
      const data = { ...validData };
      delete (data as any).currentAge;
      const result = validateRetirementData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current age is required');
    });

    it('should reject current age below 18', () => {
      const result = validateRetirementData({ ...validData, currentAge: 17 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current age must be an integer between 18 and 100');
    });

    it('should reject current age above 100', () => {
      const result = validateRetirementData({ ...validData, currentAge: 101 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current age must be an integer between 18 and 100');
    });

    it('should reject non-integer current age', () => {
      const result = validateRetirementData({ ...validData, currentAge: 30.5 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current age must be an integer between 18 and 100');
    });
  });

  describe('retirementAge validation', () => {
    it('should reject missing retirement age', () => {
      const data = { ...validData };
      delete (data as any).retirementAge;
      const result = validateRetirementData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Retirement age is required');
    });

    it('should reject retirement age below 18', () => {
      const result = validateRetirementData({ ...validData, retirementAge: 17 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Retirement age must be an integer between 18 and 100');
    });

    it('should reject retirement age above 100', () => {
      const result = validateRetirementData({ ...validData, retirementAge: 101 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Retirement age must be an integer between 18 and 100');
    });

    it('should reject retirement age less than or equal to current age', () => {
      const result = validateRetirementData({ ...validData, currentAge: 40, retirementAge: 40 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Retirement age must be greater than current age');
    });

    it('should reject non-integer retirement age', () => {
      const result = validateRetirementData({ ...validData, retirementAge: 65.5 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Retirement age must be an integer between 18 and 100');
    });
  });

  describe('currentSavings validation', () => {
    it('should reject missing current savings', () => {
      const data = { ...validData };
      delete (data as any).currentSavings;
      const result = validateRetirementData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current savings is required');
    });

    it('should reject negative current savings', () => {
      const result = validateRetirementData({ ...validData, currentSavings: -1000 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current savings must be a non-negative number');
    });

    it('should accept zero current savings', () => {
      const result = validateRetirementData({ ...validData, currentSavings: 0 });
      expect(result.isValid).toBe(true);
    });

    it('should reject infinite current savings', () => {
      const result = validateRetirementData({ ...validData, currentSavings: Infinity });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current savings must be a finite number');
    });

    it('should reject NaN current savings', () => {
      const result = validateRetirementData({ ...validData, currentSavings: NaN });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current savings must be a finite number');
    });
  });

  describe('inflationRate validation', () => {
    it('should accept valid inflation rate', () => {
      const result = validateRetirementData({ ...validData, inflationRate: 0.03 });
      expect(result.isValid).toBe(true);
    });

    it('should reject negative inflation rate', () => {
      const result = validateRetirementData({ ...validData, inflationRate: -0.01 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Inflation rate must be between 0% and 15% (0.0 to 0.15)');
    });

    it('should reject inflation rate above 15%', () => {
      const result = validateRetirementData({ ...validData, inflationRate: 0.20 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Inflation rate must be between 0% and 15% (0.0 to 0.15)');
    });

    it('should accept undefined inflation rate', () => {
      const data = { ...validData };
      delete (data as any).inflationRate;
      const result = validateRetirementData(data);
      expect(result.isValid).toBe(true);
    });
  });

  describe('monthlyRetirementSpending validation', () => {
    it('should accept valid monthly retirement spending', () => {
      const result = validateRetirementData({ ...validData, monthlyRetirementSpending: 4000 });
      expect(result.isValid).toBe(true);
    });

    it('should reject negative monthly retirement spending', () => {
      const result = validateRetirementData({ ...validData, monthlyRetirementSpending: -1000 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Monthly retirement spending must be a non-negative number');
    });

    it('should accept undefined monthly retirement spending', () => {
      const data = { ...validData };
      delete (data as any).monthlyRetirementSpending;
      const result = validateRetirementData(data);
      expect(result.isValid).toBe(true);
    });
  });

  describe('incomeSources validation', () => {
    it('should accept empty income sources array', () => {
      const result = validateRetirementData({ ...validData, incomeSources: [] });
      expect(result.isValid).toBe(true);
    });

    it('should reject non-array income sources', () => {
      const result = validateRetirementData({ ...validData, incomeSources: 'invalid' as any });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Income sources must be an array');
    });

    it('should validate individual income sources', () => {
      const invalidSource: Partial<IncomeSource> = {
        id: '',
        name: '',
        type: 'invalid' as any,
        amount: -100,
        frequency: 'invalid' as any
      };
      const result = validateRetirementData({ ...validData, incomeSources: [invalidSource as IncomeSource] });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Income source 1:'))).toBe(true);
    });
  });

  describe('expenses validation', () => {
    it('should accept empty expenses array', () => {
      const result = validateRetirementData({ ...validData, expenses: [] });
      expect(result.isValid).toBe(true);
    });

    it('should reject non-array expenses', () => {
      const result = validateRetirementData({ ...validData, expenses: 'invalid' as any });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expenses must be an array');
    });

    it('should validate individual expenses', () => {
      const invalidExpense: Partial<Expense> = {
        id: '',
        name: '',
        type: 'invalid' as any,
        amount: -100,
        frequency: 'invalid' as any,
        inflationAdjusted: 'invalid' as any
      };
      const result = validateRetirementData({ ...validData, expenses: [invalidExpense as Expense] });
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Expense 1:'))).toBe(true);
    });
  });

  describe('legacy monthlyContribution validation', () => {
    it('should accept valid legacy monthly contribution', () => {
      const result = validateRetirementData({ ...validData, monthlyContribution: 1000 });
      expect(result.isValid).toBe(true);
    });

    it('should reject negative legacy monthly contribution', () => {
      const result = validateRetirementData({ ...validData, monthlyContribution: -500 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Monthly contribution must be a non-negative number');
    });

    it('should accept undefined legacy monthly contribution', () => {
      const data = { ...validData };
      delete (data as any).monthlyContribution;
      const result = validateRetirementData(data);
      expect(result.isValid).toBe(true);
    });
  });

  describe('expectedAnnualReturn validation', () => {
    it('should reject missing expected annual return', () => {
      const data = { ...validData };
      delete (data as any).expectedAnnualReturn;
      const result = validateRetirementData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expected annual return is required');
    });

    it('should reject negative expected annual return', () => {
      const result = validateRetirementData({ ...validData, expectedAnnualReturn: -0.05 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expected annual return must be between 0% and 30% (0.0 to 0.30)');
    });

    it('should reject expected annual return above 30%', () => {
      const result = validateRetirementData({ ...validData, expectedAnnualReturn: 0.35 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expected annual return must be between 0% and 30% (0.0 to 0.30)');
    });

    it('should accept 0% expected annual return', () => {
      const result = validateRetirementData({ ...validData, expectedAnnualReturn: 0 });
      expect(result.isValid).toBe(true);
    });

    it('should accept 30% expected annual return', () => {
      const result = validateRetirementData({ ...validData, expectedAnnualReturn: 0.30 });
      expect(result.isValid).toBe(true);
    });

    it('should reject infinite expected annual return', () => {
      const result = validateRetirementData({ ...validData, expectedAnnualReturn: Infinity });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expected annual return must be a finite number');
    });
  });
});

describe('validateNumericField', () => {
  it('should validate correct numeric field', () => {
    const result = validateNumericField(25, 'Age', 18, 100, false);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject missing value', () => {
    const result = validateNumericField(undefined, 'Age', 18, 100);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Age is required');
  });

  it('should reject null value', () => {
    const result = validateNumericField(null, 'Age', 18, 100);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Age is required');
  });

  it('should reject empty string', () => {
    const result = validateNumericField('', 'Age', 18, 100);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Age is required');
  });

  it('should reject non-numeric value', () => {
    const result = validateNumericField('abc', 'Age', 18, 100);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Age must be a valid number');
  });

  it('should reject value below minimum', () => {
    const result = validateNumericField(15, 'Age', 18, 100);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Age must be between 18 and 100');
  });

  it('should reject value above maximum', () => {
    const result = validateNumericField(105, 'Age', 18, 100);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Age must be between 18 and 100');
  });

  it('should reject decimal when integers only allowed', () => {
    const result = validateNumericField(25.5, 'Age', 18, 100, false);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Age must be a whole number');
  });

  it('should accept decimal when decimals allowed', () => {
    const result = validateNumericField(25.5, 'Rate', 0, 100, true);
    expect(result.isValid).toBe(true);
  });

  it('should reject infinite values', () => {
    const result = validateNumericField(Infinity, 'Value', 0, 100);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Value must be a valid number');
  });
});

describe('validateExportData', () => {
  const validExportData = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    userData: {
      currentAge: 30,
      retirementAge: 65,
      currentSavings: 50000,
      expectedAnnualReturn: 0.07,
      inflationRate: 0.03,
      monthlyRetirementSpending: 4000,
      incomeSources: [],
      expenses: [],
      lastUpdated: new Date()
    }
  };

  it('should validate correct export data', () => {
    const result = validateExportData(validExportData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject null or undefined data', () => {
    const result1 = validateExportData(null);
    expect(result1.isValid).toBe(false);
    expect(result1.errors).toContain('Export data must be a valid object');

    const result2 = validateExportData(undefined);
    expect(result2.isValid).toBe(false);
    expect(result2.errors).toContain('Export data must be a valid object');
  });

  it('should reject non-object data', () => {
    const result = validateExportData('invalid');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Export data must be a valid object');
  });

  it('should reject missing version', () => {
    const data = { ...validExportData };
    delete (data as any).version;
    const result = validateExportData(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Export data must include a valid version string');
  });

  it('should reject invalid version type', () => {
    const result = validateExportData({ ...validExportData, version: 123 });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Export data must include a valid version string');
  });

  it('should reject missing export date', () => {
    const data = { ...validExportData };
    delete (data as any).exportDate;
    const result = validateExportData(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Export data must include an export date');
  });

  it('should reject invalid export date', () => {
    const result = validateExportData({ ...validExportData, exportDate: 'invalid-date' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Export date must be a valid date');
  });

  it('should reject missing user data', () => {
    const data = { ...validExportData };
    delete (data as any).userData;
    const result = validateExportData(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Export data must include user data');
  });

  it('should reject invalid user data', () => {
    const invalidUserData = { ...validExportData.userData, currentAge: -5 };
    const result = validateExportData({ ...validExportData, userData: invalidUserData });
    expect(result.isValid).toBe(false);
    expect(result.errors.some(error => error.includes('User data:'))).toBe(true);
  });
});

describe('sanitizeNumericInput', () => {
  it('should return valid numbers unchanged', () => {
    expect(sanitizeNumericInput(42)).toBe(42);
    expect(sanitizeNumericInput(3.14)).toBe(3.14);
    expect(sanitizeNumericInput(0)).toBe(0);
  });

  it('should return null for null/undefined/empty', () => {
    expect(sanitizeNumericInput(null)).toBe(null);
    expect(sanitizeNumericInput(undefined)).toBe(null);
    expect(sanitizeNumericInput('')).toBe(null);
  });

  it('should parse valid numeric strings', () => {
    expect(sanitizeNumericInput('42')).toBe(42);
    expect(sanitizeNumericInput('3.14')).toBe(3.14);
    expect(sanitizeNumericInput('  25.5  ')).toBe(25.5);
  });

  it('should return null for invalid strings', () => {
    expect(sanitizeNumericInput('abc')).toBe(null);
    expect(sanitizeNumericInput('12abc')).toBe(null);
    expect(sanitizeNumericInput('   ')).toBe(null);
  });

  it('should return null for infinite values', () => {
    expect(sanitizeNumericInput(Infinity)).toBe(null);
    expect(sanitizeNumericInput(-Infinity)).toBe(null);
    expect(sanitizeNumericInput(NaN)).toBe(null);
  });

  it('should return null for non-numeric types', () => {
    expect(sanitizeNumericInput({})).toBe(null);
    expect(sanitizeNumericInput([])).toBe(null);
    expect(sanitizeNumericInput(true)).toBe(null);
  });
});
describe
('validateIncomeSource', () => {
  const validIncomeSource: IncomeSource = {
    id: 'test-id',
    name: 'Test Job',
    type: 'regular_job',
    amount: 5000,
    frequency: 'monthly',
    contributionPercentage: 0.15
  };

  it('should validate correct income source', () => {
    const result = validateIncomeSource(validIncomeSource);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  describe('id validation', () => {
    it('should reject missing id', () => {
      const source = { ...validIncomeSource };
      delete (source as any).id;
      const result = validateIncomeSource(source);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Income source ID is required and must be a non-empty string');
    });

    it('should reject empty id', () => {
      const result = validateIncomeSource({ ...validIncomeSource, id: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Income source ID is required and must be a non-empty string');
    });

    it('should reject whitespace-only id', () => {
      const result = validateIncomeSource({ ...validIncomeSource, id: '   ' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Income source ID is required and must be a non-empty string');
    });
  });

  describe('name validation', () => {
    it('should reject missing name', () => {
      const source = { ...validIncomeSource };
      delete (source as any).name;
      const result = validateIncomeSource(source);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Income source name is required and must be a non-empty string');
    });

    it('should reject empty name', () => {
      const result = validateIncomeSource({ ...validIncomeSource, name: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Income source name is required and must be a non-empty string');
    });
  });

  describe('type validation', () => {
    it('should accept all valid types', () => {
      const validTypes: IncomeSource['type'][] = ['regular_job', 'fixed_period', 'one_time', 'rental', 'investment'];
      validTypes.forEach(type => {
        const result = validateIncomeSource({ ...validIncomeSource, type });
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid type', () => {
      const result = validateIncomeSource({ ...validIncomeSource, type: 'invalid' as any });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Income source type must be one of: regular_job, fixed_period, one_time, rental, investment');
    });
  });

  describe('amount validation', () => {
    it('should reject missing amount', () => {
      const source = { ...validIncomeSource };
      delete (source as any).amount;
      const result = validateIncomeSource(source);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Income source amount is required');
    });

    it('should reject zero amount', () => {
      const result = validateIncomeSource({ ...validIncomeSource, amount: 0 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Income source amount must be a positive number');
    });

    it('should reject negative amount', () => {
      const result = validateIncomeSource({ ...validIncomeSource, amount: -1000 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Income source amount must be a positive number');
    });
  });

  describe('frequency validation', () => {
    it('should accept all valid frequencies', () => {
      const validFrequencies: IncomeSource['frequency'][] = ['monthly', 'annual', 'one_time'];
      validFrequencies.forEach(frequency => {
        const result = validateIncomeSource({ ...validIncomeSource, frequency });
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid frequency', () => {
      const result = validateIncomeSource({ ...validIncomeSource, frequency: 'invalid' as any });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Income source frequency must be one of: monthly, annual, one_time');
    });
  });

  describe('date validation for fixed_period', () => {
    it('should accept valid start and end dates', () => {
      const source: IncomeSource = {
        ...validIncomeSource,
        type: 'fixed_period',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      };
      const result = validateIncomeSource(source);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid start date', () => {
      const source: IncomeSource = {
        ...validIncomeSource,
        type: 'fixed_period',
        startDate: new Date('invalid')
      };
      const result = validateIncomeSource(source);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date must be a valid date');
    });

    it('should reject end date before start date', () => {
      const source: IncomeSource = {
        ...validIncomeSource,
        type: 'fixed_period',
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01')
      };
      const result = validateIncomeSource(source);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End date must be after start date');
    });
  });

  describe('annualIncrease validation', () => {
    it('should accept valid annual increase', () => {
      const result = validateIncomeSource({ ...validIncomeSource, annualIncrease: 0.03 });
      expect(result.isValid).toBe(true);
    });

    it('should reject negative annual increase', () => {
      const result = validateIncomeSource({ ...validIncomeSource, annualIncrease: -0.01 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Annual increase must be between 0% and 20% (0.0 to 0.20)');
    });

    it('should reject annual increase above 20%', () => {
      const result = validateIncomeSource({ ...validIncomeSource, annualIncrease: 0.25 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Annual increase must be between 0% and 20% (0.0 to 0.20)');
    });
  });

  describe('contributionPercentage validation', () => {
    it('should accept valid contribution percentage', () => {
      const result = validateIncomeSource({ ...validIncomeSource, contributionPercentage: 0.15 });
      expect(result.isValid).toBe(true);
    });

    it('should reject negative contribution percentage', () => {
      const result = validateIncomeSource({ ...validIncomeSource, contributionPercentage: -0.1 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Contribution percentage must be between 0% and 100% (0.0 to 1.0)');
    });

    it('should reject contribution percentage above 100%', () => {
      const result = validateIncomeSource({ ...validIncomeSource, contributionPercentage: 1.5 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Contribution percentage must be between 0% and 100% (0.0 to 1.0)');
    });
  });

  describe('expectedReturn validation for investment', () => {
    it('should accept valid expected return for investment', () => {
      const source: IncomeSource = {
        ...validIncomeSource,
        type: 'investment',
        expectedReturn: 0.08
      };
      const result = validateIncomeSource(source);
      expect(result.isValid).toBe(true);
    });

    it('should reject negative expected return', () => {
      const source: IncomeSource = {
        ...validIncomeSource,
        type: 'investment',
        expectedReturn: -0.05
      };
      const result = validateIncomeSource(source);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expected return must be between 0% and 30% (0.0 to 0.30)');
    });

    it('should reject expected return above 30%', () => {
      const source: IncomeSource = {
        ...validIncomeSource,
        type: 'investment',
        expectedReturn: 0.35
      };
      const result = validateIncomeSource(source);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expected return must be between 0% and 30% (0.0 to 0.30)');
    });
  });
});

describe('validateExpense', () => {
  const validExpense: Expense = {
    id: 'test-expense-id',
    name: 'Test Expense',
    type: 'regular',
    amount: 1000,
    frequency: 'monthly',
    inflationAdjusted: true
  };

  it('should validate correct expense', () => {
    const result = validateExpense(validExpense);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  describe('id validation', () => {
    it('should reject missing id', () => {
      const expense = { ...validExpense };
      delete (expense as any).id;
      const result = validateExpense(expense);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expense ID is required and must be a non-empty string');
    });

    it('should reject empty id', () => {
      const result = validateExpense({ ...validExpense, id: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expense ID is required and must be a non-empty string');
    });
  });

  describe('name validation', () => {
    it('should reject missing name', () => {
      const expense = { ...validExpense };
      delete (expense as any).name;
      const result = validateExpense(expense);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expense name is required and must be a non-empty string');
    });

    it('should reject empty name', () => {
      const result = validateExpense({ ...validExpense, name: '' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expense name is required and must be a non-empty string');
    });
  });

  describe('type validation', () => {
    it('should accept all valid types', () => {
      const validTypes: Expense['type'][] = ['regular', 'annual', 'one_time'];
      validTypes.forEach(type => {
        const result = validateExpense({ ...validExpense, type });
        expect(result.isValid).toBe(true);
      });
    });

    it('should accept loan type with loan details', () => {
      const loanExpense: Expense = {
        ...validExpense,
        type: 'loan',
        loanDetails: {
          principal: 200000,
          interestRate: 0.045,
          termYears: 30
        }
      };
      const result = validateExpense(loanExpense);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid type', () => {
      const result = validateExpense({ ...validExpense, type: 'invalid' as any });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expense type must be one of: regular, loan, annual, one_time');
    });
  });

  describe('amount validation', () => {
    it('should reject missing amount', () => {
      const expense = { ...validExpense };
      delete (expense as any).amount;
      const result = validateExpense(expense);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expense amount is required');
    });

    it('should accept zero amount', () => {
      const result = validateExpense({ ...validExpense, amount: 0 });
      expect(result.isValid).toBe(true);
    });

    it('should reject negative amount', () => {
      const result = validateExpense({ ...validExpense, amount: -1000 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expense amount must be a non-negative number');
    });
  });

  describe('frequency validation', () => {
    it('should accept all valid frequencies', () => {
      const validFrequencies: Expense['frequency'][] = ['monthly', 'annual', 'one_time'];
      validFrequencies.forEach(frequency => {
        const result = validateExpense({ ...validExpense, frequency });
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid frequency', () => {
      const result = validateExpense({ ...validExpense, frequency: 'invalid' as any });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expense frequency must be one of: monthly, annual, one_time');
    });
  });

  describe('inflationAdjusted validation', () => {
    it('should reject missing inflationAdjusted', () => {
      const expense = { ...validExpense };
      delete (expense as any).inflationAdjusted;
      const result = validateExpense(expense);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Inflation adjusted flag is required');
    });

    it('should reject non-boolean inflationAdjusted', () => {
      const result = validateExpense({ ...validExpense, inflationAdjusted: 'true' as any });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Inflation adjusted must be a boolean value');
    });
  });

  describe('date validation', () => {
    it('should accept valid start and end dates', () => {
      const expense: Expense = {
        ...validExpense,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      };
      const result = validateExpense(expense);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid start date', () => {
      const expense: Expense = {
        ...validExpense,
        startDate: new Date('invalid')
      };
      const result = validateExpense(expense);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date must be a valid date');
    });

    it('should reject end date before start date', () => {
      const expense: Expense = {
        ...validExpense,
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01')
      };
      const result = validateExpense(expense);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End date must be after start date');
    });
  });

  describe('loan details validation', () => {
    it('should accept valid loan details', () => {
      const loanExpense: Expense = {
        ...validExpense,
        type: 'loan',
        loanDetails: {
          principal: 200000,
          interestRate: 0.045,
          termYears: 30
        }
      };
      const result = validateExpense(loanExpense);
      expect(result.isValid).toBe(true);
    });

    it('should reject loan expense without loan details', () => {
      const loanExpense: Expense = {
        ...validExpense,
        type: 'loan'
      };
      const result = validateExpense(loanExpense);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Loan details are required for loan expenses');
    });

    it('should reject invalid loan principal', () => {
      const loanExpense: Expense = {
        ...validExpense,
        type: 'loan',
        loanDetails: {
          principal: -100000,
          interestRate: 0.045,
          termYears: 30
        }
      };
      const result = validateExpense(loanExpense);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Loan principal must be a positive number');
    });

    it('should reject invalid loan interest rate', () => {
      const loanExpense: Expense = {
        ...validExpense,
        type: 'loan',
        loanDetails: {
          principal: 200000,
          interestRate: 0.60,
          termYears: 30
        }
      };
      const result = validateExpense(loanExpense);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Loan interest rate must be between 0% and 50% (0.0 to 0.50)');
    });

    it('should reject invalid loan term', () => {
      const loanExpense: Expense = {
        ...validExpense,
        type: 'loan',
        loanDetails: {
          principal: 200000,
          interestRate: 0.045,
          termYears: 60
        }
      };
      const result = validateExpense(loanExpense);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Loan term must be between 1 and 50 years');
    });
  });
});

describe('migrateLegacyRetirementData', () => {
  it('should migrate legacy data with monthly contribution', () => {
    const legacyData = {
      currentAge: 30,
      retirementAge: 65,
      currentSavings: 50000,
      monthlyContribution: 1000,
      expectedAnnualReturn: 0.07,
      lastUpdated: new Date('2024-01-01')
    };

    const migrated = migrateLegacyRetirementData(legacyData);

    expect(migrated.currentAge).toBe(30);
    expect(migrated.retirementAge).toBe(65);
    expect(migrated.currentSavings).toBe(50000);
    expect(migrated.expectedAnnualReturn).toBe(0.07);
    expect(migrated.inflationRate).toBe(0.03);
    expect(migrated.monthlyRetirementSpending).toBe(4000);
    expect(migrated.incomeSources).toHaveLength(1);
    expect(migrated.incomeSources[0].id).toBe('legacy-contribution');
    expect(migrated.incomeSources[0].amount).toBe(1000);
    expect(migrated.incomeSources[0].contributionPercentage).toBe(1.0);
    expect(migrated.expenses).toHaveLength(0);
  });

  it('should migrate legacy data without monthly contribution', () => {
    const legacyData = {
      currentAge: 25,
      retirementAge: 60,
      currentSavings: 0,
      monthlyContribution: 0,
      expectedAnnualReturn: 0.08
    };

    const migrated = migrateLegacyRetirementData(legacyData);

    expect(migrated.incomeSources).toHaveLength(0);
  });

  it('should use default values for missing fields', () => {
    const legacyData = {};

    const migrated = migrateLegacyRetirementData(legacyData);

    expect(migrated.currentAge).toBe(25);
    expect(migrated.retirementAge).toBe(65);
    expect(migrated.currentSavings).toBe(0);
    expect(migrated.expectedAnnualReturn).toBe(0.07);
    expect(migrated.inflationRate).toBe(0.03);
    expect(migrated.monthlyRetirementSpending).toBe(4000);
  });
});

describe('needsMigration', () => {
  it('should return true for legacy data with monthlyContribution', () => {
    const legacyData = {
      currentAge: 30,
      monthlyContribution: 1000
    };

    expect(needsMigration(legacyData)).toBe(true);
  });

  it('should return false for new data with incomeSources', () => {
    const newData = {
      currentAge: 30,
      incomeSources: []
    };

    expect(needsMigration(newData)).toBe(false);
  });

  it('should return false for data with both monthlyContribution and incomeSources', () => {
    const mixedData = {
      currentAge: 30,
      monthlyContribution: 1000,
      incomeSources: []
    };

    expect(needsMigration(mixedData)).toBe(false);
  });

  it('should return false for invalid data', () => {
    expect(needsMigration(null)).toBe(false);
    expect(needsMigration(undefined)).toBe(false);
    expect(needsMigration('invalid')).toBe(false);
  });
});

describe('generateUniqueId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateUniqueId();
    const id2 = generateUniqueId();

    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');
    expect(id1.length).toBeGreaterThan(0);
    expect(id2.length).toBeGreaterThan(0);
  });

  it('should generate IDs with expected format', () => {
    const id = generateUniqueId();
    
    // Should contain timestamp and random part separated by dash
    expect(id).toMatch(/^\d+-[a-z0-9]+$/);
  });
});