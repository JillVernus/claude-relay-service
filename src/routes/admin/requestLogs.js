const express = require('express')
const { authenticateAdmin } = require('../../middleware/auth')
const requestLogService = require('../../services/requestLogService')
const logger = require('../../utils/logger')

// Cost calculation
const CostCalculator = require('../../utils/costCalculator')

// Account services for resolution
const claudeAccountService = require('../../services/claudeAccountService')
const claudeConsoleAccountService = require('../../services/claudeConsoleAccountService')
const ccrAccountService = require('../../services/ccrAccountService')
const geminiAccountService = require('../../services/geminiAccountService')
const geminiApiAccountService = require('../../services/geminiApiAccountService')
const openaiAccountService = require('../../services/openaiAccountService')
const openaiResponsesAccountService = require('../../services/openaiResponsesAccountService')
const droidAccountService = require('../../services/droidAccountService')
const bedrockAccountService = require('../../services/bedrockAccountService')
const azureOpenaiAccountService = require('../../services/azureOpenaiAccountService')

const router = express.Router()

// Account type display names
const accountTypeNames = {
  claude: 'Claude官方',
  'claude-console': 'Claude Console',
  ccr: 'Claude Console Relay',
  openai: 'OpenAI',
  'openai-responses': 'OpenAI Responses',
  gemini: 'Gemini',
  'gemini-api': 'Gemini API',
  droid: 'Droid',
  bedrock: 'AWS Bedrock',
  'azure-openai': 'Azure OpenAI',
  unknown: '未知渠道'
}

// Account services for resolution
const accountServices = [
  { type: 'claude', getter: (id) => claudeAccountService.getAccount(id) },
  { type: 'claude-console', getter: (id) => claudeConsoleAccountService.getAccount(id) },
  { type: 'ccr', getter: (id) => ccrAccountService.getAccount(id) },
  { type: 'openai', getter: (id) => openaiAccountService.getAccount(id) },
  { type: 'openai-responses', getter: (id) => openaiResponsesAccountService.getAccount(id) },
  { type: 'gemini', getter: (id) => geminiAccountService.getAccount(id) },
  { type: 'gemini-api', getter: (id) => geminiApiAccountService.getAccount(id) },
  { type: 'droid', getter: (id) => droidAccountService.getAccount(id) },
  { type: 'bedrock', getter: (id) => bedrockAccountService.getAccount(id) },
  { type: 'azure-openai', getter: (id) => azureOpenaiAccountService.getAccount(id) }
]

// 请求日志（仅限 API Key 请求）
router.get('/request-logs', authenticateAdmin, async (req, res) => {
  try {
    const cursor = req.query.cursor || '0-0'
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 2000)

    const { events, lastId } = await requestLogService.getEvents(cursor, limit)

    const toNumber = (value) => {
      if (value === undefined || value === null || value === '') {
        return null
      }
      const num = Number(value)
      return Number.isFinite(num) ? num : null
    }

    // Convert event to usage object for CostCalculator
    const toUsageObject = (event) => ({
      input_tokens: toNumber(event.tokensIn) || 0,
      output_tokens: toNumber(event.tokensOut) || 0,
      cache_creation_input_tokens: toNumber(event.cacheCreateTokens) || 0,
      cache_read_input_tokens: toNumber(event.cacheReadTokens) || 0
    })

    // Account resolution with caching (per-request cache)
    const accountCache = new Map()
    const resolveAccountInfo = async (id, type) => {
      if (!id) return null

      const cacheKey = `${type || 'any'}:${id}`
      if (accountCache.has(cacheKey)) {
        return accountCache.get(cacheKey)
      }

      const servicesToTry = type
        ? accountServices.filter((svc) => svc.type === type)
        : accountServices

      for (const service of servicesToTry) {
        try {
          const account = await service.getter(id)
          if (account) {
            const info = {
              id,
              name: account.name || account.email || id,
              type: service.type,
              status: account.status || account.isActive
            }
            accountCache.set(cacheKey, info)
            return info
          }
        } catch {
          // Silently continue to next service
        }
      }

      accountCache.set(cacheKey, null)
      return null
    }

    // Process events with enrichment
    const mapped = await Promise.all(
      events.map(async (event) => {
        const tokensIn = toNumber(event.tokensIn)
        const tokensOut = toNumber(event.tokensOut)
        const cacheCreateTokens = toNumber(event.cacheCreateTokens)
        const cacheReadTokens = toNumber(event.cacheReadTokens)
        const tokensTotal = toNumber(event.tokensTotal)
        const model = event.model || null

        // Calculate cost if missing but tokens available
        let price = toNumber(event.price)
        let costBreakdown = null
        let costFormatted = null

        const hasTokens = tokensIn > 0 || tokensOut > 0
        if (hasTokens && model) {
          try {
            const usage = toUsageObject(event)
            const costInfo = CostCalculator.calculateCost(usage, model)
            if (costInfo?.costs) {
              // Use calculated cost if original price is missing
              if (price === null) {
                price = costInfo.costs.total
              }
              costBreakdown = {
                input: costInfo.costs.input || 0,
                output: costInfo.costs.output || 0,
                cacheWrite: costInfo.costs.cacheWrite || 0,
                cacheRead: costInfo.costs.cacheRead || 0,
                total: costInfo.costs.total || 0
              }
              costFormatted = costInfo.formatted?.total || null
            }
          } catch {
            // Silently ignore cost calculation errors, use original price
          }
        }

        // Resolve account info if needed
        let accountName = event.accountName || null
        let accountType = event.accountType || null
        let accountTypeName = null

        if (event.accountId && !accountName) {
          const accountInfo = await resolveAccountInfo(event.accountId, accountType)
          if (accountInfo) {
            accountName = accountInfo.name
            accountType = accountInfo.type
          }
        }

        if (accountType) {
          accountTypeName = accountTypeNames[accountType] || accountTypeNames.unknown
        }

        return {
          id: event.id,
          phase: event.phase || 'unknown',
          requestId: event.requestId,
          timestamp: event.timestamp,
          method: event.method,
          endpoint: event.endpoint,
          apiKeyId: event.apiKeyId || null,
          apiKeyName: event.apiKeyName || null,
          userId: event.userId || null,
          accountId: event.accountId || null,
          accountName,
          accountType,
          accountTypeName,
          model,
          tokensIn,
          tokensOut,
          cacheCreateTokens,
          cacheReadTokens,
          tokensTotal,
          price,
          costFormatted,
          costBreakdown,
          // 将后端收集的详细错误信息返回给前端用于状态码悬浮提示
          errorMessage: event.errorMessage || null,
          status: toNumber(event.status) ?? event.status,
          durationMs: toNumber(event.durationMs)
        }
      })
    )

    return res.json({ success: true, events: mapped, lastId })
  } catch (error) {
    logger.error('Failed to load request logs:', error)
    return res.status(500).json({ success: false, error: 'Failed to load request logs' })
  }
})

module.exports = router
