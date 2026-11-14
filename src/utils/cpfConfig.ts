/**
 * CPF configuration by year.
 * All figures come from CPF_INFO.md (last updated 14 November 2026).
 *
 * IMPORTANT: These are government-mandated CPF milestones and rules:
 * - Age 55: Special Account (SA) closes, Retirement Account (RA) created
 * - Age 65: Default CPF Life payout start age
 * - Age 70: Maximum CPF Life payout deferral age
 *
 * These CPF ages are separate from a user's personal retirement age goal.
 *
 * Policy for years without announced figures:
 * - The app projects forward from today, so years before 2026 use the 2026 rules.
 * - Years after 2027 use the 2027 rules (latest announced).
 * - Retirement sums: cohorts turning 55 before 2025 use the 2025 sums,
 *   cohorts after 2027 use the 2027 sums (latest announced).
 * - BHS: every year uses $79,000 (2026, latest announced).
 * - Interest rates: the Q4 2026 floor rates are used for every year
 *   (the 4% SMRA floor is extended to 31 December 2027).
 *
 * Age brackets use integer ages: "above 55 to 60" = ages 56-60, etc.
 */

export interface ContributionRate {
  ageMin: number;
  ageMax: number;
  employerRate: number;
  employeeRate: number;
  totalRate: number;
}

export interface AllocationRate {
  ageMin: number;
  ageMax: number;
  ordinaryAccount: number;
  specialAccount: number;
  medisaveAccount: number;
  retirementAccount: number;
}

export interface CPFInterestRates {
  ordinaryAccount: number;
  specialAccount: number;
  medisaveAccount: number;
  retirementAccount: number;
  extraInterest: {
    under55: { rate: number; balanceCap: number; oaCap: number };
    age55Plus: {
      firstTier: { rate: number; cap: number };
      secondTier: { rate: number; cap: number };
      oaCap: number;
    };
  };
}

export interface CPFYearConfig {
  contributionRates: ContributionRate[];
  allocationRates: AllocationRate[];
  wageCeilings: {
    monthlyOrdinaryWage: number;
    annualSalaryCeiling: number;
    annualCPFLimit: number;
  };
  interestRates: CPFInterestRates;
  basicHealthcareSum: number;
}

export interface RetirementSums {
  basic: number;
  full: number;
  enhanced: number;
}

// Contribution rates from 1 January 2026 (section 1)
const CONTRIBUTION_RATES_2026: ContributionRate[] = [
  { ageMin: 0, ageMax: 55, employerRate: 0.17, employeeRate: 0.2, totalRate: 0.37 },
  { ageMin: 56, ageMax: 60, employerRate: 0.16, employeeRate: 0.18, totalRate: 0.34 },
  { ageMin: 61, ageMax: 65, employerRate: 0.125, employeeRate: 0.125, totalRate: 0.25 },
  { ageMin: 66, ageMax: 70, employerRate: 0.09, employeeRate: 0.075, totalRate: 0.165 },
  { ageMin: 71, ageMax: 120, employerRate: 0.075, employeeRate: 0.05, totalRate: 0.125 }
];

// Contribution rates from 1 January 2027 (section 10)
const CONTRIBUTION_RATES_2027: ContributionRate[] = [
  { ageMin: 0, ageMax: 55, employerRate: 0.17, employeeRate: 0.2, totalRate: 0.37 },
  { ageMin: 56, ageMax: 60, employerRate: 0.165, employeeRate: 0.19, totalRate: 0.355 },
  { ageMin: 61, ageMax: 65, employerRate: 0.13, employeeRate: 0.13, totalRate: 0.26 },
  { ageMin: 66, ageMax: 70, employerRate: 0.09, employeeRate: 0.075, totalRate: 0.165 },
  { ageMin: 71, ageMax: 120, employerRate: 0.075, employeeRate: 0.05, totalRate: 0.125 }
];

// Allocation ratios from 1 January 2026 (section 4). 56+ share goes to RA.
const ALLOCATION_RATES_2026: AllocationRate[] = [
  { ageMin: 0, ageMax: 35, ordinaryAccount: 0.6217, specialAccount: 0.1621, medisaveAccount: 0.2162, retirementAccount: 0 },
  { ageMin: 36, ageMax: 45, ordinaryAccount: 0.5677, specialAccount: 0.1891, medisaveAccount: 0.2432, retirementAccount: 0 },
  { ageMin: 46, ageMax: 50, ordinaryAccount: 0.5136, specialAccount: 0.2162, medisaveAccount: 0.2702, retirementAccount: 0 },
  { ageMin: 51, ageMax: 55, ordinaryAccount: 0.4055, specialAccount: 0.3108, medisaveAccount: 0.2837, retirementAccount: 0 },
  { ageMin: 56, ageMax: 60, ordinaryAccount: 0.353, specialAccount: 0, medisaveAccount: 0.3088, retirementAccount: 0.3382 },
  { ageMin: 61, ageMax: 65, ordinaryAccount: 0.14, specialAccount: 0, medisaveAccount: 0.42, retirementAccount: 0.44 },
  { ageMin: 66, ageMax: 70, ordinaryAccount: 0.0607, specialAccount: 0, medisaveAccount: 0.6363, retirementAccount: 0.303 },
  { ageMin: 71, ageMax: 120, ordinaryAccount: 0.08, specialAccount: 0, medisaveAccount: 0.84, retirementAccount: 0.08 }
];

