<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-50">
          请求日志
          <span class="text-sm font-normal text-gray-500 dark:text-gray-400"
            >(ver.{{ APP_CONFIG.requestLogVersion }})</span
          >
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          仅展示 API Key 请求，自动刷新（{{ refreshInterval / 1000 }}s），最新请求在最上方
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="loading" class="text-xs text-gray-500 dark:text-gray-400">同步中...</span>
        <button
          class="bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 dark:bg-primary-500 dark:hover:bg-primary-400 rounded-lg px-3 py-2 text-sm font-semibold text-white shadow focus:outline-none focus:ring-2"
          @click="manualRefresh"
        >
          手动刷新
        </button>
      </div>
    </div>

    <!-- Statistics Section -->
    <div class="space-y-4">
      <div class="flex items-center justify-end gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span v-if="statsCountdown > 0">{{ statsCountdown }}秒后刷新统计</span>
        <span v-else-if="statsLoading">统计加载中...</span>
      </div>

      <!-- Charts Grid -->
      <div class="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <TokenDistributionChart height="175px" :model-stats="requestLogsModelStats" />
        <DetailedStatsTable :model-stats="requestLogsModelStats">
          <template #actions>
            <el-select
              v-model="selectedApiKeyId"
              clearable
              placeholder="全部 API Keys"
              size="small"
              style="min-width: 220px"
              @change="onApiKeyFilterChange"
            >
              <el-option label="全部 API Keys" value="" />
              <el-option
                v-for="option in apiKeyOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </template>
        </DetailedStatsTable>
      </div>
    </div>

    <div class="overflow-hidden rounded-2xl bg-white shadow dark:bg-gray-900">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead class="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th
                v-for="header in headers"
                :key="header"
                class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                {{ header }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="row in sortedRows"
              :key="row.requestId"
              :class="['hover:bg-gray-50/70 dark:hover:bg-gray-800/50', getFlashClass(row)]"
            >
              <td class="px-4 py-3 text-xs text-gray-900 dark:text-gray-100">
                <template
                  v-for="time in [formatTimeParts(row.timestamp)]"
                  :key="time.date || time.fallback || row.requestId"
                >
                  <div v-if="time.valid" class="flex flex-col leading-tight">
                    <span>{{ time.date }}</span>
                    <span class="text-gray-500 dark:text-gray-400">{{ time.time }}</span>
                  </div>
                  <span v-else>{{ time.fallback || '—' }}</span>
                </template>
              </td>
              <td class="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-100">
                {{ row.requestId }}
              </td>
              <td class="px-4 py-3 text-xs text-gray-800 dark:text-gray-200">
                {{ row.endpoint }}
              </td>
              <td class="px-4 py-3 text-xs text-gray-700 dark:text-gray-200">
                {{ row.apiKeyName || row.apiKeyId || '—' }}
              </td>
              <td class="px-4 py-3 text-xs text-gray-700 dark:text-gray-200">
                {{ row.accountName || row.accountId || '—' }}
              </td>
              <td class="px-4 py-3 text-xs text-gray-800 dark:text-gray-100">
                {{ row.model || '—' }}
              </td>
              <td class="px-4 py-3 text-xs text-gray-700 dark:text-gray-100">
                <div class="flex flex-col font-mono text-xs leading-relaxed">
                  <span>
                    <span class="inline-block w-12 text-gray-500 dark:text-gray-400">In/Out</span>
                    <span class="text-gray-400 dark:text-gray-500">: </span>
                    <span class="text-green-600 dark:text-green-400"
                      >{{ displayNumber(row.tokensIn) }} (↑)</span
                    >
                    <span class="text-gray-400"> / </span>
                    <span class="text-blue-600 dark:text-blue-400"
                      >{{ displayNumber(row.tokensOut) }} (↓)</span
                    >
                  </span>
                  <span v-if="hasCache(row)">
                    <span class="inline-block w-12 text-gray-500 dark:text-gray-400">Cache</span>
                    <span class="text-gray-400 dark:text-gray-500">: </span>
                    <span class="text-green-600 dark:text-green-400"
                      >{{ displayNumber(row.cacheCreateTokens) }} (↑)</span
                    >
                    <span class="text-gray-400"> / </span>
                    <span class="text-amber-600 dark:text-amber-400"
                      >{{ displayNumber(row.cacheReadTokens) }} (⚡)</span
                    >
                  </span>
                  <span>
                    <span class="inline-block w-12 text-gray-500 dark:text-gray-400">Total</span>
                    <span class="text-gray-400 dark:text-gray-500">: </span>
                    <span class="text-purple-600 dark:text-purple-400">{{
                      displayNumber(row.tokensTotal)
                    }}</span>
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-xs text-gray-700 dark:text-gray-100">
                {{ formatPrice(row.price) }}
              </td>
              <td class="px-4 py-3 text-xs">
                <el-tooltip
                  v-if="row.errorMessage && Number(row.status) >= 400"
                  :content="row.errorMessage"
                  effect="dark"
                  placement="top"
                >
                  <span
                    :class="[
                      'inline-flex cursor-help items-center rounded-full px-2 py-1 text-xs font-semibold',
                      row.statusClass
                    ]"
                  >
                    {{ row.statusDisplay }}
                  </span>
                </el-tooltip>
                <span
                  v-else
                  :class="[
                    'inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold',
                    row.statusClass
                  ]"
                >
                  {{ row.statusDisplay }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-gray-700 dark:text-gray-100">
                {{ row.durationMs ? `${row.durationMs} ms` : '…' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { apiClient } from '@/config/api'
import { APP_CONFIG } from '@/config/app'
import { useDashboardStore } from '@/stores/dashboard'
import TokenDistributionChart from '@/components/common/TokenDistributionChart.vue'
import DetailedStatsTable from '@/components/common/DetailedStatsTable.vue'

// Dashboard store for statistics
const dashboardStore = useDashboardStore()
const { requestLogsModelStats } = storeToRefs(dashboardStore)
const { loadRequestLogsModelStats } = dashboardStore

const headers = [
  'Time',
  'Request ID',
  'Endpoint',
  'API Key',
  'Account',
  'Model',
  'Tokens',
  'Price',
  'Status',
  'Duration'
]

const isNilOrEmpty = (value) => value === undefined || value === null || value === ''

const rows = ref([])
const cursor = ref('0-0')
const loading = ref(false)
const refreshInterval = 3000
let timer = null

const selectedApiKeyId = ref('')

const apiKeyOptions = computed(() => {
  const map = new Map()
  rows.value.forEach((row) => {
    if (row.apiKeyId) {
      const label = row.apiKeyName || row.apiKeyId
      map.set(row.apiKeyId, label)
    }
  })

  return Array.from(map.entries()).map(([value, label]) => ({ value, label }))
})

// Statistics auto-refresh (30 seconds, always enabled)
const statsLoading = ref(false)
const statsCountdown = ref(30)
const statsRefreshInterval = 30000 // 30 seconds
let statsTimer = null
let statsCountdownTimer = null

const statusClassFor = (status) => {
  if (status === '...') {
    return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
  }
  if (Number(status) >= 500) {
    return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200'
  }
  if (Number(status) >= 400) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
  }
  return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200'
}

const mergeEvents = (events = []) => {
  const map = new Map(rows.value.map((row) => [row.requestId, { ...row }]))

  events.forEach((event) => {
    const reqId = event.requestId || event.id
    if (!reqId) {
      return
    }

    const existing = map.get(reqId)
    const isNewRequest = !existing

    const row = existing || {
      requestId: reqId,
      statusDisplay: '...',
      statusClass: statusClassFor('...')
    }

    // 保存 Redis Stream ID 用于排序（只保留首次设置的 ID，即 start 事件的 ID）
    if (event.id && !row.id) {
      row.id = event.id
    }

    if (event.method) row.method = event.method
    if (event.endpoint) row.endpoint = event.endpoint
    if (event.timestamp && !row.timestamp) row.timestamp = event.timestamp
    if (event.apiKeyName) row.apiKeyName = event.apiKeyName
    if (event.apiKeyId) row.apiKeyId = event.apiKeyId
    if (event.userId) row.userId = event.userId
    // Only update if new value is present and current value is missing (null/undefined/empty string)
    if (!isNilOrEmpty(event.accountId) && isNilOrEmpty(row.accountId)) {
      row.accountId = event.accountId
    }
    if (!isNilOrEmpty(event.accountName) && isNilOrEmpty(row.accountName)) {
      row.accountName = event.accountName
    }
    if (!isNilOrEmpty(event.model) && isNilOrEmpty(row.model)) {
      row.model = event.model
    }

    if (event.phase === 'start') {
      row.statusDisplay = '...'
      row.statusClass = statusClassFor('...')

      // Flash effect: New request detected
      if (isNewRequest) {
        row._flashState = 'new'
        row._flashTimestamp = Date.now()

        // Auto-clear flash after 2 seconds
        setTimeout(() => {
          const currentRow = rows.value.find((r) => r.requestId === reqId)
          if (currentRow && currentRow._flashState === 'new') {
            currentRow._flashState = 'none'
          }
        }, 2000)
      }
    } else {
      // Check if request is completing (pending -> finished)
      const wasIncomplete = existing && existing.statusDisplay === '...'

      if (event.status !== undefined && event.status !== null) {
        row.status = event.status
        row.statusDisplay = event.status
        row.statusClass = statusClassFor(event.status)

        // Flash effect: Request completed
        if (wasIncomplete) {
          row._flashState = 'updated'
          row._flashTimestamp = Date.now()

          // Auto-clear flash after 2 seconds
          setTimeout(() => {
            const currentRow = rows.value.find((r) => r.requestId === reqId)
            if (currentRow && currentRow._flashState === 'updated') {
              currentRow._flashState = 'none'
            }
          }, 2000)
        }
      }
      if (event.durationMs !== undefined && event.durationMs !== null) {
        row.durationMs = event.durationMs
      }
      // Only update if new value is present and current value is missing (null/undefined/empty string)
      // This prevents the first finish event (with null or empty values) from overwriting
      // the second finish event (with actual usage data)
      if (!isNilOrEmpty(event.tokensIn) && isNilOrEmpty(row.tokensIn)) {
        row.tokensIn = event.tokensIn
      }
      if (!isNilOrEmpty(event.tokensOut) && isNilOrEmpty(row.tokensOut)) {
        row.tokensOut = event.tokensOut
      }
      if (!isNilOrEmpty(event.cacheCreateTokens) && isNilOrEmpty(row.cacheCreateTokens)) {
        row.cacheCreateTokens = event.cacheCreateTokens
      }
      if (!isNilOrEmpty(event.cacheReadTokens) && isNilOrEmpty(row.cacheReadTokens)) {
        row.cacheReadTokens = event.cacheReadTokens
      }
      if (!isNilOrEmpty(event.tokensTotal) && isNilOrEmpty(row.tokensTotal)) {
        row.tokensTotal = event.tokensTotal
      }
      if (!isNilOrEmpty(event.price) && isNilOrEmpty(row.price)) {
        row.price = event.price
      }
      if (event.errorMessage) {
        row.errorMessage = event.errorMessage
      }
      if (event.timestamp) {
        row.completedAt = event.timestamp
      }
    }

    map.set(reqId, row)
  })

  rows.value = Array.from(map.values())
}

const fetchLogs = async (reset = false) => {
  if (loading.value) return
  loading.value = true

  try {
    const startCursor = reset ? '0-0' : cursor.value
    const result = await apiClient.get('/admin/request-logs', {
      params: {
        cursor: startCursor,
        limit: 200
      }
    })

    if (Array.isArray(result.events)) {
      mergeEvents(result.events)
    }
    if (result.lastId) {
      cursor.value = result.lastId
    }
  } catch (error) {
    // console.error('Failed to load request logs:', error)
  } finally {
    loading.value = false
  }
}

const manualRefresh = () => fetchLogs()

const sortedRows = computed(() => {
  return [...rows.value]
    .filter((row) => !row.endpoint?.includes('count_tokens')) // 隐藏 Token Count API 请求
    .sort((a, b) => {
      // 优先使用 Redis Stream ID 排序（始终可用，毫秒+序列精度）
      // Redis Stream ID 格式: <millisecond-timestamp>-<sequence>
      // 这确保了 start 和 complete 阶段的一致排序
      if (a.id && b.id) {
        return b.id.localeCompare(a.id) // 字符串比较，新的在前
      }

      // 如果缺少 Redis Stream ID，回退到时间戳排序
      if (!a.id || !b.id) {
        // console.warn('[Sort] Missing Redis Stream ID, falling back to timestamp:', {
        //   a: { requestId: a.requestId, id: a.id, timestamp: a.timestamp },
        //   b: { requestId: b.requestId, id: b.id, timestamp: b.timestamp }
        // })
        const timeA = new Date(a.completedAt || a.timestamp || 0).getTime()
        const timeB = new Date(b.completedAt || b.timestamp || 0).getTime()
        return timeB - timeA
      }

      return 0
    })
})

const formatTimeParts = (ts) => {
  if (!ts) return { valid: false, fallback: '—' }

  try {
    const date = new Date(ts)
    return {
      valid: true,
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
  } catch (e) {
    return { valid: false, fallback: ts }
  }
}

const formatPrice = (price) => {
  if (price === null || price === undefined) return '—'
  const num = Number(price)
  return Number.isFinite(num) ? `$${num.toFixed(6)}` : '—'
}

const displayNumber = (value) => {
  if (value === null || value === undefined) return '—'
  return value
}

const hasCache = (row) => {
  return (
    (row.cacheCreateTokens !== undefined && row.cacheCreateTokens !== null) ||
    (row.cacheReadTokens !== undefined && row.cacheReadTokens !== null)
  )
}

const getFlashClass = (row) => {
  if (!row._flashState || row._flashState === 'none') {
    return ''
  }
  if (row._flashState === 'new') {
    return 'flash-new'
  }
  if (row._flashState === 'updated') {
    return 'flash-updated'
  }
  return ''
}

// Load statistics data
const loadStats = async () => {
  statsLoading.value = true
  try {
    await loadRequestLogsModelStats(selectedApiKeyId.value)
  } catch (error) {
    // console.error('Failed to load statistics:', error)
  } finally {
    statsLoading.value = false
  }
}

const onApiKeyFilterChange = async () => {
  await loadStats()
  startStatsCountdown()
}

// Start statistics countdown
const startStatsCountdown = () => {
  statsCountdown.value = statsRefreshInterval / 1000 // Reset to 30 seconds

  if (statsCountdownTimer) {
    clearInterval(statsCountdownTimer)
  }

  statsCountdownTimer = setInterval(() => {
    if (statsCountdown.value > 0) {
      statsCountdown.value--
    }
  }, 1000)
}

// Setup statistics auto-refresh
const setupStatsAutoRefresh = () => {
  // Initial load
  loadStats()

  // Start countdown
  startStatsCountdown()

  // Auto-refresh every 30 seconds
  statsTimer = setInterval(() => {
    loadStats()
    startStatsCountdown()
  }, statsRefreshInterval)
}

onMounted(() => {
  fetchLogs(true)
  timer = setInterval(fetchLogs, refreshInterval)

  // Setup statistics auto-refresh
  setupStatsAutoRefresh()
})

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
  }
  if (statsTimer) {
    clearInterval(statsTimer)
  }
  if (statsCountdownTimer) {
    clearInterval(statsCountdownTimer)
  }
})
</script>

<style scoped>
/* Flash effect for new requests - Blue */
@keyframes flash-new {
  0% {
    background-color: rgba(59, 130, 246, 0.3);
  }
  100% {
    background-color: transparent;
  }
}

.flash-new {
  animation: flash-new 2s ease-out;
}

/* Flash effect for completed requests - Green */
@keyframes flash-updated {
  0% {
    background-color: rgba(34, 197, 94, 0.3);
  }
  100% {
    background-color: transparent;
  }
}

.flash-updated {
  animation: flash-updated 2s ease-out;
}

/* Dark mode variants */
:global(.dark) .flash-new {
  animation: flash-new-dark 2s ease-out;
}

:global(.dark) .flash-updated {
  animation: flash-updated-dark 2s ease-out;
}

@keyframes flash-new-dark {
  0% {
    background-color: rgba(59, 130, 246, 0.25);
  }
  100% {
    background-color: transparent;
  }
}

@keyframes flash-updated-dark {
  0% {
    background-color: rgba(34, 197, 94, 0.25);
  }
  100% {
    background-color: transparent;
  }
}
</style>
