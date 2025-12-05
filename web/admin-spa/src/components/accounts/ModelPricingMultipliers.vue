<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">
        模型定价倍率
        <span class="ml-2 text-xs text-gray-500 dark:text-gray-400">(用于调整成本计算)</span>
      </h3>
      <button
        class="inline-flex items-center rounded bg-blue-100 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900/70"
        type="button"
        @click="showAddModal = true"
      >
        <svg class="mr-1 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 4v16m8-8H4"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
        添加模型
      </button>
    </div>

    <!-- Pricing table -->
    <div
      v-if="Object.keys(pricing).length > 0"
      class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
    >
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th
              class="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
              模型
            </th>
            <th
              class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
              Input
            </th>
            <th
              class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
              Output
            </th>
            <th
              class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
              Cache Create
            </th>
            <th
              class="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
              Cache Read
            </th>
            <th
              class="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
              操作
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
          <tr
            v-for="(multipliers, modelName) in pricing"
            :key="modelName"
            class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <td
              class="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              {{ modelName }}
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-center text-sm">
              <span :class="getMultiplierClass(multipliers.input)">
                {{ formatMultiplier(multipliers.input) }}
              </span>
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-center text-sm">
              <span :class="getMultiplierClass(multipliers.output)">
                {{ formatMultiplier(multipliers.output) }}
              </span>
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-center text-sm">
              <span :class="getMultiplierClass(multipliers.cacheCreate)">
                {{ formatMultiplier(multipliers.cacheCreate) }}
              </span>
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-center text-sm">
              <span :class="getMultiplierClass(multipliers.cacheRead)">
                {{ formatMultiplier(multipliers.cacheRead) }}
              </span>
            </td>
            <td class="space-x-2 whitespace-nowrap px-3 py-2 text-right text-sm">
              <button
                class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                type="button"
                @click="editModel(modelName, multipliers)"
              >
                编辑
              </button>
              <button
                class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                type="button"
                @click="deleteModel(modelName)"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-6 text-center dark:border-gray-600 dark:bg-gray-800/50"
    >
      <svg
        class="mx-auto h-8 w-8 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
        />
      </svg>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
        暂无定价倍率配置，使用默认价格（倍率 = 1.0）
      </p>
    </div>

    <!-- Add/Edit Modal -->
    <div
      v-if="showAddModal || showEditModal"
      class="fixed inset-0 z-50 overflow-y-auto"
      @click.self="closeModal"
    >
      <div class="flex min-h-screen items-center justify-center px-4 pb-20 pt-4 text-center sm:p-0">
        <div
          class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-gray-900 dark:bg-opacity-75"
        ></div>

        <div
          class="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all dark:bg-gray-800 sm:my-8 sm:w-full sm:max-w-lg sm:align-middle"
        >
          <div class="bg-white px-4 pb-4 pt-5 dark:bg-gray-800 sm:p-6 sm:pb-4">
            <h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">
              {{ showEditModal ? '编辑模型定价倍率' : '添加模型定价倍率' }}
            </h3>

            <div class="space-y-4">
              <!-- Model name -->
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  模型名称
                </label>
                <input
                  v-model="modalForm.modelName"
                  class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:disabled:bg-gray-600"
                  :disabled="showEditModal"
                  placeholder="例如: gpt-5"
                  type="text"
                />
              </div>

              <!-- Multipliers grid -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Input 倍率
                  </label>
                  <input
                    v-model.number="modalForm.input"
                    class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    max="10"
                    min="0"
                    step="0.01"
                    type="number"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Output 倍率
                  </label>
                  <input
                    v-model.number="modalForm.output"
                    class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    max="10"
                    min="0"
                    step="0.01"
                    type="number"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cache Create 倍率
                  </label>
                  <input
                    v-model.number="modalForm.cacheCreate"
                    class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    max="10"
                    min="0"
                    step="0.01"
                    type="number"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cache Read 倍率
                  </label>
                  <input
                    v-model.number="modalForm.cacheRead"
                    class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    max="10"
                    min="0"
                    step="0.01"
                    type="number"
                  />
                </div>
              </div>

              <p class="text-xs text-gray-500 dark:text-gray-400">
                倍率范围: 0 - 10，默认值为 1.0（不调整）。小于 1 表示折扣，大于 1 表示加价。
              </p>
            </div>
          </div>

          <div class="bg-gray-50 px-4 py-3 dark:bg-gray-700/50 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              class="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
              :disabled="saving || !modalForm.modelName"
              type="button"
              @click="saveModel"
            >
              {{ saving ? '保存中...' : '保存' }}
            </button>
            <button
              class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 sm:ml-3 sm:mt-0 sm:w-auto sm:text-sm"
              type="button"
              @click="closeModal"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { apiClient } from '@/config/api'

