import { CPF_CONFIG_2025 } from './cpfConfig';
import type { CPFAccounts } from '@/types';

/**
 * Get retirement sum amount based on target
 */
export function getRetirementSum(target: 'basic' | 'full' | 'enhanced'): number {
  const { retirementSums } = CPF_CONFIG_2025;

  switch (target) {
    case 'basic':
      return retirementSums.basic;
    case 'full':
      return retirementSums.full;
    case 'enhanced':
      return retirementSums.enhanced;
    default:
      return retirementSums.full;
  }
}

/**
 * Handle age 55 transition
 * - Close Special Account (SA)
 * - Open Retirement Account (RA)
 * - Transfer funds from SA and OA to RA up to retirement sum target
 * - Remaining funds stay in OA
 *
 * @param accounts - Current account balances (before transition)
 * @param retirementSumTarget - User's target: 'basic', 'full', or 'enhanced'
 * @returns Updated accounts after transition
 */
export function handleAge55Transition(
  accounts: CPFAccounts,
  retirementSumTarget: 'basic' | 'full' | 'enhanced' = 'full'
): {
  accounts: CPFAccounts;
  transferred: {
    fromSA: number;
    fromOA: number;
    total: number;
  };
  withdrawable: number;
} {
  // Get retirement sum based on target
  const targetSum = getRetirementSum(retirementSumTarget);

  // Calculate how much to transfer to RA
  let amountToTransfer = targetSum;
  let transferredFromSA = 0;
  let transferredFromOA = 0;

  // Step 1: Transfer SA balance first
  if (accounts.specialAccount > 0) {
    transferredFromSA = Math.min(accounts.specialAccount, amountToTransfer);
    amountToTransfer -= transferredFromSA;
  }

  // Step 2: Transfer from OA if needed to reach target
  if (amountToTransfer > 0 && accounts.ordinaryAccount > 0) {
    transferredFromOA = Math.min(accounts.ordinaryAccount, amountToTransfer);
    amountToTransfer -= transferredFromOA;
  }

  // Calculate new balances
  const newRA = accounts.retirementAccount + transferredFromSA + transferredFromOA;
  const newOA = accounts.ordinaryAccount - transferredFromOA;
  const newSA = 0; // SA is closed

  // Withdrawable amount: $5,000 or everything above FRS, whichever is more
  const frs = getRetirementSum('full');
  const totalBeforeTransition = accounts.ordinaryAccount + accounts.specialAccount;
  const excessAboveFRS = Math.max(0, totalBeforeTransition - frs);
  const withdrawable = Math.max(5000, excessAboveFRS);

  return {
    accounts: {
      ordinaryAccount: Math.round(newOA * 100) / 100,
      specialAccount: newSA,
      medisaveAccount: accounts.medisaveAccount, // Unchanged
      retirementAccount: Math.round(newRA * 100) / 100
    },
    transferred: {
      fromSA: Math.round(transferredFromSA * 100) / 100,
      fromOA: Math.round(transferredFromOA * 100) / 100,
      total: Math.round((transferredFromSA + transferredFromOA) * 100) / 100
    },
    withdrawable: Math.round(withdrawable * 100) / 100
  };
}

/**
 * Calculate progress toward retirement sum
 *
 * @param raBalance - Current RA balance
 * @param target - Target retirement sum
 * @returns Progress information
 */
export function calculateRetirementSumProgress(
  raBalance: number,
  target: 'basic' | 'full' | 'enhanced'
): {
  target: number;
  current: number;
  shortfall: number;
  percentageComplete: number;
  isMet: boolean;
} {
  const targetAmount = getRetirementSum(target);
  const shortfall = Math.max(0, targetAmount - raBalance);
  const percentageComplete = Math.min(100, (raBalance / targetAmount) * 100);

  return {
    target: targetAmount,
    current: Math.round(raBalance * 100) / 100,
    shortfall: Math.round(shortfall * 100) / 100,
    percentageComplete: Math.round(percentageComplete * 100) / 100,
    isMet: raBalance >= targetAmount
  };
}

/**
 * Calculate withdrawable amount at age 55
 * User can withdraw $5,000 or amount above FRS, whichever is higher
 *
 * @param accounts - Account balances at age 55 (before transition)
 * @param hasProperty - Whether user owns property (affects withdrawal rules)
 * @returns Withdrawable amount
 */
export function calculateAge55Withdrawal(
  accounts: CPFAccounts,
  _hasProperty: boolean = false
): {
  minimum: number; // $5,000 minimum
  excessAboveFRS: number; // Amount above FRS
  withdrawable: number; // Max of the two
  canWithdraw: boolean;
} {
  const frs = getRetirementSum('full');
  const totalCPF =
    accounts.ordinaryAccount +
    accounts.specialAccount +
    accounts.medisaveAccount +
    accounts.retirementAccount;

  const minimum = 5000;
  const totalOASA = accounts.ordinaryAccount + accounts.specialAccount;
  const excessAboveFRS = Math.max(0, totalOASA - frs);
  const withdrawable = Math.max(minimum, excessAboveFRS);
  const canWithdraw = totalCPF >= minimum;

  return {
    minimum: Math.round(minimum * 100) / 100,
    excessAboveFRS: Math.round(excessAboveFRS * 100) / 100,
    withdrawable: Math.round(withdrawable * 100) / 100,
    canWithdraw
  };
}

/**
 * Handle post-55 monthly contributions
 * After age 55, contributions go to RA up to FRS, then to OA
 *
 * @param accounts - Current account balances
 * @param contribution - Monthly CPF contribution breakdown
 * @returns Updated accounts
 */
export function applyPost55Contribution(
  accounts: CPFAccounts,
  contribution: { toOA: number; toSA: number; toMA: number; toRA: number }
): CPFAccounts {
  const frs = getRetirementSum('full');

  // All RA allocation goes to RA up to FRS
  let amountForRA = contribution.toRA;
  let amountForOA = contribution.toOA;

  // If RA would exceed FRS, overflow goes to OA
  const raAfterContribution = accounts.retirementAccount + amountForRA;
  if (raAfterContribution > frs) {
    const overflow = raAfterContribution - frs;
    amountForRA -= overflow;
    amountForOA += overflow;
  }

  return {
    ordinaryAccount: Math.round((accounts.ordinaryAccount + amountForOA) * 100) / 100,
    specialAccount: accounts.specialAccount, // Always 0 after age 55
    medisaveAccount: Math.round((accounts.medisaveAccount + contribution.toMA) * 100) / 100,
    retirementAccount: Math.round((accounts.retirementAccount + amountForRA) * 100) / 100
  };
}
