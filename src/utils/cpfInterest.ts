/**
 * CPF Interest Calculations
 *
 * CPF interest is computed monthly but credited once a year (end of December).
 * Use accrueMonthlyInterest() each month, sum the results, then call
 * creditInterest() at year end.
 *
 * Extra interest (section 3 of CPF_INFO.md):
 * - Below 55: +1% on the first $60,000 of combined balances, taken in order
 *   OA (max $20,000), SA, MA.
 * - 55 and above: +2% on the first $30,000 and +1% on the next $30,000, taken in
 *   order RA, OA (max $20,000), SA, MA.
 * - Extra interest earned on OA goes to SA (below 55) or RA (55+).
 *   Extra interest on SA/MA/RA stays in that account.
 */

import { getCPFYearConfig } from './cpfConfig';
import type { CPFInterestRates } from './cpfConfig';
import type { CPFAccounts } from '@/types';
import { MONTHS_PER_YEAR, roundToTwoDecimals, CPF_AGE_55 } from './constants';

type AccountKey = 'oa' | 'sa' | 'ma' | 'ra';
type AccountAmounts = Record<AccountKey, number>;

function currentYear(): number {
  return new Date().getFullYear();
}

function getInterestRates(year: number): CPFInterestRates {
  return getCPFYearConfig(year).interestRates;
}

/** Base interest for one month, unrounded */
function baseMonthlyInterest(accounts: CPFAccounts, age: number, year: number): AccountAmounts {
  const rates = getInterestRates(year);
  return {
    oa: (accounts.ordinaryAccount * rates.ordinaryAccount) / MONTHS_PER_YEAR,
    // SA only exists before 55, RA only from 55
    sa: age < CPF_AGE_55 ? (accounts.specialAccount * rates.specialAccount) / MONTHS_PER_YEAR : 0,
    ma: (accounts.medisaveAccount * rates.medisaveAccount) / MONTHS_PER_YEAR,
    ra: age >= CPF_AGE_55 ? (accounts.retirementAccount * rates.retirementAccount) / MONTHS_PER_YEAR : 0
  };
}

/**
 * Extra interest for one month earned on each account's balance (unrounded).
 * This is where it is earned, not where it is credited.
 */
function extraMonthlyInterestByAccount(
  accounts: CPFAccounts,
  age: number,
  year: number
): AccountAmounts {
  const { extraInterest } = getInterestRates(year);

  let order: { key: AccountKey; balance: number }[];
  let tiers: { rate: number; cap: number }[];
  let oaCap: number;

  if (age < CPF_AGE_55) {
    const cfg = extraInterest.under55;
    oaCap = cfg.oaCap;
    tiers = [{ rate: cfg.rate, cap: cfg.balanceCap }];
    order = [
      { key: 'oa', balance: accounts.ordinaryAccount },
      { key: 'sa', balance: accounts.specialAccount },
      { key: 'ma', balance: accounts.medisaveAccount }
    ];
  } else {
    const cfg = extraInterest.age55Plus;
    oaCap = cfg.oaCap;
    tiers = [cfg.firstTier, cfg.secondTier];
    order = [
      { key: 'ra', balance: accounts.retirementAccount },
      { key: 'oa', balance: accounts.ordinaryAccount },
      { key: 'sa', balance: accounts.specialAccount },
      { key: 'ma', balance: accounts.medisaveAccount }
    ];
  }

  const result: AccountAmounts = { oa: 0, sa: 0, ma: 0, ra: 0 };
  let tierIndex = 0;
  let tierRoom = tiers[0].cap;

  for (const { key, balance } of order) {
    let eligible = Math.max(0, key === 'oa' ? Math.min(balance, oaCap) : balance);

    // Fill the tiers in order with this account's eligible balance
    while (eligible > 0 && tierIndex < tiers.length) {
      const used = Math.min(eligible, tierRoom);
      result[key] += (used * tiers[tierIndex].rate) / MONTHS_PER_YEAR;
      eligible -= used;
      tierRoom -= used;
      if (tierRoom <= 0) {
        tierIndex++;
        tierRoom = tierIndex < tiers.length ? tiers[tierIndex].cap : 0;
      }
    }
  }

  return result;
}

/**
 * Interest accrued for one month, to be credited at year end.
 * Per-account amounts are what to credit to each account (base + routed extra).
 * extraInterest is the total extra portion, for display.
 */