const props = defineProps({
  accountId: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    required: true,
    validator: (value) => ['claude-console', 'openai-responses'].includes(value)
  }
})

const emit = defineEmits(['error', 'success'])

// State
const pricing = ref({})
const loading = ref(false)
const saving = ref(false)
const showAddModal = ref(false)
const showEditModal = ref(false)
const modalForm = ref({
  modelName: '',
  input: 1.0,
  output: 1.0,
  cacheCreate: 1.0,
  cacheRead: 1.0
})

// Computed API endpoint based on platform
const getApiEndpoint = () => {
  if (props.platform === 'claude-console') {
    return `/admin/claude-console-accounts/${props.accountId}/pricing`
  } else if (props.platform === 'openai-responses') {
    return `/admin/openai-responses-accounts/${props.accountId}/pricing`
  }
  return null
}

// Fetch pricing data
const fetchPricing = async () => {
  if (!props.accountId) return

  loading.value = true
  try {
    const endpoint = getApiEndpoint()
    if (!endpoint) return

    const response = await apiClient.get(endpoint)
    if (response.success) {
      pricing.value = response.data || {}
    }
  } catch (error) {
    console.error('Failed to fetch pricing:', error)
    emit('error', '获取定价倍率失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// Save pricing
const saveModel = async () => {
  if (!modalForm.value.modelName) return

  saving.value = true
  try {
    const endpoint = getApiEndpoint()
    if (!endpoint) return

    const modelEndpoint = `${endpoint}/${encodeURIComponent(modalForm.value.modelName)}`
    const response = await apiClient.put(modelEndpoint, {
      input: modalForm.value.input,
      output: modalForm.value.output,
      cacheCreate: modalForm.value.cacheCreate,
      cacheRead: modalForm.value.cacheRead
    })

    if (response.success) {
      await fetchPricing()
      closeModal()
      emit('success', '定价倍率保存成功')
    }
  } catch (error) {
    console.error('Failed to save pricing:', error)
    emit('error', '保存定价倍率失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

// Delete model pricing
const deleteModel = async (modelName) => {
  if (!confirm(`确定要删除模型 "${modelName}" 的定价倍率吗？`)) return

  try {
    const endpoint = getApiEndpoint()
    if (!endpoint) return

    const modelEndpoint = `${endpoint}/${encodeURIComponent(modelName)}`
    const response = await apiClient.delete(modelEndpoint)

    if (response.success) {
      await fetchPricing()
      emit('success', '定价倍率删除成功')
    }
  } catch (error) {
    console.error('Failed to delete pricing:', error)
    emit('error', '删除定价倍率失败: ' + error.message)
  }
}

// Edit model
const editModel = (modelName, multipliers) => {
  modalForm.value = {
    modelName,
    input: multipliers.input ?? 1.0,
    output: multipliers.output ?? 1.0,
    cacheCreate: multipliers.cacheCreate ?? 1.0,
    cacheRead: multipliers.cacheRead ?? 1.0
  }
  showEditModal.value = true
}

// Close modal
const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  modalForm.value = {
    modelName: '',
    input: 1.0,
    output: 1.0,
    cacheCreate: 1.0,
    cacheRead: 1.0
  }
}

// Format multiplier for display
const formatMultiplier = (value) => {
  const num = value ?? 1.0
  return num.toFixed(2) + 'x'
}

// Get class for multiplier display
const getMultiplierClass = (value) => {
  const num = value ?? 1.0
  if (num < 1) {
    return 'text-green-600 dark:text-green-400 font-medium'
  } else if (num > 1) {
    return 'text-red-600 dark:text-red-400 font-medium'
  }
  return 'text-gray-600 dark:text-gray-400'
}

// Watch for accountId changes
watch(
  () => props.accountId,
  (newId) => {
    if (newId) {
      fetchPricing()
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (props.accountId) {
    fetchPricing()
  }
})
</script>
