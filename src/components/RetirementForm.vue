<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">
      Your Information
    </h2>

    <form @submit.prevent>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          id="currentAge"
          label="Current Age"
          v-model="store.currentAge"
          :error="getError('currentAge')"
          helpText="Your age today"
        />

        <InputField
          id="retirementAge"
          label="Retirement Age"
          v-model="store.retirementAge"
          :error="getError('retirementAge')"
          helpText="Age you plan to retire"
        />

        <InputField
          id="currentSavings"
          label="Current Savings"
          v-model="store.currentSavings"
          step="1000"
          :error="getError('currentSavings')"
          helpText="Total retirement savings now"
        />

        <InputField
          id="expectedReturnRate"
          label="Expected Return Rate (%)"
          v-model="returnRatePercent"
          step="0.1"
          min="0"
          max="100"
          :error="getError('expectedReturnRate')"
          helpText="Annual investment return"
        />

        <InputField
          id="inflationRate"
          label="Inflation Rate (%)"
          v-model="inflationRatePercent"
          step="0.1"
          min="0"
          max="100"
          :error="getError('inflationRate')"
          helpText="Expected annual inflation"
        />
      </div>

      <div class="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-900">
        <p>
          <strong>Note:</strong> To add income and contributions, use the "Income Sources" tab.
        </p>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRetirementStore } from '@/stores/retirement'
import InputField from './InputField.vue'

const store = useRetirementStore()

// Convert between percentage display and decimal storage
const returnRatePercent = computed({
  get: () => store.expectedReturnRate * 100,
  set: (value: number) => store.updateExpectedReturnRate(value / 100)
})

const inflationRatePercent = computed({
  get: () => store.inflationRate * 100,
  set: (value: number) => store.updateInflationRate(value / 100)
})

function getError(field: string): string {
  const error = store.validation.errors.find(e => e.field === field)
  return error ? error.message : ''
}
</script>
