import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRetirementStore } from '../stores/retirement'
import { useIncomeStore } from '../stores/income'
import { useExpenseStore } from '../stores/expense'

describe('Income Integration Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Clear default expenses to avoid interference
    const expenseStore = useExpenseStore()
    expenseStore.expenses = []
  })

  describe('Income source calculations', () => {
    it('should handle multiple income sources with different frequencies', () => {
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

    it('should handle custom frequency income sources', () => {
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

  describe('Time-limited income sources', () => {
    it('should calculate correctly with time-limited income sources', () => {
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

      retirementStore.calculate()
      const results = retirementStore.results
      expect(results).not.toBeNull()
      expect(results!.futureValue).toBeGreaterThan(0)
    })
  })

  describe('One-off returns', () => {
    it('should include one-off returns in calculations', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()

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

      retirementStore.calculate()
      const results = retirementStore.results
      expect(results).not.toBeNull()
      expect(results!.futureValue).toBeGreaterThan(0)
      expect(results!.totalContributions).toBeGreaterThan(50000)
    })
  })

  describe('Validation', () => {
    it('should validate income sources', () => {
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

    it('should validate one-off returns', () => {
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

  describe('Store synchronization', () => {
    it('should synchronize income store with retirement store on reset', () => {
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
