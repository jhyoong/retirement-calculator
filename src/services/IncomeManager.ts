import type { IncomeSource, ValidationResult } from '../types/index.js';
import { validateIncomeSource, generateUniqueId } from '../utils/validation.js';

/**
 * IncomeManager handles multiple income sources and their calculations
 * Supports different income types with specific calculation logic
 */
export class IncomeManager {
  private incomeSources: IncomeSource[] = [];

  /**
   * Adds a new income source to the manager
   * @param source - The income source to add
   * @returns ValidationResult indicating success or failure
   */
  addIncomeSource(source: Omit<IncomeSource, 'id'>): ValidationResult {
    // Generate ID if not provided
    const newSource: IncomeSource = {
      ...source,
      id: generateUniqueId()
    };

    // Validate the income source
    const validation = validateIncomeSource(newSource);
    if (!validation.isValid) {
      return validation;
    }

    // Check for duplicate names
    const existingNames = this.incomeSources.map(s => s.name.toLowerCase());
    if (existingNames.includes(newSource.name.toLowerCase())) {
      return {
        isValid: false,
        errors: ['An income source with this name already exists']
      };
    }

    this.incomeSources.push(newSource);
    return { isValid: true, errors: [] };
  }

  /**
   * Removes an income source by ID
   * @param id - The ID of the income source to remove
   * @returns True if removed, false if not found
   */
  removeIncomeSource(id: string): boolean {
    const initialLength = this.incomeSources.length;
    this.incomeSources = this.incomeSources.filter(source => source.id !== id);
    return this.incomeSources.length < initialLength;
  }

  /**
   * Updates an existing income source
   * @param id - The ID of the income source to update
   * @param updates - The fields to update
   * @returns ValidationResult indicating success or failure
   */
  updateIncomeSource(id: string, updates: Partial<Omit<IncomeSource, 'id'>>): ValidationResult {
    const sourceIndex = this.incomeSources.findIndex(source => source.id === id);
    if (sourceIndex === -1) {
      return {
        isValid: false,
        errors: ['Income source not found']
      };
    }

    const updatedSource = { ...this.incomeSources[sourceIndex], ...updates };
    const validation = validateIncomeSource(updatedSource);
    if (!validation.isValid) {
      return validation;
    }

    // Check for duplicate names (excluding current source)
    if (updates.name) {
      const existingNames = this.incomeSources
        .filter(s => s.id !== id)
        .map(s => s.name.toLowerCase());
      if (existingNames.includes(updates.name.toLowerCase())) {
        return {
          isValid: false,
          errors: ['An income source with this name already exists']
        };
      }
    }

    this.incomeSources[sourceIndex] = updatedSource;
    return { isValid: true, errors: [] };
  }

  /**
   * Gets all income sources
   * @returns Array of all income sources
   */
  getAllIncomeSources(): IncomeSource[] {
    return [...this.incomeSources];
  }

  /**
   * Gets an income source by ID
   * @param id - The ID of the income source
   * @returns The income source or undefined if not found
   */
  getIncomeSourceById(id: string): IncomeSource | undefined {
    return this.incomeSources.find(source => source.id === id);
  }

  /**
   * Calculates total monthly income from all sources at a specific date
   * @param currentDate - The date to calculate income for
   * @param currentAge - The current age for age-based calculations
   * @returns Total monthly income amount
   */
  calculateMonthlyIncome(currentDate: Date, currentAge: number): number {
    return this.incomeSources.reduce((total, source) => {
      const monthlyAmount = this.calculateSourceMonthlyIncome(source, currentDate, currentAge);
      return total + monthlyAmount;
    }, 0);
  }

  /**
   * Calculates total monthly retirement contributions from all sources
   * @param currentDate - The date to calculate contributions for
   * @param currentAge - The current age for age-based calculations
   * @returns Total monthly contribution amount
   */
  calculateMonthlyContributions(currentDate: Date, currentAge: number): number {
    return this.incomeSources.reduce((total, source) => {
      const monthlyIncome = this.calculateSourceMonthlyIncome(source, currentDate, currentAge);
      const contributionPercentage = source.contributionPercentage || 0;
      return total + (monthlyIncome * contributionPercentage);
    }, 0);
  }

  /**
   * Calculates monthly income for a specific income source
   * @param source - The income source to calculate
   * @param currentDate - The date to calculate income for
   * @param currentAge - The current age for age-based calculations
   * @returns Monthly income amount for this source
   */
  private calculateSourceMonthlyIncome(source: IncomeSource, currentDate: Date, currentAge: number): number {
    // Check if income source is active at the current date
    if (!this.isSourceActiveAtDate(source, currentDate)) {
      return 0;
    }

    let baseAmount = source.amount;

    // Apply annual increases for regular jobs and rental income
    if ((source.type === 'regular_job' || source.type === 'rental') && source.annualIncrease) {
      const yearsElapsed = this.calculateYearsElapsed(source, currentDate);
      baseAmount = baseAmount * Math.pow(1 + source.annualIncrease, yearsElapsed);
    }

    // Convert to monthly amount based on frequency
    switch (source.frequency) {
      case 'monthly':
        return baseAmount;
      case 'annual':
        return baseAmount / 12;
      case 'one_time':
        // For one-time income, return the amount only in the month it occurs
        return this.isOneTimeIncomeMonth(source, currentDate) ? baseAmount : 0;
      default:
        return 0;
    }
  }

