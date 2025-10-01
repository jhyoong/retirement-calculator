<template>
  <div class="bg-white rounded-lg shadow-md p-6">
    <h3 class="text-xl font-bold text-gray-900 mb-4">
      Portfolio Growth Over Time
    </h3>
    <div class="relative h-96">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

const chartData = computed(() => {
  // Create labels showing Year-Month
  const labels = props.monthlyData.map((point) => {
    const monthStr = point.month.toString().padStart(2, '0')
    return `${point.year}-${monthStr}`
  })

  return {
    labels,
    datasets: [
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
  }
})

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: (context) => {
          const value = context.parsed.y
          return `Portfolio: $${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
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
