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
 * Phase 4: Validate retirement expense
 */
function validateRetirementExpense(expense: import('@/types').RetirementExpense, index: number, currentAge: number): ValidationError[] {
  const errors: ValidationError[] = []
  const prefix = `expense[${index}]`

  // Name validation
  if (!expense.name || expense.name.trim().length === 0) {
    errors.push({
      field: `${prefix}.name`,
      message: 'Expense name is required'
    })
  }

  // Amount validation
  if (expense.monthlyAmount < 0) {
    errors.push({
      field: `${prefix}.monthlyAmount`,
      message: 'Monthly amount cannot be negative'
    })
  }

  // Inflation rate validation
  if (expense.inflationRate < -0.5 || expense.inflationRate > 1) {
    errors.push({
      field: `${prefix}.inflationRate`,
      message: 'Inflation rate must be between -50% and 100%'
    })
  }

  // Age range validation
  if (expense.startAge !== undefined) {
    if (expense.startAge < currentAge) {
      errors.push({
        field: `${prefix}.startAge`,
        message: 'Start age cannot be in the past (must be at or after current age)'
      })
    }
  }

  if (expense.endAge !== undefined) {
    if (expense.endAge <= currentAge) {
      errors.push({
        field: `${prefix}.endAge`,
        message: 'End age must be after current age'
      })
    }

    if (expense.startAge !== undefined && expense.endAge <= expense.startAge) {
      errors.push({
        field: `${prefix}.endAge`,
        message: 'End age must be after start age'
      })
    }
  }

  return errors
}

/**
 * Phase 4: Validate withdrawal config
 */
