/**
 * DataManager Unit Tests
 * Comprehensive test suite for DataManager CRUD operations and validation
 */

class DataManagerTestSuite {
    constructor() {
        this.tests = [];
        this.passedTests = 0;
        this.failedTests = 0;
    }

    /**
     * Add a test to the suite
     * @param {string} name - Test name
     * @param {Function} testFunction - Test function
     */
    addTest(name, testFunction) {
        this.tests.push({ name, testFunction });
    }

    /**
     * Run all tests and display results
     */
    runTests() {
        const resultsContainer = document.getElementById('test-results');
        const summaryContainer = document.getElementById('test-summary');
        
        resultsContainer.innerHTML = '';
        this.passedTests = 0;
        this.failedTests = 0;

        this.tests.forEach(test => {
            try {
                test.testFunction();
                this.passedTests++;
                this.displayResult(resultsContainer, test.name, true);
            } catch (error) {
                this.failedTests++;
                this.displayResult(resultsContainer, test.name, false, error.message);
            }
        });

        this.displaySummary(summaryContainer);
    }

    /**
     * Display individual test result
     */
    displayResult(container, testName, passed, errorMessage = '') {
        const resultDiv = document.createElement('div');
        resultDiv.className = `test-result ${passed ? 'test-pass' : 'test-fail'}`;
        resultDiv.innerHTML = `
            <strong>${passed ? '✓' : '✗'} ${testName}</strong>
            ${errorMessage ? `<br><small>Error: ${errorMessage}</small>` : ''}
        `;
        container.appendChild(resultDiv);
    }

    /**
     * Display test summary
     */
    displaySummary(container) {
        const total = this.passedTests + this.failedTests;
        const passRate = ((this.passedTests / total) * 100).toFixed(1);
        
        container.innerHTML = `
            <div class="test-summary">
                Test Summary: ${this.passedTests}/${total} passed (${passRate}%)
            </div>
        `;
    }

