import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RetirementExpense } from '@/types'

export const useExpenseStore = defineStore('expense', () => {
  // State
  const expenses = ref<RetirementExpense[]>([
    // Default expense
    {
      id: crypto.randomUUID(),
      name: 'Living Expenses',
      category: 'living',
      monthlyAmount: 3000,
      inflationRate: 0.03, // 3% annual inflation
    }
  ])

  // Computed: Total monthly expenses at retirement age (before inflation adjustment)
  const totalMonthlyExpenses = computed((): number => {
    return expenses.value.reduce((total, expense) => {
      return total + expense.monthlyAmount
    }, 0)
  })

  // Computed: Expenses grouped by category
  const expensesByCategory = computed(() => {
    const grouped: Record<string, RetirementExpense[]> = {
      living: [],
      healthcare: [],
      travel: [],
      other: []
    }

    expenses.value.forEach(expense => {
      grouped[expense.category].push(expense)
    })

    return grouped
  })

  // Computed: Total expenses by category
  const totalsByCategory = computed(() => {
    const totals: Record<string, number> = {
      living: 0,
      healthcare: 0,
      travel: 0,
      other: 0
    }

    expenses.value.forEach(expense => {
      totals[expense.category] += expense.monthlyAmount
    })

    return totals
  })

  // Actions
  function addExpense(expense: Omit<RetirementExpense, 'id'>): string {
    const newExpense: RetirementExpense = {
      ...expense,
      id: crypto.randomUUID()
    }
    expenses.value.push(newExpense)
    return newExpense.id
  }

  function removeExpense(id: string): boolean {
    const index = expenses.value.findIndex(e => e.id === id)
    if (index !== -1) {
      expenses.value.splice(index, 1)
      return true
    }
    return false
  }

  function updateExpense(id: string, updates: Partial<Omit<RetirementExpense, 'id'>>): boolean {
    const expense = expenses.value.find(e => e.id === id)
    if (expense) {
      Object.assign(expense, updates)
      return true
    }
    return false
  }

  function loadData(expensesData: RetirementExpense[]) {
    expenses.value = expensesData
  }

  function resetToDefaults() {
    expenses.value = [
      {
        id: crypto.randomUUID(),
        name: 'Living Expenses',
        category: 'living',
        monthlyAmount: 3000,
        inflationRate: 0.03,
      }
    ]
  }

  return {
    // State
    expenses,
    // Computed
    totalMonthlyExpenses,
    expensesByCategory,
    totalsByCategory,
    // Actions
    addExpense,
    removeExpense,
    updateExpense,
    loadData,
    resetToDefaults
  }
})
