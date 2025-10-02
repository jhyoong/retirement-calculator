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
import type { UserData, RetirementExpense, WithdrawalConfig } from '@/types'

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

  describe('Fixed withdrawal strategy', () => {
    it('calculates depletion with fixed withdrawal exceeding returns', () => {
      const config: WithdrawalConfig = {
        strategy: 'fixed',
        fixedAmount: 5000
      }

      const years = calculateYearsUntilDepletion(
        500000, // $500k starting balance
        0.05,   // 5% return
        basicExpenses,
        config,
        65      // retirement age
      )

      expect(years).not.toBeNull()
      expect(years!).toBeGreaterThan(0)
      expect(years!).toBeLessThan(30)
    })

    it('returns null for sustainable fixed withdrawal', () => {
      const config: WithdrawalConfig = {
        strategy: 'fixed',
        fixedAmount: 1500 // $1500/month from $500k at 5% is sustainable
      }

      const years = calculateYearsUntilDepletion(
        1000000, // Higher balance to make sustainable
        0.07,    // Higher return
        basicExpenses,
        config,
        65
      )

      expect(years).toBeNull() // Sustainable
    })

    it('handles immediate depletion scenario', () => {
      const config: WithdrawalConfig = {
        strategy: 'fixed',
        fixedAmount: 10000
      }

      const years = calculateYearsUntilDepletion(
        50000, // Small balance
        0.05,
        basicExpenses,
        config,
        65
      )

      expect(years).not.toBeNull()
      expect(years!).toBeLessThan(1)
    })
  })

  describe('Percentage withdrawal strategy', () => {
    it('calculates depletion with high percentage withdrawal', () => {
      const config: WithdrawalConfig = {
        strategy: 'percentage',
        percentage: 0.08 // 8% withdrawal rate
      }

      const years = calculateYearsUntilDepletion(
        500000,
        0.05, // 5% return < 8% withdrawal
        basicExpenses,
        config,
        65
      )

      expect(years).not.toBeNull()
      expect(years!).toBeGreaterThan(0)
    })

    it('returns null for sustainable percentage withdrawal', () => {
      const config: WithdrawalConfig = {
        strategy: 'percentage',
        percentage: 0.02 // 2% withdrawal rate
      }

      const years = calculateYearsUntilDepletion(
        1000000,
        0.07, // 7% return >> 2% withdrawal
        basicExpenses,
        config,
        65
      )

      expect(years).toBeNull() // Sustainable
    })
  })

  describe('Combined withdrawal strategy', () => {
    it('calculates depletion with combined strategy', () => {
      const config: WithdrawalConfig = {
        strategy: 'combined',
        fixedAmount: 2000,
        percentage: 0.04
      }

      const years = calculateYearsUntilDepletion(
        300000,
        0.05,
        basicExpenses,
        config,
        65
      )

      expect(years).not.toBeNull()
      expect(years!).toBeGreaterThan(0)
    })
  })

  describe('Expense inflation handling', () => {
    it('handles expenses with high inflation', () => {
      const highInflationExpenses: RetirementExpense[] = [
        {
          id: '1',
          name: 'Healthcare',
          category: 'healthcare',
          monthlyAmount: 1000,
          inflationRate: 0.06 // 6% medical inflation
        }
      ]

      const config: WithdrawalConfig = {
        strategy: 'fixed',
        fixedAmount: 3000 // Higher withdrawal than expense initially
      }

      const years = calculateYearsUntilDepletion(
        300000, // Lower balance
        0.04,   // Lower return
        highInflationExpenses,
        config,
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

      const config: WithdrawalConfig = {
        strategy: 'fixed',
        fixedAmount: 4000
      }

      const years = calculateYearsUntilDepletion(
        600000,
        0.06,
        multiExpenses,
        config,
        65
      )

      expect(years).not.toBeNull()
      expect(years!).toBeGreaterThan(0)
    })
  })

  describe('Age-based expense filtering', () => {
    it('only applies expenses within age range', () => {
      const ageRangeExpenses: RetirementExpense[] = [
        {
          id: '1',
          name: 'Early Retirement Expense',
          category: 'living',
          monthlyAmount: 2000,
          inflationRate: 0.03,
          startAge: 65,
          endAge: 70
        },
        {
          id: '2',
          name: 'Late Retirement Expense',
          category: 'living',
          monthlyAmount: 1500,
          inflationRate: 0.03,
          startAge: 70,
          endAge: 95
        }
      ]

      const config: WithdrawalConfig = {
        strategy: 'fixed',
        fixedAmount: 2500 // Higher withdrawal to cause depletion
      }

      const years = calculateYearsUntilDepletion(
        300000, // Lower balance
        0.04,   // Lower return
        ageRangeExpenses,
        config,
        65
      )

      // Should deplete
      expect(years).not.toBeNull()
      expect(years!).toBeGreaterThan(0)
    })

    it('handles expenses that start after retirement', () => {
      const futureExpenses: RetirementExpense[] = [
        {
          id: '1',
          name: 'Deferred Healthcare',
          category: 'healthcare',
          monthlyAmount: 1000,
          inflationRate: 0.05,
          startAge: 75 // Starts 10 years after retirement
        }
      ]

      const config: WithdrawalConfig = {
        strategy: 'fixed',
        fixedAmount: 2000
      }

      const years = calculateYearsUntilDepletion(
        300000,
        0.05,
        futureExpenses,
        config,
        65
      )

      expect(years).not.toBeNull()
    })
  })

  describe('Edge cases', () => {
    it('handles zero starting balance', () => {
      const config: WithdrawalConfig = {
        strategy: 'fixed',
        fixedAmount: 1000
      }

      const years = calculateYearsUntilDepletion(
        0,
        0.05,
        basicExpenses,
        config,
        65
      )

      expect(years).toBe(0)
    })

    it('handles zero return rate', () => {
      const config: WithdrawalConfig = {
        strategy: 'fixed',
        fixedAmount: 3000
      }

      const noInflationExpenses: RetirementExpense[] = [
        {
          id: '1',
          name: 'Living',
          category: 'living',
          monthlyAmount: 2000,
          inflationRate: 0 // No inflation to simplify calculation
        }
      ]

      const years = calculateYearsUntilDepletion(
        100000,
        0, // No returns
        noInflationExpenses,
        config,
        65
      )

      expect(years).not.toBeNull()
      // Withdrawal is max(3000, 2000) = 3000/month
      // So it should deplete in roughly 100000 / (3000 * 12) ~= 2.78 years
      expect(years!).toBeGreaterThan(2)
      expect(years!).toBeLessThan(4)
    })

    it('handles zero expenses', () => {
      const config: WithdrawalConfig = {
        strategy: 'fixed',
        fixedAmount: 3000
      }

      const years = calculateYearsUntilDepletion(
        200000, // Lower balance
        0.03,   // Lower return
        [], // No expenses
        config,
        65
      )

      expect(years).not.toBeNull()
      expect(years!).toBeGreaterThan(0)
    })

    it('chooses max of withdrawal and expenses', () => {
      const lowExpenses: RetirementExpense[] = [
        {
          id: '1',
          name: 'Minimal Living',
          category: 'living',
          monthlyAmount: 1000,
          inflationRate: 0.03
        }
      ]

      const config: WithdrawalConfig = {
        strategy: 'fixed',
        fixedAmount: 5000 // Higher than expenses
      }

      const years = calculateYearsUntilDepletion(
        300000,
        0.05,
        lowExpenses,
        config,
        65
      )

      expect(years).not.toBeNull()
      expect(years!).toBeGreaterThan(0)
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

    const config: WithdrawalConfig = {
      strategy: 'fixed',
      fixedAmount: 3000
    }

    const data: UserData = {
      currentAge: 30,
      retirementAge: 65,
      currentSavings: 50000,
      monthlyContribution: 1000,
      expectedReturnRate: 0.07,
      inflationRate: 0.03,
      expenses,
      withdrawalConfig: config
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

  it('correctly warns for high withdrawal rates', () => {
    const expenses: RetirementExpense[] = [
      {
        id: '1',
        name: 'Expensive Living',
        category: 'living',
        monthlyAmount: 5000,
        inflationRate: 0.03
      }
    ]

    const config: WithdrawalConfig = {
      strategy: 'fixed',
      fixedAmount: 5000
    }

    const data: UserData = {
      currentAge: 60,
      retirementAge: 65,
      currentSavings: 50000,
      monthlyContribution: 1000,
      expectedReturnRate: 0.05,
      inflationRate: 0.03,
      expenses,
      withdrawalConfig: config
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
      ],
      withdrawalConfig: {
        strategy: 'fixed',
        fixedAmount: 3000
      }
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

  it('accepts expense with startAge before retirement (now allowed for pre-retirement expenses)', () => {
    const data: UserData = {
      ...validData,
      expenses: [
        {
          id: '1',
          name: 'Test',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 0.03,
          startAge: 60 // Before retirement age of 65 - now allowed
        }
      ]
    }

    const result = validateInputs(data)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects expense with endAge <= startAge', () => {
    const data: UserData = {
      ...validData,
      expenses: [
        {
          id: '1',
          name: 'Test',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 0.03,
          startAge: 70,
          endAge: 70
        }
      ]
    }

    const result = validateInputs(data)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field.includes('endAge'))).toBe(true)
  })

  it('validates withdrawal config for fixed strategy', () => {
    const data: UserData = {
      ...validData,
      expenses: [
        {
          id: '1',
          name: 'Test',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 0.03
        }
      ],
      withdrawalConfig: {
        strategy: 'fixed',
        fixedAmount: 3000
      }
    }

    const result = validateInputs(data)
    expect(result.isValid).toBe(true)
  })

  it('rejects fixed strategy without fixedAmount', () => {
    const data: UserData = {
      ...validData,
      expenses: [
        {
          id: '1',
          name: 'Test',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 0.03
        }
      ],
      withdrawalConfig: {
        strategy: 'fixed'
      }
    }

    const result = validateInputs(data)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field.includes('fixedAmount'))).toBe(true)
  })

  it('rejects percentage strategy without percentage', () => {
    const data: UserData = {
      ...validData,
      expenses: [
        {
          id: '1',
          name: 'Test',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 0.03
        }
      ],
      withdrawalConfig: {
        strategy: 'percentage'
      }
    }

    const result = validateInputs(data)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field.includes('percentage'))).toBe(true)
  })

  it('validates combined strategy with both values', () => {
    const data: UserData = {
      ...validData,
      expenses: [
        {
          id: '1',
          name: 'Test',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 0.03
        }
      ],
      withdrawalConfig: {
        strategy: 'combined',
        fixedAmount: 2000,
        percentage: 0.03
      }
    }

    const result = validateInputs(data)
    expect(result.isValid).toBe(true)
  })
})

