import type { UserData, MonthlyDataPoint, IncomeStream, OneOffReturn } from '@/types'
import { adjustForInflation } from './calculations'

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
 * Generate month-by-month projections from current age to retirement
 */
export function generateMonthlyProjections(data: UserData): MonthlyDataPoint[] {
  const monthlyRate = data.expectedReturnRate / 12
  const yearsToRetirement = data.retirementAge - data.currentAge
  const totalMonths = yearsToRetirement * 12

  const currentYear = new Date().getFullYear()
  const currentMonth = 1 // January baseline

  let balance = data.currentSavings
  let cumulativeContributions = data.currentSavings

  const projections: MonthlyDataPoint[] = []

  // Determine if we use income sources or legacy monthly contribution
  const hasIncomeSources = data.incomeSources && data.incomeSources.length > 0
  const hasOneOffReturns = data.oneOffReturns && data.oneOffReturns.length > 0
  const useIncomeSources = hasIncomeSources || hasOneOffReturns
  const incomeSources = data.incomeSources || []
  const oneOffReturns = data.oneOffReturns || []

  for (let monthIndex = 0; monthIndex < totalMonths; monthIndex++) {
    // Calculate current date
    const yearOffset = Math.floor(monthIndex / 12)
    const monthOffset = monthIndex % 12
    const year = currentYear + yearOffset
    const month = currentMonth + monthOffset

    // Adjust if month exceeds 12
    const adjustedYear = month > 12 ? year + Math.floor((month - 1) / 12) : year
    const adjustedMonth = month > 12 ? ((month - 1) % 12) + 1 : month

    // Calculate age (fractional)
    const age = data.currentAge + (monthIndex / 12)

    // Calculate income for this month
    let monthlyIncome = 0

    if (useIncomeSources) {
      // Phase 2: Variable income sources
      incomeSources.forEach((source: IncomeStream) => {
        const startMonth = parseMonthDate(source.startDate, currentYear, currentMonth)
        const endMonth = source.endDate
          ? parseMonthDate(source.endDate, currentYear, currentMonth)
          : totalMonths + 1 // Ongoing

        if (monthIndex >= startMonth && monthIndex < endMonth) {
          monthlyIncome += convertToMonthly(
            source.amount,
            source.frequency,
            source.customFrequencyDays
          )
        }
      })

      // Add one-off returns
      oneOffReturns.forEach((oneOff: OneOffReturn) => {
        const returnMonth = parseMonthDate(oneOff.date, currentYear, currentMonth)
        if (monthIndex === returnMonth) {
          monthlyIncome += oneOff.amount
        }
      })
    } else {
      // Phase 1: Constant monthly contribution
      monthlyIncome = data.monthlyContribution
    }

    // Store balance before any changes
    const balanceBeforeMonth = balance

    // Add income to balance
    balance += monthlyIncome
    cumulativeContributions += monthlyIncome

    // Apply interest on the new balance (after contribution)
    balance = balance * (1 + monthlyRate)

    // Calculate growth this month (interest earned)
    const growth = balance - balanceBeforeMonth - monthlyIncome

    projections.push({
      monthIndex,
      year: adjustedYear,
      month: adjustedMonth,
      age: Math.round(age * 100) / 100,
      income: Math.round(monthlyIncome * 100) / 100,
      contributions: Math.round(cumulativeContributions * 100) / 100,
      portfolioValue: Math.round(balance * 100) / 100,
      growth: Math.round(growth * 100) / 100
    })
  }

  return projections
}

/**
 * Apply inflation adjustment to all monetary values in monthly projections
 */
export function applyInflationAdjustment(
  projections: MonthlyDataPoint[],
  inflationRate: number
): MonthlyDataPoint[] {
  return projections.map((point) => {
    // Month index represents the END of that month, so add 1 before dividing
    const yearsFromStart = (point.monthIndex + 1) / 12

    return {
      ...point,
      income: Math.round(adjustForInflation(point.income, inflationRate, yearsFromStart) * 100) / 100,
      contributions: Math.round(adjustForInflation(point.contributions, inflationRate, yearsFromStart) * 100) / 100,
      portfolioValue: Math.round(adjustForInflation(point.portfolioValue, inflationRate, yearsFromStart) * 100) / 100,
      growth: Math.round(adjustForInflation(point.growth, inflationRate, yearsFromStart) * 100) / 100
    }
  })
}
