import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { UserData, CPFData, Loan, IncomeStream } from '@/types'
import { runProjection, projectCPFLifeStart } from './projectionEngine'
import { calculateRetirement, calculateFutureValueWithIncomeSources, calculateYearsUntilDepletion } from './calculations'
import { generateMonthlyProjections, applyInflationAdjustment } from './monthlyProjections'
import { estimateCPFLifePayout } from './cpfLife'
import { calculateAnnualIncomeTax } from './incomeTax'

function cpfData(overrides: Partial<CPFData> = {}): CPFData {
  return {
    enabled: true,
    currentBalances: { ordinaryAccount: 0, specialAccount: 0, medisaveAccount: 0, retirementAccount: 0 },
    retirementSumTarget: 'full',
    cpfLifePlan: 'standard',
    cpfLifePayoutAge: 65,
    manualOverride: false,
    ...overrides
  }
}

function salary(amount: number, startDate: string, cpfEligible = false, endDate?: string): IncomeStream {
  return { id: 's', name: 'Salary', type: 'salary', amount, frequency: 'monthly', startDate, endDate, cpfEligible }
}

const housingLoan = (useCPF: boolean): Loan => ({
  id: 'l',
  name: 'HDB',
  category: 'housing',
  principal: 300000,
  interestRate: 0.03,
  termMonths: 300,
  startDate: '2026-01',
  useCPF,
  cpfPercentage: 100
})

