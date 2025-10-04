import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CPFData, CPFAccounts } from '@/types';

export const useCPFStore = defineStore('cpf', () => {
  // State
  const enabled = ref(false);
  const currentBalances = ref<CPFAccounts>({
    ordinaryAccount: 0,
    specialAccount: 0,
    medisaveAccount: 0,
    retirementAccount: 0
  });
  const retirementSumTarget = ref<'basic' | 'full' | 'enhanced'>('full');
  const cpfLifePlan = ref<'standard' | 'basic' | 'escalating'>('standard');
  const cpfLifePayoutAge = ref<65 | 70>(65);
  const manualOverride = ref(false);

  // Computed
  const cpfData = computed((): CPFData => ({
    enabled: enabled.value,
    currentBalances: currentBalances.value,
    retirementSumTarget: retirementSumTarget.value,
    cpfLifePlan: cpfLifePlan.value,
    cpfLifePayoutAge: cpfLifePayoutAge.value,
    manualOverride: manualOverride.value
  }));

  // Actions
  function updateEnabled(value: boolean) {
    enabled.value = value;
  }

  function updateBalances(balances: Partial<CPFAccounts>) {
    currentBalances.value = { ...currentBalances.value, ...balances };
  }

  function updateRetirementSumTarget(target: 'basic' | 'full' | 'enhanced') {
    retirementSumTarget.value = target;
  }

  function updateCPFLifePlan(plan: 'standard' | 'basic' | 'escalating') {
    cpfLifePlan.value = plan;
  }

  function updateCPFLifePayoutAge(age: 65 | 70) {
    cpfLifePayoutAge.value = age;
  }

  function updateManualOverride(value: boolean) {
    manualOverride.value = value;
  }

  function resetToDefaults() {
    enabled.value = false;
    currentBalances.value = {
      ordinaryAccount: 0,
      specialAccount: 0,
      medisaveAccount: 0,
      retirementAccount: 0
    };
    retirementSumTarget.value = 'full';
    cpfLifePlan.value = 'standard';
    cpfLifePayoutAge.value = 65;
    manualOverride.value = false;
  }

  function loadData(data: CPFData) {
    enabled.value = data.enabled;
    currentBalances.value = data.currentBalances;
    retirementSumTarget.value = data.retirementSumTarget;
    cpfLifePlan.value = data.cpfLifePlan || 'standard';
    cpfLifePayoutAge.value = data.cpfLifePayoutAge || 65;
    manualOverride.value = data.manualOverride || false;
    // Note: Legacy 'housingUsage' field is ignored for backward compatibility
  }

  return {
    // State
    enabled,
    currentBalances,
    retirementSumTarget,
    cpfLifePlan,
    cpfLifePayoutAge,
    manualOverride,
    // Computed
    cpfData,
    // Actions
    updateEnabled,
    updateBalances,
    updateRetirementSumTarget,
    updateCPFLifePlan,
    updateCPFLifePayoutAge,
    updateManualOverride,
    resetToDefaults,
    loadData
  };
});
