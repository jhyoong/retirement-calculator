<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8 max-w-4xl">
      <header class="mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">
          Retirement Calculator
        </h1>
        <p class="text-gray-600">
          Plan your financial future and cry
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
          <IncomeTab v-show="activeTab === 'income'" />
          <ExpenseTab v-show="activeTab === 'expenses'" />
          <CPFForm v-show="activeTab === 'cpf'" />
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
import IncomeTab from '@/components/IncomeTab.vue'
import ExpenseTab from '@/components/ExpenseTab.vue'
import CPFForm from '@/components/CPFForm.vue'
import ResultsDisplay from '@/components/ResultsDisplay.vue'
import VisualizationsTab from '@/components/VisualizationsTab.vue'
import ImportExport from '@/components/ImportExport.vue'

const tabs = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'income', label: 'Income' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'cpf', label: 'CPF' },
  { id: 'results', label: 'Results' },
  { id: 'visualizations', label: 'Visualizations' },
  { id: 'data', label: 'Import/Export' }
]

const activeTab = ref('basic')
</script>
