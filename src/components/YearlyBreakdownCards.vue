<template>
  <div class="space-y-2">
    <div
      v-for="y in years"
      :key="y.year"
      class="border border-gray-200 rounded-lg overflow-hidden bg-white"
    >
      <!-- Compact year row -->
      <button
        type="button"
        @click="toggleYear(y.year)"
        :aria-expanded="openYears.has(y.year)"
        class="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left"
        :class="openYears.has(y.year) ? 'bg-blue-50' : 'hover:bg-gray-50'"
      >
        <div class="min-w-0">
          <div class="text-sm font-semibold text-gray-900">
            {{ y.year }} · Age {{ Math.floor(y.startAge) }}
            <span v-if="y.months.length < 12" class="font-normal text-gray-500">({{ y.months.length }} mo)</span>
          </div>
          <div class="text-xs text-gray-500 truncate">
            In {{ formatShort(y.income) }} · Out {{ formatShort(y.expenses + y.incomeTax) }} · Growth {{ formatShort(y.growth) }}
          </div>
        </div>
        <div class="text-right shrink-0">
          <div class="text-sm font-semibold text-gray-900">{{ formatCurrency(y.endValue) }}</div>
          <div class="text-xs" :class="change(y) >= 0 ? 'text-green-600' : 'text-red-600'">
            {{ change(y) >= 0 ? '+' : '−' }}{{ formatCurrency(Math.abs(change(y))) }}
          </div>
        </div>
      </button>

      <!-- Statement -->
      <div v-if="openYears.has(y.year)">
        <div class="px-3 pt-2 pb-3 text-sm space-y-1">
          <div class="flex justify-between">
            <span>{{ y.months.length < 12 ? 'Start' : 'Start of year' }}</span>
            <span>{{ formatCurrency(y.startValue) }}</span>
          </div>
          <div class="flex justify-between">
            <span>+ Income</span>
            <span>{{ formatCurrency(y.income) }}</span>
          </div>
          <div class="flex justify-between">
            <span>− Expenses</span>
            <span class="text-red-600">{{ formatCurrency(y.expenses) }}</span>
          </div>
          <div class="flex justify-between">
            <span>− Income tax</span>
            <span class="text-red-600">{{ formatCurrency(y.incomeTax) }}</span>
          </div>
          <div class="flex justify-between">
            <span>+ Investment growth</span>
            <span class="text-green-600">{{ formatCurrency(y.growth) }}</span>
          </div>
          <div class="flex justify-between border-t border-gray-200 pt-1.5 mt-1 font-semibold">
            <span>End of year</span>
            <span>{{ formatCurrency(y.endValue) }}</span>
          </div>

          <div v-if="y.cpf" class="mt-2 p-2 bg-purple-50 rounded-md text-xs space-y-0.5">
            <div class="font-medium text-purple-700">CPF at end of year</div>
            <div class="flex justify-between">
              <span>Contributions this year</span>
              <span class="text-purple-700">{{ formatCurrencySGD(y.cpf.contributions) }}</span>
            </div>
            <div class="flex justify-between">
              <span>OA</span>
              <span class="text-purple-700">{{ formatCurrencySGD(y.cpf.oa) }}</span>
            </div>
            <div class="flex justify-between">
              <span>SA/RA</span>
              <span class="text-purple-700">{{ formatCurrencySGD(y.cpf.saRa) }}</span>
            </div>
            <div class="flex justify-between">
              <span>MA</span>
              <span class="text-purple-700">{{ formatCurrencySGD(y.cpf.ma) }}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          @click="toggleMonths(y.year)"
          class="w-full py-2 text-xs text-blue-600 border-t border-gray-200 hover:bg-gray-50"
        >
          {{ openMonths.has(y.year) ? 'Hide months ▴' : `Show ${y.months.length} months ▾` }}
        </button>

        <div v-if="openMonths.has(y.year)" class="bg-gray-50 border-t border-gray-200 px-3 py-1">
          <div
            v-for="m in y.months"
            :key="m.monthIndex"
            class="py-1.5 border-b border-dashed border-gray-200 last:border-b-0"
          >
            <div class="flex justify-between text-sm font-medium text-gray-900">
              <span>{{ monthNames[m.month - 1] }}</span>
              <span>{{ formatCurrency(m.portfolioValue) }}</span>
            </div>
            <div class="text-xs text-gray-500">
              +{{ formatNumber(m.income) }} in · −{{ formatNumber(m.expenses) }} out · −{{ formatNumber(m.incomeTax ?? 0) }} tax · {{ m.growth >= 0 ? '+' : '−' }}{{ formatNumber(Math.abs(m.growth)) }} growth
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MonthlyDataPoint } from '@/types'
import { groupByYear, type YearlySummary } from '@/utils/yearlySummary'

const props = defineProps<{
  monthlyData: MonthlyDataPoint[]
}>()

const years = computed(() => groupByYear(props.monthlyData))
const openYears = ref(new Set<number>())
const openMonths = ref(new Set<number>())

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toggle(set: Set<number>, year: number) {
  if (set.has(year)) {
    set.delete(year)
  } else {
    set.add(year)
  }
}

function toggleYear(year: number) {
  toggle(openYears.value, year)
}

function toggleMonths(year: number) {
  toggle(openMonths.value, year)
}

function change(y: YearlySummary): number {
  return y.endValue - y.startValue
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

function formatShort(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}
</script>
