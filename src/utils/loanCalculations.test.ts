import { describe, it, expect } from 'vitest'
import {
  calculateMonthlyPayment,
  generateAmortizationSchedule,
  calculateTotalInterest,
  getLoanPaymentForMonth
} from './loanCalculations'
import type { Loan } from '@/types'

describe('calculateMonthlyPayment', () => {
  it('calculates correct monthly payment for standard loan', () => {
    // $100,000 loan at 5% for 30 years (360 months)
    const payment = calculateMonthlyPayment(100000, 0.05, 360)
    expect(payment).toBeCloseTo(536.82, 2)
  })

  it('calculates correct payment for 15-year loan', () => {
    // $200,000 loan at 4% for 15 years (180 months)
    const payment = calculateMonthlyPayment(200000, 0.04, 180)
    expect(payment).toBeCloseTo(1479.38, 2)
  })

  it('handles zero interest rate', () => {
    // $12,000 loan at 0% for 12 months
    const payment = calculateMonthlyPayment(12000, 0, 12)
    expect(payment).toBe(1000) // Simply principal / months
  })

  it('returns 0 for invalid inputs', () => {
    expect(calculateMonthlyPayment(0, 0.05, 12)).toBe(0)
    expect(calculateMonthlyPayment(1000, 0.05, 0)).toBe(0)
    expect(calculateMonthlyPayment(-1000, 0.05, 12)).toBe(0)
  })

  it('calculates payment for short-term loan', () => {
    // $5,000 loan at 6% for 6 months
    const payment = calculateMonthlyPayment(5000, 0.06, 6)
    expect(payment).toBeCloseTo(847.98, 2)
  })
})

describe('generateAmortizationSchedule', () => {
  it('generates correct schedule for simple loan', () => {
    const loan: Loan = {
      id: '1',
      name: 'Test Loan',
      principal: 10000,
      interestRate: 0.06, // 6% annual
      termMonths: 12,
      startDate: '2025-01'
    }

    const schedule = generateAmortizationSchedule(loan, 2025, 1)

    expect(schedule).toHaveLength(12)
    expect(schedule[0].remainingBalance).toBeLessThan(10000)
    expect(schedule[11].remainingBalance).toBeLessThan(1) // Allow small rounding difference
  })

  it('first payment has correct interest and principal split', () => {
    const loan: Loan = {
      id: '1',
      name: 'Test Loan',
      principal: 10000,
      interestRate: 0.06,
      termMonths: 12,
      startDate: '2025-01'
    }

    const schedule = generateAmortizationSchedule(loan, 2025, 1)
    const firstPayment = schedule[0]

    // First month interest = 10000 * (0.06/12) = 50
    expect(firstPayment.interest).toBeCloseTo(50, 2)
    expect(firstPayment.principal).toBeGreaterThan(0)
    expect(firstPayment.payment).toBeCloseTo(firstPayment.interest + firstPayment.principal, 2)
  })

  it('balance decreases over time', () => {
    const loan: Loan = {
      id: '1',
      name: 'Test Loan',
      principal: 10000,
      interestRate: 0.06,
      termMonths: 12,
      startDate: '2025-01'
    }

    const schedule = generateAmortizationSchedule(loan, 2025, 1)

    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].remainingBalance).toBeLessThan(schedule[i - 1].remainingBalance)
    }
  })

  it('handles extra payments correctly', () => {
    const loanWithoutExtra: Loan = {
      id: '1',
      name: 'Test Loan',
      principal: 10000,
      interestRate: 0.06,
      termMonths: 12,
      startDate: '2025-01'
    }

    const loanWithExtra: Loan = {
      ...loanWithoutExtra,
      extraPayments: [
        { date: '2025-03', amount: 1000 } // Extra payment in month 3
      ]
    }

    const scheduleWithoutExtra = generateAmortizationSchedule(loanWithoutExtra, 2025, 1)
    const scheduleWithExtra = generateAmortizationSchedule(loanWithExtra, 2025, 1)

    // Schedule with extra payment should be shorter
    expect(scheduleWithExtra.length).toBeLessThan(scheduleWithoutExtra.length)

    // Extra payment should appear in month 2 (0-indexed)
    expect(scheduleWithExtra[2].extraPayment).toBe(1000)
  })

  it('handles multiple extra payments', () => {
    const loan: Loan = {
      id: '1',
      name: 'Test Loan',
      principal: 10000,
      interestRate: 0.06,
      termMonths: 24,
      startDate: '2025-01',
      extraPayments: [
        { date: '2025-06', amount: 500 },
        { date: '2025-12', amount: 500 },
        { date: '2026-06', amount: 500 }
      ]
    }

    const schedule = generateAmortizationSchedule(loan, 2025, 1)

    // Check extra payments are applied
    expect(schedule[5].extraPayment).toBe(500) // June 2025
    expect(schedule[11].extraPayment).toBe(500) // December 2025
    expect(schedule[17].extraPayment).toBe(500) // June 2026
  })

  it('handles zero interest loan', () => {
    const loan: Loan = {
      id: '1',
      name: 'Test Loan',
      principal: 12000,
      interestRate: 0,
      termMonths: 12,
      startDate: '2025-01'
    }

    const schedule = generateAmortizationSchedule(loan, 2025, 1)

    expect(schedule).toHaveLength(12)
    expect(schedule[0].interest).toBe(0)
    expect(schedule[0].principal).toBe(1000) // 12000 / 12
    expect(schedule[11].remainingBalance).toBe(0)
  })
})

