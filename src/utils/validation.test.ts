import { describe, it, expect } from 'vitest';
import {
  validateRetirementData,
  validateNumericField,
  validateExportData,
  sanitizeNumericInput
} from './validation.js';
import type { RetirementData } from '../types/index.js';

describe('validateRetirementData', () => {
  const validData: RetirementData = {
    currentAge: 30,
    retirementAge: 65,
    currentSavings: 50000,
    monthlyContribution: 1000,
    expectedAnnualReturn: 0.07,
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

  describe('monthlyContribution validation', () => {
    it('should reject missing monthly contribution', () => {
      const data = { ...validData };
      delete (data as any).monthlyContribution;
      const result = validateRetirementData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Monthly contribution is required');
    });

    it('should reject negative monthly contribution', () => {
      const result = validateRetirementData({ ...validData, monthlyContribution: -500 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Monthly contribution must be a non-negative number');
    });

    it('should accept zero monthly contribution', () => {
      const result = validateRetirementData({ ...validData, monthlyContribution: 0 });
      expect(result.isValid).toBe(true);
    });

    it('should reject infinite monthly contribution', () => {
      const result = validateRetirementData({ ...validData, monthlyContribution: Infinity });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Monthly contribution must be a finite number');
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
      expect(result.errors).toContain('Expected annual return must be between 0% and 20% (0.0 to 0.20)');
    });

    it('should reject expected annual return above 20%', () => {
      const result = validateRetirementData({ ...validData, expectedAnnualReturn: 0.25 });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expected annual return must be between 0% and 20% (0.0 to 0.20)');
    });

    it('should accept 0% expected annual return', () => {
      const result = validateRetirementData({ ...validData, expectedAnnualReturn: 0 });
      expect(result.isValid).toBe(true);
    });

    it('should accept 20% expected annual return', () => {
      const result = validateRetirementData({ ...validData, expectedAnnualReturn: 0.20 });
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
      monthlyContribution: 1000,
      expectedAnnualReturn: 0.07,
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