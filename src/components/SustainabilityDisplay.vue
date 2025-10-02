<template>
  <div class="space-y-4">
    <!-- Main Sustainability Metric -->
    <div
      v-if="store.results"
      class="rounded-lg p-6 border-2"
      :class="isSustainable ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'"
    >
      <h3 class="text-lg font-semibold mb-2"
          :class="isSustainable ? 'text-green-900' : 'text-red-900'">
        Portfolio Sustainability
      </h3>

      <div v-if="isSustainable" class="text-green-800">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-xl font-bold">Sustainable</p>
        </div>
        <p class="text-sm">
          Your portfolio is projected to last throughout retirement based on your current withdrawal strategy and expenses.
        </p>
      </div>

      <div v-else class="text-red-800">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-xl font-bold">
            Depletes in {{ store.results.yearsUntilDepletion }} years
          </p>
        </div>
        <p class="text-sm">
          At age {{ depletionAge }}, your portfolio is projected to run out of funds.
          Consider reducing expenses or adjusting your withdrawal strategy.
        </p>
      </div>
    </div>

    <!-- Warning Banner for High Withdrawal Rate -->
    <div
      v-if="store.results && store.results.sustainabilityWarning"
      class="bg-yellow-50 border border-yellow-300 rounded-lg p-4"
    >
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <div class="flex-1">
          <h4 class="font-semibold text-yellow-900 mb-1">High Expense Rate</h4>
          <p class="text-sm text-yellow-800">
            Your annual expenses exceed the recommended safe threshold of 5% of your portfolio.
            This increases the risk of depleting your portfolio prematurely.
          </p>
        </div>
      </div>
    </div>

    <!-- Summary Metrics -->
    <div v-if="hasExpenses" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p class="text-sm text-gray-700 font-medium mb-1">
          Monthly Expenses at Retirement
        </p>
        <p class="text-2xl font-bold text-gray-900">
          {{ formatCurrency(expenseStore.totalMonthlyExpenses) }}
        </p>
      </div>

      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p class="text-sm text-gray-700 font-medium mb-1">
          Annual Expenses
        </p>
        <p class="text-2xl font-bold text-gray-900">
          {{ formatCurrency(annualExpenses) }}
        </p>
      </div>

      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p class="text-sm text-gray-700 font-medium mb-1">
          Initial Expense Rate
        </p>
        <p class="text-2xl font-bold text-gray-900">
          {{ expenseRatePercent }}%
        </p>
        <p class="text-xs text-gray-600 mt-1">
          of portfolio at retirement
        </p>
      </div>
    </div>

    <!-- No Expenses Message -->
    <div v-else class="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
      <p>Add retirement expenses to see sustainability analysis.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRetirementStore } from '@/stores/retirement'
import { useExpenseStore } from '@/stores/expense'

const store = useRetirementStore()
const expenseStore = useExpenseStore()

const hasExpenses = computed(() => {
  return expenseStore.expenses.length > 0
})

const isSustainable = computed(() => {
  return store.results?.yearsUntilDepletion === null
})

const depletionAge = computed(() => {
  if (!store.results || store.results.yearsUntilDepletion === null) {
    return null
  }
  return store.retirementAge + store.results.yearsUntilDepletion
})

const annualExpenses = computed(() => {
  // Calculate first year expenses (before inflation)
  return expenseStore.totalMonthlyExpenses * 12
})

const expenseRatePercent = computed(() => {
  const futureValue = store.results?.futureValue ?? 0
  if (futureValue === 0) return 0
  const rate = (annualExpenses.value / futureValue) * 100
  return rate.toFixed(2)
})

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}
</script>