describe('calculateTotalInterest', () => {
  it('calculates total interest for loan without extra payments', () => {
    const loan: Loan = {
      id: '1',
      name: 'Test Loan',
      principal: 10000,
      interestRate: 0.06,
      termMonths: 12,
      startDate: '2025-01'
    }

    const totalInterest = calculateTotalInterest(loan)

    // Total interest should be positive and less than principal
    expect(totalInterest).toBeGreaterThan(0)
    expect(totalInterest).toBeLessThan(loan.principal)
  })

  it('total interest is reduced with extra payments', () => {
    const loanWithoutExtra: Loan = {
      id: '1',
      name: 'Test Loan',
      principal: 10000,
      interestRate: 0.06,
      termMonths: 12,
      startDate: '2025-01'
    }

    const loanWithExtra: Loan = {
      ...loanWithoutExtra,
      extraPayments: [
        { date: '2025-03', amount: 2000 }
      ]
    }

    const interestWithoutExtra = calculateTotalInterest(loanWithoutExtra)
    const interestWithExtra = calculateTotalInterest(loanWithExtra)

    expect(interestWithExtra).toBeLessThan(interestWithoutExtra)
  })

  it('zero interest loan has zero total interest', () => {
    const loan: Loan = {
      id: '1',
      name: 'Test Loan',
      principal: 10000,
      interestRate: 0,
      termMonths: 12,
      startDate: '2025-01'
    }

    const totalInterest = calculateTotalInterest(loan)
    expect(totalInterest).toBe(0)
  })
})

describe('getLoanPaymentForMonth', () => {
  it('returns 0 before loan starts', () => {
    const loan: Loan = {
      id: '1',
      name: 'Test Loan',
      principal: 10000,
      interestRate: 0.06,
      termMonths: 12,
      startDate: '2025-06'
    }

    const payment = getLoanPaymentForMonth(loan, 2025, 3)
    expect(payment).toBe(0)
  })

  it('returns payment amount during active loan period', () => {
    const loan: Loan = {
      id: '1',
      name: 'Test Loan',
      principal: 10000,
      interestRate: 0.06,
      termMonths: 12,
      startDate: '2025-01'
    }

    const payment = getLoanPaymentForMonth(loan, 2025, 5)
    expect(payment).toBeGreaterThan(0)
  })

  it('returns 0 after loan is paid off', () => {
    const loan: Loan = {
      id: '1',
      name: 'Test Loan',
      principal: 10000,
      interestRate: 0.06,
      termMonths: 12,
      startDate: '2025-01'
    }

    // Check month after loan should be paid off
    const payment = getLoanPaymentForMonth(loan, 2026, 2)
    expect(payment).toBe(0)
  })

  it('includes extra payment in monthly amount', () => {
    const loan: Loan = {
      id: '1',
      name: 'Test Loan',
      principal: 10000,
      interestRate: 0.06,
      termMonths: 12,
      startDate: '2025-01',
      extraPayments: [
        { date: '2025-03', amount: 500 }
      ]
    }

    const regularPayment = getLoanPaymentForMonth(loan, 2025, 2)
    const paymentWithExtra = getLoanPaymentForMonth(loan, 2025, 3)

    expect(paymentWithExtra).toBeGreaterThan(regularPayment)
    expect(paymentWithExtra - regularPayment).toBeCloseTo(500, 2)
  })

  it('handles loans paid off early due to extra payments', () => {
    const loan: Loan = {
      id: '1',
      name: 'Test Loan',
      principal: 10000,
      interestRate: 0.06,
      termMonths: 12,
      startDate: '2025-01',
      extraPayments: [
        { date: '2025-03', amount: 9000 } // Large extra payment
      ]
    }

    // Check a month after the loan should be paid off due to extra payment
    const payment = getLoanPaymentForMonth(loan, 2025, 6)
    expect(payment).toBe(0)
  })
})
