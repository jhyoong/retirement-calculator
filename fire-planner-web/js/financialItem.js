/**
 * FinancialItem Class
 * Represents a financial data item with time-based scheduling and validation
 */

class FinancialItem {
    /**
     * Create a new FinancialItem
     * @param {string} name - Name of the financial item
     * @param {number} amount - Amount value
     * @param {string} startDate - Start date in YYYY-MM format
     * @param {string|null} endDate - End date in YYYY-MM format or null for indefinite
     * @param {Array} subcategories - Array of subcategory objects
     * @param {string} category - Category type (income, expenses, investments, loans)
     */
    constructor(name, amount, startDate = null, endDate = null, subcategories = [], category = 'income') {
        this.id = this.generateUUID();
        this.name = this.validateName(name);
        this.amount = this.validateAmount(amount);
        this.startDate = this.validateDate(startDate);
        this.endDate = this.validateDate(endDate);
        this.subcategories = this.validateSubcategories(subcategories);
        this.category = this.validateCategory(category);
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
        
        // Validate date logic
        this.validateDateRange();
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
     * Validate name input
     * @param {string} name - Name to validate
     * @returns {string} Validated name
     */
    validateName(name) {
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new Error('Name is required and must be a non-empty string');
        }
        return name.trim();
    }

    /**
     * Validate amount input
     * @param {number} amount - Amount to validate
     * @returns {number} Validated amount
     */
    validateAmount(amount) {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount < 0) {
            throw new Error('Amount must be a non-negative number');
        }
        return numAmount;
    }

    /**
     * Validate date format (YYYY-MM)
     * @param {string|null} date - Date to validate
     * @returns {string|null} Validated date or null
     */
    validateDate(date) {
        if (date === null || date === undefined || date === '') {
            return null;
        }
        
        if (typeof date !== 'string') {
            throw new Error('Date must be a string in YYYY-MM format');
        }
        
        const dateRegex = /^\d{4}-\d{2}$/;
        if (!dateRegex.test(date)) {
            throw new Error('Date must be in YYYY-MM format (e.g., "2024-01")');
        }
        
        const [year, month] = date.split('-').map(Number);
        if (year < 1900 || year > 2100) {
            throw new Error('Year must be between 1900 and 2100');
        }
        if (month < 1 || month > 12) {
            throw new Error('Month must be between 01 and 12');
        }
        
        return date;
    }

    /**
     * Validate subcategories array
     * @param {Array} subcategories - Subcategories to validate
     * @returns {Array} Validated subcategories
     */
    validateSubcategories(subcategories) {
        if (!Array.isArray(subcategories)) {
            throw new Error('Subcategories must be an array');
        }
        
        return subcategories.map(sub => {
            if (!sub || typeof sub !== 'object') {
                throw new Error('Each subcategory must be an object');
            }
            if (!sub.name || typeof sub.name !== 'string') {
                throw new Error('Each subcategory must have a name');
            }
            if (sub.amount !== undefined && (isNaN(parseFloat(sub.amount)) || parseFloat(sub.amount) < 0)) {
                throw new Error('Subcategory amount must be a non-negative number');
            }
            
            return {
                name: sub.name.trim(),
                amount: sub.amount !== undefined ? parseFloat(sub.amount) : 0
            };
        });
    }

    /**
     * Validate category type
     * @param {string} category - Category to validate
     * @returns {string} Validated category
     */
    validateCategory(category) {
        const validCategories = ['income', 'expenses', 'investments', 'loans'];
        if (!validCategories.includes(category)) {
            throw new Error(`Category must be one of: ${validCategories.join(', ')}`);
        }
        return category;
    }

    /**
     * Validate that end date is after start date
     */
    validateDateRange() {
        if (this.startDate && this.endDate) {
            const start = new Date(this.startDate + '-01');
            const end = new Date(this.endDate + '-01');
            
            if (end <= start) {
                throw new Error('End date must be after start date');
            }
        }
    }

    /**
     * Check if this item is active in a specific month
     * @param {string} targetMonth - Target month in YYYY-MM format
     * @returns {boolean} True if item is active in the target month
     */
    isActiveInMonth(targetMonth) {
        if (!targetMonth || !this.validateDate(targetMonth)) {
            return false;
        }
        
        const target = new Date(targetMonth + '-01');
        
        // Check start date
        if (this.startDate) {
            const start = new Date(this.startDate + '-01');
            if (target < start) {
                return false;
            }
        }
        
        // Check end date
        if (this.endDate) {
            const end = new Date(this.endDate + '-01');
            if (target > end) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Get the total amount including subcategories
     * @returns {number} Total amount
     */
    getTotalAmount() {
        const subcategoryTotal = this.subcategories.reduce((sum, sub) => sum + (sub.amount || 0), 0);
        return this.amount + subcategoryTotal;
    }

    /**
     * Update the item with new data
     * @param {Object} updates - Object containing fields to update
     */
    update(updates) {
        const allowedFields = ['name', 'amount', 'startDate', 'endDate', 'subcategories'];
        
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                switch (key) {
                    case 'name':
                        this.name = this.validateName(value);
                        break;
                    case 'amount':
                        this.amount = this.validateAmount(value);
                        break;
                    case 'startDate':
                    case 'endDate':
                        this[key] = this.validateDate(value);
                        break;
                    case 'subcategories':
                        this.subcategories = this.validateSubcategories(value);
                        break;
                }
            }
        }
        
        // Re-validate date range after updates
        this.validateDateRange();
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Convert to JSON representation
     * @returns {Object} JSON representation of the item
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            amount: this.amount,
            startDate: this.startDate,
            endDate: this.endDate,
            subcategories: this.subcategories,
            category: this.category,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Create FinancialItem from JSON data
     * @param {Object} jsonData - JSON data to create item from
     * @returns {FinancialItem} New FinancialItem instance
     */
    static fromJSON(jsonData) {
        const item = new FinancialItem(
            jsonData.name,
            jsonData.amount,
            jsonData.startDate,
            jsonData.endDate,
            jsonData.subcategories || [],
            jsonData.category || 'income'
        );
        
        // Preserve original timestamps and ID if provided
        if (jsonData.id) {
            item.id = jsonData.id;
        }
        if (jsonData.createdAt) {
            item.createdAt = jsonData.createdAt;
        }
        if (jsonData.updatedAt) {
            item.updatedAt = jsonData.updatedAt;
        }
        
        return item;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FinancialItem;
}