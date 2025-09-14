// Simple Node.js test runner for TimeManager
const TimeManager = require('../js/timeManager.js');
const FinancialItem = require('../js/financialItem.js');

class TestRunner {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    test(name, testFunction) {
        this.tests.push({ name, testFunction });
    }

    run() {
        console.log('Running TimeManager Tests...\n');
        
        for (const test of this.tests) {
            try {
                test.testFunction();
                this.results.push({ name: test.name, passed: true });
                console.log(`✓ ${test.name}`);
            } catch (error) {
                this.results.push({ name: test.name, passed: false, error: error.message });
                console.log(`✗ ${test.name}`);
                console.log(`  Error: ${error.message}`);
            }
        }

        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        const passRate = ((passed / total) * 100).toFixed(1);
        
        console.log(`\nTest Results: ${passed}/${total} passed (${passRate}%)`);
        
        if (passed === total) {
            console.log('All tests passed! ✓');
        } else {
            console.log('Some tests failed! ✗');
            process.exit(1);
        }
    }

    assertEqual(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(`${message} Expected: ${expected}, Actual: ${actual}`);
        }
    }

    assertTrue(condition, message = '') {
        if (!condition) {
            throw new Error(`${message} Expected true, got false`);
        }
    }

    assertFalse(condition, message = '') {
        if (condition) {
            throw new Error(`${message} Expected false, got true`);
        }
    }

    assertThrows(fn, expectedError = null, message = '') {
        try {
            fn();
            throw new Error(`${message} Expected function to throw an error`);
        } catch (error) {
            if (expectedError && !error.message.includes(expectedError)) {
                throw new Error(`${message} Expected error containing "${expectedError}", got "${error.message}"`);
            }
        }
    }

    assertArrayEqual(actual, expected, message = '') {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`${message} Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`);
        }
    }
}

// Initialize test runner and TimeManager
const runner = new TestRunner();
const timeManager = new TimeManager();

// Test parseTimeRange method
runner.test('parseTimeRange - valid format', () => {
    const result = timeManager.parseTimeRange('2024-03');
    runner.assertEqual(result.year, 2024);
    runner.assertEqual(result.month, 3);
    runner.assertEqual(result.dateString, '2024-03');
});

runner.test('parseTimeRange - invalid format', () => {
    runner.assertThrows(() => timeManager.parseTimeRange('2024/03'), 'YYYY-MM format');
    runner.assertThrows(() => timeManager.parseTimeRange('24-03'), 'YYYY-MM format');
    runner.assertThrows(() => timeManager.parseTimeRange('2024-3'), 'YYYY-MM format');
});

runner.test('parseTimeRange - invalid year', () => {
    runner.assertThrows(() => timeManager.parseTimeRange('1899-03'), 'Year must be between');
    runner.assertThrows(() => timeManager.parseTimeRange('2101-03'), 'Year must be between');
});

runner.test('parseTimeRange - invalid month', () => {
    runner.assertThrows(() => timeManager.parseTimeRange('2024-00'), 'Month must be between');
    runner.assertThrows(() => timeManager.parseTimeRange('2024-13'), 'Month must be between');
});

runner.test('parseTimeRange - null/empty input', () => {
    runner.assertThrows(() => timeManager.parseTimeRange(null), 'non-empty string');
    runner.assertThrows(() => timeManager.parseTimeRange(''), 'non-empty string');
    runner.assertThrows(() => timeManager.parseTimeRange(123), 'non-empty string');
});

// Test calculateMonthsBetween method
runner.test('calculateMonthsBetween - same month', () => {
    const result = timeManager.calculateMonthsBetween('2024-03', '2024-03');
    runner.assertEqual(result, 1);
});

runner.test('calculateMonthsBetween - same year', () => {
    const result = timeManager.calculateMonthsBetween('2024-03', '2024-06');
    runner.assertEqual(result, 4);
});

runner.test('calculateMonthsBetween - different years', () => {
    const result = timeManager.calculateMonthsBetween('2024-11', '2025-02');
    runner.assertEqual(result, 4);
});

runner.test('calculateMonthsBetween - multiple years', () => {
    const result = timeManager.calculateMonthsBetween('2024-01', '2026-01');
    runner.assertEqual(result, 25);
});

runner.test('calculateMonthsBetween - end before start', () => {
    runner.assertThrows(() => timeManager.calculateMonthsBetween('2024-06', '2024-03'), 'End date must be after');
});

// Test addMonths method
runner.test('addMonths - positive months', () => {
    const result = timeManager.addMonths('2024-03', 2);
    runner.assertEqual(result, '2024-05');
});

runner.test('addMonths - cross year boundary', () => {
    const result = timeManager.addMonths('2024-11', 3);
    runner.assertEqual(result, '2025-02');
});

