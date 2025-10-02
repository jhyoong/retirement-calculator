import type { UserData, PostRetirementDataPoint, RetirementExpense } from '@/types'

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
    const startDateStr = expense.startDate || `${currentYear}-${String(currentMonth).padStart(2, '0')}`
    const endDateStr = expense.endDate || `9999-12`

    if (currentMonthStr >= startDateStr && currentMonthStr < endDateStr) {
      // Calculate months from expense start for inflation
      const startDate = new Date(startDateStr + '-01')
      const currentDate = new Date(currentMonthStr + '-01')
      const monthsFromExpenseStart = Math.max(0,
        (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
        (currentDate.getMonth() - startDate.getMonth())
      )
      const yearsFromExpenseStart = monthsFromExpenseStart / 12
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
  maxAge: number = 95
): PostRetirementDataPoint[] {
  // If no expenses, return empty array
  if (!data.expenses || data.expenses.length === 0) {
    return []
  }

  const monthlyRate = data.expectedReturnRate / 12
  const maxMonths = (maxAge - data.retirementAge) * 12
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1 // Current month (1-12)
  const yearsToRetirement = data.retirementAge - data.currentAge
  const monthsToRetirement = yearsToRetirement * 12
  const retirementYear = currentYear + Math.floor((currentMonth - 1 + monthsToRetirement) / 12)
  const retirementMonth = ((currentMonth - 1 + monthsToRetirement) % 12) + 1

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
    const yearOffset = Math.floor(monthIndex / 12)
    const monthOffset = monthIndex % 12
    const year = retirementYear + yearOffset
    const month = retirementMonth + monthOffset

    // Adjust if month exceeds 12
    const adjustedYear = month > 12 ? year + Math.floor((month - 1) / 12) : year
    const adjustedMonth = month > 12 ? ((month - 1) % 12) + 1 : month

    // Calculate age (fractional)
    const age = data.retirementAge + (monthIndex / 12)

    // Format current month as YYYY-MM
    const currentMonthStr = `${adjustedYear}-${String(adjustedMonth).padStart(2, '0')}`

    // Calculate expenses for this month (inflation-adjusted)
    const monthlyExpenses = calculateMonthlyExpenses(
      data.expenses,
      currentMonthStr,
      currentYear,
      currentMonth
    )

    // Store portfolio value before changes
    const portfolioBeforeMonth = portfolioValue

    // Subtract expenses
    portfolioValue -= monthlyExpenses

    // Apply investment growth on remaining balance
    portfolioValue = portfolioValue * (1 + monthlyRate)

    // Calculate growth this month
    const growth = portfolioValue - portfolioBeforeMonth + monthlyExpenses

    // Ensure portfolio doesn't go negative
    if (portfolioValue < 0) {
      portfolioValue = 0
    }

    projections.push({
      monthIndex,
      year: adjustedYear,
      month: adjustedMonth,
      age: Math.round(age * 100) / 100,
      expenses: Math.round(monthlyExpenses * 100) / 100,
      portfolioValue: Math.round(portfolioValue * 100) / 100,
      growth: Math.round(growth * 100) / 100
    })
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
  const monthsToRetirement = (retirementAge - currentAge) * 12
  const retirementYear = currentYear + Math.floor((currentMonth - 1 + monthsToRetirement) / 12)
  const retirementMonth = ((currentMonth - 1 + monthsToRetirement) % 12) + 1
  const retirementMonthStr = `${retirementYear}-${String(retirementMonth).padStart(2, '0')}`

  let total = 0

  expenses.forEach(expense => {
    const startDateStr = expense.startDate || `${currentYear}-${String(currentMonth).padStart(2, '0')}`
    const endDateStr = expense.endDate || `9999-12`

    if (retirementMonthStr >= startDateStr && retirementMonthStr < endDateStr) {
      total += expense.monthlyAmount
    }
  })

  return Math.round(total * 100) / 100
}
