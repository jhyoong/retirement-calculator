<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <header class="mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">
          Retirement Calculator
        </h1>
        <p class="text-gray-600">
          Plan your financial future with confidence
        </p>
      </header>

      <main>
        <!-- Tab Navigation -->
        <div class="mb-6">
          <nav class="flex space-x-1 bg-gray-200 p-1 rounded-lg" role="tablist">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              ]"
              :aria-selected="activeTab === tab.id"
              role="tab"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="space-y-6">
          <RetirementForm v-show="activeTab === 'basic'" />
          <IncomeSourceForm v-show="activeTab === 'income'" />
          <OneOffReturnForm v-show="activeTab === 'oneoff'" />

          <!-- Phase 4: Retirement Expenses Tab -->
          <ExpenseForm v-show="activeTab === 'expenses'" />

          <!-- Phase 5: Loans Tab -->
          <LoanForm v-show="activeTab === 'loans'" />

          <!-- Phase 5: One-Time Expenses Tab -->
          <OneTimeExpenseForm v-show="activeTab === 'onetimeexpenses'" />

          <ResultsDisplay v-show="activeTab === 'results'" />
          <VisualizationsTab v-show="activeTab === 'visualizations'" />
          <ImportExport v-show="activeTab === 'data'" />
        </div>
      </main>

      <footer class="mt-12 text-center text-sm text-gray-500">
        <p>How to retire? - JH</p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import RetirementForm from '@/components/RetirementForm.vue'
import IncomeSourceForm from '@/components/IncomeSourceForm.vue'
import OneOffReturnForm from '@/components/OneOffReturnForm.vue'
import ExpenseForm from '@/components/ExpenseForm.vue'
import LoanForm from '@/components/LoanForm.vue'
import OneTimeExpenseForm from '@/components/OneTimeExpenseForm.vue'
import ResultsDisplay from '@/components/ResultsDisplay.vue'
import VisualizationsTab from '@/components/VisualizationsTab.vue'
import ImportExport from '@/components/ImportExport.vue'

const tabs = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'income', label: 'Income Sources' },
  { id: 'oneoff', label: 'One-Off Returns' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'loans', label: 'Loans' },
  { id: 'onetimeexpenses', label: 'One-Time Expenses' },
  { id: 'results', label: 'Results' },
  { id: 'visualizations', label: 'Visualizations' },
  { id: 'data', label: 'Import/Export' }
]

const activeTab = ref('basic')
</script>
