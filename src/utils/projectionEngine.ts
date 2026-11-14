/**
 * Single month-by-month projection engine.
 *
 * Both the summary numbers (calculateRetirement) and the chart/table
 * (generateMonthlyProjections) run this loop, so they always agree.
 *
 * Each month, in order:
 * 1. CPF: reset year-to-date contributions in January, age 55 transition,
 *    start CPF LIFE payouts at the payout age (RA becomes the premium).
 * 2. Income (income sources, one-off returns, CPF LIFE payouts).
 * 3. CPF contributions from CPF-eligible income (employee share reduces cash income).
 * 4. Expenses, loan payments (housing loans may be paid partly from OA), one-time expenses.
 * 5. Income tax for the previous calendar year, spread over 12 months.
 * 6. Portfolio: add net cash flow, then apply the monthly return.
 * 7. CPF interest: accrued monthly, credited in December and at the final month.
 * 8. In December, compute the income tax on this calendar year's income.
 */
import type { UserData, MonthlyDataPoint, CPFAccounts, CPFContribution, CPFLifeEstimate } from '@/types'
import { getLoanPaymentForMonth } from './loanCalculations'
import { calculateCPFContribution, applyCPFContribution } from './cpfContributions'
import { accrueMonthlyInterest, creditInterest } from './cpfInterest'
import { handleAge55Transition } from './cpfTransitions'
import { estimateCPFLifePayout, getCPFLifePayoutForYear } from './cpfLife'
import { getCPFYearConfig, getRetirementSums, getCohortYear } from './cpfConfig'
import { calculateAnnualIncomeTax, getTaxableIncomeAmount, isEarnedIncome } from './incomeTax'
import {
  MONTHS_PER_YEAR,
  WEEKS_PER_YEAR,
  AVERAGE_DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  roundToTwoDecimals,
  CPF_AGE_55,
  CPF_LIFE_AGE,
  DEFAULT_CPF_PLAN
} from './constants'

export type CPFLifePlan = 'standard' | 'basic' | 'escalating'

/** CPF LIFE payout details, fixed when payouts start */
export type CPFLifeStart = CPFLifeEstimate

export interface ProjectionRun {
  points: MonthlyDataPoint[]
  /** Unrounded portfolio balance at the end of the last month */
  finalBalance: number
  /** Starting savings plus all positive monthly net cash flows */
  totalContributions: number
  /** Set if CPF LIFE payouts started within the projection */
  cpfLifeStart: CPFLifeStart | null
}

/**
 * Convert an amount at a given frequency to a monthly amount
 */
