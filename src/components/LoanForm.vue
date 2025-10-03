<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">
      Loans
    </h2>

    <!-- Add Loan Form -->
    <div class="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
      <h3 class="text-lg font-semibold mb-4">Add Loan</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Loan Name</label>
          <input
            v-model="newLoan.name"
            type="text"
            placeholder="e.g., Home Mortgage"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            v-model="newLoan.category"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="housing">Housing</option>
            <option value="auto">Auto</option>
            <option value="personal">Personal</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Principal Amount</label>
          <input
            v-model.number="newLoan.principal"
            type="number"
            min="0"
            step="1000"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Interest Rate (%)
          </label>
          <input
            v-model.number="newLoan.interestRatePercent"
            type="number"
            min="0"
            max="100"
            step="0.1"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Term (months)
          </label>
          <input
            v-model.number="newLoan.termMonths"
            type="number"
            min="1"
            max="600"
            step="1"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            v-model="newLoan.startDate"
            type="month"
            class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <button
        @click="addLoan"
        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Add Loan
      </button>

      <!-- Informational Note -->
      <div class="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-900">
        <p>
          <strong>Note:</strong> Loan payments are automatically calculated and deducted from your
          portfolio each month. The payment amount includes both principal and interest.
        </p>
      </div>
    </div>

    <!-- Loans List -->
    <div v-if="expenseStore.loans.length > 0">
      <h3 class="text-lg font-semibold mb-4">Current Loans</h3>

      <div class="space-y-3">
        <div
          v-for="loan in expenseStore.loans"
          :key="loan.id"
          class="p-4 border border-gray-200 rounded-md"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h4 class="font-semibold text-gray-900">{{ loan.name }}</h4>

              <div class="mt-2 text-sm text-gray-600">
                <p>
                  <strong>Principal:</strong> ${{ loan.principal.toLocaleString() }}
                </p>
                <p>
                  <strong>Interest Rate:</strong> {{ (loan.interestRate * 100).toFixed(2) }}%
                </p>
                <p>
                  <strong>Term:</strong> {{ loan.termMonths }} months ({{ (loan.termMonths / 12).toFixed(1) }} years)
                </p>
                <p>
                  <strong>Start Date:</strong> {{ loan.startDate }}
                </p>
                <p>
                  <strong>Monthly Payment:</strong> ${{ calculateMonthlyPayment(loan).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </p>
                <p>
                  <strong>Total Interest:</strong> ${{ calculateTotalInterest(loan).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </p>
              </div>
            </div>

            <button
              @click="removeLoan(loan.id)"
              class="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8 text-gray-500">
      <p>No loans added yet. Add your first loan above.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useExpenseStore } from '@/stores/expense'
import type { Loan } from '@/types'
import { calculateMonthlyPayment as calcPayment, calculateTotalInterest as calcInterest } from '@/utils/loanCalculations'

const expenseStore = useExpenseStore()

const newLoan = ref({
  name: '',
  category: 'other' as 'housing' | 'auto' | 'personal' | 'other',
  principal: 0,
  interestRatePercent: 5,
  termMonths: 360, // Default 30 years
  startDate: new Date().toISOString().slice(0, 7) // YYYY-MM format
})

function addLoan() {
  const loan: Omit<Loan, 'id'> = {
    name: newLoan.value.name,
    category: newLoan.value.category,
    principal: newLoan.value.principal,
    interestRate: newLoan.value.interestRatePercent / 100, // Convert % to decimal
    termMonths: newLoan.value.termMonths,
    startDate: newLoan.value.startDate
  }

  expenseStore.addLoan(loan)

  // Reset form
  newLoan.value = {
    name: '',
    category: 'other',
    principal: 0,
    interestRatePercent: 5,
    termMonths: 360,
    startDate: new Date().toISOString().slice(0, 7)
  }
}

function removeLoan(id: string) {
  expenseStore.removeLoan(id)
}

function calculateMonthlyPayment(loan: Loan): number {
  return calcPayment(loan.principal, loan.interestRate, loan.termMonths)
}

function calculateTotalInterest(loan: Loan): number {
  return calcInterest(loan)
}
</script>
