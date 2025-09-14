/**
 * TimeManager Class
 * Handles all date-based scheduling and time calculations for financial items
 */

class TimeManager {
    /**
     * Parse and validate a time range in YYYY-MM format
     * @param {string} timeRange - Time range to validate
     * @returns {Object} Parsed date object with year and month
     * @throws {Error} If format is invalid
     */
    parseTimeRange(timeRange) {
        if (!timeRange || typeof timeRange !== 'string') {
            throw new Error('Time range must be a non-empty string');
        }

        const dateRegex = /^\d{4}-\d{2}$/;
        if (!dateRegex.test(timeRange)) {
            throw new Error('Time range must be in YYYY-MM format (e.g., "2024-01")');
        }

        const [year, month] = timeRange.split('-').map(Number);
        
        if (year < 1900 || year > 2100) {
            throw new Error('Year must be between 1900 and 2100');
        }
        
        if (month < 1 || month > 12) {
            throw new Error('Month must be between 01 and 12');
        }

        return {
            year: year,
            month: month,
            dateString: timeRange,
            date: new Date(year, month - 1, 1) // JavaScript months are 0-indexed
        };
    }

    /**
     * Filter financial items that are active in a specific month
     * @param {Array} financialItems - Array of FinancialItem objects
     * @param {string} targetMonth - Target month in YYYY-MM format
     * @returns {Array} Array of active financial items
     */
    getActiveItemsForMonth(financialItems, targetMonth) {
        if (!Array.isArray(financialItems)) {
            throw new Error('Financial items must be an array');
        }

        // Validate target month format
        this.parseTimeRange(targetMonth);

        return financialItems.filter(item => {
            if (!item || typeof item.isActiveInMonth !== 'function') {
                return false;
            }
            return item.isActiveInMonth(targetMonth);
        });
    }

    /**
     * Calculate the number of months between two dates
     * @param {string} startDate - Start date in YYYY-MM format
     * @param {string} endDate - End date in YYYY-MM format
     * @returns {number} Number of months between dates (inclusive)
     */
    calculateMonthsBetween(startDate, endDate) {
        const start = this.parseTimeRange(startDate);
        const end = this.parseTimeRange(endDate);

        if (end.date < start.date) {
            throw new Error('End date must be after or equal to start date');
        }

        const yearDiff = end.year - start.year;
        const monthDiff = end.month - start.month;
        
        // Add 1 to make it inclusive (both start and end months count)
        return (yearDiff * 12) + monthDiff + 1;
    }

    /**
     * Get the current month in YYYY-MM format
     * @returns {string} Current month string
     */
    getCurrentMonth() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    /**
     * Add months to a given date
     * @param {string} startDate - Start date in YYYY-MM format
     * @param {number} monthsToAdd - Number of months to add
     * @returns {string} New date in YYYY-MM format
     */
    addMonths(startDate, monthsToAdd) {
        const parsed = this.parseTimeRange(startDate);
        const date = new Date(parsed.date);
        
        date.setMonth(date.getMonth() + monthsToAdd);
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        return `${year}-${month}`;
    }

    /**
     * Generate a range of months between start and end dates
     * @param {string} startDate - Start date in YYYY-MM format
     * @param {string} endDate - End date in YYYY-MM format
     * @returns {Array} Array of month strings in YYYY-MM format
     */
    generateMonthRange(startDate, endDate) {
        const months = [];
        const totalMonths = this.calculateMonthsBetween(startDate, endDate);
        
        for (let i = 0; i < totalMonths; i++) {
            months.push(this.addMonths(startDate, i));
        }
        
        return months;
    }

    /**
     * Check if a date is in the past relative to current month
     * @param {string} dateString - Date to check in YYYY-MM format
     * @returns {boolean} True if date is in the past
     */
    isInPast(dateString) {
        const current = this.parseTimeRange(this.getCurrentMonth());
        const target = this.parseTimeRange(dateString);
        
        return target.date < current.date;
    }

    /**
     * Check if a date is in the future relative to current month
     * @param {string} dateString - Date to check in YYYY-MM format
     * @returns {boolean} True if date is in the future
     */
    isInFuture(dateString) {
        const current = this.parseTimeRange(this.getCurrentMonth());
        const target = this.parseTimeRange(dateString);
        
        return target.date > current.date;
    }

    /**
     * Format a date string for display
     * @param {string} dateString - Date in YYYY-MM format
     * @returns {string} Formatted date string (e.g., "January 2024")
     */
    formatDateForDisplay(dateString) {
        const parsed = this.parseTimeRange(dateString);
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        return `${monthNames[parsed.month - 1]} ${parsed.year}`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimeManager;
}