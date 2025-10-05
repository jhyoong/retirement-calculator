import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserData, CalculationResult, ValidationResult, MonthlyDataPoint } from '@/types'
import { calculateRetirement, validateInputs } from '@/utils/calculations'
import { generateMonthlyProjections } from '@/utils/monthlyProjections'
import { useIncomeStore } from './income'
import { useExpenseStore } from './expense'
import { useCPFStore } from './cpf'
import {
  DEFAULT_CURRENT_AGE,
  DEFAULT_RETIREMENT_AGE,
  DEFAULT_SAVINGS,
  DEFAULT_RETURN_RATE,
  DEFAULT_INFLATION_RATE
} from '@/utils/constants'

export const useRetirementStore = defineStore('retirement', () => {
  // State with sensible defaults
  const currentAge = ref(DEFAULT_CURRENT_AGE)
  const retirementAge = ref(DEFAULT_RETIREMENT_AGE)
  const currentSavings = ref(DEFAULT_SAVINGS)
  const expectedReturnRate = ref(DEFAULT_RETURN_RATE)
  const inflationRate = ref(DEFAULT_INFLATION_RATE)

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

  // State: calculation results (manually triggered)
  const results = ref<CalculationResult | null>(null)
  const monthlyProjections = ref<MonthlyDataPoint[]>([])
  const isCalculating = ref(false)
  const cachedMaxAge = ref<number | undefined>(undefined)

  // Actions
  function calculate(maxAge?: number) {
    if (!validation.value.isValid) {
      results.value = null
      monthlyProjections.value = []
      cachedMaxAge.value = undefined
      return
    }

    isCalculating.value = true
    try {
      // Calculate results
      results.value = calculateRetirement(userData.value)

      // Generate monthly projections for charts/tables
      monthlyProjections.value = generateMonthlyProjections(userData.value, maxAge)
      cachedMaxAge.value = maxAge
    } catch (error) {
      console.error('Calculation error:', error)
      results.value = null
      monthlyProjections.value = []
      cachedMaxAge.value = undefined
    } finally {
      isCalculating.value = false
    }
  }

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

    // Clear cached results when loading new data
    results.value = null
    monthlyProjections.value = []
    cachedMaxAge.value = undefined
  }

  function resetToDefaults() {
    currentAge.value = DEFAULT_CURRENT_AGE
    retirementAge.value = DEFAULT_RETIREMENT_AGE
    currentSavings.value = DEFAULT_SAVINGS
    expectedReturnRate.value = DEFAULT_RETURN_RATE
    inflationRate.value = DEFAULT_INFLATION_RATE

    // Phase 2: Reset income data
    const incomeStore = useIncomeStore()
    incomeStore.resetToDefaults()

    // Phase 4: Reset expense data
    const expenseStore = useExpenseStore()
    expenseStore.resetToDefaults()

    // Phase 6: Reset CPF data
    const cpfStore = useCPFStore()
    cpfStore.resetToDefaults()

    // Clear cached results when resetting
    results.value = null
    monthlyProjections.value = []
    cachedMaxAge.value = undefined
  }

  function clearAll() {
    currentAge.value = 0
    retirementAge.value = 0
    currentSavings.value = 0
    expectedReturnRate.value = 0
    inflationRate.value = 0

    // Clear all other stores
    const incomeStore = useIncomeStore()
    incomeStore.clearAll()

    const expenseStore = useExpenseStore()
    expenseStore.clearAll()

    const cpfStore = useCPFStore()
    cpfStore.clearAll()

    // Clear cached results
    results.value = null
    monthlyProjections.value = []
    cachedMaxAge.value = undefined
  }

  return {
    // State
    currentAge,
    retirementAge,
    currentSavings,
    expectedReturnRate,
    inflationRate,
    results,
    monthlyProjections,
    isCalculating,
    cachedMaxAge,
    // Computed
    userData,
    validation,
    // Actions
    calculate,
    updateCurrentAge,
    updateRetirementAge,
    updateCurrentSavings,
    updateExpectedReturnRate,
    updateInflationRate,
    loadData,
    resetToDefaults,
    clearAll
  }
})
