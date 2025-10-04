import { CPF_CONFIG_2025 } from './cpfConfig';
import {
  roundToTwoDecimals,
  CPF_LIFE_AGE,
  CPF_MAX_DEFERRAL_AGE,
  MONTHS_PER_YEAR,
  DEFAULT_LIFE_EXPECTANCY,
  DEFAULT_CPF_INTEREST_RATE,
  MAX_CALCULATION_MONTHS,
  CPF_STANDARD_PLAN_MULTIPLIER,
  CPF_BASIC_PLAN_MULTIPLIER,
  CPF_ESCALATING_PLAN_MULTIPLIER,
  CPF_ESCALATION_RATE,
  INCOME_TARGET_THRESHOLD
} from './constants';

/**
 * Estimate CPF Life monthly payout based on RA balance
 * Uses 2025 payout estimates for age 65, with deferment bonus for age 70
 *
 * @param raBalance - Retirement Account balance
 * @param plan - CPF Life plan: 'standard', 'basic', or 'escalating'
 * @param payoutAge - Age when payouts begin (65 or 70, default: 65)
 * @returns Estimated monthly payout from payout age
 */
export function estimateCPFLifePayout(
  raBalance: number,
  plan: 'standard' | 'basic' | 'escalating' = 'standard',
  payoutAge: 65 | 70 = 65
): number {
  const { cpfLifePayouts, retirementSums } = CPF_CONFIG_2025;

  // Calculate base payout based on proportion to retirement sums (for age 65)
  let basePayout: number;

  if (raBalance <= retirementSums.basic) {
    // Pro-rate based on BRS
    const proportion = raBalance / retirementSums.basic;
    basePayout = ((cpfLifePayouts.basic.min + cpfLifePayouts.basic.max) / 2) * proportion;
  } else if (raBalance <= retirementSums.full) {
    // Pro-rate based on FRS
    const proportion = raBalance / retirementSums.full;
    basePayout = ((cpfLifePayouts.full.min + cpfLifePayouts.full.max) / 2) * proportion;
  } else {
    // Pro-rate based on ERS or higher
    const proportion = raBalance / retirementSums.enhanced;
    basePayout = ((cpfLifePayouts.enhanced.min + cpfLifePayouts.enhanced.max) / 2) * proportion;
  }

  // Apply deferment bonus if starting at age 70
  // Deferring from 65 to 70 gives ~7% per year compounded: 1.07^5 ≈ 1.403
  const defermentMultiplier = payoutAge === 70 ? 1.403 : 1.0;
  basePayout = basePayout * defermentMultiplier;

  // Adjust based on plan type
  const planMultiplier = getPlanMultiplier(plan);
  const estimatedPayout = basePayout * planMultiplier;

  return roundToTwoDecimals(estimatedPayout);
}

/**
 * Get plan multiplier for different CPF Life plans
 * Standard: baseline
 * Basic: higher initial payout, no escalation
 * Escalating: lower initial, increases over time
 */
function getPlanMultiplier(plan: 'standard' | 'basic' | 'escalating'): number {
  switch (plan) {
    case 'standard':
      return CPF_STANDARD_PLAN_MULTIPLIER;
    case 'basic':
      return CPF_BASIC_PLAN_MULTIPLIER;
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
 * @param initialPayout - Payout at age 65
 * @param yearsFromAge65 - Years since turning 65
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
