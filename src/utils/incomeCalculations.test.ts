import { describe, it, expect } from 'vitest'
import { calculateRetirement, calculateFutureValueWithIncomeSources } from './calculations'
import type { UserData, IncomeStream, OneOffReturn } from '@/types'

describe('Income-based Calculations', () => {
  describe('calculateFutureValueWithIncomeSources', () => {
    it('calculates with single monthly income source', () => {
      const incomeSources: IncomeStream[] = [{
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 1000,
        frequency: 'monthly',
        startDate: '2025-01',
      }]

      const result = calculateFutureValueWithIncomeSources(
        10000, // principal
        0.07, // 7% annual rate
        10, // years
        30, // current age
        incomeSources,
        []
      )

      // Should be similar to standard calculation
      expect(result.futureValue).toBeGreaterThan(0)
      expect(result.totalContributions).toBeGreaterThan(10000)
    })

    it('calculates with multiple income sources', () => {
      const incomeSources: IncomeStream[] = [
        {
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 3000,
          frequency: 'monthly',
          startDate: '2025-01',
        },
        {
          id: '2',
          name: 'Rental',
          type: 'rental',
          amount: 1000,
          frequency: 'monthly',
          startDate: '2025-01',
        }
      ]

      const result = calculateFutureValueWithIncomeSources(
        50000,
        0.07,
        5,
        30,
        incomeSources,
        []
      )

      // Total monthly contribution = 4000
      // Over 5 years = 60 months
      // Total contributions should be 50000 + (4000 * 60) = 290000 + growth
      expect(result.totalContributions).toBeCloseTo(290000, -3)
      expect(result.futureValue).toBeGreaterThan(result.totalContributions)
    })

    it('handles income source with start and end dates', () => {
      const incomeSources: IncomeStream[] = [{
        id: '1',
        name: 'Contract',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2025-01',
        endDate: '2025-12', // Only 1 year
      }]

      const result = calculateFutureValueWithIncomeSources(
        10000,
        0.07,
        5,
        30,
        incomeSources,
        []
      )

      // Contributions for 12 months only
      // 10000 + (5000 * 12) = 70000 + growth
      expect(result.totalContributions).toBeLessThan(100000)
    })

    it('handles different frequency income sources', () => {
      const incomeSources: IncomeStream[] = [
        {
          id: '1',
          name: 'Weekly Gig',
          type: 'business',
          amount: 500,
          frequency: 'weekly',
          startDate: '2025-01',
        },
        {
          id: '2',
          name: 'Annual Dividend',
          type: 'dividend',
          amount: 12000,
          frequency: 'yearly',
          startDate: '2025-01',
        }
      ]

      const result = calculateFutureValueWithIncomeSources(
        20000,
        0.05,
        3,
        35,
        incomeSources,
        []
      )

      // Weekly: 500 * 52 / 12 ≈ 2166.67 per month
      // Yearly: 12000 / 12 = 1000 per month
      // Total: ~3166.67 per month
      expect(result.futureValue).toBeGreaterThan(20000)
    })

    it('includes one-off returns in calculations', () => {
      const incomeSources: IncomeStream[] = [{
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 2000,
        frequency: 'monthly',
        startDate: '2025-01',
      }]

      const oneOffReturns: OneOffReturn[] = [
        {
          id: '1',
          date: '2025-06',
          amount: 10000,
          description: 'Bonus'
        },
        {
          id: '2',
          date: '2026-06',
          amount: 10000,
          description: 'Bonus Year 2'
        }
      ]

      const result = calculateFutureValueWithIncomeSources(
        5000,
        0.06,
        3,
        28,
        incomeSources,
        oneOffReturns
      )

      // Should include the two bonuses in total contributions
      expect(result.totalContributions).toBeGreaterThan(5000 + 20000)
    })

    it('handles zero interest rate', () => {
      const incomeSources: IncomeStream[] = [{
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 1000,
        frequency: 'monthly',
        startDate: '2025-01',
      }]

      const result = calculateFutureValueWithIncomeSources(
        10000,
        0, // 0% interest
        2,
        30,
        incomeSources,
        []
      )

      // With 0% interest, future value = total contributions
      // 10000 + (1000 * 24) = 34000
      expect(result.futureValue).toBeCloseTo(34000, 0)
      expect(result.totalContributions).toBe(34000)
    })

    it('handles empty income sources', () => {
      const result = calculateFutureValueWithIncomeSources(
        15000,
        0.05,
        5,
        25,
        [],
        []
      )

      // Only principal with growth, no contributions
      expect(result.totalContributions).toBe(15000)
      expect(result.futureValue).toBeGreaterThan(15000)
    })
  })

  describe('calculateRetirement with income sources', () => {
    it('uses income sources when provided', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 3000,
          frequency: 'monthly',
          startDate: '2025-01',
        }],
        oneOffReturns: []
      }

      const result = calculateRetirement(userData)

      expect(result.futureValue).toBeGreaterThan(0)
      expect(result.yearsToRetirement).toBe(35)
      expect(result.investmentGrowth).toBeGreaterThan(0)
    })

  })
})
