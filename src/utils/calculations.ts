import type { UserData, CalculationResult, ValidationResult, ValidationError, IncomeStream, OneOffReturn, CPFLifeEstimate } from '@/types'
import { runProjection, projectCPFLifeStart } from './projectionEngine'
import { getCPFLifePayoutForYear } from './cpfLife'
import {
  MONTHS_PER_YEAR,
  roundToTwoDecimals,
  MIN_AGE,
  MAX_AGE,
  MIN_YEAR,
  MAX_YEAR,
  MIN_MONTH,
  MAX_MONTH,
  MIN_INFLATION_RATE,
  MAX_INFLATION_RATE,
  MIN_RATE,
  MAX_RATE,
  MAX_LOAN_TERM_MONTHS,
  DEFAULT_MAX_AGE,
  DATE_DAY_SUFFIX,
  FAR_FUTURE_DATE,
  DATE_FORMAT_REGEX,
  DATE_PADDING_CHAR,
  DATE_PADDING_LENGTH,
  SUSTAINABLE_WITHDRAWAL_RATE
} from './constants'


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
  if (!DATE_FORMAT_REGEX.test(dateStr)) return false

  const [year, month] = dateStr.split('-').map(Number)
  return year >= MIN_YEAR && year <= MAX_YEAR && month >= MIN_MONTH && month <= MAX_MONTH
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
function validateRetirementExpense(expense: import('@/types').RetirementExpense, index: number): ValidationError[] {
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
  if (expense.inflationRate < MIN_INFLATION_RATE || expense.inflationRate > MAX_INFLATION_RATE) {
    errors.push({
      field: `${prefix}.inflationRate`,
      message: 'Inflation rate must be between -50% and 100%'
    })
  }

  // Start date validation (if provided)
  if (expense.startDate) {
    if (!validateDateString(expense.startDate)) {
      errors.push({
        field: `${prefix}.startDate`,
        message: 'Start date must be in YYYY-MM format'
      })
    }
  }

  // End date validation (if provided)
  if (expense.endDate) {
    if (!validateDateString(expense.endDate)) {
      errors.push({
        field: `${prefix}.endDate`,
        message: 'End date must be in YYYY-MM format'
      })
    } else if (expense.startDate && validateDateString(expense.startDate)) {
      // Check that end date is after start date
      const start = new Date(expense.startDate + '-01')
      const end = new Date(expense.endDate + '-01')
      if (end <= start) {
        errors.push({
          field: `${prefix}.endDate`,
          message: 'End date must be after start date'
        })
      }
    }
  }

  return errors
}

/**
 * Phase 5: Validate loan
 */
function validateLoan(loan: import('@/types').Loan, index: number): ValidationError[] {
  const errors: ValidationError[] = []
  const prefix = `loan[${index}]`

  // Name validation
  if (!loan.name || loan.name.trim().length === 0) {
    errors.push({
      field: `${prefix}.name`,
      message: 'Loan name is required'
    })
  }

  // Principal validation
  if (loan.principal <= 0) {
    errors.push({
      field: `${prefix}.principal`,
      message: 'Loan principal must be greater than 0'
    })
  }

  // Interest rate validation
  if (loan.interestRate < MIN_RATE || loan.interestRate > MAX_RATE) {
    errors.push({
      field: `${prefix}.interestRate`,
      message: 'Interest rate must be between 0% and 100%'
    })
  }

  // Term validation
  if (loan.termMonths <= 0 || loan.termMonths > MAX_LOAN_TERM_MONTHS) {
    errors.push({
      field: `${prefix}.termMonths`,
      message: 'Loan term must be between 1 and 600 months (50 years)'
    })
  }

  // Start date validation
  if (!validateDateString(loan.startDate)) {
    errors.push({
      field: `${prefix}.startDate`,
      message: 'Start date must be in YYYY-MM format'
    })
  }

  // Extra payments validation
  if (loan.extraPayments) {
    loan.extraPayments.forEach((payment, i) => {
      if (!validateDateString(payment.date)) {
        errors.push({
          field: `${prefix}.extraPayments[${i}].date`,
          message: 'Extra payment date must be in YYYY-MM format'
        })
      }
      if (payment.amount <= 0) {
        errors.push({
          field: `${prefix}.extraPayments[${i}].amount`,
          message: 'Extra payment amount must be greater than 0'
        })
      }
    })
  }

  return errors
}

/**
 * Phase 5: Validate one-time expense
 */
