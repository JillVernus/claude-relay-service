<template>
  <div class="card p-4 sm:p-6">
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h4 class="text-base font-semibold text-gray-800 dark:text-gray-200 sm:text-lg">
        账户统计数据
      </h4>
      <div class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="accountStats.length === 0" class="py-8 text-center">
      <p class="text-sm text-gray-500 sm:text-base">暂无账户使用数据</p>
    </div>
    <div v-else :class="['overflow-auto', maxHeight && `max-h-[${maxHeight}]`]">
      <table class="min-w-full">
        <thead class="sticky top-0 bg-gray-50 dark:bg-gray-700">
          <tr>
            <th
              class="px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 sm:px-4"
            >
              账户
            </th>
            <th
              class="hidden px-2 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 sm:table-cell sm:px-4"
            >
              类型
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
            v-for="stat in accountStats"
            :key="stat.accountId"
            class="hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <td class="px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100">
              <span class="block max-w-[80px] truncate sm:max-w-none" :title="stat.accountName">
                {{ stat.accountName }}
              </span>
            </td>
            <td
              class="hidden px-2 py-1.5 text-left text-xs text-gray-600 dark:text-gray-400 sm:table-cell"
            >
              <span
                :class="[
                  'inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium',
                  platformColors[stat.platform] ||
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                ]"
              >
                {{ stat.platformName || stat.platform }}
              </span>
            </td>
            <td
              class="hidden px-2 py-1.5 text-right text-xs text-gray-600 dark:text-gray-400 sm:table-cell"
            >
              {{ formatNumber(stat.requests) }}
            </td>
            <td class="px-2 py-1.5 text-right text-xs text-gray-600 dark:text-gray-400">
              {{ formatNumber(stat.allTokens) }}
            </td>
            <td class="px-2 py-1.5 text-right text-xs font-medium text-green-600">
              {{ stat.formatted ? stat.formatted.total : '$0.000000' }}
            </td>
            <td class="hidden px-2 py-1.5 text-right text-xs font-medium sm:table-cell">
              <span
                class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {{ calculatePercentage(stat.allTokens, accountStats) }}%
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
  accountStats: {
    type: Array,
    required: true,
    default: () => []
  },
  maxHeight: {
    type: String,
    default: '250px'
  }
})

// Platform badge colors
const platformColors = {
  claude: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'claude-console': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  ccr: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  openai: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'openai-responses':
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  gemini: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'gemini-api': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  droid: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
}

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
