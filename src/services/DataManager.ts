import type { RetirementData } from '../types';
import { migrateLegacyRetirementData, needsMigration } from '../utils/validation.js';

/**
 * DataManager handles data persistence using browser localStorage
 * Provides automatic save functionality with error handling
 */
export class DataManager {
  private static readonly STORAGE_KEY = 'retirement-calculator-data';
  private static readonly VERSION_KEY = 'retirement-calculator-version';
  private static readonly CURRENT_VERSION = '1.0.0';

  /**
   * Save retirement data to localStorage
   * @param data RetirementData to save
   * @throws Error if localStorage is not available or save fails
   */
  saveData(data: RetirementData): void {
    if (!this.isLocalStorageAvailable()) {
      throw new Error('localStorage not available');
    }

    try {
      // Update the lastUpdated timestamp
      const dataToSave: RetirementData = {
        ...data,
        lastUpdated: new Date()
      };

      const serializedData = JSON.stringify(dataToSave);
      localStorage.setItem(DataManager.STORAGE_KEY, serializedData);
      localStorage.setItem(DataManager.VERSION_KEY, DataManager.CURRENT_VERSION);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to save data: ${error.message}`);
      }
      throw new Error('Failed to save data: Unknown error');
    }
  }

  /**
   * Load retirement data from localStorage
   * @returns RetirementData if found and valid, null otherwise
   */
  loadData(): RetirementData | null {
    try {
      if (!this.isLocalStorageAvailable()) {
        return null;
      }

      const serializedData = localStorage.getItem(DataManager.STORAGE_KEY);
      if (!serializedData) {
        return null;
      }

      const parsedData = JSON.parse(serializedData);
      
      // Check if data needs migration from legacy format
      if (needsMigration(parsedData)) {
        console.log('Migrating legacy data to new format');
        const migratedData = migrateLegacyRetirementData(parsedData);
        
        // Save the migrated data
        this.saveData(migratedData);
        
        return {
          ...migratedData,
          lastUpdated: new Date(migratedData.lastUpdated)
        };
      }
      
      // Validate the loaded data structure
      if (!this.isValidRetirementData(parsedData)) {
        console.warn('Invalid data structure found in localStorage, clearing data');
        this.clearData();
        return null;
      }

      // Convert lastUpdated string back to Date object
      // Also convert date strings in income sources and expenses
      const processedData = this.processLoadedData(parsedData);
      return processedData;
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
      return null;
    }
  }

  /**
   * Clear all retirement data from localStorage
   */
  clearData(): void {
    try {
      if (!this.isLocalStorageAvailable()) {
        return;
      }

      localStorage.removeItem(DataManager.STORAGE_KEY);
      localStorage.removeItem(DataManager.VERSION_KEY);
    } catch (error) {
      console.error('Failed to clear data from localStorage:', error);
    }
  }

  /**
   * Check if data exists in localStorage
   * @returns true if data exists, false otherwise
   */
  hasData(): boolean {
    try {
      if (!this.isLocalStorageAvailable()) {
        return false;
      }

      return localStorage.getItem(DataManager.STORAGE_KEY) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the version of stored data
   * @returns version string if available, null otherwise
   */
  getStoredVersion(): string | null {
    try {
      if (!this.isLocalStorageAvailable()) {
        return null;
      }

      return localStorage.getItem(DataManager.VERSION_KEY);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if localStorage is available and functional
   * @returns true if localStorage is available, false otherwise
   */
  isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Process loaded data to convert date strings back to Date objects
   * @param data Raw data loaded from localStorage
   * @returns Processed RetirementData with proper Date objects
   */
  private processLoadedData(data: any): RetirementData {
    const processedData: RetirementData = {
      ...data,
      lastUpdated: new Date(data.lastUpdated),
      incomeSources: data.incomeSources?.map((source: any) => ({
        ...source,
        startDate: source.startDate ? new Date(source.startDate) : undefined,
        endDate: source.endDate ? new Date(source.endDate) : undefined
      })) || [],
      expenses: data.expenses?.map((expense: any) => ({
        ...expense,
        startDate: expense.startDate ? new Date(expense.startDate) : undefined,
        endDate: expense.endDate ? new Date(expense.endDate) : undefined
      })) || []
    };

    return processedData;
  }

  /**
   * Validate that the loaded data has the correct structure
   * @param data Data to validate
   * @returns true if data is valid RetirementData, false otherwise
   */
  private isValidRetirementData(data: any): data is RetirementData {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.currentAge === 'number' &&
      typeof data.retirementAge === 'number' &&
      typeof data.currentSavings === 'number' &&
      typeof data.expectedAnnualReturn === 'number' &&
      (data.lastUpdated instanceof Date || typeof data.lastUpdated === 'string') &&
      // New required fields
      (data.inflationRate === undefined || typeof data.inflationRate === 'number') &&
      (data.monthlyRetirementSpending === undefined || typeof data.monthlyRetirementSpending === 'number') &&
      Array.isArray(data.incomeSources) &&
      Array.isArray(data.expenses)
    );
  }
}