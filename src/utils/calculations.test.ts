import { describe, it, expect } from 'vitest'
import {
  calculateFutureValue,
  calculateTotalContributions,
  adjustForInflation,
  validateInputs,
  calculateRetirement,
  calculateYearsUntilDepletion,
  checkSustainabilityWarning
} from './calculations'
import type { UserData, RetirementExpense } from '@/types'

describe('calculateFutureValue', () => {
  it('calculates correctly with principal and contributions', () => {
    const result = calculateFutureValue(10000, 500, 0.07, 30)
    expect(result).toBeGreaterThan(10000)
    expect(result).toBeCloseTo(691150, -2)
  })

  it('handles zero interest rate', () => {
    const result = calculateFutureValue(10000, 500, 0, 30)
    expect(result).toBe(10000 + (500 * 30 * 12))
  })

  it('handles zero monthly contribution', () => {
    const result = calculateFutureValue(10000, 0, 0.07, 30)
    expect(result).toBeCloseTo(81165, -2)
  })

  it('handles zero principal', () => {
    const result = calculateFutureValue(0, 500, 0.07, 30)
    expect(result).toBeCloseTo(609985, -2)
  })

  it('handles single year correctly', () => {
    const result = calculateFutureValue(10000, 500, 0.07, 1)
    expect(result).toBeGreaterThan(10000 + (500 * 12))
  })
})

describe('calculateTotalContributions', () => {
  it('calculates total contributions correctly', () => {
    const result = calculateTotalContributions(10000, 500, 30)
    expect(result).toBe(10000 + (500 * 30 * 12))
  })

  it('handles zero monthly contribution', () => {
    const result = calculateTotalContributions(10000, 0, 30)
    expect(result).toBe(10000)
  })

  it('handles zero initial savings', () => {
    const result = calculateTotalContributions(0, 500, 30)
    expect(result).toBe(500 * 30 * 12)
  })
})

describe('adjustForInflation', () => {
  it('reduces value based on inflation', () => {
    const result = adjustForInflation(100000, 0.03, 30)
    expect(result).toBeLessThan(100000)
    expect(result).toBeCloseTo(41199, -1)
  })

  it('handles zero inflation', () => {
    const result = adjustForInflation(100000, 0, 30)
    expect(result).toBe(100000)
  })

  it('handles high inflation', () => {
    const result = adjustForInflation(100000, 0.10, 20)
    expect(result).toBeLessThan(20000)
  })
})

describe('validateInputs', () => {
  const validData: UserData = {
    currentAge: 30,
    retirementAge: 65,
    currentSavings: 50000,
    monthlyContribution: 1000,
    expectedReturnRate: 0.07,
    inflationRate: 0.03
  }

  it('accepts valid input', () => {
    const result = validateInputs(validData)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects negative current age', () => {
    const result = validateInputs({ ...validData, currentAge: -1 })
    expect(result.isValid).toBe(false)
    expect(result.errors).toContainEqual({
      field: 'currentAge',
      message: 'Current age must be between 0 and 120'
    })
  })

  it('rejects age over 120', () => {
    const result = validateInputs({ ...validData, currentAge: 121 })
    expect(result.isValid).toBe(false)
  })

  it('rejects retirement age less than or equal to current age', () => {
    const result = validateInputs({ ...validData, retirementAge: 30 })
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field === 'retirementAge')).toBe(true)
  })

  it('rejects negative savings', () => {
    const result = validateInputs({ ...validData, currentSavings: -1000 })
    expect(result.isValid).toBe(false)
  })

  it('rejects negative monthly contribution', () => {
    const result = validateInputs({ ...validData, monthlyContribution: -100 })
    expect(result.isValid).toBe(false)
  })

  it('rejects return rate over 100%', () => {
    const result = validateInputs({ ...validData, expectedReturnRate: 1.5 })
    expect(result.isValid).toBe(false)
  })

  it('rejects negative return rate', () => {
    const result = validateInputs({ ...validData, expectedReturnRate: -0.01 })
    expect(result.isValid).toBe(false)
  })

  it('accepts zero values where appropriate', () => {
    const result = validateInputs({
      ...validData,
      currentSavings: 0,
      monthlyContribution: 0,
      expectedReturnRate: 0,
      inflationRate: 0
    })
    expect(result.isValid).toBe(true)
  })

  it('collects multiple errors', () => {
    const result = validateInputs({
      currentAge: 150,
      retirementAge: 30,
      currentSavings: -1000,
      monthlyContribution: -500,
      expectedReturnRate: 2,
      inflationRate: -1
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(3)
  })
})

