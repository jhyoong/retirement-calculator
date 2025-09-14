/**
 * DataManager Class
 * Central data store and validation layer for financial data operations
 * Handles CRUD operations, validation, and subcategory management
 */

// Import FinancialItem if available
let FinancialItem;
if (typeof require !== 'undefined') {
    try {
        FinancialItem = require('./financialItem.js');
    } catch (e) {
        // FinancialItem will be available globally in browser environment
    }
}

class DataManager {
    /**
     * Initialize DataManager with empty data structure
     */
    constructor() {
        this.data = {
            income: [],
            expenses: [],
            investments: [],
            loans: [],
            economicFactors: {
                inflationRate: 0.03,
                taxRate: 0.25,
                interestRate: 0.05
            },
            retirementGoals: {
                targetAge: 65,
                desiredMonthlyIncome: 4000,
                retirementDuration: 25
            }
        };
        
        this.validCategories = ['income', 'expenses', 'investments', 'loans'];
        this.listeners = [];
    }

    /**
     * Generate a UUID for unique identification
     * @returns {string} UUID string
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Add a financial item to the specified category
     * @param {string} category - Category to add item to (income, expenses, investments, loans)
     * @param {Object|FinancialItem} item - Item data or FinancialItem instance
     * @returns {string} ID of the added item
     */
    addFinancialItem(category, item) {
        this.validateCategory(category);
        
        let financialItem;
        if (item instanceof FinancialItem) {
            financialItem = item;
        } else {
            // Create FinancialItem from plain object
            financialItem = new FinancialItem(
                item.name,
                item.amount,
                item.startDate,
                item.endDate,
                item.subcategories || [],
                category
            );
        }
        
        this.data[category].push(financialItem);
        this.notifyListeners('itemAdded', { category, item: financialItem });
        
        return financialItem.id;
    }

    /**
     * Update an existing financial item
     * @param {string} id - ID of the item to update
     * @param {Object} updates - Object containing fields to update
     * @returns {boolean} True if item was found and updated
     */
    updateFinancialItem(id, updates) {
        const { category, item } = this.findItemById(id);
        
        if (!item) {
            throw new Error(`Financial item with ID ${id} not found`);
        }
        
        // Use the FinancialItem's update method for validation
        item.update(updates);
        
        this.notifyListeners('itemUpdated', { category, item, updates });
        return true;
    }

    /**
     * Remove a financial item by ID
     * @param {string} id - ID of the item to remove
     * @returns {boolean} True if item was found and removed
     */
    removeFinancialItem(id) {
        const { category, item, index } = this.findItemById(id);
        
        if (!item) {
            throw new Error(`Financial item with ID ${id} not found`);
        }
        
        this.data[category].splice(index, 1);
        this.notifyListeners('itemRemoved', { category, item });
        
        return true;
    }

    /**
     * Get all financial data, optionally filtered by category
     * @param {string|null} category - Category to filter by, or null for all data
     * @returns {Object|Array} Financial data
     */
    getFinancialData(category = null) {
        if (category) {
            this.validateCategory(category);
            return [...this.data[category]]; // Return copy to prevent external modification
        }
        
        // Return deep copy of all data
        return {
            income: [...this.data.income],
            expenses: [...this.data.expenses],
            investments: [...this.data.investments],
            loans: [...this.data.loans],
            economicFactors: { ...this.data.economicFactors },
            retirementGoals: { ...this.data.retirementGoals }
        };
    }

    /**
     * Get a financial item by ID
     * @param {string} id - ID of the item to retrieve
     * @returns {FinancialItem|null} The financial item or null if not found
     */
    getFinancialItem(id) {
        const { item } = this.findItemById(id);
        return item || null;
    }

