<template>
  <div class="bg-white rounded-lg shadow-md p-6 mt-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">
      Retirement Projections
    </h2>

    <div v-if="!store.validation.isValid" class="space-y-4">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-red-900 mb-2">
          Validation Errors
        </h3>
        <p class="text-sm text-red-800 mb-3">
          Please correct the following errors to see your retirement projections:
        </p>
        <ul class="list-disc list-inside text-sm text-red-800 space-y-1">
          <li v-for="error in store.validation.errors" :key="error.field">
            <strong>{{ formatFieldName(error.field) }}:</strong> {{ error.message }}
          </li>
        </ul>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p class="text-sm text-blue-800">
          <strong>Tip:</strong> Check the tabs above to fix validation errors:
        </p>
        <ul class="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1">
          <li>Basic Info tab for age and savings errors</li>
          <li>Income Sources tab for income-related errors</li>
          <li>Retirement Expenses tab for expense and withdrawal errors</li>
        </ul>
      </div>
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

      <!-- Phase 4: Sustainability Analysis -->
      <div v-if="expenseStore.expenses.length > 0" class="col-span-full mt-6">
        <h3 class="text-xl font-bold text-gray-900 mb-4">
          Post-Retirement Sustainability
        </h3>
        <SustainabilityDisplay />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRetirementStore } from '@/stores/retirement'
import { useExpenseStore } from '@/stores/expense'
import SustainabilityDisplay from './SustainabilityDisplay.vue'

const store = useRetirementStore()
const expenseStore = useExpenseStore()

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function formatFieldName(field: string): string {
  // Convert field names like "expense[0].name" to "Expense #1 Name"
  if (field.startsWith('expense[')) {
    const match = field.match(/expense\[(\d+)\]\.(.+)/)
    if (match) {
      const index = parseInt(match[1]) + 1
      const subfield = match[2].replace(/([A-Z])/g, ' $1').trim()
      return `Expense #${index} ${subfield}`
    }
  }

  if (field.startsWith('incomeSource[')) {
    const match = field.match(/incomeSource\[(\d+)\]\.(.+)/)
    if (match) {
      const index = parseInt(match[1]) + 1
      const subfield = match[2].replace(/([A-Z])/g, ' $1').trim()
      return `Income #${index} ${subfield}`
    }
  }

  // Convert camelCase to Title Case
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}
</script>
