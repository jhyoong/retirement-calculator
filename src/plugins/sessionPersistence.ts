import type { UserData } from '@/types'

const STORAGE_KEY = 'retirement-calculator-session'
const DEBOUNCE_DELAY = 1000 // 1 second

let saveTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Get all store data as UserData object
 */
function getStoreData(stores: {
  retirement: any
  income: any
  expense: any
  cpf: any
}): UserData {
  const { retirement, income, expense, cpf } = stores

  return {
    currentAge: retirement.currentAge,
    retirementAge: retirement.retirementAge,
    currentSavings: retirement.currentSavings,
    expectedReturnRate: retirement.expectedReturnRate,
    inflationRate: retirement.inflationRate,
    incomeSources: income.incomeSources.length > 0 ? income.incomeSources : undefined,
    oneOffReturns: income.oneOffReturns.length > 0 ? income.oneOffReturns : undefined,
    expenses: expense.expenses.length > 0 ? expense.expenses : undefined,
    loans: expense.loans.length > 0 ? expense.loans : undefined,
    oneTimeExpenses: expense.oneTimeExpenses.length > 0 ? expense.oneTimeExpenses : undefined,
    cpf: cpf.enabled ? cpf.cpfData : undefined
  }
}

/**
 * Save data to localStorage with debouncing
 */
function saveToLocalStorage(data: UserData): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }

  saveTimeout = setTimeout(() => {
    try {
      const sessionData = {
        exportDate: new Date().toISOString(),
        user: data
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData))
    } catch (error) {
      console.warn('Failed to save session data:', error)
      // If quota exceeded, clear old data and try again
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        try {
          localStorage.removeItem(STORAGE_KEY)
          console.warn('Cleared session data due to quota exceeded')
        } catch (clearError) {
          console.error('Failed to clear session data:', clearError)
        }
      }
    }
  }, DEBOUNCE_DELAY)
}

/**
 * Load data from localStorage and restore to stores
 */
export function loadSessionData(stores: {
  retirement: any
  income: any
  expense: any
  cpf: any
}): boolean {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY)
    if (!savedData) {
      return false
    }

    const sessionData = JSON.parse(savedData)

    // Basic validation
    if (!sessionData.user || typeof sessionData.user !== 'object') {
      console.warn('Invalid session data format, clearing...')
      localStorage.removeItem(STORAGE_KEY)
      return false
    }

    // Load data into retirement store (which will cascade to other stores)
    stores.retirement.loadData(sessionData.user)

    console.info('Session data restored from localStorage')
    return true
  } catch (error) {
    console.warn('Failed to load session data:', error)
    // Clear corrupted data
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (clearError) {
      console.error('Failed to clear corrupted session data:', clearError)
    }
    return false
  }
}

/**
 * Clear session data from localStorage
 */
export function clearSessionData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    console.info('Session data cleared')
  } catch (error) {
    console.error('Failed to clear session data:', error)
  }
}

/**
 * Setup session persistence watchers
 * Call this after all stores are initialized
 */
export function setupSessionPersistence(stores: {
  retirement: any
  income: any
  expense: any
  cpf: any
}): void {
  const saveData = () => {
    const userData = getStoreData(stores)
    saveToLocalStorage(userData)
  }

  // Subscribe to each store
  stores.retirement.$subscribe(saveData)
  stores.income.$subscribe(saveData)
  stores.expense.$subscribe(saveData)
  stores.cpf.$subscribe(saveData)
}
