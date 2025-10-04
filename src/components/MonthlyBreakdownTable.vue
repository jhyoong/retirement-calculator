<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <div class="flex items-start justify-between mb-4">
      <h3 class="text-xl font-bold text-gray-900">
        Monthly Breakdown
      </h3>

      <div class="flex items-center space-x-4">
        <!-- Compact Mode Toggle -->
        <button
          @click="compactMode = !compactMode"
          class="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 transition-colors"
          :class="compactMode ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700'"
        >
          {{ compactMode ? 'Compact' : 'Normal' }} View
        </button>

        <!-- Column Visibility Dropdown -->
        <div class="relative">
          <button
            @click="showColumnMenu = !showColumnMenu"
            class="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <span>Columns</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Dropdown Menu -->
          <div
            v-if="showColumnMenu"
            class="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-10"
          >
            <div class="p-3 space-y-2">
              <div class="pb-2 mb-2 border-b border-gray-200">
                <label class="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    :checked="allBaseColumnsVisible"
                    @change="toggleAllBaseColumns"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  >
                  <span>Base Metrics</span>
                </label>
              </div>

              <label class="flex items-center space-x-2 text-sm text-gray-700 pl-4">
                <input
                  type="checkbox"
                  v-model="visibleColumns.income"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                >
                <span>Income</span>
              </label>

              <label class="flex items-center space-x-2 text-sm text-gray-700 pl-4">
                <input
                  type="checkbox"
                  v-model="visibleColumns.expenses"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                >
                <span>Expenses</span>
              </label>

              <label class="flex items-center space-x-2 text-sm text-gray-700 pl-4">
                <input
                  type="checkbox"
                  v-model="visibleColumns.contributions"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                >
                <span>Contributions</span>
              </label>

              <label class="flex items-center space-x-2 text-sm text-gray-700 pl-4">
                <input
                  type="checkbox"
                  v-model="visibleColumns.portfolio"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                >
                <span>Portfolio</span>
              </label>

              <label class="flex items-center space-x-2 text-sm text-gray-700 pl-4">
                <input
                  type="checkbox"
                  v-model="visibleColumns.growth"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                >
                <span>Growth</span>
              </label>

              <div v-if="cpfStore.enabled" class="pt-2 mt-2 border-t border-gray-200">
                <label class="flex items-center space-x-2 text-sm font-medium text-purple-700">
                  <input
                    type="checkbox"
                    :checked="allCPFColumnsVisible"
                    @change="toggleAllCPFColumns"
                    class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  >
                  <span>CPF Metrics</span>
                </label>
              </div>

              <label v-if="cpfStore.enabled" class="flex items-center space-x-2 text-sm text-gray-700 pl-4">
                <input
                  type="checkbox"
                  v-model="visibleColumns.cpfContrib"
                  class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                >
                <span>CPF Contrib</span>
              </label>

              <label v-if="cpfStore.enabled" class="flex items-center space-x-2 text-sm text-gray-700 pl-4">
                <input
                  type="checkbox"
                  v-model="visibleColumns.cpfOA"
                  class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                >
                <span>CPF OA</span>
              </label>

              <label v-if="cpfStore.enabled" class="flex items-center space-x-2 text-sm text-gray-700 pl-4">
                <input
                  type="checkbox"
                  v-model="visibleColumns.cpfSA"
                  class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                >
                <span>CPF SA/RA</span>
              </label>

              <label v-if="cpfStore.enabled" class="flex items-center space-x-2 text-sm text-gray-700 pl-4">
                <input
                  type="checkbox"
                  v-model="visibleColumns.cpfMA"
                  class="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                >
                <span>CPF MA</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Table Container with Scroll Indicators -->
    <div
      ref="tableContainer"
      class="relative overflow-x-auto"
      @scroll="handleScroll"
    >
      <!-- Left Shadow Indicator -->
      <div
        v-if="showLeftShadow"
        class="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-200 to-transparent pointer-events-none z-10"
      ></div>

      <!-- Right Shadow Indicator -->
      <div
        v-if="showRightShadow"
        class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-200 to-transparent pointer-events-none z-10"
      ></div>

      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <!-- Sticky Columns -->
            <th :class="[stickyColumnClass, headerClass, 'left-0 z-20']">
              Date
            </th>
            <th :class="[stickyColumnClass, headerClass, compactMode ? 'left-[80px]' : 'left-[100px]', 'z-20']">
              Age
            </th>

            <!-- Regular Columns -->
            <th v-if="visibleColumns.income" :class="[headerClass, 'text-right']">
              Income
            </th>
            <th v-if="visibleColumns.expenses" :class="[headerClass, 'text-right']">
              Expenses
            </th>
            <th v-if="visibleColumns.contributions" :class="[headerClass, 'text-right']">
              Contrib
            </th>
            <th v-if="cpfStore.enabled && visibleColumns.cpfContrib" :class="[headerClass, 'text-right', 'text-purple-600']">
              CPF Contrib
            </th>
            <th v-if="cpfStore.enabled && visibleColumns.cpfOA" :class="[headerClass, 'text-right', 'text-purple-600']">
              CPF OA
            </th>
            <th v-if="cpfStore.enabled && visibleColumns.cpfSA" :class="[headerClass, 'text-right', 'text-purple-600']">
              CPF SA/RA
            </th>
            <th v-if="cpfStore.enabled && visibleColumns.cpfMA" :class="[headerClass, 'text-right', 'text-purple-600']">
              CPF MA
            </th>
            <th v-if="visibleColumns.portfolio" :class="[headerClass, 'text-right']">
              Portfolio
            </th>
            <th v-if="visibleColumns.growth" :class="[headerClass, 'text-right']">
              Growth
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="point in monthlyData" :key="point.monthIndex" class="hover:bg-gray-50">
            <!-- Sticky Columns -->
            <td :class="[stickyColumnClass, cellClass, 'left-0 z-10']">
              {{ formatDate(point.year, point.month) }}
            </td>
            <td :class="[stickyColumnClass, cellClass, compactMode ? 'left-[80px]' : 'left-[100px]', 'z-10']">
              {{ point.age.toFixed(1) }}
            </td>

            <!-- Regular Columns -->
            <td v-if="visibleColumns.income" :class="[cellClass, 'text-right']">
              {{ formatCurrency(point.income) }}
            </td>
            <td v-if="visibleColumns.expenses" :class="[cellClass, 'text-right', 'text-red-600']">
              {{ formatCurrency(point.expenses) }}
            </td>
            <td v-if="visibleColumns.contributions" :class="[cellClass, 'text-right']">
              {{ formatCurrency(point.contributions) }}
            </td>
            <td v-if="cpfStore.enabled && visibleColumns.cpfContrib" :class="[cellClass, 'text-right', 'text-purple-700']">
              {{ formatCurrencySGD(point.cpf?.monthlyContribution.total || 0) }}
            </td>
            <td v-if="cpfStore.enabled && visibleColumns.cpfOA" :class="[cellClass, 'text-right', 'text-purple-700']">
              {{ formatCurrencySGD(point.cpf?.accounts.ordinaryAccount || 0) }}
            </td>
            <td v-if="cpfStore.enabled && visibleColumns.cpfSA" :class="[cellClass, 'text-right', 'text-purple-700']">
              {{ formatCurrencySGD((point.cpf?.accounts.specialAccount || 0) + (point.cpf?.accounts.retirementAccount || 0)) }}
            </td>
            <td v-if="cpfStore.enabled && visibleColumns.cpfMA" :class="[cellClass, 'text-right', 'text-purple-700']">
              {{ formatCurrencySGD(point.cpf?.accounts.medisaveAccount || 0) }}
            </td>
            <td v-if="visibleColumns.portfolio" :class="[cellClass, 'text-right', 'font-medium']">
              {{ formatCurrency(point.portfolioValue) }}
            </td>
            <td v-if="visibleColumns.growth" :class="[cellClass, 'text-right', 'text-green-600']">
              {{ formatCurrency(point.growth) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-4 text-sm text-gray-500">
      Showing {{ monthlyData.length }} months
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import type { MonthlyDataPoint } from '@/types'
import { useCPFStore } from '@/stores/cpf'

interface Props {
  monthlyData: MonthlyDataPoint[]
}

defineProps<Props>()
const cpfStore = useCPFStore()

// State
const compactMode = ref(false)
const showColumnMenu = ref(false)
const tableContainer = ref<HTMLElement | null>(null)
const showLeftShadow = ref(false)
const showRightShadow = ref(false)

// Column visibility state
const visibleColumns = ref({
  income: true,
  expenses: true,
  contributions: true,
  portfolio: true,
  growth: true,
  cpfContrib: true,
  cpfOA: true,
  cpfSA: true,
  cpfMA: true
})

// Computed properties for group toggles
const allBaseColumnsVisible = computed(() => {
  return visibleColumns.value.income &&
    visibleColumns.value.expenses &&
    visibleColumns.value.contributions &&
    visibleColumns.value.portfolio &&
    visibleColumns.value.growth
})

const allCPFColumnsVisible = computed(() => {
  return visibleColumns.value.cpfContrib &&
    visibleColumns.value.cpfOA &&
    visibleColumns.value.cpfSA &&
    visibleColumns.value.cpfMA
})

// Dynamic classes based on compact mode
const stickyColumnClass = computed(() => {
  return 'sticky bg-gray-50'
})

const headerClass = computed(() => {
  if (compactMode.value) {
    return 'px-2 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap'
  }
  return 'px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap'
})

const cellClass = computed(() => {
  if (compactMode.value) {
    return 'px-2 py-1 whitespace-nowrap text-xs text-gray-900'
  }
  return 'px-4 py-2 whitespace-nowrap text-sm text-gray-900'
})

// Functions
function toggleAllBaseColumns() {
  const newValue = !allBaseColumnsVisible.value
  visibleColumns.value.income = newValue
  visibleColumns.value.expenses = newValue
  visibleColumns.value.contributions = newValue
  visibleColumns.value.portfolio = newValue
  visibleColumns.value.growth = newValue
}

function toggleAllCPFColumns() {
  const newValue = !allCPFColumnsVisible.value
  visibleColumns.value.cpfContrib = newValue
  visibleColumns.value.cpfOA = newValue
  visibleColumns.value.cpfSA = newValue
  visibleColumns.value.cpfMA = newValue
}

function handleScroll() {
  if (!tableContainer.value) return

  const { scrollLeft, scrollWidth, clientWidth } = tableContainer.value

  // Show left shadow if scrolled right
  showLeftShadow.value = scrollLeft > 0

  // Show right shadow if not scrolled to the end
  showRightShadow.value = scrollLeft < scrollWidth - clientWidth - 1
}

function checkScrollIndicators() {
  nextTick(() => {
    handleScroll()
  })
}

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

function formatDate(year: number, month: number): string {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  return `${monthNames[month - 1]} ${year}`
}

// Initialize scroll indicators on mount
onMounted(() => {
  checkScrollIndicators()

  // Recheck on window resize
  window.addEventListener('resize', checkScrollIndicators)
})
</script>