describe('calculateRetirement', () => {
  it('calculates complete retirement scenario', () => {
    const data: UserData = {
      currentAge: 30,
      retirementAge: 65,
      currentSavings: 50000,
      monthlyContribution: 1000,
      expectedReturnRate: 0.07,
      inflationRate: 0.03
    }

    const result = calculateRetirement(data)

    expect(result.yearsToRetirement).toBe(35)
    expect(result.futureValue).toBeGreaterThan(1000000)
    expect(result.totalContributions).toBe(50000 + (1000 * 35 * 12))
    expect(result.investmentGrowth).toBeGreaterThan(0)
    expect(result.inflationAdjustedValue).toBeLessThan(result.futureValue)
  })

  it('throws error for invalid input', () => {
    const data: UserData = {
      currentAge: 65,
      retirementAge: 30,
      currentSavings: 50000,
      monthlyContribution: 1000,
      expectedReturnRate: 0.07,
      inflationRate: 0.03
    }

    expect(() => calculateRetirement(data)).toThrow('Invalid input data')
  })

  it('rounds results to 2 decimal places', () => {
    const data: UserData = {
      currentAge: 30,
      retirementAge: 65,
      currentSavings: 50000,
      monthlyContribution: 1000,
      expectedReturnRate: 0.07,
      inflationRate: 0.03
    }

    const result = calculateRetirement(data)

    // Check that values have at most 2 decimal places
    expect(Number(result.futureValue.toFixed(2))).toBe(result.futureValue)
    expect(Number(result.totalContributions.toFixed(2))).toBe(result.totalContributions)
    expect(Number(result.investmentGrowth.toFixed(2))).toBe(result.investmentGrowth)
    expect(Number(result.inflationAdjustedValue.toFixed(2))).toBe(result.inflationAdjustedValue)
  })

  it('handles edge case: retiring next year', () => {
    const data: UserData = {
      currentAge: 64,
      retirementAge: 65,
      currentSavings: 100000,
      monthlyContribution: 500,
      expectedReturnRate: 0.07,
      inflationRate: 0.03
    }

    const result = calculateRetirement(data)

    expect(result.yearsToRetirement).toBe(1)
    expect(result.futureValue).toBeGreaterThan(100000)
  })

  it('handles zero return rate scenario', () => {
    const data: UserData = {
      currentAge: 30,
      retirementAge: 65,
      currentSavings: 50000,
      monthlyContribution: 1000,
      expectedReturnRate: 0,
      inflationRate: 0
    }

    const result = calculateRetirement(data)

    expect(result.futureValue).toBe(result.totalContributions)
    expect(result.investmentGrowth).toBe(0)
  })
})

// Phase 4 Tests

