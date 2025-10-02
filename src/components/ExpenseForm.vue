<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">
      Expenses
    </h2>

    <!-- Validation Error Banner -->
    <div v-if="hasExpenseErrors" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
      <h3 class="text-sm font-semibold text-red-900 mb-2">Validation Errors:</h3>
      <ul class="list-disc list-inside text-sm text-red-800 space-y-1">
        <li v-for="(msg, idx) in expenseErrorMessages" :key="idx">{{ msg }}</li>
      </ul>
    </div>

    <!-- Add Expense Form -->
    <div class="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
      <h3 class="text-lg font-semibold mb-4">Add Expense</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            v-model="newExpense.name"
            type="text"
            placeholder="e.g., Living Expenses"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            v-model="newExpense.category"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="living">Living Expenses</option>
            <option value="healthcare">Healthcare</option>
            <option value="travel">Travel</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Monthly Amount</label>
          <input
            v-model.number="newExpense.monthlyAmount"
            type="number"
            min="0"
            step="100"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Inflation Rate (%)
          </label>
          <input
            v-model.number="newExpense.inflationRatePercent"
            type="number"
            min="0"
            max="20"
            step="0.1"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Start Age
            <span class="text-gray-500 text-xs">(optional - defaults to current age)</span>
          </label>
          <input
            v-model.number="newExpense.startAge"
            type="number"
            min="0"
            max="120"
            placeholder="e.g., 65"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            End Age
            <span class="text-gray-500 text-xs">(optional - leave blank for ongoing)</span>
          </label>
          <input
            v-model.number="newExpense.endAge"
            type="number"
            min="0"
            max="120"
            placeholder="e.g., 85"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <button
        @click="addExpense"
        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Add Expense
      </button>

      <!-- Informational Note -->
      <div class="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-900">
        <p>
          <strong>Note:</strong> Expenses reduce your portfolio balance during the accumulation
          phase. They can start at any age from your current age onwards.
        </p>
      </div>
    </div>

    <!-- Expenses List -->
    <div v-if="expenseStore.expenses.length > 0">
      <h3 class="text-lg font-semibold mb-4">Current Expenses</h3>

      <div class="space-y-3">
        <div
          v-for="expense in expenseStore.expenses"
          :key="expense.id"
          class="p-4 border border-gray-200 rounded-md flex justify-between items-start"
        >
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h4 class="font-semibold text-gray-900">{{ expense.name }}</h4>
              <span class="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                {{ formatCategory(expense.category) }}
              </span>
            </div>

            <div class="mt-2 text-sm text-gray-600">
              <p>
                <strong>Monthly Amount:</strong> ${{ expense.monthlyAmount.toLocaleString() }}
              </p>
              <p>
                <strong>Inflation Rate:</strong> {{ (expense.inflationRate * 100).toFixed(1) }}% per year
              </p>
              <p v-if="expense.startAge || expense.endAge">
                <strong>Age Range:</strong>
                <span v-if="expense.startAge">from age {{ expense.startAge }}</span>
                <span v-if="expense.startAge && expense.endAge"> to age {{ expense.endAge }}</span>
                <span v-if="!expense.startAge && expense.endAge">until age {{ expense.endAge }}</span>
                <span v-if="!expense.startAge && !expense.endAge" class="text-green-600"> (ongoing)</span>
              </p>
            </div>
          </div>

          <button
            @click="removeExpense(expense.id)"
            class="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md"
          >
            Remove
          </button>
        </div>
      </div>

      <div class="mt-4 p-3 bg-blue-50 rounded-md">
        <p class="text-sm font-semibold text-blue-900">
          Total Monthly Expenses at Retirement: ${{ expenseStore.totalMonthlyExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </p>
      </div>
    </div>

    <div v-else class="text-center py-8 text-gray-500">
      <p>No retirement expenses added yet. Add your first expense above.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useExpenseStore } from '@/stores/expense'
import { useRetirementStore } from '@/stores/retirement'
import type { RetirementExpense, ExpenseCategory } from '@/types'

const expenseStore = useExpenseStore()
const retirementStore = useRetirementStore()

// Check if there are any expense-related validation errors
const hasExpenseErrors = computed(() => {
  return retirementStore.validation.errors.some(e =>
    e.field.startsWith('expense[') || e.field.startsWith('withdrawalConfig.')
  )
})

// Get all expense-related error messages
const expenseErrorMessages = computed(() => {
  return retirementStore.validation.errors
    .filter(e => e.field.startsWith('expense[') || e.field.startsWith('withdrawalConfig.'))
    .map(e => e.message)
})

const newExpense = ref({
  name: '',
  category: 'living' as ExpenseCategory,
  monthlyAmount: 0,
  inflationRatePercent: 3, // Default 3%
  startAge: undefined as number | undefined,
  endAge: undefined as number | undefined
})

function addExpense() {
  const expense: RetirementExpense = {
    id: Date.now().toString(),
    name: newExpense.value.name,
    category: newExpense.value.category,
    monthlyAmount: newExpense.value.monthlyAmount,
    inflationRate: newExpense.value.inflationRatePercent / 100, // Convert % to decimal
    startAge: newExpense.value.startAge,
    endAge: newExpense.value.endAge
  }

  expenseStore.addExpense(expense)

  // Reset form
  newExpense.value = {
    name: '',
    category: 'living',
    monthlyAmount: 0,
    inflationRatePercent: 3,
    startAge: undefined,
    endAge: undefined
  }
}

function removeExpense(id: string) {
  expenseStore.removeExpense(id)
}

function formatCategory(category: ExpenseCategory): string {
  const categoryMap: Record<ExpenseCategory, string> = {
    living: 'Living',
    healthcare: 'Healthcare',
    travel: 'Travel',
    other: 'Other'
  }
  return categoryMap[category]
}
</script>
