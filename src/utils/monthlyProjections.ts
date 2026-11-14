import type { UserData, MonthlyDataPoint } from '@/types'
import { adjustForInflation } from './calculations'
import { runProjection } from './projectionEngine'
import { MONTHS_PER_YEAR, roundToTwoDecimals } from './constants'

/**
 * Generate month-by-month projections from current age to retirement (or maxAge if specified).
 * Uses the shared projection engine, the same one behind calculateRetirement.
 */
export function generateMonthlyProjections(data: UserData, maxAge?: number): MonthlyDataPoint[] {
  const endAge = maxAge ?? data.retirementAge
  const totalMonths = (endAge - data.currentAge) * MONTHS_PER_YEAR
  return runProjection(data, totalMonths).points
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
    const yearsFromStart = (point.monthIndex + 1) / MONTHS_PER_YEAR
    const adjust = (value: number) =>
      roundToTwoDecimals(adjustForInflation(value, inflationRate, yearsFromStart))

    const adjusted: MonthlyDataPoint = {
      ...point,
      income: adjust(point.income),
      expenses: adjust(point.expenses),
      contributions: adjust(point.contributions),
      portfolioValue: adjust(point.portfolioValue),
      growth: adjust(point.growth)
    }
    if (point.incomeTax !== undefined) {
      adjusted.incomeTax = adjust(point.incomeTax)
    }
    if (point.cpfLifeIncome !== undefined) {
      adjusted.cpfLifeIncome = adjust(point.cpfLifeIncome)
    }
    return adjusted
  })
}
