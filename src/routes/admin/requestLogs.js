const express = require('express')
const { authenticateAdmin } = require('../../middleware/auth')
const requestLogService = require('../../services/requestLogService')
const logger = require('../../utils/logger')

const router = express.Router()

// 请求日志（仅限 API Key 请求）
router.get('/request-logs', authenticateAdmin, async (req, res) => {
  try {
    const cursor = req.query.cursor || '0-0'
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500)

    const { events, lastId } = await requestLogService.getEvents(cursor, limit)

    const toNumber = (value) => {
      if (value === undefined || value === null || value === '') {
        return null
      }
      const num = Number(value)
      return Number.isFinite(num) ? num : null
    }

    const mapped = events.map((event) => ({
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
      accountName: event.accountName || null,
      model: event.model || null,
      tokensIn: toNumber(event.tokensIn),
      tokensOut: toNumber(event.tokensOut),
      cacheCreateTokens: toNumber(event.cacheCreateTokens),
      cacheReadTokens: toNumber(event.cacheReadTokens),
      tokensTotal: toNumber(event.tokensTotal),
      price: toNumber(event.price),
      // 将后端收集的详细错误信息返回给前端用于状态码悬浮提示
      errorMessage: event.errorMessage || null,
      status: toNumber(event.status) ?? event.status,
      durationMs: toNumber(event.durationMs)
    }))

    return res.json({ success: true, events: mapped, lastId })
  } catch (error) {
    logger.error('Failed to load request logs:', error)
    return res.status(500).json({ success: false, error: 'Failed to load request logs' })
  }
})

module.exports = router
