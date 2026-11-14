import { getRetirementSums } from './cpfConfig';
import type { CPFAccounts } from '@/types';
import { roundToTwoDecimals } from './constants';

export type RetirementSumTarget = 'basic' | 'full' | 'enhanced';

/** Minimum amount a member can withdraw at 55 */
const AGE_55_MIN_WITHDRAWAL = 5000;

/**
 * Get retirement sum for a target and cohort (year the member turns 55)
 */
export function getRetirementSum(target: RetirementSumTarget, cohortYear: number): number {
  const sums = getRetirementSums(cohortYear);

  switch (target) {
    case 'basic':
      return sums.basic;
    case 'enhanced':
      return sums.enhanced;
    case 'full':
    default:
      return sums.full;
  }
}

/**
 * Handle age 55 transition
 * - Close Special Account (SA), open Retirement Account (RA)
 * - Transfer SA, then OA, to RA up to the target sum for the cohort
 * - Remaining SA goes to OA
 *
 * Targets: 'basic' = property pledge case (set aside BRS in cash),
 * 'full' = default, 'enhanced' = member voluntarily transfers OA up to ERS.
 *
 * @param accounts - Balances before the transition
 * @param retirementSumTarget - 'basic', 'full' or 'enhanced'
 * @param cohortYear - Year the member turns 55
 */
export function handleAge55Transition(
  accounts: CPFAccounts,
  retirementSumTarget: RetirementSumTarget = 'full',
  cohortYear: number
): {
  accounts: CPFAccounts;
  transferred: {
    fromSA: number;
    fromOA: number;
    total: number;
  };
  withdrawable: number;
} {
  const targetSum = getRetirementSum(retirementSumTarget, cohortYear);
  let amountToTransfer = Math.max(0, targetSum - accounts.retirementAccount);

  // Step 1: SA first
  const transferredFromSA = Math.min(Math.max(0, accounts.specialAccount), amountToTransfer);
  amountToTransfer -= transferredFromSA;

  // Step 2: OA if needed
  const transferredFromOA = Math.min(Math.max(0, accounts.ordinaryAccount), amountToTransfer);

  // Remaining SA moves to OA (SA closes)
  const remainingSA = accounts.specialAccount - transferredFromSA;
  const newOA = accounts.ordinaryAccount - transferredFromOA + remainingSA;
  const newRA = accounts.retirementAccount + transferredFromSA + transferredFromOA;

  return {
    accounts: {
      ordinaryAccount: roundToTwoDecimals(newOA),
      specialAccount: 0,
      medisaveAccount: accounts.medisaveAccount,
      retirementAccount: roundToTwoDecimals(newRA)
    },
    transferred: {
      fromSA: roundToTwoDecimals(transferredFromSA),
      fromOA: roundToTwoDecimals(transferredFromOA),
      total: roundToTwoDecimals(transferredFromSA + transferredFromOA)
    },
    withdrawable: calculateAge55Withdrawal(accounts, cohortYear).withdrawable
  };
}

/**
 * Calculate progress toward retirement sum
 */
export function calculateRetirementSumProgress(
  raBalance: number,
  target: RetirementSumTarget,
  cohortYear: number
): {
  target: number;
  current: number;
  shortfall: number;
  percentageComplete: number;
  isMet: boolean;
} {
  const targetAmount = getRetirementSum(target, cohortYear);
  const shortfall = Math.max(0, targetAmount - raBalance);
  const percentageComplete = Math.min(100, (raBalance / targetAmount) * 100);

  return {
    target: targetAmount,
    current: roundToTwoDecimals(raBalance),
    shortfall: roundToTwoDecimals(shortfall),
    percentageComplete: roundToTwoDecimals(percentageComplete),
    isMet: raBalance >= targetAmount
  };
}

/**
 * Calculate withdrawable amount at age 55
 * Member can withdraw $5,000 or savings above the cohort FRS, whichever is higher,
 * but never more than their OA + SA + RA savings.
 *
 * @param accounts - Balances at age 55 (before transition)
 * @param cohortYear - Year the member turns 55
 */
export function calculateAge55Withdrawal(
  accounts: CPFAccounts,
  cohortYear: number
): {
  minimum: number;
  excessAboveFRS: number;
  withdrawable: number;
  canWithdraw: boolean;
} {
  const frs = getRetirementSum('full', cohortYear);
  const retirementSavings =
    accounts.ordinaryAccount + accounts.specialAccount + accounts.retirementAccount;

  const excessAboveFRS = Math.max(0, retirementSavings - frs);
  const withdrawable = Math.min(
    retirementSavings,
    Math.max(AGE_55_MIN_WITHDRAWAL, excessAboveFRS)
  );

  return {
    minimum: AGE_55_MIN_WITHDRAWAL,
    excessAboveFRS: roundToTwoDecimals(excessAboveFRS),
    withdrawable: roundToTwoDecimals(Math.max(0, withdrawable)),
    canWithdraw: withdrawable > 0
  };
}