    /**
     * Add a subcategory to an existing financial item
     * @param {string} itemId - ID of the item to add subcategory to
     * @param {Object} subcategory - Subcategory object with name and amount
     * @returns {boolean} True if subcategory was added
     */
    addSubcategory(itemId, subcategory) {
        const { item } = this.findItemById(itemId);
        
        if (!item) {
            throw new Error(`Financial item with ID ${itemId} not found`);
        }
        
        // Validate subcategory
        if (!subcategory || typeof subcategory !== 'object') {
            throw new Error('Subcategory must be an object');
        }
        if (!subcategory.name || typeof subcategory.name !== 'string') {
            throw new Error('Subcategory must have a name');
        }
        if (subcategory.amount !== undefined && (isNaN(parseFloat(subcategory.amount)) || parseFloat(subcategory.amount) < 0)) {
            throw new Error('Subcategory amount must be a non-negative number');
        }
        
        const validatedSubcategory = {
            name: subcategory.name.trim(),
            amount: subcategory.amount !== undefined ? parseFloat(subcategory.amount) : 0
        };
        
        item.subcategories.push(validatedSubcategory);
        item.updatedAt = new Date().toISOString();
        
        this.notifyListeners('subcategoryAdded', { item, subcategory: validatedSubcategory });
        return true;
    }

    /**
     * Remove a subcategory from an existing financial item
     * @param {string} itemId - ID of the item to remove subcategory from
     * @param {string} subcategoryName - Name of the subcategory to remove
     * @returns {boolean} True if subcategory was removed
     */
    removeSubcategory(itemId, subcategoryName) {
        const { item } = this.findItemById(itemId);
        
        if (!item) {
            throw new Error(`Financial item with ID ${itemId} not found`);
        }
        
        const index = item.subcategories.findIndex(sub => sub.name === subcategoryName);
        if (index === -1) {
            throw new Error(`Subcategory "${subcategoryName}" not found`);
        }
        
        const removedSubcategory = item.subcategories.splice(index, 1)[0];
        item.updatedAt = new Date().toISOString();
        
        this.notifyListeners('subcategoryRemoved', { item, subcategory: removedSubcategory });
        return true;
    }

    /**
     * Update economic factors
     * @param {Object} factors - Object containing economic factors to update
     */
    updateEconomicFactors(factors) {
        const validFactors = ['inflationRate', 'taxRate', 'interestRate'];
        
        for (const [key, value] of Object.entries(factors)) {
            if (validFactors.includes(key)) {
                const numValue = parseFloat(value);
                if (isNaN(numValue) || numValue < 0) {
                    throw new Error(`${key} must be a non-negative number`);
                }
                this.data.economicFactors[key] = numValue;
            }
        }
        
        this.notifyListeners('economicFactorsUpdated', { factors: this.data.economicFactors });
    }

    /**
     * Update retirement goals
     * @param {Object} goals - Object containing retirement goals to update
     */
    updateRetirementGoals(goals) {
        const validGoals = ['targetAge', 'desiredMonthlyIncome', 'retirementDuration'];
        
        for (const [key, value] of Object.entries(goals)) {
            if (validGoals.includes(key)) {
                const numValue = parseFloat(value);
                if (isNaN(numValue) || numValue <= 0) {
                    throw new Error(`${key} must be a positive number`);
                }
                this.data.retirementGoals[key] = numValue;
            }
        }
        
        this.notifyListeners('retirementGoalsUpdated', { goals: this.data.retirementGoals });
    }

