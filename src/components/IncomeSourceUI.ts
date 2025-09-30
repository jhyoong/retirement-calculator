import type { IncomeSource, ValidationResult } from '../types/index.js';
import { IncomeManager } from '../services/IncomeManager.js';

/**
 * IncomeSourceUI handles the user interface for managing income sources
 * Provides dynamic forms, validation, and real-time updates
 */
export class IncomeSourceUI {
  private incomeManager: IncomeManager;
  private onIncomeChange: (sources: IncomeSource[]) => void;
  private editingSourceId: string | null = null;

  constructor(incomeManager: IncomeManager, onIncomeChange: (sources: IncomeSource[]) => void) {
    this.incomeManager = incomeManager;
    this.onIncomeChange = onIncomeChange;
    this.initializeEventHandlers();
    this.updateSummary();
    this.renderIncomeSourcesList();
  }

  /**
   * Initialize all event handlers for income source management
   */
  private initializeEventHandlers(): void {
    // Form submission handler
    const addIncomeForm = document.getElementById('add-income-form') as HTMLFormElement;
    if (addIncomeForm) {
      addIncomeForm.addEventListener('submit', (event) => this.handleFormSubmit(event));
    }

    // Clear form handler
    const clearFormBtn = document.getElementById('clear-income-form') as HTMLButtonElement;
    if (clearFormBtn) {
      clearFormBtn.addEventListener('click', () => this.clearForm());
    }

    // Income type change handler for dynamic fields
    const incomeTypeSelect = document.getElementById('income-type') as HTMLSelectElement;
    if (incomeTypeSelect) {
      incomeTypeSelect.addEventListener('change', () => this.updateDynamicFields());
    }

    // Real-time validation handlers
    const formInputs = document.querySelectorAll('#add-income-form input, #add-income-form select');
    formInputs.forEach(input => {
      input.addEventListener('input', (event) => this.handleInputChange(event));
      input.addEventListener('blur', (event) => this.handleInputValidation(event));
    });
  }

