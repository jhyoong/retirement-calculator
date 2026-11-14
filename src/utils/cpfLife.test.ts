import { describe, test, expect } from 'vitest'
import {
  estimateCPFLifePayout,
  getCPFLifePayoutForYear,
  getCPFLifePayoutAge,
  calculateRADepletion,
  compareCPFLifeStrategies
} from './cpfLife'
import { CPF_ESCALATING_PLAN_MULTIPLIER } from './constants'

describe('CPF Life', () => {
  describe('estimateCPFLifePayout (2026 cohort)', () => {
    const BRS = 110200
    const FRS = 220400
    const ERS = 440800

    test('BRS ($110,200) at 65 → midpoint of $890-$930', () => {
      expect(estimateCPFLifePayout(BRS, 'standard')).toBe(910)
    })

    test('FRS ($220,400) at 65 → midpoint of $1,640-$1,750', () => {
      expect(estimateCPFLifePayout(FRS, 'standard')).toBe(1695)
    })

    test('ERS ($440,800) at 65 → midpoint of $3,180-$3,410', () => {
      expect(estimateCPFLifePayout(ERS, 'standard')).toBe(3295)
    })

    test('age 70 uses the age-70 table directly', () => {
      expect(estimateCPFLifePayout(BRS, 'standard', 70)).toBe(1220)
      expect(estimateCPFLifePayout(FRS, 'standard', 70)).toBe(2280)
      expect(estimateCPFLifePayout(ERS, 'standard', 70)).toBe(4375)
    })

    test('deferral to 70 increases payout by about 33-35%, not 40%', () => {
      const ratio = estimateCPFLifePayout(FRS, 'standard', 70) / estimateCPFLifePayout(FRS, 'standard', 65)
      expect(ratio).toBeGreaterThan(1.3)
      expect(ratio).toBeLessThan(1.36)
    })

    test('interpolates linearly below BRS from (0,0)', () => {
      expect(estimateCPFLifePayout(BRS / 2, 'standard')).toBe(455)
    })

    test('interpolates linearly between BRS and FRS', () => {
      expect(estimateCPFLifePayout((BRS + FRS) / 2, 'standard')).toBe(1302.5)
    })

    test('is continuous around BRS (no drop just above BRS)', () => {
      const below = estimateCPFLifePayout(BRS - 1, 'standard')
      const at = estimateCPFLifePayout(BRS, 'standard')
      const above = estimateCPFLifePayout(BRS + 1, 'standard')
      expect(at).toBeGreaterThanOrEqual(below)
      expect(above).toBeGreaterThanOrEqual(at)
      expect(above - below).toBeLessThan(1)
    })

    test('is continuous around FRS', () => {
      const below = estimateCPFLifePayout(FRS - 1, 'standard')
      const at = estimateCPFLifePayout(FRS, 'standard')
      const above = estimateCPFLifePayout(FRS + 1, 'standard')
      expect(at).toBeGreaterThanOrEqual(below)
      expect(above).toBeGreaterThanOrEqual(at)
      expect(above - below).toBeLessThan(1)
    })

    test('is non-decreasing across the full range', () => {
      let prev = 0
      for (let ra = 0; ra <= ERS; ra += 5000) {
        const payout = estimateCPFLifePayout(ra, 'standard')
        expect(payout).toBeGreaterThanOrEqual(prev)
        prev = payout
      }
    })

    test('caps RA at ERS', () => {
      expect(estimateCPFLifePayout(500000, 'standard')).toBe(3295)
      expect(estimateCPFLifePayout(1000000, 'standard', 70)).toBe(4375)
    })

    test('escalating plan starts about 20% lower than standard', () => {
      const standardPayout = estimateCPFLifePayout(FRS, 'standard')
      const escalatingPayout = estimateCPFLifePayout(FRS, 'escalating')
      expect(CPF_ESCALATING_PLAN_MULTIPLIER).toBe(0.8)
      expect(escalatingPayout).toBeCloseTo(standardPayout * 0.8, 2)
    })

    test('basic plan applies the user-entered % of Standard', () => {
      const standardPayout = estimateCPFLifePayout(FRS, 'standard')
      const basicPayout = estimateCPFLifePayout(FRS, 'basic', 65, 90)
      expect(basicPayout).toBeCloseTo(standardPayout * 0.9, 2)
    })

    test('basic plan throws without a valid payout %', () => {
      expect(() => estimateCPFLifePayout(FRS, 'basic')).toThrow()
      expect(() => estimateCPFLifePayout(FRS, 'basic', 65, 0)).toThrow()
      expect(() => estimateCPFLifePayout(FRS, 'basic', 65, 101)).toThrow()
    })

    test('handles zero RA balance', () => {
      expect(estimateCPFLifePayout(0, 'standard')).toBe(0)
    })

    test('returns rounded value to 2 decimal places', () => {
      const payout = estimateCPFLifePayout(123457, 'standard')
      expect(payout).toBe(Math.round(payout * 100) / 100)
    })
  })

  describe('getCPFLifePayoutForYear', () => {
    test('returns same payout for standard plan', () => {
      const initialPayout = 1670
      const payout = getCPFLifePayoutForYear(initialPayout, 5, 'standard')
      expect(payout).toBe(initialPayout)
    })

    test('returns same payout for basic plan', () => {
      const initialPayout = 1920
      const payout = getCPFLifePayoutForYear(initialPayout, 5, 'basic')
      expect(payout).toBe(initialPayout)
    })

    test('escalates by 2% per year for escalating plan', () => {
      const initialPayout = 1420
      const payout1Year = getCPFLifePayoutForYear(initialPayout, 1, 'escalating')

      const expectedPayout = initialPayout * 1.02
      expect(Math.abs(payout1Year - expectedPayout)).toBeLessThan(0.5)
    })

    test('escalates correctly after 5 years', () => {
      const initialPayout = 1420
      const payout5Years = getCPFLifePayoutForYear(initialPayout, 5, 'escalating')

      const expectedPayout = initialPayout * Math.pow(1.02, 5)
      expect(Math.abs(payout5Years - expectedPayout)).toBeLessThan(1)
    })

    test('escalates correctly after 10 years', () => {
      const initialPayout = 1420
      const payout10Years = getCPFLifePayoutForYear(initialPayout, 10, 'escalating')

      const expectedPayout = initialPayout * Math.pow(1.02, 10)
      expect(Math.abs(payout10Years - expectedPayout)).toBeLessThan(1)
    })

    test('returns initial payout for year 0', () => {
      const initialPayout = 1420
      const payout = getCPFLifePayoutForYear(initialPayout, 0, 'escalating')
      expect(payout).toBe(initialPayout)
    })

    test('handles negative years (should return initial)', () => {
      const initialPayout = 1420
      const payout = getCPFLifePayoutForYear(initialPayout, -1, 'escalating')
      expect(payout).toBe(initialPayout)
    })

    test('returns rounded value to 2 decimal places', () => {
      const payout = getCPFLifePayoutForYear(1420, 3, 'escalating')
      const rounded = Math.round(payout * 100) / 100
      expect(payout).toBe(rounded)
    })
  })

  describe('getCPFLifePayoutAge', () => {
    test('returns default age 65 when no deferral', () => {
      const age = getCPFLifePayoutAge()
      expect(age).toBe(65)
    })

    test('returns default age 65 for invalid deferral (below 65)', () => {
      const age = getCPFLifePayoutAge(60)
      expect(age).toBe(65)
    })

    test('returns deferred age when valid (66-70)', () => {
      expect(getCPFLifePayoutAge(66)).toBe(66)
      expect(getCPFLifePayoutAge(67)).toBe(67)
      expect(getCPFLifePayoutAge(68)).toBe(68)
      expect(getCPFLifePayoutAge(69)).toBe(69)
      expect(getCPFLifePayoutAge(70)).toBe(70)
    })

    test('returns default age for deferral above 70', () => {
      const age = getCPFLifePayoutAge(71)
      expect(age).toBe(65)
    })

    test('returns 65 for age 65 exactly', () => {
      const age = getCPFLifePayoutAge(65)
      expect(age).toBe(65)
    })
  })

  describe('calculateRADepletion', () => {
    test('calculates depletion for basic scenario', () => {
      const result = calculateRADepletion(100000, 1000)

      expect(result.monthsUntilDepletion).toBeGreaterThan(100)
      expect(result.totalWithdrawn).toBeGreaterThan(100000)
      expect(result.totalInterestEarned).toBeGreaterThan(0)
    })

    test('includes interest earnings in total withdrawn', () => {
      const result = calculateRADepletion(100000, 1000, 0.04)

      // Total withdrawn should exceed initial balance due to interest
      expect(result.totalWithdrawn).toBeGreaterThan(100000)
      expect(result.totalInterestEarned).toBeGreaterThan(0)
    })

    test('handles high withdrawal rate (depletes quickly)', () => {
      const result = calculateRADepletion(100000, 5000)

      expect(result.monthsUntilDepletion).toBeLessThan(30)
    })

    test('handles low withdrawal rate (lasts long time)', () => {
      const result = calculateRADepletion(100000, 200)

      expect(result.monthsUntilDepletion).toBeGreaterThan(400)
    })

    test('handles zero interest rate', () => {
      const result = calculateRADepletion(100000, 1000, 0)

      expect(result.monthsUntilDepletion).toBe(100)
      expect(result.totalWithdrawn).toBe(100000)
      expect(result.totalInterestEarned).toBe(0)
    })

    test('stops at max 1200 months (100 years)', () => {
      const result = calculateRADepletion(1000000, 100)

      expect(result.monthsUntilDepletion).toBeLessThanOrEqual(1200)
    })

    test('handles withdrawal exceeding balance (depletes in 1 month)', () => {
      const result = calculateRADepletion(10000, 50000)

      expect(result.monthsUntilDepletion).toBe(1)
      // Should withdraw initial balance + interest earned in first month
      expect(result.totalWithdrawn).toBeGreaterThan(10000)
      expect(result.totalWithdrawn).toBeLessThan(10050)
    })

    test('returns rounded values to 2 decimal places', () => {
      const result = calculateRADepletion(100000, 1000)

      const roundedWithdrawn = Math.round(result.totalWithdrawn * 100) / 100
      const roundedInterest = Math.round(result.totalInterestEarned * 100) / 100

      expect(result.totalWithdrawn).toBe(roundedWithdrawn)
      expect(result.totalInterestEarned).toBe(roundedInterest)
    })
  })

  describe('compareCPFLifeStrategies', () => {
    test('recommends CPF Life when payout meets target', () => {
      const result = compareCPFLifeStrategies(220400, 1500)

      expect(result.recommendation).toContain('CPF Life')
      expect(result.cpfLife.monthlyPayout).toBeGreaterThan(1500)
      expect(result.cpfLife.guaranteed).toBe(true)
    })

    test('recommends CPF Life when manual withdrawal depletes early', () => {
      const result = compareCPFLifeStrategies(100000, 2000)

      expect(result.recommendation).toContain('CPF Life')
      expect(result.manualWithdrawal.monthsUntilDepletion).toBeLessThan(25 * 12)
    })

    test('allows either option when both work', () => {
      const result = compareCPFLifeStrategies(220400, 1000)

      // Both should work in this case
      expect(result.cpfLife.monthlyPayout).toBeGreaterThan(1000)
      expect(result.manualWithdrawal.monthsUntilDepletion).toBeGreaterThan(100)
    })

    test('calculates lifetime payout for 25 years', () => {
      const result = compareCPFLifeStrategies(220400, 1500)

      const expectedLifetime = result.cpfLife.monthlyPayout * 25 * 12
      expect(Math.abs(result.cpfLife.totalLifetimePayout - expectedLifetime)).toBeLessThan(1)
    })

    test('manual withdrawal matches target monthly income', () => {
      const targetIncome = 1800
      const result = compareCPFLifeStrategies(220400, targetIncome)

      expect(result.manualWithdrawal.monthlyWithdrawal).toBe(targetIncome)
    })

    test('includes all required fields in response', () => {
      const result = compareCPFLifeStrategies(220400, 1500)

      expect(result.cpfLife).toHaveProperty('monthlyPayout')
      expect(result.cpfLife).toHaveProperty('guaranteed')
      expect(result.cpfLife).toHaveProperty('totalLifetimePayout')
      expect(result.manualWithdrawal).toHaveProperty('monthlyWithdrawal')
      expect(result.manualWithdrawal).toHaveProperty('monthsUntilDepletion')
      expect(result.manualWithdrawal).toHaveProperty('totalWithdrawn')
      expect(result).toHaveProperty('recommendation')
    })

    test('returns rounded values to 2 decimal places', () => {
      const result = compareCPFLifeStrategies(220400, 1500)

      const roundedPayout = Math.round(result.cpfLife.monthlyPayout * 100) / 100
      const roundedLifetime = Math.round(result.cpfLife.totalLifetimePayout * 100) / 100
      const roundedWithdrawn = Math.round(result.manualWithdrawal.totalWithdrawn * 100) / 100

      expect(result.cpfLife.monthlyPayout).toBe(roundedPayout)
      expect(result.cpfLife.totalLifetimePayout).toBe(roundedLifetime)
      expect(result.manualWithdrawal.totalWithdrawn).toBe(roundedWithdrawn)
    })
  })

  describe('Edge cases and boundary conditions', () => {
    test('handles very small RA balance', () => {
      const payout = estimateCPFLifePayout(1000, 'standard')
      expect(payout).toBeGreaterThanOrEqual(0)
    })

    test('handles very large RA balance (capped at ERS payout)', () => {
      const payout = estimateCPFLifePayout(1000000, 'standard')
      expect(payout).toBe(3295)
    })

    test('negative RA balance gives zero payout', () => {
      expect(estimateCPFLifePayout(-1000, 'standard')).toBe(0)
    })

    test('depletion calculation handles zero withdrawal', () => {
      const result = calculateRADepletion(100000, 0)

      // Should hit max months since balance never depletes
      expect(result.monthsUntilDepletion).toBe(1200)
    })

    test('all functions handle negative inputs gracefully', () => {
      expect(() => estimateCPFLifePayout(-1000, 'standard')).not.toThrow()
      expect(() => calculateRADepletion(-100000, 1000)).not.toThrow()
      expect(() => compareCPFLifeStrategies(-213000, 1500)).not.toThrow()
    })
  })
})