export function convertToMonthly(amount: number, frequency: string, customDays?: number): number {
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
 * Parse a YYYY-MM date string to a month index relative to baseYear/baseMonth
 */
export function parseMonthDate(dateStr: string, baseYear: number, baseMonth: number): number {
  const [year, month] = dateStr.split('-').map(Number)
  return (year - baseYear) * MONTHS_PER_YEAR + (month - baseMonth)
}

const ZERO_ACCOUNTS: CPFAccounts = {
  ordinaryAccount: 0,
  specialAccount: 0,
  medisaveAccount: 0,
  retirementAccount: 0
}

const zeroAccrual = () => ({ oa: 0, sa: 0, ma: 0, ra: 0 })

/**
 * Run the projection for totalMonths months starting from the current month.
 * Ages are whole years: age in month m = currentAge + floor(m / 12).
 */
export function runProjection(data: UserData, totalMonths: number): ProjectionRun {
  const months = Math.max(0, Math.round(totalMonths))
  const monthlyRate = data.expectedReturnRate / MONTHS_PER_YEAR
  const now = new Date()
  const startYear = now.getFullYear()
  const startMonth = now.getMonth() + 1

  const incomeSources = data.incomeSources || []
  const oneOffReturns = data.oneOffReturns || []
  const expenses = data.expenses || []
  const loans = data.loans || []
  const oneTimeExpenses = data.oneTimeExpenses || []
  const taxEnabled = data.taxEnabled ?? true

  let balance = data.currentSavings
  let totalContributions = data.currentSavings
  const points: MonthlyDataPoint[] = []

  // CPF state
  const cpf = data.cpf
  const cpfEnabled = cpf?.enabled ?? false
  const cohortYear = getCohortYear(data.currentAge, startYear)
  const cpfLifePlan: CPFLifePlan = cpf?.cpfLifePlan || DEFAULT_CPF_PLAN
  const payoutAge: 65 | 70 = cpf?.cpfLifePayoutAge === 70 ? 70 : CPF_LIFE_AGE
  let accounts: CPFAccounts = cpfEnabled && cpf ? { ...cpf.currentBalances } : { ...ZERO_ACCOUNTS }
  let accrued = zeroAccrual()
  let yearToDateCPF = 0
  let age55Done = accounts.retirementAccount > 0
  let cpfLifeStart: CPFLifeStart | null = null

  const creditAccrued = () => {
    accounts = creditInterest(accounts, accrued)
    accrued = zeroAccrual()
  }

  // Income tax state: tax computed for calendar year Y is paid during Y + 1
  const taxByYear = new Map<number, number>()
  let yearEarned = 0
  let yearOtherTaxable = 0
  let yearEmployeeCPF = 0

  for (let monthIndex = 0; monthIndex < months; monthIndex++) {
    const offset = startMonth - 1 + monthIndex
    const year = startYear + Math.floor(offset / MONTHS_PER_YEAR)
    const month = (offset % MONTHS_PER_YEAR) + 1
    const age = data.currentAge + Math.floor(monthIndex / MONTHS_PER_YEAR)

    if (month === 1) {
      yearToDateCPF = 0
    }

    // CPF: age 55 transition (once). Credit interest accrued so far first, since SA closes.
    if (cpfEnabled && cpf && age >= CPF_AGE_55 && !age55Done) {
      creditAccrued()
      accounts = handleAge55Transition(accounts, cpf.retirementSumTarget, cohortYear).accounts
      age55Done = true
    }

    // CPF LIFE: start payouts at the payout age (once). RA becomes the premium.
    if (cpfEnabled && age >= payoutAge && !cpfLifeStart) {
      creditAccrued()
      const raBalance = accounts.retirementAccount
      cpfLifeStart = {
        age,
        payoutAge,
        raBalance,
        monthlyPayout: estimateCPFLifePayout(raBalance, cpfLifePlan, payoutAge, cpf?.basicPlanPayoutPercent),
        plan: cpfLifePlan
      }
      accounts = { ...accounts, retirementAccount: 0 }
    }

    // Income
    let income = 0
    let cpfEligibleIncome = 0
    incomeSources.forEach(source => {
      const start = parseMonthDate(source.startDate, startYear, startMonth)
      const end = source.endDate ? parseMonthDate(source.endDate, startYear, startMonth) : Infinity
      if (monthIndex < start || monthIndex >= end) return

      const amount = convertToMonthly(source.amount, source.frequency, source.customFrequencyDays)
      income += amount
      if (source.cpfEligible) cpfEligibleIncome += amount

      const taxable = getTaxableIncomeAmount(source.type, amount)
      if (isEarnedIncome(source.type)) {
        yearEarned += taxable
      } else {
        yearOtherTaxable += taxable
      }
    })

    // One-off returns (not taxed)
    oneOffReturns.forEach(oneOff => {
      if (parseMonthDate(oneOff.date, startYear, startMonth) === monthIndex) {
        income += oneOff.amount
      }
    })

    // CPF LIFE payout (not taxed)
    let cpfLifeIncome = 0
    if (cpfLifeStart && cpfLifeStart.monthlyPayout > 0) {
      cpfLifeIncome = getCPFLifePayoutForYear(
        cpfLifeStart.monthlyPayout,
        age - cpfLifeStart.age,
        cpfLifeStart.plan
      )
      income += cpfLifeIncome
    }

    // CPF contributions
    let contribution: CPFContribution = {
      employee: 0,
      employer: 0,
      total: 0,
      allocation: { toOA: 0, toSA: 0, toMA: 0, toRA: 0 }
    }
    if (cpfEnabled && cpfEligibleIncome > 0) {
      contribution = calculateCPFContribution(cpfEligibleIncome, age, yearToDateCPF, year)
      income -= contribution.employee
      yearToDateCPF += contribution.total
      yearEmployeeCPF += contribution.employee

      // 55+: cap RA at the member's cohort FRS. Below 55: FRS of this year's cohort
      // (only limits MediSave overflow into SA).
      const frs = age >= CPF_AGE_55
        ? getRetirementSums(cohortYear).full
        : getRetirementSums(year).full
      const bhs = getCPFYearConfig(year).basicHealthcareSum
      accounts = applyCPFContribution(accounts, contribution.allocation, age, { frs, bhs })
    }

    // Recurring expenses (inflated from each expense's start)
    let monthExpenses = 0
    expenses.forEach(expense => {
      const start = expense.startDate ? parseMonthDate(expense.startDate, startYear, startMonth) : 0
      const end = expense.endDate ? parseMonthDate(expense.endDate, startYear, startMonth) : Infinity
      if (monthIndex < start || monthIndex >= end) return

      const yearsFromStart = Math.max(0, monthIndex - start) / MONTHS_PER_YEAR
      monthExpenses += expense.monthlyAmount * Math.pow(1 + expense.inflationRate, yearsFromStart)
    })

    // Loans: housing loans with useCPF pay cpfPercentage of the payment from OA if available
    loans.forEach(loan => {
      const payment = getLoanPaymentForMonth(loan, year, month)
      if (payment <= 0) return

      let fromOA = 0
      if (cpfEnabled && loan.useCPF && loan.category === 'housing') {
        const cpfPortion = payment * ((loan.cpfPercentage ?? 100) / 100)
        fromOA = Math.max(0, Math.min(accounts.ordinaryAccount, cpfPortion))
        if (fromOA > 0) {
          accounts = { ...accounts, ordinaryAccount: accounts.ordinaryAccount - fromOA }
        }
      }
      monthExpenses += payment - fromOA
    })

    // One-time expenses
    oneTimeExpenses.forEach(expense => {
      if (parseMonthDate(expense.date, startYear, startMonth) === monthIndex) {
        monthExpenses += expense.amount
      }
    })

    // Income tax on last calendar year's income, paid over this year's 12 months
    const incomeTax = taxEnabled ? (taxByYear.get(year - 1) ?? 0) / MONTHS_PER_YEAR : 0

    // Portfolio
    const balanceBefore = balance
    const netCashFlow = income - monthExpenses - incomeTax
    balance += netCashFlow
    totalContributions += Math.max(0, netCashFlow)
    balance = balance * (1 + monthlyRate)
    const growth = balance - balanceBefore - netCashFlow

    // CPF interest: accrue monthly, credit in December and at the final month
    let interest = { oa: 0, sa: 0, ma: 0, ra: 0, extraInterest: 0, total: 0 }
    if (cpfEnabled) {
      interest = accrueMonthlyInterest(accounts, age, year)
      accrued = {
        oa: accrued.oa + interest.oa,
        sa: accrued.sa + interest.sa,
        ma: accrued.ma + interest.ma,
        ra: accrued.ra + interest.ra
      }
      if (month === 12 || monthIndex === months - 1) {
        creditAccrued()
      }
    }

    // Income tax for this calendar year (age at 31 Dec = age this December)
    if (month === 12) {
      if (taxEnabled) {
        const { tax } = calculateAnnualIncomeTax({
          age,
          earnedIncome: yearEarned,
          otherTaxableIncome: yearOtherTaxable,
          employeeCPF: yearEmployeeCPF
        })
        taxByYear.set(year, tax)
      }
      yearEarned = 0
      yearOtherTaxable = 0
      yearEmployeeCPF = 0
    }

    const point: MonthlyDataPoint = {
      monthIndex,
      year,
      month,
      age: roundToTwoDecimals(data.currentAge + monthIndex / MONTHS_PER_YEAR),
      income: roundToTwoDecimals(income),
      expenses: roundToTwoDecimals(monthExpenses),
      incomeTax: roundToTwoDecimals(incomeTax),
      contributions: roundToTwoDecimals(totalContributions),
      portfolioValue: roundToTwoDecimals(balance),
      growth: roundToTwoDecimals(growth)
    }

    if (cpfLifeIncome > 0) {
      point.cpfLifeIncome = roundToTwoDecimals(cpfLifeIncome)
    }

    if (cpfEnabled) {
      point.cpf = {
        monthIndex,
        age,
        accounts: { ...accounts },
        monthlyContribution: contribution,
        monthlyInterest: interest,
        yearToDateContributions: yearToDateCPF
      }
    }

    points.push(point)
  }

  return { points, finalBalance: balance, totalContributions, cpfLifeStart }
}

/**
 * Project CPF forward to the CPF LIFE payout age and return the payout details.
 * CPF keeps earning interest (and contributions while CPF-eligible income continues)
 * after the user's retirement age, up to the payout age.
 * Returns null if CPF is disabled.
 */
export function projectCPFLifeStart(data: UserData): CPFLifeStart | null {
  if (!data.cpf?.enabled) return null
  const payoutAge = data.cpf.cpfLifePayoutAge === 70 ? 70 : CPF_LIFE_AGE
  const monthsToPayout = Math.max(0, payoutAge - data.currentAge) * MONTHS_PER_YEAR
  return runProjection(data, monthsToPayout + 1).cpfLifeStart
}
