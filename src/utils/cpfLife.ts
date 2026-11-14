import {
  roundToTwoDecimals,
  CPF_LIFE_AGE,
  CPF_MAX_DEFERRAL_AGE,
  MONTHS_PER_YEAR,
  DEFAULT_LIFE_EXPECTANCY,
  DEFAULT_CPF_INTEREST_RATE,
  MAX_CALCULATION_MONTHS,
  CPF_STANDARD_PLAN_MULTIPLIER,
  CPF_ESCALATING_PLAN_MULTIPLIER,
  CPF_ESCALATION_RATE,
  INCOME_TARGET_THRESHOLD
} from './constants';

/**
 * CPF LIFE Standard Plan payout table for the cohort turning 55 in 2026.
 * Monthly payouts are the midpoint of the estimator ranges in CPF_INFO.md section 5
 * (DBS article citing the CPF payout estimator, January 2026):
 *   BRS $110,200: age 65 $890-$930,   age 70 $1,170-$1,270
 *   FRS $220,400: age 65 $1,640-$1,750, age 70 $2,190-$2,370
 *   ERS $440,800: age 65 $3,180-$3,410, age 70 $4,200-$4,550
 */
export const CPF_LIFE_PAYOUT_TABLE_2026 = [
  { ra: 0, age65: 0, age70: 0 },
  { ra: 110200, age65: (890 + 930) / 2, age70: (1170 + 1270) / 2 },
  { ra: 220400, age65: (1640 + 1750) / 2, age70: (2190 + 2370) / 2 },
  { ra: 440800, age65: (3180 + 3410) / 2, age70: (4200 + 4550) / 2 }
] as const;

/**
 * Estimate CPF Life monthly payout based on RA balance.
 * Estimates are for the cohort turning 55 in 2026 (see CPF_LIFE_PAYOUT_TABLE_2026).
 * Uses piecewise linear interpolation through (0,0), BRS, FRS and ERS points.
 * RA is capped at the ERS, since the RA cannot hold more than the ERS.
 *
 * @param raBalance - Retirement Account balance
 * @param plan - CPF Life plan: 'standard', 'basic', or 'escalating'
 * @param payoutAge - Age when payouts begin (65 or 70, default: 65)
 * @param basicPlanPayoutPercent - Basic plan payout as a % of the Standard plan, entered by the user.
 *   Required when plan is 'basic'. CPF does not publish a fixed percentage.
 * @returns Estimated monthly payout from payout age
 */
export function estimateCPFLifePayout(
  raBalance: number,
  plan: 'standard' | 'basic' | 'escalating' = 'standard',
  payoutAge: 65 | 70 = 65,
  basicPlanPayoutPercent?: number
): number {
  const table = CPF_LIFE_PAYOUT_TABLE_2026;
  const maxRA = table[table.length - 1].ra;
  const ra = Math.min(Math.max(raBalance, 0), maxRA);
  const key = payoutAge === 70 ? 'age70' : 'age65';

  let standardPayout = 0;
  for (let i = 1; i < table.length; i++) {
    const lo = table[i - 1];
    const hi = table[i];
    if (ra <= hi.ra) {
      const t = (ra - lo.ra) / (hi.ra - lo.ra);
      standardPayout = lo[key] + t * (hi[key] - lo[key]);
      break;
    }
  }

  return roundToTwoDecimals(standardPayout * getPlanMultiplier(plan, basicPlanPayoutPercent));
}

/**
 * Get plan multiplier for different CPF Life plans
 * Standard: baseline
 * Basic: user-entered % of Standard (cpf.gov.sg says Basic payouts are lower than Standard,
 *   but gives no fixed percentage)
 * Escalating: about 20% lower initial, increases 2% a year
 */
function getPlanMultiplier(
  plan: 'standard' | 'basic' | 'escalating',
  basicPlanPayoutPercent?: number
): number {
  switch (plan) {
    case 'standard':
      return CPF_STANDARD_PLAN_MULTIPLIER;
    case 'basic':
      if (basicPlanPayoutPercent === undefined || !(basicPlanPayoutPercent > 0) || basicPlanPayoutPercent > 100) {
        throw new Error('Basic plan payout % (1-100) is required for the Basic plan');
      }
      return basicPlanPayoutPercent / 100;
    case 'escalating':
      return CPF_ESCALATING_PLAN_MULTIPLIER;
    default:
      return CPF_STANDARD_PLAN_MULTIPLIER;
  }
}

