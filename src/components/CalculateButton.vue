<template>
  <div class="bg-white rounded-lg shadow-md p-4 mb-6">
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <p v-if="!store.validation.isValid" class="text-sm text-red-600">
          Please fix validation errors before calculating
        </p>
        <p v-else class="text-sm text-gray-600">
          Click calculate to see your retirement projections
        </p>
      </div>
      <button
        @click="handleCalculate"
        :disabled="!store.validation.isValid || store.isCalculating"
        class="px-6 py-3 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :class="store.validation.isValid
          ? 'bg-blue-600 hover:bg-blue-700'
          : 'bg-gray-400 cursor-not-allowed'"
      >
        <span v-if="store.isCalculating" class="flex items-center">
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Calculating...
        </span>
        <span v-else>Calculate</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRetirementStore } from '@/stores/retirement'

const store = useRetirementStore()

function handleCalculate() {
  store.calculate()
}
</script>
