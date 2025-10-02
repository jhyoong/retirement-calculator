<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">
      One-Time Expenses
    </h2>

    <!-- Add One-Time Expense Form -->
    <div class="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
      <h3 class="text-lg font-semibold mb-4">Add One-Time Expense</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Expense Name</label>
          <input
            v-model="newExpense.name"
            type="text"
            placeholder="e.g., Home Renovation"
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
          <label class="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <input
            v-model.number="newExpense.amount"
            type="number"
            min="0"
            step="100"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            v-model="newExpense.date"
            type="month"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <input
            v-model="newExpense.description"
            type="text"
            placeholder="Brief description of this expense"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <button
        @click="addExpense"
        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Add One-Time Expense
      </button>

      <!-- Informational Note -->
      <div class="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-900">
        <p>
          <strong>Note:</strong> One-time expenses are deducted from your portfolio in the specific
          month they occur. Examples: car purchase, home renovation, children's education fees.
        </p>
      </div>
    </div>

    <!-- One-Time Expenses List -->
    <div v-if="expenseStore.oneTimeExpenses.length > 0">
      <h3 class="text-lg font-semibold mb-4">Scheduled One-Time Expenses</h3>

      <div class="space-y-3">
        <div
          v-for="expense in sortedExpenses"
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
                <strong>Amount:</strong> ${{ expense.amount.toLocaleString() }}
              </p>
              <p>
                <strong>Date:</strong> {{ formatDate(expense.date) }}
              </p>
              <p v-if="expense.description">
                <strong>Description:</strong> {{ expense.description }}
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
          Total One-Time Expenses: ${{ totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </p>
      </div>
    </div>

    <div v-else class="text-center py-8 text-gray-500">
      <p>No one-time expenses added yet. Add your first expense above.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useExpenseStore } from '@/stores/expense'
import type { OneTimeExpense, ExpenseCategory } from '@/types'

const expenseStore = useExpenseStore()

const newExpense = ref({
  name: '',
  amount: 0,
  date: new Date().toISOString().slice(0, 7), // YYYY-MM format
  category: 'other' as ExpenseCategory,
  description: ''
})

function addExpense() {
  const expense: Omit<OneTimeExpense, 'id'> = {
    name: newExpense.value.name,
    amount: newExpense.value.amount,
    date: newExpense.value.date,
    category: newExpense.value.category,
    description: newExpense.value.description || undefined
  }

  expenseStore.addOneTimeExpense(expense)

  // Reset form
  newExpense.value = {
    name: '',
    amount: 0,
    date: new Date().toISOString().slice(0, 7),
    category: 'other',
    description: ''
  }
}

function removeExpense(id: string) {
  expenseStore.removeOneTimeExpense(id)
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

function formatDate(dateStr: string): string {
  const [year, month] = dateStr.split('-')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${monthNames[parseInt(month) - 1]} ${year}`
}

// Sort expenses by date (earliest first)
const sortedExpenses = computed(() => {
  return [...expenseStore.oneTimeExpenses].sort((a, b) => a.date.localeCompare(b.date))
})

// Calculate total amount of all one-time expenses
const totalAmount = computed(() => {
  return expenseStore.oneTimeExpenses.reduce((sum, expense) => sum + expense.amount, 0)
})
</script>
