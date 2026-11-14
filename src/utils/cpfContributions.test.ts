import { describe, it, expect } from 'vitest';
import {
  getContributionRate,
  getAllocationRate,
  calculateCPFContribution,
  applyCPFContribution
} from './cpfContributions';
import type { CPFAccounts } from '@/types';

describe('CPF Contributions', () => {
  describe('getContributionRate (2026)', () => {
    it('55 and below: 17% / 20% / 37%', () => {
      const rate = getContributionRate(30, 2026);
      expect(rate.employerRate).toBe(0.17);
      expect(rate.employeeRate).toBe(0.2);
      expect(rate.totalRate).toBe(0.37);
    });

    it('above 55 to 60: 16% / 18% / 34%', () => {
      const rate = getContributionRate(58, 2026);
      expect(rate.employerRate).toBe(0.16);
      expect(rate.employeeRate).toBe(0.18);
      expect(rate.totalRate).toBe(0.34);
    });

    it('above 60 to 65: 12.5% / 12.5% / 25%', () => {
      const rate = getContributionRate(63, 2026);
      expect(rate.employerRate).toBe(0.125);
      expect(rate.employeeRate).toBe(0.125);
      expect(rate.totalRate).toBe(0.25);
    });

    it('above 65 to 70: 9% / 7.5% / 16.5%', () => {
      const rate = getContributionRate(70, 2026);
      expect(rate.employerRate).toBe(0.09);
      expect(rate.employeeRate).toBe(0.075);
      expect(rate.totalRate).toBe(0.165);
    });

    it('above 70: 7.5% / 5% / 12.5%', () => {
      const rate = getContributionRate(71, 2026);
      expect(rate.employerRate).toBe(0.075);
      expect(rate.employeeRate).toBe(0.05);
      expect(rate.totalRate).toBe(0.125);
    });

    it('should throw error for invalid age', () => {
      expect(() => getContributionRate(-1, 2026)).toThrow();
      expect(() => getContributionRate(150, 2026)).toThrow();
    });
  });

  describe('getContributionRate (2027)', () => {
    it('above 55 to 60: 16.5% / 19% / 35.5%', () => {
      const rate = getContributionRate(58, 2027);
      expect(rate.employerRate).toBe(0.165);
      expect(rate.employeeRate).toBe(0.19);
      expect(rate.totalRate).toBe(0.355);
    });

    it('above 60 to 65: 13% / 13% / 26%', () => {
      const rate = getContributionRate(63, 2027);
      expect(rate.employerRate).toBe(0.13);
      expect(rate.employeeRate).toBe(0.13);
      expect(rate.totalRate).toBe(0.26);
    });
  });

  describe('getAllocationRate', () => {
    it('age 30 (35 and below)', () => {
      const rate = getAllocationRate(30, 2026);
      expect(rate.ordinaryAccount).toBe(0.6217);
      expect(rate.specialAccount).toBe(0.1621);
      expect(rate.medisaveAccount).toBe(0.2162);
      expect(rate.retirementAccount).toBe(0);
    });

    it('age 41 is in the above 35 to 45 band', () => {
      const rate = getAllocationRate(41, 2026);
      expect(rate.ordinaryAccount).toBe(0.5677);
      expect(rate.specialAccount).toBe(0.1891);
      expect(rate.medisaveAccount).toBe(0.2432);
    });

    it('age 46 is in the above 45 to 50 band', () => {
      const rate = getAllocationRate(46, 2026);
      expect(rate.ordinaryAccount).toBe(0.5136);
      expect(rate.specialAccount).toBe(0.2162);
      expect(rate.medisaveAccount).toBe(0.2702);
    });

    it('age 58 allocates to RA (2026)', () => {
      const rate = getAllocationRate(58, 2026);
      expect(rate.ordinaryAccount).toBe(0.353);
      expect(rate.specialAccount).toBe(0);
      expect(rate.medisaveAccount).toBe(0.3088);
      expect(rate.retirementAccount).toBe(0.3382);
    });

    it('age 58 and 63 use 2027 ratios from 2027', () => {
      const r58 = getAllocationRate(58, 2027);
      expect(r58.ordinaryAccount).toBe(0.3382);
      expect(r58.retirementAccount).toBe(0.3661);
      expect(r58.medisaveAccount).toBe(0.2957);

      const r63 = getAllocationRate(63, 2027);
      expect(r63.ordinaryAccount).toBe(0.1347);
      expect(r63.retirementAccount).toBe(0.4615);
      expect(r63.medisaveAccount).toBe(0.4038);
    });

    it('66-70 and above 70 are separate bands', () => {
      expect(getAllocationRate(70, 2026).medisaveAccount).toBe(0.6363);
      expect(getAllocationRate(71, 2026).medisaveAccount).toBe(0.84);
    });
  });

  describe('calculateCPFContribution', () => {
    it('$5000 salary, age 30', () => {
      const contribution = calculateCPFContribution(5000, 30, 0, 2026);
      expect(contribution.employee).toBe(1000);
      expect(contribution.employer).toBe(850);
      expect(contribution.total).toBe(1850);
    });

    it('$8000 salary, age 30, 2026: total $2,960, employee $1,600', () => {
      const contribution = calculateCPFContribution(8000, 30, 0, 2026);
      expect(contribution.total).toBe(2960);
      expect(contribution.employee).toBe(1600);
      expect(contribution.employer).toBe(1360);
    });

    it('applies the $8,000 OW ceiling', () => {
      const contribution = calculateCPFContribution(12000, 30, 0, 2026);
      expect(contribution.total).toBe(2960);
      expect(contribution.employee).toBe(1600);
    });

    it('max monthly totals by age band in 2026 match the doc', () => {
      expect(calculateCPFContribution(8000, 58, 0, 2026)).toMatchObject({ total: 2720, employee: 1440 });
      expect(calculateCPFContribution(8000, 63, 0, 2026)).toMatchObject({ total: 2000, employee: 1000 });
      expect(calculateCPFContribution(8000, 68, 0, 2026)).toMatchObject({ total: 1320, employee: 600 });
      expect(calculateCPFContribution(8000, 75, 0, 2026)).toMatchObject({ total: 1000, employee: 400 });
    });

    it('uses 2027 rates from 2027', () => {
      expect(calculateCPFContribution(8000, 58, 0, 2027)).toMatchObject({ total: 2840, employee: 1520 });
      expect(calculateCPFContribution(8000, 63, 0, 2027)).toMatchObject({ total: 2080, employee: 1040 });
      expect(calculateCPFContribution(8000, 58, 0, 2035).total).toBe(2840);
    });

    it('years before 2026 use 2026 rules', () => {
      expect(calculateCPFContribution(8000, 58, 0, 2025)).toMatchObject({ total: 2720, employee: 1440 });
    });

    it('should enforce annual limit', () => {
      // Already contributed $37,000 of the $37,740 limit
      const contribution = calculateCPFContribution(5000, 30, 37000, 2026);
      expect(contribution.total).toBe(740);
    });

    it('gives zero when annual limit already exceeded', () => {
      const contribution = calculateCPFContribution(5000, 30, 40000, 2026);
      expect(contribution.total).toBe(0);
    });

    it('allocates age 30 per doc % of wage (23% / 6% / 8%)', () => {
      const { allocation, total } = calculateCPFContribution(8000, 30, 0, 2026);
      expect(allocation.toOA).toBeCloseTo(1840, 0);
      expect(allocation.toSA).toBeCloseTo(480, 0);
      expect(allocation.toMA).toBeCloseTo(640, 0);
      expect(allocation.toRA).toBe(0);
      expect(allocation.toOA + allocation.toSA + allocation.toMA).toBeCloseTo(total, 2);
    });

    it('allocates age 58 to RA per doc % of wage (12% / 11.5% / 10.5%)', () => {
      const { allocation } = calculateCPFContribution(8000, 58, 0, 2026);
      expect(allocation.toSA).toBe(0);
      expect(allocation.toOA).toBeCloseTo(960, 0);
      expect(allocation.toRA).toBeCloseTo(920, 0);
      expect(allocation.toMA).toBeCloseTo(840, 0);
    });

    it('should handle zero salary', () => {
      const contribution = calculateCPFContribution(0, 30, 0, 2026);
      expect(contribution.employee).toBe(0);
      expect(contribution.employer).toBe(0);
      expect(contribution.total).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const contribution = calculateCPFContribution(5123.45, 30, 0, 2026);
      expect(contribution.employee.toFixed(2)).toBe(contribution.employee.toString());
      expect(contribution.employer.toFixed(2)).toBe(contribution.employer.toString());
      expect(contribution.total.toFixed(2)).toBe(contribution.total.toString());
    });
  });

  describe('applyCPFContribution', () => {
    const limits = { frs: 220400, bhs: 79000 };

    function acc(oa: number, sa: number, ma: number, ra: number): CPFAccounts {
      return { ordinaryAccount: oa, specialAccount: sa, medisaveAccount: ma, retirementAccount: ra };
    }

    it('below 55: adds each share when below caps', () => {
      const result = applyCPFContribution(acc(0, 0, 0, 0), { toOA: 1840, toSA: 480, toMA: 640, toRA: 0 }, 30, limits);
      expect(result).toEqual(acc(1840, 480, 640, 0));
    });

    it('below 55: MediSave excess over BHS goes to SA', () => {
      const result = applyCPFContribution(acc(0, 0, 78800, 0), { toOA: 1840, toSA: 480, toMA: 640, toRA: 0 }, 30, limits);
      expect(result.medisaveAccount).toBe(79000);
      expect(result.specialAccount).toBe(920); // 480 + 440
      expect(result.ordinaryAccount).toBe(1840);
    });

    it('below 55: MediSave excess goes to OA once SA reaches FRS', () => {
      const result = applyCPFContribution(acc(0, 220400, 79000, 0), { toOA: 1840, toSA: 480, toMA: 640, toRA: 0 }, 30, limits);
      expect(result.medisaveAccount).toBe(79000);
      expect(result.specialAccount).toBe(220880); // SA share itself is not capped
      expect(result.ordinaryAccount).toBe(2480); // 1840 + 640
    });

    it('55+: RA share goes to RA below FRS', () => {
      const result = applyCPFContribution(acc(0, 0, 0, 100000), { toOA: 960, toSA: 0, toMA: 840, toRA: 920 }, 58, limits);
      expect(result).toEqual(acc(960, 0, 840, 100920));
    });

    it('55+: RA share above FRS overflows to OA', () => {
      const result = applyCPFContribution(acc(0, 0, 0, 220000), { toOA: 960, toSA: 0, toMA: 840, toRA: 920 }, 58, limits);
      expect(result.retirementAccount).toBe(220400);
      expect(result.ordinaryAccount).toBe(1480); // 960 + 520
    });

    it('55+: MediSave excess goes to RA up to FRS, then OA', () => {
      const result = applyCPFContribution(acc(0, 0, 79000, 219800), { toOA: 960, toSA: 0, toMA: 840, toRA: 920 }, 58, limits);
      expect(result.medisaveAccount).toBe(79000);
      expect(result.retirementAccount).toBe(220400); // 600 room
      expect(result.ordinaryAccount).toBe(2120); // 960 + (920 + 840 - 600)
    });
  });
});
