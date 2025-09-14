#!/usr/bin/env node

/**
 * Node.js Test Runner for DataManager
 * Runs all DataManager tests and displays results in terminal
 */

// Mock DOM environment for Node.js
global.document = {
    getElementById: () => ({ innerHTML: '' }),
    createElement: () => ({ className: '', innerHTML: '' }),
    addEventListener: () => {}
};

// Load the classes
const FinancialItem = require('../js/financialItem.js');
const DataManager = require('../js/dataManager.js');

class TestRunner {
    constructor() {
        this.tests = [];
        this.passedTests = 0;
        this.failedTests = 0;
    }

    addTest(name, testFunction) {
        this.tests.push({ name, testFunction });
    }

    runTests() {
        console.log('🧪 Running DataManager Tests...\n');
        
        this.tests.forEach((test, index) => {
            try {
                test.testFunction();
                this.passedTests++;
                console.log(`✅ ${index + 1}. ${test.name}`);
            } catch (error) {
                this.failedTests++;
                console.log(`❌ ${index + 1}. ${test.name}`);
                console.log(`   Error: ${error.message}\n`);
            }
        });

        this.displaySummary();
    }

    displaySummary() {
        const total = this.passedTests + this.failedTests;
        const passRate = ((this.passedTests / total) * 100).toFixed(1);
        
        console.log('\n' + '='.repeat(50));
        console.log(`📊 Test Summary: ${this.passedTests}/${total} passed (${passRate}%)`);
        
        if (this.failedTests === 0) {
            console.log('🎉 All tests passed!');
        } else {
            console.log(`⚠️  ${this.failedTests} test(s) failed`);
        }
        console.log('='.repeat(50));
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }

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

// Create test runner
const runner = new TestRunner();

// Test DataManager Constructor
runner.addTest('DataManager Constructor', () => {
    const dm = new DataManager();
    
    runner.assert(dm.data, 'DataManager should have data property');
    runner.assert(Array.isArray(dm.data.income), 'Income should be an array');
    runner.assert(Array.isArray(dm.data.expenses), 'Expenses should be an array');
    runner.assert(Array.isArray(dm.data.investments), 'Investments should be an array');
    runner.assert(Array.isArray(dm.data.loans), 'Loans should be an array');
    runner.assert(dm.data.economicFactors, 'Should have economic factors');
    runner.assert(dm.data.retirementGoals, 'Should have retirement goals');
    runner.assertEqual(dm.data.economicFactors.inflationRate, 0.03, 'Default inflation rate should be 3%');
});

// Test UUID Generation
runner.addTest('UUID Generation', () => {
    const dm = new DataManager();
    const uuid1 = dm.generateUUID();
    const uuid2 = dm.generateUUID();
    
    runner.assert(uuid1 !== uuid2, 'UUIDs should be unique');
    runner.assert(uuid1.length === 36, 'UUID should be 36 characters long');
    runner.assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid1), 'UUID should match format');
});

// Test Add Financial Item
runner.addTest('Add Financial Item - Valid Data', () => {
    const dm = new DataManager();
    const itemData = {
        name: 'Test Salary',
        amount: 5000,
        startDate: '2024-01',
        endDate: '2034-01',
        subcategories: [{ name: 'Base', amount: 4500 }]
    };
    
    const id = dm.addFinancialItem('income', itemData);
    
    runner.assert(id, 'Should return an ID');
    runner.assertEqual(dm.data.income.length, 1, 'Should have one income item');
    runner.assertEqual(dm.data.income[0].name, 'Test Salary', 'Item name should match');
    runner.assertEqual(dm.data.income[0].amount, 5000, 'Item amount should match');
});

// Test Add Financial Item with FinancialItem Instance
runner.addTest('Add Financial Item - FinancialItem Instance', () => {
    const dm = new DataManager();
    const financialItem = new FinancialItem('Test Expense', 1000, '2024-01', null, [], 'expenses');
    
    const id = dm.addFinancialItem('expenses', financialItem);
    
    runner.assert(id, 'Should return an ID');
    runner.assertEqual(dm.data.expenses.length, 1, 'Should have one expense item');
    runner.assertEqual(dm.data.expenses[0].name, 'Test Expense', 'Item name should match');
});