    /**
     * Validate data integrity and structure
     * @param {Object} data - Data object to validate
     * @returns {Object} Validation result with isValid boolean and errors array
     */
    validateData(data) {
        const errors = [];
        
        if (!data || typeof data !== 'object') {
            errors.push('Data must be an object');
            return { isValid: false, errors };
        }
        
        // Validate required structure
        const requiredCategories = ['income', 'expenses', 'investments', 'loans'];
        for (const category of requiredCategories) {
            if (!Array.isArray(data[category])) {
                errors.push(`${category} must be an array`);
            } else {
                // Validate each item in the category
                data[category].forEach((item, index) => {
                    try {
                        if (!(item instanceof FinancialItem)) {
                            // Try to create FinancialItem to validate structure
                            new FinancialItem(
                                item.name,
                                item.amount,
                                item.startDate,
                                item.endDate,
                                item.subcategories || [],
                                category
                            );
                        }
                    } catch (error) {
                        errors.push(`${category}[${index}]: ${error.message}`);
                    }
                });
            }
        }
        
        // Validate economic factors
        if (data.economicFactors) {
            const factors = data.economicFactors;
            if (typeof factors !== 'object') {
                errors.push('economicFactors must be an object');
            } else {
                ['inflationRate', 'taxRate', 'interestRate'].forEach(factor => {
                    if (factors[factor] !== undefined) {
                        const value = parseFloat(factors[factor]);
                        if (isNaN(value) || value < 0) {
                            errors.push(`economicFactors.${factor} must be a non-negative number`);
                        }
                    }
                });
            }
        }
        
        // Validate retirement goals
        if (data.retirementGoals) {
            const goals = data.retirementGoals;
            if (typeof goals !== 'object') {
                errors.push('retirementGoals must be an object');
            } else {
                ['targetAge', 'desiredMonthlyIncome', 'retirementDuration'].forEach(goal => {
                    if (goals[goal] !== undefined) {
                        const value = parseFloat(goals[goal]);
                        if (isNaN(value) || value <= 0) {
                            errors.push(`retirementGoals.${goal} must be a positive number`);
                        }
                    }
                });
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Load data from external source (typically JSON import)
     * @param {Object} newData - Data to load
     * @returns {boolean} True if data was loaded successfully
     */
    loadData(newData) {
        const validation = this.validateData(newData);
        
        if (!validation.isValid) {
            throw new Error(`Invalid data structure: ${validation.errors.join(', ')}`);
        }
        
        // Convert plain objects to FinancialItem instances
        const processedData = {
            income: [],
            expenses: [],
            investments: [],
            loans: [],
            economicFactors: newData.economicFactors || this.data.economicFactors,
            retirementGoals: newData.retirementGoals || this.data.retirementGoals
        };
        
        for (const category of this.validCategories) {
            if (newData[category]) {
                processedData[category] = newData[category].map(item => {
                    if (item instanceof FinancialItem) {
                        return item;
                    } else {
                        return FinancialItem.fromJSON({ ...item, category });
                    }
                });
            }
        }
        
        this.data = processedData;
        this.notifyListeners('dataLoaded', { data: this.getFinancialData() });
        
        return true;
    }

    /**
     * Clear all data and reset to initial state
     */
    clearData() {
        this.data = {
            income: [],
            expenses: [],
            investments: [],
            loans: [],
            economicFactors: {
                inflationRate: 0.03,
                taxRate: 0.25,
                interestRate: 0.05
            },
            retirementGoals: {
                targetAge: 65,
                desiredMonthlyIncome: 4000,
                retirementDuration: 25
            }
        };
        
        this.notifyListeners('dataCleared', {});
    }

    /**
     * Add event listener for data changes
     * @param {Function} listener - Callback function to call on data changes
     */
    addListener(listener) {
        if (typeof listener === 'function') {
            this.listeners.push(listener);
        }
    }

    /**
     * Remove event listener
     * @param {Function} listener - Listener function to remove
     */
    removeListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners of data changes
     * @param {string} event - Event type
     * @param {Object} data - Event data
     */
    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in data change listener:', error);
            }
        });
    }

    /**
     * Find a financial item by ID across all categories
     * @param {string} id - ID to search for
     * @returns {Object} Object with category, item, and index
     */
    findItemById(id) {
        for (const category of this.validCategories) {
            const index = this.data[category].findIndex(item => item.id === id);
            if (index !== -1) {
                return {
                    category,
                    item: this.data[category][index],
                    index
                };
            }
        }
        
        return { category: null, item: null, index: -1 };
    }

    /**
     * Validate category name
     * @param {string} category - Category to validate
     */
    validateCategory(category) {
        if (!this.validCategories.includes(category)) {
            throw new Error(`Invalid category: ${category}. Must be one of: ${this.validCategories.join(', ')}`);
        }
    }

    /**
     * Get statistics about the current data
     * @returns {Object} Statistics object
     */
    getDataStatistics() {
        const stats = {
            totalItems: 0,
            itemsByCategory: {},
            totalSubcategories: 0
        };
        
        for (const category of this.validCategories) {
            const items = this.data[category];
            stats.itemsByCategory[category] = items.length;
            stats.totalItems += items.length;
            
            // Count subcategories
            items.forEach(item => {
                stats.totalSubcategories += item.subcategories.length;
            });
        }
        
        return stats;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
}