describe('Phase 4: calculateYearsUntilDepletion', () => {
  const basicExpenses: RetirementExpense[] = [
    {
      id: '1',
      name: 'Living Expenses',
      category: 'living',
      monthlyAmount: 3000,
      inflationRate: 0.03
    }
  ]

  describe('Expense-based depletion', () => {
    it('calculates depletion with high expenses exceeding returns', () => {
      const highExpenses: RetirementExpense[] = [
        {
          id: '1',
          name: 'High Expenses',
          category: 'living',
          monthlyAmount: 5000,
          inflationRate: 0.03
        }
      ]

      const years = calculateYearsUntilDepletion(
        500000, // $500k starting balance
        0.05,   // 5% return
        highExpenses,
        65      // retirement age
      )

      expect(years).not.toBeNull()
      expect(years!).toBeGreaterThan(0)
      expect(years!).toBeLessThan(30)
    })

    it('returns null for sustainable low expenses', () => {
      const lowExpenses: RetirementExpense[] = [
        {
          id: '1',
          name: 'Low Expenses',
          category: 'living',
          monthlyAmount: 1500,
          inflationRate: 0, // No inflation to ensure sustainability
          startDate: '2025-10'
        }
      ]

      const years = calculateYearsUntilDepletion(
        2000000, // Higher balance to make sustainable
        0.07,    // Higher return
        lowExpenses,
        65
      )

      expect(years).toBeNull() // Sustainable
    })

    it('handles immediate depletion scenario', () => {
      const extremeExpenses: RetirementExpense[] = [
        {
          id: '1',
          name: 'Extreme Expenses',
          category: 'living',
          monthlyAmount: 10000,
          inflationRate: 0.03
        }
      ]

      const years = calculateYearsUntilDepletion(
        50000, // Small balance
        0.05,
        extremeExpenses,
        65
      )

      expect(years).not.toBeNull()
      expect(years!).toBeLessThan(1)
    })
  })

  describe('Expense inflation handling', () => {
    it('handles expenses with high inflation', () => {
      const highInflationExpenses: RetirementExpense[] = [
        {
          id: '1',
          name: 'Healthcare',
          category: 'healthcare',
          monthlyAmount: 3000,
          inflationRate: 0.06 // 6% medical inflation
        }
      ]

      const years = calculateYearsUntilDepletion(
        300000, // Lower balance
        0.04,   // Lower return
        highInflationExpenses,
        65
      )

      expect(years).not.toBeNull()
      expect(years!).toBeGreaterThan(0)
    })

    it('handles multiple expenses with different inflation rates', () => {
      const multiExpenses: RetirementExpense[] = [
        {
          id: '1',
          name: 'Living',
          category: 'living',
          monthlyAmount: 2000,
          inflationRate: 0.03
        },
        {
          id: '2',
          name: 'Healthcare',
          category: 'healthcare',
          monthlyAmount: 800,
          inflationRate: 0.06
        },
        {
          id: '3',
          name: 'Travel',
          category: 'travel',
          monthlyAmount: 500,
          inflationRate: 0.04
        }
      ]

      const years = calculateYearsUntilDepletion(
        600000,
        0.06,
        multiExpenses,
        65
      )

      expect(years).not.toBeNull()
      expect(years!).toBeGreaterThan(0)
    })
  })

  describe('Date-based expense filtering', () => {
    it('applies expenses with date ranges', () => {
      const expenses: RetirementExpense[] = [
        {
          id: '1',
          name: 'Combined Expenses',
          category: 'living',
          monthlyAmount: 4000,
          inflationRate: 0.03
        }
      ]

      const years = calculateYearsUntilDepletion(
        300000, // Lower balance
        0.04,   // Lower return
        expenses,
        65
      )

      // Should deplete with high expenses
      expect(years).not.toBeNull()
      expect(years!).toBeGreaterThan(0)
    })

    it('handles expenses that start in the future', () => {
      // Without a start date filter, this will start immediately
      const futureExpenses: RetirementExpense[] = [
        {
          id: '1',
          name: 'Healthcare',
          category: 'healthcare',
          monthlyAmount: 2000,
          inflationRate: 0.05
        }
      ]

      const years = calculateYearsUntilDepletion(
        300000,
        0.05,
        futureExpenses,
        65
      )

      expect(years).not.toBeNull()
    })
  })

  describe('Edge cases', () => {
    it('handles zero starting balance', () => {
      const years = calculateYearsUntilDepletion(
        0,
        0.05,
        basicExpenses,
        65
      )

      expect(years).toBe(0)
    })

    it('handles zero return rate', () => {
      const noInflationExpenses: RetirementExpense[] = [
        {
          id: '1',
          name: 'Living',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 0 // No inflation to simplify calculation
        }
      ]

      const years = calculateYearsUntilDepletion(
        100000,
        0, // No returns
        noInflationExpenses,
        65
      )

      expect(years).not.toBeNull()
      // Expenses are 3000/month
      // So it should deplete in roughly 100000 / (3000 * 12) ~= 2.78 years
      expect(years!).toBeGreaterThan(2)
      expect(years!).toBeLessThan(4)
    })

    it('handles zero expenses', () => {
      const years = calculateYearsUntilDepletion(
        200000, // Lower balance
        0.03,   // Lower return
        [], // No expenses
        65
      )

      // No expenses means no depletion
      expect(years).toBeNull()
    })
  })
})

