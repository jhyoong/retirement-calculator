import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { UIController } from './UIController';

// Mock DOM elements
const mockDOM = () => {
  document.body.innerHTML = `
    <div id="app">
      <form id="retirement-form">
        <input type="number" id="current-age" name="currentAge" required />
        <div id="current-age-error" class="error-message"></div>
        
        <input type="number" id="retirement-age" name="retirementAge" required />
        <div id="retirement-age-error" class="error-message"></div>
        
        <input type="number" id="current-savings" name="currentSavings" required />
        <div id="current-savings-error" class="error-message"></div>
        
        <input type="number" id="monthly-contribution" name="monthlyContribution" required />
        <div id="monthly-contribution-error" class="error-message"></div>
        
        <input type="number" id="expected-return" name="expectedAnnualReturn" required />
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
      <span id="last-updated">Never</span>
      
      <button id="export-btn">Export</button>
      <button id="import-btn">Import</button>
      <input type="file" id="import-file" />
      <button id="clear-btn">Clear</button>
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
});