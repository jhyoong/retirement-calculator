<template>
  <div class="space-y-6">
    <div class="bg-white rounded-lg shadow-md p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold text-gray-900">
          Visualizations
        </h2>

        <div class="flex items-center space-x-2">
          <label class="text-sm font-medium text-gray-700">
            Show:
          </label>
          <button
            @click="showInflationAdjusted = false"
            :class="[
              'px-4 py-2 rounded-l-lg text-sm font-medium transition-colors',
              !showInflationAdjusted
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            ]"
          >
            Nominal
          </button>
          <button
            @click="showInflationAdjusted = true"
            :class="[
              'px-4 py-2 rounded-r-lg text-sm font-medium transition-colors',
              showInflationAdjusted
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            ]"
          >
            Inflation-Adjusted
          </button>
        </div>
      </div>

      <div v-if="!store.validation.isValid" class="text-center py-8">
        <p class="text-gray-500">
          Please correct the errors above to see visualizations.
        </p>
      </div>

      <div v-else-if="store.results" class="space-y-6">
        <PortfolioChart :monthly-data="displayData" />
        <MonthlyBreakdownTable :monthly-data="displayData" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRetirementStore } from '@/stores/retirement'
import { generateMonthlyProjections, applyInflationAdjustment } from '@/utils/monthlyProjections'
import PortfolioChart from './PortfolioChart.vue'
import MonthlyBreakdownTable from './MonthlyBreakdownTable.vue'

const store = useRetirementStore()
const showInflationAdjusted = ref(false)

// Generate monthly projections from current user data
const nominalProjections = computed(() => {
  if (!store.validation.isValid) {
    return []
  }
  return generateMonthlyProjections(store.userData)
})

// Apply inflation adjustment if toggled
const displayData = computed(() => {
  if (nominalProjections.value.length === 0) {
    return []
  }

  if (showInflationAdjusted.value) {
    return applyInflationAdjustment(nominalProjections.value, store.userData.inflationRate)
  }

  return nominalProjections.value
})
</script>
