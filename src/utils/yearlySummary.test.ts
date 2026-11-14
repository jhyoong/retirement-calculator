import { describe, it, expect } from 'vitest'
import { groupByYear, getStartValue } from './yearlySummary'
import type { MonthlyDataPoint } from '@/types'

function point(
  monthIndex: number,
  year: number,
  month: number,
  values: { start: number; income: number; expenses: number; incomeTax?: number; growth: number }
): MonthlyDataPoint {
  const tax = values.incomeTax ?? 0
  return {
    monthIndex,
    year,
    month,
    age: 30 + monthIndex / 12,
    income: values.income,
    expenses: values.expenses,
    incomeTax: tax,
    contributions: 0,
    growth: values.growth,
    portfolioValue: values.start + values.income - values.expenses - tax + values.growth
  }
}

describe('getStartValue', () => {
  it('works back from the end value to the start of the month', () => {
    const p = point(0, 2026, 11, { start: 1000, income: 500, expenses: 200, incomeTax: 50, growth: 10 })
    expect(getStartValue(p)).toBeCloseTo(1000)
  })
})

describe('groupByYear', () => {
  it('returns an empty list for no data', () => {
    expect(groupByYear([])).toEqual([])
  })

  it('groups months by calendar year, including a partial first year', () => {
    const nov = point(0, 2026, 11, { start: 1000, income: 500, expenses: 200, incomeTax: 50, growth: 10 })
    const dec = point(1, 2026, 12, { start: nov.portfolioValue, income: 500, expenses: 200, incomeTax: 50, growth: 12 })
    const jan = point(2, 2027, 1, { start: dec.portfolioValue, income: 600, expenses: 300, growth: 15 })

    const years = groupByYear([nov, dec, jan])

    expect(years).toHaveLength(2)

    expect(years[0].year).toBe(2026)
    expect(years[0].months).toEqual([nov, dec])
    expect(years[0].startValue).toBeCloseTo(1000)
    expect(years[0].income).toBeCloseTo(1000)
    expect(years[0].expenses).toBeCloseTo(400)
    expect(years[0].incomeTax).toBeCloseTo(100)
    expect(years[0].growth).toBeCloseTo(22)
    expect(years[0].endValue).toBe(dec.portfolioValue)
    expect(years[0].startAge).toBe(nov.age)

    expect(years[1].year).toBe(2027)
    expect(years[1].startValue).toBeCloseTo(dec.portfolioValue)
    expect(years[1].endValue).toBe(jan.portfolioValue)
  })

  it('start + income - expenses - tax + growth equals end for each year', () => {
    const months: MonthlyDataPoint[] = []
    let value = 5000
    for (let i = 0; i < 24; i++) {
      const p = point(i, 2027 + Math.floor(i / 12), (i % 12) + 1, {
        start: value, income: 800, expenses: 450, incomeTax: 30, growth: value * 0.004
      })
      months.push(p)
      value = p.portfolioValue
    }

    for (const y of groupByYear(months)) {
      expect(y.startValue + y.income - y.expenses - y.incomeTax + y.growth).toBeCloseTo(y.endValue)
    }
  })

  it('sums CPF contributions and keeps year-end CPF balances when CPF data exists', () => {
    const base = point(0, 2027, 1, { start: 0, income: 100, expenses: 0, growth: 0 })
    const accounts = { ordinaryAccount: 10, specialAccount: 20, medisaveAccount: 30, retirementAccount: 5 }
    const cpf = (total: number, oa: number) => ({
      monthIndex: 0,
      age: 30,
      accounts: { ...accounts, ordinaryAccount: oa },
      monthlyContribution: { employee: 0, employer: 0, total, allocation: { toOA: 0, toSA: 0, toMA: 0, toRA: 0 } },
      monthlyInterest: { oa: 0, sa: 0, ma: 0, ra: 0, extraInterest: 0, total: 0 },
      yearToDateContributions: 0
    })
    const jan = { ...base, cpf: cpf(300, 10) }
    const feb = { ...base, monthIndex: 1, month: 2, cpf: cpf(400, 99) }

    const [y] = groupByYear([jan, feb])

    expect(y.cpf).toEqual({
      contributions: 700,
      oa: 99,
      saRa: 25,
      ma: 30
    })
  })

  it('leaves CPF empty when there is no CPF data', () => {
    const jan = point(0, 2027, 1, { start: 0, income: 100, expenses: 0, growth: 0 })
    expect(groupByYear([jan])[0].cpf).toBeUndefined()
  })
})
