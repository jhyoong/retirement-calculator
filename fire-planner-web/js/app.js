/**
 * Main Application Entry Point
 * Coordinates all components and manages application lifecycle
 */

class App {
    constructor() {
        this.dataManager = null;
        this.calculationEngine = null;
        this.uiController = null;
        this.fileHandler = null;
        this.timeManager = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing Retirement Planning Calculator...');
            
            // Show loading indicator
            this.showLoading(true);
            
            // Initialize core components (will be implemented in later tasks)
            // this.dataManager = new DataManager();
            // this.calculationEngine = new CalculationEngine();
            // this.uiController = new UIController();
            // this.fileHandler = new FileHandler();
            // this.timeManager = new TimeManager();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize UI
            this.initializeUI();
            
            this.isInitialized = true;
            console.log('Application initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Set up global event listeners
     */
    setupEventListeners() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.isInitialized) {
                // Refresh calculations when page becomes visible
                this.refreshCalculations();
            }
        });

        // Handle window resize for responsive updates
        window.addEventListener('resize', this.debounce(() => {
            if (this.uiController) {
                this.uiController.handleResize();
            }
        }, 250));

        // Handle beforeunload to warn about unsaved changes
        window.addEventListener('beforeunload', (event) => {
            if (this.hasUnsavedChanges()) {
                event.preventDefault();
                event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return event.returnValue;
            }
        });
    }

    /**
     * Initialize the user interface
     */
    initializeUI() {
        const contentElement = document.getElementById('content');
        if (contentElement) {
            contentElement.innerHTML = `
                <div class="welcome-message">
                    <h2>Welcome to Retirement Planning Calculator</h2>
                    <p>Your comprehensive tool for financial planning and retirement calculations.</p>
                    <p><em>Application components are being initialized...</em></p>
                </div>
            `;
        }
    }

    /**
     * Show or hide loading indicator
     */
    showLoading(show) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            if (show) {
                loadingElement.classList.remove('hidden');
            } else {
                loadingElement.classList.add('hidden');
            }
        }
    }

    /**
     * Show error message to user
     */
    showError(message) {
        console.error(message);
        // TODO: Implement proper error display in UI
        alert(message); // Temporary error display
    }

    /**
     * Refresh calculations (placeholder for future implementation)
     */
    refreshCalculations() {
        if (this.calculationEngine && this.dataManager) {
            // Will be implemented when calculation engine is ready
            console.log('Refreshing calculations...');
        }
    }

    /**
     * Check if there are unsaved changes (placeholder for future implementation)
     */
    hasUnsavedChanges() {
        // Will be implemented when data management is ready
        return false;
    }

    /**
     * Utility function to debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Generate UUID for unique identification
     */
    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
    
    // Make app globally available for debugging
    window.RetirementApp = app;
});