import { CPF_CONFIG_2025 } from './cpfConfig';

/**
 * Estimate CPF Life monthly payout based on RA balance
 * Uses 2025 payout estimates for age 65
 *
 * @param raBalance - Retirement Account balance
 * @param plan - CPF Life plan: 'standard', 'basic', or 'escalating'
 * @returns Estimated monthly payout from age 65
 */
export function estimateCPFLifePayout(
  raBalance: number,
  plan: 'standard' | 'basic' | 'escalating' = 'standard'
): number {
  const { cpfLifePayouts, retirementSums } = CPF_CONFIG_2025;

  // Calculate payout based on proportion to retirement sums
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

  // Adjust based on plan type
  const planMultiplier = getPlanMultiplier(plan);
  const estimatedPayout = basePayout * planMultiplier;

  return Math.round(estimatedPayout * 100) / 100;
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
      return 1.0;
    case 'basic':
      return 1.15; // ~15% higher initial payout
    case 'escalating':
      return 0.85; // ~15% lower initial payout
    default:
      return 1.0;
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
    const escalationRate = 0.02; // 2% per year
    return Math.round(initialPayout * Math.pow(1 + escalationRate, yearsFromAge65) * 100) / 100;
  }

  return initialPayout;
}

/**
 * Calculate when CPF Life payouts begin
 * Typically age 65, but can defer up to age 70
 */
export function getCPFLifePayoutAge(deferToAge?: number): number {
  const defaultAge = 65;
  const maxDeferralAge = 70;

  if (deferToAge && deferToAge > defaultAge && deferToAge <= maxDeferralAge) {
    return deferToAge;
  }

  return defaultAge;
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
  annualInterestRate: number = 0.04
): {
  monthsUntilDepletion: number;
  totalWithdrawn: number;
  totalInterestEarned: number;
} {
  const monthlyRate = annualInterestRate / 12;
  let balance = raBalance;
  let months = 0;
  let totalWithdrawn = 0;
  let totalInterest = 0;

  while (balance > 0 && months < 1200) {
    // Max 100 years
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
    totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
    totalInterestEarned: Math.round(totalInterest * 100) / 100
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
  const lifeExpectancyYears = 90 - 65; // Assume living to 90
  const lifeExpectancyMonths = lifeExpectancyYears * 12;

  // CPF Life option
  const cpfLifePayout = estimateCPFLifePayout(raBalance, 'standard');
  const cpfLifeTotal = cpfLifePayout * lifeExpectancyMonths;

  // Manual withdrawal option
  const manualResult = calculateRADepletion(raBalance, targetMonthlyIncome);

  // Recommendation logic
  let recommendation = '';
  if (cpfLifePayout >= targetMonthlyIncome * 0.9) {
    recommendation = 'CPF Life recommended: Provides guaranteed lifetime income meeting your target.';
  } else if (manualResult.monthsUntilDepletion >= lifeExpectancyMonths) {
    recommendation =
      'Either option works: Manual withdrawal can meet target and last beyond life expectancy.';
  } else {
    recommendation = 'CPF Life strongly recommended: Manual withdrawal will deplete before age 90.';
  }

  return {
    cpfLife: {
      monthlyPayout: Math.round(cpfLifePayout * 100) / 100,
      guaranteed: true,
      totalLifetimePayout: Math.round(cpfLifeTotal * 100) / 100
    },
    manualWithdrawal: {
      monthlyWithdrawal: targetMonthlyIncome,
      monthsUntilDepletion: manualResult.monthsUntilDepletion,
      totalWithdrawn: manualResult.totalWithdrawn
    },
    recommendation
  };
}
