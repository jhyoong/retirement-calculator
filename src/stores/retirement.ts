import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserData, CalculationResult, ValidationResult } from '@/types'
import { calculateRetirement, validateInputs } from '@/utils/calculations'
import { useIncomeStore } from './income'
import { useExpenseStore } from './expense'
import { useCPFStore } from './cpf'

export const useRetirementStore = defineStore('retirement', () => {
  // State with sensible defaults
  const currentAge = ref(30)
  const retirementAge = ref(65)
  const currentSavings = ref(50000)
  const expectedReturnRate = ref(0.05) // 7%
  const inflationRate = ref(0.03) // 3%

  // Computed: get user data object
  const userData = computed((): UserData => {
    const incomeStore = useIncomeStore()
    const expenseStore = useExpenseStore()
    const cpfStore = useCPFStore()

    return {
      currentAge: currentAge.value,
      retirementAge: retirementAge.value,
      currentSavings: currentSavings.value,
      expectedReturnRate: expectedReturnRate.value,
      inflationRate: inflationRate.value,
      // Phase 2: Include income sources if they exist
      incomeSources: incomeStore.incomeSources.length > 0 ? incomeStore.incomeSources : undefined,
      oneOffReturns: incomeStore.oneOffReturns.length > 0 ? incomeStore.oneOffReturns : undefined,
      // Phase 4: Include expenses if they exist
      expenses: expenseStore.expenses.length > 0 ? expenseStore.expenses : undefined,
      // Phase 5: Include loans and one-time expenses if they exist
      loans: expenseStore.loans.length > 0 ? expenseStore.loans : undefined,
      oneTimeExpenses: expenseStore.oneTimeExpenses.length > 0 ? expenseStore.oneTimeExpenses : undefined,
      // Phase 6: Include CPF data if enabled
      cpf: cpfStore.enabled ? cpfStore.cpfData : undefined
    }
  })

  // Computed: validation result
  const validation = computed((): ValidationResult => {
    return validateInputs(userData.value)
  })

  // Computed: calculation result (only if valid)
  const results = computed((): CalculationResult | null => {
    if (!validation.value.isValid) {
      return null
    }
    try {
      return calculateRetirement(userData.value)
    } catch (error) {
      console.error('Calculation error:', error)
      return null
    }
  })

  // Actions
  function updateCurrentAge(value: number) {
    currentAge.value = value
  }

  function updateRetirementAge(value: number) {
    retirementAge.value = value
  }

  function updateCurrentSavings(value: number) {
    currentSavings.value = value
  }

  function updateExpectedReturnRate(value: number) {
    expectedReturnRate.value = value
  }

  function updateInflationRate(value: number) {
    inflationRate.value = value
  }

  function loadData(data: UserData) {
    currentAge.value = data.currentAge
    retirementAge.value = data.retirementAge
    currentSavings.value = data.currentSavings
    expectedReturnRate.value = data.expectedReturnRate
    inflationRate.value = data.inflationRate

    // Phase 2: Load income sources and one-off returns
    const incomeStore = useIncomeStore()
    if (data.incomeSources && data.oneOffReturns) {
      incomeStore.loadData(data.incomeSources, data.oneOffReturns)
    } else if (data.incomeSources) {
      incomeStore.loadData(data.incomeSources, [])
    } else if (data.oneOffReturns) {
      incomeStore.loadData([], data.oneOffReturns)
    } else {
      incomeStore.resetToDefaults()
    }

    // Phase 4 & 5: Load expenses, loans, and one-time expenses
    const expenseStore = useExpenseStore()
    if (data.expenses || data.loans || data.oneTimeExpenses) {
      expenseStore.loadData(
        data.expenses || [],
        data.loans || [],
        data.oneTimeExpenses || []
      )
    } else {
      // If no Phase 4/5 data in imported data, load empty arrays (don't reset to defaults)
      // This maintains backward compatibility with Phase 1-3 data
      expenseStore.loadData([], [], [])
    }

    // Phase 6: Load CPF data if present
    const cpfStore = useCPFStore()
    if (data.cpf) {
      cpfStore.loadData(data.cpf)
    } else {
      cpfStore.resetToDefaults()
    }
  }

  function resetToDefaults() {
    currentAge.value = 30
    retirementAge.value = 65
    currentSavings.value = 50000
    expectedReturnRate.value = 0.07
    inflationRate.value = 0.03

    // Phase 2: Reset income data
    const incomeStore = useIncomeStore()
    incomeStore.resetToDefaults()

    // Phase 4: Reset expense data
    const expenseStore = useExpenseStore()
    expenseStore.resetToDefaults()

    // Phase 6: Reset CPF data
    const cpfStore = useCPFStore()
    cpfStore.resetToDefaults()
  }

  return {
    // State
    currentAge,
    retirementAge,
    currentSavings,
    expectedReturnRate,
    inflationRate,
    // Computed
    userData,
    validation,
    results,
    // Actions
    updateCurrentAge,
    updateRetirementAge,
    updateCurrentSavings,
    updateExpectedReturnRate,
    updateInflationRate,
    loadData,
    resetToDefaults
  }
})