/**
 * Calculate monthly CPF Life payout with escalation
 * Escalating plan increases by ~2% annually
 *
 * @param initialPayout - First-year monthly payout (at the payout age)
 * @param yearsFromAge65 - Whole years since payouts started
 * @param plan - CPF Life plan
 * @returns Adjusted monthly payout
 */
export function getCPFLifePayoutForYear(
  initialPayout: number,
  yearsFromAge65: number,
  plan: 'standard' | 'basic' | 'escalating'
): number {
  if (plan === 'escalating' && yearsFromAge65 > 0) {
    return roundToTwoDecimals(initialPayout * Math.pow(1 + CPF_ESCALATION_RATE, yearsFromAge65));
  }

  return initialPayout;
}

/**
 * Calculate when CPF Life payouts begin
 * Typically age 65, but can defer up to age 70
 */
export function getCPFLifePayoutAge(deferToAge?: number): number {
  if (deferToAge && deferToAge > CPF_LIFE_AGE && deferToAge <= CPF_MAX_DEFERRAL_AGE) {
    return deferToAge;
  }

  return CPF_LIFE_AGE;
}

/**
 * Calculate RA balance drawdown (if not using CPF Life)
 * User can choose to withdraw RA manually instead of CPF Life
 *
 * @param raBalance - Current RA balance
 * @param monthlyWithdrawal - Amount to withdraw per month
 * @param annualInterestRate - Annual interest rate (default 4%)
 * @returns Months until RA depletes
 */
export function calculateRADepletion(
  raBalance: number,
  monthlyWithdrawal: number,
  annualInterestRate: number = DEFAULT_CPF_INTEREST_RATE
): {
  monthsUntilDepletion: number;
  totalWithdrawn: number;
  totalInterestEarned: number;
} {
  const monthlyRate = annualInterestRate / MONTHS_PER_YEAR;
  let balance = raBalance;
  let months = 0;
  let totalWithdrawn = 0;
  let totalInterest = 0;

  while (balance > 0 && months < MAX_CALCULATION_MONTHS) {
    const interest = balance * monthlyRate;
    balance += interest;
    totalInterest += interest;

    const withdrawal = Math.min(balance, monthlyWithdrawal);
    balance -= withdrawal;
    totalWithdrawn += withdrawal;

    months++;
  }

  return {
    monthsUntilDepletion: months,
    totalWithdrawn: roundToTwoDecimals(totalWithdrawn),
    totalInterestEarned: roundToTwoDecimals(totalInterest)
  };
}

/**
 * Compare CPF Life vs manual withdrawal strategies
 */
export function compareCPFLifeStrategies(
  raBalance: number,
  targetMonthlyIncome: number
): {
  cpfLife: {
    monthlyPayout: number;
    guaranteed: boolean;
    totalLifetimePayout: number; // Assuming life expectancy
  };
  manualWithdrawal: {
    monthlyWithdrawal: number;
    monthsUntilDepletion: number;
    totalWithdrawn: number;
  };
  recommendation: string;
} {
  const lifeExpectancyYears = DEFAULT_LIFE_EXPECTANCY - CPF_LIFE_AGE;
  const lifeExpectancyMonths = lifeExpectancyYears * MONTHS_PER_YEAR;

  // CPF Life option
  const cpfLifePayout = estimateCPFLifePayout(raBalance, 'standard');
  const cpfLifeTotal = cpfLifePayout * lifeExpectancyMonths;

  // Manual withdrawal option
  const manualResult = calculateRADepletion(raBalance, targetMonthlyIncome);

  // Recommendation logic
  let recommendation = '';
  if (cpfLifePayout >= targetMonthlyIncome * INCOME_TARGET_THRESHOLD) {
    recommendation = 'CPF Life recommended: Provides guaranteed lifetime income meeting your target.';
  } else if (manualResult.monthsUntilDepletion >= lifeExpectancyMonths) {
    recommendation =
      'Either option works: Manual withdrawal can meet target and last beyond life expectancy.';
  } else {
    recommendation = 'CPF Life strongly recommended: Manual withdrawal will deplete before age 90.';
  }

  return {
    cpfLife: {
      monthlyPayout: roundToTwoDecimals(cpfLifePayout),
      guaranteed: true,
      totalLifetimePayout: roundToTwoDecimals(cpfLifeTotal)
    },
    manualWithdrawal: {
      monthlyWithdrawal: targetMonthlyIncome,
      monthsUntilDepletion: manualResult.monthsUntilDepletion,
      totalWithdrawn: manualResult.totalWithdrawn
    },
    recommendation
  };
}
