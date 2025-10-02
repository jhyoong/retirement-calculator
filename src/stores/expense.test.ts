import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useExpenseStore } from './expense'
import type { RetirementExpense } from '@/types'

describe('Expense Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Initial State', () => {
    it('should have one default living expense', () => {
      const store = useExpenseStore()

      expect(store.expenses).toHaveLength(1)
      expect(store.expenses[0].name).toBe('Living Expenses')
      expect(store.expenses[0].category).toBe('living')
      expect(store.expenses[0].monthlyAmount).toBe(3000)
      expect(store.expenses[0].inflationRate).toBe(0.03)
    })
  })

  describe('Computed: totalMonthlyExpenses', () => {
    it('should calculate total of all expenses', () => {
      const store = useExpenseStore()

      store.addExpense({
        name: 'Healthcare',
        category: 'healthcare',
        monthlyAmount: 500,
        inflationRate: 0.05
      })

      expect(store.totalMonthlyExpenses).toBe(3500) // 3000 + 500
    })

    it('should return 0 when no expenses', () => {
      const store = useExpenseStore()
      store.expenses = []

      expect(store.totalMonthlyExpenses).toBe(0)
    })

    it('should update reactively when expenses change', () => {
      const store = useExpenseStore()
      const initialTotal = store.totalMonthlyExpenses

      store.addExpense({
        name: 'Travel',
        category: 'travel',
        monthlyAmount: 1000,
        inflationRate: 0.03
      })

      expect(store.totalMonthlyExpenses).toBe(initialTotal + 1000)
    })
  })

  describe('Computed: expensesByCategory', () => {
    it('should group expenses by category', () => {
      const store = useExpenseStore()

      store.addExpense({
        name: 'Healthcare Premium',
        category: 'healthcare',
        monthlyAmount: 500,
        inflationRate: 0.05
      })

      store.addExpense({
        name: 'Medications',
        category: 'healthcare',
        monthlyAmount: 200,
        inflationRate: 0.05
      })

      const grouped = store.expensesByCategory

      expect(grouped.living).toHaveLength(1)
      expect(grouped.healthcare).toHaveLength(2)
      expect(grouped.travel).toHaveLength(0)
      expect(grouped.other).toHaveLength(0)
    })
  })

  describe('Computed: totalsByCategory', () => {
    it('should calculate totals by category', () => {
      const store = useExpenseStore()

      store.addExpense({
        name: 'Healthcare Premium',
        category: 'healthcare',
        monthlyAmount: 500,
        inflationRate: 0.05
      })

      store.addExpense({
        name: 'Medications',
        category: 'healthcare',
        monthlyAmount: 200,
        inflationRate: 0.05
      })

      const totals = store.totalsByCategory

      expect(totals.living).toBe(3000)
      expect(totals.healthcare).toBe(700)
      expect(totals.travel).toBe(0)
      expect(totals.other).toBe(0)
    })
  })

  describe('Actions: addExpense', () => {
    it('should add a new expense with generated id', () => {
      const store = useExpenseStore()

      const id = store.addExpense({
        name: 'Travel Fund',
        category: 'travel',
        monthlyAmount: 500,
        inflationRate: 0.03
      })

      expect(id).toBeDefined()
      expect(store.expenses).toHaveLength(2)

      const added = store.expenses.find(e => e.id === id)
      expect(added).toBeDefined()
      expect(added?.name).toBe('Travel Fund')
      expect(added?.category).toBe('travel')
      expect(added?.monthlyAmount).toBe(500)
    })

    it('should add expense with optional date fields', () => {
      const store = useExpenseStore()

      const id = store.addExpense({
        name: 'Early Retirement Healthcare',
        category: 'healthcare',
        monthlyAmount: 800,
        inflationRate: 0.06,
        startDate: '2025-01',
        endDate: '2030-01'
      })

      const added = store.expenses.find(e => e.id === id)
      expect(added?.startDate).toBe('2025-01')
      expect(added?.endDate).toBe('2030-01')
    })

    it('should generate unique ids for multiple expenses', () => {
      const store = useExpenseStore()

      const id1 = store.addExpense({
        name: 'Expense 1',
        category: 'other',
        monthlyAmount: 100,
        inflationRate: 0.03
      })

      const id2 = store.addExpense({
        name: 'Expense 2',
        category: 'other',
        monthlyAmount: 200,
        inflationRate: 0.03
      })

      expect(id1).not.toBe(id2)
    })
  })

  describe('Actions: removeExpense', () => {
    it('should remove expense by id', () => {
      const store = useExpenseStore()

      const id = store.addExpense({
        name: 'Temporary',
        category: 'other',
        monthlyAmount: 100,
        inflationRate: 0.03
      })

      const initialLength = store.expenses.length
      const result = store.removeExpense(id)

      expect(result).toBe(true)
      expect(store.expenses).toHaveLength(initialLength - 1)
      expect(store.expenses.find(e => e.id === id)).toBeUndefined()
    })

    it('should return false for non-existent id', () => {
      const store = useExpenseStore()

      const result = store.removeExpense('non-existent-id')

      expect(result).toBe(false)
    })

    it('should not affect other expenses when removing one', () => {
      const store = useExpenseStore()

      const id1 = store.addExpense({
        name: 'Keep This',
        category: 'living',
        monthlyAmount: 100,
        inflationRate: 0.03
      })

      const id2 = store.addExpense({
        name: 'Remove This',
        category: 'other',
        monthlyAmount: 200,
        inflationRate: 0.03
      })

      store.removeExpense(id2)

      const kept = store.expenses.find(e => e.id === id1)
      expect(kept).toBeDefined()
      expect(kept?.name).toBe('Keep This')
    })
  })

  describe('Actions: updateExpense', () => {
    it('should update expense fields', () => {
      const store = useExpenseStore()

      const id = store.addExpense({
        name: 'Original Name',
        category: 'living',
        monthlyAmount: 1000,
        inflationRate: 0.03
      })

      const result = store.updateExpense(id, {
        name: 'Updated Name',
        monthlyAmount: 1500
      })

      expect(result).toBe(true)

      const updated = store.expenses.find(e => e.id === id)
      expect(updated?.name).toBe('Updated Name')
      expect(updated?.monthlyAmount).toBe(1500)
      expect(updated?.category).toBe('living') // Unchanged
    })

    it('should return false for non-existent id', () => {
      const store = useExpenseStore()

      const result = store.updateExpense('non-existent-id', {
        monthlyAmount: 999
      })

      expect(result).toBe(false)
    })

    it('should allow partial updates', () => {
      const store = useExpenseStore()

      const id = store.addExpense({
        name: 'Test',
        category: 'travel',
        monthlyAmount: 500,
        inflationRate: 0.03
      })

      store.updateExpense(id, { inflationRate: 0.05 })

      const updated = store.expenses.find(e => e.id === id)
      expect(updated?.inflationRate).toBe(0.05)
      expect(updated?.name).toBe('Test')
      expect(updated?.monthlyAmount).toBe(500)
    })
  })

  describe('Actions: loadData', () => {
    it('should load expenses data', () => {
      const store = useExpenseStore()

      const testExpenses: RetirementExpense[] = [
        {
          id: '1',
          name: 'Loaded Expense 1',
          category: 'living',
          monthlyAmount: 2000,
          inflationRate: 0.03
        },
        {
          id: '2',
          name: 'Loaded Expense 2',
          category: 'healthcare',
          monthlyAmount: 500,
          inflationRate: 0.05
        }
      ]

      store.loadData(testExpenses)

      expect(store.expenses).toEqual(testExpenses)
    })
  })

  describe('Actions: resetToDefaults', () => {
    it('should reset to default state', () => {
      const store = useExpenseStore()

      // Modify state
      store.addExpense({
        name: 'Extra',
        category: 'travel',
        monthlyAmount: 1000,
        inflationRate: 0.03
      })

      // Reset
      store.resetToDefaults()

      expect(store.expenses).toHaveLength(1)
      expect(store.expenses[0].name).toBe('Living Expenses')
      expect(store.expenses[0].category).toBe('living')
      expect(store.expenses[0].monthlyAmount).toBe(3000)
    })

    it('should generate new ids on reset', () => {
      const store = useExpenseStore()
      const originalId = store.expenses[0].id

      store.resetToDefaults()
      const newId = store.expenses[0].id

      expect(newId).not.toBe(originalId)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty expenses array', () => {
      const store = useExpenseStore()
      store.expenses = []

      expect(store.totalMonthlyExpenses).toBe(0)
      expect(store.expensesByCategory.living).toHaveLength(0)
    })

    it('should handle expenses with zero amount', () => {
      const store = useExpenseStore()

      store.addExpense({
        name: 'Zero Amount',
        category: 'other',
        monthlyAmount: 0,
        inflationRate: 0.03
      })

      expect(store.totalMonthlyExpenses).toBe(3000) // Only default expense
    })

    it('should handle negative inflation rate', () => {
      const store = useExpenseStore()

      const id = store.addExpense({
        name: 'Deflating Expense',
        category: 'other',
        monthlyAmount: 100,
        inflationRate: -0.02
      })

      const added = store.expenses.find(e => e.id === id)
      expect(added?.inflationRate).toBe(-0.02)
    })
  })
})