    /**
     * Assert that a condition is true
     */
    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    /**
     * Assert that two values are equal
     */
    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }

    /**
     * Assert that a function throws an error
     */
    assertThrows(fn, expectedMessage) {
        try {
            fn();
            throw new Error('Expected function to throw an error');
        } catch (error) {
            if (expectedMessage && !error.message.includes(expectedMessage)) {
                throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`);
            }
        }
    }
}

// Create test suite instance
const testSuite = new DataManagerTestSuite();

// Test DataManager Constructor
testSuite.addTest('DataManager Constructor', () => {
    const dm = new DataManager();
    
    testSuite.assert(dm.data, 'DataManager should have data property');
    testSuite.assert(Array.isArray(dm.data.income), 'Income should be an array');
    testSuite.assert(Array.isArray(dm.data.expenses), 'Expenses should be an array');
    testSuite.assert(Array.isArray(dm.data.investments), 'Investments should be an array');
    testSuite.assert(Array.isArray(dm.data.loans), 'Loans should be an array');
    testSuite.assert(dm.data.economicFactors, 'Should have economic factors');
    testSuite.assert(dm.data.retirementGoals, 'Should have retirement goals');
    testSuite.assertEqual(dm.data.economicFactors.inflationRate, 0.03, 'Default inflation rate should be 3%');
});

// Test UUID Generation
testSuite.addTest('UUID Generation', () => {
    const dm = new DataManager();
    const uuid1 = dm.generateUUID();
    const uuid2 = dm.generateUUID();
    
    testSuite.assert(uuid1 !== uuid2, 'UUIDs should be unique');
    testSuite.assert(uuid1.length === 36, 'UUID should be 36 characters long');
    testSuite.assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid1), 'UUID should match format');
});

// Test Add Financial Item
testSuite.addTest('Add Financial Item - Valid Data', () => {
    const dm = new DataManager();
    const itemData = {
        name: 'Test Salary',
        amount: 5000,
        startDate: '2024-01',
        endDate: '2034-01',
        subcategories: [{ name: 'Base', amount: 4500 }]
    };
    
    const id = dm.addFinancialItem('income', itemData);
    
    testSuite.assert(id, 'Should return an ID');
    testSuite.assertEqual(dm.data.income.length, 1, 'Should have one income item');
    testSuite.assertEqual(dm.data.income[0].name, 'Test Salary', 'Item name should match');
    testSuite.assertEqual(dm.data.income[0].amount, 5000, 'Item amount should match');
});

// Test Add Financial Item with FinancialItem Instance
testSuite.addTest('Add Financial Item - FinancialItem Instance', () => {
    const dm = new DataManager();
    const financialItem = new FinancialItem('Test Expense', 1000, '2024-01', null, [], 'expenses');
    
    const id = dm.addFinancialItem('expenses', financialItem);
    
    testSuite.assert(id, 'Should return an ID');
    testSuite.assertEqual(dm.data.expenses.length, 1, 'Should have one expense item');
    testSuite.assertEqual(dm.data.expenses[0].name, 'Test Expense', 'Item name should match');
});

// Test Add Financial Item - Invalid Category
testSuite.addTest('Add Financial Item - Invalid Category', () => {
    const dm = new DataManager();
    const itemData = { name: 'Test', amount: 100 };
    
    testSuite.assertThrows(() => {
        dm.addFinancialItem('invalid', itemData);
    }, 'Invalid category');
});

// Test Update Financial Item
testSuite.addTest('Update Financial Item - Valid Update', () => {
    const dm = new DataManager();
    const id = dm.addFinancialItem('income', { name: 'Original', amount: 1000 });
    
    const success = dm.updateFinancialItem(id, { name: 'Updated', amount: 2000 });
    
    testSuite.assert(success, 'Update should return true');
    testSuite.assertEqual(dm.data.income[0].name, 'Updated', 'Name should be updated');
    testSuite.assertEqual(dm.data.income[0].amount, 2000, 'Amount should be updated');
});

// Test Update Financial Item - Invalid ID
testSuite.addTest('Update Financial Item - Invalid ID', () => {
    const dm = new DataManager();
    
    testSuite.assertThrows(() => {
        dm.updateFinancialItem('invalid-id', { name: 'Test' });
    }, 'not found');
});

// Test Remove Financial Item
testSuite.addTest('Remove Financial Item - Valid ID', () => {
    const dm = new DataManager();
    const id = dm.addFinancialItem('income', { name: 'To Remove', amount: 1000 });
    
    testSuite.assertEqual(dm.data.income.length, 1, 'Should have one item before removal');
    
    const success = dm.removeFinancialItem(id);
    
    testSuite.assert(success, 'Remove should return true');
    testSuite.assertEqual(dm.data.income.length, 0, 'Should have no items after removal');
});

// Test Remove Financial Item - Invalid ID
testSuite.addTest('Remove Financial Item - Invalid ID', () => {
    const dm = new DataManager();
    
    testSuite.assertThrows(() => {
        dm.removeFinancialItem('invalid-id');
    }, 'not found');
});

// Test Get Financial Data - All Categories
testSuite.addTest('Get Financial Data - All Categories', () => {
    const dm = new DataManager();
    dm.addFinancialItem('income', { name: 'Salary', amount: 5000 });
    dm.addFinancialItem('expenses', { name: 'Rent', amount: 1500 });
    
    const data = dm.getFinancialData();
    
    testSuite.assert(data.income, 'Should have income data');
    testSuite.assert(data.expenses, 'Should have expenses data');
    testSuite.assertEqual(data.income.length, 1, 'Should have one income item');
    testSuite.assertEqual(data.expenses.length, 1, 'Should have one expense item');
    
    // Test that returned data is a copy
    data.income.push({ name: 'Test' });
    testSuite.assertEqual(dm.data.income.length, 1, 'Original data should not be modified');
});

// Test Get Financial Data - Specific Category
testSuite.addTest('Get Financial Data - Specific Category', () => {
    const dm = new DataManager();
    dm.addFinancialItem('income', { name: 'Salary', amount: 5000 });
    dm.addFinancialItem('expenses', { name: 'Rent', amount: 1500 });
    
    const incomeData = dm.getFinancialData('income');
    
    testSuite.assert(Array.isArray(incomeData), 'Should return an array');
    testSuite.assertEqual(incomeData.length, 1, 'Should have one income item');
    testSuite.assertEqual(incomeData[0].name, 'Salary', 'Should return correct item');
});

// Test Get Financial Item by ID
testSuite.addTest('Get Financial Item by ID', () => {
    const dm = new DataManager();
    const id = dm.addFinancialItem('income', { name: 'Test Item', amount: 1000 });
    
    const item = dm.getFinancialItem(id);
    
    testSuite.assert(item, 'Should return an item');
    testSuite.assertEqual(item.name, 'Test Item', 'Should return correct item');
    testSuite.assertEqual(item.id, id, 'Should have correct ID');
    
    const nonExistent = dm.getFinancialItem('invalid-id');
    testSuite.assertEqual(nonExistent, null, 'Should return null for invalid ID');
});

// Test Add Subcategory
testSuite.addTest('Add Subcategory - Valid Data', () => {
    const dm = new DataManager();
    const id = dm.addFinancialItem('income', { name: 'Salary', amount: 5000 });
    
    const success = dm.addSubcategory(id, { name: 'Bonus', amount: 500 });
    
    testSuite.assert(success, 'Should return true');
    testSuite.assertEqual(dm.data.income[0].subcategories.length, 1, 'Should have one subcategory');
    testSuite.assertEqual(dm.data.income[0].subcategories[0].name, 'Bonus', 'Subcategory name should match');
    testSuite.assertEqual(dm.data.income[0].subcategories[0].amount, 500, 'Subcategory amount should match');
});

// Test Add Subcategory - Invalid Item ID
testSuite.addTest('Add Subcategory - Invalid Item ID', () => {
    const dm = new DataManager();
    
    testSuite.assertThrows(() => {
        dm.addSubcategory('invalid-id', { name: 'Test', amount: 100 });
    }, 'not found');
});

// Test Add Subcategory - Invalid Data
testSuite.addTest('Add Subcategory - Invalid Data', () => {
    const dm = new DataManager();
    const id = dm.addFinancialItem('income', { name: 'Salary', amount: 5000 });
    
    testSuite.assertThrows(() => {
        dm.addSubcategory(id, { amount: 100 }); // Missing name
    }, 'must have a name');
    
    testSuite.assertThrows(() => {
        dm.addSubcategory(id, { name: 'Test', amount: -100 }); // Negative amount
    }, 'non-negative number');
});

// Test Remove Subcategory
testSuite.addTest('Remove Subcategory - Valid Data', () => {
    const dm = new DataManager();
    const id = dm.addFinancialItem('income', { 
        name: 'Salary', 
        amount: 5000,
        subcategories: [{ name: 'Base', amount: 4500 }, { name: 'Bonus', amount: 500 }]
    });
    
    const success = dm.removeSubcategory(id, 'Bonus');
    
    testSuite.assert(success, 'Should return true');
    testSuite.assertEqual(dm.data.income[0].subcategories.length, 1, 'Should have one subcategory left');
    testSuite.assertEqual(dm.data.income[0].subcategories[0].name, 'Base', 'Should keep correct subcategory');
});

// Test Remove Subcategory - Invalid Subcategory Name
testSuite.addTest('Remove Subcategory - Invalid Name', () => {
    const dm = new DataManager();
    const id = dm.addFinancialItem('income', { name: 'Salary', amount: 5000 });
    
    testSuite.assertThrows(() => {
        dm.removeSubcategory(id, 'NonExistent');
    }, 'not found');
});

// Test Update Economic Factors
testSuite.addTest('Update Economic Factors - Valid Data', () => {
    const dm = new DataManager();
    
    dm.updateEconomicFactors({ inflationRate: 0.025, taxRate: 0.30 });
    
    testSuite.assertEqual(dm.data.economicFactors.inflationRate, 0.025, 'Inflation rate should be updated');
    testSuite.assertEqual(dm.data.economicFactors.taxRate, 0.30, 'Tax rate should be updated');
    testSuite.assertEqual(dm.data.economicFactors.interestRate, 0.05, 'Interest rate should remain unchanged');
});

// Test Update Economic Factors - Invalid Data
testSuite.addTest('Update Economic Factors - Invalid Data', () => {
    const dm = new DataManager();
    
    testSuite.assertThrows(() => {
        dm.updateEconomicFactors({ inflationRate: -0.01 });
    }, 'non-negative number');
    
    testSuite.assertThrows(() => {
        dm.updateEconomicFactors({ taxRate: 'invalid' });
    }, 'non-negative number');
});

// Test Update Retirement Goals
testSuite.addTest('Update Retirement Goals - Valid Data', () => {
    const dm = new DataManager();
    
    dm.updateRetirementGoals({ targetAge: 60, desiredMonthlyIncome: 5000 });
    
    testSuite.assertEqual(dm.data.retirementGoals.targetAge, 60, 'Target age should be updated');
    testSuite.assertEqual(dm.data.retirementGoals.desiredMonthlyIncome, 5000, 'Desired income should be updated');
    testSuite.assertEqual(dm.data.retirementGoals.retirementDuration, 25, 'Duration should remain unchanged');
});

// Test Update Retirement Goals - Invalid Data
testSuite.addTest('Update Retirement Goals - Invalid Data', () => {
    const dm = new DataManager();
    
    testSuite.assertThrows(() => {
        dm.updateRetirementGoals({ targetAge: 0 });
    }, 'positive number');
    
    testSuite.assertThrows(() => {
        dm.updateRetirementGoals({ desiredMonthlyIncome: -1000 });
    }, 'positive number');
});

// Test Validate Data - Valid Structure
testSuite.addTest('Validate Data - Valid Structure', () => {
    const dm = new DataManager();
    const validData = {
        income: [{ name: 'Salary', amount: 5000, startDate: '2024-01', endDate: null, subcategories: [] }],
        expenses: [],
        investments: [],
        loans: [],
        economicFactors: { inflationRate: 0.03, taxRate: 0.25, interestRate: 0.05 },
        retirementGoals: { targetAge: 65, desiredMonthlyIncome: 4000, retirementDuration: 25 }
    };
    
    const result = dm.validateData(validData);
    
    testSuite.assert(result.isValid, 'Valid data should pass validation');
    testSuite.assertEqual(result.errors.length, 0, 'Should have no errors');
});

// Test Validate Data - Invalid Structure
testSuite.addTest('Validate Data - Invalid Structure', () => {
    const dm = new DataManager();
    const invalidData = {
        income: 'not an array',
        expenses: [],
        investments: [],
        loans: []
    };
    
    const result = dm.validateData(invalidData);
    
    testSuite.assert(!result.isValid, 'Invalid data should fail validation');
    testSuite.assert(result.errors.length > 0, 'Should have errors');
});

// Test Load Data
testSuite.addTest('Load Data - Valid Data', () => {
    const dm = new DataManager();
    const newData = {
        income: [{ name: 'New Salary', amount: 6000, startDate: '2024-01', endDate: null, subcategories: [] }],
        expenses: [{ name: 'Rent', amount: 1500, startDate: '2024-01', endDate: null, subcategories: [] }],
        investments: [],
        loans: [],
        economicFactors: { inflationRate: 0.025 },
        retirementGoals: { targetAge: 60 }
    };
    
    const success = dm.loadData(newData);
    
    testSuite.assert(success, 'Should return true');
    testSuite.assertEqual(dm.data.income.length, 1, 'Should have loaded income data');
    testSuite.assertEqual(dm.data.expenses.length, 1, 'Should have loaded expense data');
    testSuite.assertEqual(dm.data.economicFactors.inflationRate, 0.025, 'Should update economic factors');
});

// Test Load Data - Invalid Data
testSuite.addTest('Load Data - Invalid Data', () => {
    const dm = new DataManager();
    const invalidData = { income: 'invalid' };
    
    testSuite.assertThrows(() => {
        dm.loadData(invalidData);
    }, 'Invalid data structure');
});

// Test Clear Data
testSuite.addTest('Clear Data', () => {
    const dm = new DataManager();
    dm.addFinancialItem('income', { name: 'Test', amount: 1000 });
    dm.updateEconomicFactors({ inflationRate: 0.05 });
    
    testSuite.assertEqual(dm.data.income.length, 1, 'Should have data before clearing');
    
    dm.clearData();
    
    testSuite.assertEqual(dm.data.income.length, 0, 'Should have no income data after clearing');
    testSuite.assertEqual(dm.data.economicFactors.inflationRate, 0.03, 'Should reset to default values');
});

// Test Event Listeners
testSuite.addTest('Event Listeners', () => {
    const dm = new DataManager();
    let eventReceived = false;
    let eventData = null;
    
    const listener = (event, data) => {
        eventReceived = true;
        eventData = { event, data };
    };
    
    dm.addListener(listener);
    dm.addFinancialItem('income', { name: 'Test', amount: 1000 });
    
    testSuite.assert(eventReceived, 'Should receive event notification');
    testSuite.assertEqual(eventData.event, 'itemAdded', 'Should receive correct event type');
    
    // Test remove listener
    dm.removeListener(listener);
    eventReceived = false;
    dm.addFinancialItem('expenses', { name: 'Test2', amount: 500 });
    
    testSuite.assert(!eventReceived, 'Should not receive events after listener removal');
});

// Test Data Statistics
testSuite.addTest('Data Statistics', () => {
    const dm = new DataManager();
    dm.addFinancialItem('income', { name: 'Salary', amount: 5000, subcategories: [{ name: 'Base', amount: 4500 }] });
    dm.addFinancialItem('expenses', { name: 'Rent', amount: 1500 });
    dm.addFinancialItem('expenses', { name: 'Food', amount: 800, subcategories: [{ name: 'Groceries', amount: 600 }] });
    
    const stats = dm.getDataStatistics();
    
    testSuite.assertEqual(stats.totalItems, 3, 'Should count total items correctly');
    testSuite.assertEqual(stats.itemsByCategory.income, 1, 'Should count income items correctly');
    testSuite.assertEqual(stats.itemsByCategory.expenses, 2, 'Should count expense items correctly');
    testSuite.assertEqual(stats.totalSubcategories, 2, 'Should count subcategories correctly');
});

// Run all tests when page loads
document.addEventListener('DOMContentLoaded', () => {
    testSuite.runTests();
});