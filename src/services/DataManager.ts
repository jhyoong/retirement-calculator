import type { RetirementData } from '../types';

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
      
      // Validate the loaded data structure
      if (!this.isValidRetirementData(parsedData)) {
        console.warn('Invalid data structure found in localStorage, clearing data');
        this.clearData();
        return null;
      }

      // Convert lastUpdated string back to Date object
      return {
        ...parsedData,
        lastUpdated: new Date(parsedData.lastUpdated)
      };
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
      typeof data.monthlyContribution === 'number' &&
      typeof data.expectedAnnualReturn === 'number' &&
      (data.lastUpdated instanceof Date || typeof data.lastUpdated === 'string')
    );
  }
}