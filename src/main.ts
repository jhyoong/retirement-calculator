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