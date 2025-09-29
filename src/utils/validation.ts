import type { RetirementData, ValidationResult } from '../types/index.js';

/**
 * Validates retirement data input fields
 * @param data - The retirement data to validate
 * @returns ValidationResult with isValid flag and error messages
 */
export function validateRetirementData(data: Partial<RetirementData>): ValidationResult {
  const errors: string[] = [];

  // Validate current age
  if (data.currentAge === undefined || data.currentAge === null) {
    errors.push('Current age is required');
  } else if (!Number.isInteger(data.currentAge) || data.currentAge < 18 || data.currentAge > 100) {
    errors.push('Current age must be an integer between 18 and 100');
  }

  // Validate retirement age
  if (data.retirementAge === undefined || data.retirementAge === null) {
    errors.push('Retirement age is required');
  } else if (!Number.isInteger(data.retirementAge) || data.retirementAge < 18 || data.retirementAge > 100) {
    errors.push('Retirement age must be an integer between 18 and 100');
  } else if (data.currentAge !== undefined && data.retirementAge <= data.currentAge) {
    errors.push('Retirement age must be greater than current age');
  }

  // Validate current savings
  if (data.currentSavings === undefined || data.currentSavings === null) {
    errors.push('Current savings is required');
  } else if (typeof data.currentSavings !== 'number' || !Number.isFinite(data.currentSavings)) {
    errors.push('Current savings must be a finite number');
  } else if (data.currentSavings < 0) {
    errors.push('Current savings must be a non-negative number');
  }

  // Validate monthly contribution
  if (data.monthlyContribution === undefined || data.monthlyContribution === null) {
    errors.push('Monthly contribution is required');
  } else if (typeof data.monthlyContribution !== 'number' || !Number.isFinite(data.monthlyContribution)) {
    errors.push('Monthly contribution must be a finite number');
  } else if (data.monthlyContribution < 0) {
    errors.push('Monthly contribution must be a non-negative number');
  }

  // Validate expected annual return
  if (data.expectedAnnualReturn === undefined || data.expectedAnnualReturn === null) {
    errors.push('Expected annual return is required');
  } else if (typeof data.expectedAnnualReturn !== 'number' || !Number.isFinite(data.expectedAnnualReturn)) {
    errors.push('Expected annual return must be a finite number');
  } else if (data.expectedAnnualReturn < 0 || data.expectedAnnualReturn > 0.20) {
    errors.push('Expected annual return must be between 0% and 20% (0.0 to 0.20)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates individual numeric field values
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @param allowDecimals - Whether decimal values are allowed
 * @returns ValidationResult
 */
export function validateNumericField(
  value: any,
  fieldName: string,
  min: number,
  max: number,
  allowDecimals: boolean = true
): ValidationResult {
  const errors: string[] = [];

  if (value === undefined || value === null || value === '') {
    errors.push(`${fieldName} is required`);
  } else if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${fieldName} must be a valid number`);
  } else if (value < min || value > max) {
    errors.push(`${fieldName} must be between ${min} and ${max}`);
  } else if (!allowDecimals && !Number.isInteger(value)) {
    errors.push(`${fieldName} must be a whole number`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates export data structure
 * @param data - The export data to validate
 * @returns ValidationResult
 */
export function validateExportData(data: any): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Export data must be a valid object');
    return { isValid: false, errors };
  }

  // Validate version
  if (!data.version || typeof data.version !== 'string') {
    errors.push('Export data must include a valid version string');
  }

  // Validate export date
  if (!data.exportDate) {
    errors.push('Export data must include an export date');
  } else {
    const date = new Date(data.exportDate);
    if (isNaN(date.getTime())) {
      errors.push('Export date must be a valid date');
    }
  }

  // Validate user data
  if (!data.userData) {
    errors.push('Export data must include user data');
  } else {
    const userDataValidation = validateRetirementData(data.userData);
    if (!userDataValidation.isValid) {
      errors.push(...userDataValidation.errors.map(error => `User data: ${error}`));
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes numeric input by converting strings to numbers and handling edge cases
 * @param value - The input value to sanitize
 * @returns Sanitized number or null if invalid
 */
export function sanitizeNumericInput(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    
    // Check if the string is purely numeric (including decimals)
    if (!/^-?\d*\.?\d+$/.test(trimmed)) return null;
    
    const parsed = parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}