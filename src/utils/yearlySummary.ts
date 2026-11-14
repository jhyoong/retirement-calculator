import type { MonthlyDataPoint } from '@/types'

export interface YearlySummary {
  year: number
  startAge: number
  startValue: number
  income: number
  expenses: number
  incomeTax: number
  growth: number
  endValue: number
  months: MonthlyDataPoint[]
  cpf?: {
    contributions: number
    oa: number
    saRa: number
    ma: number
  }
}

/**
 * Portfolio value at the start of a month, worked back from the month's end value.
 * Matches the projection engine: end = start + income - expenses - tax + growth.
 */
export function getStartValue(point: MonthlyDataPoint): number {
  return point.portfolioValue - point.income + point.expenses + (point.incomeTax ?? 0) - point.growth
}

/** Group monthly projection points by calendar year. */
export function groupByYear(points: MonthlyDataPoint[]): YearlySummary[] {
  const byYear = new Map<number, MonthlyDataPoint[]>()
  for (const point of points) {
    const months = byYear.get(point.year)
    if (months) {
      months.push(point)
    } else {
      byYear.set(point.year, [point])
    }
  }

  return Array.from(byYear.entries()).map(([year, months]) => {
    const first = months[0]
    const last = months[months.length - 1]
    const sum = (pick: (p: MonthlyDataPoint) => number) =>
      months.reduce((total, p) => total + pick(p), 0)

    const summary: YearlySummary = {
      year,
      startAge: first.age,
      startValue: getStartValue(first),
      income: sum(p => p.income),
      expenses: sum(p => p.expenses),
      incomeTax: sum(p => p.incomeTax ?? 0),
      growth: sum(p => p.growth),
      endValue: last.portfolioValue,
      months
    }

    if (last.cpf) {
      const accounts = last.cpf.accounts
      summary.cpf = {
        contributions: sum(p => p.cpf?.monthlyContribution.total ?? 0),
        oa: accounts.ordinaryAccount,
        saRa: accounts.specialAccount + accounts.retirementAccount,
        ma: accounts.medisaveAccount
      }
    }

    return summary
  })
}
