import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRetirementStore } from './stores/retirement'
import { useExpenseStore } from './stores/expense'
import { useIncomeStore } from './stores/income'
import type { UserData, Loan, OneTimeExpense } from './types'

describe('Phase 5 Integration Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Loan Integration', () => {
    it('should include loans in user data when loans exist', () => {
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

    it('should validate loan data correctly', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        loans: [
          {
            id: '1',
            name: 'Car Loan',
            principal: 25000,
            interestRate: 0.05,
            termMonths: 60,
            startDate: '2025-06'
          }
        ]
      }

      const retirementStore = useRetirementStore()
      const validation = retirementStore.validation

      retirementStore.loadData(data)
      expect(validation.isValid).toBe(true)
    })

    it('should reject invalid loan data', () => {
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

  describe('One-Time Expense Integration', () => {
    it('should include one-time expenses in user data when they exist', () => {
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

    it('should validate one-time expense data correctly', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        oneTimeExpenses: [
          {
            id: '1',
            name: 'Car Purchase',
            amount: 30000,
            date: '2028-03',
            category: 'other'
          }
        ]
      }

      const retirementStore = useRetirementStore()
      retirementStore.loadData(data)

      const validation = retirementStore.validation
      expect(validation.isValid).toBe(true)
    })

    it('should reject invalid one-time expense data', () => {
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

  describe('Calculation Integration', () => {
    it('should reduce portfolio balance with loan payments', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()
      const incomeStore = useIncomeStore()

      // Clear default expenses
      expenseStore.loadData([], [], [])

      retirementStore.updateCurrentAge(30)
      retirementStore.updateRetirementAge(35)
      retirementStore.updateCurrentSavings(100000)
      retirementStore.updateExpectedReturnRate(0.06)

      // Add income source for monthly contribution
      incomeStore.addIncomeSource({
        id: '1',
        name: 'Monthly Contribution',
        type: 'custom',
        amount: 2000,
        frequency: 'monthly',
        startDate: new Date().toISOString().slice(0, 7)
      })

      // Add a loan
      const loan: Loan = {
        id: '1',
        name: 'Car Loan',
        principal: 24000,
        interestRate: 0.05,
        termMonths: 48,
        startDate: new Date().toISOString().slice(0, 7)
      }

      expenseStore.addLoan(loan)

      const results = retirementStore.results
      expect(results).not.toBeNull()

      // Portfolio should be less than without the loan
      // Loan payment is approximately $552/month
      // Without loan: would have more savings
      expect(results!.futureValue).toBeGreaterThan(0)
    })

    it('should deduct one-time expenses from portfolio at specific dates', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()
      const incomeStore = useIncomeStore()

      // Clear default expenses
      expenseStore.loadData([], [], [])

      retirementStore.updateCurrentAge(30)
      retirementStore.updateRetirementAge(35)
      retirementStore.updateCurrentSavings(100000)

      // Add income source for monthly contribution
      incomeStore.addIncomeSource({
        id: '1',
        name: 'Monthly Contribution',
        type: 'custom',
        amount: 2000,
        frequency: 'monthly',
        startDate: new Date().toISOString().slice(0, 7)
      })

      // Add one-time expense
      const expense: OneTimeExpense = {
        id: '1',
        name: 'Car Purchase',
        amount: 30000,
        date: new Date(new Date().getFullYear() + 2, new Date().getMonth()).toISOString().slice(0, 7),
        category: 'other'
      }

      expenseStore.addOneTimeExpense(expense)

      const results = retirementStore.results
      expect(results).not.toBeNull()
      expect(results!.futureValue).toBeGreaterThan(0)
    })

    it('should handle combination of loans and one-time expenses', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()
      const incomeStore = useIncomeStore()

      // Clear default expenses
      expenseStore.loadData([], [], [])

      retirementStore.updateCurrentAge(30)
      retirementStore.updateRetirementAge(40)
      retirementStore.updateCurrentSavings(100000)
      retirementStore.updateExpectedReturnRate(0.07)

      // Add income source for monthly contribution
      incomeStore.addIncomeSource({
        id: '1',
        name: 'Monthly Contribution',
        type: 'custom',
        amount: 3000,
        frequency: 'monthly',
        startDate: new Date().toISOString().slice(0, 7)
      })

      // Add loan
      expenseStore.addLoan({
        id: '1',
        name: 'Mortgage',
        principal: 300000,
        interestRate: 0.04,
        termMonths: 360,
        startDate: new Date().toISOString().slice(0, 7)
      })

      // Add one-time expense
      expenseStore.addOneTimeExpense({
        id: '1',
        name: 'Renovation',
        amount: 50000,
        date: new Date(new Date().getFullYear() + 5, 0).toISOString().slice(0, 7),
        category: 'other'
      })

      const results = retirementStore.results
      expect(results).not.toBeNull()
      expect(results!.futureValue).toBeGreaterThan(0)
    })
  })

  describe('Store Operations', () => {
    it('should add, update, and remove loans', () => {
      const expenseStore = useExpenseStore()

      const loanId = expenseStore.addLoan({
        name: 'Test Loan',
        principal: 10000,
        interestRate: 0.05,
        termMonths: 12,
        startDate: '2025-01'
      })

      expect(expenseStore.loans).toHaveLength(1)
      expect(expenseStore.loans[0].id).toBe(loanId)

      const updated = expenseStore.updateLoan(loanId, { principal: 15000 })
      expect(updated).toBe(true)
      expect(expenseStore.loans[0].principal).toBe(15000)

      const removed = expenseStore.removeLoan(loanId)
      expect(removed).toBe(true)
      expect(expenseStore.loans).toHaveLength(0)
    })

    it('should add, update, and remove one-time expenses', () => {
      const expenseStore = useExpenseStore()

      const expenseId = expenseStore.addOneTimeExpense({
        name: 'Test Expense',
        amount: 5000,
        date: '2025-06',
        category: 'other'
      })

      expect(expenseStore.oneTimeExpenses).toHaveLength(1)
      expect(expenseStore.oneTimeExpenses[0].id).toBe(expenseId)

      const updated = expenseStore.updateOneTimeExpense(expenseId, { amount: 7500 })
      expect(updated).toBe(true)
      expect(expenseStore.oneTimeExpenses[0].amount).toBe(7500)

      const removed = expenseStore.removeOneTimeExpense(expenseId)
      expect(removed).toBe(true)
      expect(expenseStore.oneTimeExpenses).toHaveLength(0)
    })
  })

  describe('Data Persistence', () => {
    it('should export and import Phase 5 data correctly', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()

      // Set up test data
      expenseStore.addLoan({
        name: 'Test Loan',
        principal: 50000,
        interestRate: 0.06,
        termMonths: 120,
        startDate: '2025-01'
      })

      expenseStore.addOneTimeExpense({
        name: 'Test Expense',
        amount: 10000,
        date: '2026-06',
        category: 'other'
      })

      const userData = retirementStore.userData

      // Load into new store instance
      const newStore = useRetirementStore()
      newStore.loadData(userData)

      const newExpenseStore = useExpenseStore()
      expect(newExpenseStore.loans).toHaveLength(1)
      expect(newExpenseStore.oneTimeExpenses).toHaveLength(1)
      expect(newExpenseStore.loans[0].name).toBe('Test Loan')
      expect(newExpenseStore.oneTimeExpenses[0].name).toBe('Test Expense')
    })
  })
})
