import type { UserData, PostRetirementDataPoint, RetirementExpense } from '@/types'
import { estimateCPFLifePayout, getCPFLifePayoutForYear } from './cpfLife'
import {
  MONTHS_PER_YEAR,
  roundToTwoDecimals,
  DEFAULT_MAX_AGE,
  DEFAULT_CPF_PLAN,
  DATE_DAY_SUFFIX,
  FAR_FUTURE_DATE,
  DATE_PADDING_CHAR,
  DATE_PADDING_LENGTH
} from './constants'

/**
 * Calculate total monthly expenses at a given month with inflation applied
 */
function calculateMonthlyExpenses(
  expenses: RetirementExpense[],
  currentMonthStr: string,
  currentYear: number,
  currentMonth: number
): number {
  let totalExpenses = 0

  expenses.forEach(expense => {
    // Determine if expense is active in this month
    const startDateStr = expense.startDate || `${currentYear}-${String(currentMonth).padStart(DATE_PADDING_LENGTH, DATE_PADDING_CHAR)}`
    const endDateStr = expense.endDate || FAR_FUTURE_DATE

    if (currentMonthStr >= startDateStr && currentMonthStr < endDateStr) {
      // Calculate months from expense start for inflation
      const startDate = new Date(startDateStr + DATE_DAY_SUFFIX)
      const currentDate = new Date(currentMonthStr + DATE_DAY_SUFFIX)
      const monthsFromExpenseStart = Math.max(0,
        (currentDate.getFullYear() - startDate.getFullYear()) * MONTHS_PER_YEAR +
        (currentDate.getMonth() - startDate.getMonth())
      )
      const yearsFromExpenseStart = monthsFromExpenseStart / MONTHS_PER_YEAR
      const inflationMultiplier = Math.pow(1 + expense.inflationRate, yearsFromExpenseStart)
      totalExpenses += expense.monthlyAmount * inflationMultiplier
    }
  })

  return totalExpenses
}


/**
 * Generate month-by-month projections from retirement age to depletion or max age
 */
