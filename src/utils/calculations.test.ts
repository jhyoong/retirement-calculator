import { describe, it, expect } from 'vitest'
import {
  calculateFutureValue,
  calculateTotalContributions,
  adjustForInflation,
  validateInputs,
  calculateRetirement
} from './calculations'
import type { UserData } from '@/types'

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
