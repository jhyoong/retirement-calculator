import type { UserData, CalculationResult, ValidationResult, ValidationError } from '@/types'

/**
 * Calculate future value using compound interest formula
 * FV = PV(1+r)^n + PMT × [((1+r)^n - 1) / r]
 *
 * @param principal - Initial investment amount
 * @param monthlyContribution - Monthly contribution amount
 * @param annualRate - Annual interest rate (as decimal, e.g., 0.07 for 7%)
 * @param years - Number of years
 * @returns Future value of the investment
 */
export function calculateFutureValue(
  principal: number,
  monthlyContribution: number,
  annualRate: number,
  years: number
): number {
  const monthlyRate = annualRate / 12
  const months = years * 12

  // Handle edge case: zero interest rate
  if (monthlyRate === 0) {
    return principal + (monthlyContribution * months)
  }

  // Future value of principal
  const fvPrincipal = principal * Math.pow(1 + monthlyRate, months)

  // Future value of monthly contributions (annuity)
  const fvContributions = monthlyContribution *
    ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)

  return fvPrincipal + fvContributions
}

/**
 * Calculate total contributions over time
 */
export function calculateTotalContributions(
  initialSavings: number,
  monthlyContribution: number,
  years: number
): number {
  return initialSavings + (monthlyContribution * years * 12)
}

/**
 * Adjust value for inflation
 * Real Value = Nominal Value / (1 + inflation)^years
 */
export function adjustForInflation(
  nominalValue: number,
  inflationRate: number,
  years: number
): number {
  if (inflationRate === 0) {
    return nominalValue
  }
  return nominalValue / Math.pow(1 + inflationRate, years)
}

/**
 * Validate user input data
 */
export function validateInputs(data: UserData): ValidationResult {
  const errors: ValidationError[] = []

  // Current age validation
  if (data.currentAge < 0 || data.currentAge > 120) {
    errors.push({
      field: 'currentAge',
      message: 'Current age must be between 0 and 120'
    })
  }

  // Retirement age validation
  if (data.retirementAge < 0 || data.retirementAge > 120) {
    errors.push({
      field: 'retirementAge',
      message: 'Retirement age must be between 0 and 120'
    })
  }

  // Age comparison
  if (data.currentAge >= data.retirementAge) {
    errors.push({
      field: 'retirementAge',
      message: 'Retirement age must be greater than current age'
    })
  }

  // Current savings validation
  if (data.currentSavings < 0) {
    errors.push({
      field: 'currentSavings',
      message: 'Current savings cannot be negative'
    })
  }

  // Monthly contribution validation
  if (data.monthlyContribution < 0) {
    errors.push({
      field: 'monthlyContribution',
      message: 'Monthly contribution cannot be negative'
    })
  }

  // Return rate validation
  if (data.expectedReturnRate < 0 || data.expectedReturnRate > 1) {
    errors.push({
      field: 'expectedReturnRate',
      message: 'Expected return rate must be between 0% and 100%'
    })
  }

  // Inflation rate validation
  if (data.inflationRate < 0 || data.inflationRate > 1) {
    errors.push({
      field: 'inflationRate',
      message: 'Inflation rate must be between 0% and 100%'
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Main calculation function for retirement planning
 */
export function calculateRetirement(data: UserData): CalculationResult {
  const validation = validateInputs(data)

  if (!validation.isValid) {
    throw new Error(`Invalid input data: ${validation.errors.map(e => e.message).join(', ')}`)
  }

  const yearsToRetirement = data.retirementAge - data.currentAge

  const futureValue = calculateFutureValue(
    data.currentSavings,
    data.monthlyContribution,
    data.expectedReturnRate,
    yearsToRetirement
  )

  const totalContributions = calculateTotalContributions(
    data.currentSavings,
    data.monthlyContribution,
    yearsToRetirement
  )

  const investmentGrowth = futureValue - totalContributions

  const inflationAdjustedValue = adjustForInflation(
    futureValue,
    data.inflationRate,
    yearsToRetirement
  )

  return {
    futureValue: Math.round(futureValue * 100) / 100,
    totalContributions: Math.round(totalContributions * 100) / 100,
    investmentGrowth: Math.round(investmentGrowth * 100) / 100,
    inflationAdjustedValue: Math.round(inflationAdjustedValue * 100) / 100,
    yearsToRetirement
  }
}
