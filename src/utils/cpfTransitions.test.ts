import { describe, test, expect } from 'vitest';
import {
  getRetirementSum,
  handleAge55Transition,
  calculateRetirementSumProgress,
  calculateAge55Withdrawal,
  applyPost55Contribution
} from './cpfTransitions';
import type { CPFAccounts } from '@/types';

describe('CPF Age 55 Transitions', () => {
  describe('getRetirementSum', () => {
    test('returns BRS: $106,500', () => {
      expect(getRetirementSum('basic')).toBe(106500);
    });

    test('returns FRS: $213,000', () => {
      expect(getRetirementSum('full')).toBe(213000);
    });

    test('returns ERS: $426,000', () => {
      expect(getRetirementSum('enhanced')).toBe(426000);
    });

    test('defaults to FRS for invalid input', () => {
      expect(getRetirementSum('full')).toBe(213000);
    });
  });

  describe('handleAge55Transition', () => {
    test('closes SA and opens RA', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 100000,
        specialAccount: 50000,
        medisaveAccount: 40000,
        retirementAccount: 0
      };

      const result = handleAge55Transition(accounts, 'full');

      expect(result.accounts.specialAccount).toBe(0);
      expect(result.accounts.retirementAccount).toBeGreaterThan(0);
    });

    test('transfers SA balance to RA first', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 200000,
        specialAccount: 100000,
        medisaveAccount: 40000,
        retirementAccount: 0
      };

      const result = handleAge55Transition(accounts, 'full');

      expect(result.transferred.fromSA).toBe(100000);
      expect(result.accounts.specialAccount).toBe(0);
    });

    test('transfers from OA if SA insufficient for FRS', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 200000,
        specialAccount: 50000,
        medisaveAccount: 40000,
        retirementAccount: 0
      };

      const result = handleAge55Transition(accounts, 'full');

      expect(result.transferred.fromSA).toBe(50000);
      expect(result.transferred.fromOA).toBe(163000); // 213000 - 50000
      expect(result.transferred.total).toBe(213000);
    });

    test('leaves excess in OA after meeting FRS', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 200000,
        specialAccount: 100000,
        medisaveAccount: 40000,
        retirementAccount: 0
      };

      const result = handleAge55Transition(accounts, 'full');

      expect(result.accounts.ordinaryAccount).toBe(87000); // 200000 - 113000
      expect(result.accounts.retirementAccount).toBe(213000);
    });

    test('handles insufficient balance to meet BRS', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 30000,
        specialAccount: 20000,
        medisaveAccount: 15000,
        retirementAccount: 0
      };

      const result = handleAge55Transition(accounts, 'basic');

      expect(result.transferred.fromSA).toBe(20000);
      expect(result.transferred.fromOA).toBe(30000);
      expect(result.accounts.retirementAccount).toBe(50000); // Less than BRS
      expect(result.accounts.ordinaryAccount).toBe(0);
    });

    test('handles exactly FRS balance', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 113000,
        specialAccount: 100000,
        medisaveAccount: 40000,
        retirementAccount: 0
      };

      const result = handleAge55Transition(accounts, 'full');

      expect(result.transferred.total).toBe(213000);
      expect(result.accounts.retirementAccount).toBe(213000);
      expect(result.accounts.ordinaryAccount).toBe(0);
    });

    test('handles balance exceeding ERS', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 400000,
        specialAccount: 200000,
        medisaveAccount: 80000,
        retirementAccount: 0
      };

      const result = handleAge55Transition(accounts, 'enhanced');

      expect(result.transferred.fromSA).toBe(200000);
      expect(result.transferred.fromOA).toBe(226000); // 426000 - 200000
      expect(result.accounts.retirementAccount).toBe(426000);
      expect(result.accounts.ordinaryAccount).toBe(174000); // 400000 - 226000
    });

    test('calculates withdrawable amount correctly', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 250000,
        specialAccount: 100000,
        medisaveAccount: 40000,
        retirementAccount: 0
      };

      const result = handleAge55Transition(accounts, 'full');

      // Total OA+SA = 350000, excess above FRS (213000) = 137000
      expect(result.withdrawable).toBe(137000);
    });

    test('minimum withdrawal is $5,000', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 100000,
        specialAccount: 50000,
        medisaveAccount: 40000,
        retirementAccount: 0
      };

      const result = handleAge55Transition(accounts, 'full');

      // Total OA+SA = 150000, which is less than FRS (213000), so excess = 0
      // Withdrawable should be max(5000, 0) = 5000
      expect(result.withdrawable).toBe(5000);
    });

    test('BRS target: transfers $106,500', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 80000,
        specialAccount: 50000,
        medisaveAccount: 30000,
        retirementAccount: 0
      };

      const result = handleAge55Transition(accounts, 'basic');

      expect(result.transferred.fromSA).toBe(50000);
      expect(result.transferred.fromOA).toBe(56500);
      expect(result.transferred.total).toBe(106500);
    });

    test('FRS target: transfers $213,000', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 150000,
        specialAccount: 100000,
        medisaveAccount: 40000,
        retirementAccount: 0
      };

      const result = handleAge55Transition(accounts, 'full');

      expect(result.transferred.fromSA).toBe(100000);
      expect(result.transferred.fromOA).toBe(113000);
      expect(result.transferred.total).toBe(213000);
    });

    test('ERS target: transfers $426,000', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 350000,
        specialAccount: 150000,
        medisaveAccount: 60000,
        retirementAccount: 0
      };

      const result = handleAge55Transition(accounts, 'enhanced');

      expect(result.transferred.fromSA).toBe(150000);
      expect(result.transferred.fromOA).toBe(276000);
      expect(result.transferred.total).toBe(426000);
    });

    test('handles zero SA balance', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 250000,
        specialAccount: 0,
        medisaveAccount: 40000,
        retirementAccount: 0
      };

      const result = handleAge55Transition(accounts, 'full');

      expect(result.transferred.fromSA).toBe(0);
      expect(result.transferred.fromOA).toBe(213000);
      expect(result.accounts.retirementAccount).toBe(213000);
    });

    test('handles zero OA balance', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 0,
        specialAccount: 150000,
        medisaveAccount: 40000,
        retirementAccount: 0
      };

      const result = handleAge55Transition(accounts, 'full');

      expect(result.transferred.fromSA).toBe(150000);
      expect(result.transferred.fromOA).toBe(0);
      expect(result.accounts.retirementAccount).toBe(150000);
    });

    test('handles both SA and OA zero', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 0,
        specialAccount: 0,
        medisaveAccount: 40000,
        retirementAccount: 0
      };

      const result = handleAge55Transition(accounts, 'full');

      expect(result.transferred.fromSA).toBe(0);
      expect(result.transferred.fromOA).toBe(0);
      expect(result.accounts.retirementAccount).toBe(0);
    });
  });

  describe('calculateRetirementSumProgress', () => {
    test('calculates shortfall correctly', () => {
      const result = calculateRetirementSumProgress(150000, 'full');

      expect(result.shortfall).toBe(63000); // 213000 - 150000
    });

    test('calculates percentage complete', () => {
      const result = calculateRetirementSumProgress(106500, 'full');

      expect(result.percentageComplete).toBe(50); // 106500 / 213000 * 100
    });

    test('marks as met when balance >= target', () => {
      const result = calculateRetirementSumProgress(213000, 'full');

      expect(result.isMet).toBe(true);
    });

    test('marks as not met when balance < target', () => {
      const result = calculateRetirementSumProgress(100000, 'full');

      expect(result.isMet).toBe(false);
    });

    test('handles zero balance', () => {
      const result = calculateRetirementSumProgress(0, 'basic');

      expect(result.current).toBe(0);
      expect(result.shortfall).toBe(106500);
      expect(result.percentageComplete).toBe(0);
      expect(result.isMet).toBe(false);
    });

    test('handles balance exceeding target (100%+)', () => {
      const result = calculateRetirementSumProgress(300000, 'full');

      expect(result.shortfall).toBe(0);
      expect(result.percentageComplete).toBe(100);
      expect(result.isMet).toBe(true);
    });
  });

  describe('calculateAge55Withdrawal', () => {
    test('minimum withdrawal is $5,000', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 100000,
        specialAccount: 50000,
        medisaveAccount: 40000,
        retirementAccount: 0
      };

      const result = calculateAge55Withdrawal(accounts);

      expect(result.minimum).toBe(5000);
    });

    test('can withdraw amount above FRS', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 250000,
        specialAccount: 100000,
        medisaveAccount: 40000,
        retirementAccount: 0
      };

      const result = calculateAge55Withdrawal(accounts);

      expect(result.excessAboveFRS).toBe(137000); // (250000 + 100000) - 213000
    });

    test('withdrawable is max of minimum and excess', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 100000,
        specialAccount: 50000,
        medisaveAccount: 40000,
        retirementAccount: 0
      };

      const result = calculateAge55Withdrawal(accounts);

      // Total OA+SA = 150000, less than FRS, so excess = 0
      expect(result.excessAboveFRS).toBe(0);
      expect(result.withdrawable).toBe(5000); // max(5000, 0)
    });

    test('cannot withdraw if total CPF < $5,000', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 2000,
        specialAccount: 1000,
        medisaveAccount: 1000,
        retirementAccount: 0
      };

      const result = calculateAge55Withdrawal(accounts);

      expect(result.canWithdraw).toBe(false);
    });

    test('handles exactly $5,000 balance', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 3000,
        specialAccount: 1000,
        medisaveAccount: 1000,
        retirementAccount: 0
      };

      const result = calculateAge55Withdrawal(accounts);

      expect(result.canWithdraw).toBe(true);
      expect(result.withdrawable).toBe(5000);
    });
  });

  describe('applyPost55Contribution', () => {
    test('RA contributions go to RA when below FRS', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 50000,
        specialAccount: 0,
        medisaveAccount: 30000,
        retirementAccount: 150000
      };

      const contribution = { toOA: 500, toSA: 0, toMA: 200, toRA: 1000 };
      const result = applyPost55Contribution(accounts, contribution);

      expect(result.retirementAccount).toBe(151000); // 150000 + 1000
      expect(result.ordinaryAccount).toBe(50500); // 50000 + 500
    });

    test('RA contributions overflow to OA when RA >= FRS', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 50000,
        specialAccount: 0,
        medisaveAccount: 30000,
        retirementAccount: 212500 // Close to FRS (213000)
      };

      const contribution = { toOA: 500, toSA: 0, toMA: 200, toRA: 1000 };
      const result = applyPost55Contribution(accounts, contribution);

      expect(result.retirementAccount).toBe(213000); // Capped at FRS
      expect(result.ordinaryAccount).toBe(51000); // 50000 + 500 + 500 (overflow)
    });

    test('OA contributions always go to OA', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 50000,
        specialAccount: 0,
        medisaveAccount: 30000,
        retirementAccount: 150000
      };

      const contribution = { toOA: 800, toSA: 0, toMA: 200, toRA: 500 };
      const result = applyPost55Contribution(accounts, contribution);

      expect(result.ordinaryAccount).toBe(50800); // 50000 + 800
    });

    test('MA contributions always go to MA', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 50000,
        specialAccount: 0,
        medisaveAccount: 30000,
        retirementAccount: 150000
      };

      const contribution = { toOA: 500, toSA: 0, toMA: 300, toRA: 1000 };
      const result = applyPost55Contribution(accounts, contribution);

      expect(result.medisaveAccount).toBe(30300); // 30000 + 300
    });

    test('SA remains 0 after age 55', () => {
      const accounts: CPFAccounts = {
        ordinaryAccount: 50000,
        specialAccount: 0,
        medisaveAccount: 30000,
        retirementAccount: 150000
      };

      const contribution = { toOA: 500, toSA: 100, toMA: 200, toRA: 1000 };
      const result = applyPost55Contribution(accounts, contribution);

      expect(result.specialAccount).toBe(0); // Always 0
    });
  });
});
