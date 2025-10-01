<template>
  <div class="bg-white rounded-lg shadow-md p-6 mt-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">
      Retirement Projections
    </h2>

    <div v-if="!store.validation.isValid" class="text-center py-8">
      <p class="text-gray-500">
        Please correct the errors above to see your retirement projections.
      </p>
    </div>

    <div v-else-if="store.results" class="space-y-4">
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p class="text-sm text-blue-700 font-medium">
          Future Value at Retirement
        </p>
        <p class="text-3xl font-bold text-blue-900">
          {{ formatCurrency(store.results.futureValue) }}
        </p>
        <p class="text-sm text-blue-600 mt-1">
          In {{ store.results.yearsToRetirement }} years
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p class="text-sm text-gray-700 font-medium">
            Total Contributions
          </p>
          <p class="text-2xl font-bold text-gray-900">
            {{ formatCurrency(store.results.totalContributions) }}
          </p>
        </div>

        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
          <p class="text-sm text-green-700 font-medium">
            Investment Growth
          </p>
          <p class="text-2xl font-bold text-green-900">
            {{ formatCurrency(store.results.investmentGrowth) }}
          </p>
        </div>
      </div>

      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p class="text-sm text-yellow-700 font-medium">
          Inflation-Adjusted Value
        </p>
        <p class="text-2xl font-bold text-yellow-900">
          {{ formatCurrency(store.results.inflationAdjustedValue) }}
        </p>
        <p class="text-xs text-yellow-600 mt-1">
          This is the purchasing power of your retirement savings in today's dollars
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRetirementStore } from '@/stores/retirement'

const store = useRetirementStore()

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}
</script>
