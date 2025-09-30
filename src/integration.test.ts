import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIController } from './controllers/UIController';
import type { RetirementData } from './types';

// Mock DOM elements for testing
function createMockDOM() {
  document.body.innerHTML = `
    <div id="app">
      <form id="retirement-form">
        <input type="number" id="current-age" name="currentAge" />
        <div id="current-age-error" class="error-message"></div>
        
        <input type="number" id="retirement-age" name="retirementAge" />
        <div id="retirement-age-error" class="error-message"></div>
        
        <input type="number" id="current-savings" name="currentSavings" />
        <div id="current-savings-error" class="error-message"></div>
        
        <input type="number" id="monthly-contribution" name="monthlyContribution" />
        <div id="monthly-contribution-error" class="error-message"></div>
        
        <input type="number" id="expected-return" name="expectedAnnualReturn" />
        <div id="expected-return-error" class="error-message"></div>
        
        <button type="button" id="calculate-btn">Calculate</button>
      </form>
      
      <div id="results-content">
        <span id="years-to-retirement">--</span>
        <span id="total-savings">$--</span>
        <span id="monthly-income">$--</span>
        <span id="total-contributions">$--</span>
        <span id="interest-earned">$--</span>
      </div>
      
      <div id="calculation-status" class="status-message"></div>
      <div id="action-status" class="status-message"></div>
      
      <button type="button" id="export-btn">Export</button>
      <button type="button" id="import-btn">Import</button>
      <input type="file" id="import-file" style="display: none;" />
      <button type="button" id="clear-btn">Clear</button>
      
      <span id="last-updated">Never</span>
    </div>
  `;
}