// Allocation ratios from 1 January 2027 (section 10): only 56-60 and 61-65 change
const ALLOCATION_RATES_2027: AllocationRate[] = ALLOCATION_RATES_2026.map(rate => {
  if (rate.ageMin === 56) {
    return { ...rate, ordinaryAccount: 0.3382, medisaveAccount: 0.2957, retirementAccount: 0.3661 };
  }
  if (rate.ageMin === 61) {
    return { ...rate, ordinaryAccount: 0.1347, medisaveAccount: 0.4038, retirementAccount: 0.4615 };
  }
  return rate;
});

// Wage ceilings (section 2)
const WAGE_CEILINGS = {
  monthlyOrdinaryWage: 8000,
  annualSalaryCeiling: 102000,
  annualCPFLimit: 37740
};

// Interest rates, 1 Oct to 31 Dec 2026 (section 3)
const INTEREST_RATES: CPFInterestRates = {
  ordinaryAccount: 0.025,
  specialAccount: 0.04,
  medisaveAccount: 0.04,
  retirementAccount: 0.04,
  extraInterest: {
    under55: { rate: 0.01, balanceCap: 60000, oaCap: 20000 },
    age55Plus: {
      firstTier: { rate: 0.02, cap: 30000 },
      secondTier: { rate: 0.01, cap: 30000 },
      oaCap: 20000
    }
  }
};

// Basic Healthcare Sum 2026 (section 6)
const BASIC_HEALTHCARE_SUM = 79000;

// Retirement sums by cohort year (year the member turns 55), section 5
const RETIREMENT_SUMS: Record<number, RetirementSums> = {
  2025: { basic: 106500, full: 213000, enhanced: 426000 },
  2026: { basic: 110200, full: 220400, enhanced: 440800 },
  2027: { basic: 114100, full: 228200, enhanced: 456400 }
};

/**
 * Get CPF rules for a calendar year.
 * Years before 2026 use 2026 rules; years from 2027 onward use 2027 rules.
 */
export function getCPFYearConfig(year: number): CPFYearConfig {
  const use2027 = year >= 2027;
  return {
    contributionRates: use2027 ? CONTRIBUTION_RATES_2027 : CONTRIBUTION_RATES_2026,
    allocationRates: use2027 ? ALLOCATION_RATES_2027 : ALLOCATION_RATES_2026,
    wageCeilings: WAGE_CEILINGS,
    interestRates: INTEREST_RATES,
    basicHealthcareSum: BASIC_HEALTHCARE_SUM
  };
}

/** Latest cohort year with announced retirement sums */
export const LATEST_ANNOUNCED_COHORT_YEAR = 2027;

/**
 * Get BRS/FRS/ERS for the cohort turning 55 in cohortYear.
 * Clamped to the announced cohorts (2025 to 2027).
 */
export function getRetirementSums(cohortYear: number): RetirementSums {
  const year = Math.min(LATEST_ANNOUNCED_COHORT_YEAR, Math.max(2025, Math.floor(cohortYear)));
  return RETIREMENT_SUMS[year];
}

/**
 * Cohort year = calendar year the member turns 55.
 * Ages are whole years in this app.
 */
export function getCohortYear(currentAge: number, currentYear: number = new Date().getFullYear()): number {
  return currentYear + (55 - currentAge);
}

/**
 * Note to show when a cohort's sums are not in the table, or null if they are.
 */
export function getCohortSumsNote(cohortYear: number): string | null {
  if (cohortYear > LATEST_ANNOUNCED_COHORT_YEAR) {
    return `Retirement sums for cohorts after ${LATEST_ANNOUNCED_COHORT_YEAR} are not announced yet; the ${LATEST_ANNOUNCED_COHORT_YEAR} figures are used.`;
  }
  if (cohortYear < 2025) {
    return 'Retirement sums for cohorts before 2025 are not included; the 2025 figures are used.';
  }
  return null;
}
