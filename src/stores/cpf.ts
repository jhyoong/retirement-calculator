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

  // Computed
  const cpfData = computed((): CPFData => ({
    enabled: enabled.value,
    currentBalances: currentBalances.value,
    retirementSumTarget: retirementSumTarget.value
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

  function resetToDefaults() {
    enabled.value = false;
    currentBalances.value = {
      ordinaryAccount: 0,
      specialAccount: 0,
      medisaveAccount: 0,
      retirementAccount: 0
    };
    retirementSumTarget.value = 'full';
  }

  function loadData(data: CPFData) {
    enabled.value = data.enabled;
    currentBalances.value = data.currentBalances;
    retirementSumTarget.value = data.retirementSumTarget;
  }

  return {
    // State
    enabled,
    currentBalances,
    retirementSumTarget,
    // Computed
    cpfData,
    // Actions
    updateEnabled,
    updateBalances,
    updateRetirementSumTarget,
    resetToDefaults,
    loadData
  };
});
