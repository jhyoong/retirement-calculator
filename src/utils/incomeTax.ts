/**
 * Singapore personal income tax for resident individuals only.
 * Figures from TAXES.md (sections 1.1, 1.5, 2.1-2.3, 3).
 *
 * Not modeled: spouse/child/parent reliefs, SRS relief, CPF cash top-up relief,
 * disability earned income relief, rental mortgage interest, non-resident rates.
 * No personal income tax rebate is applied (none for YA 2026/2027, section 1.5).
 */
import type { IncomeType } from '@/types'

// Resident progressive rates, YA 2024 onwards (section 1.1).
// Each band: income above `from` up to the next band's `from` is taxed at `rate`.
const RESIDENT_TAX_BANDS: { from: number; rate: number }[] = [
  { from: 0, rate: 0 },
  { from: 20_000, rate: 0.02 },
  { from: 30_000, rate: 0.035 },
  { from: 40_000, rate: 0.07 },
  { from: 80_000, rate: 0.115 },
  { from: 120_000, rate: 0.15 },
  { from: 160_000, rate: 0.18 },
  { from: 200_000, rate: 0.19 },
  { from: 240_000, rate: 0.195 },
  { from: 280_000, rate: 0.2 },
  { from: 320_000, rate: 0.22 },
  { from: 500_000, rate: 0.23 },
  { from: 1_000_000, rate: 0.24 },
]

// Total personal relief cap (section 2.1).
export const PERSONAL_RELIEF_CAP = 80_000

// Deemed expense rate for rental income (section 3).
export const RENTAL_DEEMED_EXPENSE_RATE = 0.15

const round2 = (value: number): number => Math.round(value * 100) / 100

export function calculateResidentIncomeTax(chargeableIncome: number): number {
  if (!(chargeableIncome > 0)) return 0
  let tax = 0
  for (let i = 0; i < RESIDENT_TAX_BANDS.length; i++) {
    const { from, rate } = RESIDENT_TAX_BANDS[i]
    const next = RESIDENT_TAX_BANDS[i + 1]
    const to = next ? next.from : Infinity
    if (chargeableIncome <= from) break
    tax += (Math.min(chargeableIncome, to) - from) * rate
  }
  return round2(tax)
}

// Earned Income Relief, non-disability (section 2.2). Capped at earned income.
export function getEarnedIncomeRelief(age: number, earnedIncome: number): number {
  if (!(earnedIncome > 0)) return 0
  let relief = 1_000
  if (age >= 60) relief = 8_000
  else if (age >= 55) relief = 6_000
  return Math.min(relief, earnedIncome)
}

// Portion of gross income that is taxable (section 3).
export function getTaxableIncomeAmount(type: IncomeType, grossAmount: number): number {
  switch (type) {
    case 'rental':
      return grossAmount * (1 - RENTAL_DEEMED_EXPENSE_RATE)
    case 'dividend':
      return 0
    default:
      return grossAmount
  }
}

export function isEarnedIncome(type: IncomeType): boolean {
  return type === 'salary' || type === 'business'
}

export function calculateAnnualIncomeTax(input: {
  age: number
  earnedIncome: number
  otherTaxableIncome: number
  employeeCPF: number
}): { assessableIncome: number; totalReliefs: number; chargeableIncome: number; tax: number } {
  const earnedIncome = Math.max(0, input.earnedIncome)
  const otherTaxableIncome = Math.max(0, input.otherTaxableIncome)
  const employeeCPF = Math.max(0, input.employeeCPF)

  const assessableIncome = round2(earnedIncome + otherTaxableIncome)
  const reliefs = getEarnedIncomeRelief(input.age, earnedIncome) + employeeCPF
  const totalReliefs = round2(Math.min(reliefs, PERSONAL_RELIEF_CAP))
  const chargeableIncome = round2(Math.max(0, assessableIncome - totalReliefs))
  const tax = calculateResidentIncomeTax(chargeableIncome)

  return { assessableIncome, totalReliefs, chargeableIncome, tax }
}
