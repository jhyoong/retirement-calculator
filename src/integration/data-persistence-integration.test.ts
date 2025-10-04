import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRetirementStore } from '../stores/retirement'
import { useIncomeStore } from '../stores/income'
import { useExpenseStore } from '../stores/expense'
import { exportData, validateImportedData } from '../utils/importExport'

describe('Data Persistence Integration Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Export functionality', () => {
    it('should export basic retirement data', () => {
      const retirementStore = useRetirementStore()

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 65
      retirementStore.currentSavings = 100000

      const exported = exportData(retirementStore.userData)

      expect(exported.user.currentAge).toBe(30)
      expect(exported.user.retirementAge).toBe(65)
      expect(exported.user.currentSavings).toBe(100000)
      expect(exported.exportDate).toBeDefined()
    })

    it('should export income sources and one-off returns', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const expenseStore = useExpenseStore()

      expenseStore.expenses = []

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Main Salary',
        type: 'salary',
        amount: 6000,
        frequency: 'monthly',
        startDate: '2025-01'
      })

      incomeStore.addOneOffReturn({
        id: '1',
        date: '2026-12',
        amount: 20000,
        description: 'Year-end bonus'
      })

      const exported = exportData(retirementStore.userData)

      expect(exported.user.incomeSources).toHaveLength(1)
      expect(exported.user.oneOffReturns).toHaveLength(1)
      expect(validateImportedData(exported)).toBe(true)
    })

    it('should export expenses', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()

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

    it('should export loans and one-time expenses', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()

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

      expect(userData.loans).toHaveLength(1)
      expect(userData.oneTimeExpenses).toHaveLength(1)
    })
  })

  describe('Import functionality', () => {
    it('should import and validate basic data', () => {
      const data = {
        exportDate: new Date().toISOString(),
        user: {
          currentAge: 35,
          retirementAge: 65,
          currentSavings: 200000,
          expectedReturnRate: 0.07,
          inflationRate: 0.03
        }
      }

      expect(validateImportedData(data)).toBe(true)
    })

    it('should import data with income sources', () => {
      const data = {
        exportDate: '2024-01-01',
        user: {
          currentAge: 30,
          retirementAge: 65,
          currentSavings: 100000,
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

    it('should import data with expenses', () => {
      const data = {
        exportDate: '2025-01-01',
        user: {
          currentAge: 30,
          retirementAge: 65,
          currentSavings: 100000,
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

      expect(validateImportedData(data)).toBe(true)
    })

    it('should import data with loans and one-time expenses', () => {
      const data = {
        exportDate: '2025-01-01',
        user: {
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
          ],
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
      }

      expect(validateImportedData(data)).toBe(true)
    })
  })

  describe('Round-trip data integrity', () => {
    it('should preserve income sources through export/import', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const expenseStore = useExpenseStore()

      expenseStore.expenses = []

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

      incomeStore.addOneOffReturn({
        id: '1',
        date: '2026-12',
        amount: 20000,
        description: 'Year-end bonus'
      })

      retirementStore.calculate()
      const oldResults = retirementStore.results

      const exported = exportData(retirementStore.userData)

      const newPinia = createPinia()
      setActivePinia(newPinia)

      const newExpenseStore = useExpenseStore()
      newExpenseStore.expenses = []

      const newRetirementStore = useRetirementStore()
      newRetirementStore.loadData(exported.user)

      const newIncomeStore = useIncomeStore()
      expect(newIncomeStore.incomeSources).toHaveLength(2)
      expect(newIncomeStore.oneOffReturns).toHaveLength(1)
      expect(newIncomeStore.totalMonthlyIncome).toBe(8000)

      newRetirementStore.calculate()
      const newResults = newRetirementStore.results
      expect(newResults!.futureValue).toBeCloseTo(oldResults!.futureValue, -2)
    })

    it('should preserve expenses through export/import', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()

      while (expenseStore.expenses.length > 0) {
        expenseStore.removeExpense(expenseStore.expenses[0].id)
      }

      retirementStore.currentAge = 40
      retirementStore.retirementAge = 67
      retirementStore.currentSavings = 250000
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

      const exported = exportData(retirementStore.userData)

      setActivePinia(createPinia())
      const newRetirementStore = useRetirementStore()
      const newExpenseStore = useExpenseStore()

      newRetirementStore.loadData(exported.user)

      expect(newRetirementStore.currentAge).toBe(40)
      expect(newRetirementStore.retirementAge).toBe(67)
      expect(newExpenseStore.expenses).toHaveLength(2)
      expect(newExpenseStore.expenses[0].name).toBe('Living')
      expect(newExpenseStore.expenses[1].name).toBe('Healthcare')
    })

    it('should preserve loans and one-time expenses through export/import', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()

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

      const newStore = useRetirementStore()
      newStore.loadData(userData)

      const newExpenseStore = useExpenseStore()
      expect(newExpenseStore.loans).toHaveLength(1)
      expect(newExpenseStore.oneTimeExpenses).toHaveLength(1)
      expect(newExpenseStore.loans[0].name).toBe('Test Loan')
      expect(newExpenseStore.oneTimeExpenses[0].name).toBe('Test Expense')
    })

    it('should preserve all features together', () => {
      const retirementStore = useRetirementStore()
      const expenseStore = useExpenseStore()
      const incomeStore = useIncomeStore()

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
        name: 'Income',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2025-01'
      })

      retirementStore.calculate()
      const resultsWithoutExpenses = retirementStore.results
      expect(resultsWithoutExpenses).toBeDefined()
      expect(resultsWithoutExpenses?.futureValue).toBeGreaterThan(0)

      expenseStore.addExpense({
        id: '1',
        name: 'Living',
        category: 'living',
        monthlyAmount: 3000,
        inflationRate: 0.03
      })

      retirementStore.calculate()
      const resultsWithExpenses = retirementStore.results
      expect(resultsWithExpenses).toBeDefined()
      expect(resultsWithExpenses?.yearsUntilDepletion).toBeDefined()
      expect(resultsWithExpenses?.sustainabilityWarning).toBeDefined()
    })
  })
})
