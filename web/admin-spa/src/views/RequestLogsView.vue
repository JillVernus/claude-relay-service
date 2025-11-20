<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-50">请求日志</h1>
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
              class="hover:bg-gray-50/70 dark:hover:bg-gray-800/50"
            >
              <td class="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                {{ formatTime(row.timestamp) }}
              </td>
              <td class="px-4 py-3 font-mono text-sm text-gray-700 dark:text-gray-100">
                {{ row.requestId }}
              </td>
              <td
                class="text-primary-600 dark:text-primary-400 px-4 py-3 text-xs font-semibold uppercase"
              >
                {{ row.method || '—' }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                {{ row.endpoint }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                {{ row.userId || '—' }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                {{ row.accountName || row.accountId || '—' }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-100">
                {{ row.model || '—' }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-100">
                <div class="flex flex-col leading-tight">
                  <span>In: {{ displayNumber(row.tokensIn) }}</span>
                  <span>Out: {{ displayNumber(row.tokensOut) }}</span>
                  <span>Total: {{ displayNumber(row.tokensTotal) }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-100">
                {{ formatPrice(row.price) }}
              </td>
              <td class="px-4 py-3 text-sm">
                <span
                  :class="[
                    'inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold',
                    row.statusClass
                  ]"
                >
                  {{ row.statusDisplay }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-100">
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
import { apiClient } from '@/config/api'

const headers = [
  '时间',
  'Request ID',
  '方法',
  'Endpoint',
  '用户',
  '账户',
  '模型',
  'Tokens (In/Out/Total)',
  '价格',
  '状态',
  '耗时'
]

const rows = ref([])
const cursor = ref('0-0')
const loading = ref(false)
const refreshInterval = 3000
let timer = null

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

    const existing = map.get(reqId) || {
      requestId: reqId,
      statusDisplay: '...',
      statusClass: statusClassFor('...')
    }

    if (event.method) existing.method = event.method
    if (event.endpoint) existing.endpoint = event.endpoint
    if (event.timestamp && !existing.timestamp) existing.timestamp = event.timestamp
    if (event.apiKeyName) existing.apiKeyName = event.apiKeyName
    if (event.apiKeyId) existing.apiKeyId = event.apiKeyId
    if (event.userId) existing.userId = event.userId
    if (event.accountId) existing.accountId = event.accountId
    if (event.accountName) existing.accountName = event.accountName
    if (event.model) existing.model = event.model

    if (event.phase === 'start') {
      existing.statusDisplay = '...'
      existing.statusClass = statusClassFor('...')
    } else {
      if (event.status !== undefined && event.status !== null) {
        existing.status = event.status
        existing.statusDisplay = event.status
        existing.statusClass = statusClassFor(event.status)
      }
      if (event.durationMs !== undefined && event.durationMs !== null) {
        existing.durationMs = event.durationMs
      }
      if (event.tokensIn !== undefined && event.tokensIn !== null) {
        existing.tokensIn = event.tokensIn
      }
      if (event.tokensOut !== undefined && event.tokensOut !== null) {
        existing.tokensOut = event.tokensOut
      }
      if (event.tokensTotal !== undefined && event.tokensTotal !== null) {
        existing.tokensTotal = event.tokensTotal
      }
      if (event.price !== undefined && event.price !== null) {
        existing.price = event.price
      }
      if (event.timestamp) {
        existing.completedAt = event.timestamp
      }
    }

    map.set(reqId, existing)
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
    console.error('Failed to load request logs:', error)
  } finally {
    loading.value = false
  }
}

const manualRefresh = () => fetchLogs()

const sortedRows = computed(() => {
  return [...rows.value].sort((a, b) => {
    const timeA = new Date(a.completedAt || a.timestamp || 0).getTime()
    const timeB = new Date(b.completedAt || b.timestamp || 0).getTime()
    return timeB - timeA
  })
})

const formatTime = (ts) => {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleString()
  } catch (e) {
    return ts
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

onMounted(() => {
  fetchLogs(true)
  timer = setInterval(fetchLogs, refreshInterval)
})

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>
