import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RetirementExpense, Loan, OneTimeExpense } from '@/types'
import { DEFAULT_LIVING_EXPENSES, DEFAULT_INFLATION_RATE } from '@/utils/constants'

export const useExpenseStore = defineStore('expense', () => {
  // State - Phase 4
  const expenses = ref<RetirementExpense[]>([
    // Default expense
    {
      id: crypto.randomUUID(),
      name: 'Living Expenses',
      category: 'living',
      monthlyAmount: DEFAULT_LIVING_EXPENSES,
      inflationRate: DEFAULT_INFLATION_RATE
      // startDate and endDate are optional - undefined means start now and ongoing
    }
  ])

  // State - Phase 5
  const loans = ref<Loan[]>([])
  const oneTimeExpenses = ref<OneTimeExpense[]>([])

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

  function loadData(expensesData: RetirementExpense[], loansData?: Loan[], oneTimeExpensesData?: OneTimeExpense[]) {
    expenses.value = expensesData
    loans.value = loansData || []
    oneTimeExpenses.value = oneTimeExpensesData || []
  }

  function resetToDefaults() {
    expenses.value = [
      {
        id: crypto.randomUUID(),
        name: 'Living Expenses',
        category: 'living',
        monthlyAmount: DEFAULT_LIVING_EXPENSES,
        inflationRate: DEFAULT_INFLATION_RATE
        // startDate and endDate are optional - undefined means start now and ongoing
      }
    ]
    loans.value = []
    oneTimeExpenses.value = []
  }

  function clearAll() {
    expenses.value = []
    loans.value = []
    oneTimeExpenses.value = []
  }

  // Phase 5 Actions - Loans
  function addLoan(loan: Omit<Loan, 'id'>): string {
    const newLoan: Loan = {
      ...loan,
      id: crypto.randomUUID()
    }
    loans.value.push(newLoan)
    return newLoan.id
  }

  function removeLoan(id: string): boolean {
    const index = loans.value.findIndex(l => l.id === id)
    if (index !== -1) {
      loans.value.splice(index, 1)
      return true
    }
    return false
  }

  function updateLoan(id: string, updates: Partial<Omit<Loan, 'id'>>): boolean {
    const loan = loans.value.find(l => l.id === id)
    if (loan) {
      Object.assign(loan, updates)
      return true
    }
    return false
  }

  // Phase 5 Actions - One-Time Expenses
  function addOneTimeExpense(expense: Omit<OneTimeExpense, 'id'>): string {
    const newExpense: OneTimeExpense = {
      ...expense,
      id: crypto.randomUUID()
    }
    oneTimeExpenses.value.push(newExpense)
    return newExpense.id
  }

  function removeOneTimeExpense(id: string): boolean {
    const index = oneTimeExpenses.value.findIndex(e => e.id === id)
    if (index !== -1) {
      oneTimeExpenses.value.splice(index, 1)
      return true
    }
    return false
  }

  function updateOneTimeExpense(id: string, updates: Partial<Omit<OneTimeExpense, 'id'>>): boolean {
    const expense = oneTimeExpenses.value.find(e => e.id === id)
    if (expense) {
      Object.assign(expense, updates)
      return true
    }
    return false
  }

  return {
    // State
    expenses,
    loans,
    oneTimeExpenses,
    // Computed
    totalMonthlyExpenses,
    expensesByCategory,
    totalsByCategory,
    // Actions - Phase 4
    addExpense,
    removeExpense,
    updateExpense,
    loadData,
    resetToDefaults,
    clearAll,
    // Actions - Phase 5
    addLoan,
    removeLoan,
    updateLoan,
    addOneTimeExpense,
    removeOneTimeExpense,
    updateOneTimeExpense
  }
})
