<template>
  <div class="min-h-screen bg-gray-50">
    <div
      class="container mx-auto px-2 sm:px-4 py-4 sm:py-8 transition-all duration-300"
      :class="activeTab === 'visualizations' ? 'max-w-[95%]' : 'max-w-4xl'"
    >
      <header class="mb-4 sm:mb-8">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">
              Retirement Calculator
            </h1>
            <p class="text-sm sm:text-base text-gray-600">
              Plan your financial future and cry
            </p>
          </div>
          <ImportExportHeader />
        </div>
      </header>

      <main>
        <!-- Tab Navigation -->
        <div class="mb-4 sm:mb-6">
          <nav class="flex overflow-x-auto space-x-1 bg-gray-200 p-1 rounded-lg scrollbar-hide" role="tablist">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'flex-shrink-0 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
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

        <!-- Calculate Button -->
        <CalculateButton />

        <!-- Tab Content -->
        <div class="space-y-6">
          <RetirementForm v-show="activeTab === 'basic'" />
          <IncomeTab v-show="activeTab === 'income'" />
          <ExpenseTab v-show="activeTab === 'expenses'" />
          <CPFForm v-show="activeTab === 'cpf'" />
          <ResultsDisplay v-show="activeTab === 'results'" />
          <VisualizationsTab v-show="activeTab === 'visualizations'" />
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
import ImportExportHeader from '@/components/ImportExportHeader.vue'
import CalculateButton from '@/components/CalculateButton.vue'

const tabs = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'income', label: 'Income' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'cpf', label: 'CPF' },
  { id: 'results', label: 'Results' },
  { id: 'visualizations', label: 'Visualizations' }
]

const activeTab = ref('basic')
</script>