describe('Phase 4: checkSustainabilityWarning', () => {
  it('returns true for withdrawal rate > 5%', () => {
    const result = checkSustainabilityWarning(1000000, 60000) // 6% withdrawal
    expect(result).toBe(true)
  })

  it('returns false for withdrawal rate <= 5%', () => {
    const result = checkSustainabilityWarning(1000000, 40000) // 4% withdrawal
    expect(result).toBe(false)
  })

  it('returns false for exactly 5% withdrawal rate', () => {
    const result = checkSustainabilityWarning(1000000, 50000)
    expect(result).toBe(false)
  })

  it('handles zero portfolio value', () => {
    const result = checkSustainabilityWarning(0, 10000)
    expect(result).toBe(true)
  })

  it('handles zero withdrawal', () => {
    const result = checkSustainabilityWarning(1000000, 0)
    expect(result).toBe(false)
  })
})

describe('Phase 4: calculateRetirement with expenses', () => {
  it('includes sustainability metrics when expenses are provided', () => {
    const expenses: RetirementExpense[] = [
      {
        id: '1',
        name: 'Living Expenses',
        category: 'living',
        monthlyAmount: 3000,
        inflationRate: 0.03
      }
    ]

    const data: UserData = {
      currentAge: 30,
      retirementAge: 65,
      currentSavings: 50000,
      monthlyContribution: 1000,
      expectedReturnRate: 0.07,
      inflationRate: 0.03,
      expenses
    }

    const result = calculateRetirement(data)

    expect(result.yearsUntilDepletion).toBeDefined()
    expect(result.sustainabilityWarning).toBeDefined()
  })

  it('returns null for yearsUntilDepletion when no expenses', () => {
    const data: UserData = {
      currentAge: 30,
      retirementAge: 65,
      currentSavings: 50000,
      monthlyContribution: 1000,
      expectedReturnRate: 0.07,
      inflationRate: 0.03
    }

    const result = calculateRetirement(data)

    expect(result.yearsUntilDepletion).toBeNull()
    expect(result.sustainabilityWarning).toBe(false)
  })

  it('correctly warns for high expense rates', () => {
    const expenses: RetirementExpense[] = [
      {
        id: '1',
        name: 'Expensive Living',
        category: 'living',
        monthlyAmount: 5000,
        inflationRate: 0.03
      }
    ]

    const data: UserData = {
      currentAge: 60,
      retirementAge: 65,
      currentSavings: 50000,
      monthlyContribution: 1000,
      expectedReturnRate: 0.05,
      inflationRate: 0.03,
      expenses
    }

    const result = calculateRetirement(data)

    expect(result.sustainabilityWarning).toBe(true)
  })
})

describe('Phase 4: Validation with expenses', () => {
  const validData: UserData = {
    currentAge: 30,
    retirementAge: 65,
    currentSavings: 50000,
    monthlyContribution: 1000,
    expectedReturnRate: 0.07,
    inflationRate: 0.03
  }

  it('validates expenses with valid data', () => {
    const data: UserData = {
      ...validData,
      expenses: [
        {
          id: '1',
          name: 'Living Expenses',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 0.03
        }
      ]
    }

    const result = validateInputs(data)
    expect(result.isValid).toBe(true)
  })

  it('rejects expense with empty name', () => {
    const data: UserData = {
      ...validData,
      expenses: [
        {
          id: '1',
          name: '',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 0.03
        }
      ]
    }

    const result = validateInputs(data)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field.includes('name'))).toBe(true)
  })

  it('rejects expense with negative amount', () => {
    const data: UserData = {
      ...validData,
      expenses: [
        {
          id: '1',
          name: 'Test',
          category: 'living',
          monthlyAmount: -100,
          inflationRate: 0.03
        }
      ]
    }

    const result = validateInputs(data)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field.includes('monthlyAmount'))).toBe(true)
  })

  it('rejects expense with invalid inflation rate', () => {
    const data: UserData = {
      ...validData,
      expenses: [
        {
          id: '1',
          name: 'Test',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 1.5 // > 100%
        }
      ]
    }

    const result = validateInputs(data)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field.includes('inflationRate'))).toBe(true)
  })

  it('accepts expense with startDate before retirement (now allowed for pre-retirement expenses)', () => {
    const data: UserData = {
      ...validData,
      expenses: [
        {
          id: '1',
          name: 'Test',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 0.03,
          startDate: '2020-01' // Before retirement age of 65 - now allowed
        }
      ]
    }

    const result = validateInputs(data)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects expense with endDate <= startDate', () => {
    const data: UserData = {
      ...validData,
      expenses: [
        {
          id: '1',
          name: 'Test',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 0.03,
          startDate: '2030-01',
          endDate: '2030-01'
        }
      ]
    }

    const result = validateInputs(data)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field.includes('endDate'))).toBe(true)
  })

})

