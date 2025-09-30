import type { RetirementData, CalculationResult, IncomeSource } from '../types';
import { CalculationEngine, DataManager, ImportExportManager, NotificationService, IncomeManager } from '../services';
import { IncomeSourceUI, TabManager } from '../components';

/**
 * UIController coordinates between UI components and business logic
 * Handles real-time calculations, validation, and user interactions
 */
export class UIController {
  private calculationEngine: CalculationEngine;
  private dataManager: DataManager;
  private importExportManager: ImportExportManager;
  private notificationService: NotificationService;
  private incomeManager: IncomeManager;
  private incomeSourceUI: IncomeSourceUI;
  private tabManager: TabManager;
  private debounceTimer: number | null = null;
  private readonly debounceDelay = 300; // 300ms debounce delay

  constructor() {
    this.calculationEngine = new CalculationEngine();
    this.dataManager = new DataManager();
    this.importExportManager = new ImportExportManager();
    this.notificationService = new NotificationService();
    this.incomeManager = new IncomeManager();
    
    // Initialize UI components
    this.tabManager = new TabManager(); // Manages tab navigation automatically
    this.incomeSourceUI = new IncomeSourceUI(
      this.incomeManager, 
      (sources) => this.handleIncomeSourcesChange(sources)
    );
    
    this.initializeEventHandlers();
    this.checkBrowserCompatibility();
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

    // Clear previous error and styling
    errorElement.textContent = '';
    input.classList.remove('error', 'success');

    // Check if field is required and empty
    if (input.required && !input.value.trim()) {
      this.showFieldError(input.id, 'This field is required');
      input.classList.add('error');
      return false;
    }

    // Skip validation if field is empty but not required
    if (!input.value.trim()) {
      return true;
    }

    const value = parseFloat(input.value);
    if (isNaN(value)) {
      this.showFieldError(input.id, 'Please enter a valid number');
      input.classList.add('error');
      return false;
    }

    // Field-specific validation
    switch (input.name) {
      case 'currentAge':
        if (value < 18 || value > 100) {
          this.showFieldError(input.id, 'Age must be between 18 and 100');
          input.classList.add('error');
          return false;
        }
        break;
      
      case 'retirementAge':
        if (value < 18 || value > 100) {
          this.showFieldError(input.id, 'Retirement age must be between 18 and 100');
          input.classList.add('error');
          return false;
        }
        // Check if retirement age is greater than current age
        const currentAgeInput = document.getElementById('current-age') as HTMLInputElement;
        if (currentAgeInput && currentAgeInput.value) {
          const currentAge = parseFloat(currentAgeInput.value);
          if (!isNaN(currentAge) && value <= currentAge) {
            this.showFieldError(input.id, 'Retirement age must be greater than current age');
            input.classList.add('error');
            return false;
          }
        }
        break;
      
      case 'currentSavings':
      case 'monthlyContribution':
        if (value < 0) {
          this.showFieldError(input.id, 'Amount cannot be negative');
          input.classList.add('error');
          return false;
        }
        // Warn about unrealistic values
        if (input.name === 'monthlyContribution' && value > 50000) {
          this.showFieldError(input.id, 'Monthly contribution seems unrealistically high');
          input.classList.add('error');
          return false;
        }
        if (input.name === 'currentSavings' && value > 100000000) {
          this.showFieldError(input.id, 'Current savings seems unrealistically high');
          input.classList.add('error');
          return false;
        }
        break;
      
      case 'expectedAnnualReturn':
        if (value < 0 || value > 20) {
          this.showFieldError(input.id, 'Return must be between 0% and 20%');
          input.classList.add('error');
          return false;
        }
        break;
    }

    // If we get here, validation passed
    input.classList.add('success');
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

    // Validate income sources
    const incomeValidation = this.incomeManager.validateAllSources();
    if (!incomeValidation.isValid) {
      // Show income source validation errors
      this.showCalculationStatus(`Income source errors: ${incomeValidation.errors.join(', ')}`, 'error');
      isValid = false;
    }

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
   * Handle income sources change
   */
  private handleIncomeSourcesChange(sources: IncomeSource[]): void {
    // Update the income manager with the new sources
    this.incomeManager.setIncomeSources(sources);
    
    // Update the income summary with current age
    const currentAge = this.getInputValue('current-age');
    if (!isNaN(currentAge) && currentAge > 0) {
      this.incomeSourceUI.updateSummaryWithAge(currentAge);
    }
    
    // Trigger recalculation if we have complete data
    this.performRealTimeCalculation();
    this.autoSaveData();
  }

  /**
   * Get current form data
   */
  private getFormData(): RetirementData | null {
    const currentAge = this.getInputValue('current-age');
    const retirementAge = this.getInputValue('retirement-age');
    const currentSavings = this.getInputValue('current-savings');
    const expectedAnnualReturn = this.getInputValue('expected-return');
    const inflationRate = this.getInputValue('inflation-rate') || 2.5;
    const monthlyRetirementSpending = this.getInputValue('monthly-spending');

    // Check if all required values are valid numbers
    if (isNaN(currentAge) || isNaN(retirementAge) || isNaN(currentSavings) || 
        isNaN(expectedAnnualReturn) || isNaN(monthlyRetirementSpending)) {
      return null;
    }

    // Get income sources from the income manager
    const incomeSources = this.incomeManager.getAllIncomeSources();

    return {
      currentAge,
      retirementAge,
      currentSavings,
      expectedAnnualReturn: expectedAnnualReturn / 100, // Convert percentage to decimal
      inflationRate: inflationRate / 100, // Convert percentage to decimal
      monthlyRetirementSpending,
      incomeSources,
      expenses: [], // Will be implemented in Phase 3
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
    const calculateBtn = document.getElementById('calculate-btn') as HTMLButtonElement;
    
    // Clear previous status
    if (statusElement) {
      statusElement.textContent = '';
      statusElement.className = 'status-message';
    }

    // Add loading state to button
    if (calculateBtn) {
      calculateBtn.classList.add('loading');
      calculateBtn.disabled = true;
    }

    // Validate all fields first
    if (!this.validateAllFields()) {
      this.showCalculationStatus('Please correct the errors above', 'error');
      this.removeButtonLoading(calculateBtn);
      return;
    }

    const formData = this.getFormData();
    if (!formData) {
      this.showCalculationStatus('Please fill in all fields with valid numbers', 'error');
      this.removeButtonLoading(calculateBtn);
      return;
    }

    try {
      const result = this.calculationEngine.calculateRetirement(formData);
      this.displayResults(result);
      this.showCalculationStatus('Calculation completed successfully', 'success');
      this.notificationService.showOperationFeedback('calculate', true);
      this.updateLastUpdatedTimestamp();
      
      // Auto-save the data
      this.autoSaveData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Calculation failed';
      this.showCalculationStatus(errorMessage, 'error');
      this.notificationService.showOperationFeedback('calculate', false, errorMessage);
    } finally {
      this.removeButtonLoading(calculateBtn);
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
        // Silently fail auto-save, but log for debugging
        console.warn('Auto-save failed:', error);
        
        // Show notification only if localStorage is completely unavailable
        if (error instanceof Error && error.message.includes('localStorage not available')) {
          // Only show this notification once per session
          if (!this.hasShownStorageWarning) {
            this.notificationService.showStorageWarning();
            this.hasShownStorageWarning = true;
          }
        }
      }
    }
  }

  private hasShownStorageWarning: boolean = false;

  /**
   * Check browser compatibility and show warnings if needed
   */
  private checkBrowserCompatibility(): void {
    this.notificationService.showBrowserCompatibilityWarnings();
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
        
        // Show success notification for data restoration
        this.notificationService.showInfo('Previous data restored from browser storage');
      }
    } catch (error) {
      console.warn('Failed to load saved data:', error);
      this.notificationService.showWarning('Could not restore previous data from browser storage');
    }
  }

  /**
   * Populate form with data
   */
  private populateForm(data: RetirementData): void {
    this.setInputValue('current-age', data.currentAge);
    this.setInputValue('retirement-age', data.retirementAge);
    this.setInputValue('current-savings', data.currentSavings);
    this.setInputValue('expected-return', data.expectedAnnualReturn * 100); // Convert to percentage
    this.setInputValue('inflation-rate', (data.inflationRate || 0.025) * 100); // Convert to percentage
    this.setInputValue('monthly-spending', data.monthlyRetirementSpending || 0);
    
    // Load income sources into both the manager and UI
    if (data.incomeSources && data.incomeSources.length > 0) {
      // Set sources in the income manager
      const validation = this.incomeManager.setIncomeSources(data.incomeSources);
      if (!validation.isValid) {
        console.warn('Invalid income sources loaded:', validation.errors);
        this.notificationService.showWarning('Some income sources could not be loaded due to validation errors');
      }
      
      // Set sources in the UI
      this.incomeSourceUI.setIncomeSources(data.incomeSources);
    } else {
      // Clear income sources if none exist
      this.incomeManager.clearAllSources();
      this.incomeSourceUI.setIncomeSources([]);
    }
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
    const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
    
    if (!file) return;

    // Add loading state
    if (importBtn) {
      importBtn.classList.add('loading');
      importBtn.disabled = true;
    }

    try {
      const importedData = await this.importExportManager.importData(file);
      
      // Populate form with imported data
      this.populateForm(importedData);
      
      // Save imported data (with error handling)
      try {
        this.dataManager.saveData(importedData);
      } catch (saveError) {
        console.warn('Failed to save imported data:', saveError);
        // Continue with import even if save fails
      }
      
      // Perform calculation with imported data
      this.performRealTimeCalculation();
      
      this.showActionStatus('Data imported successfully', 'success');
      this.notificationService.showOperationFeedback('import', true);
      
      // Clear the file input
      target.value = '';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      this.showActionStatus(`Import failed: ${errorMessage}`, 'error');
      this.notificationService.showOperationFeedback('import', false, errorMessage);
      
      // Clear the file input
      target.value = '';
    } finally {
      this.removeButtonLoading(importBtn);
    }
  }

  /**
   * Handle data export
   */
  private handleDataExport(): void {
    const formData = this.getFormData();
    const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    
    if (!formData) {
      this.showActionStatus('Please fill in all fields before exporting', 'warning');
      return;
    }

    // Add loading state
    if (exportBtn) {
      exportBtn.classList.add('loading');
      exportBtn.disabled = true;
    }

    try {
      this.importExportManager.exportData(formData);
      this.showActionStatus('Data exported successfully', 'success');
      this.notificationService.showOperationFeedback('export', true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      this.showActionStatus(`Export failed: ${errorMessage}`, 'error');
      this.notificationService.showOperationFeedback('export', false, errorMessage);
    } finally {
      this.removeButtonLoading(exportBtn);
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
      
      // Clear income sources
      this.incomeManager.clearAllSources();
      this.incomeSourceUI.setIncomeSources([]);
      
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
      this.notificationService.showOperationFeedback('clear', true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Clear operation failed';
      this.showActionStatus(`Failed to clear data: ${errorMessage}`, 'error');
      this.notificationService.showOperationFeedback('clear', false, errorMessage);
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

  /**
   * Remove loading state from button
   */
  private removeButtonLoading(button: HTMLButtonElement | null): void {
    if (button) {
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  /**
   * Get the tab manager instance
   */
  public getTabManager(): TabManager {
    return this.tabManager;
  }

  /**
   * Get the income manager instance
   */
  public getIncomeManager(): IncomeManager {
    return this.incomeManager;
  }

  /**
   * Get the income source UI instance
   */
  public getIncomeSourceUI(): IncomeSourceUI {
    return this.incomeSourceUI;
  }
}