// Test Add Financial Item - Invalid Category
runner.addTest('Add Financial Item - Invalid Category', () => {
    const dm = new DataManager();
    const itemData = { name: 'Test', amount: 100 };
    
    runner.assertThrows(() => {
        dm.addFinancialItem('invalid', itemData);
    }, 'Invalid category');
});

// Test Update Financial Item
runner.addTest('Update Financial Item - Valid Update', () => {
    const dm = new DataManager();
    const id = dm.addFinancialItem('income', { name: 'Original', amount: 1000 });
    
    const success = dm.updateFinancialItem(id, { name: 'Updated', amount: 2000 });
    
    runner.assert(success, 'Update should return true');
    runner.assertEqual(dm.data.income[0].name, 'Updated', 'Name should be updated');
    runner.assertEqual(dm.data.income[0].amount, 2000, 'Amount should be updated');
});

// Test Update Financial Item - Invalid ID
runner.addTest('Update Financial Item - Invalid ID', () => {
    const dm = new DataManager();
    
    runner.assertThrows(() => {
        dm.updateFinancialItem('invalid-id', { name: 'Test' });
    }, 'not found');
});

// Test Remove Financial Item
runner.addTest('Remove Financial Item - Valid ID', () => {
    const dm = new DataManager();
    const id = dm.addFinancialItem('income', { name: 'To Remove', amount: 1000 });
    
    runner.assertEqual(dm.data.income.length, 1, 'Should have one item before removal');
    
    const success = dm.removeFinancialItem(id);
    
    runner.assert(success, 'Remove should return true');
    runner.assertEqual(dm.data.income.length, 0, 'Should have no items after removal');
});

// Test Remove Financial Item - Invalid ID
runner.addTest('Remove Financial Item - Invalid ID', () => {
    const dm = new DataManager();
    
    runner.assertThrows(() => {
        dm.removeFinancialItem('invalid-id');
    }, 'not found');
});

// Test Get Financial Data - All Categories
runner.addTest('Get Financial Data - All Categories', () => {
    const dm = new DataManager();
    dm.addFinancialItem('income', { name: 'Salary', amount: 5000 });
    dm.addFinancialItem('expenses', { name: 'Rent', amount: 1500 });
    
    const data = dm.getFinancialData();
    
    runner.assert(data.income, 'Should have income data');
    runner.assert(data.expenses, 'Should have expenses data');
    runner.assertEqual(data.income.length, 1, 'Should have one income item');
    runner.assertEqual(data.expenses.length, 1, 'Should have one expense item');
    
    // Test that returned data is a copy
    data.income.push({ name: 'Test' });
    runner.assertEqual(dm.data.income.length, 1, 'Original data should not be modified');
});

// Test Get Financial Data - Specific Category
runner.addTest('Get Financial Data - Specific Category', () => {
    const dm = new DataManager();
    dm.addFinancialItem('income', { name: 'Salary', amount: 5000 });
    dm.addFinancialItem('expenses', { name: 'Rent', amount: 1500 });
    
    const incomeData = dm.getFinancialData('income');
    
    runner.assert(Array.isArray(incomeData), 'Should return an array');
    runner.assertEqual(incomeData.length, 1, 'Should have one income item');
    runner.assertEqual(incomeData[0].name, 'Salary', 'Should return correct item');
});

// Test Add Subcategory
runner.addTest('Add Subcategory - Valid Data', () => {
    const dm = new DataManager();
    const id = dm.addFinancialItem('income', { name: 'Salary', amount: 5000 });
    
    const success = dm.addSubcategory(id, { name: 'Bonus', amount: 500 });
    
    runner.assert(success, 'Should return true');
    runner.assertEqual(dm.data.income[0].subcategories.length, 1, 'Should have one subcategory');
    runner.assertEqual(dm.data.income[0].subcategories[0].name, 'Bonus', 'Subcategory name should match');
    runner.assertEqual(dm.data.income[0].subcategories[0].amount, 500, 'Subcategory amount should match');
});

// Test Remove Subcategory
runner.addTest('Remove Subcategory - Valid Data', () => {
    const dm = new DataManager();
    const id = dm.addFinancialItem('income', { 
        name: 'Salary', 
        amount: 5000,
        subcategories: [{ name: 'Base', amount: 4500 }, { name: 'Bonus', amount: 500 }]
    });
    
    const success = dm.removeSubcategory(id, 'Bonus');
    
    runner.assert(success, 'Should return true');
    runner.assertEqual(dm.data.income[0].subcategories.length, 1, 'Should have one subcategory left');
    runner.assertEqual(dm.data.income[0].subcategories[0].name, 'Base', 'Should keep correct subcategory');
});

