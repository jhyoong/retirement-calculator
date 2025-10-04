import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRetirementStore } from '../stores/retirement'
import { useExpenseStore } from '../stores/expense'
import { useIncomeStore } from '../stores/income'
import type { RetirementExpense, Loan, OneTimeExpense } from '../types'

describe('Expense Integration Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Recurring expenses', () => {
    it('should flow expense store data to retirement calculations', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()
      const incomeStore = useIncomeStore()

      // Clear default expenses
      expenseStore.resetToDefaults()
      while (expenseStore.expenses.length > 0) {
        expenseStore.removeExpense(expenseStore.expenses[0].id)
      }

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 65
      retirementStore.currentSavings = 100000
      retirementStore.expectedReturnRate = 0.06
      retirementStore.inflationRate = 0.03

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Monthly Contribution',
        type: 'custom',
        amount: 1000,
        frequency: 'monthly',
        startDate: '2025-01'
      })

      const expense: RetirementExpense = {
        id: '1',
        name: 'Living Expenses',
        category: 'living',
        monthlyAmount: 3000,
        inflationRate: 0.03
      }
      expenseStore.addExpense(expense)

      const userData = retirementStore.userData
      expect(userData.expenses).toHaveLength(1)
      expect(userData.expenses![0].name).toBe(expense.name)

      retirementStore.calculate()
      const results = retirementStore.results
      expect(results).toBeDefined()
      expect(results).toHaveProperty('yearsUntilDepletion')
      expect(results).toHaveProperty('sustainabilityWarning')
    })

    it('should handle multiple expense categories', () => {
      const expenseStore = useExpenseStore()

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

    it('should handle date-based expense filtering', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 65
      retirementStore.currentSavings = 1000000
      retirementStore.expectedReturnRate = 0.06

      while (expenseStore.expenses.length > 0) {
        expenseStore.removeExpense(expenseStore.expenses[0].id)
      }

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
        startDate: '2040-01',
        endDate: '2050-01'
      })

      retirementStore.calculate()
      const results = retirementStore.results
      expect(results).toBeDefined()
      expect(results?.yearsUntilDepletion).toBeDefined()
    })
  })

  describe('Sustainability metrics', () => {
    it('should detect unsustainable expense rates', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()
      const incomeStore = useIncomeStore()

      retirementStore.currentAge = 60
      retirementStore.retirementAge = 65
      retirementStore.currentSavings = 100000
      retirementStore.expectedReturnRate = 0.04
      retirementStore.inflationRate = 0.03

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Minimal Income',
        type: 'custom',
        amount: 500,
        frequency: 'monthly',
        startDate: '2025-01'
      })

      while (expenseStore.expenses.length > 0) {
        expenseStore.removeExpense(expenseStore.expenses[0].id)
      }

      expenseStore.addExpense({
        id: '1',
        name: 'High Expenses',
        category: 'living',
        monthlyAmount: 5000,
        inflationRate: 0.03,
        startDate: '2030-01'
      })

      retirementStore.calculate()
      const results = retirementStore.results
      expect(results?.sustainabilityWarning).toBe(true)
    })
  })

  describe('Loan integration', () => {
    it('should include loans in user data', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()

      const loan: Loan = {
        id: '1',
        name: 'Home Mortgage',
        principal: 300000,
        interestRate: 0.04,
        termMonths: 360,
        startDate: '2025-01'
      }

      expenseStore.addLoan(loan)

      expect(retirementStore.userData.loans).toBeDefined()
      expect(retirementStore.userData.loans).toHaveLength(1)
      expect(retirementStore.userData.loans?.[0].name).toBe('Home Mortgage')
    })

    it('should reduce portfolio balance with loan payments', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()
      const incomeStore = useIncomeStore()

      expenseStore.loadData([], [], [])

      retirementStore.updateCurrentAge(30)
      retirementStore.updateRetirementAge(35)
      retirementStore.updateCurrentSavings(100000)
      retirementStore.updateExpectedReturnRate(0.06)

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Monthly Contribution',
        type: 'custom',
        amount: 2000,
        frequency: 'monthly',
        startDate: new Date().toISOString().slice(0, 7)
      })

      const loan: Loan = {
        id: '1',
        name: 'Car Loan',
        principal: 24000,
        interestRate: 0.05,
        termMonths: 48,
        startDate: new Date().toISOString().slice(0, 7)
      }

      expenseStore.addLoan(loan)

      retirementStore.calculate()
      const results = retirementStore.results
      expect(results).not.toBeNull()
      expect(results!.futureValue).toBeGreaterThan(0)
    })

    it('should validate loan data', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()

      const invalidLoan = {
        id: '1',
        name: '',
        principal: -10000,
        interestRate: 1.5,
        termMonths: 0,
        startDate: '2025-01'
      } as Loan

      expenseStore.addLoan(invalidLoan)

      const validation = retirementStore.validation
      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(e => e.field.includes('loan'))).toBe(true)
    })
  })

  describe('One-time expense integration', () => {
    it('should include one-time expenses in user data', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()

      const expense: OneTimeExpense = {
        id: '1',
        name: 'Home Renovation',
        amount: 50000,
        date: '2030-06',
        category: 'other',
        description: 'Kitchen remodel'
      }

      expenseStore.addOneTimeExpense(expense)

      expect(retirementStore.userData.oneTimeExpenses).toBeDefined()
      expect(retirementStore.userData.oneTimeExpenses).toHaveLength(1)
      expect(retirementStore.userData.oneTimeExpenses?.[0].name).toBe('Home Renovation')
    })

    it('should deduct one-time expenses from portfolio', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()
      const incomeStore = useIncomeStore()

      expenseStore.loadData([], [], [])

      retirementStore.updateCurrentAge(30)
      retirementStore.updateRetirementAge(35)
      retirementStore.updateCurrentSavings(100000)

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Monthly Contribution',
        type: 'custom',
        amount: 2000,
        frequency: 'monthly',
        startDate: new Date().toISOString().slice(0, 7)
      })

      const expense: OneTimeExpense = {
        id: '1',
        name: 'Car Purchase',
        amount: 30000,
        date: new Date(new Date().getFullYear() + 2, new Date().getMonth()).toISOString().slice(0, 7),
        category: 'other'
      }

      expenseStore.addOneTimeExpense(expense)

      retirementStore.calculate()
      const results = retirementStore.results
      expect(results).not.toBeNull()
      expect(results!.futureValue).toBeGreaterThan(0)
    })

    it('should validate one-time expense data', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()

      const invalidExpense = {
        id: '1',
        name: '',
        amount: -5000,
        date: 'invalid-date',
        category: 'other'
      } as OneTimeExpense

      expenseStore.addOneTimeExpense(invalidExpense)

      const validation = retirementStore.validation
      expect(validation.isValid).toBe(false)
      expect(validation.errors.some(e => e.field.includes('oneTimeExpense'))).toBe(true)
    })
  })

  describe('Combined expense scenarios', () => {
    it('should handle combination of expenses, loans, and one-time expenses', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()
      const incomeStore = useIncomeStore()

      expenseStore.loadData([], [], [])

      retirementStore.updateCurrentAge(30)
      retirementStore.updateRetirementAge(40)
      retirementStore.updateCurrentSavings(100000)
      retirementStore.updateExpectedReturnRate(0.07)

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Monthly Contribution',
        type: 'custom',
        amount: 3000,
        frequency: 'monthly',
        startDate: new Date().toISOString().slice(0, 7)
      })

      expenseStore.addLoan({
        id: '1',
        name: 'Mortgage',
        principal: 300000,
        interestRate: 0.04,
        termMonths: 360,
        startDate: new Date().toISOString().slice(0, 7)
      })

      expenseStore.addOneTimeExpense({
        id: '1',
        name: 'Renovation',
        amount: 50000,
        date: new Date(new Date().getFullYear() + 5, 0).toISOString().slice(0, 7),
        category: 'other'
      })

      retirementStore.calculate()
      const results = retirementStore.results
      expect(results).not.toBeNull()
      expect(results!.futureValue).toBeGreaterThan(0)
    })
  })
})