  /**
   * Checks if an income source is active at a specific date
   * @param source - The income source to check
   * @param currentDate - The date to check
   * @returns True if the source is active
   */
  private isSourceActiveAtDate(source: IncomeSource, currentDate: Date): boolean {
    // Check start date
    if (source.startDate) {
      const startDate = new Date(source.startDate);
      if (currentDate < startDate) {
        return false;
      }
    }

    // Check end date for fixed period income
    if (source.type === 'fixed_period' && source.endDate) {
      const endDate = new Date(source.endDate);
      if (currentDate > endDate) {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if a one-time income occurs in the current month
   * @param source - The income source (must be one_time type)
   * @param currentDate - The date to check
   * @returns True if the one-time income occurs this month
   */
  private isOneTimeIncomeMonth(source: IncomeSource, currentDate: Date): boolean {
    if (source.type !== 'one_time' || !source.startDate) {
      return false;
    }

    const incomeDate = new Date(source.startDate);
    return (
      incomeDate.getFullYear() === currentDate.getFullYear() &&
      incomeDate.getMonth() === currentDate.getMonth()
    );
  }

  /**
   * Calculates years elapsed since the income source started
   * @param source - The income source
   * @param currentDate - The current date
   * @returns Number of years elapsed (can be fractional)
   */
  private calculateYearsElapsed(source: IncomeSource, currentDate: Date): number {
    if (!source.startDate) {
      return 0;
    }

    const startDate = new Date(source.startDate);
    const timeDiff = currentDate.getTime() - startDate.getTime();
    const yearsDiff = timeDiff / (1000 * 60 * 60 * 24 * 365.25); // Account for leap years
    return Math.max(0, yearsDiff);
  }

  /**
   * Gets active income sources at a specific date
   * @param currentDate - The date to check
   * @returns Array of active income sources
   */
  getActiveIncomeSources(currentDate: Date): IncomeSource[] {
    return this.incomeSources.filter(source => this.isSourceActiveAtDate(source, currentDate));
  }

  /**
   * Calculates projected income for a future date
   * @param futureDate - The future date to project income for
   * @param currentAge - The current age
   * @returns Projected monthly income
   */
  projectMonthlyIncome(futureDate: Date, currentAge: number): number {
    const futureAge = currentAge + this.calculateYearsElapsed({ startDate: new Date() } as IncomeSource, futureDate);
    return this.calculateMonthlyIncome(futureDate, futureAge);
  }

  /**
   * Validates all income sources in the manager
   * @returns ValidationResult for all sources
   */
  validateAllSources(): ValidationResult {
    const errors: string[] = [];

    this.incomeSources.forEach((source, index) => {
      const validation = validateIncomeSource(source);
      if (!validation.isValid) {
        errors.push(...validation.errors.map(error => `Income source ${index + 1} (${source.name}): ${error}`));
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Clears all income sources
   */
  clearAllSources(): void {
    this.incomeSources = [];
  }

  /**
   * Sets income sources from an array (used for loading data)
   * @param sources - Array of income sources to set
   * @returns ValidationResult indicating if all sources are valid
   */
  setIncomeSources(sources: IncomeSource[]): ValidationResult {
    const validation = this.validateSourcesArray(sources);
    if (validation.isValid) {
      this.incomeSources = [...sources];
    }
    return validation;
  }

  /**
   * Validates an array of income sources
   * @param sources - Array of income sources to validate
   * @returns ValidationResult
   */
  private validateSourcesArray(sources: IncomeSource[]): ValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(sources)) {
      return {
        isValid: false,
        errors: ['Income sources must be an array']
      };
    }

    // Check for duplicate IDs
    const ids = sources.map(s => s.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate income source IDs found: ${duplicateIds.join(', ')}`);
    }

    // Check for duplicate names
    const names = sources.map(s => s.name.toLowerCase());
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      errors.push(`Duplicate income source names found: ${duplicateNames.join(', ')}`);
    }

    // Validate each source
    sources.forEach((source, index) => {
      const validation = validateIncomeSource(source);
      if (!validation.isValid) {
        errors.push(...validation.errors.map(error => `Income source ${index + 1}: ${error}`));
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Gets summary statistics for all income sources
   * @param currentDate - The date to calculate statistics for
   * @param currentAge - The current age
   * @returns Summary object with income statistics
   */
  getIncomeSummary(currentDate: Date, currentAge: number) {
    const activeSources = this.getActiveIncomeSources(currentDate);
    const totalMonthlyIncome = this.calculateMonthlyIncome(currentDate, currentAge);
    const totalMonthlyContributions = this.calculateMonthlyContributions(currentDate, currentAge);

    return {
      totalSources: this.incomeSources.length,
      activeSources: activeSources.length,
      totalMonthlyIncome,
      totalMonthlyContributions,
      contributionRate: totalMonthlyIncome > 0 ? totalMonthlyContributions / totalMonthlyIncome : 0,
      sourcesByType: this.getSourcesByType()
    };
  }

  /**
   * Groups income sources by type
   * @returns Object with sources grouped by type
   */
  private getSourcesByType() {
    return this.incomeSources.reduce((acc, source) => {
      if (!acc[source.type]) {
        acc[source.type] = [];
      }
      acc[source.type].push(source);
      return acc;
    }, {} as Record<string, IncomeSource[]>);
  }
}