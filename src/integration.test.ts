import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIController } from './controllers/UIController';
import type { RetirementData } from './types';

// Mock DOM elements for testing with new tabbed structure
function createMockDOM() {
  document.body.innerHTML = `
    <div id="app">
      <!-- Tab Navigation -->
      <nav class="tab-navigation" role="tablist">
        <button class="tab-button active" id="income-tab-btn" role="tab" data-tab="income">Income Sources</button>
        <button class="tab-button" id="basic-tab-btn" role="tab" data-tab="basic">Basic Info</button>
        <button class="tab-button" id="results-tab-btn" role="tab" data-tab="results">Results</button>
      </nav>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Income Sources Tab -->
        <section id="income-tab" class="tab-panel active" role="tabpanel">
          <div id="income-summary">
            <span id="total-monthly-income">$0</span>
            <span id="monthly-contributions">$0</span>
            <span id="active-sources-count">0</span>
          </div>
          <form id="add-income-form">
            <input type="text" id="income-name" name="name" />
            <select id="income-type" name="type"></select>
            <input type="number" id="income-amount" name="amount" />
            <select id="income-frequency" name="frequency"></select>
            <div id="dynamic-income-fields"></div>
          </form>
          <div id="income-sources-list"></div>
        </section>

        <!-- Basic Information Tab -->
        <section id="basic-tab" class="tab-panel" role="tabpanel">
          <form id="retirement-form">
            <input type="number" id="current-age" name="currentAge" />
            <div id="current-age-error" class="error-message"></div>
            
            <input type="number" id="retirement-age" name="retirementAge" />
            <div id="retirement-age-error" class="error-message"></div>
            
            <input type="number" id="current-savings" name="currentSavings" />
            <div id="current-savings-error" class="error-message"></div>
            
            <input type="number" id="expected-return" name="expectedAnnualReturn" />
            <div id="expected-return-error" class="error-message"></div>
            
            <input type="number" id="inflation-rate" name="inflationRate" value="2.5" />
            <div id="inflation-rate-error" class="error-message"></div>
            
            <input type="number" id="monthly-spending" name="monthlyRetirementSpending" />
            <div id="monthly-spending-error" class="error-message"></div>
            
            <button type="button" id="calculate-btn">Calculate</button>
          </form>
        </section>

        <!-- Results Tab -->
        <section id="results-tab" class="tab-panel" role="tabpanel">
          <div id="results-content">
            <span id="years-to-retirement">--</span>
            <span id="total-savings">$--</span>
            <span id="monthly-income">$--</span>
            <span id="total-contributions">$--</span>
            <span id="interest-earned">$--</span>
          </div>
          
          <div id="calculation-status" class="status-message"></div>
          
          <!-- Data Management Controls -->
          <div class="data-management-section">
            <button type="button" id="export-btn">Export</button>
            <button type="button" id="import-btn">Import</button>
            <input type="file" id="import-file" style="display: none;" />
            <button type="button" id="clear-btn">Clear</button>
            <div id="action-status" class="status-message"></div>
          </div>
        </section>
      </div>
      
      <span id="last-updated">Never</span>
      <div id="notification-container"></div>
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
      
      // Wait for UI initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 1: Input valid retirement data
      const testData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 1000,
        expectedAnnualReturn: 7,
        monthlyRetirementSpending: 4000
      };

      // Switch to Basic Info tab to fill form inputs
      const basicTabBtn = document.getElementById('basic-tab-btn') as HTMLButtonElement;
      basicTabBtn.click();
      
      // Wait for tab switch
      await new Promise(resolve => setTimeout(resolve, 50));

      // Fill form inputs
      (document.getElementById('current-age') as HTMLInputElement).value = testData.currentAge.toString();
      (document.getElementById('retirement-age') as HTMLInputElement).value = testData.retirementAge.toString();
      (document.getElementById('current-savings') as HTMLInputElement).value = testData.currentSavings.toString();
      (document.getElementById('expected-return') as HTMLInputElement).value = testData.expectedAnnualReturn.toString();
      (document.getElementById('monthly-spending') as HTMLInputElement).value = testData.monthlyRetirementSpending.toString();

      // Step 2: Trigger calculation
      const calculateBtn = document.getElementById('calculate-btn') as HTMLButtonElement;
      calculateBtn.click();

      // Wait for any async operations
      await new Promise(resolve => setTimeout(resolve, 50));

      // Switch to Results tab to verify calculation results
      const resultsTabBtn = document.getElementById('results-tab-btn') as HTMLButtonElement;
      resultsTabBtn.click();
      
      // Wait for tab switch
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
      
      // Wait for UI initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      // Input data
      const testData = {
        currentAge: 25,
        retirementAge: 60,
        currentSavings: 25000,
        monthlyContribution: 800,
        expectedAnnualReturn: 6,
        monthlyRetirementSpending: 3500
      };

      // Switch to Basic Info tab to fill form
      const basicTabBtn = document.getElementById('basic-tab-btn') as HTMLButtonElement;
      basicTabBtn.click();
      
      // Wait for tab switch
      await new Promise(resolve => setTimeout(resolve, 50));

      // Fill form
      (document.getElementById('current-age') as HTMLInputElement).value = testData.currentAge.toString();
      (document.getElementById('retirement-age') as HTMLInputElement).value = testData.retirementAge.toString();
      (document.getElementById('current-savings') as HTMLInputElement).value = testData.currentSavings.toString();
      (document.getElementById('expected-return') as HTMLInputElement).value = testData.expectedAnnualReturn.toString();
      (document.getElementById('monthly-spending') as HTMLInputElement).value = testData.monthlyRetirementSpending.toString();

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

      // Switch to Basic Info tab to check the restored data
      const basicTabBtn2 = document.getElementById('basic-tab-btn') as HTMLButtonElement;
      basicTabBtn2.click();
      
      // Wait for tab switch
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify data was restored
      expect((document.getElementById('current-age') as HTMLInputElement).value).toBe(testData.currentAge.toString());
      expect((document.getElementById('retirement-age') as HTMLInputElement).value).toBe(testData.retirementAge.toString());
      expect((document.getElementById('current-savings') as HTMLInputElement).value).toBe(testData.currentSavings.toString());
      expect((document.getElementById('expected-return') as HTMLInputElement).value).toBe(testData.expectedAnnualReturn.toString());
      
      // Note: monthly-contribution field no longer exists in the new UI structure
      // Income sources are now managed through the Income tab
    });

    it('should handle localStorage unavailability gracefully', async () => {
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
      // Switch to Basic Info tab first
      const basicTabBtn = document.getElementById('basic-tab-btn') as HTMLButtonElement;
      basicTabBtn.click();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      (document.getElementById('current-age') as HTMLInputElement).value = '30';
      (document.getElementById('retirement-age') as HTMLInputElement).value = '65';
      (document.getElementById('current-savings') as HTMLInputElement).value = '50000';
      (document.getElementById('expected-return') as HTMLInputElement).value = '7';
      (document.getElementById('monthly-spending') as HTMLInputElement).value = '4000';

      const calculateBtn = document.getElementById('calculate-btn') as HTMLButtonElement;
      expect(() => calculateBtn.click()).not.toThrow();
    });
  });

  describe('Import/Export Round-trip Functionality', () => {
    it('should maintain data integrity through export and import cycle', async () => {
      controller = new UIController();
      
      // Wait for UI initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      const originalData = {
        currentAge: 35,
        retirementAge: 67,
        currentSavings: 75000,
        monthlyContribution: 1500,
        expectedAnnualReturn: 8.5,
        monthlyRetirementSpending: 5000
      };

      // Switch to Basic Info tab to set original data
      const basicTabBtn = document.getElementById('basic-tab-btn') as HTMLButtonElement;
      basicTabBtn.click();
      
      // Wait for tab switch
      await new Promise(resolve => setTimeout(resolve, 50));

      // Set original data
      (document.getElementById('current-age') as HTMLInputElement).value = originalData.currentAge.toString();
      (document.getElementById('retirement-age') as HTMLInputElement).value = originalData.retirementAge.toString();
      (document.getElementById('current-savings') as HTMLInputElement).value = originalData.currentSavings.toString();
      (document.getElementById('expected-return') as HTMLInputElement).value = originalData.expectedAnnualReturn.toString();
      (document.getElementById('monthly-spending') as HTMLInputElement).value = originalData.monthlyRetirementSpending.toString();

      // Calculate to get results
      const calculateBtn = document.getElementById('calculate-btn') as HTMLButtonElement;
      calculateBtn.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      // Switch to Results tab to capture results
      const resultsTabBtn = document.getElementById('results-tab-btn') as HTMLButtonElement;
      resultsTabBtn.click();
      
      // Wait for tab switch
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
          inflationRate: 0.025,
          monthlyRetirementSpending: originalData.monthlyRetirementSpending,
          incomeSources: [],
          expenses: [],
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

      // Switch to Basic Info tab to verify data integrity
      const basicTabBtn3 = document.getElementById('basic-tab-btn') as HTMLButtonElement;
      basicTabBtn3.click();
      
      // Wait for tab switch
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify data integrity
      expect((document.getElementById('current-age') as HTMLInputElement).value).toBe(originalData.currentAge.toString());
      expect((document.getElementById('retirement-age') as HTMLInputElement).value).toBe(originalData.retirementAge.toString());
      expect((document.getElementById('current-savings') as HTMLInputElement).value).toBe(originalData.currentSavings.toString());
      expect((document.getElementById('expected-return') as HTMLInputElement).value).toBe(originalData.expectedAnnualReturn.toString());
      
      // Switch back to Results tab to verify calculations
      const resultsTabBtn2 = document.getElementById('results-tab-btn') as HTMLButtonElement;
      resultsTabBtn2.click();
      
      // Wait for tab switch
      await new Promise(resolve => setTimeout(resolve, 50));

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
      
      // Wait for UI initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      // Switch to Basic Info tab to fill in form data
      const basicTabBtn = document.getElementById('basic-tab-btn') as HTMLButtonElement;
      basicTabBtn.click();
      
      // Wait for tab switch
      await new Promise(resolve => setTimeout(resolve, 50));

      // Fill initial data
      (document.getElementById('current-age') as HTMLInputElement).value = '30';
      (document.getElementById('retirement-age') as HTMLInputElement).value = '65';
      (document.getElementById('current-savings') as HTMLInputElement).value = '50000';
      (document.getElementById('expected-return') as HTMLInputElement).value = '7';
      (document.getElementById('monthly-spending') as HTMLInputElement).value = '4000';

      // Trigger input change
      const currentSavingsInput = document.getElementById('current-savings') as HTMLInputElement;
      currentSavingsInput.dispatchEvent(new Event('input'));

      // Wait for debounced calculation
      await new Promise(resolve => setTimeout(resolve, 350));

      // Switch to Results tab to check calculations
      const resultsTabBtn = document.getElementById('results-tab-btn') as HTMLButtonElement;
      resultsTabBtn.click();
      
      // Wait for tab switch
      await new Promise(resolve => setTimeout(resolve, 50));

      // Verify results are calculated
      const totalSavingsElement = document.getElementById('total-savings') as HTMLElement;
      expect(totalSavingsElement.textContent).not.toBe('$--');
      
      // Store the original calculation result
      const originalTotalSavings = totalSavingsElement.textContent;

      // Switch back to Basic Info tab to change input
      basicTabBtn.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      // Change input to a significantly different value and verify recalculation
      currentSavingsInput.value = '25000'; // Reduce savings significantly
      currentSavingsInput.dispatchEvent(new Event('input'));

      await new Promise(resolve => setTimeout(resolve, 350));

      // Switch back to Results tab to check updated calculations
      resultsTabBtn.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      // Results should be different (lower with less savings)
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

      // Wait for UI initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Switch to Basic Info tab first
      const basicTabBtn = document.getElementById('basic-tab-btn') as HTMLButtonElement;
      basicTabBtn.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      // Set invalid data (retirement age less than current age)
      (document.getElementById('current-age') as HTMLInputElement).value = '65';
      (document.getElementById('retirement-age') as HTMLInputElement).value = '60';
      (document.getElementById('current-savings') as HTMLInputElement).value = '50000';
      (document.getElementById('expected-return') as HTMLInputElement).value = '7';
      (document.getElementById('monthly-spending') as HTMLInputElement).value = '4000';

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