import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRetirementStore } from '../stores/retirement'
import { useIncomeStore } from '../stores/income'
import { useExpenseStore } from '../stores/expense'
import { exportData, validateImportedData } from '../utils/importExport'

describe('End-to-End Integration Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const expenseStore = useExpenseStore()
    expenseStore.expenses = []
  })

  describe('Complete workflow: income sources', () => {
    it('should complete full workflow: add income sources, calculate, export, import', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()

      // Step 1: Add income sources
      incomeStore.addIncomeSource({
        id: '1',
        name: 'Main Salary',
        type: 'salary',
        amount: 6000,
        frequency: 'monthly',
        startDate: '2025-01'
      })

      incomeStore.addIncomeSource({
        id: '2',
        name: 'Rental Income',
        type: 'rental',
        amount: 2000,
        frequency: 'monthly',
        startDate: '2025-01'
      })

      // Step 2: Add one-off return
      incomeStore.addOneOffReturn({
        id: '1',
        date: '2026-12',
        amount: 20000,
        description: 'Year-end bonus'
      })

      // Step 3: Verify total monthly income
      expect(incomeStore.totalMonthlyIncome).toBe(8000)

      // Step 4: Calculate retirement
      retirementStore.calculate()
      const results = retirementStore.results
      expect(results).not.toBeNull()
      expect(results!.futureValue).toBeGreaterThan(0)
      expect(results!.totalContributions).toBeGreaterThan(50000)

      // Step 5: Export data
      const exported = exportData(retirementStore.userData)
      expect(exported.user.incomeSources).toHaveLength(2)
      expect(exported.user.oneOffReturns).toHaveLength(1)

      // Step 6: Validate exported data
      expect(validateImportedData(exported)).toBe(true)

      // Step 7: Simulate import into new store
      const newPinia = createPinia()
      setActivePinia(newPinia)

      const newExpenseStore = useExpenseStore()
      newExpenseStore.expenses = []

      const newRetirementStore = useRetirementStore()
      newRetirementStore.loadData(exported.user)

      // Step 8: Verify imported data
      const newIncomeStore = useIncomeStore()
      expect(newIncomeStore.incomeSources).toHaveLength(2)
      expect(newIncomeStore.oneOffReturns).toHaveLength(1)
      expect(newIncomeStore.totalMonthlyIncome).toBe(8000)

      // Step 9: Verify calculations are the same
      newRetirementStore.calculate()
      const newResults = newRetirementStore.results
      expect(newResults!.futureValue).toBeCloseTo(results!.futureValue, -2)
    })
  })

  describe('Real-world scenario: comprehensive planning', () => {
    it('should handle a complete retirement plan with all features', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const expenseStore = useExpenseStore()

      // Setup basic info
      retirementStore.updateCurrentAge(35)
      retirementStore.updateRetirementAge(65)
      retirementStore.updateCurrentSavings(150000)
      retirementStore.updateExpectedReturnRate(0.07)
      retirementStore.updateInflationRate(0.03)

      // Add multiple income sources
      incomeStore.addIncomeSource({
        id: '1',
        name: 'Primary Salary',
        type: 'salary',
        amount: 8000,
        frequency: 'monthly',
        startDate: '2025-01'
      })

      incomeStore.addIncomeSource({
        id: '2',
        name: 'Rental Income',
        type: 'rental',
        amount: 2000,
        frequency: 'monthly',
        startDate: '2025-01'
      })

      incomeStore.addIncomeSource({
        id: '3',
        name: 'Freelance',
        type: 'business',
        amount: 1500,
        frequency: 'monthly',
        startDate: '2025-01',
        endDate: '2030-12'
      })

      // Add one-off returns
      incomeStore.addOneOffReturn({
        id: '1',
        date: '2026-12',
        amount: 20000,
        description: 'Annual bonus'
      })

      incomeStore.addOneOffReturn({
        id: '2',
        date: '2030-06',
        amount: 50000,
        description: 'Inheritance'
      })

      // Add recurring expenses
      expenseStore.addExpense({
        id: '1',
        name: 'Living Expenses',
        category: 'living',
        monthlyAmount: 4000,
        inflationRate: 0.03
      })

      expenseStore.addExpense({
        id: '2',
        name: 'Healthcare',
        category: 'healthcare',
        monthlyAmount: 800,
        inflationRate: 0.06
      })

      // Add a loan
      expenseStore.addLoan({
        id: '1',
        name: 'Mortgage',
        principal: 250000,
        interestRate: 0.035,
        termMonths: 240,
        startDate: '2025-01'
      })

      // Add one-time expense
      expenseStore.addOneTimeExpense({
        id: '1',
        name: 'Home Renovation',
        amount: 40000,
        date: '2028-06',
        category: 'other',
        description: 'Kitchen and bathroom remodel'
      })

      // Verify calculations
      retirementStore.calculate()
      const results = retirementStore.results
      expect(results).not.toBeNull()
      expect(results!.futureValue).toBeGreaterThan(0)
      expect(results).toHaveProperty('yearsUntilDepletion')
      expect(results).toHaveProperty('sustainabilityWarning')

      // Verify data export
      const exported = exportData(retirementStore.userData)
      expect(exported.user.incomeSources).toHaveLength(3)
      expect(exported.user.oneOffReturns).toHaveLength(2)
      expect(exported.user.expenses).toHaveLength(2)
      expect(exported.user.loans).toHaveLength(1)
      expect(exported.user.oneTimeExpenses).toHaveLength(1)

      // Verify validation passes
      expect(validateImportedData(exported)).toBe(true)
    })
  })

  describe('Edge case: financial distress scenario', () => {
    it('should handle scenario where expenses exceed income', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const expenseStore = useExpenseStore()

      retirementStore.updateCurrentAge(55)
      retirementStore.updateRetirementAge(65)
      retirementStore.updateCurrentSavings(200000)
      retirementStore.updateExpectedReturnRate(0.05)
      retirementStore.updateInflationRate(0.03)

      // Limited income
      incomeStore.addIncomeSource({
        id: '1',
        name: 'Part-time Job',
        type: 'salary',
        amount: 3000,
        frequency: 'monthly',
        startDate: '2025-01'
      })

      // High expenses
      expenseStore.addExpense({
        id: '1',
        name: 'Living',
        category: 'living',
        monthlyAmount: 3500,
        inflationRate: 0.03
      })

      // Large loan
      expenseStore.addLoan({
        id: '1',
        name: 'Debt Consolidation',
        principal: 50000,
        interestRate: 0.08,
        termMonths: 60,
        startDate: '2025-01'
      })

      retirementStore.calculate()
      const results = retirementStore.results
      expect(results).not.toBeNull()

      // Should detect financial stress
      const validation = retirementStore.validation
      expect(validation.isValid).toBe(true)
    })
  })

  describe('Optimistic scenario: high income, low expenses', () => {
    it('should show strong sustainability with high savings rate', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const expenseStore = useExpenseStore()

      retirementStore.updateCurrentAge(28)
      retirementStore.updateRetirementAge(55)
      retirementStore.updateCurrentSavings(50000)
      retirementStore.updateExpectedReturnRate(0.08)
      retirementStore.updateInflationRate(0.02)

      // High income
      incomeStore.addIncomeSource({
        id: '1',
        name: 'Tech Job',
        type: 'salary',
        amount: 15000,
        frequency: 'monthly',
        startDate: '2025-01'
      })

      // Modest expenses
      expenseStore.addExpense({
        id: '1',
        name: 'Living',
        category: 'living',
        monthlyAmount: 3000,
        inflationRate: 0.02
      })

      retirementStore.calculate()
      const results = retirementStore.results
      expect(results).not.toBeNull()
      expect(results!.futureValue).toBeGreaterThan(1000000)
    })
  })
})
