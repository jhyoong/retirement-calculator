<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">
      Withdrawal Strategy
    </h2>

    <!-- Validation Error Banner -->
    <div v-if="hasWithdrawalErrors" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
      <p class="text-sm font-semibold text-red-900 mb-1">Configuration Error:</p>
      <p class="text-sm text-red-800">{{ getError('withdrawalConfig.fixedAmount') || getError('withdrawalConfig.percentage') }}</p>
    </div>

    <p class="text-sm text-gray-600 mb-4">
      Choose how you want to withdraw from your retirement portfolio each month.
    </p>

    <!-- Strategy Selection -->
    <div class="space-y-4 mb-6">
      <div
        v-for="strategy in strategies"
        :key="strategy.value"
        class="border rounded-md p-4 cursor-pointer transition-colors"
        :class="selectedStrategy === strategy.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
        @click="selectStrategy(strategy.value)"
      >
        <div class="flex items-start">
          <input
            type="radio"
            :id="strategy.value"
            :value="strategy.value"
            v-model="selectedStrategy"
            class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
          />
          <div class="ml-3 flex-1">
            <label :for="strategy.value" class="block font-medium text-gray-900 cursor-pointer">
              {{ strategy.label }}
            </label>
            <p class="text-sm text-gray-600 mt-1">
              {{ strategy.description }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Strategy-specific Inputs -->
    <div v-if="selectedStrategy" class="border-t pt-4">
      <h3 class="text-lg font-semibold mb-4">Configure Withdrawal Amount</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Fixed Amount Input -->
        <div v-if="selectedStrategy === 'fixed' || selectedStrategy === 'combined'">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Fixed Monthly Amount ($)
          </label>
          <input
            v-model.number="fixedAmount"
            @input="updateConfig"
            type="number"
            min="0"
            step="100"
            :class="[
              'w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500',
              getError('withdrawalConfig.fixedAmount') ? 'border-red-500' : ''
            ]"
          />
          <p v-if="getError('withdrawalConfig.fixedAmount')" class="text-xs text-red-600 mt-1">
            {{ getError('withdrawalConfig.fixedAmount') }}
          </p>
        </div>

        <!-- Percentage Input -->
        <div v-if="selectedStrategy === 'percentage' || selectedStrategy === 'combined'">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Annual Withdrawal Rate (%)
          </label>
          <input
            v-model.number="percentageValue"
            @input="updateConfig"
            type="number"
            min="0"
            max="20"
            step="0.1"
            :class="[
              'w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500',
              getError('withdrawalConfig.percentage') ? 'border-red-500' : ''
            ]"
          />
          <p v-if="getError('withdrawalConfig.percentage')" class="text-xs text-red-600 mt-1">
            {{ getError('withdrawalConfig.percentage') }}
          </p>
          <p v-else class="text-xs text-gray-500 mt-1">
            Standard safe withdrawal rate is 4% per year
          </p>
        </div>
      </div>

      <!-- Info Box -->
      <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <p class="text-sm text-yellow-800">
          <strong>Note:</strong> The system will automatically ensure your withdrawal covers your monthly expenses.
          If the calculated withdrawal is less than your total expenses, the expenses amount will be used instead.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useExpenseStore } from '@/stores/expense'
import { useRetirementStore } from '@/stores/retirement'
import type { WithdrawalStrategy } from '@/types'

const expenseStore = useExpenseStore()
const retirementStore = useRetirementStore()

// Get validation errors for withdrawal config fields
function getError(field: string): string {
  const error = retirementStore.validation.errors.find(e => e.field === field)
  return error ? error.message : ''
}

// Check if there are any withdrawal config errors
const hasWithdrawalErrors = computed(() => {
  return retirementStore.validation.errors.some(e => e.field.startsWith('withdrawalConfig.'))
})

const strategies = [
  {
    value: 'fixed' as WithdrawalStrategy,
    label: 'Fixed Monthly Amount',
    description: 'Withdraw the same fixed dollar amount every month'
  },
  {
    value: 'percentage' as WithdrawalStrategy,
    label: 'Percentage of Portfolio',
    description: 'Withdraw a percentage of your current portfolio value each month'
  },
  {
    value: 'combined' as WithdrawalStrategy,
    label: 'Combined (Fixed + Percentage)',
    description: 'Withdraw a fixed amount plus a percentage of your portfolio'
  }
]

const selectedStrategy = ref<WithdrawalStrategy>(expenseStore.withdrawalConfig.strategy)
const fixedAmount = ref<number>(expenseStore.withdrawalConfig.fixedAmount ?? 0)
const percentageValue = ref<number>((expenseStore.withdrawalConfig.percentage ?? 0.04) * 100) // Convert to percentage

function selectStrategy(strategy: WithdrawalStrategy) {
  selectedStrategy.value = strategy
  updateConfig()
}

function updateConfig() {
  expenseStore.updateWithdrawalConfig({
    strategy: selectedStrategy.value,
    fixedAmount: selectedStrategy.value === 'fixed' || selectedStrategy.value === 'combined'
      ? fixedAmount.value
      : undefined,
    percentage: selectedStrategy.value === 'percentage' || selectedStrategy.value === 'combined'
      ? percentageValue.value / 100 // Convert back to decimal
      : undefined
  })
}

// Initialize from store on mount
onMounted(() => {
  const config = expenseStore.withdrawalConfig
  selectedStrategy.value = config.strategy
  fixedAmount.value = config.fixedAmount ?? 4000
  percentageValue.value = (config.percentage ?? 0.04) * 100
})
</script>
