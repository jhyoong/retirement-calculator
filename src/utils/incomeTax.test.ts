import { describe, test, expect } from 'vitest'
import {
  calculateResidentIncomeTax,
  getEarnedIncomeRelief,
  getTaxableIncomeAmount,
  isEarnedIncome,
  calculateAnnualIncomeTax,
} from './incomeTax'

describe('calculateResidentIncomeTax', () => {
  test.each([
    [0, 0],
    [-500, 0],
    [20_000, 0],
    [30_000, 200],
    [40_000, 550],
    [80_000, 3_350],
    [120_000, 7_950],
    [160_000, 13_950],
    [200_000, 21_150],
    [240_000, 28_750],
    [280_000, 36_550],
    [320_000, 44_550],
    [500_000, 84_150],
    [1_000_000, 199_150],
    [1_100_000, 223_150],
  ])('chargeable %d -> tax %d', (income, expected) => {
    expect(calculateResidentIncomeTax(income)).toBeCloseTo(expected, 2)
  })

  test('mid-band value', () => {
    // 550 + 7% x 35,800 = 3,056
    expect(calculateResidentIncomeTax(75_800)).toBeCloseTo(3_056, 2)
  })
})

describe('getEarnedIncomeRelief', () => {
  test('age bands', () => {
    expect(getEarnedIncomeRelief(30, 50_000)).toBe(1_000)
    expect(getEarnedIncomeRelief(54, 50_000)).toBe(1_000)
    expect(getEarnedIncomeRelief(55, 50_000)).toBe(6_000)
    expect(getEarnedIncomeRelief(59, 50_000)).toBe(6_000)
    expect(getEarnedIncomeRelief(60, 50_000)).toBe(8_000)
    expect(getEarnedIncomeRelief(75, 50_000)).toBe(8_000)
  })

  test('capped at earned income', () => {
    expect(getEarnedIncomeRelief(62, 3_000)).toBe(3_000)
    expect(getEarnedIncomeRelief(40, 0)).toBe(0)
  })
})

describe('getTaxableIncomeAmount', () => {
  test('salary, business, custom are fully taxable', () => {
    expect(getTaxableIncomeAmount('salary', 10_000)).toBe(10_000)
    expect(getTaxableIncomeAmount('business', 10_000)).toBe(10_000)
    expect(getTaxableIncomeAmount('custom', 10_000)).toBe(10_000)
  })

  test('rental is 85% taxable', () => {
    expect(getTaxableIncomeAmount('rental', 24_000)).toBeCloseTo(20_400, 2)
  })

  test('dividend is not taxable', () => {
    expect(getTaxableIncomeAmount('dividend', 10_000)).toBe(0)
  })
})

describe('isEarnedIncome', () => {
  test('salary and business only', () => {
    expect(isEarnedIncome('salary')).toBe(true)
    expect(isEarnedIncome('business')).toBe(true)
    expect(isEarnedIncome('rental')).toBe(false)
    expect(isEarnedIncome('dividend')).toBe(false)
    expect(isEarnedIncome('custom')).toBe(false)
  })
})

describe('calculateAnnualIncomeTax', () => {
  test('worked example: age 30, salary 96,000, employee CPF 19,200', () => {
    const result = calculateAnnualIncomeTax({
      age: 30,
      earnedIncome: 96_000,
      otherTaxableIncome: 0,
      employeeCPF: 19_200,
    })
    expect(result.assessableIncome).toBe(96_000)
    expect(result.totalReliefs).toBe(20_200)
    expect(result.chargeableIncome).toBe(75_800)
    expect(result.tax).toBeCloseTo(3_056, 2)
  })

  test('reliefs capped at 80,000', () => {
    const result = calculateAnnualIncomeTax({
      age: 60,
      earnedIncome: 200_000,
      otherTaxableIncome: 0,
      employeeCPF: 90_000,
    })
    expect(result.totalReliefs).toBe(80_000)
    expect(result.chargeableIncome).toBe(120_000)
    expect(result.tax).toBeCloseTo(7_950, 2)
  })

  test('rental-only income gets no earned income relief', () => {
    const rental = getTaxableIncomeAmount('rental', 40_000) // 34,000
    const result = calculateAnnualIncomeTax({
      age: 65,
      earnedIncome: 0,
      otherTaxableIncome: rental,
      employeeCPF: 0,
    })
    expect(result.assessableIncome).toBe(34_000)
    expect(result.totalReliefs).toBe(0)
    expect(result.chargeableIncome).toBe(34_000)
    // 200 + 3.5% x 4,000 = 340
    expect(result.tax).toBeCloseTo(340, 2)
  })

  test('chargeable income never negative', () => {
    const result = calculateAnnualIncomeTax({
      age: 30,
      earnedIncome: 500,
      otherTaxableIncome: 0,
      employeeCPF: 100,
    })
    expect(result.chargeableIncome).toBe(0)
    expect(result.tax).toBe(0)
  })
})
