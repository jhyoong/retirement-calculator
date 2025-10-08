<template>
  <div class="space-y-6">
    <div class="bg-white rounded-lg shadow-md p-4 sm:p-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h2 class="text-xl sm:text-2xl font-bold text-gray-900">
          Visualizations
        </h2>

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div v-if="store.validation.isValid" class="flex items-center gap-2">
            <label class="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">
              Show up to age:
            </label>
            <select
              v-model.number="selectedMaxAge"
              class="flex-1 sm:flex-initial px-2 sm:px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
            >
              <option :value="undefined">Retirement Age ({{ store.userData.retirementAge }})</option>
              <option
                v-for="age in availableAges"
                :key="age"
                :value="age"
              >
                {{ age }}
              </option>
            </select>
          </div>
          <button
            v-if="needsRecalculation"
            @click="handleRecalculate"
            :disabled="store.isCalculating"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="store.isCalculating">Calculating...</span>
            <span v-else>Recalculate</span>
          </button>
        </div>
      </div>

      <div v-if="!store.validation.isValid" class="text-center py-8">
        <p class="text-gray-500">
          Please correct the errors above to see visualizations.
        </p>
      </div>

      <div v-else-if="!store.results" class="text-center py-8">
        <p class="text-gray-500">
          Click the Calculate button to generate visualizations.
        </p>
      </div>

      <div v-else class="space-y-6">
        <PortfolioChart :monthly-data="displayData" />
        <MonthlyBreakdownTable :monthly-data="displayData" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRetirementStore } from '@/stores/retirement'
import PortfolioChart from './PortfolioChart.vue'
import MonthlyBreakdownTable from './MonthlyBreakdownTable.vue'

const store = useRetirementStore()
const selectedMaxAge = ref<number | undefined>(undefined)

// Generate available ages from retirement age to 100
const availableAges = computed(() => {
  const retirementAge = store.userData.retirementAge
  const ages: number[] = []
  for (let age = retirementAge + 1; age <= 100; age++) {
    ages.push(age)
  }
  return ages
})

// Check if we need to recalculate (selected age exceeds cached data)
const needsRecalculation = computed(() => {
  if (!store.validation.isValid || !selectedMaxAge.value) {
    return false
  }

  // Need recalculation if:
  // 1. Selected age is beyond retirement age (post-retirement projections)
  // 2. AND selected age differs from cached max age
  const isPostRetirement = selectedMaxAge.value > store.userData.retirementAge
  const isDifferentFromCached = selectedMaxAge.value !== store.cachedMaxAge

  return isPostRetirement && isDifferentFromCached
})

// Use cached monthly projections from store, optionally filtered by max age
const displayData = computed(() => {
  if (!store.validation.isValid || store.monthlyProjections.length === 0) {
    return []
  }

  const projections = store.monthlyProjections

  // If no max age selected, return all projections
  if (!selectedMaxAge.value) {
    return projections
  }

  // Filter to selected max age
  return projections.filter(p => p.age <= selectedMaxAge.value!)
})

// Handle recalculation with new max age
function handleRecalculate() {
  if (selectedMaxAge.value) {
    store.calculate(selectedMaxAge.value)
  }
}
</script>
