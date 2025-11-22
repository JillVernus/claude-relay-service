const redis = require('../models/redis')
const logger = require('../utils/logger')

const STREAM_KEY = 'request:logs'
const MAX_LEN = 5000

const normalizeValue = (value) => {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

const parseEntry = ([id, fields]) => {
  const data = {}
  for (let i = 0; i < fields.length; i += 2) {
    data[fields[i]] = fields[i + 1]
  }
  return { id, ...data }
}

async function emitEvent(event = {}) {
  const client = redis.getClient()
  if (!client) {
    return null
  }

  const payload = Object.entries(event).flatMap(([key, value]) => [key, normalizeValue(value)])

  try {
    return await client.xadd(STREAM_KEY, 'MAXLEN', '~', MAX_LEN, '*', ...payload)
  } catch (error) {
    logger.error('❌ Failed to append request log event:', error)
    return null
  }
}

async function emitStart(event = {}) {
  return emitEvent({
    phase: 'start',
    timestamp: new Date().toISOString(),
    ...event
  })
}

async function emitFinish(event = {}) {
  return emitEvent({
    phase: 'finish',
    timestamp: new Date().toISOString(),
    ...event
  })
}

async function getEvents(cursor = '0-0', limit = 200) {
  const client = redis.getClient()
  if (!client) {
    return { events: [], lastId: cursor }
  }

  try {
    // 修复：初始加载时从最新的日志开始（使用 XREVRANGE 倒序获取）
    if (cursor === '0-0') {
      // 使用 XREVRANGE 从最新到最旧获取，然后反转顺序
      // 注意：这意味着初始加载只显示最新的 limit 条日志
      // 更老的日志无法通过前端分页访问（因为增量获取只能向前）
      // 如果需要查看更老的日志，可以查看 Winston 日志文件或增加 limit
      const results = await client.xrevrange(STREAM_KEY, '+', '-', 'COUNT', limit)
      const events = results.map(parseEntry).reverse() // 反转回正序（旧到新）
      const lastId = events.length > 0 ? events[events.length - 1].id : cursor
      return { events, lastId }
    } else {
      // 增量获取：从上次的 cursor 之后开始（只能向前分页）
      const startId = `(${cursor}`
      const results = await client.xrange(STREAM_KEY, startId, '+', 'COUNT', limit)
      const events = results.map(parseEntry)
      const lastId = events.length > 0 ? events[events.length - 1].id : cursor
      return { events, lastId }
    }
  } catch (error) {
    logger.error('❌ Failed to read request log events:', error)
    return { events: [], lastId: cursor }
  }
}

module.exports = {
  emitStart,
  emitFinish,
  getEvents
}
