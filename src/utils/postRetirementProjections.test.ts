import { describe, it, expect } from 'vitest'
import { generatePostRetirementProjections, calculateInitialMonthlyExpenses } from './postRetirementProjections'
import type { UserData, RetirementExpense } from '@/types'

describe('postRetirementProjections', () => {
  const baseUserData: UserData = {
    currentAge: 30,
    retirementAge: 65,
    currentSavings: 1000000, // Start with $1M at retirement
    monthlyContribution: 0,
    expectedReturnRate: 0.06, // 6% annual
    inflationRate: 0.03
  }

  const basicExpenses: RetirementExpense[] = [
    {
      id: '1',
      name: 'Living Expenses',
      category: 'living',
      monthlyAmount: 3000,
      inflationRate: 0.03
    }
  ]

  describe('Basic projection generation', () => {
    it('should generate projections from retirement to max age', () => {
      const data: UserData = {
        ...baseUserData,
        expenses: basicExpenses
      }

      const projections = generatePostRetirementProjections(data, 95)

      // Should generate data up to age 95 (30 years * 12 months)
      expect(projections.length).toBeGreaterThan(0)
      expect(projections.length).toBeLessThanOrEqual(30 * 12)

      // First month should start at retirement age
      expect(projections[0].age).toBe(65)

      // Last month should be close to max age or when depleted
      const lastProjection = projections[projections.length - 1]
      expect(lastProjection.age).toBeGreaterThan(65)
    })

    it('should stop at depletion before max age', () => {
      const data: UserData = {
        ...baseUserData,
        currentSavings: 100000, // Small portfolio
        expectedReturnRate: 0, // No growth
        expenses: [
          {
            id: '1',
            name: 'High Expenses',
            category: 'living',
            monthlyAmount: 5000, // High expenses
            inflationRate: 0.03
          }
        ]
      }

      const projections = generatePostRetirementProjections(data, 95)

      // Should deplete before age 95
      const lastProjection = projections[projections.length - 1]
      expect(lastProjection.age).toBeLessThan(95)
      expect(lastProjection.portfolioValue).toBe(0)
    })

    it('should handle zero expenses edge case', () => {
      const data: UserData = {
        ...baseUserData,
        expenses: []
      }

      const projections = generatePostRetirementProjections(data, 95)

      // Should return empty array when no expenses
      expect(projections).toEqual([])
    })

    it('should handle zero portfolio edge case', () => {
      const data: UserData = {
        ...baseUserData,
        currentSavings: 0,
        expenses: basicExpenses
      }

      const projections = generatePostRetirementProjections(data, 95)

      // Should return empty or very short array
      expect(projections.length).toBeLessThanOrEqual(1)
    })

    it('should handle zero return rate', () => {
      const data: UserData = {
        ...baseUserData,
        currentSavings: 500000,
        expectedReturnRate: 0,
        expenses: basicExpenses
      }

      const projections = generatePostRetirementProjections(data, 95)

      expect(projections.length).toBeGreaterThan(0)

      // Portfolio should decline steadily with no growth
      expect(projections[0].portfolioValue).toBeLessThan(500000)
      expect(projections[11].portfolioValue).toBeLessThan(projections[0].portfolioValue)
    })
  })

  describe('Expense-based withdrawals', () => {
    it('should withdraw based on expenses', () => {
      const data: UserData = {
        ...baseUserData,
        expenses: basicExpenses
      }

      const projections = generatePostRetirementProjections(data, 95)

      // Withdrawals should equal expenses each month
      projections.forEach(p => {
        expect(p.expenses).toBeGreaterThan(0)
      })
    })

    it('should handle high expenses causing depletion', () => {
      const data: UserData = {
        ...baseUserData,
        expenses: [
          {
            id: '1',
            name: 'High Expenses',
            category: 'living',
            monthlyAmount: 10000,
            inflationRate: 0.03
          }
        ]
      }

      const projections = generatePostRetirementProjections(data, 95)

      // First month should have $10,000 expenses
      expect(projections[0].expenses).toBeGreaterThanOrEqual(10000)
    })
  })

  describe('Expense inflation', () => {
    it('should apply inflation to single category', () => {
      const data: UserData = {
        ...baseUserData,
        expenses: [
          {
            id: '1',
            name: 'Living',
            category: 'living',
            monthlyAmount: 1000,
            inflationRate: 0.03, // 3% annual
            startDate: '2060-10' // Start at retirement (age 30 + 35 years)
          }
        ]
      }

      const projections = generatePostRetirementProjections(data, 95)

      // First month should be ~$1000
      expect(projections[0].expenses).toBeCloseTo(1000, 0)

      // After 11 months (month index 11 = end of 11th month), should be inflated
      // Formula: 1000 * (1.03^(11/12)) ≈ 1027.47
      expect(projections[11].expenses).toBeGreaterThan(1000)
      expect(projections[11].expenses).toBeCloseTo(1027.47, 1)
    })

    it('should apply different inflation rates to multiple categories', () => {
      const data: UserData = {
        ...baseUserData,
        expenses: [
          {
            id: '1',
            name: 'Living',
            category: 'living',
            monthlyAmount: 2000,
            inflationRate: 0.03, // 3%
            startDate: '2060-10'
          },
          {
            id: '2',
            name: 'Healthcare',
            category: 'healthcare',
            monthlyAmount: 1000,
            inflationRate: 0.06, // 6%
            startDate: '2060-10'
          }
        ]
      }

      const projections = generatePostRetirementProjections(data, 95)

      // First month: $2000 + $1000 = $3000
      expect(projections[0].expenses).toBeCloseTo(3000, 0)

      // After 11 months: 2000*(1.03^(11/12)) + 1000*(1.06^(11/12)) ≈ 2054.94 + 1054.86 = 3109.8
      expect(projections[11].expenses).toBeCloseTo(3109.8, 1)
    })

    it('should compound inflation correctly over multiple years', () => {
      const data: UserData = {
        ...baseUserData,
        expenses: [
          {
            id: '1',
            name: 'Living',
            category: 'living',
            monthlyAmount: 1000,
            inflationRate: 0.03,
            startDate: '2060-10'
          }
        ]
      }

      const projections = generatePostRetirementProjections(data, 95)

      // After 119 months (month index 119): 1000 * (1.03^(119/12)) ≈ 1340.61
      const year10 = projections[119]
      expect(year10.expenses).toBeCloseTo(1340.61, 1)
    })

    it('should handle zero inflation', () => {
      const data: UserData = {
        ...baseUserData,
        expenses: [
          {
            id: '1',
            name: 'Living',
            category: 'living',
            monthlyAmount: 5000,
            inflationRate: 0
          }
        ]
      }

      const projections = generatePostRetirementProjections(data, 95)

      // Expenses should remain constant
      expect(projections[0].expenses).toBe(5000)
      expect(projections[12].expenses).toBe(5000)
      expect(projections[60].expenses).toBe(5000)
    })
  })

  describe('Age-based expense filtering', () => {
    it('should include expense that starts mid-retirement', () => {
      const data: UserData = {
        ...baseUserData,
        retirementAge: 65,
        expenses: [
          {
            id: '1',
            name: 'Basic',
            category: 'living',
            monthlyAmount: 2000,
            inflationRate: 0
          },
          {
            id: '2',
            name: 'Travel',
            category: 'travel',
            monthlyAmount: 1000,
            inflationRate: 0,
            startDate: '2065-10' // Starts 5 years after retirement (2060-10)
          }
        ]
      }

      const projections = generatePostRetirementProjections(data, 95)

      // At age 65 (first month): only $2000
      expect(projections[0].expenses).toBe(2000)

      // At age 70 (60 months later): $2000 + $1000 = $3000
      const age70Month = projections.find(p => p.age >= 70)
      expect(age70Month).toBeDefined()
      expect(age70Month!.expenses).toBeGreaterThanOrEqual(3000)
    })

    it('should exclude expense that ends mid-retirement', () => {
      const data: UserData = {
        ...baseUserData,
        retirementAge: 65,
        expenses: [
          {
            id: '1',
            name: 'Basic',
            category: 'living',
            monthlyAmount: 2000,
            inflationRate: 0
          },
          {
            id: '2',
            name: 'Travel',
            category: 'travel',
            monthlyAmount: 1000,
            inflationRate: 0,
            endDate: '2070-10' // Ends 10 years after retirement (2060-10)
          }
        ]
      }

      const projections = generatePostRetirementProjections(data, 95)

      // At age 65: $2000 + $1000 = $3000
      expect(projections[0].expenses).toBe(3000)

      // At age 75+: only $2000
      const age75Plus = projections.find(p => p.age >= 75)
      expect(age75Plus).toBeDefined()
      expect(age75Plus!.expenses).toBe(2000)
    })

    it('should handle multiple expenses with different age ranges', () => {
      const data: UserData = {
        ...baseUserData,
        retirementAge: 65,
        expenses: [
          {
            id: '1',
            name: 'Basic',
            category: 'living',
            monthlyAmount: 2000,
            inflationRate: 0
          },
          {
            id: '2',
            name: 'Early Travel',
            category: 'travel',
            monthlyAmount: 1000,
            inflationRate: 0,
            startDate: '2060-10',
            endDate: '2070-10'
          },
          {
            id: '3',
            name: 'Healthcare',
            category: 'healthcare',
            monthlyAmount: 500,
            inflationRate: 0,
            startDate: '2070-10'
          }
        ]
      }

      const projections = generatePostRetirementProjections(data, 95)

      // Age 65-74: $2000 + $1000 = $3000
      const age65 = projections[0]
      expect(age65.expenses).toBe(3000)

      // Age 75+: $2000 + $500 = $2500
      const age75Plus = projections.find(p => p.age >= 75)
      expect(age75Plus).toBeDefined()
      expect(age75Plus!.expenses).toBe(2500)
    })
  })

  describe('Portfolio depletion detection', () => {
    it('should detect exact month of depletion', () => {
      const data: UserData = {
        ...baseUserData,
        currentSavings: 50000,
        expectedReturnRate: 0,
        expenses: [
          {
            id: '1',
            name: 'Living',
            category: 'living',
            monthlyAmount: 5000,
            inflationRate: 0
          }
        ]
      }

      const projections = generatePostRetirementProjections(data, 95)

      // Should deplete in ~10 months
      expect(projections.length).toBeCloseTo(10, 0)

      const lastMonth = projections[projections.length - 1]
      expect(lastMonth.portfolioValue).toBe(0)
    })

    it('should show sustainable portfolio that never depletes', () => {
      const data: UserData = {
        ...baseUserData,
        currentSavings: 2000000,
        expectedReturnRate: 0.06, // 6% annual
        expenses: [
          {
            id: '1',
            name: 'Living',
            category: 'living',
            monthlyAmount: 3000,
            inflationRate: 0.03
          }
        ]
      }

      const projections = generatePostRetirementProjections(data, 95)

      // Should project to max age without depleting
      const lastMonth = projections[projections.length - 1]
      expect(lastMonth.age).toBeGreaterThan(90)
      expect(lastMonth.portfolioValue).toBeGreaterThan(0)
    })
  })

  describe('calculateInitialMonthlyExpenses', () => {
    it('should calculate total monthly expenses at retirement age', () => {
      const expenses: RetirementExpense[] = [
        {
          id: '1',
          name: 'Living',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 0.03
        },
        {
          id: '2',
          name: 'Healthcare',
          category: 'healthcare',
          monthlyAmount: 1000,
          inflationRate: 0.06
        }
      ]

      const total = calculateInitialMonthlyExpenses(expenses, 65, 30)
      expect(total).toBe(4000)
    })

    it('should exclude expenses not active at retirement age', () => {
      const expenses: RetirementExpense[] = [
        {
          id: '1',
          name: 'Living',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 0.03
        },
        {
          id: '2',
          name: 'Future Expense',
          category: 'travel',
          monthlyAmount: 2000,
          inflationRate: 0.03,
          startDate: '2065-10' // Starts 5 years after retirement (2060-10)
        }
      ]

      const total = calculateInitialMonthlyExpenses(expenses, 65, 30)
      expect(total).toBe(3000) // Only living expenses
    })

    it('should handle empty expense array', () => {
      const total = calculateInitialMonthlyExpenses([], 65, 30)
      expect(total).toBe(0)
    })
  })

  describe('Data point structure validation', () => {
    it('should include all required fields in each data point', () => {
      const data: UserData = {
        ...baseUserData,
        expenses: basicExpenses
      }

      const projections = generatePostRetirementProjections(data, 95)

      const point = projections[0]
      expect(point).toHaveProperty('monthIndex')
      expect(point).toHaveProperty('year')
      expect(point).toHaveProperty('month')
      expect(point).toHaveProperty('age')
      expect(point).toHaveProperty('expenses')
      expect(point).toHaveProperty('portfolioValue')
      expect(point).toHaveProperty('growth')
    })

    it('should round monetary values to 2 decimal places', () => {
      const data: UserData = {
        ...baseUserData,
        expenses: basicExpenses
      }

      const projections = generatePostRetirementProjections(data, 95)

      projections.forEach(point => {
        expect(point.expenses.toString()).toMatch(/^\d+(\.\d{1,2})?$/)
        expect(point.portfolioValue.toString()).toMatch(/^\d+(\.\d{1,2})?$/)
        expect(point.growth.toString()).toMatch(/^-?\d+(\.\d{1,2})?$/)
      })
    })
  })
})
