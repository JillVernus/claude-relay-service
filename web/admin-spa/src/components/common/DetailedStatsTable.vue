<template>
  <div class="card p-4 sm:p-6">
    <h4 class="mb-4 text-base font-semibold text-gray-800 dark:text-gray-200 sm:text-lg">
      详细统计数据
    </h4>
    <div v-if="modelStats.length === 0" class="py-8 text-center">
      <p class="text-sm text-gray-500 sm:text-base">暂无模型使用数据</p>
    </div>
    <div v-else :class="['overflow-auto', maxHeight && `max-h-[${maxHeight}]`]">
      <table class="min-w-full">
        <thead class="sticky top-0 bg-gray-50 dark:bg-gray-700">
          <tr>
            <th
              class="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 sm:px-4"
            >
              模型
            </th>
            <th
              class="hidden px-2 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 sm:table-cell sm:px-4"
            >
              请求数
            </th>
            <th
              class="px-2 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 sm:px-4"
            >
              总Token
            </th>
            <th
              class="px-2 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 sm:px-4"
            >
              费用
            </th>
            <th
              class="hidden px-2 py-2 text-right text-xs font-medium text-gray-700 dark:text-gray-300 sm:table-cell sm:px-4"
            >
              占比
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-600">
          <tr
            v-for="stat in modelStats"
            :key="stat.model"
            class="hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <td class="px-2 py-2 text-xs text-gray-900 dark:text-gray-100 sm:px-4 sm:text-sm">
              <span class="block max-w-[100px] truncate sm:max-w-none" :title="stat.model">
                {{ stat.model }}
              </span>
            </td>
            <td
              class="hidden px-2 py-2 text-right text-xs text-gray-600 dark:text-gray-400 sm:table-cell sm:px-4 sm:text-sm"
            >
              {{ formatNumber(stat.requests) }}
            </td>
            <td
              class="px-2 py-2 text-right text-xs text-gray-600 dark:text-gray-400 sm:px-4 sm:text-sm"
            >
              {{ formatNumber(stat.allTokens) }}
            </td>
            <td class="px-2 py-2 text-right text-xs font-medium text-green-600 sm:px-4 sm:text-sm">
              {{ stat.formatted ? stat.formatted.total : '$0.000000' }}
            </td>
            <td
              class="hidden px-2 py-2 text-right text-xs font-medium sm:table-cell sm:px-4 sm:text-sm"
            >
              <span
                class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {{ calculatePercentage(stat.allTokens, modelStats) }}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelStats: {
    type: Array,
    required: true,
    default: () => []
  },
  maxHeight: {
    type: String,
    default: '250px'
  }
})

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
</script>
