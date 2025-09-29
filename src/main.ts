import './style.css'

// Main application entry point
// This will be the central coordinator for the retirement calculator

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="container">
    <header>
      <h1>Retirement Calculator</h1>
      <p>Plan your financial future with our retirement savings calculator</p>
    </header>
    
    <main>
      <section id="calculator-form" class="form-section">
        <h2>Your Financial Information</h2>
        <form id="retirement-form" novalidate>
          <div class="form-group">
            <label for="current-age">Current Age</label>
            <input 
              type="number" 
              id="current-age" 
              name="currentAge" 
              min="18" 
              max="100" 
              required
              aria-describedby="current-age-error"
            />
            <div id="current-age-error" class="error-message" role="alert"></div>
          </div>
          
          <div class="form-group">
            <label for="retirement-age">Retirement Age</label>
            <input 
              type="number" 
              id="retirement-age" 
              name="retirementAge" 
              min="18" 
              max="100" 
              required
              aria-describedby="retirement-age-error"
            />
            <div id="retirement-age-error" class="error-message" role="alert"></div>
          </div>
          
          <div class="form-group">
            <label for="current-savings">Current Savings ($)</label>
            <input 
              type="number" 
              id="current-savings" 
              name="currentSavings" 
              min="0" 
              step="0.01" 
              required
              aria-describedby="current-savings-error"
            />
            <div id="current-savings-error" class="error-message" role="alert"></div>
          </div>
          
          <div class="form-group">
            <label for="monthly-contribution">Monthly Contribution ($)</label>
            <input 
              type="number" 
              id="monthly-contribution" 
              name="monthlyContribution" 
              min="0" 
              step="0.01" 
              required
              aria-describedby="monthly-contribution-error"
            />
            <div id="monthly-contribution-error" class="error-message" role="alert"></div>
          </div>
          
          <div class="form-group">
            <label for="expected-return">Expected Annual Return (%)</label>
            <input 
              type="number" 
              id="expected-return" 
              name="expectedAnnualReturn" 
              min="0" 
              max="20" 
              step="0.1" 
              required
              aria-describedby="expected-return-error"
            />
            <div id="expected-return-error" class="error-message" role="alert"></div>
          </div>
          
          <div class="form-actions">
            <button 
              type="button" 
              id="calculate-btn" 
              class="btn btn-primary btn-large"
            >
              Calculate Retirement Plan
            </button>
          </div>
        </form>
      </section>
      
      <section id="results-display" class="results-section">
        <h2>Your Retirement Projection</h2>
        <div id="results-content" class="results-content">
          <div class="result-item">
            <span class="result-label">Years to Retirement:</span>
            <span id="years-to-retirement" class="result-value">--</span>
          </div>
          
          <div class="result-item highlight">
            <span class="result-label">Total Retirement Savings:</span>
            <span id="total-savings" class="result-value">$--</span>
          </div>
          
          <div class="result-item highlight">
            <span class="result-label">Monthly Retirement Income:</span>
            <span id="monthly-income" class="result-value">$--</span>
          </div>
          
          <div class="result-item">
            <span class="result-label">Total Contributions:</span>
            <span id="total-contributions" class="result-value">$--</span>
          </div>
          
          <div class="result-item">
            <span class="result-label">Interest Earned:</span>
            <span id="interest-earned" class="result-value">$--</span>
          </div>
        </div>
        
        <div id="calculation-status" class="status-message" role="status" aria-live="polite"></div>
      </section>
      
      <section id="import-export-controls" class="controls-section">
        <h2>Data Management</h2>
        <div class="controls-group">
          <div class="export-controls">
            <button 
              type="button" 
              id="export-btn" 
              class="btn btn-primary"
              aria-describedby="export-help"
            >
              Export Data
            </button>
            <small id="export-help" class="help-text">
              Download your data as a JSON file for backup
            </small>
          </div>
          
          <div class="import-controls">
            <input 
              type="file" 
              id="import-file" 
              accept=".json"
              aria-describedby="import-help"
              style="display: none;"
            />
            <button 
              type="button" 
              id="import-btn" 
              class="btn btn-secondary"
              aria-describedby="import-help"
            >
              Import Data
            </button>
            <small id="import-help" class="help-text">
              Upload a previously exported JSON file
            </small>
          </div>
          
          <div class="clear-controls">
            <button 
              type="button" 
              id="clear-btn" 
              class="btn btn-danger"
              aria-describedby="clear-help"
            >
              Clear All Data
            </button>
            <small id="clear-help" class="help-text">
              Remove all saved data from this browser
            </small>
          </div>
        </div>
        
        <div id="action-status" class="status-message" role="status" aria-live="polite"></div>
      </section>
    </main>
    
    <footer>
      <p>Last updated: <span id="last-updated">Never</span></p>
    </footer>
  </div>
