/**
 * CPF Interest Calculations
 * Handles base interest and extra interest tiers for all CPF accounts
 */

import { CPF_CONFIG_2025 } from './cpfConfig';
import type { CPFAccounts } from '@/types';
import { MONTHS_PER_YEAR, roundToTwoDecimals, CPF_AGE_55 } from './constants';

/**
 * Calculate monthly interest for all CPF accounts
 * OA: 2.5% p.a.
 * SA/MA/RA (SMRA): 4.0% p.a.
 *
 * @param accounts - Current account balances
 * @param age - Current age (for determining account eligibility)
 * @returns Monthly interest for each account
 */
export function calculateMonthlyInterest(
  accounts: CPFAccounts,
  age: number
): {
  oa: number;
  sa: number;
  ma: number;
  ra: number;
  total: number;
} {
  const { interestRates } = CPF_CONFIG_2025;

  // Monthly interest rate = annual rate / 12
  const monthlyOARate = interestRates.ordinaryAccount / MONTHS_PER_YEAR;
  const monthlySMRARate = interestRates.specialAccount / MONTHS_PER_YEAR; // Same for SA/MA/RA

  const oaInterest = accounts.ordinaryAccount * monthlyOARate;

  // SA only exists before age 55
  const saInterest = age < CPF_AGE_55 ? accounts.specialAccount * monthlySMRARate : 0;

  const maInterest = accounts.medisaveAccount * monthlySMRARate;

  // RA only exists from age 55 onwards
  const raInterest = age >= CPF_AGE_55 ? accounts.retirementAccount * monthlySMRARate : 0;

  return {
    oa: roundToTwoDecimals(oaInterest),
    sa: roundToTwoDecimals(saInterest),
    ma: roundToTwoDecimals(maInterest),
    ra: roundToTwoDecimals(raInterest),
    total: roundToTwoDecimals(oaInterest + saInterest + maInterest + raInterest)
  };
}

/**
 * Calculate extra interest earned
 * Under 55: +1% on first $60k (capped at $20k from OA)
 * 55 and above: +2% on first $30k, +1% on next $30k
 *
 * @param accounts - Current account balances
 * @param age - Current age
 * @returns Monthly extra interest amount
 */
export function calculateExtraInterest(
  accounts: CPFAccounts,
  age: number
): number {
  const { extraInterest } = CPF_CONFIG_2025.interestRates;

  if (age < CPF_AGE_55) {
    return calculateExtraInterestUnder55(accounts, extraInterest.under55);
  } else {
    return calculateExtraInterestAge55Plus(accounts, extraInterest.age55Plus);
  }
}

/**
 * Extra interest for members under 55
 * +1% on first $60k of combined balances (capped at $20k from OA)
 */
function calculateExtraInterestUnder55(
  accounts: CPFAccounts,
  config: { rate: number; balanceCap: number; oaCap: number }
): number {
  // Calculate eligible balances
  const oaEligible = Math.min(accounts.ordinaryAccount, config.oaCap);
  const smaEligible = Math.min(
    accounts.specialAccount + accounts.medisaveAccount,
    config.balanceCap - oaEligible
  );

  const totalEligible = oaEligible + smaEligible;
  const cappedEligible = Math.min(totalEligible, config.balanceCap);

  // Monthly extra interest = annual rate / 12
  const monthlyExtraRate = config.rate / MONTHS_PER_YEAR;
  const extraInterest = cappedEligible * monthlyExtraRate;

  return roundToTwoDecimals(extraInterest);
}

/**
 * Extra interest for members 55 and above
 * +2% on first $30k, +1% on next $30k (total up to $60k)
 */
function calculateExtraInterestAge55Plus(
  accounts: CPFAccounts,
  config: { firstTier: { rate: number; cap: number }; secondTier: { rate: number; cap: number } }
): number {
  // Combined balances across all accounts
  const totalBalance =
    accounts.ordinaryAccount +
    accounts.specialAccount +
    accounts.medisaveAccount +
    accounts.retirementAccount;

  // First tier: +2% on first $30k
  const firstTierBalance = Math.min(totalBalance, config.firstTier.cap);
  const firstTierRate = config.firstTier.rate / MONTHS_PER_YEAR;
  const firstTierInterest = firstTierBalance * firstTierRate;

  // Second tier: +1% on next $30k
  const remainingBalance = Math.max(0, totalBalance - config.firstTier.cap);
  const secondTierBalance = Math.min(remainingBalance, config.secondTier.cap);
  const secondTierRate = config.secondTier.rate / MONTHS_PER_YEAR;
  const secondTierInterest = secondTierBalance * secondTierRate;

  const totalExtraInterest = firstTierInterest + secondTierInterest;
  return roundToTwoDecimals(totalExtraInterest);
}

/**
 * Apply interest to accounts (updates balances)
 * This combines base interest + extra interest
 *
 * @param accounts - Account balances to update
 * @param age - Current age
 * @returns Updated accounts object
 */
export function applyMonthlyInterest(
  accounts: CPFAccounts,
  age: number
): CPFAccounts {
  const baseInterest = calculateMonthlyInterest(accounts, age);
  const extraInterest = calculateExtraInterest(accounts, age);

  // Distribute extra interest based on which accounts contributed to eligible balance
  const extraInterestAllocation = allocateExtraInterest(accounts, age, extraInterest);

  return {
    ordinaryAccount: roundToTwoDecimals(
      accounts.ordinaryAccount + baseInterest.oa + extraInterestAllocation.oa
    ),
    specialAccount: roundToTwoDecimals(
      accounts.specialAccount + baseInterest.sa + extraInterestAllocation.sa
    ),
    medisaveAccount: roundToTwoDecimals(
      accounts.medisaveAccount + baseInterest.ma + extraInterestAllocation.ma
    ),
    retirementAccount: roundToTwoDecimals(
      accounts.retirementAccount + baseInterest.ra + extraInterestAllocation.ra
    )
  };
}

