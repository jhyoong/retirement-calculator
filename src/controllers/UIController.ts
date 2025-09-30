import type { RetirementData, CalculationResult } from '../types';
import { CalculationEngine, DataManager, ImportExportManager } from '../services';

/**
 * UIController coordinates between UI components and business logic
 * Handles real-time calculations, validation, and user interactions
 */
export class UIController {
  private calculationEngine: CalculationEngine;
  private dataManager: DataManager;
  private importExportManager: ImportExportManager;
  private debounceTimer: number | null = null;
  private readonly debounceDelay = 300; // 300ms debounce delay

  constructor() {
    this.calculationEngine = new CalculationEngine();
    this.dataManager = new DataManager();
    this.importExportManager = new ImportExportManager();
    
    this.initializeEventHandlers();
    this.loadSavedData();
  }

  /**
   * Initialize all event handlers for the UI
   */
  private initializeEventHandlers(): void {
    // Form input handlers for real-time validation and calculation
    const form = document.getElementById('retirement-form') as HTMLFormElement;
    if (form) {
      const inputs = form.querySelectorAll('input[type="number"]');
      inputs.forEach(input => {
        input.addEventListener('input', (event) => this.handleInputChange(event));
        input.addEventListener('blur', (event) => this.handleInputValidation(event));
      });
    }

    // Calculate button handler
    const calculateBtn = document.getElementById('calculate-btn') as HTMLButtonElement;
    if (calculateBtn) {
      calculateBtn.addEventListener('click', () => this.handleCalculation());
    }

    // Import/Export handlers
    const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
    const importFile = document.getElementById('import-file') as HTMLInputElement;
    const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;

    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', (event) => this.handleFileImport(event));
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.handleDataExport());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.handleDataClear());
    }
  }

  /**
   * Handle input changes with debounced real-time calculation
   */
  private handleInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    
    // Clear any previous error messages when user starts typing
    this.clearFieldError(target.id);
    
    // Debounce the calculation to avoid excessive processing
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = window.setTimeout(() => {
      this.performRealTimeCalculation();
      this.autoSaveData();
    }, this.debounceDelay);
  }

  /**
   * Handle input validation on blur
   */
  private handleInputValidation(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.validateField(target);
  }

  /**
   * Validate a single form field
   */
  private validateField(input: HTMLInputElement): boolean {
    const errorElement = document.getElementById(`${input.id}-error`) as HTMLElement;
    if (!errorElement) return true;

    // Clear previous error
    errorElement.textContent = '';

    // Check if field is required and empty
    if (input.required && !input.value.trim()) {
      this.showFieldError(input.id, 'This field is required');
      return false;
    }

    // Skip validation if field is empty but not required
    if (!input.value.trim()) {
      return true;
    }

    const value = parseFloat(input.value);
    if (isNaN(value)) {
      this.showFieldError(input.id, 'Please enter a valid number');
      return false;
    }

    // Field-specific validation
    switch (input.name) {
      case 'currentAge':
        if (value < 18 || value > 100) {
          this.showFieldError(input.id, 'Age must be between 18 and 100');
          return false;
        }
        break;
      
      case 'retirementAge':
        if (value < 18 || value > 100) {
          this.showFieldError(input.id, 'Retirement age must be between 18 and 100');
          return false;
        }
        // Check if retirement age is greater than current age
        const currentAgeInput = document.getElementById('current-age') as HTMLInputElement;
        if (currentAgeInput && currentAgeInput.value) {
          const currentAge = parseFloat(currentAgeInput.value);
          if (!isNaN(currentAge) && value <= currentAge) {
            this.showFieldError(input.id, 'Retirement age must be greater than current age');
            return false;
          }
        }
        break;
      
      case 'currentSavings':
      case 'monthlyContribution':
        if (value < 0) {
          this.showFieldError(input.id, 'Amount cannot be negative');
          return false;
        }
        // Warn about unrealistic values
        if (input.name === 'monthlyContribution' && value > 50000) {
          this.showFieldError(input.id, 'Monthly contribution seems unrealistically high');
          return false;
        }
        if (input.name === 'currentSavings' && value > 100000000) {
          this.showFieldError(input.id, 'Current savings seems unrealistically high');
          return false;
        }
        break;
      
      case 'expectedAnnualReturn':
        if (value < 0 || value > 20) {
          this.showFieldError(input.id, 'Return must be between 0% and 20%');
          return false;
        }
        break;
    }

    return true;
  }

  /**
   * Validate all form fields
   */
  private validateAllFields(): boolean {
    const form = document.getElementById('retirement-form') as HTMLFormElement;
    if (!form) return false;

    const inputs = form.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>;
    let isValid = true;

    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    return isValid;
  }

  /**
   * Show error message for a specific field
   */
  private showFieldError(fieldId: string, message: string): void {
    const errorElement = document.getElementById(`${fieldId}-error`) as HTMLElement;
    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  /**
   * Clear error message for a specific field
   */
  private clearFieldError(fieldId: string): void {
    const errorElement = document.getElementById(`${fieldId}-error`) as HTMLElement;
    if (errorElement) {
      errorElement.textContent = '';
    }
  }

  /**
   * Clear all error messages
   */
  private clearAllErrors(): void {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
      element.textContent = '';
    });
  }

  /**
   * Get current form data
   */
  private getFormData(): RetirementData | null {
    const currentAge = this.getInputValue('current-age');
    const retirementAge = this.getInputValue('retirement-age');
    const currentSavings = this.getInputValue('current-savings');
    const monthlyContribution = this.getInputValue('monthly-contribution');
    const expectedAnnualReturn = this.getInputValue('expected-return');

    // Check if all values are valid numbers
    if (isNaN(currentAge) || isNaN(retirementAge) || isNaN(currentSavings) || 
        isNaN(monthlyContribution) || isNaN(expectedAnnualReturn)) {
      return null;
    }

    return {
      currentAge,
      retirementAge,
      currentSavings,
      monthlyContribution,
      expectedAnnualReturn: expectedAnnualReturn / 100, // Convert percentage to decimal
      lastUpdated: new Date()
    };
  }

  /**
   * Get numeric value from input field
   */
  private getInputValue(inputId: string): number {
    const input = document.getElementById(inputId) as HTMLInputElement;
    return input ? parseFloat(input.value) || 0 : 0;
  }

  /**
   * Perform real-time calculation without showing errors
   */
  private performRealTimeCalculation(): void {
    const formData = this.getFormData();
    if (!formData) return;

    try {
      // Only calculate if we have reasonable data (don't validate strictly for real-time)
      if (formData.retirementAge > formData.currentAge && 
          formData.currentAge >= 18 && 
          formData.retirementAge <= 100) {
        
        const result = this.calculationEngine.calculateRetirement(formData);
        this.displayResults(result);
        this.updateLastUpdatedTimestamp();
      }
    } catch (error) {
      // Silently fail for real-time calculations
      // Errors will be shown when user explicitly calculates
    }
  }

  /**
   * Handle explicit calculation button click
   */
  private handleCalculation(): void {
    const statusElement = document.getElementById('calculation-status') as HTMLElement;
    
    // Clear previous status
    if (statusElement) {
      statusElement.textContent = '';
      statusElement.className = 'status-message';
    }

    // Validate all fields first
    if (!this.validateAllFields()) {
      this.showCalculationStatus('Please correct the errors above', 'error');
      return;
    }

    const formData = this.getFormData();
    if (!formData) {
      this.showCalculationStatus('Please fill in all fields with valid numbers', 'error');
      return;
    }

    try {
      const result = this.calculationEngine.calculateRetirement(formData);
      this.displayResults(result);
      this.showCalculationStatus('Calculation completed successfully', 'success');
      this.updateLastUpdatedTimestamp();
      
      // Auto-save the data
      this.autoSaveData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
      this.showCalculationStatus(errorMessage, 'error');
    }
  }

  /**
   * Display calculation results in the UI
   */
  private displayResults(results: CalculationResult): void {
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    
    this.updateElementText('years-to-retirement', results.yearsToRetirement.toString());
    this.updateElementText('total-savings', formatCurrency(results.totalSavings));
    this.updateElementText('monthly-income', formatCurrency(results.monthlyRetirementIncome));
    this.updateElementText('total-contributions', formatCurrency(results.totalContributions));
    this.updateElementText('interest-earned', formatCurrency(results.interestEarned));
  }

  /**
   * Update text content of an element
   */
  private updateElementText(elementId: string, text: string): void {
    const element = document.getElementById(elementId) as HTMLElement;
    if (element) {
      element.textContent = text;
    }
  }

  /**
   * Show calculation status message
   */
  private showCalculationStatus(message: string, type: 'success' | 'error' | 'warning'): void {
    const statusElement = document.getElementById('calculation-status') as HTMLElement;
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-message ${type}`;
    }
  }

  /**
   * Show action status message
   */
  private showActionStatus(message: string, type: 'success' | 'error' | 'warning'): void {
    const statusElement = document.getElementById('action-status') as HTMLElement;
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-message ${type}`;
      
      // Auto-clear success messages after 3 seconds
      if (type === 'success') {
        setTimeout(() => {
          statusElement.textContent = '';
          statusElement.className = 'status-message';
        }, 3000);
      }
    }
  }

  /**
   * Update last updated timestamp
   */
  private updateLastUpdatedTimestamp(): void {
    const lastUpdatedElement = document.getElementById('last-updated') as HTMLElement;
    if (lastUpdatedElement) {
      lastUpdatedElement.textContent = new Date().toLocaleString();
    }
  }

  /**
   * Auto-save form data to localStorage
   */
  private autoSaveData(): void {
    const formData = this.getFormData();
    if (formData) {
      try {
        this.dataManager.saveData(formData);
      } catch (error) {
        // Silently fail auto-save, don't interrupt user experience
        console.warn('Auto-save failed:', error);
      }
    }
  }

  /**
   * Load saved data from localStorage
   */
  private loadSavedData(): void {
    try {
      const savedData = this.dataManager.loadData();
      if (savedData) {
        this.populateForm(savedData);
        this.updateLastUpdatedTimestamp();
        
        // Perform initial calculation if data is complete
        this.performRealTimeCalculation();
      }
    } catch (error) {
      console.warn('Failed to load saved data:', error);
    }
  }

  /**
   * Populate form with data
   */
  private populateForm(data: RetirementData): void {
    this.setInputValue('current-age', data.currentAge);
    this.setInputValue('retirement-age', data.retirementAge);
    this.setInputValue('current-savings', data.currentSavings);
    this.setInputValue('monthly-contribution', data.monthlyContribution);
    this.setInputValue('expected-return', data.expectedAnnualReturn * 100); // Convert to percentage
  }

  /**
   * Set value of an input field
   */
  private setInputValue(inputId: string, value: number): void {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) {
      input.value = value.toString();
    }
  }

  /**
   * Handle file import
   */
  private async handleFileImport(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;

    try {
      const importedData = await this.importExportManager.importData(file);
      
      // Populate form with imported data
      this.populateForm(importedData);
      
      // Save imported data
      this.dataManager.saveData(importedData);
      
      // Perform calculation with imported data
      this.performRealTimeCalculation();
      
      this.showActionStatus('Data imported successfully', 'success');
      
      // Clear the file input
      target.value = '';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      this.showActionStatus(`Import failed: ${errorMessage}`, 'error');
      
      // Clear the file input
      target.value = '';
    }
  }

  /**
   * Handle data export
   */
  private handleDataExport(): void {
    const formData = this.getFormData();
    
    if (!formData) {
      this.showActionStatus('Please fill in all fields before exporting', 'warning');
      return;
    }

    try {
      this.importExportManager.exportData(formData);
      this.showActionStatus('Data exported successfully', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      this.showActionStatus(`Export failed: ${errorMessage}`, 'error');
    }
  }

  /**
   * Handle data clear
   */
  private handleDataClear(): void {
    // Confirm with user before clearing
    if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      return;
    }

    try {
      // Clear localStorage
      this.dataManager.clearData();
      
      // Clear form
      const form = document.getElementById('retirement-form') as HTMLFormElement;
      if (form) {
        form.reset();
      }
      
      // Clear all error messages
      this.clearAllErrors();
      
      // Reset results display
      this.resetResultsDisplay();
      
      // Clear status messages
      const calculationStatus = document.getElementById('calculation-status') as HTMLElement;
      if (calculationStatus) {
        calculationStatus.textContent = '';
        calculationStatus.className = 'status-message';
      }
      
      // Reset last updated timestamp
      const lastUpdatedElement = document.getElementById('last-updated') as HTMLElement;
      if (lastUpdatedElement) {
        lastUpdatedElement.textContent = 'Never';
      }
      
      this.showActionStatus('All data has been cleared successfully', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Clear operation failed';
      this.showActionStatus(`Failed to clear data: ${errorMessage}`, 'error');
    }
  }

  /**
   * Reset results display to default values
   */
  private resetResultsDisplay(): void {
    this.updateElementText('years-to-retirement', '--');
    this.updateElementText('total-savings', '$--');
    this.updateElementText('monthly-income', '$--');
    this.updateElementText('total-contributions', '$--');
    this.updateElementText('interest-earned', '$--');
  }
}