<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h3 class="text-xl font-bold text-gray-900 mb-4">
      Monthly Breakdown
    </h3>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Age
            </th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Income
            </th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contributions
            </th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Portfolio
            </th>
            <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Growth
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <tr v-for="point in monthlyData" :key="point.monthIndex" class="hover:bg-gray-50">
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
              {{ formatDate(point.year, point.month) }}
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
              {{ point.age.toFixed(1) }}
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
              {{ formatCurrency(point.income) }}
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900">
              {{ formatCurrency(point.contributions) }}
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-right font-medium text-gray-900">
              {{ formatCurrency(point.portfolioValue) }}
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-right text-green-600">
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
import type { MonthlyDataPoint } from '@/types'

interface Props {
  monthlyData: MonthlyDataPoint[]
}

defineProps<Props>()

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
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
</script>
