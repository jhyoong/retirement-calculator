import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCPFStore } from './cpf';

describe('CPF Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should initialize with correct defaults', () => {
    const store = useCPFStore();

    expect(store.enabled).toBe(false);
    expect(store.currentBalances).toEqual({
      ordinaryAccount: 0,
      specialAccount: 0,
      medisaveAccount: 0,
      retirementAccount: 0
    });
    expect(store.retirementSumTarget).toBe('full');
  });

  it('should update enabled state', () => {
    const store = useCPFStore();

    store.updateEnabled(true);
    expect(store.enabled).toBe(true);

    store.updateEnabled(false);
    expect(store.enabled).toBe(false);
  });

  it('should update account balances', () => {
    const store = useCPFStore();

    store.updateBalances({
      ordinaryAccount: 50000,
      specialAccount: 30000
    });

    expect(store.currentBalances.ordinaryAccount).toBe(50000);
    expect(store.currentBalances.specialAccount).toBe(30000);
    expect(store.currentBalances.medisaveAccount).toBe(0);
    expect(store.currentBalances.retirementAccount).toBe(0);
  });

  it('should reset to defaults', () => {
    const store = useCPFStore();

    // Set some values
    store.updateEnabled(true);
    store.updateBalances({
      ordinaryAccount: 50000,
      specialAccount: 30000,
      medisaveAccount: 20000,
      retirementAccount: 100000
    });
    store.updateRetirementSumTarget('enhanced');

    // Reset
    store.resetToDefaults();

    expect(store.enabled).toBe(false);
    expect(store.currentBalances).toEqual({
      ordinaryAccount: 0,
      specialAccount: 0,
      medisaveAccount: 0,
      retirementAccount: 0
    });
    expect(store.retirementSumTarget).toBe('full');
  });

  it('should load data from object', () => {
    const store = useCPFStore();

    const testData = {
      enabled: true,
      currentBalances: {
        ordinaryAccount: 40000,
        specialAccount: 25000,
        medisaveAccount: 15000,
        retirementAccount: 0
      },
      retirementSumTarget: 'basic' as const
    };

    store.loadData(testData);

    expect(store.enabled).toBe(true);
    expect(store.currentBalances).toEqual(testData.currentBalances);
    expect(store.retirementSumTarget).toBe('basic');
  });
});
