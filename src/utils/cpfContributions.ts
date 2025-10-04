import { CPF_CONFIG_2025 } from './cpfConfig';
import type { CPFContribution } from '@/types';

/**
 * Get contribution rate for a specific age
 */
export function getContributionRate(age: number) {
  const rate = CPF_CONFIG_2025.contributionRates.find(
    r => age >= r.ageMin && age <= r.ageMax
  );

  if (!rate) {
    throw new Error(`No contribution rate found for age ${age}`);
  }

  return rate;
}

/**
 * Get allocation rate for a specific age
 */
export function getAllocationRate(age: number) {
  const rate = CPF_CONFIG_2025.allocationRates.find(
    r => age >= r.ageMin && age <= r.ageMax
  );

  if (!rate) {
    throw new Error(`No allocation rate found for age ${age}`);
  }

  return rate;
}

/**
 * Calculate CPF contribution for a given month
 * Handles wage ceilings and annual limits
 *
 * @param monthlySalary - Gross monthly salary
 * @param age - Age during this month
 * @param yearToDateContributions - Total CPF contributions this calendar year (before this month)
 * @returns CPF contribution breakdown
 */
export function calculateCPFContribution(
  monthlySalary: number,
  age: number,
  yearToDateContributions: number = 0
): CPFContribution {
  // Apply monthly wage ceiling
  const cpfEligibleWage = Math.min(
    monthlySalary,
    CPF_CONFIG_2025.wageCeilings.monthlyOrdinaryWage
  );

  // Get rates for this age
  const contributionRate = getContributionRate(age);
  const allocationRate = getAllocationRate(age);

  // Calculate gross contributions
  let employeeContribution = cpfEligibleWage * contributionRate.employeeRate;
  let employerContribution = cpfEligibleWage * contributionRate.employerRate;
  let totalContribution = employeeContribution + employerContribution;

  // Apply annual limit
  const remaining = CPF_CONFIG_2025.wageCeilings.annualCPFLimit - yearToDateContributions;
  if (totalContribution > remaining && remaining >= 0) {
    const scaleFactor = remaining / totalContribution;
    employeeContribution *= scaleFactor;
    employerContribution *= scaleFactor;
    totalContribution = remaining;
  }

  // Allocate to accounts
  const toOA = totalContribution * allocationRate.ordinaryAccount;
  const toSA = totalContribution * allocationRate.specialAccount;
  const toMA = totalContribution * allocationRate.medisaveAccount;
  const toRA = totalContribution * allocationRate.retirementAccount;

  // Round to 2 decimal places
  return {
    employee: Math.round(employeeContribution * 100) / 100,
    employer: Math.round(employerContribution * 100) / 100,
    total: Math.round(totalContribution * 100) / 100,
    allocation: {
      toOA: Math.round(toOA * 100) / 100,
      toSA: Math.round(toSA * 100) / 100,
      toMA: Math.round(toMA * 100) / 100,
      toRA: Math.round(toRA * 100) / 100
    }
  };
}
