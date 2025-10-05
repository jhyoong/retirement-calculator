import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { IncomeStream, OneOffReturn, IncomeFrequency } from '@/types'
import {
  MONTHS_PER_YEAR,
  WEEKS_PER_YEAR,
  AVERAGE_DAYS_PER_MONTH,
  DAYS_PER_YEAR
} from '@/utils/constants'

export const useIncomeStore = defineStore('income', () => {
  // State
  const incomeSources = ref<IncomeStream[]>([])
  const oneOffReturns = ref<OneOffReturn[]>([])

  // Computed: Total monthly income (normalized from all frequencies)
  const totalMonthlyIncome = computed((): number => {
    return incomeSources.value.reduce((total, source) => {
      return total + convertToMonthly(source.amount, source.frequency, source.customFrequencyDays)
    }, 0)
  })

  // Helper: Convert any frequency to monthly amount
  function convertToMonthly(
    amount: number,
    frequency: IncomeFrequency,
    customDays?: number
  ): number {
    switch (frequency) {
      case 'daily':
        return amount * AVERAGE_DAYS_PER_MONTH
      case 'weekly':
        return amount * WEEKS_PER_YEAR / MONTHS_PER_YEAR
      case 'monthly':
        return amount
      case 'yearly':
        return amount / MONTHS_PER_YEAR
      case 'custom':
        if (!customDays || customDays <= 0) return 0
        return (amount * DAYS_PER_YEAR) / customDays / MONTHS_PER_YEAR
      default:
        return 0
    }
  }

  // Actions: Income Sources
  function addIncomeSource(source: IncomeStream) {
    incomeSources.value.push(source)
  }

  function removeIncomeSource(id: string) {
    incomeSources.value = incomeSources.value.filter(s => s.id !== id)
  }

  function updateIncomeSource(id: string, updates: Partial<IncomeStream>) {
    const index = incomeSources.value.findIndex(s => s.id === id)
    if (index !== -1) {
      incomeSources.value[index] = { ...incomeSources.value[index], ...updates }
    }
  }

  // Actions: One-off Returns
  function addOneOffReturn(oneOff: OneOffReturn) {
    oneOffReturns.value.push(oneOff)
  }

  function removeOneOffReturn(id: string) {
    oneOffReturns.value = oneOffReturns.value.filter(r => r.id !== id)
  }

  function updateOneOffReturn(id: string, updates: Partial<OneOffReturn>) {
    const index = oneOffReturns.value.findIndex(r => r.id === id)
    if (index !== -1) {
      oneOffReturns.value[index] = { ...oneOffReturns.value[index], ...updates }
    }
  }

  // Action: Load data
  function loadData(sources: IncomeStream[], returns: OneOffReturn[]) {
    incomeSources.value = sources
    oneOffReturns.value = returns
  }

  // Action: Reset
  function resetToDefaults() {
    incomeSources.value = []
    oneOffReturns.value = []
  }

  // Action: Clear all data
  function clearAll() {
    incomeSources.value = []
    oneOffReturns.value = []
  }

  return {
    // State
    incomeSources,
    oneOffReturns,
    // Computed
    totalMonthlyIncome,
    // Helpers
    convertToMonthly,
    // Actions
    addIncomeSource,
    removeIncomeSource,
    updateIncomeSource,
    addOneOffReturn,
    removeOneOffReturn,
    updateOneOffReturn,
    loadData,
    resetToDefaults,
    clearAll
  }
})
