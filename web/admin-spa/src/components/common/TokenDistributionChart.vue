<template>
  <div class="card p-4 sm:p-6">
    <h4 class="mb-4 text-base font-semibold text-gray-800 dark:text-gray-200 sm:text-lg">
      Token使用分布
    </h4>
    <div v-if="modelStats.length === 0" class="flex items-center justify-center py-8">
      <p class="text-sm text-gray-500 sm:text-base">暂无模型使用数据</p>
    </div>
    <div v-else class="relative" :style="{ height }">
      <canvas ref="chartCanvas" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/theme'
import Chart from 'chart.js/auto'

const props = defineProps({
  modelStats: {
    type: Array,
    required: true,
    default: () => []
  },
  height: {
    type: String,
    default: '250px'
  }
})

const themeStore = useThemeStore()
const { isDarkMode } = storeToRefs(themeStore)

const chartCanvas = ref(null)
let chartInstance = null

// Chart colors configuration (theme-aware)
const chartColors = computed(() => ({
  legend: isDarkMode.value ? '#e5e7eb' : '#374151'
}))

// Format number with K/M suffix
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K'
  }
  return num.toString()
}

// Calculate percentage
function calculatePercentage(value, stats) {
  if (!stats || stats.length === 0) return 0
  const total = stats.reduce((sum, stat) => sum + stat.allTokens, 0)
  if (total === 0) return 0
  return ((value / total) * 100).toFixed(1)
}

// Create or update chart
function createChart() {
  if (!chartCanvas.value) return
  if (props.modelStats.length === 0) return

  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }

  const data = props.modelStats
  const chartData = {
    labels: data.map((d) => d.model),
    datasets: [
      {
        data: data.map((d) => d.allTokens),
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
          '#EC4899',
          '#14B8A6',
          '#F97316',
          '#6366F1',
          '#84CC16'
        ],
        borderWidth: 0
      }
    ]
  }

  chartInstance = new Chart(chartCanvas.value, {
    type: 'doughnut',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            usePointStyle: true,
            font: {
              size: 12
            },
            color: chartColors.value.legend
          }
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || ''
              const value = formatNumber(context.parsed)
              const percentage = calculatePercentage(context.parsed, data)
              return `${label}: ${value} (${percentage}%)`
            }
          }
        }
      }
    }
  })
}

// Watch for data changes
watch(
  () => props.modelStats,
  async () => {
    // Wait for DOM to update (canvas might not be rendered yet due to v-else)
    await nextTick()
    createChart()
  },
  { deep: true }
)

// Watch for theme changes
watch(isDarkMode, () => {
  createChart()
})

onMounted(async () => {
  // Wait for DOM to be fully ready
  await nextTick()
  createChart()
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})
</script>