describe('projectionEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T00:00:00'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('summary and chart use the same engine', () => {
    it('calculateRetirement futureValue equals the last monthly projection', () => {
      const data: UserData = {
        currentAge: 30,
        retirementAge: 40,
        currentSavings: 50000,
        expectedReturnRate: 0.05,
        inflationRate: 0.02,
        incomeSources: [salary(6000, '2026-01', true)],
        loans: [housingLoan(true)],
        cpf: cpfData({ currentBalances: { ordinaryAccount: 30000, specialAccount: 10000, medisaveAccount: 10000, retirementAccount: 0 } })
      }
      const result = calculateRetirement(data)
      const points = generateMonthlyProjections(data)
      expect(result.futureValue).toBe(points[points.length - 1].portfolioValue)
      expect(result.totalContributions).toBe(points[points.length - 1].contributions)
    })
  })

  describe('housing loans in the summary engine', () => {
    it('useCPF=false does not touch OA and is paid fully in cash', () => {
      const income = [salary(6000, '2026-01')] // not CPF-eligible, so OA only changes by interest
      const cpf = cpfData({ currentBalances: { ordinaryAccount: 50000, specialAccount: 0, medisaveAccount: 0, retirementAccount: 0 } })

      const withCPFNotUsed = calculateFutureValueWithIncomeSources(0, 0, 2, 30, income, [], [], [housingLoan(false)], [], cpf, false)
      const withoutCPF = calculateFutureValueWithIncomeSources(0, 0, 2, 30, income, [], [], [housingLoan(false)], [], undefined, false)
      const withCPFUsed = calculateFutureValueWithIncomeSources(0, 0, 2, 30, income, [], [], [housingLoan(true)], [], cpf, false)

      // Same cash result as having no CPF at all
      expect(withCPFNotUsed.futureValue).toBe(withoutCPF.futureValue)
      // Paying from OA leaves more cash
      expect(withCPFUsed.futureValue).toBeGreaterThan(withCPFNotUsed.futureValue)

      // OA never decreases when useCPF is false
      const run = runProjection(
        { currentAge: 30, retirementAge: 32, currentSavings: 0, expectedReturnRate: 0, inflationRate: 0, incomeSources: income, loans: [housingLoan(false)], cpf, taxEnabled: false },
        24
      )
      let previousOA = 50000
      run.points.forEach(p => {
        expect(p.cpf!.accounts.ordinaryAccount).toBeGreaterThanOrEqual(previousOA)
        previousOA = p.cpf!.accounts.ordinaryAccount
      })
    })
  })

  describe('CPF interest crediting', () => {
    it('accrues monthly and credits in December', () => {
      const cpf = cpfData({ currentBalances: { ordinaryAccount: 10000, specialAccount: 0, medisaveAccount: 0, retirementAccount: 0 } })
      const run = runProjection(
        { currentAge: 30, retirementAge: 32, currentSavings: 0, expectedReturnRate: 0, inflationRate: 0, cpf },
        14
      )
      const total = (i: number) => {
        const a = run.points[i].cpf!.accounts
        return a.ordinaryAccount + a.specialAccount + a.medisaveAccount + a.retirementAccount
      }
      // January to November: balances unchanged
      expect(total(10)).toBe(10000)
      expect(run.points[0].cpf!.monthlyInterest.oa).toBeGreaterThan(0)
      // December: 12 months of accrued interest credited (extra interest on OA goes to SA)
      const accruedInYear = run.points.slice(0, 12).reduce((sum, p) => sum + p.cpf!.monthlyInterest.total, 0)
      expect(total(11)).toBeCloseTo(10000 + accruedInYear, 2)
      expect(run.points[11].cpf!.accounts.specialAccount).toBeGreaterThan(0)
    })

    it('credits the remaining accrued interest at the final month', () => {
      const cpf = cpfData({ currentBalances: { ordinaryAccount: 10000, specialAccount: 0, medisaveAccount: 0, retirementAccount: 0 } })
      const run = runProjection(
        { currentAge: 30, retirementAge: 31, currentSavings: 0, expectedReturnRate: 0, inflationRate: 0, cpf },
        3
      )
      const accrued = run.points.reduce((sum, p) => sum + p.cpf!.monthlyInterest.total, 0)
      const a = run.points[2].cpf!.accounts
      expect(accrued).toBeGreaterThan(0)
      expect(a.ordinaryAccount + a.specialAccount + a.medisaveAccount).toBeCloseTo(10000 + accrued, 2)
    })
  })

  describe('CPF LIFE', () => {
    const base = (payoutAge: 65 | 70): UserData => ({
      currentAge: 64,
      retirementAge: 65,
      currentSavings: 0,
      expectedReturnRate: 0,
      inflationRate: 0,
      cpf: cpfData({
        cpfLifePayoutAge: payoutAge,
        currentBalances: { ordinaryAccount: 0, specialAccount: 0, medisaveAccount: 0, retirementAccount: 200000 }
      })
    })

    it('starts payouts at 70 when chosen', () => {
      const points = generateMonthlyProjections(base(70), 71)
      const firstPayoutIndex = points.findIndex(p => (p.cpfLifeIncome ?? 0) > 0)
      expect(firstPayoutIndex).toBe(6 * 12) // age 70
      expect(points[firstPayoutIndex].cpf!.age).toBe(70)

      const start = projectCPFLifeStart(base(70))!
      expect(start.age).toBe(70)
      expect(start.payoutAge).toBe(70)
      expect(points[firstPayoutIndex].cpfLifeIncome).toBe(estimateCPFLifePayout(start.raBalance, 'standard', 70))
      // RA kept earning interest from 64 to 70
      expect(start.raBalance).toBeGreaterThan(200000)
    })

    it('starts payouts at 65 by default', () => {
      const points = generateMonthlyProjections(base(65), 66)
      const firstPayoutIndex = points.findIndex(p => (p.cpfLifeIncome ?? 0) > 0)
      expect(firstPayoutIndex).toBe(12)
    })

    it('sets RA to 0 when payouts start (RA becomes the premium)', () => {
      const points = generateMonthlyProjections(base(65), 67)
      expect(points[11].cpf!.accounts.retirementAccount).toBeGreaterThan(200000)
      expect(points[12].cpf!.accounts.retirementAccount).toBe(0)
      expect(points[23].cpf!.accounts.retirementAccount).toBe(0)
    })

    it('uses the user-entered % for the Basic plan', () => {
      const data: UserData = {
        ...base(65),
        cpf: { ...base(65).cpf!, cpfLifePlan: 'basic', basicPlanPayoutPercent: 90 }
      }
      const start = projectCPFLifeStart(data)!
      expect(start.monthlyPayout).toBe(estimateCPFLifePayout(start.raBalance, 'basic', 65, 90))
      const standard = projectCPFLifeStart(base(65))!
      expect(start.monthlyPayout).toBeLessThan(standard.monthlyPayout)
    })

    it('results use the RA at the payout age, not at retirement', () => {
      const data: UserData = {
        ...base(70),
        incomeSources: [salary(3000, '2026-01', true, '2027-01')]
      }
      const result = calculateRetirement(data)
      const start = projectCPFLifeStart(data)!
      expect(result.cpfLife).toEqual(start)
      expect(result.cpfLife!.age).toBe(70)
    })
  })

  describe('depletion includes CPF LIFE income', () => {
    const expenses = [{ id: 'e', name: 'Living', category: 'living' as const, monthlyAmount: 2000, inflationRate: 0 }]

    it('CPF LIFE payouts extend how long the portfolio lasts', () => {
      const without = calculateYearsUntilDepletion(300000, 0, expenses, 65, 65)
      const withCPFLife = calculateYearsUntilDepletion(300000, 0, expenses, 65, 65, 95, {
        age: 65, payoutAge: 65, raBalance: 0, monthlyPayout: 1000, plan: 'standard'
      })
      // 300,000 / 2,000 = 150 withdrawals (balance hits 0 in month index 149);
      // 300,000 / (2,000 - 1,000) = 300 withdrawals (month index 299)
      expect(without.yearsUntilDepletion).toBe(12.42)
      expect(withCPFLife.yearsUntilDepletion).toBe(24.92)
    })

    it('payouts only count from the payout age and escalate on the Escalating plan', () => {
      const from70 = calculateYearsUntilDepletion(300000, 0, expenses, 65, 65, 95, {
        age: 70, payoutAge: 70, raBalance: 0, monthlyPayout: 1000, plan: 'standard'
      })
      // 60 months at 2,000 = 120,000; remaining 180,000 at 1,000 = 180 months -> month index 239
      expect(from70.yearsUntilDepletion).toBe(19.92)

      const escalating = calculateYearsUntilDepletion(300000, 0, expenses, 65, 65, 95, {
        age: 65, payoutAge: 65, raBalance: 0, monthlyPayout: 1000, plan: 'escalating'
      })
      // 30 years of (2,000 - 1,000 x 1.02^n) x 12 is about 233,000 < 300,000, so it lasts to 95
      expect(escalating.yearsUntilDepletion).toBeNull()
    })
  })

  describe('income tax', () => {
    it('deducts the tax for a year over the 12 months of the following year', () => {
      vi.setSystemTime(new Date('2027-01-15T00:00:00'))
      const data: UserData = {
        currentAge: 30,
        retirementAge: 32,
        currentSavings: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        incomeSources: [salary(8000, '2027-01')]
      }
      const points = generateMonthlyProjections(data)

      const annualTax = calculateAnnualIncomeTax({ age: 30, earnedIncome: 96000, otherTaxableIncome: 0, employeeCPF: 0 }).tax
      expect(annualTax).toBeGreaterThan(0)

      // No tax in 2027 (no 2026 income is invented)
      points.filter(p => p.year === 2027).forEach(p => expect(p.incomeTax).toBe(0))
      // 2028: 2027 tax spread over 12 months
      const points2028 = points.filter(p => p.year === 2028)
      expect(points2028).toHaveLength(12)
      points2028.forEach(p => expect(p.incomeTax).toBeCloseTo(annualTax / 12, 2))

      // Net cash flow subtracts the tax (0% return)
      const last = points[points.length - 1]
      expect(last.portfolioValue).toBeCloseTo(8000 * 24 - annualTax, 2)
    })

    it('uses employee CPF as relief', () => {
      vi.setSystemTime(new Date('2027-01-15T00:00:00'))
      const data: UserData = {
        currentAge: 30,
        retirementAge: 32,
        currentSavings: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        incomeSources: [salary(8000, '2027-01', true)],
        cpf: cpfData()
      }
      const points = generateMonthlyProjections(data)
      const employeeCPF2027 = points
        .filter(p => p.year === 2027)
        .reduce((sum, p) => sum + p.cpf!.monthlyContribution.employee, 0)
      const annualTax = calculateAnnualIncomeTax({ age: 30, earnedIncome: 96000, otherTaxableIncome: 0, employeeCPF: employeeCPF2027 }).tax
      expect(points.find(p => p.year === 2028)!.incomeTax).toBeCloseTo(annualTax / 12, 2)
    })

    it('only taxes the months projected in the first partial year', () => {
      vi.setSystemTime(new Date('2026-11-15T00:00:00'))
      const data: UserData = {
        currentAge: 30,
        retirementAge: 32,
        currentSavings: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        incomeSources: [salary(20000, '2026-01')]
      }
      const points = generateMonthlyProjections(data)
      // Nov + Dec 2026 = 40,000 earned income
      const tax2026 = calculateAnnualIncomeTax({ age: 30, earnedIncome: 40000, otherTaxableIncome: 0, employeeCPF: 0 }).tax
      expect(points[0].incomeTax).toBe(0)
      expect(points.find(p => p.year === 2027)!.incomeTax).toBeCloseTo(tax2026 / 12, 2)
    })

    it('taxes rental at 85% as other income, and does not tax dividends or one-off returns', () => {
      vi.setSystemTime(new Date('2027-01-15T00:00:00'))
      const data: UserData = {
        currentAge: 30,
        retirementAge: 32,
        currentSavings: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        incomeSources: [
          { id: 'r', name: 'Rent', type: 'rental', amount: 5000, frequency: 'monthly', startDate: '2027-01' },
          { id: 'd', name: 'Div', type: 'dividend', amount: 5000, frequency: 'monthly', startDate: '2027-01' }
        ],
        oneOffReturns: [{ id: 'o', date: '2027-06', amount: 100000, description: 'Windfall' }]
      }
      const points = generateMonthlyProjections(data)
      const annualTax = calculateAnnualIncomeTax({ age: 30, earnedIncome: 0, otherTaxableIncome: 5000 * 12 * 0.85, employeeCPF: 0 }).tax
      expect(points.find(p => p.year === 2028)!.incomeTax).toBeCloseTo(annualTax / 12, 2)
    })

    it('taxEnabled=false gives no tax', () => {
      vi.setSystemTime(new Date('2027-01-15T00:00:00'))
      const data: UserData = {
        currentAge: 30,
        retirementAge: 32,
        currentSavings: 0,
        expectedReturnRate: 0,
        inflationRate: 0,
        incomeSources: [salary(8000, '2027-01')],
        taxEnabled: false
      }
      const points = generateMonthlyProjections(data)
      points.forEach(p => expect(p.incomeTax).toBe(0))
      expect(points[points.length - 1].portfolioValue).toBe(8000 * 24)
    })
  })
})

describe('applyInflationAdjustment', () => {
  it('adjusts cpfLifeIncome and incomeTax too', () => {
    const [adjusted] = applyInflationAdjustment(
      [{ monthIndex: 11, year: 2027, month: 1, age: 65, income: 1100, expenses: 0, incomeTax: 110, cpfLifeIncome: 1100, contributions: 0, portfolioValue: 0, growth: 0 }],
      0.1
    )
    expect(adjusted.cpfLifeIncome).toBe(1000)
    expect(adjusted.incomeTax).toBe(100)
  })
})
