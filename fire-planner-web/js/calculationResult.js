/**
 * CalculationResult Class
 * Stores and manages financial projection calculation results
 */

class CalculationResult {
    /**
     * Create a new CalculationResult
     * @param {Object} options - Configuration options for the result
     */
    constructor(options = {}) {
        // Core projection data
        this.monthlyProjections = [];
        this.retirementFeasible = false;
        this.requiredMonthlySavings = 0;
        this.projectedRetirementDate = null;
        this.totalRetirementCorpus = 0;
        this.monthlyDeficit = 0;
        
        // Additional analysis data
        this.totalIncome = 0;
        this.totalExpenses = 0;
        this.totalInvestments = 0;
        this.totalLoans = 0;
        this.netWorth = 0;
        
        // Calculation metadata
        this.calculationDate = new Date().toISOString();
        this.timeHorizon = options.timeHorizon || 40; // years
        this.inflationRate = options.inflationRate || 0.03;
        this.investmentReturn = options.investmentReturn || 0.07;
        
        // Retirement goal parameters
        this.targetRetirementAge = options.targetRetirementAge || 65;
        this.desiredMonthlyIncome = options.desiredMonthlyIncome || 0;
        this.retirementDuration = options.retirementDuration || 25;
        
        // Validation flags
        this.isValid = true;
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Add a monthly projection data point
     * @param {Object} projection - Monthly projection data
     */
    addMonthlyProjection(projection) {
        const validatedProjection = this.validateMonthlyProjection(projection);
        this.monthlyProjections.push(validatedProjection);
    }

    /**
     * Validate monthly projection data
     * @param {Object} projection - Projection to validate
     * @returns {Object} Validated projection
     */
    validateMonthlyProjection(projection) {
        const required = ['month', 'income', 'expenses', 'netCashFlow', 'cumulativeSavings'];
        
        for (const field of required) {
            if (projection[field] === undefined || projection[field] === null) {
                throw new Error(`Monthly projection missing required field: ${field}`);
            }
        }
        
        return {
            month: projection.month, // YYYY-MM format
            income: this.validateNumber(projection.income, 'income'),
            expenses: this.validateNumber(projection.expenses, 'expenses'),
            investments: this.validateNumber(projection.investments || 0, 'investments'),
            loans: this.validateNumber(projection.loans || 0, 'loans'),
            taxes: this.validateNumber(projection.taxes || 0, 'taxes'),
            netCashFlow: this.validateNumber(projection.netCashFlow, 'netCashFlow'),
            cumulativeSavings: this.validateNumber(projection.cumulativeSavings, 'cumulativeSavings'),
            inflationAdjustedExpenses: this.validateNumber(projection.inflationAdjustedExpenses || projection.expenses, 'inflationAdjustedExpenses'),
            investmentGrowth: this.validateNumber(projection.investmentGrowth || 0, 'investmentGrowth')
        };
    }

    /**
     * Validate numeric values
     * @param {number} value - Value to validate
     * @param {string} fieldName - Name of the field for error messages
     * @returns {number} Validated number
     */
    validateNumber(value, fieldName) {
        const num = parseFloat(value);
        if (isNaN(num)) {
            throw new Error(`${fieldName} must be a valid number`);
        }
        return num;
    }

    /**
     * Set retirement feasibility analysis
     * @param {boolean} feasible - Whether retirement is feasible
     * @param {number} requiredSavings - Required monthly savings
     * @param {string} projectedDate - Projected retirement date (YYYY-MM)
     */
    setRetirementAnalysis(feasible, requiredSavings, projectedDate) {
        this.retirementFeasible = Boolean(feasible);
        this.requiredMonthlySavings = this.validateNumber(requiredSavings, 'requiredMonthlySavings');
        this.projectedRetirementDate = projectedDate;
        
        if (projectedDate && !this.isValidDate(projectedDate)) {
            this.addWarning('Invalid projected retirement date format');
        }
    }

    /**
     * Set total retirement corpus needed
     * @param {number} corpus - Total corpus amount
     */
    setRetirementCorpus(corpus) {
        this.totalRetirementCorpus = this.validateNumber(corpus, 'totalRetirementCorpus');
    }

    /**
     * Set monthly deficit/surplus
     * @param {number} deficit - Monthly deficit (negative) or surplus (positive)
     */
    setMonthlyDeficit(deficit) {
        this.monthlyDeficit = this.validateNumber(deficit, 'monthlyDeficit');
    }

    /**
     * Set summary totals
     * @param {Object} totals - Object containing total values
     */
    setSummaryTotals(totals) {
        this.totalIncome = this.validateNumber(totals.income || 0, 'totalIncome');
        this.totalExpenses = this.validateNumber(totals.expenses || 0, 'totalExpenses');
        this.totalInvestments = this.validateNumber(totals.investments || 0, 'totalInvestments');
        this.totalLoans = this.validateNumber(totals.loans || 0, 'totalLoans');
        this.netWorth = this.validateNumber(totals.netWorth || 0, 'netWorth');
    }

    /**
     * Add an error to the result
     * @param {string} error - Error message
     */
    addError(error) {
        this.errors.push(error);
        this.isValid = false;
    }

    /**
     * Add a warning to the result
     * @param {string} warning - Warning message
     */
    addWarning(warning) {
        this.warnings.push(warning);
    }

    /**
     * Get the latest monthly projection
     * @returns {Object|null} Latest projection or null if none exist
     */
    getLatestProjection() {
        return this.monthlyProjections.length > 0 
            ? this.monthlyProjections[this.monthlyProjections.length - 1]
            : null;
    }

    /**
     * Get projections for a specific year
     * @param {number} year - Year to filter by
     * @returns {Array} Array of projections for the year
     */
    getProjectionsForYear(year) {
        return this.monthlyProjections.filter(projection => 
            projection.month.startsWith(year.toString())
        );
    }

    /**
     * Get annual summary for a specific year
     * @param {number} year - Year to summarize
     * @returns {Object} Annual summary
     */
    getAnnualSummary(year) {
        const yearProjections = this.getProjectionsForYear(year);
        
        if (yearProjections.length === 0) {
            return null;
        }
        
        const summary = {
            year: year,
            totalIncome: 0,
            totalExpenses: 0,
            totalInvestments: 0,
            totalLoans: 0,
            netCashFlow: 0,
            endingSavings: 0
        };
        
        yearProjections.forEach(projection => {
            summary.totalIncome += projection.income;
            summary.totalExpenses += projection.expenses;
            summary.totalInvestments += projection.investments;
            summary.totalLoans += projection.loans;
            summary.netCashFlow += projection.netCashFlow;
        });
        
        // Get ending savings from last month of year
        const lastProjection = yearProjections[yearProjections.length - 1];
        summary.endingSavings = lastProjection.cumulativeSavings;
        
        return summary;
    }

    /**
     * Validate date format
     * @param {string} date - Date to validate
     * @returns {boolean} True if valid
     */
    isValidDate(date) {
        const dateRegex = /^\d{4}-\d{2}$/;
        return dateRegex.test(date);
    }

    /**
     * Get calculation summary
     * @returns {Object} Summary of key metrics
     */
    getSummary() {
        return {
            retirementFeasible: this.retirementFeasible,
            requiredMonthlySavings: this.requiredMonthlySavings,
            projectedRetirementDate: this.projectedRetirementDate,
            totalRetirementCorpus: this.totalRetirementCorpus,
            monthlyDeficit: this.monthlyDeficit,
            totalProjections: this.monthlyProjections.length,
            timeHorizon: this.timeHorizon,
            isValid: this.isValid,
            hasErrors: this.errors.length > 0,
            hasWarnings: this.warnings.length > 0
        };
    }

    /**
     * Convert to JSON representation
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            monthlyProjections: this.monthlyProjections,
            retirementFeasible: this.retirementFeasible,
            requiredMonthlySavings: this.requiredMonthlySavings,
            projectedRetirementDate: this.projectedRetirementDate,
            totalRetirementCorpus: this.totalRetirementCorpus,
            monthlyDeficit: this.monthlyDeficit,
            totalIncome: this.totalIncome,
            totalExpenses: this.totalExpenses,
            totalInvestments: this.totalInvestments,
            totalLoans: this.totalLoans,
            netWorth: this.netWorth,
            calculationDate: this.calculationDate,
            timeHorizon: this.timeHorizon,
            inflationRate: this.inflationRate,
            investmentReturn: this.investmentReturn,
            targetRetirementAge: this.targetRetirementAge,
            desiredMonthlyIncome: this.desiredMonthlyIncome,
            retirementDuration: this.retirementDuration,
            isValid: this.isValid,
            errors: this.errors,
            warnings: this.warnings
        };
    }

    /**
     * Create CalculationResult from JSON data
     * @param {Object} jsonData - JSON data to create result from
     * @returns {CalculationResult} New CalculationResult instance
     */
    static fromJSON(jsonData) {
        const result = new CalculationResult({
            timeHorizon: jsonData.timeHorizon,
            inflationRate: jsonData.inflationRate,
            investmentReturn: jsonData.investmentReturn,
            targetRetirementAge: jsonData.targetRetirementAge,
            desiredMonthlyIncome: jsonData.desiredMonthlyIncome,
            retirementDuration: jsonData.retirementDuration
        });
        
        // Restore all data
        result.monthlyProjections = jsonData.monthlyProjections || [];
        result.retirementFeasible = jsonData.retirementFeasible || false;
        result.requiredMonthlySavings = jsonData.requiredMonthlySavings || 0;
        result.projectedRetirementDate = jsonData.projectedRetirementDate;
        result.totalRetirementCorpus = jsonData.totalRetirementCorpus || 0;
        result.monthlyDeficit = jsonData.monthlyDeficit || 0;
        result.totalIncome = jsonData.totalIncome || 0;
        result.totalExpenses = jsonData.totalExpenses || 0;
        result.totalInvestments = jsonData.totalInvestments || 0;
        result.totalLoans = jsonData.totalLoans || 0;
        result.netWorth = jsonData.netWorth || 0;
        result.calculationDate = jsonData.calculationDate || new Date().toISOString();
        result.isValid = jsonData.isValid !== false;
        result.errors = jsonData.errors || [];
        result.warnings = jsonData.warnings || [];
        
        return result;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CalculationResult;
}