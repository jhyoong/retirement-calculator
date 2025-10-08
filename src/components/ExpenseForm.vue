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
      <h3 class="text-lg font-semibold mb-4">{{ editingId ? 'Edit Expense' : 'Add Expense' }}</h3>

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
            Start Date
            <span class="text-gray-500 text-xs">(optional - defaults to current month)</span>
          </label>
          <input
            v-model="newExpense.startDate"
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
            v-model="newExpense.endDate"
            type="month"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div class="mt-4 flex gap-2">
        <button
          @click="addExpense"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {{ editingId ? 'Update Expense' : 'Add Expense' }}
        </button>
        <button
          v-if="editingId"
          @click="cancelEdit"
          class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
      </div>

      <!-- Informational Note -->
      <div class="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-900">
        <p>
          <strong>Note:</strong> Expenses reduce your portfolio balance during both accumulation
          and retirement. You can specify when expenses start and end using dates.
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
              <p v-if="expense.startDate || expense.endDate">
                <strong>Date Range:</strong>
                <span v-if="expense.startDate">from {{ expense.startDate }}</span>
                <span v-if="expense.startDate && expense.endDate"> to {{ expense.endDate }}</span>
                <span v-if="!expense.startDate && expense.endDate">until {{ expense.endDate }}</span>
                <span v-if="!expense.startDate && !expense.endDate" class="text-green-600"> (ongoing)</span>
              </p>
            </div>
          </div>

          <div class="ml-4 flex gap-2">
            <button
              @click="startEdit(expense)"
              class="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
            >
              Edit
            </button>
            <button
              @click="removeExpense(expense.id)"
              class="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md"
            >
              Remove
            </button>
          </div>
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

const editingId = ref<string | null>(null)

// Check if there are any expense-related validation errors
const hasExpenseErrors = computed(() => {
  return retirementStore.validation.errors.some(e =>
    e.field.startsWith('expense[')
  )
})

// Get all expense-related error messages
const expenseErrorMessages = computed(() => {
  return retirementStore.validation.errors
    .filter(e => e.field.startsWith('expense['))
    .map(e => e.message)
})

const newExpense = ref({
  name: '',
  category: 'living' as ExpenseCategory,
  monthlyAmount: 0,
  inflationRatePercent: 3, // Default 3%
  startDate: '' as string,
  endDate: '' as string
})

function addExpense() {
  if (editingId.value) {
    // Update existing expense
    expenseStore.updateExpense(editingId.value, {
      name: newExpense.value.name,
      category: newExpense.value.category,
      monthlyAmount: newExpense.value.monthlyAmount,
      inflationRate: newExpense.value.inflationRatePercent / 100,
      startDate: newExpense.value.startDate || undefined,
      endDate: newExpense.value.endDate || undefined
    })
    editingId.value = null
  } else {
    // Add new expense
    const expense: RetirementExpense = {
      id: Date.now().toString(),
      name: newExpense.value.name,
      category: newExpense.value.category,
      monthlyAmount: newExpense.value.monthlyAmount,
      inflationRate: newExpense.value.inflationRatePercent / 100,
      startDate: newExpense.value.startDate || undefined,
      endDate: newExpense.value.endDate || undefined
    }

    expenseStore.addExpense(expense)
  }

  // Reset form
  newExpense.value = {
    name: '',
    category: 'living',
    monthlyAmount: 0,
    inflationRatePercent: 3,
    startDate: '',
    endDate: ''
  }
}

function startEdit(expense: RetirementExpense) {
  editingId.value = expense.id
  newExpense.value = {
    name: expense.name,
    category: expense.category,
    monthlyAmount: expense.monthlyAmount,
    inflationRatePercent: expense.inflationRate * 100,
    startDate: expense.startDate || '',
    endDate: expense.endDate || ''
  }
}

function cancelEdit() {
  editingId.value = null
  newExpense.value = {
    name: '',
    category: 'living',
    monthlyAmount: 0,
    inflationRatePercent: 3,
    startDate: '',
    endDate: ''
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
