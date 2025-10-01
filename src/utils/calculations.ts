import type { UserData, CalculationResult, ValidationResult, ValidationError, IncomeStream, OneOffReturn } from '@/types'

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
 * Validate date format and logic
 */
function validateDateString(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}$/
  if (!regex.test(dateStr)) return false

  const [year, month] = dateStr.split('-').map(Number)
  return year >= 1900 && year <= 2200 && month >= 1 && month <= 12
}

/**
 * Validate income source
 */
function validateIncomeSource(source: IncomeStream, index: number): ValidationError[] {
  const errors: ValidationError[] = []
  const prefix = `incomeSource[${index}]`

  // Name validation
  if (!source.name || source.name.trim().length === 0) {
    errors.push({
      field: `${prefix}.name`,
      message: 'Income source name is required'
    })
  }

  // Amount validation
  if (source.amount < 0) {
    errors.push({
      field: `${prefix}.amount`,
      message: 'Income amount cannot be negative'
    })
  }

  // Start date validation
  if (!validateDateString(source.startDate)) {
    errors.push({
      field: `${prefix}.startDate`,
      message: 'Start date must be in YYYY-MM format'
    })
  }

  // End date validation (if provided)
  if (source.endDate) {
    if (!validateDateString(source.endDate)) {
      errors.push({
        field: `${prefix}.endDate`,
        message: 'End date must be in YYYY-MM format'
      })
    } else if (validateDateString(source.startDate)) {
      // Check that end date is after start date
      const start = new Date(source.startDate + '-01')
      const end = new Date(source.endDate + '-01')
      if (end <= start) {
        errors.push({
          field: `${prefix}.endDate`,
          message: 'End date must be after start date'
        })
      }
    }
  }

  // Custom frequency validation
  if (source.frequency === 'custom') {
    if (!source.customFrequencyDays || source.customFrequencyDays <= 0) {
      errors.push({
        field: `${prefix}.customFrequencyDays`,
        message: 'Custom frequency days must be greater than 0'
      })
    }
  }

  return errors
}

/**
 * Validate one-off return
 */
function validateOneOffReturn(oneOff: OneOffReturn, index: number): ValidationError[] {
  const errors: ValidationError[] = []
  const prefix = `oneOffReturn[${index}]`

  // Date validation
  if (!validateDateString(oneOff.date)) {
    errors.push({
      field: `${prefix}.date`,
      message: 'Date must be in YYYY-MM format'
    })
  }

  // Amount validation
  if (oneOff.amount <= 0) {
    errors.push({
      field: `${prefix}.amount`,
      message: 'Amount must be greater than 0'
    })
  }

  // Description validation
  if (!oneOff.description || oneOff.description.trim().length === 0) {
    errors.push({
      field: `${prefix}.description`,
      message: 'Description is required'
    })
  }

  return errors
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

  // Phase 2: Income sources validation
  if (data.incomeSources) {
    data.incomeSources.forEach((source, index) => {
      errors.push(...validateIncomeSource(source, index))
    })
  }

  // Phase 2: One-off returns validation
  if (data.oneOffReturns) {
    data.oneOffReturns.forEach((oneOff, index) => {
      errors.push(...validateOneOffReturn(oneOff, index))
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Helper: Convert frequency to monthly amount
 */
function convertToMonthly(
  amount: number,
  frequency: string,
  customDays?: number
): number {
  switch (frequency) {
    case 'daily':
      return amount * 30.44
    case 'weekly':
      return amount * 52 / 12
    case 'monthly':
      return amount
    case 'yearly':
      return amount / 12
    case 'custom':
      if (!customDays || customDays <= 0) return 0
      return (amount * 365.25) / customDays / 12
    default:
      return 0
  }
}

/**
 * Helper: Parse YYYY-MM date string to month index from start
 */
function parseMonthDate(dateStr: string, baseYear: number, baseMonth: number): number {
  const [year, month] = dateStr.split('-').map(Number)
  return (year - baseYear) * 12 + (month - baseMonth)
}

/**
 * Calculate future value with time-based income sources
 * Month-by-month calculation considering variable income streams
 */
export function calculateFutureValueWithIncomeSources(
  principal: number,
  annualRate: number,
  years: number,
  _currentAge: number,
  incomeSources: IncomeStream[],
  oneOffReturns: OneOffReturn[]
): { futureValue: number; totalContributions: number } {
  const monthlyRate = annualRate / 12
  const months = years * 12
  const currentYear = new Date().getFullYear()
  const currentMonth = 1 // January baseline

  let balance = principal
  let totalContributions = principal

  // Process month by month
  for (let month = 0; month < months; month++) {
    // Add returns from income sources active in this month
    let monthlyContribution = 0

    incomeSources.forEach(source => {
      const startMonth = parseMonthDate(source.startDate, currentYear, currentMonth)
      const endMonth = source.endDate
        ? parseMonthDate(source.endDate, currentYear, currentMonth)
        : months + 1 // Ongoing

      if (month >= startMonth && month < endMonth) {
        monthlyContribution += convertToMonthly(
          source.amount,
          source.frequency,
          source.customFrequencyDays
        )
      }
    })

    // Add one-off returns if they occur in this month
    oneOffReturns.forEach(oneOff => {
      const returnMonth = parseMonthDate(oneOff.date, currentYear, currentMonth)
      if (month === returnMonth) {
        monthlyContribution += oneOff.amount
      }
    })

    // Add contribution to balance
    balance += monthlyContribution
    totalContributions += monthlyContribution

    // Apply interest
    balance = balance * (1 + monthlyRate)
  }

  return {
    futureValue: balance,
    totalContributions
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

  let futureValue: number
  let totalContributions: number

  // Use time-based calculation if income sources exist
  if (data.incomeSources && data.incomeSources.length > 0) {
    const result = calculateFutureValueWithIncomeSources(
      data.currentSavings,
      data.expectedReturnRate,
      yearsToRetirement,
      data.currentAge,
      data.incomeSources,
      data.oneOffReturns || []
    )
    futureValue = result.futureValue
    totalContributions = result.totalContributions
  } else {
    // Fallback to legacy calculation with constant monthly contribution
    futureValue = calculateFutureValue(
      data.currentSavings,
      data.monthlyContribution,
      data.expectedReturnRate,
      yearsToRetirement
    )

    totalContributions = calculateTotalContributions(
      data.currentSavings,
      data.monthlyContribution,
      yearsToRetirement
    )
  }

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
