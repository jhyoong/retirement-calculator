import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DataManager } from './DataManager';
import type { RetirementData } from '../types';

describe('DataManager', () => {
  let dataManager: DataManager;
  let mockLocalStorage: { [key: string]: string };

  const sampleRetirementData: RetirementData = {
    currentAge: 30,
    retirementAge: 65,
    currentSavings: 50000,
    expectedAnnualReturn: 0.07,
    inflationRate: 0.03,
    monthlyRetirementSpending: 4000,
    incomeSources: [],
    expenses: [],
    lastUpdated: new Date('2024-01-01T00:00:00.000Z')
  };

  beforeEach(() => {
    dataManager = new DataManager();
    mockLocalStorage = {};

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: vi.fn(() => {
          mockLocalStorage = {};
        })
      },
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveData', () => {
    it('should save retirement data to localStorage', () => {
      dataManager.saveData(sampleRetirementData);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'retirement-calculator-data',
        expect.stringContaining('"currentAge":30')
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'retirement-calculator-version',
        '1.0.0'
      );
    });

    it('should update lastUpdated timestamp when saving', () => {
      const originalDate = sampleRetirementData.lastUpdated;
      dataManager.saveData(sampleRetirementData);

      const savedData = JSON.parse(mockLocalStorage['retirement-calculator-data']);
      const savedDate = new Date(savedData.lastUpdated);
      
      expect(savedDate.getTime()).toBeGreaterThan(originalDate.getTime());
    });

    it('should throw error when localStorage is not available', () => {
      // Mock localStorage to throw an error
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      expect(() => dataManager.saveData(sampleRetirementData)).toThrow(
        'localStorage not available'
      );
    });

    it('should handle quota exceeded error', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      expect(() => dataManager.saveData(sampleRetirementData)).toThrow(
        'localStorage not available'
      );
    });
  });

  describe('loadData', () => {
    it('should load retirement data from localStorage', () => {
      // First save some data
      dataManager.saveData(sampleRetirementData);

      // Then load it
      const loadedData = dataManager.loadData();

      expect(loadedData).toBeTruthy();
      expect(loadedData!.currentAge).toBe(30);
      expect(loadedData!.retirementAge).toBe(65);
      expect(loadedData!.currentSavings).toBe(50000);
      expect(loadedData!.inflationRate).toBe(0.03);
      expect(loadedData!.monthlyRetirementSpending).toBe(4000);
      expect(Array.isArray(loadedData!.incomeSources)).toBe(true);
      expect(Array.isArray(loadedData!.expenses)).toBe(true);
      expect(loadedData!.expectedAnnualReturn).toBe(0.07);
      expect(loadedData!.lastUpdated).toBeInstanceOf(Date);
    });

    it('should return null when no data exists', () => {
      const loadedData = dataManager.loadData();
      expect(loadedData).toBeNull();
    });

    it('should return null when localStorage is not available', () => {
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      const loadedData = dataManager.loadData();
      expect(loadedData).toBeNull();
    });

    it('should return null and clear data when invalid JSON is stored', () => {
      mockLocalStorage['retirement-calculator-data'] = 'invalid json';
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const loadedData = dataManager.loadData();
      expect(loadedData).toBeNull();
    });

    it('should return null and clear data when data structure is invalid', () => {
      const invalidData = { invalidField: 'test' };
      mockLocalStorage['retirement-calculator-data'] = JSON.stringify(invalidData);
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const loadedData = dataManager.loadData();
      expect(loadedData).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalled();
    });

    it('should handle string dates correctly', () => {
      const dataWithStringDate = {
        ...sampleRetirementData,
        lastUpdated: '2024-01-01T00:00:00.000Z'
      };
      mockLocalStorage['retirement-calculator-data'] = JSON.stringify(dataWithStringDate);

      const loadedData = dataManager.loadData();
      expect(loadedData!.lastUpdated).toBeInstanceOf(Date);
      expect(loadedData!.lastUpdated.getTime()).toBe(new Date('2024-01-01T00:00:00.000Z').getTime());
    });
  });

  describe('clearData', () => {
    it('should remove retirement data from localStorage', () => {
      // First save some data
      dataManager.saveData(sampleRetirementData);
      expect(dataManager.hasData()).toBe(true);

      // Then clear it
      dataManager.clearData();

      expect(localStorage.removeItem).toHaveBeenCalledWith('retirement-calculator-data');
      expect(localStorage.removeItem).toHaveBeenCalledWith('retirement-calculator-version');
    });

    it('should handle localStorage errors gracefully', () => {
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw new Error('localStorage error');
      });
      vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => dataManager.clearData()).not.toThrow();
    });
  });

  describe('hasData', () => {
    it('should return true when data exists', () => {
      dataManager.saveData(sampleRetirementData);
      expect(dataManager.hasData()).toBe(true);
    });

    it('should return false when no data exists', () => {
      expect(dataManager.hasData()).toBe(false);
    });

    it('should return false when localStorage is not available', () => {
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      expect(dataManager.hasData()).toBe(false);
    });
  });

  describe('getStoredVersion', () => {
    it('should return stored version', () => {
      dataManager.saveData(sampleRetirementData);
      expect(dataManager.getStoredVersion()).toBe('1.0.0');
    });

    it('should return null when no version is stored', () => {
      expect(dataManager.getStoredVersion()).toBeNull();
    });

    it('should return null when localStorage is not available', () => {
      vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      expect(dataManager.getStoredVersion()).toBeNull();
    });
  });

  describe('isLocalStorageAvailable', () => {
    it('should return true when localStorage is available', () => {
      expect(dataManager.isLocalStorageAvailable()).toBe(true);
    });

    it('should return false when localStorage throws an error', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      expect(dataManager.isLocalStorageAvailable()).toBe(false);
    });

    it('should clean up test data', () => {
      dataManager.isLocalStorageAvailable();
      expect(localStorage.removeItem).toHaveBeenCalledWith('__localStorage_test__');
    });
  });

  describe('data persistence workflow', () => {
    it('should maintain data integrity through save and load cycle', () => {
      // Save data
      dataManager.saveData(sampleRetirementData);

      // Load data
      const loadedData = dataManager.loadData();

      // Verify all fields are preserved (except lastUpdated which gets updated)
      expect(loadedData!.currentAge).toBe(sampleRetirementData.currentAge);
      expect(loadedData!.retirementAge).toBe(sampleRetirementData.retirementAge);
      expect(loadedData!.currentSavings).toBe(sampleRetirementData.currentSavings);
      expect(loadedData!.inflationRate).toBe(sampleRetirementData.inflationRate);
      expect(loadedData!.monthlyRetirementSpending).toBe(sampleRetirementData.monthlyRetirementSpending);
      expect(loadedData!.incomeSources).toEqual(sampleRetirementData.incomeSources);
      expect(loadedData!.expenses).toEqual(sampleRetirementData.expenses);
      expect(loadedData!.expectedAnnualReturn).toBe(sampleRetirementData.expectedAnnualReturn);
      expect(loadedData!.lastUpdated).toBeInstanceOf(Date);
    });

    it('should handle multiple save operations', () => {
      const data1 = { ...sampleRetirementData, currentAge: 25 };
      const data2 = { ...sampleRetirementData, currentAge: 30 };

      dataManager.saveData(data1);
      dataManager.saveData(data2);

      const loadedData = dataManager.loadData();
      expect(loadedData!.currentAge).toBe(30);
    });
  });

  describe('data migration', () => {
    it('should migrate legacy data with monthlyContribution', () => {
      const legacyData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 1000,
        expectedAnnualReturn: 0.07,
        lastUpdated: '2024-01-01T00:00:00.000Z'
      };

      mockLocalStorage['retirement-calculator-data'] = JSON.stringify(legacyData);
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const loadedData = dataManager.loadData();

      expect(loadedData).toBeTruthy();
      expect(loadedData!.currentAge).toBe(30);
      expect(loadedData!.retirementAge).toBe(65);
      expect(loadedData!.currentSavings).toBe(50000);
      expect(loadedData!.expectedAnnualReturn).toBe(0.07);
      expect(loadedData!.inflationRate).toBe(0.03);
      expect(loadedData!.monthlyRetirementSpending).toBe(4000);
      expect(loadedData!.incomeSources).toHaveLength(1);
      expect(loadedData!.incomeSources[0].id).toBe('legacy-contribution');
      expect(loadedData!.incomeSources[0].amount).toBe(1000);
      expect(loadedData!.expenses).toHaveLength(0);
    });

    it('should migrate legacy data without monthlyContribution', () => {
      const legacyData = {
        currentAge: 25,
        retirementAge: 60,
        currentSavings: 0,
        monthlyContribution: 0,
        expectedAnnualReturn: 0.08,
        lastUpdated: '2024-01-01T00:00:00.000Z'
      };

      mockLocalStorage['retirement-calculator-data'] = JSON.stringify(legacyData);
      vi.spyOn(console, 'log').mockImplementation(() => {});

      const loadedData = dataManager.loadData();

      expect(loadedData).toBeTruthy();
      expect(loadedData!.incomeSources).toHaveLength(0);
      expect(loadedData!.expenses).toHaveLength(0);
    });

    it('should not migrate data that already has incomeSources', () => {
      const newData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 1000, // This should be ignored
        expectedAnnualReturn: 0.07,
        inflationRate: 0.03,
        monthlyRetirementSpending: 4000,
        incomeSources: [
          {
            id: 'existing-source',
            name: 'Existing Job',
            type: 'regular_job',
            amount: 5000,
            frequency: 'monthly',
            contributionPercentage: 0.15
          }
        ],
        expenses: [],
        lastUpdated: '2024-01-01T00:00:00.000Z'
      };

      mockLocalStorage['retirement-calculator-data'] = JSON.stringify(newData);

      const loadedData = dataManager.loadData();

      expect(loadedData).toBeTruthy();
      expect(loadedData!.incomeSources).toHaveLength(1);
      expect(loadedData!.incomeSources[0].id).toBe('existing-source');
    });

    it('should handle date conversion in income sources and expenses', () => {
      const dataWithDates = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        expectedAnnualReturn: 0.07,
        inflationRate: 0.03,
        monthlyRetirementSpending: 4000,
        incomeSources: [
          {
            id: 'contract-job',
            name: 'Contract Job',
            type: 'fixed_period',
            amount: 6000,
            frequency: 'monthly',
            startDate: '2024-01-01T00:00:00.000Z',
            endDate: '2024-12-31T00:00:00.000Z',
            contributionPercentage: 0.20
          }
        ],
        expenses: [
          {
            id: 'temp-expense',
            name: 'Temporary Expense',
            type: 'regular',
            amount: 500,
            frequency: 'monthly',
            inflationAdjusted: true,
            startDate: '2024-06-01T00:00:00.000Z',
            endDate: '2024-12-31T00:00:00.000Z'
          }
        ],
        lastUpdated: '2024-01-01T00:00:00.000Z'
      };

      mockLocalStorage['retirement-calculator-data'] = JSON.stringify(dataWithDates);

      const loadedData = dataManager.loadData();

      expect(loadedData).toBeTruthy();
      expect(loadedData!.incomeSources[0].startDate).toBeInstanceOf(Date);
      expect(loadedData!.incomeSources[0].endDate).toBeInstanceOf(Date);
      expect(loadedData!.expenses[0].startDate).toBeInstanceOf(Date);
      expect(loadedData!.expenses[0].endDate).toBeInstanceOf(Date);
    });
  });});
