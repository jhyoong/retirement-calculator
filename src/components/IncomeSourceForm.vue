<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">
      Income Sources
    </h2>

    <!-- Add Income Source Form -->
    <div class="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
      <h3 class="text-lg font-semibold mb-4">Add Income Source</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            v-model="newSource.name"
            type="text"
            placeholder="e.g., Main Salary"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            v-model="newSource.type"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="salary">Salary/Wages</option>
            <option value="rental">Rental Income</option>
            <option value="dividend">Dividends</option>
            <option value="business">Business/Side Gig</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <input
            v-model.number="newSource.amount"
            type="number"
            min="0"
            step="100"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
          <select
            v-model="newSource.frequency"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom (every X days)</option>
          </select>
        </div>

        <div v-if="newSource.frequency === 'custom'">
          <label class="block text-sm font-medium text-gray-700 mb-1">Every X Days</label>
          <input
            v-model.number="newSource.customFrequencyDays"
            type="number"
            min="1"
            placeholder="e.g., 14 for bi-weekly"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            v-model="newSource.startDate"
            type="month"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            End Date
            <span class="text-gray-500 text-xs">(optional - leave blank for ongoing)</span>
          </label>
          <input
            v-model="newSource.endDate"
            type="month"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <button
        @click="addSource"
        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Add Income Source
      </button>
    </div>

    <!-- Income Sources List -->
    <div v-if="incomeStore.incomeSources.length > 0">
      <h3 class="text-lg font-semibold mb-4">Current Income Sources</h3>

      <div class="space-y-3">
        <div
          v-for="source in incomeStore.incomeSources"
          :key="source.id"
          class="p-4 border border-gray-200 rounded-md flex justify-between items-start"
        >
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h4 class="font-semibold text-gray-900">{{ source.name }}</h4>
              <span class="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                {{ formatType(source.type) }}
              </span>
            </div>

            <div class="mt-2 text-sm text-gray-600">
              <p>
                <strong>Amount:</strong> ${{ source.amount.toLocaleString() }}
                ({{ formatFrequency(source.frequency, source.customFrequencyDays) }})
              </p>
              <p>
                <strong>Period:</strong> {{ source.startDate }}
                <span v-if="source.endDate"> to {{ source.endDate }}</span>
                <span v-else class="text-green-600"> (ongoing)</span>
              </p>
              <p class="text-blue-600">
                <strong>Monthly equivalent:</strong> ${{ calculateMonthlyEquivalent(source).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </p>
            </div>
          </div>

          <button
            @click="removeSource(source.id)"
            class="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md"
          >
            Remove
          </button>
        </div>
      </div>

      <div class="mt-4 p-3 bg-blue-50 rounded-md">
        <p class="text-sm font-semibold text-blue-900">
          Total Monthly Income: ${{ incomeStore.totalMonthlyIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </p>
      </div>
    </div>

    <div v-else class="text-center py-8 text-gray-500">
      <p>No income sources added yet. Add your first income source above.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useIncomeStore } from '@/stores/income'
import type { IncomeStream, IncomeType, IncomeFrequency } from '@/types'

const incomeStore = useIncomeStore()

const newSource = ref({
  name: '',
  type: 'salary' as IncomeType,
  amount: 0,
  frequency: 'monthly' as IncomeFrequency,
  customFrequencyDays: undefined as number | undefined,
  startDate: new Date().toISOString().slice(0, 7), // YYYY-MM format
  endDate: undefined as string | undefined
})

function addSource() {
  const source: IncomeStream = {
    id: Date.now().toString(),
    name: newSource.value.name,
    type: newSource.value.type,
    amount: newSource.value.amount,
    frequency: newSource.value.frequency,
    customFrequencyDays: newSource.value.customFrequencyDays,
    startDate: newSource.value.startDate,
    endDate: newSource.value.endDate || undefined
  }

  incomeStore.addIncomeSource(source)

  // Reset form
  newSource.value = {
    name: '',
    type: 'salary',
    amount: 0,
    frequency: 'monthly',
    customFrequencyDays: undefined,
    startDate: new Date().toISOString().slice(0, 7),
    endDate: undefined
  }
}

function removeSource(id: string) {
  incomeStore.removeIncomeSource(id)
}

function formatType(type: IncomeType): string {
  const typeMap: Record<IncomeType, string> = {
    salary: 'Salary',
    rental: 'Rental',
    dividend: 'Dividend',
    business: 'Business',
    custom: 'Custom'
  }
  return typeMap[type]
}

function formatFrequency(frequency: IncomeFrequency, customDays?: number): string {
  if (frequency === 'custom' && customDays) {
    return `every ${customDays} days`
  }
  return frequency
}

function calculateMonthlyEquivalent(source: IncomeStream): number {
  return incomeStore.convertToMonthly(
    source.amount,
    source.frequency,
    source.customFrequencyDays
  )
}
</script>
