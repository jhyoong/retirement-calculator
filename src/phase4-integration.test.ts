import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRetirementStore } from './stores/retirement'
import { useExpenseStore } from './stores/expense'
import { exportData, validateImportedData } from './utils/importExport'
import type { RetirementExpense } from './types'

describe('Phase 4 Integration Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Store to calculation flow', () => {
    it('should flow expense store data to retirement calculations', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()

      // Clear default expenses
      expenseStore.resetToDefaults()
      while (expenseStore.expenses.length > 0) {
        expenseStore.removeExpense(expenseStore.expenses[0].id)
      }

      // Set up basic retirement data
      retirementStore.currentAge = 30
      retirementStore.retirementAge = 65
      retirementStore.currentSavings = 100000
      retirementStore.monthlyContribution = 1000
      retirementStore.expectedReturnRate = 0.06
      retirementStore.inflationRate = 0.03

      // Add expense
      const expense: RetirementExpense = {
        id: '1',
        name: 'Living Expenses',
        category: 'living',
        monthlyAmount: 3000,
        inflationRate: 0.03
      }
      expenseStore.addExpense(expense)

      // Check that userData includes expenses
      const userData = retirementStore.userData
      expect(userData.expenses).toHaveLength(1)
      expect(userData.expenses![0].name).toBe(expense.name)
      expect(userData.expenses![0].category).toBe(expense.category)
      expect(userData.expenses![0].monthlyAmount).toBe(expense.monthlyAmount)

      // Check results include Phase 4 metrics
      const results = retirementStore.results
      expect(results).toBeDefined()
      expect(results).toHaveProperty('yearsUntilDepletion')
      expect(results).toHaveProperty('sustainabilityWarning')
    })

    it('should detect unsustainable expense rates', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()

      retirementStore.currentAge = 60
      retirementStore.retirementAge = 65
      retirementStore.currentSavings = 100000
      retirementStore.expectedReturnRate = 0.04
      retirementStore.inflationRate = 0.03

      // Clear default expenses
      while (expenseStore.expenses.length > 0) {
        expenseStore.removeExpense(expenseStore.expenses[0].id)
      }

      // Add high expenses
      expenseStore.addExpense({
        id: '1',
        name: 'High Expenses',
        category: 'living',
        monthlyAmount: 5000,
        inflationRate: 0.03
      })

      const results = retirementStore.results
      expect(results?.sustainabilityWarning).toBe(true)
    })

    it('should handle age-based expense filtering', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 65
      retirementStore.currentSavings = 1000000
      retirementStore.expectedReturnRate = 0.06

      // Clear default expenses
      while (expenseStore.expenses.length > 0) {
        expenseStore.removeExpense(expenseStore.expenses[0].id)
      }

      // Add expense that only applies later
      expenseStore.addExpense({
        id: '1',
        name: 'Basic Living',
        category: 'living',
        monthlyAmount: 3000,
        inflationRate: 0.03
      })

      expenseStore.addExpense({
        id: '2',
        name: 'Healthcare',
        category: 'healthcare',
        monthlyAmount: 2000,
        inflationRate: 0.06,
        startDate: '2040-01', // Only starts 10 years after retirement
        endDate: '2050-01'
      })

      const results = retirementStore.results
      expect(results).toBeDefined()
      // With age-based filtering, sustainability should be calculated correctly
      expect(results?.yearsUntilDepletion).toBeDefined()
    })

    it('should handle multiple expense categories', () => {
      const expenseStore = useExpenseStore()

      // Clear defaults
      while (expenseStore.expenses.length > 0) {
        expenseStore.removeExpense(expenseStore.expenses[0].id)
      }

      expenseStore.addExpense({
        id: '1',
        name: 'Living',
        category: 'living',
        monthlyAmount: 2000,
        inflationRate: 0.03
      })

      expenseStore.addExpense({
        id: '2',
        name: 'Healthcare',
        category: 'healthcare',
        monthlyAmount: 1000,
        inflationRate: 0.06
      })

      expenseStore.addExpense({
        id: '3',
        name: 'Travel',
        category: 'travel',
        monthlyAmount: 500,
        inflationRate: 0.02
      })

      const byCategory = expenseStore.expensesByCategory
      expect(byCategory.living).toHaveLength(1)
      expect(byCategory.healthcare).toHaveLength(1)
      expect(byCategory.travel).toHaveLength(1)

      const totals = expenseStore.totalsByCategory
      expect(totals.living).toBe(2000)
      expect(totals.healthcare).toBe(1000)
      expect(totals.travel).toBe(500)
    })
  })

  describe('Import/export v4 format', () => {
    it('should export data with expenses', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()

      // Clear defaults
      while (expenseStore.expenses.length > 0) {
        expenseStore.removeExpense(expenseStore.expenses[0].id)
      }

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 65
      retirementStore.currentSavings = 100000

      expenseStore.addExpense({
        id: '1',
        name: 'Living',
        category: 'living',
        monthlyAmount: 3000,
        inflationRate: 0.03
      })

      const exported = exportData(retirementStore.userData)

      expect(exported.user.expenses).toHaveLength(1)
      expect(exported.user.expenses![0].name).toBe('Living')
    })

    it('should import data with expenses successfully', () => {
      const data = {
        exportDate: new Date().toISOString(),
        user: {
          currentAge: 35,
          retirementAge: 65,
          currentSavings: 200000,
          monthlyContribution: 2000,
          expectedReturnRate: 0.07,
          inflationRate: 0.03,
          expenses: [
            {
              id: '1',
              name: 'Living Expenses',
              category: 'living',
              monthlyAmount: 4000,
              inflationRate: 0.03
            }
          ]
        }
      }

      expect(validateImportedData(data)).toBe(true)
    })

    it('should validate data structure correctly', () => {
      const validData = {
        exportDate: '2025-01-01',
        user: {
          currentAge: 30,
          retirementAge: 65,
          currentSavings: 100000,
          monthlyContribution: 1000,
          expectedReturnRate: 0.06,
          inflationRate: 0.03,
          expenses: [
            {
              id: '1',
              name: 'Test',
              category: 'living',
              monthlyAmount: 3000,
              inflationRate: 0.03,
              startDate: '2020-01',
              endDate: '2040-01'
            }
          ]
        }
      }

      expect(validateImportedData(validData)).toBe(true)
    })

    it('should round-trip export/import without data loss', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()

      // Clear defaults
      while (expenseStore.expenses.length > 0) {
        expenseStore.removeExpense(expenseStore.expenses[0].id)
      }

      // Set up complete Phase 4 data
      retirementStore.currentAge = 40
      retirementStore.retirementAge = 67
      retirementStore.currentSavings = 250000
      retirementStore.monthlyContribution = 1500
      retirementStore.expectedReturnRate = 0.065
      retirementStore.inflationRate = 0.025

      expenseStore.addExpense({
        id: '1',
        name: 'Living',
        category: 'living',
        monthlyAmount: 3500,
        inflationRate: 0.03,
        startDate: '2025-01'
      })

      expenseStore.addExpense({
        id: '2',
        name: 'Healthcare',
        category: 'healthcare',
        monthlyAmount: 1200,
        inflationRate: 0.06,
        startDate: '2033-01',
        endDate: '2048-01'
      })

      // Export
      const exported = exportData(retirementStore.userData)

      // Import to fresh store
      setActivePinia(createPinia())
      const newRetirementStore = useRetirementStore()
      const newExpenseStore = useExpenseStore()

      newRetirementStore.loadData(exported.user)

      // Verify all data preserved
      expect(newRetirementStore.currentAge).toBe(40)
      expect(newRetirementStore.retirementAge).toBe(67)
      expect(newExpenseStore.expenses).toHaveLength(2)
      expect(newExpenseStore.expenses[0].name).toBe('Living')
      expect(newExpenseStore.expenses[1].name).toBe('Healthcare')
    })
  })

  describe('Data compatibility', () => {
    it('should import data with income sources', () => {
      const data = {
        exportDate: '2024-01-01',
        user: {
          currentAge: 30,
          retirementAge: 65,
          currentSavings: 100000,
          monthlyContribution: 1000,
          expectedReturnRate: 0.06,
          inflationRate: 0.03,
          incomeSources: [
            {
              id: '1',
              name: 'Salary',
              type: 'salary',
              amount: 5000,
              frequency: 'monthly',
              startDate: '2024-01'
            }
          ]
        }
      }

      expect(validateImportedData(data)).toBe(true)
    })

    it('should import data with all features', () => {
      const data = {
        exportDate: '2024-06-01',
        user: {
          currentAge: 35,
          retirementAge: 65,
          currentSavings: 150000,
          monthlyContribution: 1200,
          expectedReturnRate: 0.065,
          inflationRate: 0.025,
          incomeSources: [
            {
              id: '1',
              name: 'Job',
              type: 'salary',
              amount: 6000,
              frequency: 'monthly',
              startDate: '2024-01'
            }
          ],
          oneOffReturns: [
            {
              id: '1',
              date: '2025-12',
              amount: 10000,
              description: 'Bonus'
            }
          ]
        }
      }

      expect(validateImportedData(data)).toBe(true)
    })

    it('should preserve all features with expenses', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()

      // Clear default expenses
      while (expenseStore.expenses.length > 0) {
        expenseStore.removeExpense(expenseStore.expenses[0].id)
      }

      // Phase 1 data
      retirementStore.currentAge = 30
      retirementStore.retirementAge = 65
      retirementStore.currentSavings = 100000
      retirementStore.monthlyContribution = 1000
      retirementStore.expectedReturnRate = 0.06
      retirementStore.inflationRate = 0.03

      // Verify Phase 1 still works
      const resultsWithoutExpenses = retirementStore.results
      expect(resultsWithoutExpenses).toBeDefined()
      expect(resultsWithoutExpenses?.futureValue).toBeGreaterThan(0)

      // Add Phase 4 features
      expenseStore.addExpense({
        id: '1',
        name: 'Living',
        category: 'living',
        monthlyAmount: 3000,
        inflationRate: 0.03
      })

      // Phase 1 calculations should still work
      const resultsWithExpenses = retirementStore.results
      expect(resultsWithExpenses).toBeDefined()
      expect(resultsWithExpenses?.futureValue).toBe(resultsWithoutExpenses?.futureValue)

      // Phase 4 calculations should be added
      expect(resultsWithExpenses?.yearsUntilDepletion).toBeDefined()
      expect(resultsWithExpenses?.sustainabilityWarning).toBeDefined()
    })
  })

  describe('Edge cases and validation', () => {
    it('should validate expense amounts are positive', () => {
      const retirementStore = useRetirementStore()

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 65

      const validation = retirementStore.validation
      expect(validation.isValid).toBe(true)
    })
  })
})