  /**
   * Handle form submission for adding/editing income sources
   */
  private handleFormSubmit(event: Event): void {
    event.preventDefault();
    
    const formData = this.getFormData();
    if (!formData) return;

    try {
      if (this.editingSourceId) {
        // Update existing source
        const updateResult = this.incomeManager.updateIncomeSource(this.editingSourceId, formData);
        if (!updateResult.isValid) {
          this.showFormErrors(updateResult.errors);
          return;
        }
        this.editingSourceId = null;
        this.updateFormButtonText('Add Income Source');
      } else {
        // Add new source
        const addResult = this.incomeManager.addIncomeSource(formData);
        if (!addResult.isValid) {
          this.showFormErrors(addResult.errors);
          return;
        }
      }

      // Success - clear form and update UI
      this.clearForm();
      this.renderIncomeSourcesList();
      this.updateSummary();
      this.onIncomeChange(this.incomeManager.getAllIncomeSources());
      
      // Show success message
      this.showSuccessMessage(this.editingSourceId ? 'Income source updated successfully' : 'Income source added successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save income source';
      this.showFormErrors([errorMessage]);
    }
  }

  /**
   * Get form data as IncomeSource object
   */
  private getFormData(): Omit<IncomeSource, 'id'> | null {
    const nameInput = document.getElementById('income-name') as HTMLInputElement;
    const typeSelect = document.getElementById('income-type') as HTMLSelectElement;
    const amountInput = document.getElementById('income-amount') as HTMLInputElement;
    const frequencySelect = document.getElementById('income-frequency') as HTMLSelectElement;

    if (!nameInput || !typeSelect || !amountInput || !frequencySelect) {
      return null;
    }

    const name = nameInput.value.trim();
    const type = typeSelect.value as IncomeSource['type'];
    const amount = parseFloat(amountInput.value) || 0;
    const frequency = frequencySelect.value as IncomeSource['frequency'];

    if (!name || !type || !frequency) {
      return null;
    }

    const baseData: Omit<IncomeSource, 'id'> = {
      name,
      type,
      amount,
      frequency
    };

    // Add dynamic fields based on income type
    this.addDynamicFieldsToData(baseData);

    return baseData;
  }

  /**
   * Add dynamic fields to form data based on income type
   */
  private addDynamicFieldsToData(data: Omit<IncomeSource, 'id'>): void {
    // Annual increase for regular jobs and rental income
    if (data.type === 'regular_job' || data.type === 'rental') {
      const annualIncreaseInput = document.getElementById('annual-increase') as HTMLInputElement;
      if (annualIncreaseInput && annualIncreaseInput.value) {
        data.annualIncrease = parseFloat(annualIncreaseInput.value) / 100; // Convert percentage to decimal
      }
    }

    // Contribution percentage for all income types
    const contributionInput = document.getElementById('contribution-percentage') as HTMLInputElement;
    if (contributionInput && contributionInput.value) {
      data.contributionPercentage = parseFloat(contributionInput.value) / 100; // Convert percentage to decimal
    }

    // Start and end dates for fixed period and one-time income
    if (data.type === 'fixed_period' || data.type === 'one_time') {
      const startDateInput = document.getElementById('start-date') as HTMLInputElement;
      if (startDateInput && startDateInput.value) {
        data.startDate = new Date(startDateInput.value);
      }

      if (data.type === 'fixed_period') {
        const endDateInput = document.getElementById('end-date') as HTMLInputElement;
        if (endDateInput && endDateInput.value) {
          data.endDate = new Date(endDateInput.value);
        }
      }
    }

    // Expected return for investment income
    if (data.type === 'investment') {
      const expectedReturnInput = document.getElementById('expected-return-rate') as HTMLInputElement;
      if (expectedReturnInput && expectedReturnInput.value) {
        data.expectedReturn = parseFloat(expectedReturnInput.value) / 100; // Convert percentage to decimal
      }
    }
  }

  /**
   * Update dynamic fields based on selected income type
   */
  private updateDynamicFields(): void {
    const typeSelect = document.getElementById('income-type') as HTMLSelectElement;
    const dynamicFieldsContainer = document.getElementById('dynamic-income-fields') as HTMLElement;
    
    if (!typeSelect || !dynamicFieldsContainer) return;

    const selectedType = typeSelect.value as IncomeSource['type'];
    dynamicFieldsContainer.innerHTML = '';

    if (!selectedType) return;

    let fieldsHTML = '';

    // Common field: Contribution percentage
    fieldsHTML += `
      <div class="form-row">
        <div class="form-group">
          <label for="contribution-percentage">Retirement Contribution (%)</label>
          <input 
            type="number" 
            id="contribution-percentage" 
            name="contributionPercentage" 
            min="0" 
            max="100" 
            step="0.1" 
            placeholder="e.g., 15"
            aria-describedby="contribution-percentage-error"
          />
          <div id="contribution-percentage-error" class="error-message" role="alert"></div>
          <small class="help-text">Percentage of this income that goes to retirement savings</small>
        </div>
      </div>
    `;

    // Type-specific fields
    switch (selectedType) {
      case 'regular_job':
        fieldsHTML += `
          <div class="form-row">
            <div class="form-group">
              <label for="annual-increase">Annual Salary Increase (%)</label>
              <input 
                type="number" 
                id="annual-increase" 
                name="annualIncrease" 
                min="0" 
                max="20" 
                step="0.1" 
                placeholder="e.g., 3"
                aria-describedby="annual-increase-error"
              />
              <div id="annual-increase-error" class="error-message" role="alert"></div>
              <small class="help-text">Expected annual salary increase rate</small>
            </div>
          </div>
        `;
        break;

      case 'fixed_period':
        fieldsHTML += `
          <div class="form-row">
            <div class="form-group">
              <label for="start-date">Start Date</label>
              <input 
                type="date" 
                id="start-date" 
                name="startDate" 
                required
                aria-describedby="start-date-error"
              />
              <div id="start-date-error" class="error-message" role="alert"></div>
            </div>
            <div class="form-group">
              <label for="end-date">End Date</label>
              <input 
                type="date" 
                id="end-date" 
                name="endDate" 
                required
                aria-describedby="end-date-error"
              />
              <div id="end-date-error" class="error-message" role="alert"></div>
            </div>
          </div>
        `;
        break;

      case 'one_time':
        fieldsHTML += `
          <div class="form-row">
            <div class="form-group">
              <label for="start-date">Payment Date</label>
              <input 
                type="date" 
                id="start-date" 
                name="startDate" 
                required
                aria-describedby="start-date-error"
              />
              <div id="start-date-error" class="error-message" role="alert"></div>
            </div>
          </div>
        `;
        break;

      case 'rental':
        fieldsHTML += `
          <div class="form-row">
            <div class="form-group">
              <label for="annual-increase">Annual Rent Increase (%)</label>
              <input 
                type="number" 
                id="annual-increase" 
                name="annualIncrease" 
                min="0" 
                max="20" 
                step="0.1" 
                placeholder="e.g., 2.5"
                aria-describedby="annual-increase-error"
              />
              <div id="annual-increase-error" class="error-message" role="alert"></div>
              <small class="help-text">Expected annual rent increase rate</small>
            </div>
          </div>
        `;
        break;

      case 'investment':
        fieldsHTML += `
          <div class="form-row">
            <div class="form-group">
              <label for="expected-return-rate">Expected Annual Return (%)</label>
              <input 
                type="number" 
                id="expected-return-rate" 
                name="expectedReturn" 
                min="0" 
                max="30" 
                step="0.1" 
                placeholder="e.g., 7"
                aria-describedby="expected-return-rate-error"
              />
              <div id="expected-return-rate-error" class="error-message" role="alert"></div>
              <small class="help-text">Expected annual return on investment</small>
            </div>
          </div>
        `;
        break;
    }

    dynamicFieldsContainer.innerHTML = fieldsHTML;

    // Add event handlers to new fields
    const newInputs = dynamicFieldsContainer.querySelectorAll('input');
    newInputs.forEach(input => {
      input.addEventListener('input', (event) => this.handleInputChange(event));
      input.addEventListener('blur', (event) => this.handleInputValidation(event));
    });
  }

  /**
   * Handle input changes for real-time validation
   */
  private handleInputChange(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    this.clearFieldError(target.id);
  }

  /**
   * Handle input validation on blur
   */
  private handleInputValidation(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    this.validateField(target);
  }

  /**
   * Validate a single form field
   */
  private validateField(input: HTMLInputElement | HTMLSelectElement): boolean {
    const errorElement = document.getElementById(`${input.id}-error`) as HTMLElement;
    if (!errorElement) return true;

    // Clear previous error and styling
    errorElement.textContent = '';
    input.classList.remove('error', 'success');

    // Check if field is required and empty
    if (input.hasAttribute('required') && !input.value.trim()) {
      this.showFieldError(input.id, 'This field is required');
      input.classList.add('error');
      return false;
    }

    // Skip validation if field is empty but not required
    if (!input.value.trim()) {
      return true;
    }

    // Field-specific validation
    switch (input.id) {
      case 'income-name':
        if (input.value.trim().length < 2) {
          this.showFieldError(input.id, 'Name must be at least 2 characters');
          input.classList.add('error');
          return false;
        }
        break;

      case 'income-amount':
        const amount = parseFloat(input.value);
        if (isNaN(amount) || amount <= 0) {
          this.showFieldError(input.id, 'Amount must be greater than 0');
          input.classList.add('error');
          return false;
        }
        if (amount > 1000000) {
          this.showFieldError(input.id, 'Amount seems unrealistically high');
          input.classList.add('error');
          return false;
        }
        break;

      case 'contribution-percentage':
      case 'annual-increase':
      case 'expected-return-rate':
        const percentage = parseFloat(input.value);
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
          this.showFieldError(input.id, 'Percentage must be between 0 and 100');
          input.classList.add('error');
          return false;
        }
        break;

      case 'start-date':
      case 'end-date':
        const date = new Date(input.value);
        if (isNaN(date.getTime())) {
          this.showFieldError(input.id, 'Please enter a valid date');
          input.classList.add('error');
          return false;
        }
        
        // Validate end date is after start date
        if (input.id === 'end-date') {
          const startDateInput = document.getElementById('start-date') as HTMLInputElement;
          if (startDateInput && startDateInput.value) {
            const startDate = new Date(startDateInput.value);
            if (date <= startDate) {
              this.showFieldError(input.id, 'End date must be after start date');
              input.classList.add('error');
              return false;
            }
          }
        }
        break;
    }

    // If we get here, validation passed
    input.classList.add('success');
    return true;
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
   * Show form errors
   */
  private showFormErrors(errors: string[]): void {
    // For now, show the first error in a general error area
    // In a more sophisticated implementation, we could map errors to specific fields
    const firstError = errors[0];
    if (firstError) {
      // Show error in the first available error element or create a general one
      const nameErrorElement = document.getElementById('income-name-error') as HTMLElement;
      if (nameErrorElement) {
        nameErrorElement.textContent = firstError;
      }
    }
  }

  /**
   * Show success message
   */
  private showSuccessMessage(message: string): void {
    // Create a temporary success message
    const form = document.getElementById('add-income-form') as HTMLElement;
    if (form) {
      const successDiv = document.createElement('div');
      successDiv.className = 'status-message success';
      successDiv.textContent = message;
      form.appendChild(successDiv);
      
      // Remove after 3 seconds
      setTimeout(() => {
        if (successDiv.parentNode) {
          successDiv.parentNode.removeChild(successDiv);
        }
      }, 3000);
    }
  }

  /**
   * Clear the form
   */
  private clearForm(): void {
    const form = document.getElementById('add-income-form') as HTMLFormElement;
    if (form) {
      form.reset();
      
      // Clear dynamic fields
      const dynamicFieldsContainer = document.getElementById('dynamic-income-fields') as HTMLElement;
      if (dynamicFieldsContainer) {
        dynamicFieldsContainer.innerHTML = '';
      }
      
      // Clear all error messages
      const errorElements = form.querySelectorAll('.error-message');
      errorElements.forEach(element => {
        element.textContent = '';
      });
      
      // Remove validation classes
      const inputs = form.querySelectorAll('input, select');
      inputs.forEach(input => {
        input.classList.remove('error', 'success');
      });
    }
    
    this.editingSourceId = null;
    this.updateFormButtonText('Add Income Source');
  }

  /**
   * Update form button text
   */
  private updateFormButtonText(text: string): void {
    const submitButton = document.querySelector('#add-income-form button[type="submit"]') as HTMLButtonElement;
    if (submitButton) {
      submitButton.textContent = text;
    }
  }

  /**
   * Render the list of income sources
   */
  private renderIncomeSourcesList(): void {
    const listContainer = document.getElementById('income-sources-list') as HTMLElement;
    if (!listContainer) return;

    const sources = this.incomeManager.getAllIncomeSources();
    
    if (sources.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <p>No income sources added yet. Add your first income source above to get started.</p>
        </div>
      `;
      return;
    }

    const sourcesHTML = sources.map(source => this.renderIncomeSourceItem(source)).join('');
    listContainer.innerHTML = sourcesHTML;

    // Add event handlers for edit and delete buttons
    sources.forEach(source => {
      const editBtn = document.getElementById(`edit-${source.id}`) as HTMLButtonElement;
      const deleteBtn = document.getElementById(`delete-${source.id}`) as HTMLButtonElement;
      
      if (editBtn) {
        editBtn.addEventListener('click', () => this.editIncomeSource(source.id));
      }
      
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => this.deleteIncomeSource(source.id));
      }
    });
  }

  /**
   * Render a single income source item
   */
  private renderIncomeSourceItem(source: IncomeSource): string {
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    
    const formatPercentage = (rate: number) => 
      `${(rate * 100).toFixed(1)}%`;

    const getTypeLabel = (type: string) => {
      const labels: Record<string, string> = {
        'regular_job': 'Regular Job',
        'fixed_period': 'Fixed Period',
        'one_time': 'One Time',
        'rental': 'Rental Income',
        'investment': 'Investment'
      };
      return labels[type] || type;
    };

    const getFrequencyLabel = (frequency: string) => {
      const labels: Record<string, string> = {
        'monthly': 'Monthly',
        'annual': 'Annual',
        'one_time': 'One Time'
      };
      return labels[frequency] || frequency;
    };

    const monthlyAmount = this.calculateMonthlyAmount(source);
    const contributionAmount = monthlyAmount * (source.contributionPercentage || 0);

    return `
      <div class="income-source-item">
        <div class="income-source-info">
          <div class="income-source-name">${source.name}</div>
          <div class="income-source-type">${getTypeLabel(source.type)}</div>
          <div class="income-source-amount">
            ${formatCurrency(source.amount)} ${getFrequencyLabel(source.frequency)}
          </div>
          <div class="income-source-contribution">
            ${source.contributionPercentage ? formatPercentage(source.contributionPercentage) : '0%'} → ${formatCurrency(contributionAmount)}/mo
          </div>
        </div>
        <div class="income-source-actions">
          <button 
            id="edit-${source.id}" 
            class="btn btn-small btn-edit" 
            title="Edit income source"
          >
            Edit
          </button>
          <button 
            id="delete-${source.id}" 
            class="btn btn-small btn-delete" 
            title="Delete income source"
          >
            Delete
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Calculate monthly amount for display purposes
   */
  private calculateMonthlyAmount(source: IncomeSource): number {
    switch (source.frequency) {
      case 'monthly':
        return source.amount;
      case 'annual':
        return source.amount / 12;
      case 'one_time':
        return 0; // One-time payments don't contribute to monthly income
      default:
        return 0;
    }
  }

  /**
   * Edit an income source
   */
  private editIncomeSource(sourceId: string): void {
    const source = this.incomeManager.getIncomeSourceById(sourceId);
    if (!source) return;

    // Populate form with source data
    this.populateFormWithSource(source);
    this.editingSourceId = sourceId;
    this.updateFormButtonText('Update Income Source');

    // Scroll to form
    const form = document.getElementById('add-income-form') as HTMLElement;
    if (form) {
      form.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Populate form with income source data
   */
  private populateFormWithSource(source: IncomeSource): void {
    const nameInput = document.getElementById('income-name') as HTMLInputElement;
    const typeSelect = document.getElementById('income-type') as HTMLSelectElement;
    const amountInput = document.getElementById('income-amount') as HTMLInputElement;
    const frequencySelect = document.getElementById('income-frequency') as HTMLSelectElement;

    if (nameInput) nameInput.value = source.name;
    if (typeSelect) typeSelect.value = source.type;
    if (amountInput) amountInput.value = source.amount.toString();
    if (frequencySelect) frequencySelect.value = source.frequency;

    // Update dynamic fields first
    this.updateDynamicFields();

    // Then populate dynamic field values
    setTimeout(() => {
      if (source.annualIncrease !== undefined) {
        const annualIncreaseInput = document.getElementById('annual-increase') as HTMLInputElement;
        if (annualIncreaseInput) {
          annualIncreaseInput.value = (source.annualIncrease * 100).toString();
        }
      }

      if (source.contributionPercentage !== undefined) {
        const contributionInput = document.getElementById('contribution-percentage') as HTMLInputElement;
        if (contributionInput) {
          contributionInput.value = (source.contributionPercentage * 100).toString();
        }
      }

      if (source.startDate) {
        const startDateInput = document.getElementById('start-date') as HTMLInputElement;
        if (startDateInput) {
          startDateInput.value = source.startDate.toISOString().split('T')[0];
        }
      }

      if (source.endDate) {
        const endDateInput = document.getElementById('end-date') as HTMLInputElement;
        if (endDateInput) {
          endDateInput.value = source.endDate.toISOString().split('T')[0];
        }
      }

      if (source.expectedReturn !== undefined) {
        const expectedReturnInput = document.getElementById('expected-return-rate') as HTMLInputElement;
        if (expectedReturnInput) {
          expectedReturnInput.value = (source.expectedReturn * 100).toString();
        }
      }
    }, 100);
  }

  /**
   * Delete an income source
   */
  private deleteIncomeSource(sourceId: string): void {
    const source = this.incomeManager.getIncomeSourceById(sourceId);
    if (!source) return;

    if (confirm(`Are you sure you want to delete "${source.name}"? This action cannot be undone.`)) {
      const success = this.incomeManager.removeIncomeSource(sourceId);
      if (success) {
        this.renderIncomeSourcesList();
        this.updateSummary();
        this.onIncomeChange(this.incomeManager.getAllIncomeSources());
        this.showSuccessMessage('Income source deleted successfully');
      }
    }
  }

  /**
   * Update the income summary display
   */
  private updateSummary(): void {
    const currentDate = new Date();
    const currentAge = 30; // This should come from the main form, but for now use a default
    
    const summary = this.incomeManager.getIncomeSummary(currentDate, currentAge);
    
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    const totalIncomeElement = document.getElementById('total-monthly-income') as HTMLElement;
    const contributionsElement = document.getElementById('monthly-contributions') as HTMLElement;
    const activeSourcesElement = document.getElementById('active-sources-count') as HTMLElement;

    if (totalIncomeElement) {
      totalIncomeElement.textContent = formatCurrency(summary.totalMonthlyIncome);
    }
    
    if (contributionsElement) {
      contributionsElement.textContent = formatCurrency(summary.totalMonthlyContributions);
    }
    
    if (activeSourcesElement) {
      activeSourcesElement.textContent = summary.activeSources.toString();
    }
  }

  /**
   * Get all income sources
   */
  public getAllIncomeSources(): IncomeSource[] {
    return this.incomeManager.getAllIncomeSources();
  }

  /**
   * Set income sources (for loading saved data)
   */
  public setIncomeSources(sources: IncomeSource[]): ValidationResult {
    const result = this.incomeManager.setIncomeSources(sources);
    if (result.isValid) {
      this.renderIncomeSourcesList();
      this.updateSummary();
    }
    return result;
  }

  /**
   * Update summary with current age from main form
   */
  public updateSummaryWithAge(currentAge: number): void {
    const currentDate = new Date();
    const summary = this.incomeManager.getIncomeSummary(currentDate, currentAge);
    
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

    const totalIncomeElement = document.getElementById('total-monthly-income') as HTMLElement;
    const contributionsElement = document.getElementById('monthly-contributions') as HTMLElement;

    if (totalIncomeElement) {
      totalIncomeElement.textContent = formatCurrency(summary.totalMonthlyIncome);
    }
    
    if (contributionsElement) {
      contributionsElement.textContent = formatCurrency(summary.totalMonthlyContributions);
    }
  }
}