function validateOneTimeExpense(expense: import('@/types').OneTimeExpense, index: number): ValidationError[] {
  const errors: ValidationError[] = []
  const prefix = `oneTimeExpense[${index}]`

  // Name validation
  if (!expense.name || expense.name.trim().length === 0) {
    errors.push({
      field: `${prefix}.name`,
      message: 'Expense name is required'
    })
  }

  // Amount validation
  if (expense.amount <= 0) {
    errors.push({
      field: `${prefix}.amount`,
      message: 'Expense amount must be greater than 0'
    })
  }

  // Date validation
  if (!validateDateString(expense.date)) {
    errors.push({
      field: `${prefix}.date`,
      message: 'Date must be in YYYY-MM format'
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
  if (data.currentAge < MIN_AGE || data.currentAge > MAX_AGE) {
    errors.push({
      field: 'currentAge',
      message: 'Current age must be between 0 and 120'
    })
  }

  // Retirement age validation
  if (data.retirementAge < MIN_AGE || data.retirementAge > MAX_AGE) {
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

  // Return rate validation
  if (data.expectedReturnRate < MIN_RATE || data.expectedReturnRate > MAX_RATE) {
    errors.push({
      field: 'expectedReturnRate',
      message: 'Expected return rate must be between 0% and 100%'
    })
  }

  // Inflation rate validation
  if (data.inflationRate < MIN_RATE || data.inflationRate > MAX_RATE) {
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
      errors.push(...validateRetirementExpense(expense, index))
    })
  }

  // Phase 5: Loans validation
  if (data.loans) {
    data.loans.forEach((loan, index) => {
      errors.push(...validateLoan(loan, index))
    })
  }

  // Phase 5: One-time expenses validation
  if (data.oneTimeExpenses) {
    data.oneTimeExpenses.forEach((expense, index) => {
      errors.push(...validateOneTimeExpense(expense, index))
    })
  }

  // Phase 6: CPF validation
  if (data.cpf && data.cpf.enabled) {
    // Validate account balances are non-negative
    const balances = data.cpf.currentBalances
    if (balances.ordinaryAccount < 0) {
      errors.push({ field: 'cpf.ordinaryAccount', message: 'OA balance cannot be negative' })
    }
    if (balances.specialAccount < 0) {
      errors.push({ field: 'cpf.specialAccount', message: 'SA balance cannot be negative' })
    }
    if (balances.medisaveAccount < 0) {
      errors.push({ field: 'cpf.medisaveAccount', message: 'MA balance cannot be negative' })
    }
    if (balances.retirementAccount < 0) {
      errors.push({ field: 'cpf.retirementAccount', message: 'RA balance cannot be negative' })
    }

    // Basic plan needs a user-entered payout % (CPF publishes no fixed figure)
    if (data.cpf.cpfLifePlan === 'basic') {
      const pct = data.cpf.basicPlanPayoutPercent
      if (pct === undefined || pct === null || !(pct > 0) || pct > 100) {
        errors.push({
          field: 'cpf.basicPlanPayoutPercent',
          message: 'Enter the Basic plan payout as a % of the Standard plan (1-100).'
        })
      }
    }

    // Warn if CPF enabled but no CPF-eligible income
    const hasCPFEligibleIncome = data.incomeSources?.some(source => source.cpfEligible === true) ?? false
    if (!hasCPFEligibleIncome) {
      errors.push({
        field: 'cpf.incomeSources',
        message: 'CPF is enabled but no CPF-eligible income source found. Mark at least one income source as "Subject to CPF contributions".'
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Calculate future value with time-based income sources.
 * Thin wrapper over the shared projection engine (see projectionEngine.ts).
 */
export function calculateFutureValueWithIncomeSources(
  principal: number,
  annualRate: number,
  years: number,
  currentAge: number,
  incomeSources: IncomeStream[],
  oneOffReturns: OneOffReturn[],
  expenses?: import('@/types').RetirementExpense[],
  loans?: import('@/types').Loan[],
  oneTimeExpenses?: import('@/types').OneTimeExpense[],
  cpfData?: import('@/types').CPFData,
  taxEnabled: boolean = true
): { futureValue: number; totalContributions: number } {
  const run = runProjection(
    {
      currentAge,
      retirementAge: currentAge + years,
      currentSavings: principal,
      expectedReturnRate: annualRate,
      inflationRate: 0,
      incomeSources,
      oneOffReturns,
      expenses,
      loans,
      oneTimeExpenses,
      cpf: cpfData,
      taxEnabled
    },
    years * MONTHS_PER_YEAR
  )

  return {
    futureValue: roundToTwoDecimals(run.finalBalance),
    totalContributions: roundToTwoDecimals(run.totalContributions)
  }
}

/**
 * Phase 4: Calculate post-retirement portfolio sustainability
 * Returns depletion info, or null values if sustainable.
 * If cpfLife is given, CPF LIFE payouts (with Escalating plan growth) are
 * income from cpfLife.age onwards and reduce the monthly withdrawal.
 */
export function calculateYearsUntilDepletion(
  startingBalance: number,
  annualReturnRate: number,
  expenses: import('@/types').RetirementExpense[],
  retirementAge: number,
  currentAge: number,
  maxAge: number = DEFAULT_MAX_AGE,
  cpfLife: CPFLifeEstimate | null = null
): { yearsUntilDepletion: number | null; depletionAge: number | null } {
  const monthlyRate = annualReturnRate / MONTHS_PER_YEAR
  let balance = startingBalance
  const maxMonths = (maxAge - retirementAge) * MONTHS_PER_YEAR
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  // Calculate months to retirement to establish the baseline for retirement month
  const monthsToRetirement = (retirementAge - currentAge) * MONTHS_PER_YEAR
  const retirementYear = currentYear + Math.floor((currentMonth - 1 + monthsToRetirement) / MONTHS_PER_YEAR)
  const retirementMonth = ((currentMonth - 1 + monthsToRetirement) % MONTHS_PER_YEAR) + 1

  for (let monthIndex = 0; monthIndex < maxMonths; monthIndex++) {
    // Calculate current date
    const yearOffset = Math.floor(monthIndex / MONTHS_PER_YEAR)
    const monthOffset = monthIndex % MONTHS_PER_YEAR
    const year = Math.floor(retirementYear) + yearOffset
    const month = Math.round(retirementMonth) + monthOffset

    // Adjust if month exceeds 12
    const adjustedYear = month > MONTHS_PER_YEAR ? year + Math.floor((month - 1) / MONTHS_PER_YEAR) : year
    const adjustedMonth = month > MONTHS_PER_YEAR ? ((month - 1) % MONTHS_PER_YEAR) + 1 : month

    // Format current month as YYYY-MM
    const currentMonthStr = `${Math.floor(adjustedYear)}-${String(Math.round(adjustedMonth)).padStart(DATE_PADDING_LENGTH, DATE_PADDING_CHAR)}`

    // Calculate total expenses for this month with inflation-adjusted amounts
    let monthlyExpenses = 0
    expenses.forEach(expense => {
      // Determine if expense is active in this month
      const startDateStr = expense.startDate || `${currentYear}-${String(currentMonth).padStart(DATE_PADDING_LENGTH, DATE_PADDING_CHAR)}`
      const endDateStr = expense.endDate || FAR_FUTURE_DATE

      // Simple string comparison works for YYYY-MM format
      if (currentMonthStr >= startDateStr && currentMonthStr < endDateStr) {
        // Calculate months from expense start for inflation
        const startDate = new Date(startDateStr + DATE_DAY_SUFFIX)
        const currentDate = new Date(currentMonthStr + DATE_DAY_SUFFIX)
        const monthsFromExpenseStart = Math.max(0,
          (currentDate.getFullYear() - startDate.getFullYear()) * MONTHS_PER_YEAR +
          (currentDate.getMonth() - startDate.getMonth())
        )
        const yearsFromExpenseStart = monthsFromExpenseStart / MONTHS_PER_YEAR
        const inflatedAmount = expense.monthlyAmount * Math.pow(1 + expense.inflationRate, yearsFromExpenseStart)
        monthlyExpenses += inflatedAmount
      }
    })

    // CPF LIFE payouts offset expenses from the payout start age
    const age = retirementAge + monthIndex / MONTHS_PER_YEAR
    let cpfLifeIncome = 0
    if (cpfLife && cpfLife.monthlyPayout > 0 && age >= cpfLife.age) {
      cpfLifeIncome = getCPFLifePayoutForYear(
        cpfLife.monthlyPayout,
        Math.floor(age - cpfLife.age),
        cpfLife.plan
      )
    }
    const withdrawal = monthlyExpenses - cpfLifeIncome

    // Check if balance can cover the withdrawal
    if (balance < withdrawal) {
      // Portfolio depleted - calculate exact age
      const yearsFromRetirement = roundToTwoDecimals(monthIndex / MONTHS_PER_YEAR)
      const depletionAge = roundToTwoDecimals(currentAge + ((retirementAge - currentAge) * MONTHS_PER_YEAR + monthIndex) / MONTHS_PER_YEAR)
      return { yearsUntilDepletion: yearsFromRetirement, depletionAge }
    }

    // Withdraw expenses (net of CPF LIFE income) from portfolio
    balance -= withdrawal

    // Apply investment returns on remaining balance
    balance = balance * (1 + monthlyRate)

    // Stop if balance goes negative
    if (balance <= 0) {
      // Portfolio depleted - calculate exact age
      const yearsFromRetirement = roundToTwoDecimals(monthIndex / MONTHS_PER_YEAR)
      const depletionAge = roundToTwoDecimals(currentAge + ((retirementAge - currentAge) * MONTHS_PER_YEAR + monthIndex) / MONTHS_PER_YEAR)
      return { yearsUntilDepletion: yearsFromRetirement, depletionAge }
    }
  }

  // Portfolio lasted until max age - sustainable
  return { yearsUntilDepletion: null, depletionAge: null }
}

/**
 * Phase 4: Check if expense rate is sustainable (>5% annually is risky)
 */
export function checkSustainabilityWarning(
  portfolioValue: number,
  annualExpenses: number
): boolean {
  // An empty or negative portfolio cannot sustain any withdrawals
  if (portfolioValue <= 0) return true
  const expenseRate = annualExpenses / portfolioValue
  return expenseRate > SUSTAINABLE_WITHDRAWAL_RATE
}

/**
 * Helper: Find the actual age when all income stops
 */
function findActualRetirementAge(data: UserData): number {
  const incomeSources = data.incomeSources || []

  if (incomeSources.length === 0) {
    return data.retirementAge
  }

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  let latestIncomeAge = data.retirementAge

  incomeSources.forEach(source => {
    if (source.endDate) {
      const [year, month] = source.endDate.split('-').map(Number)
      const monthsFromNow = (year - currentYear) * MONTHS_PER_YEAR + (month - currentMonth)
      const ageWhenIncomeEnds = data.currentAge + (monthsFromNow / MONTHS_PER_YEAR)
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

  // Calculate until actual end of income (may be beyond retirement age)
  const actualRetirementAge = findActualRetirementAge(data)
  const yearsToActualRetirement = actualRetirementAge - data.currentAge

  // Shared engine (same loop as the monthly chart/table)
  const run = runProjection(data, yearsToActualRetirement * MONTHS_PER_YEAR)
  const futureValue = roundToTwoDecimals(run.finalBalance)
  const totalContributions = roundToTwoDecimals(run.totalContributions)

  // CPF LIFE payout at the payout age (CPF is projected past retirement if needed)
  const cpfLife = run.cpfLifeStart ?? projectCPFLifeStart(data)

  const investmentGrowth = futureValue - totalContributions

  // Calculate inflation adjustment based on actual accumulation period
  const inflationAdjustedValue = adjustForInflation(
    futureValue,
    data.inflationRate,
    yearsToActualRetirement
  )

  // Phase 4: Calculate post-retirement sustainability if expenses are defined
  let yearsUntilDepletion: number | null = null
  let depletionAge: number | null = null
  let sustainabilityWarning = false

  if (data.expenses && data.expenses.length > 0) {
    // Use actual retirement age (when income truly stops)
    const depletionResult = calculateYearsUntilDepletion(
      futureValue,
      data.expectedReturnRate,
      data.expenses,
      actualRetirementAge,
      data.currentAge,
      DEFAULT_MAX_AGE,
      cpfLife
    )
    yearsUntilDepletion = depletionResult.yearsUntilDepletion
    depletionAge = depletionResult.depletionAge

    // Calculate annual expenses for warning check (at retirement age, before inflation)
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    const monthsToRetirement = (actualRetirementAge - data.currentAge) * MONTHS_PER_YEAR
    const retirementYear = currentYear + Math.floor((currentMonth - 1 + monthsToRetirement) / MONTHS_PER_YEAR)
    const retirementMonth = ((currentMonth - 1 + monthsToRetirement) % MONTHS_PER_YEAR) + 1
    const retirementMonthStr = `${retirementYear}-${String(retirementMonth).padStart(DATE_PADDING_LENGTH, DATE_PADDING_CHAR)}`

    const annualExpenses = data.expenses.reduce((total, expense) => {
      const startDateStr = expense.startDate || `${currentYear}-${String(currentMonth).padStart(DATE_PADDING_LENGTH, DATE_PADDING_CHAR)}`
      const endDateStr = expense.endDate || FAR_FUTURE_DATE

      if (retirementMonthStr >= startDateStr && retirementMonthStr < endDateStr) {
        return total + expense.monthlyAmount * MONTHS_PER_YEAR
      }
      return total
    }, 0)

    sustainabilityWarning = checkSustainabilityWarning(futureValue, annualExpenses)
  }

  return {
    futureValue: roundToTwoDecimals(futureValue),
    totalContributions: roundToTwoDecimals(totalContributions),
    investmentGrowth: roundToTwoDecimals(investmentGrowth),
    inflationAdjustedValue: roundToTwoDecimals(inflationAdjustedValue),
    yearsToRetirement,
    yearsUntilDepletion,
    depletionAge,
    sustainabilityWarning,
    cpfLife
  }
}
