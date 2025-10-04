import { describe, test, expect } from 'vitest'
import {
  estimateCPFLifePayout,
  getCPFLifePayoutForYear,
  getCPFLifePayoutAge,
  calculateRADepletion,
  compareCPFLifeStrategies
} from './cpfLife'
import { CPF_CONFIG_2025 } from './cpfConfig'

describe('CPF Life', () => {
  describe('estimateCPFLifePayout', () => {
    test('estimates payout for BRS ($106,500) → ~$900/month', () => {
      const payout = estimateCPFLifePayout(106500, 'standard')
      expect(payout).toBeGreaterThan(850)
      expect(payout).toBeLessThan(950)
    })

    test('estimates payout for FRS ($213,000) → ~$1,700/month', () => {
      const payout = estimateCPFLifePayout(213000, 'standard')
      expect(payout).toBeGreaterThan(1600)
      expect(payout).toBeLessThan(1800)
    })

    test('estimates payout for ERS ($426,000) → ~$3,200/month', () => {
      const payout = estimateCPFLifePayout(426000, 'standard')
      expect(payout).toBeGreaterThan(3000)
      expect(payout).toBeLessThan(3400)
    })

    test('handles RA balance below BRS', () => {
      const payout = estimateCPFLifePayout(50000, 'standard')
      expect(payout).toBeGreaterThan(0)
      expect(payout).toBeLessThan(900)
    })

    test('handles RA balance above ERS', () => {
      const payout = estimateCPFLifePayout(500000, 'standard')
      expect(payout).toBeGreaterThan(3200)
    })

    test('standard plan has baseline multiplier (1.0)', () => {
      const standardPayout = estimateCPFLifePayout(213000, 'standard')
      const basicPayout = estimateCPFLifePayout(213000, 'basic')
      const escalatingPayout = estimateCPFLifePayout(213000, 'escalating')

      // Standard should be between basic (higher) and escalating (lower)
      expect(standardPayout).toBeLessThan(basicPayout)
      expect(standardPayout).toBeGreaterThan(escalatingPayout)
    })

    test('basic plan has higher initial payout (1.15x)', () => {
      const standardPayout = estimateCPFLifePayout(213000, 'standard')
      const basicPayout = estimateCPFLifePayout(213000, 'basic')

      // Basic should be ~15% higher than standard
      const ratio = basicPayout / standardPayout
      expect(ratio).toBeGreaterThan(1.14)
      expect(ratio).toBeLessThan(1.16)
    })

    test('escalating plan has lower initial payout (0.85x)', () => {
      const standardPayout = estimateCPFLifePayout(213000, 'standard')
      const escalatingPayout = estimateCPFLifePayout(213000, 'escalating')

      // Escalating should be ~15% lower than standard
      const ratio = escalatingPayout / standardPayout
      expect(ratio).toBeGreaterThan(0.84)
      expect(ratio).toBeLessThan(0.86)
    })

    test('handles zero RA balance', () => {
      const payout = estimateCPFLifePayout(0, 'standard')
      expect(payout).toBe(0)
    })

    test('payout scales proportionally with RA balance', () => {
      const payout1 = estimateCPFLifePayout(100000, 'standard')
      const payout2 = estimateCPFLifePayout(200000, 'standard')

      // Double the balance should roughly double the payout (within tier)
      expect(Math.abs(payout2 / payout1 - 2)).toBeLessThan(0.3)
    })

    test('returns rounded value to 2 decimal places', () => {
      const payout = estimateCPFLifePayout(213000, 'standard')
      const rounded = Math.round(payout * 100) / 100
      expect(payout).toBe(rounded)
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
      const result = compareCPFLifeStrategies(213000, 1500)

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
      const result = compareCPFLifeStrategies(213000, 1000)

      // Both should work in this case
      expect(result.cpfLife.monthlyPayout).toBeGreaterThan(1000)
      expect(result.manualWithdrawal.monthsUntilDepletion).toBeGreaterThan(100)
    })

    test('calculates lifetime payout for 25 years', () => {
      const result = compareCPFLifeStrategies(213000, 1500)

      const expectedLifetime = result.cpfLife.monthlyPayout * 25 * 12
      expect(Math.abs(result.cpfLife.totalLifetimePayout - expectedLifetime)).toBeLessThan(1)
    })

    test('manual withdrawal matches target monthly income', () => {
      const targetIncome = 1800
      const result = compareCPFLifeStrategies(213000, targetIncome)

      expect(result.manualWithdrawal.monthlyWithdrawal).toBe(targetIncome)
    })

    test('includes all required fields in response', () => {
      const result = compareCPFLifeStrategies(213000, 1500)

      expect(result.cpfLife).toHaveProperty('monthlyPayout')
      expect(result.cpfLife).toHaveProperty('guaranteed')
      expect(result.cpfLife).toHaveProperty('totalLifetimePayout')
      expect(result.manualWithdrawal).toHaveProperty('monthlyWithdrawal')
      expect(result.manualWithdrawal).toHaveProperty('monthsUntilDepletion')
      expect(result.manualWithdrawal).toHaveProperty('totalWithdrawn')
      expect(result).toHaveProperty('recommendation')
    })

    test('returns rounded values to 2 decimal places', () => {
      const result = compareCPFLifeStrategies(213000, 1500)

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

    test('handles very large RA balance', () => {
      const payout = estimateCPFLifePayout(1000000, 'standard')
      expect(payout).toBeGreaterThan(5000)
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
