import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRetirementStore } from './stores/retirement'
import { useIncomeStore } from './stores/income'
import { generateMonthlyProjections, applyInflationAdjustment } from './utils/monthlyProjections'
import type { IncomeStream, OneOffReturn } from './types'

describe('Phase 3 Integration Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('End-to-end flow: Basic inputs to visualizations', () => {
    it('should generate monthly projections from store data (legacy mode)', () => {
      const store = useRetirementStore()

      store.updateCurrentAge(30)
      store.updateRetirementAge(35)
      store.updateCurrentSavings(10000)
      store.updateMonthlyContribution(1000)
      store.updateExpectedReturnRate(0.07)
      store.updateInflationRate(0.03)

      const projections = generateMonthlyProjections(store.userData)

      expect(projections).toHaveLength(60) // 5 years * 12 months
      expect(projections[0].age).toBe(30)
      expect(projections[59].age).toBeCloseTo(34.92, 2)

      // Verify last month matches store results
      if (store.results) {
        const lastMonth = projections[projections.length - 1]
        expect(lastMonth.portfolioValue).toBeGreaterThan(0)
        expect(lastMonth.contributions).toBeGreaterThan(0)
      }
    })

    it('should generate monthly projections with income sources (Phase 2 mode)', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()

      retirementStore.updateCurrentAge(30)
      retirementStore.updateRetirementAge(35)
      retirementStore.updateCurrentSavings(10000)
      retirementStore.updateExpectedReturnRate(0.07)
      retirementStore.updateInflationRate(0.03)

      const incomeSource: IncomeStream = {
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2025-01',
        endDate: '2027-01'
      }

      incomeStore.addIncomeSource(incomeSource)

      const projections = generateMonthlyProjections(retirementStore.userData)

      expect(projections).toHaveLength(60)

      // First 24 months should have income
      expect(projections[0].income).toBe(5000)
      expect(projections[23].income).toBe(5000)

      // After endDate, no income
      expect(projections[24].income).toBe(0)
    })

    it('should apply inflation adjustment correctly', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()

      retirementStore.updateCurrentAge(30)
      retirementStore.updateRetirementAge(35)
      retirementStore.updateCurrentSavings(50000)
      retirementStore.updateExpectedReturnRate(0.08)
      retirementStore.updateInflationRate(0.04)

      // Use income source for consistency with calculation method
      const incomeSource: IncomeStream = {
        id: '1',
        name: 'Monthly Savings',
        type: 'custom',
        amount: 2000,
        frequency: 'monthly',
        startDate: '2025-01'
      }
      incomeStore.addIncomeSource(incomeSource)

      const nominal = generateMonthlyProjections(retirementStore.userData)
      const adjusted = applyInflationAdjustment(nominal, retirementStore.userData.inflationRate)

      // Inflation-adjusted values should be less than nominal
      const lastMonthNominal = nominal[nominal.length - 1]
      const lastMonthAdjusted = adjusted[adjusted.length - 1]

      expect(lastMonthAdjusted.portfolioValue).toBeLessThan(lastMonthNominal.portfolioValue)

      // Match the store's inflationAdjustedValue
      if (retirementStore.results) {
        expect(lastMonthAdjusted.portfolioValue).toBeCloseTo(retirementStore.results.inflationAdjustedValue, 0)
      }
    })
  })

  describe('Toggle between nominal and inflation-adjusted', () => {
    it('should maintain data integrity when toggling', () => {
      const store = useRetirementStore()

      store.updateCurrentAge(25)
      store.updateRetirementAge(40)
      store.updateCurrentSavings(20000)
      store.updateMonthlyContribution(1500)
      store.updateExpectedReturnRate(0.06)
      store.updateInflationRate(0.025)

      const nominal = generateMonthlyProjections(store.userData)
      const adjusted = applyInflationAdjustment(nominal, store.userData.inflationRate)

      // Number of data points should be the same
      expect(nominal.length).toBe(adjusted.length)

      // Month indices and dates should be identical
      nominal.forEach((point, index) => {
        expect(adjusted[index].monthIndex).toBe(point.monthIndex)
        expect(adjusted[index].year).toBe(point.year)
        expect(adjusted[index].month).toBe(point.month)
        expect(adjusted[index].age).toBe(point.age)
      })
    })

    it('should show no difference with zero inflation', () => {
      const store = useRetirementStore()

      store.updateCurrentAge(30)
      store.updateRetirementAge(35)
      store.updateCurrentSavings(10000)
      store.updateMonthlyContribution(1000)
      store.updateExpectedReturnRate(0.07)
      store.updateInflationRate(0) // Zero inflation

      const nominal = generateMonthlyProjections(store.userData)
      const adjusted = applyInflationAdjustment(nominal, 0)

      // Values should be identical
      nominal.forEach((point, index) => {
        expect(adjusted[index].portfolioValue).toBeCloseTo(point.portfolioValue, 2)
        expect(adjusted[index].contributions).toBeCloseTo(point.contributions, 2)
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle very short retirement timeline (1 year)', () => {
      const store = useRetirementStore()

      store.updateCurrentAge(64)
      store.updateRetirementAge(65)
      store.updateCurrentSavings(500000)
      store.updateMonthlyContribution(0)
      store.updateExpectedReturnRate(0.05)
      store.updateInflationRate(0.02)

      const projections = generateMonthlyProjections(store.userData)

      expect(projections).toHaveLength(12)
      expect(projections[0].age).toBe(64)
      expect(projections[11].age).toBeCloseTo(64.92, 2)
    })

    it('should handle very long retirement timeline (40 years)', () => {
      const store = useRetirementStore()

      store.updateCurrentAge(25)
      store.updateRetirementAge(65)
      store.updateCurrentSavings(5000)
      store.updateMonthlyContribution(500)
      store.updateExpectedReturnRate(0.07)
      store.updateInflationRate(0.03)

      const projections = generateMonthlyProjections(store.userData)

      expect(projections).toHaveLength(480) // 40 years * 12 months
      expect(projections[0].age).toBe(25)
      expect(projections[479].age).toBeCloseTo(64.92, 2)
    })

    it('should handle zero interest rate', () => {
      const store = useRetirementStore()

      store.updateCurrentAge(30)
      store.updateRetirementAge(35)
      store.updateCurrentSavings(10000)
      store.updateMonthlyContribution(1000)
      store.updateExpectedReturnRate(0)
      store.updateInflationRate(0)

      const projections = generateMonthlyProjections(store.userData)

      const lastMonth = projections[projections.length - 1]
      const expected = 10000 + (1000 * 60)

      expect(lastMonth.portfolioValue).toBe(expected)
    })

    it('should handle mixed income sources with one-off returns', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()

      retirementStore.updateCurrentAge(30)
      retirementStore.updateRetirementAge(32)
      retirementStore.updateCurrentSavings(0)
      retirementStore.updateExpectedReturnRate(0)
      retirementStore.updateInflationRate(0)

      const incomeSource: IncomeStream = {
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2025-01'
      }

      const oneOffReturn: OneOffReturn = {
        id: '1',
        date: '2025-12',
        amount: 50000,
        description: 'Bonus'
      }

      incomeStore.addIncomeSource(incomeSource)
      incomeStore.addOneOffReturn(oneOffReturn)

      const projections = generateMonthlyProjections(retirementStore.userData)

      // Month 11 (December) should have both salary and bonus
      expect(projections[11].income).toBe(55000)

      // Other months should have only salary
      expect(projections[0].income).toBe(5000)
      expect(projections[10].income).toBe(5000)
      expect(projections[12].income).toBe(5000)
    })
  })

  describe('Data consistency across stores', () => {
    it('should reflect changes in income store in monthly projections', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()

      retirementStore.updateCurrentAge(30)
      retirementStore.updateRetirementAge(32)
      retirementStore.updateCurrentSavings(0)
      retirementStore.updateExpectedReturnRate(0)
      retirementStore.updateInflationRate(0)

      const incomeSource: IncomeStream = {
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2025-01'
      }

      incomeStore.addIncomeSource(incomeSource)

      const projections1 = generateMonthlyProjections(retirementStore.userData)
      expect(projections1[0].income).toBe(5000)

      // Update income amount
      incomeStore.updateIncomeSource('1', { amount: 6000 })

      const projections2 = generateMonthlyProjections(retirementStore.userData)
      expect(projections2[0].income).toBe(6000)
    })

    it('should handle store reset correctly', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()

      retirementStore.updateCurrentAge(40)
      retirementStore.updateRetirementAge(50)

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2025-01'
      })

      retirementStore.resetToDefaults()

      const projections = generateMonthlyProjections(retirementStore.userData)

      // Should use default values
      expect(projections).toHaveLength(35 * 12) // Age 30 to 65
      expect(retirementStore.currentAge).toBe(30)
      expect(incomeStore.incomeSources).toHaveLength(0)
    })
  })
})