describe('Pre-retirement expenses', () => {
  describe('Validation', () => {
    it('should allow expenses starting at current age', () => {
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
          startAge: 30
        }]
      }

      const result = validateInputs(data)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject expenses starting before current age', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 10000,
        monthlyContribution: 500,
        expectedReturnRate: 0.06,
        inflationRate: 0.03,
        expenses: [{
          id: '1',
          name: 'Past Expense',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 0.03,
          startAge: 25
        }]
      }

      const result = validateInputs(data)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('cannot be in the past'))).toBe(true)
    })

    it('should reject end age before current age', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 10000,
        monthlyContribution: 500,
        expectedReturnRate: 0.06,
        inflationRate: 0.03,
        expenses: [{
          id: '1',
          name: 'Invalid Expense',
          category: 'living',
          monthlyAmount: 3000,
          inflationRate: 0.03,
          endAge: 25
        }]
      }

      const result = validateInputs(data)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.message.includes('must be after current age'))).toBe(true)
    })

    it('should allow expenses starting before retirement', () => {
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
          startAge: 35
        }]
      }

      const result = validateInputs(data)
      expect(result.isValid).toBe(true)
    })

    it('should allow expenses ending before retirement', () => {
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
          startAge: 40,
          endAge: 58
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
          startAge: 30
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

    it('should apply expense inflation from expense start age', () => {
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
          startAge: 30
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
          startDate: '2025-01'
        }],
        expenses: [{
          id: '1',
          name: 'Living',
          category: 'living',
          monthlyAmount: 2000,
          inflationRate: 0,
          startAge: 35 // Starts 5 years from now
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
          startDate: '2025-01'
        }],
        expenses: [{
          id: '1',
          name: 'Child Education',
          category: 'other',
          monthlyAmount: 2000,
          inflationRate: 0,
          startAge: 30,
          endAge: 35 // Ends 5 years before retirement
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
            startAge: 30
          },
          {
            id: '2',
            name: 'Healthcare',
            category: 'healthcare',
            monthlyAmount: 1000,
            inflationRate: 0,
            startAge: 30
          },
          {
            id: '3',
            name: 'Travel',
            category: 'travel',
            monthlyAmount: 500,
            inflationRate: 0,
            startAge: 32,
            endAge: 34
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
          startAge: 30
        }]
      }

      const result = calculateRetirement(data)

      // Net: -1000/mo for 60 months = -60000
      // Starting: 10000
      // Ending: 10000 - 60000 = -50000
      expect(result.futureValue).toBeLessThan(0)
      expect(result.totalContributions).toBeLessThan(0)
    })

    it('should handle expense with no startAge (defaults to current age)', () => {
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
          // No startAge - should default to current age (30)
        }]
      }

      const result = calculateRetirement(data)

      // Net: 3000/mo for 60 months = 180000
      // Total: 100000 + 180000 = 280000
      expect(result.totalContributions).toBeCloseTo(280000, -2)
    })
  })
})
