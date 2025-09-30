import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UIController } from './UIController';

// Mock DOM elements
const mockDOM = () => {
  document.body.innerHTML = `
    <div id="app">
      <div id="tabs">
        <button class="tab-button active" data-tab="income">Income</button>
        <button class="tab-button" data-tab="results">Results</button>
      </div>
      
      <div id="income-tab" class="tab-content active">
        <div id="income-sources-container"></div>
        <div id="income-summary"></div>
      </div>
      
      <div id="results-tab" class="tab-content">
        <form id="retirement-form">
          <input type="number" id="current-age" name="currentAge" required />
          <div id="current-age-error" class="error-message"></div>
          
          <input type="number" id="retirement-age" name="retirementAge" required />
          <div id="retirement-age-error" class="error-message"></div>
          
          <input type="number" id="current-savings" name="currentSavings" required />
          <div id="current-savings-error" class="error-message"></div>
          
          <input type="number" id="monthly-contribution" name="monthlyContribution" />
          <div id="monthly-contribution-error" class="error-message"></div>
          
          <input type="number" id="expected-return" name="expectedAnnualReturn" required />
          <div id="expected-return-error" class="error-message"></div>
          
          <input type="number" id="inflation-rate" name="inflationRate" />
          <div id="inflation-rate-error" class="error-message"></div>
          
          <input type="number" id="monthly-spending" name="monthlyRetirementSpending" />
          <div id="monthly-spending-error" class="error-message"></div>
          
          <button type="button" id="calculate-btn">Calculate</button>
        </form>
        
        <div id="results-content">
          <span id="years-to-retirement">--</span>
          <span id="total-savings">$--</span>
          <span id="monthly-income">$--</span>
          <span id="total-contributions">$--</span>
          <span id="interest-earned">$--</span>
        </div>
      </div>
      
      <div id="calculation-status" class="status-message"></div>
      <div id="action-status" class="status-message"></div>
      <span id="last-updated">Never</span>
      
      <button id="export-btn">Export</button>
      <button id="import-btn">Import</button>
      <input type="file" id="import-file" />
      <button id="clear-btn">Clear</button>
      
      <div id="notifications"></div>
    </div>
  `;
};

// Mock localStorage
const mockLocalStorage = () => {
  const store: { [key: string]: string } = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    })
  };
};

// Mock window.confirm
const mockConfirm = vi.fn();