describe('Integration Tests - Complete Workflows', () => {
  let controller: UIController;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    // Reset DOM
    createMockDOM();
    
    // Mock localStorage
    mockLocalStorage = {};
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

    // Mock URL.createObjectURL and URL.revokeObjectURL for export tests
    global.URL.createObjectURL = vi.fn(() => 'mock-blob-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock document.createElement for export tests
    const originalCreateElement = document.createElement;
    document.createElement = vi.fn((tagName: string) => {
      const element = originalCreateElement.call(document, tagName);
      if (tagName === 'a') {
        // Mock the click method for download links
        element.click = vi.fn();
      }
      return element;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete User Workflow: Input → Calculation → Export → Import', () => {
    it('should handle complete workflow from input to calculation to export and back to import', async () => {
      // Initialize controller
      controller = new UIController();

      // Step 1: Input valid retirement data
      const testData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 1000,
        expectedAnnualReturn: 7
      };

      // Fill form inputs
      (document.getElementById('current-age') as HTMLInputElement).value = testData.currentAge.toString();
      (document.getElementById('retirement-age') as HTMLInputElement).value = testData.retirementAge.toString();
      (document.getElementById('current-savings') as HTMLInputElement).value = testData.currentSavings.toString();
      (document.getElementById('monthly-contribution') as HTMLInputElement).value = testData.monthlyContribution.toString();
      (document.getElementById('expected-return') as HTMLInputElement).value = testData.expectedAnnualReturn.toString();

      // Step 2: Trigger calculation
      const calculateBtn = document.getElementById('calculate-btn') as HTMLButtonElement;
      calculateBtn.click();

      // Wait for any async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify calculation results are displayed
      const totalSavings = document.getElementById('total-savings') as HTMLElement;
      const monthlyIncome = document.getElementById('monthly-income') as HTMLElement;
      const yearsToRetirement = document.getElementById('years-to-retirement') as HTMLElement;

      expect(totalSavings.textContent).not.toBe('$--');
      expect(monthlyIncome.textContent).not.toBe('$--');
      expect(yearsToRetirement.textContent).toBe('35'); // 65 - 30

      // Verify data was saved to localStorage
      expect(localStorage.setItem).toHaveBeenCalled();
      const savedDataCall = (localStorage.setItem as any).mock.calls.find(
        (call: any[]) => call[0] === 'retirement-calculator-data'
      );
      expect(savedDataCall).toBeDefined();

      // Step 3: Export data
      const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
      exportBtn.click();

      // Verify export was triggered
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(document.createElement).toHaveBeenCalledWith('a');

      // Step 4: Simulate import of the same data
      const importFile = document.getElementById('import-file') as HTMLInputElement;
      
      // Create a mock file with the exported data structure
      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        userData: {
          currentAge: testData.currentAge,
          retirementAge: testData.retirementAge,
          currentSavings: testData.currentSavings,
          monthlyContribution: testData.monthlyContribution,
          expectedAnnualReturn: testData.expectedAnnualReturn / 100, // Convert to decimal
          lastUpdated: new Date().toISOString()
        }
      };

      const mockFile = new File([JSON.stringify(exportData)], 'retirement-data.json', {
        type: 'application/json'
      });

      // Mock FileReader
      const mockFileReader = {
        readAsText: vi.fn(),
        result: JSON.stringify(exportData),
        onload: null as any,
        onerror: null as any
      };

      global.FileReader = vi.fn(() => mockFileReader) as any;

      // Trigger file change event
      Object.defineProperty(importFile, 'files', {
        value: [mockFile],
        writable: false
      });

      const changeEvent = new Event('change');
      importFile.dispatchEvent(changeEvent);

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: mockFileReader } as any);
      }

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify import success message
      const actionStatus = document.getElementById('action-status') as HTMLElement;
      expect(actionStatus.textContent).toContain('imported successfully');

      // Verify form was populated with imported data
      expect((document.getElementById('current-age') as HTMLInputElement).value).toBe(testData.currentAge.toString());
      expect((document.getElementById('retirement-age') as HTMLInputElement).value).toBe(testData.retirementAge.toString());
    });
  });

  describe('Data Persistence Across Browser Sessions', () => {
    it('should save data automatically and restore it on page reload', async () => {
      // Initialize controller
      controller = new UIController();

      // Input data
      const testData = {
        currentAge: 25,
        retirementAge: 60,
        currentSavings: 25000,
        monthlyContribution: 800,
        expectedAnnualReturn: 6
      };

      // Fill form
      (document.getElementById('current-age') as HTMLInputElement).value = testData.currentAge.toString();
      (document.getElementById('retirement-age') as HTMLInputElement).value = testData.retirementAge.toString();
      (document.getElementById('current-savings') as HTMLInputElement).value = testData.currentSavings.toString();
      (document.getElementById('monthly-contribution') as HTMLInputElement).value = testData.monthlyContribution.toString();
      (document.getElementById('expected-return') as HTMLInputElement).value = testData.expectedAnnualReturn.toString();

      // Trigger input change to save data
      const currentAgeInput = document.getElementById('current-age') as HTMLInputElement;
      currentAgeInput.dispatchEvent(new Event('input'));

      // Wait for debounced save
      await new Promise(resolve => setTimeout(resolve, 350));

      // Verify data was saved
      expect(localStorage.setItem).toHaveBeenCalled();

      // Simulate page reload by creating new controller with saved data
      createMockDOM();
      const newController = new UIController();

      // Wait for data loading
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify data was restored
      expect((document.getElementById('current-age') as HTMLInputElement).value).toBe(testData.currentAge.toString());
      expect((document.getElementById('retirement-age') as HTMLInputElement).value).toBe(testData.retirementAge.toString());
      expect((document.getElementById('current-savings') as HTMLInputElement).value).toBe(testData.currentSavings.toString());
      expect((document.getElementById('monthly-contribution') as HTMLInputElement).value).toBe(testData.monthlyContribution.toString());
      expect((document.getElementById('expected-return') as HTMLInputElement).value).toBe(testData.expectedAnnualReturn.toString());
    });

    it('should handle localStorage unavailability gracefully', () => {
      // Mock localStorage to throw errors
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => { throw new Error('localStorage not available'); }),
          setItem: vi.fn(() => { throw new Error('localStorage not available'); }),
          removeItem: vi.fn(() => { throw new Error('localStorage not available'); }),
          clear: vi.fn(() => { throw new Error('localStorage not available'); })
        },
        writable: true
      });

      // Should not throw error when initializing
      expect(() => {
        controller = new UIController();
      }).not.toThrow();

      // Should still allow calculations without persistence
      (document.getElementById('current-age') as HTMLInputElement).value = '30';
      (document.getElementById('retirement-age') as HTMLInputElement).value = '65';
      (document.getElementById('current-savings') as HTMLInputElement).value = '50000';
      (document.getElementById('monthly-contribution') as HTMLInputElement).value = '1000';
      (document.getElementById('expected-return') as HTMLInputElement).value = '7';

      const calculateBtn = document.getElementById('calculate-btn') as HTMLButtonElement;
      expect(() => calculateBtn.click()).not.toThrow();
    });
  });

  describe('Import/Export Round-trip Functionality', () => {
    it('should maintain data integrity through export and import cycle', async () => {
      controller = new UIController();

      const originalData = {
        currentAge: 35,
        retirementAge: 67,
        currentSavings: 75000,
        monthlyContribution: 1500,
        expectedAnnualReturn: 8.5
      };

      // Set original data
      (document.getElementById('current-age') as HTMLInputElement).value = originalData.currentAge.toString();
      (document.getElementById('retirement-age') as HTMLInputElement).value = originalData.retirementAge.toString();
      (document.getElementById('current-savings') as HTMLInputElement).value = originalData.currentSavings.toString();
      (document.getElementById('monthly-contribution') as HTMLInputElement).value = originalData.monthlyContribution.toString();
      (document.getElementById('expected-return') as HTMLInputElement).value = originalData.expectedAnnualReturn.toString();

      // Calculate to get results
      const calculateBtn = document.getElementById('calculate-btn') as HTMLButtonElement;
      calculateBtn.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      // Store original results
      const originalTotalSavings = (document.getElementById('total-savings') as HTMLElement).textContent;
      const originalMonthlyIncome = (document.getElementById('monthly-income') as HTMLElement).textContent;

      // Export data
      const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
      exportBtn.click();

      // Clear form
      const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
      // Mock confirm to return true
      global.confirm = vi.fn(() => true);
      clearBtn.click();

      // Verify form is cleared
      expect((document.getElementById('current-age') as HTMLInputElement).value).toBe('');
      expect((document.getElementById('total-savings') as HTMLElement).textContent).toBe('$--');

      // Import the data back
      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        userData: {
          currentAge: originalData.currentAge,
          retirementAge: originalData.retirementAge,
          currentSavings: originalData.currentSavings,
          monthlyContribution: originalData.monthlyContribution,
          expectedAnnualReturn: originalData.expectedAnnualReturn / 100,
          lastUpdated: new Date().toISOString()
        }
      };

      const mockFile = new File([JSON.stringify(exportData)], 'test.json', {
        type: 'application/json'
      });

      const mockFileReader = {
        readAsText: vi.fn(),
        result: JSON.stringify(exportData),
        onload: null as any,
        onerror: null as any
      };

      global.FileReader = vi.fn(() => mockFileReader) as any;

      const importFile = document.getElementById('import-file') as HTMLInputElement;
      Object.defineProperty(importFile, 'files', {
        value: [mockFile],
        writable: false
      });

      importFile.dispatchEvent(new Event('change'));

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: mockFileReader } as any);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify data integrity
      expect((document.getElementById('current-age') as HTMLInputElement).value).toBe(originalData.currentAge.toString());
      expect((document.getElementById('retirement-age') as HTMLInputElement).value).toBe(originalData.retirementAge.toString());
      expect((document.getElementById('current-savings') as HTMLInputElement).value).toBe(originalData.currentSavings.toString());
      expect((document.getElementById('monthly-contribution') as HTMLInputElement).value).toBe(originalData.monthlyContribution.toString());
      expect((document.getElementById('expected-return') as HTMLInputElement).value).toBe(originalData.expectedAnnualReturn.toString());

      // Verify calculations are restored
      expect((document.getElementById('total-savings') as HTMLElement).textContent).toBe(originalTotalSavings);
      expect((document.getElementById('monthly-income') as HTMLElement).textContent).toBe(originalMonthlyIncome);
    });

    it('should handle corrupted import files gracefully', async () => {
      controller = new UIController();

      const corruptedFile = new File(['invalid json content'], 'corrupted.json', {
        type: 'application/json'
      });

      const mockFileReader = {
        readAsText: vi.fn(),
        result: 'invalid json content',
        onload: null as any,
        onerror: null as any
      };

      global.FileReader = vi.fn(() => mockFileReader) as any;

      const importFile = document.getElementById('import-file') as HTMLInputElement;
      Object.defineProperty(importFile, 'files', {
        value: [corruptedFile],
        writable: false
      });

      importFile.dispatchEvent(new Event('change'));

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: mockFileReader } as any);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify error message is shown
      const actionStatus = document.getElementById('action-status') as HTMLElement;
      expect(actionStatus.textContent).toContain('Import failed');
      expect(actionStatus.className).toContain('error');
    });
  });

  describe('Real-time Calculation Updates', () => {
    it('should update calculations automatically when inputs change', async () => {
      controller = new UIController();

      // Fill initial data
      (document.getElementById('current-age') as HTMLInputElement).value = '30';
      (document.getElementById('retirement-age') as HTMLInputElement).value = '65';
      (document.getElementById('current-savings') as HTMLInputElement).value = '50000';
      (document.getElementById('monthly-contribution') as HTMLInputElement).value = '1000';
      (document.getElementById('expected-return') as HTMLInputElement).value = '7';

      // Trigger input change
      const monthlyContributionInput = document.getElementById('monthly-contribution') as HTMLInputElement;
      monthlyContributionInput.dispatchEvent(new Event('input'));

      // Wait for debounced calculation
      await new Promise(resolve => setTimeout(resolve, 350));

      // Verify results are calculated
      const totalSavingsElement = document.getElementById('total-savings') as HTMLElement;
      expect(totalSavingsElement.textContent).not.toBe('$--');
      
      // Store the original calculation result
      const originalTotalSavings = totalSavingsElement.textContent;

      // Change input to a significantly different value and verify recalculation
      monthlyContributionInput.value = '500'; // Reduce contribution significantly
      monthlyContributionInput.dispatchEvent(new Event('input'));

      await new Promise(resolve => setTimeout(resolve, 350));

      // Results should be different (lower with less contribution)
      const newTotalSavings = totalSavingsElement.textContent;
      expect(newTotalSavings).not.toBe('$--');
      expect(newTotalSavings).not.toBe(originalTotalSavings);
      
      // Verify the new amount is actually lower (parse currency values)
      const originalAmount = parseFloat(originalTotalSavings!.replace(/[$,]/g, ''));
      const newAmount = parseFloat(newTotalSavings!.replace(/[$,]/g, ''));
      expect(newAmount).toBeLessThan(originalAmount);
    });
  });

  describe('Form Validation Integration', () => {
    it('should prevent calculation with invalid data and show appropriate errors', async () => {
      controller = new UIController();

      // Set invalid data (retirement age less than current age)
      (document.getElementById('current-age') as HTMLInputElement).value = '65';
      (document.getElementById('retirement-age') as HTMLInputElement).value = '60';
      (document.getElementById('current-savings') as HTMLInputElement).value = '50000';
      (document.getElementById('monthly-contribution') as HTMLInputElement).value = '1000';
      (document.getElementById('expected-return') as HTMLInputElement).value = '7';

      // Try to calculate
      const calculateBtn = document.getElementById('calculate-btn') as HTMLButtonElement;
      calculateBtn.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify error is shown
      const calculationStatus = document.getElementById('calculation-status') as HTMLElement;
      expect(calculationStatus.textContent).toContain('correct the errors');
      expect(calculationStatus.className).toContain('error');

      // Verify results are not calculated
      const totalSavings = document.getElementById('total-savings') as HTMLElement;
      expect(totalSavings.textContent).toBe('$--');
    });
  });
});