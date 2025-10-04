import { describe, it, expect } from 'vitest';
import {
  getContributionRate,
  getAllocationRate,
  calculateCPFContribution
} from './cpfContributions';

describe('CPF Contributions', () => {
  describe('getContributionRate', () => {
    it('should return correct rate for age 30 (≤55 bracket)', () => {
      const rate = getContributionRate(30);
      expect(rate.employerRate).toBe(0.17);
      expect(rate.employeeRate).toBe(0.20);
      expect(rate.totalRate).toBe(0.37);
    });

    it('should return correct rate for age 58 (56-60 bracket)', () => {
      const rate = getContributionRate(58);
      expect(rate.employerRate).toBe(0.155);
      expect(rate.employeeRate).toBe(0.17);
      expect(rate.totalRate).toBe(0.325);
    });

    it('should return correct rate for age 63 (61-65 bracket)', () => {
      const rate = getContributionRate(63);
      expect(rate.employerRate).toBe(0.115);
      expect(rate.employeeRate).toBe(0.13);
      expect(rate.totalRate).toBe(0.245);
    });

    it('should throw error for invalid age', () => {
      expect(() => getContributionRate(-1)).toThrow();
      expect(() => getContributionRate(150)).toThrow();
    });
  });

  describe('getAllocationRate', () => {
    it('should allocate correctly for age 30', () => {
      const rate = getAllocationRate(30);
      expect(rate.ordinaryAccount).toBe(0.6217);
      expect(rate.specialAccount).toBe(0.1621);
      expect(rate.medisaveAccount).toBe(0.2162);
      expect(rate.retirementAccount).toBe(0);
    });

    it('should allocate to RA for age 58 (after 55)', () => {
      const rate = getAllocationRate(58);
      expect(rate.ordinaryAccount).toBe(0.1231);
      expect(rate.specialAccount).toBe(0);
      expect(rate.medisaveAccount).toBe(0.3385);
      expect(rate.retirementAccount).toBe(0.5384);
    });

    it('should have allocations sum to 1.0', () => {
      const rate = getAllocationRate(30);
      const sum =
        rate.ordinaryAccount +
        rate.specialAccount +
        rate.medisaveAccount +
        rate.retirementAccount;
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.0001);
    });
  });

  describe('calculateCPFContribution', () => {
    it('should calculate correctly for $5000 salary, age 30', () => {
      const contribution = calculateCPFContribution(5000, 30);

      // Expected: Employee 20%, Employer 17%, Total 37%
      expect(contribution.employee).toBe(1000); // 5000 * 0.20
      expect(contribution.employer).toBe(850); // 5000 * 0.17
      expect(contribution.total).toBe(1850); // 1000 + 850
    });

    it('should apply wage ceiling for high salary', () => {
      const contribution = calculateCPFContribution(10000, 30);

      // Should cap at $7400
      expect(contribution.employee).toBe(1480); // 7400 * 0.20
      expect(contribution.employer).toBe(1258); // 7400 * 0.17
      expect(contribution.total).toBe(2738);
    });

    it('should enforce annual limit', () => {
      // Already contributed $37,000, $740 remaining
      const contribution = calculateCPFContribution(5000, 30, 37000);

      // Should be capped at remaining $740
      expect(contribution.total).toBe(740);
    });

    it('should allocate to correct accounts for age 30', () => {
      const contribution = calculateCPFContribution(5000, 30);

      // Total contribution is $1850
      // Should allocate based on age 30 rates
      expect(contribution.allocation.toOA).toBeCloseTo(1150.15, 1); // 1850 * 0.6217
      expect(contribution.allocation.toSA).toBeCloseTo(299.89, 1); // 1850 * 0.1621
      expect(contribution.allocation.toMA).toBeCloseTo(399.97, 1); // 1850 * 0.2162
      expect(contribution.allocation.toRA).toBe(0);
    });

    it('should allocate to RA for age 58', () => {
      const contribution = calculateCPFContribution(5000, 58);

      // Age 58 contributes to RA, not SA
      expect(contribution.allocation.toSA).toBe(0);
      expect(contribution.allocation.toRA).toBeGreaterThan(0);
    });

    it('should handle zero salary', () => {
      const contribution = calculateCPFContribution(0, 30);

      expect(contribution.employee).toBe(0);
      expect(contribution.employer).toBe(0);
      expect(contribution.total).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const contribution = calculateCPFContribution(5123.45, 30);

      // All values should be rounded to 2 decimal places
      // Check by converting to string and looking at decimal places
      expect(contribution.employee.toFixed(2)).toBe(contribution.employee.toString());
      expect(contribution.employer.toFixed(2)).toBe(contribution.employer.toString());
      expect(contribution.total.toFixed(2)).toBe(contribution.total.toString());
    });
  });
});
