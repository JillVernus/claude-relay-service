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
    const startId = cursor && cursor !== '0-0' ? `(${cursor}` : '-'
    const results = await client.xrange(STREAM_KEY, startId, '+', 'COUNT', limit)
    const events = results.map(parseEntry)
    const lastId = events.length > 0 ? events[events.length - 1].id : cursor
    return { events, lastId }
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
