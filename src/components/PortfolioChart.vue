<template>
  <div class="bg-white rounded-lg shadow-md p-4 sm:p-6">
    <h3 class="text-lg sm:text-xl font-bold text-gray-900 mb-4">
      Portfolio Growth Over Time
    </h3>

    <!-- Landscape orientation prompt for mobile portrait -->
    <div v-if="showLandscapePrompt" class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
      <p class="text-xs sm:text-sm text-amber-800 flex items-center gap-2">
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>For better viewing, rotate your device to landscape mode</span>
      </p>
    </div>

    <div class="relative h-64 sm:h-80 md:h-96">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions
} from 'chart.js'
import type { MonthlyDataPoint } from '@/types'
import { useCPFStore } from '@/stores/cpf'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface Props {
  monthlyData: MonthlyDataPoint[]
}

const props = defineProps<Props>()
const cpfStore = useCPFStore()

// Orientation detection for landscape prompt
const showLandscapePrompt = ref(false)

function checkOrientation() {
  // Show prompt if:
  // 1. Screen width is mobile-sized (< 768px for md breakpoint)
  // 2. Screen is in portrait orientation (height > width)
  const isMobile = window.innerWidth < 768
  const isPortrait = window.innerHeight > window.innerWidth
  showLandscapePrompt.value = isMobile && isPortrait
}

onMounted(() => {
  checkOrientation()
  window.addEventListener('resize', checkOrientation)
  window.addEventListener('orientationchange', checkOrientation)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkOrientation)
  window.removeEventListener('orientationchange', checkOrientation)
})

const chartData = computed(() => {
  // Create labels showing Year-Month
  const labels = props.monthlyData.map((point) => {
    const monthStr = point.month.toString().padStart(2, '0')
    return `${point.year}-${monthStr}`
  })

  const datasets = [
    {
      label: 'Portfolio Value',
      data: props.monthlyData.map((point) => point.portfolioValue),
      borderColor: 'rgb(59, 130, 246)', // blue-500
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      pointRadius: 0, // Hide points for cleaner look with many data points
      tension: 0.1
    }
  ]

  // Add CPF account datasets if CPF is enabled
  if (cpfStore.enabled) {
    datasets.push(
      {
        label: 'CPF OA',
        data: props.monthlyData.map((point) => point.cpf?.accounts.ordinaryAccount || 0),
        borderColor: 'rgb(251, 146, 60)', // orange-400
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1
      },
      {
        label: 'CPF SA',
        data: props.monthlyData.map((point) => point.cpf?.accounts.specialAccount || 0),
        borderColor: 'rgb(168, 85, 247)', // purple-500
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1
      },
      {
        label: 'CPF MA',
        data: props.monthlyData.map((point) => point.cpf?.accounts.medisaveAccount || 0),
        borderColor: 'rgb(236, 72, 153)', // pink-500
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1
      },
      {
        label: 'CPF RA',
        data: props.monthlyData.map((point) => point.cpf?.accounts.retirementAccount || 0),
        borderColor: 'rgb(14, 165, 233)', // sky-500
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1
      }
    )
  }

  return {
    labels,
    datasets
  }
})

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom'
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: (context) => {
          const value = context.parsed.y
          return `${context.dataset.label}: $${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
        }
      }
    }
  },
  scales: {
    x: {
      display: true,
      title: {
        display: true,
        text: 'Time'
      },
      ticks: {
        maxTicksLimit: 12, // Show roughly one label per year
        autoSkip: true
      }
    },
    y: {
      display: true,
      title: {
        display: true,
        text: 'Portfolio Value ($)'
      },
      ticks: {
        callback: (value) => {
          return '$' + (value as number).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        }
      }
    }
  }
}
</script>
