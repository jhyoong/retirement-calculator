import { describe, test, expect } from 'vitest';
import {
  getRetirementSum,
  handleAge55Transition,
  calculateRetirementSumProgress,
  calculateAge55Withdrawal
} from './cpfTransitions';
import type { CPFAccounts } from '@/types';

function accounts(oa: number, sa: number, ma = 40000, ra = 0): CPFAccounts {
  return { ordinaryAccount: oa, specialAccount: sa, medisaveAccount: ma, retirementAccount: ra };
}

describe('CPF Age 55 Transitions', () => {
  describe('getRetirementSum', () => {
    test('returns cohort 2025 sums', () => {
      expect(getRetirementSum('basic', 2025)).toBe(106500);
      expect(getRetirementSum('full', 2025)).toBe(213000);
      expect(getRetirementSum('enhanced', 2025)).toBe(426000);
    });

    test('returns cohort 2026 sums', () => {
      expect(getRetirementSum('basic', 2026)).toBe(110200);
      expect(getRetirementSum('full', 2026)).toBe(220400);
      expect(getRetirementSum('enhanced', 2026)).toBe(440800);
    });

    test('returns cohort 2027 sums', () => {
      expect(getRetirementSum('basic', 2027)).toBe(114100);
      expect(getRetirementSum('full', 2027)).toBe(228200);
      expect(getRetirementSum('enhanced', 2027)).toBe(456400);
    });

    test('uses nearest announced cohort outside 2025-2027', () => {
      expect(getRetirementSum('full', 2020)).toBe(213000);
      expect(getRetirementSum('full', 2040)).toBe(228200);
    });
  });

  describe('handleAge55Transition', () => {
    test('transfers SA first, then OA, up to cohort FRS', () => {
      const result = handleAge55Transition(accounts(200000, 100000), 'full', 2026);

      expect(result.transferred.fromSA).toBe(100000);
      expect(result.transferred.fromOA).toBe(120400);
      expect(result.transferred.total).toBe(220400);
      expect(result.accounts.retirementAccount).toBe(220400);
      expect(result.accounts.ordinaryAccount).toBe(79600);
      expect(result.accounts.specialAccount).toBe(0);
      expect(result.accounts.medisaveAccount).toBe(40000);
    });

    test('moves remaining SA to OA when SA exceeds FRS', () => {
      const result = handleAge55Transition(accounts(50000, 250000), 'full', 2026);

      expect(result.transferred.fromSA).toBe(220400);
      expect(result.transferred.fromOA).toBe(0);
      expect(result.accounts.retirementAccount).toBe(220400);
      expect(result.accounts.ordinaryAccount).toBe(79600); // 50000 + 29600
      expect(result.accounts.specialAccount).toBe(0);
    });

    test('transfers everything when below target', () => {
      const result = handleAge55Transition(accounts(30000, 20000), 'full', 2026);

      expect(result.accounts.retirementAccount).toBe(50000);
      expect(result.accounts.ordinaryAccount).toBe(0);
      expect(result.withdrawable).toBe(5000);
    });

    test('basic target (property pledge) sets aside BRS', () => {
      const result = handleAge55Transition(accounts(200000, 100000), 'basic', 2026);

      expect(result.accounts.retirementAccount).toBe(110200);
      expect(result.accounts.ordinaryAccount).toBe(189800);
    });

    test('enhanced target transfers OA up to ERS', () => {
      const result = handleAge55Transition(accounts(400000, 100000), 'enhanced', 2026);

      expect(result.accounts.retirementAccount).toBe(440800);
      expect(result.accounts.ordinaryAccount).toBe(59200);
    });

    test('uses the cohort year sums', () => {
      const result = handleAge55Transition(accounts(300000, 0), 'full', 2027);
      expect(result.accounts.retirementAccount).toBe(228200);
    });

    test('counts existing RA balance toward the target', () => {
      const result = handleAge55Transition(accounts(200000, 100000, 40000, 50000), 'full', 2026);

      expect(result.transferred.total).toBe(170400);
      expect(result.accounts.retirementAccount).toBe(220400);
    });

    test('withdrawable uses cohort FRS', () => {
      const result = handleAge55Transition(accounts(200000, 100000), 'full', 2026);
      // 300000 - 220400
      expect(result.withdrawable).toBe(79600);
    });

    test('handles zero balances', () => {
      const result = handleAge55Transition(accounts(0, 0), 'full', 2026);

      expect(result.accounts.retirementAccount).toBe(0);
      expect(result.accounts.ordinaryAccount).toBe(0);
      expect(result.withdrawable).toBe(0);
    });
  });

  describe('calculateRetirementSumProgress', () => {
    test('calculates shortfall and percentage against cohort sum', () => {
      const progress = calculateRetirementSumProgress(110200, 'full', 2026);

      expect(progress.target).toBe(220400);
      expect(progress.shortfall).toBe(110200);
      expect(progress.percentageComplete).toBe(50);
      expect(progress.isMet).toBe(false);
    });

    test('marks as met and caps at 100%', () => {
      const progress = calculateRetirementSumProgress(500000, 'enhanced', 2027);

      expect(progress.target).toBe(456400);
      expect(progress.shortfall).toBe(0);
      expect(progress.percentageComplete).toBe(100);
      expect(progress.isMet).toBe(true);
    });
  });

  describe('calculateAge55Withdrawal', () => {
    test('minimum withdrawal is $5,000', () => {
      const result = calculateAge55Withdrawal(accounts(100000, 50000), 2026);

      expect(result.minimum).toBe(5000);
      expect(result.excessAboveFRS).toBe(0);
      expect(result.withdrawable).toBe(5000);
      expect(result.canWithdraw).toBe(true);
    });

    test('can withdraw amount above cohort FRS', () => {
      const result = calculateAge55Withdrawal(accounts(200000, 100000), 2026);

      expect(result.excessAboveFRS).toBe(79600);
      expect(result.withdrawable).toBe(79600);
    });

    test('cannot withdraw more than OA + SA + RA savings', () => {
      const result = calculateAge55Withdrawal(accounts(2000, 1000), 2026);

      expect(result.withdrawable).toBe(3000);
    });

    test('nothing to withdraw with zero savings', () => {
      const result = calculateAge55Withdrawal(accounts(0, 0), 2026);

      expect(result.withdrawable).toBe(0);
      expect(result.canWithdraw).toBe(false);
    });
  });
});