`

// Set up event handlers for UI components
function initializeEventHandlers() {
  // Import button handler - triggers hidden file input
  const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
  const importFile = document.getElementById('import-file') as HTMLInputElement;
  
  if (importBtn && importFile) {
    importBtn.addEventListener('click', () => {
      importFile.click();
    });
    
    // Handle file selection
    importFile.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        handleFileImport(file);
      }
    });
  }
  
  // Export button handler
  const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
  if (exportBtn) {
    exportBtn.addEventListener('click', handleDataExport);
  }
  
  // Clear button handler
  const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
  if (clearBtn) {
    clearBtn.addEventListener('click', handleDataClear);
  }
  
  // Calculate button handler
  const calculateBtn = document.getElementById('calculate-btn') as HTMLButtonElement;
  if (calculateBtn) {
    calculateBtn.addEventListener('click', handleCalculation);
  }
  
  // Form input handlers for real-time validation and calculation
  const form = document.getElementById('retirement-form') as HTMLFormElement;
  if (form) {
    const inputs = form.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('input', handleInputChange);
      input.addEventListener('blur', handleInputValidation);
    });
  }
}

// Basic calculation function (simplified version for UI demonstration)
function handleCalculation() {
  const form = document.getElementById('retirement-form') as HTMLFormElement;
  const statusElement = document.getElementById('calculation-status') as HTMLElement;
  
  if (!form || !statusElement) return;
  
  // Get form values
  const currentAge = parseFloat((document.getElementById('current-age') as HTMLInputElement).value);
  const retirementAge = parseFloat((document.getElementById('retirement-age') as HTMLInputElement).value);
  const currentSavings = parseFloat((document.getElementById('current-savings') as HTMLInputElement).value);
  const monthlyContribution = parseFloat((document.getElementById('monthly-contribution') as HTMLInputElement).value);
  const expectedReturn = parseFloat((document.getElementById('expected-return') as HTMLInputElement).value);
  
  // Basic validation
  if (isNaN(currentAge) || isNaN(retirementAge) || isNaN(currentSavings) || 
      isNaN(monthlyContribution) || isNaN(expectedReturn)) {
    statusElement.textContent = 'Please fill in all fields with valid numbers';
    statusElement.className = 'status-message error';
    return;
  }
  
  if (retirementAge <= currentAge) {
    statusElement.textContent = 'Retirement age must be greater than current age';
    statusElement.className = 'status-message error';
    return;
  }
  
  // Simple compound interest calculation (basic version)
  const yearsToRetirement = retirementAge - currentAge;
  const monthlyRate = expectedReturn / 100 / 12;
  const totalMonths = yearsToRetirement * 12;
  
  // Future value of current savings
  const futureValueCurrent = currentSavings * Math.pow(1 + monthlyRate, totalMonths);
  
  // Future value of monthly contributions (annuity)
  const futureValueContributions = monthlyContribution * 
    ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
  
  const totalSavings = futureValueCurrent + futureValueContributions;
  const totalContributions = monthlyContribution * totalMonths + currentSavings;
  const interestEarned = totalSavings - totalContributions;
  
  // Assume 4% withdrawal rate for monthly income
  const monthlyIncome = (totalSavings * 0.04) / 12;
  
  // Update display
  updateResultsDisplay({
    yearsToRetirement,
    totalSavings,
    monthlyIncome,
    totalContributions,
    interestEarned
  });
  
  statusElement.textContent = 'Calculation completed successfully';
  statusElement.className = 'status-message success';
  
  // Update last updated timestamp
  const lastUpdatedElement = document.getElementById('last-updated') as HTMLElement;
  if (lastUpdatedElement) {
    lastUpdatedElement.textContent = new Date().toLocaleString();
  }
}

function updateResultsDisplay(results: {
  yearsToRetirement: number;
  totalSavings: number;
  monthlyIncome: number;
  totalContributions: number;
  interestEarned: number;
}) {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  
  const yearsElement = document.getElementById('years-to-retirement') as HTMLElement;
  const savingsElement = document.getElementById('total-savings') as HTMLElement;
  const incomeElement = document.getElementById('monthly-income') as HTMLElement;
  const contributionsElement = document.getElementById('total-contributions') as HTMLElement;
  const interestElement = document.getElementById('interest-earned') as HTMLElement;
  
  if (yearsElement) yearsElement.textContent = results.yearsToRetirement.toString();
  if (savingsElement) savingsElement.textContent = formatCurrency(results.totalSavings);
  if (incomeElement) incomeElement.textContent = formatCurrency(results.monthlyIncome);
  if (contributionsElement) contributionsElement.textContent = formatCurrency(results.totalContributions);
  if (interestElement) interestElement.textContent = formatCurrency(results.interestEarned);
}

// Placeholder functions for event handlers (will be implemented in future tasks)
function handleFileImport(file: File) {
  const statusElement = document.getElementById('action-status') as HTMLElement;
  if (statusElement) {
    statusElement.textContent = `File import functionality will be implemented in future tasks. Selected: ${file.name}`;
    statusElement.className = 'status-message warning';
  }
}

function handleDataExport() {
  const statusElement = document.getElementById('action-status') as HTMLElement;
  if (statusElement) {
    statusElement.textContent = 'Data export functionality will be implemented in future tasks';
    statusElement.className = 'status-message warning';
  }
}

function handleDataClear() {
  const statusElement = document.getElementById('action-status') as HTMLElement;
  
  // Confirm with user before clearing
  if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
    return;
  }
  
  // Clear all form inputs
  const form = document.getElementById('retirement-form') as HTMLFormElement;
  if (form) {
    form.reset();
  }
  
  // Clear all error messages
  const errorElements = document.querySelectorAll('.error-message');
  errorElements.forEach(element => {
    element.textContent = '';
  });
  
  // Reset results display to default values
  const yearsElement = document.getElementById('years-to-retirement') as HTMLElement;
  const savingsElement = document.getElementById('total-savings') as HTMLElement;
  const incomeElement = document.getElementById('monthly-income') as HTMLElement;
  const contributionsElement = document.getElementById('total-contributions') as HTMLElement;
  const interestElement = document.getElementById('interest-earned') as HTMLElement;
  
  if (yearsElement) yearsElement.textContent = '--';
  if (savingsElement) savingsElement.textContent = '$--';
  if (incomeElement) incomeElement.textContent = '$--';
  if (contributionsElement) contributionsElement.textContent = '$--';
  if (interestElement) interestElement.textContent = '$--';
  
  // Clear calculation status
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
  
  // Show success message
  if (statusElement) {
    statusElement.textContent = 'All data has been cleared successfully';
    statusElement.className = 'status-message success';
    
    // Clear the success message after 3 seconds
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.className = 'status-message';
    }, 3000);
  }
}

function handleInputChange(event: Event) {
  const target = event.target as HTMLInputElement;
  // Clear any previous error messages when user starts typing
  const errorElement = document.getElementById(`${target.id}-error`) as HTMLElement;
  if (errorElement) {
    errorElement.textContent = '';
  }
}

function handleInputValidation(event: Event) {
  const target = event.target as HTMLInputElement;
  const errorElement = document.getElementById(`${target.id}-error`) as HTMLElement;
  
  if (!errorElement) return;
  
  // Basic validation
  if (target.required && !target.value) {
    errorElement.textContent = 'This field is required';
    return;
  }
  
  const value = parseFloat(target.value);
  if (isNaN(value)) {
    errorElement.textContent = 'Please enter a valid number';
    return;
  }
  
  // Field-specific validation
  switch (target.name) {
    case 'currentAge':
      if (value < 18 || value > 100) {
        errorElement.textContent = 'Age must be between 18 and 100';
      }
      break;
    case 'retirementAge':
      if (value < 18 || value > 100) {
        errorElement.textContent = 'Retirement age must be between 18 and 100';
      }
      break;
    case 'currentSavings':
    case 'monthlyContribution':
      if (value < 0) {
        errorElement.textContent = 'Amount cannot be negative';
      }
      break;
    case 'expectedAnnualReturn':
      if (value < 0 || value > 20) {
        errorElement.textContent = 'Return must be between 0% and 20%';
      }
      break;
  }
}

// Initialize the application
initializeEventHandlers();
console.log('Retirement Calculator UI components initialized')