function validateWithdrawalConfig(config: import('@/types').WithdrawalConfig): ValidationError[] {
  const errors: ValidationError[] = []

  if (config.strategy === 'fixed' || config.strategy === 'combined') {
    if (config.fixedAmount === undefined || config.fixedAmount < 0) {
      errors.push({
        field: 'withdrawalConfig.fixedAmount',
        message: 'Fixed amount must be specified and cannot be negative'
      })
    }
  }

  if (config.strategy === 'percentage' || config.strategy === 'combined') {
    if (config.percentage === undefined || config.percentage < 0 || config.percentage > 1) {
      errors.push({
        field: 'withdrawalConfig.percentage',
        message: 'Percentage must be specified and between 0% and 100%'
      })
    }
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

  // Phase 4: Expenses validation
  if (data.expenses) {
    data.expenses.forEach((expense, index) => {
      errors.push(...validateRetirementExpense(expense, index, data.currentAge))
    })
  }

  // Phase 4: Withdrawal config validation (if expenses exist)
  if (data.expenses && data.expenses.length > 0 && data.withdrawalConfig) {
    errors.push(...validateWithdrawalConfig(data.withdrawalConfig))
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
  oneOffReturns: OneOffReturn[],
  expenses?: import('@/types').RetirementExpense[]
): { futureValue: number; totalContributions: number } {
  const monthlyRate = annualRate / 12
  const months = years * 12
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1 // Current month (1-12)

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

    // Calculate expenses for this month
    let monthlyExpenses = 0
    if (expenses && expenses.length > 0) {
      const currentAge = _currentAge + (month / 12)

      expenses.forEach(expense => {
        const startAge = expense.startAge ?? _currentAge
        const endAge = expense.endAge ?? 120 // Far future

        if (currentAge >= startAge && currentAge < endAge) {
          // Calculate inflation from expense start
          const yearsFromExpenseStart = Math.max(0, (currentAge - startAge))
          const inflatedAmount = expense.monthlyAmount * Math.pow(1 + expense.inflationRate, yearsFromExpenseStart)
          monthlyExpenses += inflatedAmount
        }
      })
    }

    // Add contribution to balance
    balance += monthlyContribution

    // Subtract expenses from balance
    balance -= monthlyExpenses

    // Update total contributions (income - expenses)
    totalContributions += monthlyContribution
    totalContributions -= monthlyExpenses

    // Apply interest
    balance = balance * (1 + monthlyRate)
  }

  return {
    futureValue: balance,
    totalContributions
  }
}

/**
 * Phase 4: Calculate post-retirement portfolio sustainability
 * Returns years until portfolio depletes, or null if sustainable
 */
export function calculateYearsUntilDepletion(
  startingBalance: number,
  annualReturnRate: number,
  expenses: import('@/types').RetirementExpense[],
  withdrawalConfig: import('@/types').WithdrawalConfig,
  retirementAge: number,
  maxAge: number = 95
): number | null {
  const monthlyRate = annualReturnRate / 12
  let balance = startingBalance
  const maxMonths = (maxAge - retirementAge) * 12

  for (let monthIndex = 0; monthIndex < maxMonths; monthIndex++) {
    const currentAge = retirementAge + monthIndex / 12

    // Calculate total expenses for this month with inflation-adjusted amounts
    let monthlyExpenses = 0
    expenses.forEach(expense => {
      // Check if expense is active at this age
      const startAge = expense.startAge ?? retirementAge
      const endAge = expense.endAge ?? maxAge

      if (currentAge >= startAge && currentAge < endAge) {
        // Apply inflation from retirement age
        const yearsFromRetirement = monthIndex / 12
        const inflatedAmount = expense.monthlyAmount * Math.pow(1 + expense.inflationRate, yearsFromRetirement)
        monthlyExpenses += inflatedAmount
      }
    })

    // Calculate withdrawal based on strategy
    let withdrawal = 0
    switch (withdrawalConfig.strategy) {
      case 'fixed':
        withdrawal = withdrawalConfig.fixedAmount || 0
        break
      case 'percentage':
        withdrawal = balance * (withdrawalConfig.percentage || 0) / 12
        break
      case 'combined':
        withdrawal = (withdrawalConfig.fixedAmount || 0) + balance * (withdrawalConfig.percentage || 0) / 12
        break
    }

    // Use the greater of withdrawal strategy or actual expenses
    const amountToWithdraw = Math.max(withdrawal, monthlyExpenses)

    // Check if balance can cover withdrawal
    if (balance < amountToWithdraw) {
      // Portfolio depleted
      return Math.round((monthIndex / 12) * 100) / 100
    }

    // Withdraw from portfolio
    balance -= amountToWithdraw

    // Apply investment returns on remaining balance
    balance = balance * (1 + monthlyRate)

    // Stop if balance goes negative
    if (balance <= 0) {
      return Math.round((monthIndex / 12) * 100) / 100
    }
  }

  // Portfolio lasted until max age - sustainable
  return null
}

/**
 * Phase 4: Check if withdrawal rate is sustainable (>4-5% is risky)
 */
export function checkSustainabilityWarning(
  portfolioValue: number,
  annualWithdrawal: number
): boolean {
  if (portfolioValue === 0) return true
  const withdrawalRate = annualWithdrawal / portfolioValue
  return withdrawalRate > 0.05 // Warning if >5% withdrawal rate
}

/**
 * Helper: Find the actual age when all income stops
 */
function findActualRetirementAge(data: UserData): number {
  if (!data.incomeSources || data.incomeSources.length === 0) {
    return data.retirementAge
  }

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  let latestIncomeAge = data.retirementAge

  data.incomeSources.forEach(source => {
    if (source.endDate) {
      const [year, month] = source.endDate.split('-').map(Number)
      const monthsFromNow = (year - currentYear) * 12 + (month - currentMonth)
      const ageWhenIncomeEnds = data.currentAge + (monthsFromNow / 12)
      latestIncomeAge = Math.max(latestIncomeAge, ageWhenIncomeEnds)
    }
  })

  return latestIncomeAge
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
    // Calculate until actual end of income (may be beyond retirement age)
    const actualRetirementAge = findActualRetirementAge(data)
    const yearsToActualRetirement = actualRetirementAge - data.currentAge

    const result = calculateFutureValueWithIncomeSources(
      data.currentSavings,
      data.expectedReturnRate,
      yearsToActualRetirement,
      data.currentAge,
      data.incomeSources,
      data.oneOffReturns || [],
      data.expenses
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

  // Calculate inflation adjustment based on actual accumulation period
  const actualRetirementAge = data.incomeSources && data.incomeSources.length > 0
    ? findActualRetirementAge(data)
    : data.retirementAge
  const yearsToActualRetirement = actualRetirementAge - data.currentAge

  const inflationAdjustedValue = adjustForInflation(
    futureValue,
    data.inflationRate,
    yearsToActualRetirement
  )

  // Phase 4: Calculate post-retirement sustainability if expenses are defined
  let yearsUntilDepletion: number | null = null
  let sustainabilityWarning = false

  if (data.expenses && data.expenses.length > 0 && data.withdrawalConfig) {
    // Use actual retirement age (when income truly stops)
    const actualRetirementAge = findActualRetirementAge(data)

    yearsUntilDepletion = calculateYearsUntilDepletion(
      futureValue,
      data.expectedReturnRate,
      data.expenses,
      data.withdrawalConfig,
      actualRetirementAge
    )

    // Calculate annual withdrawal for warning check
    let annualWithdrawal = 0
    switch (data.withdrawalConfig.strategy) {
      case 'fixed':
        annualWithdrawal = (data.withdrawalConfig.fixedAmount || 0) * 12
        break
      case 'percentage':
        annualWithdrawal = futureValue * (data.withdrawalConfig.percentage || 0)
        break
      case 'combined':
        annualWithdrawal = (data.withdrawalConfig.fixedAmount || 0) * 12 + futureValue * (data.withdrawalConfig.percentage || 0)
        break
    }

    sustainabilityWarning = checkSustainabilityWarning(futureValue, annualWithdrawal)
  }

  return {
    futureValue: Math.round(futureValue * 100) / 100,
    totalContributions: Math.round(totalContributions * 100) / 100,
    investmentGrowth: Math.round(investmentGrowth * 100) / 100,
    inflationAdjustedValue: Math.round(inflationAdjustedValue * 100) / 100,
    yearsToRetirement,
    yearsUntilDepletion,
    sustainabilityWarning
  }
}
