import { getCPFYearConfig } from './cpfConfig';
import type { CPFAccounts, CPFContribution } from '@/types';
import { roundToTwoDecimals, CPF_AGE_55 } from './constants';

/**
 * Get contribution rate for a specific age and year
 */
export function getContributionRate(age: number, year: number = new Date().getFullYear()) {
  const rate = getCPFYearConfig(year).contributionRates.find(
    r => age >= r.ageMin && age <= r.ageMax
  );

  if (!rate) {
    throw new Error(`No contribution rate found for age ${age}`);
  }

  return rate;
}

/**
 * Get allocation rate for a specific age and year
 */
export function getAllocationRate(age: number, year: number = new Date().getFullYear()) {
  const rate = getCPFYearConfig(year).allocationRates.find(
    r => age >= r.ageMin && age <= r.ageMax
  );

  if (!rate) {
    throw new Error(`No allocation rate found for age ${age}`);
  }

  return rate;
}

/**
 * Calculate CPF contribution for a given month
 * Handles the monthly OW ceiling and the annual CPF limit.
 *
 * Allocation: MediSave is calculated first, then SA/RA, and the remainder goes to OA.
 * For ages 55+ the RA share is in allocation.toRA (toSA is 0).
 *
 * @param monthlySalary - Gross monthly salary
 * @param age - Age during this month
 * @param yearToDateContributions - Total CPF contributions this calendar year (before this month)
 * @param year - Calendar year (selects the rate table)
 * @returns CPF contribution breakdown
 */
export function calculateCPFContribution(
  monthlySalary: number,
  age: number,
  yearToDateContributions: number = 0,
  year: number = new Date().getFullYear()
): CPFContribution {
  const { wageCeilings } = getCPFYearConfig(year);

  // Apply monthly wage ceiling
  const cpfEligibleWage = Math.max(0, Math.min(monthlySalary, wageCeilings.monthlyOrdinaryWage));

  const contributionRate = getContributionRate(age, year);
  const allocationRate = getAllocationRate(age, year);

  let employeeContribution = cpfEligibleWage * contributionRate.employeeRate;
  let employerContribution = cpfEligibleWage * contributionRate.employerRate;
  let totalContribution = employeeContribution + employerContribution;

  // Apply annual CPF limit
  const remaining = Math.max(0, wageCeilings.annualCPFLimit - yearToDateContributions);
  if (totalContribution > remaining) {
    const scaleFactor = totalContribution > 0 ? remaining / totalContribution : 0;
    employeeContribution *= scaleFactor;
    employerContribution *= scaleFactor;
    totalContribution = remaining;
  }

  const total = roundToTwoDecimals(totalContribution);
  const toMA = roundToTwoDecimals(total * allocationRate.medisaveAccount);
  const toSA = roundToTwoDecimals(total * allocationRate.specialAccount);
  const toRA = roundToTwoDecimals(total * allocationRate.retirementAccount);
  const toOA = roundToTwoDecimals(total - toMA - toSA - toRA);

  return {
    employee: roundToTwoDecimals(employeeContribution),
    employer: roundToTwoDecimals(employerContribution),
    total,
    allocation: { toOA, toSA, toMA, toRA }
  };
}

/**
 * Add a monthly contribution to the accounts, applying the BHS and FRS caps.
 *
 * - MediSave does not grow past the BHS. Excess goes to SA up to the FRS, then OA
 *   (below 55), or to RA up to the FRS, then OA (55 and above).
 * - For 55+, the RA share only goes to RA up to the FRS; the rest goes to OA.
 *
 * @param accounts - Current balances
 * @param allocation - Contribution allocation from calculateCPFContribution
 * @param age - Age this month
 * @param limits - frs: Full Retirement Sum cap (cohort FRS for 55+); bhs: Basic Healthcare Sum
 */
export function applyCPFContribution(
  accounts: CPFAccounts,
  allocation: { toOA: number; toSA: number; toMA: number; toRA: number },
  age: number,
  limits: { frs: number; bhs: number }
): CPFAccounts {
  // MediSave up to BHS
  const maRoom = Math.max(0, limits.bhs - accounts.medisaveAccount);
  const toMA = Math.min(allocation.toMA, maRoom);
  const maExcess = allocation.toMA - toMA;

  let toOA = allocation.toOA;
  let toSA = 0;
  let toRA = 0;

  if (age < CPF_AGE_55) {
    // SA share is not capped; only MediSave excess is limited to SA up to FRS
    toSA = allocation.toSA + allocation.toRA;
    const saRoom = Math.max(0, limits.frs - accounts.specialAccount - toSA);
    const excessToSA = Math.min(maExcess, saRoom);
    toSA += excessToSA;
    toOA += maExcess - excessToSA;
  } else {
    // RA share (plus any SA share and MediSave excess) goes to RA up to FRS, rest to OA
    const forRA = allocation.toRA + allocation.toSA + maExcess;
    const raRoom = Math.max(0, limits.frs - accounts.retirementAccount);
    toRA = Math.min(forRA, raRoom);
    toOA += forRA - toRA;
  }

  return {
    ordinaryAccount: roundToTwoDecimals(accounts.ordinaryAccount + toOA),
    specialAccount: roundToTwoDecimals(accounts.specialAccount + toSA),
    medisaveAccount: roundToTwoDecimals(accounts.medisaveAccount + toMA),
    retirementAccount: roundToTwoDecimals(accounts.retirementAccount + toRA)
  };
}