runner.test('addMonths - zero months', () => {
    const result = timeManager.addMonths('2024-03', 0);
    runner.assertEqual(result, '2024-03');
});

runner.test('addMonths - negative months', () => {
    const result = timeManager.addMonths('2024-03', -2);
    runner.assertEqual(result, '2024-01');
});

// Test generateMonthRange method
runner.test('generateMonthRange - single month', () => {
    const result = timeManager.generateMonthRange('2024-03', '2024-03');
    runner.assertArrayEqual(result, ['2024-03']);
});

runner.test('generateMonthRange - multiple months', () => {
    const result = timeManager.generateMonthRange('2024-03', '2024-06');
    runner.assertArrayEqual(result, ['2024-03', '2024-04', '2024-05', '2024-06']);
});

runner.test('generateMonthRange - cross year', () => {
    const result = timeManager.generateMonthRange('2024-11', '2025-02');
    runner.assertArrayEqual(result, ['2024-11', '2024-12', '2025-01', '2025-02']);
});

// Test getActiveItemsForMonth method
runner.test('getActiveItemsForMonth - valid items', () => {
    const items = [
        new FinancialItem('Item1', 100, '2024-01', '2024-06'),
        new FinancialItem('Item2', 200, '2024-03', null),
        new FinancialItem('Item3', 300, '2024-05', '2024-08')
    ];
    
    const activeItems = timeManager.getActiveItemsForMonth(items, '2024-04');
    runner.assertEqual(activeItems.length, 2);
    runner.assertEqual(activeItems[0].name, 'Item1');
    runner.assertEqual(activeItems[1].name, 'Item2');
});

runner.test('getActiveItemsForMonth - no active items', () => {
    const items = [
        new FinancialItem('Item1', 100, '2024-01', '2024-02'),
        new FinancialItem('Item2', 200, '2024-06', '2024-08')
    ];
    
    const activeItems = timeManager.getActiveItemsForMonth(items, '2024-04');
    runner.assertEqual(activeItems.length, 0);
});

runner.test('getActiveItemsForMonth - invalid input', () => {
    runner.assertThrows(() => timeManager.getActiveItemsForMonth('not-array', '2024-04'), 'must be an array');
    runner.assertThrows(() => timeManager.getActiveItemsForMonth([], 'invalid-date'), 'YYYY-MM format');
});

// Test formatDateForDisplay method
runner.test('formatDateForDisplay - various months', () => {
    runner.assertEqual(timeManager.formatDateForDisplay('2024-01'), 'January 2024');
    runner.assertEqual(timeManager.formatDateForDisplay('2024-06'), 'June 2024');
    runner.assertEqual(timeManager.formatDateForDisplay('2024-12'), 'December 2024');
});

// Test isInPast and isInFuture methods (these depend on current date)
runner.test('isInPast and isInFuture - relative to current', () => {
    const currentMonth = timeManager.getCurrentMonth();
    const pastMonth = timeManager.addMonths(currentMonth, -1);
    const futureMonth = timeManager.addMonths(currentMonth, 1);
    
    runner.assertTrue(timeManager.isInPast(pastMonth));
    runner.assertFalse(timeManager.isInPast(futureMonth));
    runner.assertTrue(timeManager.isInFuture(futureMonth));
    runner.assertFalse(timeManager.isInFuture(pastMonth));
});

// Test integration with FinancialItem.isActiveInMonth
runner.test('FinancialItem.isActiveInMonth integration', () => {
    const item = new FinancialItem('Test Item', 100, '2024-03', '2024-06');
    
    runner.assertTrue(item.isActiveInMonth('2024-03'));
    runner.assertTrue(item.isActiveInMonth('2024-04'));
    runner.assertTrue(item.isActiveInMonth('2024-06'));
    runner.assertFalse(item.isActiveInMonth('2024-02'));
    runner.assertFalse(item.isActiveInMonth('2024-07'));
});

runner.test('FinancialItem.isActiveInMonth - no end date', () => {
    const item = new FinancialItem('Test Item', 100, '2024-03', null);
    
    runner.assertTrue(item.isActiveInMonth('2024-03'));
    runner.assertTrue(item.isActiveInMonth('2024-12'));
    runner.assertTrue(item.isActiveInMonth('2030-01'));
    runner.assertFalse(item.isActiveInMonth('2024-02'));
});

runner.test('FinancialItem.isActiveInMonth - no start date', () => {
    const item = new FinancialItem('Test Item', 100, null, '2024-06');
    
    runner.assertTrue(item.isActiveInMonth('2020-01'));
    runner.assertTrue(item.isActiveInMonth('2024-06'));
    runner.assertFalse(item.isActiveInMonth('2024-07'));
});

// Run all tests
runner.run();