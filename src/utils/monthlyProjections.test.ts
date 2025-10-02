import { describe, it, expect } from 'vitest'
import { generateMonthlyProjections, applyInflationAdjustment } from './monthlyProjections'
import { calculateRetirement } from './calculations'
import type { UserData, IncomeStream, OneOffReturn } from '@/types'

// Helper to create date strings relative to current month
function getRelativeDate(monthsFromNow: number): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 0-indexed to 1-indexed
  const targetMonth = month + monthsFromNow
  const targetYear = year + Math.floor((targetMonth - 1) / 12)
  const finalMonth = ((targetMonth - 1) % 12) + 1
  return `${targetYear}-${String(finalMonth).padStart(2, '0')}`
}

describe('monthlyProjections', () => {
  describe('generateMonthlyProjections', () => {
    it('should generate correct number of monthly data points', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 35, // 5 years = 60 months
        currentSavings: 10000,
        monthlyContribution: 1000,
        expectedReturnRate: 0.07,
        inflationRate: 0.03
      }

      const projections = generateMonthlyProjections(data)

      expect(projections).toHaveLength(60)
    })

    it('should start with initial savings as first portfolio value', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 32,
        currentSavings: 50000,
        monthlyContribution: 1000,
        expectedReturnRate: 0.07,
        inflationRate: 0.03
      }

      const projections = generateMonthlyProjections(data)

      // First month should have initial savings + contribution + growth
      expect(projections[0].contributions).toBeCloseTo(51000, 2)
      expect(projections[0].portfolioValue).toBeGreaterThan(51000)
    })

    it('should match total from calculateRetirement with income sources', () => {
      // Use income sources to ensure both use the same month-by-month calculation
      const incomeSources: IncomeStream[] = [
        {
          id: '1',
          name: 'Monthly Savings',
          type: 'custom',
          amount: 1500,
          frequency: 'monthly',
          startDate: getRelativeDate(0)
        }
      ]

      const data: UserData = {
        currentAge: 30,
        retirementAge: 40,
        currentSavings: 25000,
        monthlyContribution: 0, // Not used with income sources
        expectedReturnRate: 0.06,
        inflationRate: 0.02,
        incomeSources
      }

      const projections = generateMonthlyProjections(data)
      const lastMonth = projections[projections.length - 1]
      const result = calculateRetirement(data)

      // Portfolio values should match (within rounding)
      expect(lastMonth.portfolioValue).toBeCloseTo(result.futureValue, 0)
      expect(lastMonth.contributions).toBeCloseTo(result.totalContributions, 0)
    })

    it('should handle zero interest rate', () => {
      const data: UserData = {
        currentAge: 25,
        retirementAge: 30,
        currentSavings: 10000,
        monthlyContribution: 500,
        expectedReturnRate: 0,
        inflationRate: 0
      }

      const projections = generateMonthlyProjections(data)
      const lastMonth = projections[projections.length - 1]

      // With zero interest, final value = initial + (monthly * months)
      const expected = 10000 + (500 * 60)
      expect(lastMonth.portfolioValue).toBe(expected)
    })

    it('should handle variable income sources with start/end dates', () => {
      const incomeSources: IncomeStream[] = [
        {
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 5000,
          frequency: 'monthly',
          startDate: getRelativeDate(0),
          endDate: getRelativeDate(12) // 12 months from now
        }
      ]

      const data: UserData = {
        currentAge: 30,
        retirementAge: 33,
        currentSavings: 0,
        monthlyContribution: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        incomeSources
      }

      const projections = generateMonthlyProjections(data)

      // First 12 months should have income of 5000
      expect(projections[0].income).toBe(5000)
      expect(projections[11].income).toBe(5000)

      // Month 13 onwards should have no income
      expect(projections[12].income).toBe(0)
    })

    it('should handle ongoing income sources', () => {
      const incomeSources: IncomeStream[] = [
        {
          id: '1',
          name: 'Rental',
          type: 'rental',
          amount: 2000,
          frequency: 'monthly',
          startDate: getRelativeDate(0)
          // No endDate = ongoing
        }
      ]

      const data: UserData = {
        currentAge: 30,
        retirementAge: 32,
        currentSavings: 0,
        monthlyContribution: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        incomeSources
      }

      const projections = generateMonthlyProjections(data)

      // All months should have 2000 income
      projections.forEach((month) => {
        expect(month.income).toBe(2000)
      })
    })

    it('should convert different frequencies to monthly correctly', () => {
      const incomeSources: IncomeStream[] = [
        {
          id: '1',
          name: 'Yearly Bonus',
          type: 'salary',
          amount: 12000,
          frequency: 'yearly',
          startDate: getRelativeDate(0)
        }
      ]

      const data: UserData = {
        currentAge: 30,
        retirementAge: 31,
        currentSavings: 0,
        monthlyContribution: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        incomeSources
      }

      const projections = generateMonthlyProjections(data)

      // 12000 yearly = 1000 monthly
      expect(projections[0].income).toBe(1000)
    })

    it('should add one-off returns in correct month', () => {
      const oneOffReturns: OneOffReturn[] = [
        {
          id: '1',
          date: getRelativeDate(5), // 5 months from now (month index 5)
          amount: 50000,
          description: 'Bonus'
        }
      ]

      const data: UserData = {
        currentAge: 30,
        retirementAge: 32,
        currentSavings: 0,
        monthlyContribution: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        oneOffReturns
      }

      const projections = generateMonthlyProjections(data)

      // Month index 5 (6th month) should have the one-off return
      expect(projections[5].income).toBe(50000)

      // Other months should have no income
      expect(projections[0].income).toBe(0)
      expect(projections[4].income).toBe(0)
      expect(projections[6].income).toBe(0)
    })

    it('should combine multiple income sources', () => {
      const incomeSources: IncomeStream[] = [
        {
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 5000,
          frequency: 'monthly',
          startDate: getRelativeDate(0)
        },
        {
          id: '2',
          name: 'Rental',
          type: 'rental',
          amount: 1500,
          frequency: 'monthly',
          startDate: getRelativeDate(0)
        }
      ]

      const data: UserData = {
        currentAge: 30,
        retirementAge: 31,
        currentSavings: 0,
        monthlyContribution: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        incomeSources
      }

      const projections = generateMonthlyProjections(data)

      // Should combine both income sources
      expect(projections[0].income).toBe(6500)
    })

    it('should track cumulative contributions correctly', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 31,
        currentSavings: 10000,
        monthlyContribution: 1000,
        expectedReturnRate: 0,
        inflationRate: 0
      }

      const projections = generateMonthlyProjections(data)

      expect(projections[0].contributions).toBe(11000) // 10000 + 1000
      expect(projections[1].contributions).toBe(12000) // 10000 + 2000
      expect(projections[11].contributions).toBe(22000) // 10000 + 12000
    })

    it('should calculate growth correctly with interest', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 31,
        currentSavings: 10000,
        monthlyContribution: 0,
        expectedReturnRate: 0.12, // 1% monthly
        inflationRate: 0
      }

      const projections = generateMonthlyProjections(data)

      // First month: 10000 * 1.01 = 10100, growth = 100
      expect(projections[0].growth).toBeCloseTo(100, 0)
    })

    it('should not decrease contributions when expenses exceed income', () => {
      const incomeSources: IncomeStream[] = [
        {
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 1000,
          frequency: 'monthly',
          startDate: getRelativeDate(0)
        }
      ]

      const data: UserData = {
        currentAge: 30,
        retirementAge: 31,
        currentSavings: 50000,
        monthlyContribution: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        incomeSources,
        expenses: [
          {
            id: '1',
            name: 'High Expenses',
            category: 'living',
            monthlyAmount: 2000, // Exceeds income by 1000
            inflationRate: 0
          }
        ]
      }

      const projections = generateMonthlyProjections(data)

      // First month: income (1000) - expenses (2000) = -1000 net
      // Contributions should be: 50000 (initial) + 0 (no positive contribution)
      expect(projections[0].contributions).toBe(50000)

      // Portfolio should decrease by 1000 (withdrawal)
      expect(projections[0].portfolioValue).toBe(49000)

      // All months should have same contribution (no new money flowing in)
      projections.forEach((month) => {
        expect(month.contributions).toBe(50000)
      })
    })

    it('should only add to contributions when income exceeds expenses', () => {
      const incomeSources: IncomeStream[] = [
        {
          id: '1',
          name: 'Variable Income',
          type: 'salary',
          amount: 3000,
          frequency: 'monthly',
          startDate: getRelativeDate(0),
          endDate: getRelativeDate(6) // Only first 6 months
        }
      ]

      const data: UserData = {
        currentAge: 30,
        retirementAge: 31,
        currentSavings: 10000,
        monthlyContribution: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        incomeSources,
        expenses: [
          {
            id: '1',
            name: 'Expenses',
            category: 'living',
            monthlyAmount: 2000,
            inflationRate: 0
          }
        ]
      }

      const projections = generateMonthlyProjections(data)

      // First 6 months: 3000 income - 2000 expenses = 1000 net contribution per month
      expect(projections[0].contributions).toBe(11000) // 10000 + 1000
      expect(projections[5].contributions).toBe(16000) // 10000 + 6000

      // After month 6: 0 income - 2000 expenses = -2000 net (withdrawal)
      // Contributions should stay at 16000 (no new money flowing in)
      expect(projections[6].contributions).toBe(16000)
      expect(projections[11].contributions).toBe(16000)

      // Portfolio should still decrease from withdrawals
      expect(projections[6].portfolioValue).toBeLessThan(projections[5].portfolioValue)
    })

    it('should never have negative contributions', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 32,
        currentSavings: 5000,
        monthlyContribution: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        expenses: [
          {
            id: '1',
            name: 'Heavy Expenses',
            category: 'living',
            monthlyAmount: 1000,
            inflationRate: 0
          }
        ]
      }

      const projections = generateMonthlyProjections(data)

      // All contributions should be non-negative
      projections.forEach((month) => {
        expect(month.contributions).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('applyInflationAdjustment', () => {
    it('should reduce values based on inflation rate', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 32,
        currentSavings: 10000,
        monthlyContribution: 1000,
        expectedReturnRate: 0.07,
        inflationRate: 0.03
      }

      const projections = generateMonthlyProjections(data)
      const adjusted = applyInflationAdjustment(projections, data.inflationRate)

      // Adjusted values should be less than nominal
      const lastMonthNominal = projections[projections.length - 1]
      const lastMonthAdjusted = adjusted[adjusted.length - 1]

      expect(lastMonthAdjusted.portfolioValue).toBeLessThan(lastMonthNominal.portfolioValue)
      expect(lastMonthAdjusted.contributions).toBeLessThan(lastMonthNominal.contributions)
    })

    it('should not change values with zero inflation', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 32,
        currentSavings: 10000,
        monthlyContribution: 1000,
        expectedReturnRate: 0.07,
        inflationRate: 0
      }

      const projections = generateMonthlyProjections(data)
      const adjusted = applyInflationAdjustment(projections, 0)

      // Values should be identical
      projections.forEach((point, index) => {
        expect(adjusted[index].portfolioValue).toBeCloseTo(point.portfolioValue, 2)
        expect(adjusted[index].contributions).toBeCloseTo(point.contributions, 2)
      })
    })

    it('should apply increasing inflation over time', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 35,
        currentSavings: 10000,
        monthlyContribution: 1000,
        expectedReturnRate: 0.07,
        inflationRate: 0.03
      }

      const projections = generateMonthlyProjections(data)
      const adjusted = applyInflationAdjustment(projections, data.inflationRate)

      // Early months should have less inflation impact than later months
      const earlyDiscount = projections[0].portfolioValue - adjusted[0].portfolioValue
      const lateDiscount = projections[59].portfolioValue - adjusted[59].portfolioValue

      expect(lateDiscount).toBeGreaterThan(earlyDiscount)
    })

    it('should match inflationAdjustedValue from calculateRetirement', () => {
      const incomeSources: IncomeStream[] = [
        {
          id: '1',
          name: 'Monthly Savings',
          type: 'custom',
          amount: 1500,
          frequency: 'monthly',
          startDate: getRelativeDate(0)
        }
      ]

      const data: UserData = {
        currentAge: 30,
        retirementAge: 40,
        currentSavings: 25000,
        monthlyContribution: 0,
        expectedReturnRate: 0.06,
        inflationRate: 0.03,
        incomeSources
      }

      const projections = generateMonthlyProjections(data)
      const adjusted = applyInflationAdjustment(projections, data.inflationRate)
      const result = calculateRetirement(data)

      const lastMonth = adjusted[adjusted.length - 1]

      expect(lastMonth.portfolioValue).toBeCloseTo(result.inflationAdjustedValue, 0)
    })
  })
})
