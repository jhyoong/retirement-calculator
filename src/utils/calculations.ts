import type { UserData, CalculationResult, ValidationResult, ValidationError, IncomeStream, OneOffReturn, CPFAccounts } from '@/types'
import { getLoanPaymentForMonth } from './loanCalculations'
import { calculateCPFContribution } from './cpfContributions'
import { applyMonthlyInterest } from './cpfInterest'
import { handleAge55Transition, applyPost55Contribution } from './cpfTransitions'
import {
  MONTHS_PER_YEAR,
  WEEKS_PER_YEAR,
  AVERAGE_DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  roundToTwoDecimals,
  MIN_AGE,
  MAX_AGE,
  CPF_AGE_55,
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
 * Helper: Convert frequency to monthly amount
 */
function convertToMonthly(
  amount: number,
  frequency: string,
  customDays?: number
): number {
  switch (frequency) {
    case 'daily':
      return amount * AVERAGE_DAYS_PER_MONTH
    case 'weekly':
      return amount * WEEKS_PER_YEAR / MONTHS_PER_YEAR
    case 'monthly':
      return amount
    case 'yearly':
      return amount / MONTHS_PER_YEAR
    case 'custom':
      if (!customDays || customDays <= 0) return 0
      return (amount * DAYS_PER_YEAR) / customDays / MONTHS_PER_YEAR
    default:
      return 0
  }
}

/**
 * Helper: Parse YYYY-MM date string to month index from start
 */
function parseMonthDate(dateStr: string, baseYear: number, baseMonth: number): number {
  const [year, month] = dateStr.split('-').map(Number)
  return (year - baseYear) * MONTHS_PER_YEAR + (month - baseMonth)
}

/**
 * Calculate future value with time-based income sources
 * Month-by-month calculation considering variable income streams
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
  cpfData?: import('@/types').CPFData
): { futureValue: number; totalContributions: number } {
  const monthlyRate = annualRate / MONTHS_PER_YEAR
  const months = years * MONTHS_PER_YEAR
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1 // Current month (1-12)

  let balance = principal
  let totalContributions = principal

  // CPF tracking (optional)
  const cpfEnabled = cpfData?.enabled ?? false
  let cpfAccounts: CPFAccounts = cpfEnabled && cpfData
    ? { ...cpfData.currentBalances }
    : { ordinaryAccount: 0, specialAccount: 0, medisaveAccount: 0, retirementAccount: 0 }
  let yearToDateCPFContributions = 0
  let hasCompletedAge55Transition = cpfAccounts.retirementAccount > 0
  let cumulativeHousingUsage = 0

  // Process month by month
  for (let month = 0; month < months; month++) {
    // Calculate current age
    const age = currentAge + Math.floor(month / MONTHS_PER_YEAR)

    // CPF: Reset year-to-date contributions in January
    if (cpfEnabled && month > 0) {
      const monthOffset = month % MONTHS_PER_YEAR
      const monthNum = currentMonth + monthOffset
      const adjustedMonth = monthNum > MONTHS_PER_YEAR ? ((monthNum - 1) % MONTHS_PER_YEAR) + 1 : monthNum
      if (adjustedMonth === 1) {
        yearToDateCPFContributions = 0
      }
    }

    // CPF: Check for age 55 transition (happens once)
    if (cpfEnabled && age >= CPF_AGE_55 && !hasCompletedAge55Transition) {
      const transition = handleAge55Transition(cpfAccounts, cpfData!.retirementSumTarget)
      cpfAccounts = transition.accounts
      hasCompletedAge55Transition = true
    }

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

    // CPF: Calculate CPF contribution from CPF-eligible income
    let cpfContribution = {
      employee: 0,
      employer: 0,
      total: 0,
      allocation: { toOA: 0, toSA: 0, toMA: 0, toRA: 0 }
    }
    if (cpfEnabled) {
      // Extract CPF-eligible income
      let cpfEligibleIncome = 0
      incomeSources.forEach(source => {
        if (source.cpfEligible) {
          const startMonth = parseMonthDate(source.startDate, currentYear, currentMonth)
          const endMonth = source.endDate
            ? parseMonthDate(source.endDate, currentYear, currentMonth)
            : months + 1
          if (month >= startMonth && month < endMonth) {
            cpfEligibleIncome += convertToMonthly(
              source.amount,
              source.frequency,
              source.customFrequencyDays
            )
          }
        }
      })

      // Calculate CPF contribution if there's CPF-eligible income
      if (cpfEligibleIncome > 0) {
        cpfContribution = calculateCPFContribution(cpfEligibleIncome, age, yearToDateCPFContributions)

        // Employee contribution reduces take-home pay (employer portion doesn't affect cash flow)
        monthlyContribution -= cpfContribution.employee

        // Track year-to-date contributions
        yearToDateCPFContributions += cpfContribution.total

        // Add contributions to CPF accounts
        if (age >= CPF_AGE_55) {
          cpfAccounts = applyPost55Contribution(cpfAccounts, cpfContribution.allocation)
        } else {
          cpfAccounts.ordinaryAccount += cpfContribution.allocation.toOA
          cpfAccounts.specialAccount += cpfContribution.allocation.toSA
          cpfAccounts.medisaveAccount += cpfContribution.allocation.toMA
        }
      }
    }

    // Calculate expenses for this month
    let monthlyExpenses = 0
    if (expenses && expenses.length > 0) {
      expenses.forEach(expense => {
        // Determine if expense is active in this month
        const startMonth = expense.startDate
          ? parseMonthDate(expense.startDate, currentYear, currentMonth)
          : 0 // Start immediately if no start date
        const endMonth = expense.endDate
          ? parseMonthDate(expense.endDate, currentYear, currentMonth)
          : months + 1 // Ongoing if no end date

        if (month >= startMonth && month < endMonth) {
          // Calculate inflation from expense start
          const monthsFromExpenseStart = Math.max(0, month - startMonth)
          const yearsFromExpenseStart = monthsFromExpenseStart / 12
          const inflatedAmount = expense.monthlyAmount * Math.pow(1 + expense.inflationRate, yearsFromExpenseStart)
          monthlyExpenses += inflatedAmount
        }
      })
    }

    // Phase 5: Add loan payments for this month
    let housingLoanPayment = 0
    if (loans && loans.length > 0) {
      const yearOffset = Math.floor(month / MONTHS_PER_YEAR)
      const monthOffset = month % MONTHS_PER_YEAR
      const year = currentYear + yearOffset
      const monthNum = currentMonth + monthOffset
      const adjustedYear = monthNum > MONTHS_PER_YEAR ? year + Math.floor((monthNum - 1) / MONTHS_PER_YEAR) : year
      const adjustedMonth = monthNum > MONTHS_PER_YEAR ? ((monthNum - 1) % MONTHS_PER_YEAR) + 1 : monthNum

      loans.forEach(loan => {
        const payment = getLoanPaymentForMonth(loan, adjustedYear, adjustedMonth)
        if (loan.category === 'housing') {
          housingLoanPayment += payment
        }
        monthlyExpenses += payment
      })
    }

    // CPF: Use OA for housing loan payment if available
    if (cpfEnabled && housingLoanPayment > 0) {
      const oaUsedForHousing = Math.min(cpfAccounts.ordinaryAccount, housingLoanPayment)
      if (oaUsedForHousing > 0) {
        cpfAccounts.ordinaryAccount -= oaUsedForHousing
        monthlyExpenses -= oaUsedForHousing // Reduce cash expenses by OA usage
        cumulativeHousingUsage += oaUsedForHousing
      }
    }

    // Phase 5: Add one-time expenses if they occur in this month
    if (oneTimeExpenses && oneTimeExpenses.length > 0) {
      oneTimeExpenses.forEach(expense => {
        const expenseMonth = parseMonthDate(expense.date, currentYear, currentMonth)
        if (month === expenseMonth) {
          monthlyExpenses += expense.amount
        }
      })
    }

    // Calculate net cash flow
    const netContribution = monthlyContribution - monthlyExpenses

    // Add net cash flow to balance
    balance += netContribution

    // Update total contributions
    // Only add to contributions when net is positive (money flowing IN)
    // When expenses exceed income, we're withdrawing, not contributing
    const positiveContribution = Math.max(0, netContribution)
    totalContributions += positiveContribution

    // Apply interest
    balance = balance * (1 + monthlyRate)

    // CPF: Apply monthly interest to CPF accounts
    if (cpfEnabled) {
      cpfAccounts = applyMonthlyInterest(cpfAccounts, age)
    }
  }

  return {
    futureValue: roundToTwoDecimals(balance),
    totalContributions: roundToTwoDecimals(totalContributions)
  }
}

/**
 * Phase 4: Calculate post-retirement portfolio sustainability
 * Returns depletion info, or null values if sustainable
 */
export function calculateYearsUntilDepletion(
  startingBalance: number,
  annualReturnRate: number,
  expenses: import('@/types').RetirementExpense[],
  retirementAge: number,
  currentAge: number,
  maxAge: number = DEFAULT_MAX_AGE
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

    // Check if balance can cover expenses
    if (balance < monthlyExpenses) {
      // Portfolio depleted - calculate exact age
      const yearsFromRetirement = roundToTwoDecimals(monthIndex / MONTHS_PER_YEAR)
      const depletionAge = roundToTwoDecimals(currentAge + ((retirementAge - currentAge) * MONTHS_PER_YEAR + monthIndex) / MONTHS_PER_YEAR)
      return { yearsUntilDepletion: yearsFromRetirement, depletionAge }
    }

    // Withdraw expenses from portfolio
    balance -= monthlyExpenses

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
  if (portfolioValue === 0) return true
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

  const result = calculateFutureValueWithIncomeSources(
    data.currentSavings,
    data.expectedReturnRate,
    yearsToActualRetirement,
    data.currentAge,
    data.incomeSources || [],
    data.oneOffReturns || [],
    data.expenses,
    data.loans,
    data.oneTimeExpenses,
    data.cpf
  )
  const futureValue = result.futureValue
  const totalContributions = result.totalContributions

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
    const actualRetirementAge = findActualRetirementAge(data)

    const depletionResult = calculateYearsUntilDepletion(
      futureValue,
      data.expectedReturnRate,
      data.expenses,
      actualRetirementAge,
      data.currentAge
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
    sustainabilityWarning
  }
}
