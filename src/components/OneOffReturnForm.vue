<template>
  <div class="bg-white rounded-lg shadow-md p-6 mt-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">
      One-off Returns
    </h2>

    <!-- Add One-off Return Form -->
    <div class="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
      <h3 class="text-lg font-semibold mb-4">Add One-off Return</h3>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            v-model="newReturn.date"
            type="month"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <input
            v-model.number="newReturn.amount"
            type="number"
            min="1"
            step="100"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            v-model="newReturn.description"
            type="text"
            placeholder="e.g., Annual Bonus"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <button
        @click="addReturn"
        class="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        Add One-off Return
      </button>
    </div>

    <!-- One-off Returns List -->
    <div v-if="incomeStore.oneOffReturns.length > 0">
      <h3 class="text-lg font-semibold mb-4">Scheduled One-off Returns</h3>

      <div class="space-y-3">
        <div
          v-for="oneOff in sortedReturns"
          :key="oneOff.id"
          class="p-4 border border-gray-200 rounded-md flex justify-between items-center"
        >
          <div class="flex-1">
            <h4 class="font-semibold text-gray-900">{{ oneOff.description }}</h4>
            <div class="mt-1 text-sm text-gray-600">
              <span class="font-medium">${{ oneOff.amount.toLocaleString() }}</span>
              <span class="mx-2">•</span>
              <span>{{ formatDate(oneOff.date) }}</span>
            </div>
          </div>

          <button
            @click="removeReturn(oneOff.id)"
            class="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md"
          >
            Remove
          </button>
        </div>
      </div>

      <div class="mt-4 p-3 bg-green-50 rounded-md">
        <p class="text-sm font-semibold text-green-900">
          Total One-off Returns: ${{ totalReturns.toLocaleString() }}
        </p>
      </div>
    </div>

    <div v-else class="text-center py-8 text-gray-500">
      <p>No one-off returns scheduled. Add expected bonuses, windfalls, or investment returns above.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useIncomeStore } from '@/stores/income'
import type { OneOffReturn } from '@/types'

const incomeStore = useIncomeStore()

const newReturn = ref({
  date: new Date().toISOString().slice(0, 7), // YYYY-MM format
  amount: 0,
  description: ''
})

const sortedReturns = computed(() => {
  return [...incomeStore.oneOffReturns].sort((a, b) => a.date.localeCompare(b.date))
})

const totalReturns = computed(() => {
  return incomeStore.oneOffReturns.reduce((sum, r) => sum + r.amount, 0)
})

function addReturn() {
  const oneOff: OneOffReturn = {
    id: Date.now().toString(),
    date: newReturn.value.date,
    amount: newReturn.value.amount,
    description: newReturn.value.description
  }

  incomeStore.addOneOffReturn(oneOff)

  // Reset form
  newReturn.value = {
    date: new Date().toISOString().slice(0, 7),
    amount: 0,
    description: ''
  }
}

function removeReturn(id: string) {
  incomeStore.removeOneOffReturn(id)
}

function formatDate(dateStr: string): string {
  const [year, month] = dateStr.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
</script>
