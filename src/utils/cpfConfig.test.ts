import { describe, it, expect } from 'vitest';
import { CPF_CONFIG_2025 } from './cpfConfig';

describe('CPF Configuration', () => {
  it('should have continuous contribution rate age brackets', () => {
    const rates = CPF_CONFIG_2025.contributionRates;

    // Check that age brackets are continuous (no gaps)
    for (let i = 0; i < rates.length - 1; i++) {
      expect(rates[i].ageMax + 1).toBe(rates[i + 1].ageMin);
    }

    // Check that first bracket starts at 0
    expect(rates[0].ageMin).toBe(0);
  });

  it('should have continuous allocation rate age brackets', () => {
    const rates = CPF_CONFIG_2025.allocationRates;

    // Check that age brackets are continuous (no gaps)
    for (let i = 0; i < rates.length - 1; i++) {
      expect(rates[i].ageMax + 1).toBe(rates[i + 1].ageMin);
    }

    // Check that first bracket starts at 0
    expect(rates[0].ageMin).toBe(0);
  });

  it('should have allocation percentages that sum to 100%', () => {
    const rates = CPF_CONFIG_2025.allocationRates;

    rates.forEach(rate => {
      const sum =
        rate.ordinaryAccount +
        rate.specialAccount +
        rate.medisaveAccount +
        rate.retirementAccount;

      // Allow small floating point error (within 0.0001)
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.0001);
    });
  });
});
