import './style.css'
import { UIController } from './controllers'

// Main application entry point
// This will be the central coordinator for the retirement calculator

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="container">
    <header>
      <h1>Retirement Calculator</h1>
      <p>Plan your financial future with our retirement savings calculator</p>
    </header>
    
    <main>
      <!-- Tab Navigation -->
      <nav class="tab-navigation" role="tablist">
        <button 
          class="tab-button active" 
          id="income-tab-btn" 
          role="tab" 
          aria-selected="true" 
          aria-controls="income-tab"
          data-tab="income"
        >
          💰 Income Sources
        </button>
        <button 
          class="tab-button" 
          id="basic-tab-btn" 
          role="tab" 
          aria-selected="false" 
          aria-controls="basic-tab"
          data-tab="basic"
        >
          📊 Basic Info
        </button>
        <button 
          class="tab-button" 
          id="results-tab-btn" 
          role="tab" 
          aria-selected="false" 
          aria-controls="results-tab"
          data-tab="results"
        >
          📈 Results
        </button>
      </nav>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- Income Sources Tab -->
        <section id="income-tab" class="tab-panel active" role="tabpanel" aria-labelledby="income-tab-btn">
          <div class="form-section">
            <h2>Income Sources</h2>
            <p class="section-description">Add multiple income sources to get accurate retirement projections based on your diverse income streams.</p>
            
            <!-- Income Summary -->
            <div id="income-summary" class="income-summary">
              <div class="summary-item">
                <span class="summary-label">Total Monthly Income:</span>
                <span id="total-monthly-income" class="summary-value">$0</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Monthly Contributions:</span>
                <span id="monthly-contributions" class="summary-value">$0</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Active Sources:</span>
                <span id="active-sources-count" class="summary-value">0</span>
              </div>
            </div>

            <!-- Add Income Source Form -->
            <div class="add-income-section">
              <h3>Add New Income Source</h3>
              <form id="add-income-form" class="income-form" novalidate>
                <div class="form-row">
                  <div class="form-group">
                    <label for="income-name">Income Source Name</label>
                    <input 
                      type="text" 
                      id="income-name" 
                      name="name" 
                      required
                      placeholder="e.g., Primary Job, Rental Property"
                      aria-describedby="income-name-error"
                    />
                    <div id="income-name-error" class="error-message" role="alert"></div>
                  </div>
                  
                  <div class="form-group">
                    <label for="income-type">Income Type</label>
                    <select 
                      id="income-type" 
                      name="type" 
                      required
                      aria-describedby="income-type-error"
                    >
                      <option value="">Select income type</option>
                      <option value="regular_job">Regular Job</option>
                      <option value="fixed_period">Fixed-Period Contract</option>
                      <option value="one_time">One-Time Payment</option>
                      <option value="rental">Rental Income</option>
                      <option value="investment">Investment Income</option>
                    </select>
                    <div id="income-type-error" class="error-message" role="alert"></div>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label for="income-amount">Amount ($)</label>
                    <input 
                      type="number" 
                      id="income-amount" 
                      name="amount" 
                      min="0" 
                      step="0.01" 
                      required
                      aria-describedby="income-amount-error"
                    />
                    <div id="income-amount-error" class="error-message" role="alert"></div>
                  </div>
                  
                  <div class="form-group">
                    <label for="income-frequency">Frequency</label>
                    <select 
                      id="income-frequency" 
                      name="frequency" 
                      required
                      aria-describedby="income-frequency-error"
                    >
                      <option value="">Select frequency</option>
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                      <option value="one_time">One Time</option>
                    </select>
                    <div id="income-frequency-error" class="error-message" role="alert"></div>
                  </div>
                </div>

                <!-- Dynamic fields based on income type -->
                <div id="dynamic-income-fields" class="dynamic-fields"></div>

                <div class="form-actions">
                  <button type="submit" class="btn btn-primary">Add Income Source</button>
                  <button type="button" id="clear-income-form" class="btn btn-secondary">Clear Form</button>
                </div>
              </form>
            </div>

            <!-- Income Sources List -->
            <div class="income-sources-section">
              <h3>Your Income Sources</h3>
              <div id="income-sources-list" class="income-sources-list">
                <div class="empty-state">
                  <p>No income sources added yet. Add your first income source above to get started.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Basic Information Tab -->
        <section id="basic-tab" class="tab-panel" role="tabpanel" aria-labelledby="basic-tab-btn">
          <div class="form-section">
            <h2>Basic Retirement Information</h2>
            <p class="section-description">Enter your basic retirement planning information.</p>
            
            <form id="retirement-form" novalidate>
              <div class="form-row">
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
              </div>

              <div class="form-row">
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
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="inflation-rate">Inflation Rate (%)</label>
                  <input 
                    type="number" 
                    id="inflation-rate" 
                    name="inflationRate" 
                    min="0" 
                    max="15" 
                    step="0.1" 
                    value="2.5"
                    required
                    aria-describedby="inflation-rate-error"
                  />
                  <div id="inflation-rate-error" class="error-message" role="alert"></div>
                </div>
                
                <div class="form-group">
                  <label for="monthly-spending">Monthly Retirement Spending ($)</label>
                  <input 
                    type="number" 
                    id="monthly-spending" 
                    name="monthlyRetirementSpending" 
                    min="0" 
                    step="0.01" 
                    required
                    aria-describedby="monthly-spending-error"
                  />
                  <div id="monthly-spending-error" class="error-message" role="alert"></div>
                </div>
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
          </div>
        </section>

        <!-- Results Tab -->
        <section id="results-tab" class="tab-panel" role="tabpanel" aria-labelledby="results-tab-btn">
          <div class="results-section">
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
            
            <!-- Data Management Controls -->
            <div class="data-management-section">
              <h3>Data Management</h3>
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
            </div>
          </div>
        </section>
      </div>
    </main>
    
    <footer>
      <p>Last updated: <span id="last-updated">Never</span></p>
    </footer>
    
    <!-- Global notification system -->
    <div id="notification-container" class="notification-container" aria-live="assertive" role="alert"></div>
  </div>
`

// Initialize the application with UIController
new UIController();
console.log('Retirement Calculator initialized with UIController');

// Register service worker for offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}