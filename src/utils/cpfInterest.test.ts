import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyInterest,
  calculateExtraInterest,
  applyMonthlyInterest,
  getEffectiveInterestRate
} from './cpfInterest';
import type { CPFAccounts } from '@/types';

describe('CPF Interest', () => {
  describe('calculateMonthlyInterest', () => {
    it('should calculate OA interest at 2.5% annual (0.208% monthly)', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 10000,
        specialAccount: 0,
        medisaveAccount: 0,
        retirementAccount: 0
      };
      const result = calculateMonthlyInterest(accounts, 30);

      // 10000 * 0.025 / 12 = 20.83
      expect(result.oa).toBe(20.83);
      expect(result.sa).toBe(0);
      expect(result.ma).toBe(0);
      expect(result.ra).toBe(0);
      expect(result.total).toBe(20.83);
    });

    it('should calculate SA interest at 4.0% annual for age under 55', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 0,
        specialAccount: 15000,
        medisaveAccount: 0,
        retirementAccount: 0
      };
      const result = calculateMonthlyInterest(accounts, 40);

      // 15000 * 0.04 / 12 = 50
      expect(result.sa).toBe(50);
      expect(result.total).toBe(50);
    });

    it('should calculate SA interest as 0% for age 55 and above', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 0,
        specialAccount: 15000,
        medisaveAccount: 0,
        retirementAccount: 0
      };
      const result = calculateMonthlyInterest(accounts, 55);

      expect(result.sa).toBe(0);
    });

    it('should calculate MA interest at 4.0% annual', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 0,
        specialAccount: 0,
        medisaveAccount: 20000,
        retirementAccount: 0
      };
      const result = calculateMonthlyInterest(accounts, 45);

      // 20000 * 0.04 / 12 = 66.67
      expect(result.ma).toBe(66.67);
    });

    it('should calculate RA interest at 4.0% for age 55+', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 0,
        specialAccount: 0,
        medisaveAccount: 0,
        retirementAccount: 100000
      };
      const result = calculateMonthlyInterest(accounts, 60);

      // 100000 * 0.04 / 12 = 333.33
      expect(result.ra).toBe(333.33);
    });

    it('should calculate RA interest as 0% for age under 55', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 0,
        specialAccount: 0,
        medisaveAccount: 0,
        retirementAccount: 100000
      };
      const result = calculateMonthlyInterest(accounts, 50);

      expect(result.ra).toBe(0);
    });

    it('should sum all account interest correctly', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 10000,
        specialAccount: 15000,
        medisaveAccount: 20000,
        retirementAccount: 0
      };
      const result = calculateMonthlyInterest(accounts, 45);

      // OA: 20.83, SA: 50, MA: 66.67
      expect(result.total).toBe(137.50); // Sum rounded
    });

    it('should handle zero balances', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 0,
        specialAccount: 0,
        medisaveAccount: 0,
        retirementAccount: 0
      };
      const result = calculateMonthlyInterest(accounts, 30);

      expect(result.total).toBe(0);
    });
  });

  describe('calculateExtraInterest - Under 55', () => {
    it('should earn +1% on $60k total balance', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 20000,
        specialAccount: 30000,
        medisaveAccount: 10000,
        retirementAccount: 0
      };
      const result = calculateExtraInterest(accounts, 40);

      // 60000 * 0.01 / 12 = 50
      expect(result).toBe(50);
    });

    it('should cap OA contribution at $20k', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 40000,
        specialAccount: 0,
        medisaveAccount: 0,
        retirementAccount: 0
      };
      const result = calculateExtraInterest(accounts, 40);

      // Only 20000 (OA cap) * 0.01 / 12 = 16.67
      expect(result).toBe(16.67);
    });

    it('should use SMA balances after OA cap', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 10000,
        specialAccount: 30000,
        medisaveAccount: 25000,
        retirementAccount: 0
      };
      const result = calculateExtraInterest(accounts, 40);

      // 10k OA + 50k SMA (only 50k of 55k used to reach 60k cap)
      // 60000 * 0.01 / 12 = 50
      expect(result).toBe(50);
    });

    it('should cap total at $60k', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 20000,
        specialAccount: 50000,
        medisaveAccount: 50000,
        retirementAccount: 0
      };
      const result = calculateExtraInterest(accounts, 40);

      // Cap at 60000 * 0.01 / 12 = 50
      expect(result).toBe(50);
    });

    it('should handle balance below $60k', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 10000,
        specialAccount: 15000,
        medisaveAccount: 10000,
        retirementAccount: 0
      };
      const result = calculateExtraInterest(accounts, 40);

      // 35000 * 0.01 / 12 = 29.17
      expect(result).toBe(29.17);
    });

    it('should handle zero balance', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 0,
        specialAccount: 0,
        medisaveAccount: 0,
        retirementAccount: 0
      };
      const result = calculateExtraInterest(accounts, 40);

      expect(result).toBe(0);
    });
  });

  describe('calculateExtraInterest - Age 55+', () => {
    it('should earn +2% on first $30k', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 30000,
        specialAccount: 0,
        medisaveAccount: 0,
        retirementAccount: 0
      };
      const result = calculateExtraInterest(accounts, 55);

      // 30000 * 0.02 / 12 = 50
      expect(result).toBe(50);
    });

    it('should earn +1% on next $30k', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 30000,
        specialAccount: 0,
        medisaveAccount: 0,
        retirementAccount: 30000
      };
      const result = calculateExtraInterest(accounts, 55);

      // First 30k: 30000 * 0.02 / 12 = 50
      // Next 30k: 30000 * 0.01 / 12 = 25
      expect(result).toBe(75);
    });

    it('should cap at $60k total', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 40000,
        specialAccount: 0,
        medisaveAccount: 30000,
        retirementAccount: 50000
      };
      const result = calculateExtraInterest(accounts, 60);

      // Total balance = 120k, but capped at 60k
      // First 30k: 50, Next 30k: 25
      expect(result).toBe(75);
    });

    it('should handle balance below $30k (only first tier)', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 10000,
        specialAccount: 0,
        medisaveAccount: 5000,
        retirementAccount: 10000
      };
      const result = calculateExtraInterest(accounts, 55);

      // 25000 * 0.02 / 12 = 41.67
      expect(result).toBe(41.67);
    });

    it('should handle balance between $30k-$60k (both tiers)', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 20000,
        specialAccount: 0,
        medisaveAccount: 10000,
        retirementAccount: 15000
      };
      const result = calculateExtraInterest(accounts, 58);

      // First 30k: 30000 * 0.02 / 12 = 50
      // Next 15k: 15000 * 0.01 / 12 = 12.5
      expect(result).toBe(62.5);
    });

    it('should use combined balance from all accounts', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 10000,
        specialAccount: 5000,
        medisaveAccount: 10000,
        retirementAccount: 35000
      };
      const result = calculateExtraInterest(accounts, 65);

      // Total = 60k
      // First 30k: 50, Next 30k: 25
      expect(result).toBe(75);
    });

    it('should handle zero balance', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 0,
        specialAccount: 0,
        medisaveAccount: 0,
        retirementAccount: 0
      };
      const result = calculateExtraInterest(accounts, 60);

      expect(result).toBe(0);
    });
  });

  describe('applyMonthlyInterest', () => {
    it('should apply base + extra interest correctly', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 30000,
        specialAccount: 30000,
        medisaveAccount: 0,
        retirementAccount: 0
      };
      const result = applyMonthlyInterest(accounts, 40);

      // Base: OA 62.5, SA 100
      // Extra: Only 50k eligible (20k OA + 30k SA), 50k * 0.01 / 12 = 41.67
      // Extra distributed: 50% to OA (20.84), 50% to SA (20.83)
      expect(result.ordinaryAccount).toBe(30083.34); // 30000 + 62.5 + 20.84
      expect(result.specialAccount).toBe(30120.84); // 30000 + 100 + 20.84
    });

    it('should update all account balances', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 10000,
        specialAccount: 10000,
        medisaveAccount: 10000,
        retirementAccount: 0
      };
      const result = applyMonthlyInterest(accounts, 45);

      expect(result.ordinaryAccount).toBeGreaterThan(10000);
      expect(result.specialAccount).toBeGreaterThan(10000);
      expect(result.medisaveAccount).toBeGreaterThan(10000);
    });

    it('should distribute extra interest proportionally', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 20000, // 50% of total
        specialAccount: 20000, // 50% of total
        medisaveAccount: 0,
        retirementAccount: 0
      };
      const result = applyMonthlyInterest(accounts, 40);

      // Extra interest = 40k * 0.01 / 12 = 33.33
      // Split equally: 16.67 each
      // OA gets: 20000 + 41.67 (base) + 16.67 (extra) = 20058.34
      // SA gets: 20000 + 66.67 (base) + 16.67 (extra) = 20083.34
      expect(result.ordinaryAccount).toBe(20058.34);
      expect(result.specialAccount).toBe(20083.34);
    });

    it('should handle accounts with zero balance', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 0,
        specialAccount: 0,
        medisaveAccount: 0,
        retirementAccount: 0
      };
      const result = applyMonthlyInterest(accounts, 40);

      expect(result.ordinaryAccount).toBe(0);
      expect(result.specialAccount).toBe(0);
      expect(result.medisaveAccount).toBe(0);
      expect(result.retirementAccount).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 10333.33,
        specialAccount: 10666.67,
        medisaveAccount: 0,
        retirementAccount: 0
      };
      const result = applyMonthlyInterest(accounts, 40);

      // All values should be rounded to 2 decimal places
      // Check that values have at most 2 decimal places
      expect(result.ordinaryAccount).toBe(Math.round(result.ordinaryAccount * 100) / 100);
      expect(result.specialAccount).toBe(Math.round(result.specialAccount * 100) / 100);
    });
  });

  describe('getEffectiveInterestRate', () => {
    it('should calculate effective rate with extra interest', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 30000,
        specialAccount: 30000,
        medisaveAccount: 0,
        retirementAccount: 0
      };
      const result = getEffectiveInterestRate(accounts, 40);

      expect(result.oa).toBe(0.025);
      expect(result.smra).toBe(0.04);
      // Effective should be higher than base rates due to extra interest
      expect(result.effective).toBeGreaterThan(0.03);
    });

    it('should calculate effective rate up to ~5% for under 55', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 20000,
        specialAccount: 40000,
        medisaveAccount: 0,
        retirementAccount: 0
      };
      const result = getEffectiveInterestRate(accounts, 40);

      // With full extra interest, should approach 5%
      expect(result.effective).toBeGreaterThanOrEqual(0.045);
      expect(result.effective).toBeLessThanOrEqual(0.05);
    });

    it('should calculate effective rate up to ~6% for age 55+', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 0,
        specialAccount: 0,
        medisaveAccount: 0,
        retirementAccount: 60000
      };
      const result = getEffectiveInterestRate(accounts, 55);

      // With max extra interest (60k at 55+), should approach 6%
      expect(result.effective).toBeGreaterThanOrEqual(0.055);
      expect(result.effective).toBeLessThanOrEqual(0.06);
    });

    it('should return base rates when balance is zero', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 0,
        specialAccount: 0,
        medisaveAccount: 0,
        retirementAccount: 0
      };
      const result = getEffectiveInterestRate(accounts, 40);

      expect(result.effective).toBe(0);
    });

    it('should reflect weighted average based on account distribution', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 100000, // All in OA (2.5%)
        specialAccount: 0,
        medisaveAccount: 0,
        retirementAccount: 0
      };
      const result = getEffectiveInterestRate(accounts, 40);

      // Should be close to OA rate (2.5%) plus some extra interest
      expect(result.effective).toBeGreaterThan(0.025);
      expect(result.effective).toBeLessThan(0.035);
    });
  });
});