export function accrueMonthlyInterest(
  accounts: CPFAccounts,
  age: number,
  year: number
): { oa: number; sa: number; ma: number; ra: number; extraInterest: number; total: number } {
  const base = baseMonthlyInterest(accounts, age, year);
  const extra = extraMonthlyInterestByAccount(accounts, age, year);

  // Extra interest on OA goes to SA (below 55) or RA (55+)
  const credit: AccountAmounts = {
    oa: base.oa,
    sa: base.sa + extra.sa,
    ma: base.ma + extra.ma,
    ra: base.ra + extra.ra
  };
  if (age < CPF_AGE_55) {
    credit.sa += extra.oa;
  } else {
    credit.ra += extra.oa;
  }

  const oa = roundToTwoDecimals(credit.oa);
  const sa = roundToTwoDecimals(credit.sa);
  const ma = roundToTwoDecimals(credit.ma);
  const ra = roundToTwoDecimals(credit.ra);

  return {
    oa,
    sa,
    ma,
    ra,
    extraInterest: roundToTwoDecimals(extra.oa + extra.sa + extra.ma + extra.ra),
    total: roundToTwoDecimals(oa + sa + ma + ra)
  };
}

/**
 * Credit accrued interest to the accounts (call at year end)
 */
export function creditInterest(
  accounts: CPFAccounts,
  accrued: { oa: number; sa: number; ma: number; ra: number }
): CPFAccounts {
  return {
    ordinaryAccount: roundToTwoDecimals(accounts.ordinaryAccount + accrued.oa),
    specialAccount: roundToTwoDecimals(accounts.specialAccount + accrued.sa),
    medisaveAccount: roundToTwoDecimals(accounts.medisaveAccount + accrued.ma),
    retirementAccount: roundToTwoDecimals(accounts.retirementAccount + accrued.ra)
  };
}

/**
 * Base monthly interest per account (no extra interest)
 * OA: 2.5% p.a., SA/MA/RA: 4.0% p.a.
 */
export function calculateMonthlyInterest(
  accounts: CPFAccounts,
  age: number,
  year: number = currentYear()
): { oa: number; sa: number; ma: number; ra: number; total: number } {
  const base = baseMonthlyInterest(accounts, age, year);
  return {
    oa: roundToTwoDecimals(base.oa),
    sa: roundToTwoDecimals(base.sa),
    ma: roundToTwoDecimals(base.ma),
    ra: roundToTwoDecimals(base.ra),
    total: roundToTwoDecimals(base.oa + base.sa + base.ma + base.ra)
  };
}

/**
 * Total monthly extra interest
 */
export function calculateExtraInterest(
  accounts: CPFAccounts,
  age: number,
  year: number = currentYear()
): number {
  const extra = extraMonthlyInterestByAccount(accounts, age, year);
  return roundToTwoDecimals(extra.oa + extra.sa + extra.ma + extra.ra);
}

/**
 * Accrue and credit one month of interest immediately.
 * Prefer accrueMonthlyInterest + creditInterest for yearly crediting.
 */
export function applyMonthlyInterest(
  accounts: CPFAccounts,
  age: number,
  year: number = currentYear()
): CPFAccounts {
  return creditInterest(accounts, accrueMonthlyInterest(accounts, age, year));
}

/**
 * Effective annual interest rate including extra interest (for display)
 */
export function getEffectiveInterestRate(
  accounts: CPFAccounts,
  age: number,
  year: number = currentYear()
): { oa: number; smra: number; effective: number } {
  const rates = getInterestRates(year);
  const base = baseMonthlyInterest(accounts, age, year);
  const extra = extraMonthlyInterestByAccount(accounts, age, year);

  const yearlyInterest =
    (base.oa + base.sa + base.ma + base.ra + extra.oa + extra.sa + extra.ma + extra.ra) *
    MONTHS_PER_YEAR;

  const totalBalance =
    accounts.ordinaryAccount +
    accounts.specialAccount +
    accounts.medisaveAccount +
    accounts.retirementAccount;

  const effectiveRate = totalBalance > 0 ? yearlyInterest / totalBalance : 0;

  return {
    oa: rates.ordinaryAccount,
    smra: rates.specialAccount,
    effective: Math.round(effectiveRate * 10000) / 10000
  };
}
