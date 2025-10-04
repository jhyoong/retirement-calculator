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
          <li>Income tab for income-related errors</li>
          <li>Expenses tab for expense and withdrawal errors</li>
          <li>CPF tab for CPF account errors</li>
        </ul>
      </div>
    </div>

    <div v-else-if="!store.results" class="text-center py-8">
      <p class="text-gray-500">
        Click the Calculate button to see your retirement projections.
      </p>
    </div>

    <div v-else class="space-y-4">
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

      <!-- Retirement Age Summary (with CPF distinction if enabled) -->
      <div v-if="cpfStore.enabled" class="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-amber-900 mb-3">
          Retirement Age Summary
        </h3>
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-sm text-amber-700 font-medium">Your Target Retirement Age:</span>
            <span class="text-2xl font-bold text-amber-900">{{ store.retirementAge }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-amber-700 font-medium">CPF LIFE Payout Start Age:</span>
            <span class="text-2xl font-bold text-amber-900">{{ cpfStore.cpfLifePayoutAge || 65 }}</span>
          </div>
          <div v-if="ageGap > 0" class="mt-3 pt-3 border-t border-amber-300">
            <p class="text-sm text-amber-800">
              <strong>Note:</strong> There is a {{ ageGap }}-year gap between your retirement and CPF LIFE payouts. Ensure you have other income sources during this period.
            </p>
          </div>
          <div v-else-if="ageGap < 0" class="mt-3 pt-3 border-t border-amber-300">
            <p class="text-sm text-amber-800">
              <strong>Note:</strong> You plan to work {{ Math.abs(ageGap) }} year(s) past the CPF LIFE payout start age.
            </p>
          </div>
        </div>
      </div>

      <!-- Phase 6: CPF Summary - Current Balances -->
      <div v-if="cpfStore.enabled && !cpfAtRetirement" class="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-purple-900 mb-3">
          CPF Current Balances
        </h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-sm text-purple-700 font-medium">Current Total CPF Balance:</span>
            <span class="text-xl font-bold text-purple-900">{{ formatCurrencySGD(totalCPFBalance) }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-purple-700 font-medium">Retirement Sum Target:</span>
            <span class="text-base font-semibold text-purple-900">{{ formatRetirementSumTarget(cpfStore.retirementSumTarget) }}</span>
          </div>
        </div>
        <div class="mt-3 pt-3 border-t border-purple-200">
          <div class="grid grid-cols-2 gap-2 text-xs text-purple-700">
            <div>
              <span class="font-medium">OA:</span> {{ formatCurrencySGD(cpfStore.currentBalances.ordinaryAccount) }}
            </div>
            <div>
              <span class="font-medium">SA:</span> {{ formatCurrencySGD(cpfStore.currentBalances.specialAccount) }}
            </div>
            <div>
              <span class="font-medium">MA:</span> {{ formatCurrencySGD(cpfStore.currentBalances.medisaveAccount) }}
            </div>
            <div>
              <span class="font-medium">RA:</span> {{ formatCurrencySGD(cpfStore.currentBalances.retirementAccount) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Phase 6: CPF Projection at Retirement -->
      <div v-if="cpfStore.enabled && cpfAtRetirement" class="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-purple-900 mb-3">
          CPF at Retirement
        </h3>

        <div class="space-y-3">
          <!-- Total CPF -->
          <div class="flex justify-between items-center">
            <span class="text-sm text-purple-700 font-medium">Total CPF Balance at Retirement:</span>
            <span class="text-2xl font-bold text-purple-900">{{ formatCurrencySGD(cpfAtRetirement.totalCPF) }}</span>
          </div>

          <!-- Account Breakdown -->
          <div class="mt-3 pt-3 border-t border-purple-200">
            <p class="text-xs text-purple-600 mb-2 font-medium">Account Balances:</p>
            <div class="grid grid-cols-2 gap-2 text-sm text-purple-700">
              <div>
                <span class="font-medium">OA:</span> {{ formatCurrencySGD(cpfAtRetirement.accounts.ordinaryAccount) }}
              </div>
              <div v-if="!cpfAtRetirement.age55Completed">
                <span class="font-medium">SA:</span> {{ formatCurrencySGD(cpfAtRetirement.accounts.specialAccount) }}
              </div>
              <div v-if="cpfAtRetirement.age55Completed">
                <span class="font-medium">RA:</span> {{ formatCurrencySGD(cpfAtRetirement.accounts.retirementAccount) }}
              </div>
              <div>
                <span class="font-medium">MA:</span> {{ formatCurrencySGD(cpfAtRetirement.accounts.medisaveAccount) }}
              </div>
            </div>
          </div>

          <!-- Contributions & Interest -->
          <div class="mt-3 pt-3 border-t border-purple-200">
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="bg-white rounded p-2">
                <p class="text-xs text-purple-600">Total Contributions</p>
                <p class="text-lg font-bold text-purple-900">{{ formatCurrencySGD(cpfAtRetirement.totalContributions) }}</p>
              </div>
              <div class="bg-white rounded p-2">
                <p class="text-xs text-purple-600">Total Interest Earned</p>
                <p class="text-lg font-bold text-green-700">{{ formatCurrencySGD(cpfAtRetirement.totalInterest) }}</p>
              </div>
            </div>
          </div>

          <!-- Age 55 Transition Status -->
          <div v-if="cpfAtRetirement.age55Completed" class="mt-3 pt-3 border-t border-purple-200">
            <div class="flex items-center text-sm text-purple-700">
              <svg class="w-4 h-4 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
              <span>Age 55 transition completed - SA transferred to RA</span>
            </div>
          </div>

          <!-- Retirement Sum Target Info -->
          <div class="mt-3 pt-3 border-t border-purple-200">
            <p class="text-xs text-purple-600 mb-1">Retirement Sum Target:</p>
            <p class="text-sm font-semibold text-purple-900">{{ formatRetirementSumTarget(cpfStore.retirementSumTarget) }}</p>
          </div>
        </div>
      </div>

      <!-- Phase 6: CPF Life Estimates -->
      <div v-if="cpfLifeEstimates" class="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-indigo-900 mb-3">
          CPF Life Estimates
        </h3>
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-sm text-indigo-700 font-medium">RA Balance at Retirement:</span>
            <span class="text-xl font-bold text-indigo-900">{{ formatCurrencySGD(cpfLifeEstimates.raBalance) }}</span>
          </div>

          <div class="flex justify-between items-center bg-white rounded p-3">
            <span class="text-sm text-indigo-700 font-medium">Estimated Monthly Payout:</span>
            <span class="text-2xl font-bold text-green-600">{{ formatCurrencySGD(cpfLifeEstimates.monthlyPayout) }}</span>
          </div>

          <div class="mt-3 pt-3 border-t border-indigo-200">
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p class="text-xs text-indigo-600 mb-1">CPF Life Plan:</p>
                <p class="font-semibold text-indigo-900">{{ formatCPFLifePlan(cpfLifeEstimates.cpfLifePlan) }}</p>
              </div>
              <div>
                <p class="text-xs text-indigo-600 mb-1">Payout Start Age:</p>
                <p class="font-semibold text-indigo-900">{{ cpfLifeEstimates.payoutAge }}</p>
              </div>
            </div>
          </div>

          <div class="mt-2 text-xs text-indigo-600 bg-white rounded p-2">
            <p>Payouts are for life and guaranteed by the Singapore Government. Estimates based on 2025 CPF Life rates.</p>
          </div>
        </div>
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
import { computed } from 'vue'
import { useRetirementStore } from '@/stores/retirement'
import { useExpenseStore } from '@/stores/expense'
import { useCPFStore } from '@/stores/cpf'
import SustainabilityDisplay from './SustainabilityDisplay.vue'
import { estimateCPFLifePayout } from '@/utils/cpfLife'

const store = useRetirementStore()
const expenseStore = useExpenseStore()
const cpfStore = useCPFStore()

const totalCPFBalance = computed(() => {
  const balances = cpfStore.currentBalances
  return balances.ordinaryAccount +
         balances.specialAccount +
         balances.medisaveAccount +
         balances.retirementAccount
})

// Computed property for age gap between retirement and CPF Life payout
const ageGap = computed(() => {
  if (!cpfStore.enabled) return 0
  const cpfLifeAge = cpfStore.cpfLifePayoutAge || 65
  return cpfLifeAge - store.retirementAge
})

// Computed property for CPF Life estimates
const cpfLifeEstimates = computed(() => {
  if (!cpfStore.enabled || !store.validation.isValid || !cpfAtRetirement.value) {
    return null
  }

  const raBalance = cpfAtRetirement.value.accounts.retirementAccount
  if (raBalance <= 0) {
    return null
  }

  const cpfLifePlan = cpfStore.cpfLifePlan
  const payoutAge = cpfStore.cpfLifePayoutAge || 65
  const monthlyPayout = estimateCPFLifePayout(raBalance, cpfLifePlan, payoutAge)

  return {
    raBalance,
    monthlyPayout,
    cpfLifePlan,
    payoutAge
  }
})

// Computed property to get CPF projection at retirement from cached projections
const cpfAtRetirement = computed(() => {
  if (!cpfStore.enabled || !store.validation.isValid || store.monthlyProjections.length === 0) {
    return null
  }

  try {
    const projections = store.monthlyProjections

    // Get last projection (at retirement)
    const lastMonth = projections[projections.length - 1]
    if (!lastMonth.cpf) {
      return null
    }

    // Calculate total contributions and interest
    let totalContributions = 0
    let totalInterest = 0

    projections.forEach(p => {
      if (p.cpf) {
        totalContributions += p.cpf.monthlyContribution.total
        totalInterest += p.cpf.monthlyInterest.total
      }
    })

    const totalCPF = lastMonth.cpf.accounts.ordinaryAccount +
                     lastMonth.cpf.accounts.specialAccount +
                     lastMonth.cpf.accounts.medisaveAccount +
                     lastMonth.cpf.accounts.retirementAccount

    const age55Completed = lastMonth.cpf.accounts.specialAccount === 0 &&
                          lastMonth.cpf.accounts.retirementAccount > 0

    return {
      accounts: lastMonth.cpf.accounts,
      totalCPF,
      totalContributions,
      totalInterest,
      age55Completed
    }
  } catch (error) {
    console.error('Error reading CPF projections:', error)
    return null
  }
})

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function formatCurrencySGD(value: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function formatRetirementSumTarget(target: 'basic' | 'full' | 'enhanced'): string {
  const targetMap = {
    basic: 'Basic (BRS) - $106,500',
    full: 'Full (FRS) - $213,000',
    enhanced: 'Enhanced (ERS) - $426,000'
  }
  return targetMap[target]
}

function formatCPFLifePlan(plan: 'standard' | 'basic' | 'escalating'): string {
  const planMap = {
    standard: 'Standard Plan',
    basic: 'Basic Plan',
    escalating: 'Escalating Plan'
  }
  return planMap[plan] || 'Standard Plan'
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