/**
 * Allocate extra interest to accounts based on their contribution to eligible balance
 * Under 55: OA (up to $20k) + SA/MA (up to $40k)
 * Age 55+: All accounts proportionally
 */
function allocateExtraInterest(
  accounts: CPFAccounts,
  age: number,
  extraInterest: number
): {
  oa: number;
  sa: number;
  ma: number;
  ra: number;
} {
  if (extraInterest === 0) {
    return { oa: 0, sa: 0, ma: 0, ra: 0 };
  }

  if (age < CPF_AGE_55) {
    return allocateExtraInterestUnder55(accounts, extraInterest);
  } else {
    return allocateExtraInterestAge55Plus(accounts, extraInterest);
  }
}

/**
 * Allocate extra interest for under 55
 * Eligible: OA (up to $20k) + SA/MA (up to $40k) = $60k total
 */
function allocateExtraInterestUnder55(
  accounts: CPFAccounts,
  extraInterest: number
): {
  oa: number;
  sa: number;
  ma: number;
  ra: number;
} {
  const { extraInterest: config } = CPF_CONFIG_2025.interestRates;
  const { oaCap, balanceCap } = config.under55;

  // Calculate eligible amounts from each account
  const oaEligible = Math.min(accounts.ordinaryAccount, oaCap);
  const remainingCap = balanceCap - oaEligible;

  // SA and MA compete for the remaining cap
  const saPlusMA = accounts.specialAccount + accounts.medisaveAccount;
  const smEligible = Math.min(saPlusMA, remainingCap);

  // If both SA and MA have balances, split proportionally
  let saEligible = 0;
  let maEligible = 0;
  if (saPlusMA > 0) {
    const saRatio = accounts.specialAccount / saPlusMA;
    const maRatio = accounts.medisaveAccount / saPlusMA;
    saEligible = smEligible * saRatio;
    maEligible = smEligible * maRatio;
  }

  const totalEligible = oaEligible + saEligible + maEligible;

  if (totalEligible === 0) {
    return { oa: 0, sa: 0, ma: 0, ra: 0 };
  }

  // Distribute extra interest proportionally to eligible amounts
  return {
    oa: (oaEligible / totalEligible) * extraInterest,
    sa: (saEligible / totalEligible) * extraInterest,
    ma: (maEligible / totalEligible) * extraInterest,
    ra: 0 // RA doesn't exist before age 55
  };
}

/**
 * Allocate extra interest for age 55+
 * Eligible: All accounts proportionally (first $30k at +2%, next $30k at +1%)
 */
function allocateExtraInterestAge55Plus(
  accounts: CPFAccounts,
  extraInterest: number
): {
  oa: number;
  sa: number;
  ma: number;
  ra: number;
} {
  // For 55+, extra interest is distributed proportionally to all accounts
  const totalBalance =
    accounts.ordinaryAccount +
    accounts.specialAccount +
    accounts.medisaveAccount +
    accounts.retirementAccount;

  if (totalBalance === 0) {
    return { oa: 0, sa: 0, ma: 0, ra: 0 };
  }

  return {
    oa: (accounts.ordinaryAccount / totalBalance) * extraInterest,
    sa: (accounts.specialAccount / totalBalance) * extraInterest,
    ma: (accounts.medisaveAccount / totalBalance) * extraInterest,
    ra: (accounts.retirementAccount / totalBalance) * extraInterest
  };
}

/**
 * Calculate effective interest rate including extra interest
 * Useful for displaying to users
 */
export function getEffectiveInterestRate(
  accounts: CPFAccounts,
  age: number
): {
  oa: number;
  smra: number;
  effective: number; // Weighted average
} {
  const { interestRates } = CPF_CONFIG_2025;

  // Calculate what 1 year of interest would be
  const yearlyBaseInterest = calculateAnnualInterest(accounts, age);
  const yearlyExtraInterest = calculateExtraInterest(accounts, age) * MONTHS_PER_YEAR;

  const totalBalance =
    accounts.ordinaryAccount +
    accounts.specialAccount +
    accounts.medisaveAccount +
    accounts.retirementAccount;

  const effectiveRate =
    totalBalance > 0 ? (yearlyBaseInterest + yearlyExtraInterest) / totalBalance : 0;

  return {
    oa: interestRates.ordinaryAccount,
    smra: interestRates.specialAccount,
    effective: Math.round(effectiveRate * 10000) / 10000 // 4 decimal places
  };
}

/**
 * Helper: Calculate annual interest (for effective rate calculation)
 */
function calculateAnnualInterest(accounts: CPFAccounts, age: number): number {
  const { interestRates } = CPF_CONFIG_2025;

  const oaInterest = accounts.ordinaryAccount * interestRates.ordinaryAccount;
  const saInterest = age < CPF_AGE_55 ? accounts.specialAccount * interestRates.specialAccount : 0;
  const maInterest = accounts.medisaveAccount * interestRates.medisaveAccount;
  const raInterest = age >= CPF_AGE_55 ? accounts.retirementAccount * interestRates.retirementAccount : 0;

  return oaInterest + saInterest + maInterest + raInterest;
}
