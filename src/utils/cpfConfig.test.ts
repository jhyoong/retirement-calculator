import { describe, it, expect } from 'vitest';
import { getCPFYearConfig, getRetirementSums } from './cpfConfig';

const YEARS = [2025, 2026, 2027, 2030];

describe('CPF Configuration', () => {
  it.each(YEARS)('has continuous contribution rate age brackets (%i)', year => {
    const rates = getCPFYearConfig(year).contributionRates;
    expect(rates[0].ageMin).toBe(0);
    for (let i = 0; i < rates.length - 1; i++) {
      expect(rates[i].ageMax + 1).toBe(rates[i + 1].ageMin);
    }
  });

  it.each(YEARS)('has continuous allocation rate age brackets (%i)', year => {
    const rates = getCPFYearConfig(year).allocationRates;
    expect(rates[0].ageMin).toBe(0);
    for (let i = 0; i < rates.length - 1; i++) {
      expect(rates[i].ageMax + 1).toBe(rates[i + 1].ageMin);
    }
  });

  it.each(YEARS)('has allocation ratios that sum to 1 (%i)', year => {
    getCPFYearConfig(year).allocationRates.forEach(rate => {
      const sum =
        rate.ordinaryAccount + rate.specialAccount + rate.medisaveAccount + rate.retirementAccount;
      expect(Math.abs(sum - 1)).toBeLessThan(0.0001);
    });
  });

  it.each(YEARS)('employer + employee equals total rate (%i)', year => {
    getCPFYearConfig(year).contributionRates.forEach(rate => {
      expect(rate.employerRate + rate.employeeRate).toBeCloseTo(rate.totalRate, 6);
    });
  });

  it('has 2026 wage ceilings and BHS', () => {
    const config = getCPFYearConfig(2026);
    expect(config.wageCeilings.monthlyOrdinaryWage).toBe(8000);
    expect(config.wageCeilings.annualSalaryCeiling).toBe(102000);
    expect(config.wageCeilings.annualCPFLimit).toBe(37740);
    expect(config.basicHealthcareSum).toBe(79000);
  });

  it('has 2026 interest rates', () => {
    const { interestRates } = getCPFYearConfig(2026);
    expect(interestRates.ordinaryAccount).toBe(0.025);
    expect(interestRates.specialAccount).toBe(0.04);
    expect(interestRates.medisaveAccount).toBe(0.04);
    expect(interestRates.retirementAccount).toBe(0.04);
  });

  it('years before 2026 use 2026 rules; years after 2027 use 2027 rules', () => {
    expect(getCPFYearConfig(2025)).toEqual(getCPFYearConfig(2026));
    expect(getCPFYearConfig(2040)).toEqual(getCPFYearConfig(2027));
    expect(getCPFYearConfig(2026).contributionRates[1].totalRate).toBe(0.34);
    expect(getCPFYearConfig(2027).contributionRates[1].totalRate).toBe(0.355);
  });

  it('returns retirement sums by cohort year', () => {
    expect(getRetirementSums(2025)).toEqual({ basic: 106500, full: 213000, enhanced: 426000 });
    expect(getRetirementSums(2026)).toEqual({ basic: 110200, full: 220400, enhanced: 440800 });
    expect(getRetirementSums(2027)).toEqual({ basic: 114100, full: 228200, enhanced: 456400 });
    expect(getRetirementSums(2010)).toEqual(getRetirementSums(2025));
    expect(getRetirementSums(2050)).toEqual(getRetirementSums(2027));
  });
});