export function generatePostRetirementProjections(
  data: UserData,
  maxAge: number = DEFAULT_MAX_AGE,
  raBalanceAtRetirement: number = 0
): PostRetirementDataPoint[] {
  // If no expenses, return empty array
  if (!data.expenses || data.expenses.length === 0) {
    return []
  }

  const monthlyRate = data.expectedReturnRate / MONTHS_PER_YEAR
  const maxMonths = (maxAge - data.retirementAge) * MONTHS_PER_YEAR
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1 // Current month (1-12)
  const yearsToRetirement = data.retirementAge - data.currentAge
  const monthsToRetirement = yearsToRetirement * MONTHS_PER_YEAR
  const retirementYear = currentYear + Math.floor((currentMonth - 1 + monthsToRetirement) / MONTHS_PER_YEAR)
  const retirementMonth = ((currentMonth - 1 + monthsToRetirement) % MONTHS_PER_YEAR) + 1

  // Initialize CPF Life payout (from configured age, default 65)
  const cpfEnabled = data.cpf?.enabled || false
  const cpfLifePayoutAge = data.cpf?.cpfLifePayoutAge || 65
  let cpfLifeMonthlyPayout = 0
  if (cpfEnabled && raBalanceAtRetirement > 0) {
    const cpfLifePlan = data.cpf?.cpfLifePlan || DEFAULT_CPF_PLAN
    cpfLifeMonthlyPayout = estimateCPFLifePayout(raBalanceAtRetirement, cpfLifePlan, cpfLifePayoutAge)
  }

  // Start with portfolio value at retirement (calculated from Phase 1-3)
  // For now, we'll need this passed in or calculated
  // Assuming we start from current projection endpoint
  let portfolioValue = data.currentSavings // This should be futureValue from calculations

  const projections: PostRetirementDataPoint[] = []

  for (let monthIndex = 0; monthIndex < maxMonths; monthIndex++) {
    // Stop if portfolio is depleted
    if (portfolioValue <= 0) {
      break
    }

    // Calculate current date
    const yearOffset = Math.floor(monthIndex / MONTHS_PER_YEAR)
    const monthOffset = monthIndex % MONTHS_PER_YEAR
    const year = retirementYear + yearOffset
    const month = retirementMonth + monthOffset

    // Adjust if month exceeds 12
    const adjustedYear = month > MONTHS_PER_YEAR ? year + Math.floor((month - 1) / MONTHS_PER_YEAR) : year
    const adjustedMonth = month > MONTHS_PER_YEAR ? ((month - 1) % MONTHS_PER_YEAR) + 1 : month

    // Calculate age (fractional)
    const age = data.retirementAge + (monthIndex / MONTHS_PER_YEAR)

    // Format current month as YYYY-MM
    const currentMonthStr = `${adjustedYear}-${String(adjustedMonth).padStart(DATE_PADDING_LENGTH, DATE_PADDING_CHAR)}`

    // Calculate expenses for this month (inflation-adjusted)
    const monthlyExpenses = calculateMonthlyExpenses(
      data.expenses,
      currentMonthStr,
      currentYear,
      currentMonth
    )

    // Calculate CPF Life income if applicable (from configured payout age)
    let cpfLifeIncome = 0
    if (cpfEnabled && age >= cpfLifePayoutAge && cpfLifeMonthlyPayout > 0) {
      const yearsFromPayoutAge = Math.floor(age - cpfLifePayoutAge)
      const cpfLifePlan = data.cpf?.cpfLifePlan || DEFAULT_CPF_PLAN
      cpfLifeIncome = getCPFLifePayoutForYear(cpfLifeMonthlyPayout, yearsFromPayoutAge, cpfLifePlan)
    }

    // Store portfolio value before changes
    const portfolioBeforeMonth = portfolioValue

    // Add CPF Life income and subtract expenses
    portfolioValue += cpfLifeIncome
    portfolioValue -= monthlyExpenses

    // Apply investment growth on remaining balance
    portfolioValue = portfolioValue * (1 + monthlyRate)

    // Calculate growth this month
    const growth = portfolioValue - portfolioBeforeMonth + monthlyExpenses - cpfLifeIncome

    // Ensure portfolio doesn't go negative
    if (portfolioValue < 0) {
      portfolioValue = 0
    }

    const dataPoint: PostRetirementDataPoint = {
      monthIndex,
      year: adjustedYear,
      month: adjustedMonth,
      age: roundToTwoDecimals(age),
      expenses: roundToTwoDecimals(monthlyExpenses),
      portfolioValue: roundToTwoDecimals(portfolioValue),
      growth: roundToTwoDecimals(growth)
    }

    // Add CPF Life income if applicable
    if (cpfLifeIncome > 0) {
      dataPoint.cpfLifeIncome = roundToTwoDecimals(cpfLifeIncome)
    }

    projections.push(dataPoint)
  }

  return projections
}

/**
 * Calculate total expenses at retirement month (first month, no inflation yet)
 */
export function calculateInitialMonthlyExpenses(
  expenses: RetirementExpense[],
  retirementAge: number,
  currentAge: number
): number {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const monthsToRetirement = (retirementAge - currentAge) * MONTHS_PER_YEAR
  const retirementYear = currentYear + Math.floor((currentMonth - 1 + monthsToRetirement) / MONTHS_PER_YEAR)
  const retirementMonth = ((currentMonth - 1 + monthsToRetirement) % MONTHS_PER_YEAR) + 1
  const retirementMonthStr = `${retirementYear}-${String(retirementMonth).padStart(DATE_PADDING_LENGTH, DATE_PADDING_CHAR)}`

  let total = 0

  expenses.forEach(expense => {
    const startDateStr = expense.startDate || `${currentYear}-${String(currentMonth).padStart(DATE_PADDING_LENGTH, DATE_PADDING_CHAR)}`
    const endDateStr = expense.endDate || FAR_FUTURE_DATE

    if (retirementMonthStr >= startDateStr && retirementMonthStr < endDateStr) {
      total += expense.monthlyAmount
    }
  })

  return roundToTwoDecimals(total)
}
