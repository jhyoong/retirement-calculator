import type { Loan, ExtraPayment } from '@/types'

// Re-export for convenience
export type { ExtraPayment }

/**
 * Calculate monthly payment for a loan using standard amortization formula
 * M = P * [r(1+r)^n] / [(1+r)^n - 1]
 *
 * @param principal - Loan amount
 * @param annualRate - Annual interest rate as decimal (e.g., 0.05 for 5%)
 * @param termMonths - Loan term in months
 * @returns Monthly payment amount
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (principal <= 0 || termMonths <= 0) {
    return 0
  }

  // Handle zero interest rate
  if (annualRate === 0) {
    return principal / termMonths
  }

  const monthlyRate = annualRate / 12
  const payment = principal *
    (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1)

  return Math.round(payment * 100) / 100
}

/**
 * Payment breakdown for a specific month
 */
export interface PaymentBreakdown {
  monthIndex: number; // 0-based (0 = first payment)
  payment: number; // Total payment
  principal: number; // Principal portion
  interest: number; // Interest portion
  extraPayment: number; // Extra payment applied this month
  remainingBalance: number; // Balance after this payment
}

/**
 * Generate full amortization schedule for a loan
 * Includes support for extra payments
 *
 * @param loan - Loan details
 * @param startYear - Year loan starts (for extra payment matching)
 * @param startMonth - Month loan starts (1-12)
 * @returns Array of payment breakdowns
 */
export function generateAmortizationSchedule(
  loan: Loan,
  startYear: number,
  startMonth: number
): PaymentBreakdown[] {
  const schedule: PaymentBreakdown[] = []
  const monthlyPayment = calculateMonthlyPayment(loan.principal, loan.interestRate, loan.termMonths)
  const monthlyRate = loan.interestRate / 12

  let balance = loan.principal
  let monthIndex = 0

  // Create map of extra payments by month index for quick lookup
  const extraPaymentMap = new Map<number, number>()
  if (loan.extraPayments) {
    loan.extraPayments.forEach(extra => {
      const [year, month] = extra.date.split('-').map(Number)
      const monthsSinceStart = (year - startYear) * 12 + (month - startMonth)
      if (monthsSinceStart >= 0 && monthsSinceStart < loan.termMonths) {
        const existing = extraPaymentMap.get(monthsSinceStart) || 0
        extraPaymentMap.set(monthsSinceStart, existing + extra.amount)
      }
    })
  }

  while (balance > 0.01 && monthIndex < loan.termMonths) {
    // Calculate interest on remaining balance
    const interestPayment = balance * monthlyRate

    // Calculate principal payment
    let principalPayment = monthlyPayment - interestPayment

    // Get extra payment for this month
    const extraPayment = extraPaymentMap.get(monthIndex) || 0

    // Total principal reduction
    const totalPrincipalPayment = principalPayment + extraPayment

    // Don't overpay - cap at remaining balance
    const actualPrincipalPayment = Math.min(totalPrincipalPayment, balance)

    // Update balance
    balance -= actualPrincipalPayment

    // Record payment breakdown
    schedule.push({
      monthIndex,
      payment: Math.round((interestPayment + Math.min(principalPayment, balance + actualPrincipalPayment)) * 100) / 100,
      principal: Math.round((actualPrincipalPayment - extraPayment) * 100) / 100,
      interest: Math.round(interestPayment * 100) / 100,
      extraPayment: Math.round(extraPayment * 100) / 100,
      remainingBalance: Math.round(Math.max(0, balance) * 100) / 100
    })

    monthIndex++
  }

  return schedule
}

/**
 * Calculate total interest paid over the life of a loan
 */
export function calculateTotalInterest(loan: Loan): number {
  const [year, month] = loan.startDate.split('-').map(Number)
  const schedule = generateAmortizationSchedule(loan, year, month)

  const totalInterest = schedule.reduce((sum, payment) => sum + payment.interest, 0)
  return Math.round(totalInterest * 100) / 100
}

/**
 * Calculate monthly payment amount for a given date
 * Returns 0 if the loan is not active at that date
 */
export function getLoanPaymentForMonth(
  loan: Loan,
  targetYear: number,
  targetMonth: number
): number {
  const [startYear, startMonth] = loan.startDate.split('-').map(Number)

  // Calculate months since loan start
  const monthsSinceStart = (targetYear - startYear) * 12 + (targetMonth - startMonth)

  // Check if loan is active this month
  if (monthsSinceStart < 0) {
    return 0 // Loan hasn't started yet
  }

  // Generate schedule to find actual term (may be shorter with extra payments)
  const schedule = generateAmortizationSchedule(loan, startYear, startMonth)

  if (monthsSinceStart >= schedule.length) {
    return 0 // Loan is paid off
  }

  // Return total payment (regular + extra) for this month
  const payment = schedule[monthsSinceStart]
  return payment.payment + payment.extraPayment
}