describe('UIController', () => {
  let uiController: UIController;
  let mockStorage: ReturnType<typeof mockLocalStorage>;

  beforeEach(() => {
    mockDOM();
    mockStorage = mockLocalStorage();
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true
    });
    Object.defineProperty(window, 'confirm', {
      value: mockConfirm,
      writable: true
    });
    
    // Mock URL.createObjectURL and related functions for export functionality
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    uiController = new UIController();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Validation', () => {
    it('should validate required fields', () => {
      const currentAgeInput = document.getElementById('current-age') as HTMLInputElement;
      const errorElement = document.getElementById('current-age-error') as HTMLElement;
      
      // Test empty field validation
      currentAgeInput.value = '';
      currentAgeInput.dispatchEvent(new Event('blur'));
      
      expect(errorElement.textContent).toBe('This field is required');
    });

    it('should validate age ranges', () => {
      const currentAgeInput = document.getElementById('current-age') as HTMLInputElement;
      const errorElement = document.getElementById('current-age-error') as HTMLElement;
      
      // Test age too low
      currentAgeInput.value = '17';
      currentAgeInput.dispatchEvent(new Event('blur'));
      expect(errorElement.textContent).toBe('Age must be between 18 and 100');
      
      // Test age too high
      currentAgeInput.value = '101';
      currentAgeInput.dispatchEvent(new Event('blur'));
      expect(errorElement.textContent).toBe('Age must be between 18 and 100');
      
      // Test valid age
      currentAgeInput.value = '30';
      currentAgeInput.dispatchEvent(new Event('blur'));
      expect(errorElement.textContent).toBe('');
    });

    it('should validate retirement age is greater than current age', () => {
      const currentAgeInput = document.getElementById('current-age') as HTMLInputElement;
      const retirementAgeInput = document.getElementById('retirement-age') as HTMLInputElement;
      const errorElement = document.getElementById('retirement-age-error') as HTMLElement;
      
      currentAgeInput.value = '30';
      retirementAgeInput.value = '25';
      retirementAgeInput.dispatchEvent(new Event('blur'));
      
      expect(errorElement.textContent).toBe('Retirement age must be greater than current age');
    });

    it('should validate negative amounts', () => {
      const savingsInput = document.getElementById('current-savings') as HTMLInputElement;
      const errorElement = document.getElementById('current-savings-error') as HTMLElement;
      
      savingsInput.value = '-1000';
      savingsInput.dispatchEvent(new Event('blur'));
      
      expect(errorElement.textContent).toBe('Amount cannot be negative');
    });

    it('should validate expected return range', () => {
      const returnInput = document.getElementById('expected-return') as HTMLInputElement;
      const errorElement = document.getElementById('expected-return-error') as HTMLElement;
      
      // Test negative return
      returnInput.value = '-5';
      returnInput.dispatchEvent(new Event('blur'));
      expect(errorElement.textContent).toBe('Return must be between 0% and 20%');
      
      // Test too high return
      returnInput.value = '25';
      returnInput.dispatchEvent(new Event('blur'));
      expect(errorElement.textContent).toBe('Return must be between 0% and 20%');
    });
  });

  describe('Real-time Calculation', () => {
    it('should clear error messages on input', () => {
      const currentAgeInput = document.getElementById('current-age') as HTMLInputElement;
      const errorElement = document.getElementById('current-age-error') as HTMLElement;
      
      // Set an error first
      errorElement.textContent = 'Some error';
      
      // Type in the input
      currentAgeInput.dispatchEvent(new Event('input'));
      
      expect(errorElement.textContent).toBe('');
    });

    it('should perform calculation with valid data', () => {
      // Fill in valid form data
      (document.getElementById('current-age') as HTMLInputElement).value = '30';
      (document.getElementById('retirement-age') as HTMLInputElement).value = '65';
      (document.getElementById('current-savings') as HTMLInputElement).value = '10000';
      (document.getElementById('monthly-contribution') as HTMLInputElement).value = '500';
      (document.getElementById('expected-return') as HTMLInputElement).value = '7';
      
      // Trigger calculation
      const calculateBtn = document.getElementById('calculate-btn') as HTMLButtonElement;
      calculateBtn.click();
      
      // Check that results are displayed (not default values)
      const totalSavings = document.getElementById('total-savings') as HTMLElement;
      expect(totalSavings.textContent).not.toBe('$--');
      expect(totalSavings.textContent).toMatch(/^\$/); // Should start with $
    });
  });

  describe('Data Persistence', () => {
    it('should save data to localStorage on calculation', () => {
      // Fill in valid form data
      (document.getElementById('current-age') as HTMLInputElement).value = '30';
      (document.getElementById('retirement-age') as HTMLInputElement).value = '65';
      (document.getElementById('current-savings') as HTMLInputElement).value = '10000';
      (document.getElementById('monthly-contribution') as HTMLInputElement).value = '500';
      (document.getElementById('expected-return') as HTMLInputElement).value = '7';
      
      // Trigger calculation
      const calculateBtn = document.getElementById('calculate-btn') as HTMLButtonElement;
      calculateBtn.click();
      
      // Check that localStorage.setItem was called
      expect(mockStorage.setItem).toHaveBeenCalled();
    });

    it('should clear data when clear button is clicked', () => {
      mockConfirm.mockReturnValue(true);
      
      // Fill in some data first
      (document.getElementById('current-age') as HTMLInputElement).value = '30';
      
      // Click clear button
      const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
      clearBtn.click();
      
      // Check that form is reset
      const currentAgeInput = document.getElementById('current-age') as HTMLInputElement;
      expect(currentAgeInput.value).toBe('');
      
      // Check that localStorage.removeItem was called
      expect(mockStorage.removeItem).toHaveBeenCalled();
    });

    it('should not clear data when user cancels confirmation', () => {
      mockConfirm.mockReturnValue(false);
      
      // Fill in some data first
      (document.getElementById('current-age') as HTMLInputElement).value = '30';
      
      // Click clear button
      const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
      clearBtn.click();
      
      // Check that form is not reset
      const currentAgeInput = document.getElementById('current-age') as HTMLInputElement;
      expect(currentAgeInput.value).toBe('30');
    });
  });

  describe('Error Handling', () => {
    it('should show error for incomplete form on calculation', () => {
      // Leave form empty
      const calculateBtn = document.getElementById('calculate-btn') as HTMLButtonElement;
      calculateBtn.click();
      
      const statusElement = document.getElementById('calculation-status') as HTMLElement;
      expect(statusElement.textContent).toBe('Please correct the errors above');
      expect(statusElement.className).toContain('error');
    });

    it('should show success message after successful calculation', () => {
      // Fill in valid form data
      (document.getElementById('current-age') as HTMLInputElement).value = '30';
      (document.getElementById('retirement-age') as HTMLInputElement).value = '65';
      (document.getElementById('current-savings') as HTMLInputElement).value = '10000';
      (document.getElementById('monthly-contribution') as HTMLInputElement).value = '500';
      (document.getElementById('expected-return') as HTMLInputElement).value = '7';
      
      // Trigger calculation
      const calculateBtn = document.getElementById('calculate-btn') as HTMLButtonElement;
      calculateBtn.click();
      
      const statusElement = document.getElementById('calculation-status') as HTMLElement;
      expect(statusElement.textContent).toBe('Calculation completed successfully');
      expect(statusElement.className).toContain('success');
    });
  });

  describe('Debounced Input Handling', () => {
    it('should debounce input changes', (done) => {
      const currentAgeInput = document.getElementById('current-age') as HTMLInputElement;
      
      // Simulate rapid input changes
      currentAgeInput.value = '2';
      currentAgeInput.dispatchEvent(new Event('input'));
      
      currentAgeInput.value = '25';
      currentAgeInput.dispatchEvent(new Event('input'));
      
      currentAgeInput.value = '30';
      currentAgeInput.dispatchEvent(new Event('input'));
      
      // Check that debouncing works by waiting for the debounce delay
      setTimeout(() => {
        // The calculation should have been performed only once after the delay
        expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
        done();
      }, 350); // Wait slightly longer than debounce delay
    });
  });

  describe('Income Source Management', () => {
    it('should provide access to income manager', () => {
      const incomeManager = uiController.getIncomeManager();
      expect(incomeManager).toBeDefined();
      expect(typeof incomeManager.addIncomeSource).toBe('function');
    });

    it('should provide access to income source UI', () => {
      const incomeSourceUI = uiController.getIncomeSourceUI();
      expect(incomeSourceUI).toBeDefined();
    });

    it('should handle income source changes and trigger recalculation', () => {
      const incomeManager = uiController.getIncomeManager();
      
      // Add an income source
      const result = incomeManager.addIncomeSource({
        name: 'Test Job',
        type: 'regular_job',
        amount: 5000,
        frequency: 'monthly',
        contributionPercentage: 0.15
      });
      
      expect(result.isValid).toBe(true);
      expect(incomeManager.getAllIncomeSources()).toHaveLength(1);
    });

    it('should validate income sources and reject invalid ones', () => {
      const incomeManager = uiController.getIncomeManager();
      
      // Try to set invalid income sources
      const invalidSource = {
        id: 'test-invalid',
        name: 'Invalid Job',
        type: 'regular_job' as const,
        amount: -1000, // Invalid negative amount
        frequency: 'monthly' as const
      };
      
      // This should fail validation and not set the sources
      const validation = incomeManager.setIncomeSources([invalidSource]);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(error => error.includes('positive number'))).toBe(true);
      
      // Verify that no sources were actually set
      expect(incomeManager.getAllIncomeSources()).toHaveLength(0);
    });

    it('should clear income sources when clearing all data', () => {
      mockConfirm.mockReturnValue(true);
      const incomeManager = uiController.getIncomeManager();
      
      // Add an income source
      incomeManager.addIncomeSource({
        name: 'Test Job',
        type: 'regular_job',
        amount: 5000,
        frequency: 'monthly'
      });
      
      expect(incomeManager.getAllIncomeSources()).toHaveLength(1);
      
      // Clear all data
      const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
      clearBtn.click();
      
      // Check that income sources are cleared
      expect(incomeManager.getAllIncomeSources()).toHaveLength(0);
    });

    it('should save and load income sources through complete workflow', () => {
      const incomeManager = uiController.getIncomeManager();
      
      // Add income sources
      incomeManager.addIncomeSource({
        name: 'Primary Job',
        type: 'regular_job',
        amount: 6000,
        frequency: 'monthly',
        contributionPercentage: 0.15,
        annualIncrease: 0.03
      });
      
      incomeManager.addIncomeSource({
        name: 'Side Business',
        type: 'rental',
        amount: 1200,
        frequency: 'monthly',
        contributionPercentage: 0.20
      });
      
      // Fill in form data
      (document.getElementById('current-age') as HTMLInputElement).value = '30';
      (document.getElementById('retirement-age') as HTMLInputElement).value = '65';
      (document.getElementById('current-savings') as HTMLInputElement).value = '50000';
      (document.getElementById('expected-return') as HTMLInputElement).value = '7';
      (document.getElementById('inflation-rate') as HTMLInputElement).value = '3';
      (document.getElementById('monthly-spending') as HTMLInputElement).value = '4000';
      
      // Trigger calculation to save data
      const calculateBtn = document.getElementById('calculate-btn') as HTMLButtonElement;
      calculateBtn.click();
      
      // Verify data was saved
      expect(mockStorage.setItem).toHaveBeenCalled();
      
      // Verify the saved data includes income sources
      const savedDataCall = (mockStorage.setItem as any).mock.calls.find(
        (call: any[]) => call[0] === 'retirement-calculator-data'
      );
      expect(savedDataCall).toBeDefined();
      
      const savedData = JSON.parse(savedDataCall[1]);
      expect(savedData.incomeSources).toHaveLength(2);
      expect(savedData.incomeSources[0].name).toBe('Primary Job');
      expect(savedData.incomeSources[1].name).toBe('Side Business');
      
      // Clear current data
      incomeManager.clearAllSources();
      expect(incomeManager.getAllIncomeSources()).toHaveLength(0);
      
      // Create new UIController to simulate app restart and data loading
      const newUIController = new UIController();
      const newIncomeManager = newUIController.getIncomeManager();
      
      // Verify income sources were loaded
      expect(newIncomeManager.getAllIncomeSources()).toHaveLength(2);
      expect(newIncomeManager.getAllIncomeSources()[0].name).toBe('Primary Job');
      expect(newIncomeManager.getAllIncomeSources()[1].name).toBe('Side Business');
    });
  });
});