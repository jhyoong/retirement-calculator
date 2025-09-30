import type { RetirementData, ValidationResult, IncomeSource, Expense } from '../types/index.js';

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

  // Validate expected annual return
  if (data.expectedAnnualReturn === undefined || data.expectedAnnualReturn === null) {
    errors.push('Expected annual return is required');
  } else if (typeof data.expectedAnnualReturn !== 'number' || !Number.isFinite(data.expectedAnnualReturn)) {
    errors.push('Expected annual return must be a finite number');
  } else if (data.expectedAnnualReturn < 0 || data.expectedAnnualReturn > 0.30) {
    errors.push('Expected annual return must be between 0% and 30% (0.0 to 0.30)');
  }

  // Validate inflation rate
  if (data.inflationRate !== undefined && data.inflationRate !== null) {
    if (typeof data.inflationRate !== 'number' || !Number.isFinite(data.inflationRate)) {
      errors.push('Inflation rate must be a finite number');
    } else if (data.inflationRate < 0 || data.inflationRate > 0.15) {
      errors.push('Inflation rate must be between 0% and 15% (0.0 to 0.15)');
    }
  }

  // Validate monthly retirement spending
  if (data.monthlyRetirementSpending !== undefined && data.monthlyRetirementSpending !== null) {
    if (typeof data.monthlyRetirementSpending !== 'number' || !Number.isFinite(data.monthlyRetirementSpending)) {
      errors.push('Monthly retirement spending must be a finite number');
    } else if (data.monthlyRetirementSpending < 0) {
      errors.push('Monthly retirement spending must be a non-negative number');
    }
  }

  // Validate income sources
  if (data.incomeSources) {
    if (!Array.isArray(data.incomeSources)) {
      errors.push('Income sources must be an array');
    } else {
      data.incomeSources.forEach((source, index) => {
        const sourceValidation = validateIncomeSource(source);
        if (!sourceValidation.isValid) {
          errors.push(...sourceValidation.errors.map(error => `Income source ${index + 1}: ${error}`));
        }
      });
    }
  }

  // Validate expenses
  if (data.expenses) {
    if (!Array.isArray(data.expenses)) {
      errors.push('Expenses must be an array');
    } else {
      data.expenses.forEach((expense, index) => {
        const expenseValidation = validateExpense(expense);
        if (!expenseValidation.isValid) {
          errors.push(...expenseValidation.errors.map(error => `Expense ${index + 1}: ${error}`));
        }
      });
    }
  }

  // Validate legacy monthly contribution (for backward compatibility)
  if (data.monthlyContribution !== undefined && data.monthlyContribution !== null) {
    if (typeof data.monthlyContribution !== 'number' || !Number.isFinite(data.monthlyContribution)) {
      errors.push('Monthly contribution must be a finite number');
    } else if (data.monthlyContribution < 0) {
      errors.push('Monthly contribution must be a non-negative number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates an income source
 * @param source - The income source to validate
 * @param requireId - Whether to require an ID (false for new sources being created)
 * @returns ValidationResult with isValid flag and error messages
 */
export function validateIncomeSource(source: Partial<IncomeSource>, requireId: boolean = true): ValidationResult {
  const errors: string[] = [];

  // Validate ID (only if required - not needed for new sources)
  if (requireId && (!source.id || typeof source.id !== 'string' || source.id.trim() === '')) {
    errors.push('Income source ID is required and must be a non-empty string');
  }

  // Validate name
  if (!source.name || typeof source.name !== 'string' || source.name.trim() === '') {
    errors.push('Income source name is required and must be a non-empty string');
  }

  // Validate type
  const validTypes = ['regular_job', 'fixed_period', 'one_time', 'rental', 'investment'];
  if (!source.type || !validTypes.includes(source.type)) {
    errors.push(`Income source type must be one of: ${validTypes.join(', ')}`);
  }

  // Validate amount
  if (source.amount === undefined || source.amount === null) {
    errors.push('Income source amount is required');
  } else if (typeof source.amount !== 'number' || !Number.isFinite(source.amount)) {
    errors.push('Income source amount must be a finite number');
  } else if (source.amount <= 0) {
    errors.push('Income source amount must be a positive number');
  }

  // Validate frequency
  const validFrequencies = ['monthly', 'annual', 'one_time'];
  if (!source.frequency || !validFrequencies.includes(source.frequency)) {
    errors.push(`Income source frequency must be one of: ${validFrequencies.join(', ')}`);
  }

  // Validate dates for fixed period and one-time income
  if (source.type === 'fixed_period' || source.type === 'one_time') {
    if (source.startDate) {
      const startDate = new Date(source.startDate);
      if (isNaN(startDate.getTime())) {
        errors.push('Start date must be a valid date');
      }
    }

    if (source.type === 'fixed_period' && source.endDate) {
      const endDate = new Date(source.endDate);
      if (isNaN(endDate.getTime())) {
        errors.push('End date must be a valid date');
      } else if (source.startDate) {
        const startDate = new Date(source.startDate);
        if (endDate <= startDate) {
          errors.push('End date must be after start date');
        }
      }
    }
  }

  // Validate annual increase
  if (source.annualIncrease !== undefined && source.annualIncrease !== null) {
    if (typeof source.annualIncrease !== 'number' || !Number.isFinite(source.annualIncrease)) {
      errors.push('Annual increase must be a finite number');
    } else if (source.annualIncrease < 0 || source.annualIncrease > 0.20) {
      errors.push('Annual increase must be between 0% and 20% (0.0 to 0.20)');
    }
  }

  // Validate contribution percentage
  if (source.contributionPercentage !== undefined && source.contributionPercentage !== null) {
    if (typeof source.contributionPercentage !== 'number' || !Number.isFinite(source.contributionPercentage)) {
      errors.push('Contribution percentage must be a finite number');
    } else if (source.contributionPercentage < 0 || source.contributionPercentage > 1) {
      errors.push('Contribution percentage must be between 0% and 100% (0.0 to 1.0)');
    }
  }

  // Validate expected return for investment income
  if (source.type === 'investment' && source.expectedReturn !== undefined && source.expectedReturn !== null) {
    if (typeof source.expectedReturn !== 'number' || !Number.isFinite(source.expectedReturn)) {
      errors.push('Expected return must be a finite number');
    } else if (source.expectedReturn < 0 || source.expectedReturn > 0.30) {
      errors.push('Expected return must be between 0% and 30% (0.0 to 0.30)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates an expense
 * @param expense - The expense to validate
 * @returns ValidationResult with isValid flag and error messages
 */
export function validateExpense(expense: Partial<Expense>): ValidationResult {
  const errors: string[] = [];

  // Validate ID
  if (!expense.id || typeof expense.id !== 'string' || expense.id.trim() === '') {
    errors.push('Expense ID is required and must be a non-empty string');
  }

  // Validate name
  if (!expense.name || typeof expense.name !== 'string' || expense.name.trim() === '') {
    errors.push('Expense name is required and must be a non-empty string');
  }

  // Validate type
  const validTypes = ['regular', 'loan', 'annual', 'one_time'];
  if (!expense.type || !validTypes.includes(expense.type)) {
    errors.push(`Expense type must be one of: ${validTypes.join(', ')}`);
  }

  // Validate amount
  if (expense.amount === undefined || expense.amount === null) {
    errors.push('Expense amount is required');
  } else if (typeof expense.amount !== 'number' || !Number.isFinite(expense.amount)) {
    errors.push('Expense amount must be a finite number');
  } else if (expense.amount < 0) {
    errors.push('Expense amount must be a non-negative number');
  }

  // Validate frequency
  const validFrequencies = ['monthly', 'annual', 'one_time'];
  if (!expense.frequency || !validFrequencies.includes(expense.frequency)) {
    errors.push(`Expense frequency must be one of: ${validFrequencies.join(', ')}`);
  }

  // Validate inflation adjusted flag
  if (expense.inflationAdjusted === undefined || expense.inflationAdjusted === null) {
    errors.push('Inflation adjusted flag is required');
  } else if (typeof expense.inflationAdjusted !== 'boolean') {
    errors.push('Inflation adjusted must be a boolean value');
  }

  // Validate dates for time-limited expenses
  if (expense.startDate) {
    const startDate = new Date(expense.startDate);
    if (isNaN(startDate.getTime())) {
      errors.push('Start date must be a valid date');
    }
  }

  if (expense.endDate) {
    const endDate = new Date(expense.endDate);
    if (isNaN(endDate.getTime())) {
      errors.push('End date must be a valid date');
    } else if (expense.startDate) {
      const startDate = new Date(expense.startDate);
      if (endDate <= startDate) {
        errors.push('End date must be after start date');
      }
    }
  }

  // Validate loan details for loan expenses
  if (expense.type === 'loan' && expense.loanDetails) {
    const { principal, interestRate, termYears } = expense.loanDetails;

    if (principal === undefined || principal === null) {
      errors.push('Loan principal is required');
    } else if (typeof principal !== 'number' || !Number.isFinite(principal)) {
      errors.push('Loan principal must be a finite number');
    } else if (principal <= 0) {
      errors.push('Loan principal must be a positive number');
    }

    if (interestRate === undefined || interestRate === null) {
      errors.push('Loan interest rate is required');
    } else if (typeof interestRate !== 'number' || !Number.isFinite(interestRate)) {
      errors.push('Loan interest rate must be a finite number');
    } else if (interestRate < 0 || interestRate > 0.50) {
      errors.push('Loan interest rate must be between 0% and 50% (0.0 to 0.50)');
    }

    if (termYears === undefined || termYears === null) {
      errors.push('Loan term is required');
    } else if (typeof termYears !== 'number' || !Number.isFinite(termYears)) {
      errors.push('Loan term must be a finite number');
    } else if (termYears <= 0 || termYears > 50) {
      errors.push('Loan term must be between 1 and 50 years');
    }
  } else if (expense.type === 'loan' && !expense.loanDetails) {
    errors.push('Loan details are required for loan expenses');
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
/**

 * Migrates legacy retirement data to the new structure with income sources
 * @param legacyData - The legacy retirement data with monthlyContribution
 * @returns Migrated retirement data with income sources
 */
export function migrateLegacyRetirementData(legacyData: any): RetirementData {
  // Create base structure with new required fields
  const migratedData: RetirementData = {
    currentAge: legacyData.currentAge || 25,
    retirementAge: legacyData.retirementAge || 65,
    currentSavings: legacyData.currentSavings || 0,
    expectedAnnualReturn: legacyData.expectedAnnualReturn || 0.07,
    inflationRate: legacyData.inflationRate || 0.03,
    monthlyRetirementSpending: legacyData.monthlyRetirementSpending || 4000,
    incomeSources: [],
    expenses: [],
    lastUpdated: legacyData.lastUpdated ? new Date(legacyData.lastUpdated) : new Date(),
    // Preserve legacy field for backward compatibility
    monthlyContribution: legacyData.monthlyContribution || 0
  };

  // Migrate legacy monthlyContribution to an income source
  if (legacyData.monthlyContribution && legacyData.monthlyContribution > 0) {
    const legacyIncomeSource: IncomeSource = {
      id: 'legacy-contribution',
      name: 'Monthly Contribution (Migrated)',
      type: 'regular_job',
      amount: legacyData.monthlyContribution,
      frequency: 'monthly',
      contributionPercentage: 1.0 // Assume 100% contribution for legacy data
    };
    migratedData.incomeSources.push(legacyIncomeSource);
  }

  return migratedData;
}

/**
 * Checks if retirement data needs migration from legacy format
 * @param data - The retirement data to check
 * @returns True if migration is needed
 */
export function needsMigration(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check if it has the old structure (monthlyContribution) but not the new structure (incomeSources)
  return (
    data.monthlyContribution !== undefined &&
    (data.incomeSources === undefined || !Array.isArray(data.incomeSources))
  );
}

/**
 * Generates a unique ID for income sources and expenses
 * @returns A unique string ID
 */
export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}