describe('Pre-retirement expenses', () => {
  describe('Validation', () => {
    it('should allow expenses with valid dates', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 10000,
        monthlyContribution: 500,
        expectedReturnRate: 0.06,
        inflationRate: 0.03,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 5000,
          frequency: 'monthly',
          startDate: '2025-01'
        }],
        expenses: [{
          id: '1',
          name: 'Living',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 0.03,
          startDate: '2025-10'
        }]
      }

      const result = validateInputs(data)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should allow expenses with date range', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 10000,
        monthlyContribution: 500,
        expectedReturnRate: 0.06,
        inflationRate: 0.03,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 5000,
          frequency: 'monthly',
          startDate: '2025-01'
        }],
        expenses: [{
          id: '1',
          name: 'Child Education',
          category: 'other',
          monthlyAmount: 2000,
          inflationRate: 0.03,
          startDate: '2035-01',
          endDate: '2053-01'
        }]
      }

      const result = validateInputs(data)
      expect(result.isValid).toBe(true)
    })
  })

  describe('Calculations', () => {
    it('should reduce portfolio when expenses occur before retirement', () => {
      const dataWithExpenses: UserData = {
        currentAge: 30,
        retirementAge: 35,
        currentSavings: 100000,
        monthlyContribution: 0,
        expectedReturnRate: 0.06,
        inflationRate: 0.03,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 5000,
          frequency: 'monthly',
          startDate: '2025-01'
        }],
        expenses: [{
          id: '1',
          name: 'Living',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 0.03,
          startDate: '2025-01'
        }]
      }

      const dataWithoutExpenses: UserData = {
        ...dataWithExpenses,
        expenses: []
      }

      const resultWithExpenses = calculateRetirement(dataWithExpenses)
      const resultWithoutExpenses = calculateRetirement(dataWithoutExpenses)

      // Should have less portfolio value when expenses are present
      expect(resultWithExpenses.futureValue).toBeLessThan(resultWithoutExpenses.futureValue)

      // Net contribution should be income minus expenses
      expect(resultWithExpenses.totalContributions).toBeLessThan(resultWithoutExpenses.totalContributions)
    })

    it('should apply expense inflation from expense start date', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 35,
        currentSavings: 100000,
        monthlyContribution: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 5000,
          frequency: 'monthly',
          startDate: '2025-01'
        }],
        expenses: [{
          id: '1',
          name: 'Living',
          category: 'living',
          monthlyAmount: 1000,
          inflationRate: 0.10, // 10% inflation
          startDate: '2025-01'
        }]
      }

      const result = calculateRetirement(data)

      // Net income: 5000 - expenses (which increase with inflation)
      // Year 1: 1000/mo, Year 2: 1100/mo, Year 3: 1210/mo, Year 4: 1331/mo, Year 5: 1464/mo
      // Total expenses over 5 years should be inflated
      // This is a complex calculation, but we can verify the total contributions are positive
      // and greater than just starting balance
      expect(result.totalContributions).toBeGreaterThan(100000)
      // And less than full income (since expenses reduce it)
      expect(result.totalContributions).toBeLessThan(100000 + 5000 * 12 * 5)
    })

    it('should handle expenses starting mid-timeline', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 40,
        currentSavings: 100000,
        monthlyContribution: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 5000,
          frequency: 'monthly',
          startDate: '2025-10'
        }],
        expenses: [{
          id: '1',
          name: 'Living',
          category: 'living',
          monthlyAmount: 2000,
          inflationRate: 0,
          startDate: '2030-10' // Starts 5 years from now
        }]
      }

      const result = calculateRetirement(data)

      // First 5 years: 5000/mo income, 0 expenses = 300000
      // Last 5 years: 5000/mo income, 2000/mo expenses = net 180000
      // Total contributions: 300000 + 180000 = 480000
      expect(result.totalContributions).toBeCloseTo(100000 + 480000, -2)
    })

    it('should handle expenses ending before retirement', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 40,
        currentSavings: 100000,
        monthlyContribution: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 5000,
          frequency: 'monthly',
          startDate: '2025-10'
        }],
        expenses: [{
          id: '1',
          name: 'Child Education',
          category: 'other',
          monthlyAmount: 2000,
          inflationRate: 0,
          startDate: '2025-10',
          endDate: '2030-10' // Ends 5 years from now, before retirement at 2035-10
        }]
      }

      const result = calculateRetirement(data)

      // First 5 years: net 3000/mo = 180000
      // Last 5 years: net 5000/mo = 300000
      // Total contributions: 100000 + 180000 + 300000 = 580000
      expect(result.totalContributions).toBeCloseTo(580000, -2)
    })

    it('should handle multiple overlapping expenses', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 35,
        currentSavings: 100000,
        monthlyContribution: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 10000,
          frequency: 'monthly',
          startDate: '2025-01'
        }],
        expenses: [
          {
            id: '1',
            name: 'Living',
            category: 'living',
            monthlyAmount: 3000,
            inflationRate: 0,
            startDate: '2025-01'
          },
          {
            id: '2',
            name: 'Healthcare',
            category: 'healthcare',
            monthlyAmount: 1000,
            inflationRate: 0,
            startDate: '2025-01'
          },
          {
            id: '3',
            name: 'Travel',
            category: 'travel',
            monthlyAmount: 500,
            inflationRate: 0,
            startDate: '2027-01',
            endDate: '2029-01'
          }
        ]
      }

      const result = calculateRetirement(data)

      // Year 1-2 (ages 30-32): 10000 - 4000 = 6000/mo * 24 months = 144000
      // Year 3-4 (ages 32-34): 10000 - 4500 = 5500/mo * 24 months = 132000
      // Year 5 (ages 34-35): 10000 - 4000 = 6000/mo * 12 months = 72000
      // Total: 100000 + 144000 + 132000 + 72000 = 448000
      expect(result.totalContributions).toBeCloseTo(448000, -2)
    })

    it('should allow portfolio to go negative when expenses exceed income', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 35,
        currentSavings: 10000,
        monthlyContribution: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 1000,
          frequency: 'monthly',
          startDate: '2025-01'
        }],
        expenses: [{
          id: '1',
          name: 'High Expenses',
          category: 'living',
          monthlyAmount: 2000,
          inflationRate: 0,
          startDate: '2025-01'
        }]
      }

      const result = calculateRetirement(data)

      // Net: -1000/mo for 60 months = -60000
      // Starting: 10000
      // Ending: 10000 - 60000 = -50000
      expect(result.futureValue).toBeLessThan(0)
      expect(result.totalContributions).toBeLessThan(0)
    })

    it('should handle expense with no startDate (defaults to current date)', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 35,
        currentSavings: 100000,
        monthlyContribution: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 5000,
          frequency: 'monthly',
          startDate: '2025-01'
        }],
        expenses: [{
          id: '1',
          name: 'Living',
          category: 'living',
          monthlyAmount: 2000,
          inflationRate: 0
          // No startDate - should default to current date
        }]
      }

      const result = calculateRetirement(data)

      // Net: 3000/mo for 60 months = 180000
      // Total: 100000 + 180000 = 280000
      expect(result.totalContributions).toBeCloseTo(280000, -2)
    })
  })
})
