import type { UserData, MonthlyDataPoint, IncomeStream, OneOffReturn, Loan, OneTimeExpense, CPFAccounts } from '@/types'
import { adjustForInflation } from './calculations'
import { getLoanPaymentForMonth } from './loanCalculations'
import { calculateCPFContribution } from './cpfContributions'
import { applyMonthlyInterest, calculateMonthlyInterest, calculateExtraInterest } from './cpfInterest'
import { handleAge55Transition, applyPost55Contribution } from './cpfTransitions'
import { estimateCPFLifePayout, getCPFLifePayoutForYear } from './cpfLife'

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
 * Generate month-by-month projections from current age to retirement (or maxAge if specified)
 */
export function generateMonthlyProjections(data: UserData, maxAge?: number): MonthlyDataPoint[] {
  const monthlyRate = data.expectedReturnRate / 12
  const endAge = maxAge ?? data.retirementAge
  const yearsToEnd = endAge - data.currentAge
  const totalMonths = yearsToEnd * 12

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1 // Current month (1-12)

  let balance = data.currentSavings
  let cumulativeContributions = data.currentSavings

  const projections: MonthlyDataPoint[] = []

  const incomeSources = data.incomeSources || []
  const oneOffReturns = data.oneOffReturns || []

  // CPF tracking (optional)
  const cpfEnabled = data.cpf?.enabled ?? false
  let cpfAccounts: CPFAccounts = cpfEnabled && data.cpf
    ? { ...data.cpf.currentBalances }
    : { ordinaryAccount: 0, specialAccount: 0, medisaveAccount: 0, retirementAccount: 0 }
  let yearToDateCPFContributions = 0
  let hasCompletedAge55Transition = cpfAccounts.retirementAccount > 0

  // CPF Life payout tracking (from age 65)
  let cpfLifeHasStarted = false
  let cpfLifeInitialPayout = 0

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

    // CPF: Reset year-to-date contributions in January
    if (cpfEnabled && monthIndex > 0) {
      if (adjustedMonth === 1) {
        yearToDateCPFContributions = 0
      }
    }

    // CPF: Check for age 55 transition (happens once)
    if (cpfEnabled && age >= 55 && !hasCompletedAge55Transition) {
      const transition = handleAge55Transition(cpfAccounts, data.cpf!.retirementSumTarget)
      cpfAccounts = transition.accounts
      hasCompletedAge55Transition = true
    }

    // CPF Life: Start payouts at age 65 (happens once)
    if (cpfEnabled && age >= 65 && !cpfLifeHasStarted) {
      const cpfLifePlan = data.cpf?.cpfLifePlan || 'standard'
      cpfLifeInitialPayout = estimateCPFLifePayout(cpfAccounts.retirementAccount, cpfLifePlan)
      cpfLifeHasStarted = true
    }

    // Calculate income for this month
    let monthlyIncome = 0

    // Variable income sources - respect their actual start/end dates
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

    // CPF Life: Add monthly payout if age >= 65
    let cpfLifeIncome = 0
    if (cpfEnabled && cpfLifeHasStarted && cpfLifeInitialPayout > 0) {
      const yearsFrom65 = Math.max(0, age - 65)
      const cpfLifePlan = data.cpf?.cpfLifePlan || 'standard'
      cpfLifeIncome = getCPFLifePayoutForYear(cpfLifeInitialPayout, Math.floor(yearsFrom65), cpfLifePlan)
      monthlyIncome += cpfLifeIncome
    }

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
            : totalMonths + 1
          if (monthIndex >= startMonth && monthIndex < endMonth) {
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
        cpfContribution = calculateCPFContribution(cpfEligibleIncome, Math.floor(age), yearToDateCPFContributions)

        // Employee contribution reduces take-home pay
        monthlyIncome -= cpfContribution.employee

        // Track year-to-date contributions
        yearToDateCPFContributions += cpfContribution.total

        // Add contributions to CPF accounts
        if (age >= 55) {
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
    const expenses = data.expenses || []

    expenses.forEach(expense => {
      // Determine if expense is active in this month
      const startMonth = expense.startDate
        ? parseMonthDate(expense.startDate, currentYear, currentMonth)
        : 0 // Start immediately if no start date
      const endMonth = expense.endDate
        ? parseMonthDate(expense.endDate, currentYear, currentMonth)
        : totalMonths + 1 // Ongoing if no end date

      if (monthIndex >= startMonth && monthIndex < endMonth) {
        // Apply inflation from expense start
        const monthsFromExpenseStart = Math.max(0, monthIndex - startMonth)
        const yearsFromExpenseStart = monthsFromExpenseStart / 12
        const inflatedAmount = expense.monthlyAmount * Math.pow(1 + expense.inflationRate, yearsFromExpenseStart)
        monthlyExpenses += inflatedAmount
      }
    })

    // Phase 5: Add loan payments for this month
    const loans = data.loans || []
    loans.forEach((loan: Loan) => {
      const payment = getLoanPaymentForMonth(loan, adjustedYear, adjustedMonth)

      // CPF: For housing loans with CPF enabled, pay portion from CPF OA
      if (cpfEnabled && loan.useCPF && loan.category === 'housing' && payment > 0) {
        const cpfPercentage = loan.cpfPercentage ?? 100 // Default to 100% if not specified
        const cpfPortion = payment * (cpfPercentage / 100)
        const oaUsedForLoan = Math.min(cpfAccounts.ordinaryAccount, cpfPortion)

        if (oaUsedForLoan > 0) {
          cpfAccounts.ordinaryAccount -= oaUsedForLoan
          monthlyExpenses += payment - oaUsedForLoan // Only add cash portion to expenses
        } else {
          monthlyExpenses += payment // No CPF available, pay full amount from cash
        }
      } else {
        monthlyExpenses += payment // Non-CPF loan or CPF not enabled
      }
    })

    // Phase 5: Add one-time expenses for this month
    const oneTimeExpenses = data.oneTimeExpenses || []
    oneTimeExpenses.forEach((expense: OneTimeExpense) => {
      const expenseMonth = parseMonthDate(expense.date, currentYear, currentMonth)
      if (monthIndex === expenseMonth) {
        monthlyExpenses += expense.amount
      }
    })

    // Store balance before any changes
    const balanceBeforeMonth = balance

    // Calculate net contribution (income - expenses)
    // This is what actually flows into/out of the portfolio
    const netContribution = monthlyIncome - monthlyExpenses

    // Add net contribution to portfolio
    balance += netContribution

    // Update cumulative contributions
    // Only add to contributions when net is positive (money flowing IN)
    // When expenses exceed income, we're withdrawing, not contributing
    const monthlyContribution = Math.max(0, netContribution)
    cumulativeContributions += monthlyContribution

    // Apply interest on the new balance (after contribution)
    balance = balance * (1 + monthlyRate)

    // Calculate growth this month (interest earned)
    const growth = balance - balanceBeforeMonth - netContribution

    // CPF: Apply monthly interest to CPF accounts and capture interest details
    let cpfMonthlyInterest = { oa: 0, sa: 0, ma: 0, ra: 0, total: 0 }
    let cpfExtraInterest = 0
    if (cpfEnabled) {
      // Calculate interest before applying (for snapshot)
      cpfMonthlyInterest = calculateMonthlyInterest(cpfAccounts, Math.floor(age))
      cpfExtraInterest = calculateExtraInterest(cpfAccounts, Math.floor(age))

      // Apply interest to accounts
      cpfAccounts = applyMonthlyInterest(cpfAccounts, Math.floor(age))
    }

    const dataPoint: MonthlyDataPoint = {
      monthIndex,
      year: adjustedYear,
      month: adjustedMonth,
      age: Math.round(age * 100) / 100,
      income: Math.round(monthlyIncome * 100) / 100,
      expenses: Math.round(monthlyExpenses * 100) / 100, // Show actual expenses
      contributions: Math.round(cumulativeContributions * 100) / 100,
      portfolioValue: Math.round(balance * 100) / 100,
      growth: Math.round(growth * 100) / 100
    }

    // Add CPF Life income if applicable
    if (cpfLifeIncome > 0) {
      dataPoint.cpfLifeIncome = Math.round(cpfLifeIncome * 100) / 100
    }

    // Add CPF snapshot if enabled
    if (cpfEnabled) {
      dataPoint.cpf = {
        monthIndex,
        age: Math.floor(age),
        accounts: { ...cpfAccounts },
        monthlyContribution: cpfContribution,
        monthlyInterest: {
          oa: cpfMonthlyInterest.oa,
          sa: cpfMonthlyInterest.sa,
          ma: cpfMonthlyInterest.ma,
          ra: cpfMonthlyInterest.ra,
          extraInterest: cpfExtraInterest,
          total: cpfMonthlyInterest.total + cpfExtraInterest
        },
        yearToDateContributions: yearToDateCPFContributions
      }
    }

    projections.push(dataPoint)
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
      expenses: Math.round(adjustForInflation(point.expenses, inflationRate, yearsFromStart) * 100) / 100,
      contributions: Math.round(adjustForInflation(point.contributions, inflationRate, yearsFromStart) * 100) / 100,
      portfolioValue: Math.round(adjustForInflation(point.portfolioValue, inflationRate, yearsFromStart) * 100) / 100,
      growth: Math.round(adjustForInflation(point.growth, inflationRate, yearsFromStart) * 100) / 100
    }
  })
}