// Test Update Economic Factors
runner.addTest('Update Economic Factors - Valid Data', () => {
    const dm = new DataManager();
    
    dm.updateEconomicFactors({ inflationRate: 0.025, taxRate: 0.30 });
    
    runner.assertEqual(dm.data.economicFactors.inflationRate, 0.025, 'Inflation rate should be updated');
    runner.assertEqual(dm.data.economicFactors.taxRate, 0.30, 'Tax rate should be updated');
    runner.assertEqual(dm.data.economicFactors.interestRate, 0.05, 'Interest rate should remain unchanged');
});

// Test Update Retirement Goals
runner.addTest('Update Retirement Goals - Valid Data', () => {
    const dm = new DataManager();
    
    dm.updateRetirementGoals({ targetAge: 60, desiredMonthlyIncome: 5000 });
    
    runner.assertEqual(dm.data.retirementGoals.targetAge, 60, 'Target age should be updated');
    runner.assertEqual(dm.data.retirementGoals.desiredMonthlyIncome, 5000, 'Desired income should be updated');
    runner.assertEqual(dm.data.retirementGoals.retirementDuration, 25, 'Duration should remain unchanged');
});

// Test Validate Data - Valid Structure
runner.addTest('Validate Data - Valid Structure', () => {
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
    
    runner.assert(result.isValid, 'Valid data should pass validation');
    runner.assertEqual(result.errors.length, 0, 'Should have no errors');
});

// Test Load Data
runner.addTest('Load Data - Valid Data', () => {
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
    
    runner.assert(success, 'Should return true');
    runner.assertEqual(dm.data.income.length, 1, 'Should have loaded income data');
    runner.assertEqual(dm.data.expenses.length, 1, 'Should have loaded expense data');
    runner.assertEqual(dm.data.economicFactors.inflationRate, 0.025, 'Should update economic factors');
});

// Test Clear Data
runner.addTest('Clear Data', () => {
    const dm = new DataManager();
    dm.addFinancialItem('income', { name: 'Test', amount: 1000 });
    dm.updateEconomicFactors({ inflationRate: 0.05 });
    
    runner.assertEqual(dm.data.income.length, 1, 'Should have data before clearing');
    
    dm.clearData();
    
    runner.assertEqual(dm.data.income.length, 0, 'Should have no income data after clearing');
    runner.assertEqual(dm.data.economicFactors.inflationRate, 0.03, 'Should reset to default values');
});

// Test Event Listeners
runner.addTest('Event Listeners', () => {
    const dm = new DataManager();
    let eventReceived = false;
    let eventData = null;
    
    const listener = (event, data) => {
        eventReceived = true;
        eventData = { event, data };
    };
    
    dm.addListener(listener);
    dm.addFinancialItem('income', { name: 'Test', amount: 1000 });
    
    runner.assert(eventReceived, 'Should receive event notification');
    runner.assertEqual(eventData.event, 'itemAdded', 'Should receive correct event type');
    
    // Test remove listener
    dm.removeListener(listener);
    eventReceived = false;
    dm.addFinancialItem('expenses', { name: 'Test2', amount: 500 });
    
    runner.assert(!eventReceived, 'Should not receive events after listener removal');
});

// Test Data Statistics
runner.addTest('Data Statistics', () => {
    const dm = new DataManager();
    dm.addFinancialItem('income', { name: 'Salary', amount: 5000, subcategories: [{ name: 'Base', amount: 4500 }] });
    dm.addFinancialItem('expenses', { name: 'Rent', amount: 1500 });
    dm.addFinancialItem('expenses', { name: 'Food', amount: 800, subcategories: [{ name: 'Groceries', amount: 600 }] });
    
    const stats = dm.getDataStatistics();
    
    runner.assertEqual(stats.totalItems, 3, 'Should count total items correctly');
    runner.assertEqual(stats.itemsByCategory.income, 1, 'Should count income items correctly');
    runner.assertEqual(stats.itemsByCategory.expenses, 2, 'Should count expense items correctly');
    runner.assertEqual(stats.totalSubcategories, 2, 'Should count subcategories correctly');
});

// Run all tests
runner.runTests();