<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">
      CPF Accounts
    </h2>

    <!-- Enable CPF Toggle -->
    <div class="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
      <label class="flex items-center cursor-pointer">
        <input
          type="checkbox"
          v-model="cpfStore.enabled"
          class="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <span class="ml-3 text-lg font-medium text-gray-900">
          Enable CPF Integration
        </span>
      </label>
      <p class="mt-2 text-sm text-gray-600">
        Track your Central Provident Fund accounts and calculate contributions from salary income.
      </p>
    </div>

    <div v-if="cpfStore.enabled" class="space-y-6">
      <!-- Current Account Balances -->
      <div class="p-4 border border-gray-200 rounded-md">
        <h3 class="text-lg font-semibold mb-4">Current Account Balances</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Ordinary Account (OA) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Ordinary Account (OA)
            </label>
            <input
              v-model.number="cpfStore.currentBalances.ordinaryAccount"
              type="number"
              min="0"
              step="1000"
              class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p class="mt-1 text-xs text-gray-500">
              For housing, education, investments
            </p>
          </div>

          <!-- Special Account (SA) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Special Account (SA)
            </label>
            <input
              v-model.number="cpfStore.currentBalances.specialAccount"
              type="number"
              min="0"
              step="1000"
              :disabled="retirementStore.currentAge >= 55"
              class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p class="mt-1 text-xs text-gray-500">
              For retirement (closes at age 55)
            </p>
            <p v-if="retirementStore.currentAge >= 55" class="mt-1 text-xs text-amber-600">
              SA closes at age 55. Balance transferred to RA.
            </p>
          </div>

          <!-- MediSave Account (MA) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              MediSave Account (MA)
            </label>
            <input
              v-model.number="cpfStore.currentBalances.medisaveAccount"
              type="number"
              min="0"
              step="1000"
              class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p class="mt-1 text-xs text-gray-500">
              For healthcare expenses
            </p>
          </div>

          <!-- Retirement Account (RA) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Retirement Account (RA)
            </label>
            <input
              v-model.number="cpfStore.currentBalances.retirementAccount"
              type="number"
              min="0"
              step="1000"
              :disabled="retirementStore.currentAge < 55"
              class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p class="mt-1 text-xs text-gray-500">
              Created at age 55 for retirement
            </p>
            <p v-if="retirementStore.currentAge < 55" class="mt-1 text-xs text-amber-600">
              RA only available from age 55 onwards.
            </p>
          </div>
        </div>

        <!-- Total CPF Balance Display -->
        <div class="mt-4 p-3 bg-blue-50 rounded-md">
          <p class="text-sm font-semibold text-blue-900">
            Total CPF Balance: {{ formatCurrency(totalCPFBalance) }}
          </p>
        </div>
      </div>

      <!-- Retirement Sum Target -->
      <div class="p-4 border border-gray-200 rounded-md">
        <h3 class="text-lg font-semibold mb-4">Retirement Sum Target</h3>

        <label class="block text-sm font-medium text-gray-700 mb-2">
          Select your retirement sum goal (for age 55)
        </label>

        <select
          v-model="cpfStore.retirementSumTarget"
          class="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="basic">Basic Retirement Sum (BRS) - $106,500</option>
          <option value="full">Full Retirement Sum (FRS) - $213,000</option>
          <option value="enhanced">Enhanced Retirement Sum (ERS) - $426,000</option>
        </select>

        <div class="mt-3 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
          <p class="font-medium mb-1">About Retirement Sums:</p>
          <ul class="list-disc list-inside space-y-1 text-xs">
            <li><strong>BRS:</strong> Minimum required if you pledge your property</li>
            <li><strong>FRS:</strong> Standard retirement sum for most members</li>
            <li><strong>ERS:</strong> Double the FRS for higher CPF Life payouts</li>
          </ul>
        </div>
      </div>

      <!-- CPF Life Plan -->
      <div class="p-4 border border-gray-200 rounded-md">
        <h3 class="text-lg font-semibold mb-4">CPF Life Plan</h3>

        <label class="block text-sm font-medium text-gray-700 mb-2">
          Select your CPF Life plan (for age 65 payouts)
        </label>

        <div class="space-y-3">
          <label class="flex items-start p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
            :class="{ 'border-blue-500 bg-blue-50': cpfStore.cpfLifePlan === 'standard' }">
            <input
              type="radio"
              value="standard"
              v-model="cpfStore.cpfLifePlan"
              class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <div class="ml-3">
              <span class="block text-sm font-semibold text-gray-900">Standard Plan</span>
              <span class="block text-xs text-gray-600">Stable monthly payouts throughout retirement</span>
            </div>
          </label>

          <label class="flex items-start p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
            :class="{ 'border-blue-500 bg-blue-50': cpfStore.cpfLifePlan === 'basic' }">
            <input
              type="radio"
              value="basic"
              v-model="cpfStore.cpfLifePlan"
              class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <div class="ml-3">
              <span class="block text-sm font-semibold text-gray-900">Basic Plan</span>
              <span class="block text-xs text-gray-600">~15% higher initial payouts, no annual increases</span>
            </div>
          </label>

          <label class="flex items-start p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
            :class="{ 'border-blue-500 bg-blue-50': cpfStore.cpfLifePlan === 'escalating' }">
            <input
              type="radio"
              value="escalating"
              v-model="cpfStore.cpfLifePlan"
              class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <div class="ml-3">
              <span class="block text-sm font-semibold text-gray-900">Escalating Plan</span>
              <span class="block text-xs text-gray-600">Lower initial payouts, increases 2% annually for inflation protection</span>
            </div>
          </label>
        </div>

        <div class="mt-3 p-3 bg-gray-50 rounded-md text-xs text-gray-700">
          <p><strong>Note:</strong> CPF Life payouts begin at age 65 and are guaranteed for life by the Singapore Government.</p>
        </div>
      </div>

      <!-- Information Box -->
      <div class="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p class="text-sm text-blue-900 mb-2">
          <strong>How CPF Integration Works:</strong>
        </p>
        <ul class="list-disc list-inside text-sm text-blue-800 space-y-1">
          <li>Mark income sources as CPF-eligible in the Income tab to calculate contributions</li>
          <li>Monthly interest is calculated and applied to all accounts automatically</li>
          <li>Age 55 transition (SA closes, RA opens) is handled when you reach retirement age</li>
          <li>OA can be used for housing loan payments automatically</li>
          <li>View your projected CPF balance at retirement in the Results tab</li>
        </ul>
      </div>
    </div>

    <!-- Disabled State Message -->
    <div v-else class="text-center py-8 text-gray-500">
      <p>Enable CPF integration to track your CPF accounts and contributions.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCPFStore } from '@/stores/cpf'
import { useRetirementStore } from '@/stores/retirement'

const cpfStore = useCPFStore()
const retirementStore = useRetirementStore()

const totalCPFBalance = computed(() => {
  const balances = cpfStore.currentBalances
  return balances.ordinaryAccount +
         balances.specialAccount +
         balances.medisaveAccount +
         balances.retirementAccount
})

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}
</script>
