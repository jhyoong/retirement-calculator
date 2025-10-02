import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRetirementStore } from './stores/retirement'
import { useIncomeStore } from './stores/income'
import { useExpenseStore } from './stores/expense'
import { exportData, validateImportedData } from './utils/importExport'
import type { UserData } from './types'

describe('Phase 2 Integration Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Clear default expenses to avoid interference with Phase 2 tests
    const expenseStore = useExpenseStore()
    expenseStore.expenses = []
  })

  describe('End-to-End: Income Sources Flow', () => {
    it('completes full workflow: add income sources, calculate, export, import', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()

      // Step 1: Add income sources
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

      // Step 2: Add one-off return
      incomeStore.addOneOffReturn({
        id: '1',
        date: '2026-12',
        amount: 20000,
        description: 'Year-end bonus'
      })

      // Step 3: Verify total monthly income
      expect(incomeStore.totalMonthlyIncome).toBe(8000)

      // Step 4: Calculate retirement
      const results = retirementStore.results
      expect(results).not.toBeNull()
      expect(results!.futureValue).toBeGreaterThan(0)
      expect(results!.totalContributions).toBeGreaterThan(50000) // Initial + contributions

      // Step 5: Export data
      const exported = exportData(retirementStore.userData)
      expect(exported.user.incomeSources).toHaveLength(2)
      expect(exported.user.oneOffReturns).toHaveLength(1)

      // Step 6: Validate exported data
      expect(validateImportedData(exported)).toBe(true)

      // Step 7: Simulate import into new store
      const newPinia = createPinia()
      setActivePinia(newPinia)

      const newExpenseStore = useExpenseStore()
      newExpenseStore.expenses = [] // Clear default expenses BEFORE loadData

      const newRetirementStore = useRetirementStore()
      newRetirementStore.loadData(exported.user)

      // Step 8: Verify imported data
      const newIncomeStore = useIncomeStore()
      expect(newIncomeStore.incomeSources).toHaveLength(2)
      expect(newIncomeStore.oneOffReturns).toHaveLength(1)
      expect(newIncomeStore.totalMonthlyIncome).toBe(8000)

      // Step 9: Verify calculations are the same
      const newResults = newRetirementStore.results
      // Use toBeCloseTo for floating point comparison
      expect(newResults!.futureValue).toBeCloseTo(results!.futureValue, -2)
    })
  })


  describe('Complex Income Scenarios', () => {
    it('handles multiple income sources with different frequencies', () => {
      const incomeStore = useIncomeStore()

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Daily Gig',
        type: 'business',
        amount: 100,
        frequency: 'daily',
        startDate: '2025-01'
      })

      incomeStore.addIncomeSource({
        id: '2',
        name: 'Weekly Freelance',
        type: 'business',
        amount: 800,
        frequency: 'weekly',
        startDate: '2025-01'
      })

      incomeStore.addIncomeSource({
        id: '3',
        name: 'Annual Dividend',
        type: 'dividend',
        amount: 24000,
        frequency: 'yearly',
        startDate: '2025-01'
      })

      // Daily: 100 * 30.44 = 3044
      // Weekly: 800 * 52 / 12 ≈ 3466.67
      // Yearly: 24000 / 12 = 2000
      // Total: ~8510.67
      expect(incomeStore.totalMonthlyIncome).toBeCloseTo(8510.67, 0)
    })

    it('handles time-limited income sources', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()

      // Contract job for 2 years
      incomeStore.addIncomeSource({
        id: '1',
        name: 'Contract Position',
        type: 'salary',
        amount: 10000,
        frequency: 'monthly',
        startDate: '2025-01',
        endDate: '2027-01'
      })

      // Permanent job starting after contract
      incomeStore.addIncomeSource({
        id: '2',
        name: 'Permanent Role',
        type: 'salary',
        amount: 8000,
        frequency: 'monthly',
        startDate: '2027-02'
      })

      const results = retirementStore.results
      expect(results).not.toBeNull()
      expect(results!.futureValue).toBeGreaterThan(0)
    })

    it('handles custom frequency income sources', () => {
      const incomeStore = useIncomeStore()

      // Bi-weekly (every 14 days)
      incomeStore.addIncomeSource({
        id: '1',
        name: 'Bi-weekly Payment',
        type: 'salary',
        amount: 3000,
        frequency: 'custom',
        customFrequencyDays: 14,
        startDate: '2025-01'
      })

      // Should be approximately 3000 * 365.25 / 14 / 12 ≈ 6522.32 monthly
      expect(incomeStore.totalMonthlyIncome).toBeCloseTo(6522.32, 0)
    })
  })

  describe('Data Validation Integration', () => {
    it('validates income sources when calculating', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()

      // Add invalid income source (negative amount)
      incomeStore.addIncomeSource({
        id: '1',
        name: 'Invalid',
        type: 'salary',
        amount: -1000,
        frequency: 'monthly',
        startDate: '2025-01'
      })

      const validation = retirementStore.validation
      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    it('validates one-off returns', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()

      // Add invalid one-off return (zero amount)
      incomeStore.addOneOffReturn({
        id: '1',
        date: '2026-06',
        amount: 0,
        description: 'Invalid bonus'
      })

      const validation = retirementStore.validation
      expect(validation.isValid).toBe(false)
    })
  })

  describe('Store Synchronization', () => {
    it('synchronizes income store with retirement store on reset', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()

      // Add some data
      incomeStore.addIncomeSource({
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2025-01'
      })

      expect(incomeStore.incomeSources).toHaveLength(1)

      // Reset
      retirementStore.resetToDefaults()

      // Income sources should be cleared
      expect(incomeStore.incomeSources).toHaveLength(0)
      expect(incomeStore.oneOffReturns).toHaveLength(0)
    })
  })

})
