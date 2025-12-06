/**
 * Account Pricing Service
 * Manages per-account, per-model pricing multipliers
 *
 * Redis Key: account_pricing:{accountId}
 * Value: { "model-name": { input, output, cacheCreate, cacheRead }, ... }
 */

const redis = require('../models/redis')
const logger = require('../utils/logger')

const REDIS_KEY_PREFIX = 'account_pricing:'

class AccountPricingService {
  /**
   * Get pricing multipliers for an account
   * @param {string} accountId - The account ID
   * @returns {Promise<Object|null>} - Pricing multipliers object or null
   */
  async getPricing(accountId) {
    if (!accountId) {
      return null
    }

    try {
      const client = redis.getClient()
      if (!client) {
        logger.warn('Redis client not available for account pricing')
        return null
      }

      const key = `${REDIS_KEY_PREFIX}${accountId}`
      const data = await client.get(key)

      if (!data) {
        return null
      }

      return JSON.parse(data)
    } catch (error) {
      logger.error(`Failed to get pricing for account ${accountId}:`, error)
      return null
    }
  }

  /**
   * Set pricing multipliers for an account
   * @param {string} accountId - The account ID
   * @param {Object} pricing - Pricing multipliers object
   * @returns {Promise<boolean>} - Success status
   */
  async setPricing(accountId, pricing) {
    if (!accountId) {
      throw new Error('Account ID is required')
    }

    try {
      const client = redis.getClient()
      if (!client) {
        throw new Error('Redis client not available')
      }

      // Validate pricing structure
      this.validatePricing(pricing)

      const key = `${REDIS_KEY_PREFIX}${accountId}`
      await client.set(key, JSON.stringify(pricing))

      logger.info(`💰 Set pricing multipliers for account ${accountId}`)
      return true
    } catch (error) {
      logger.error(`Failed to set pricing for account ${accountId}:`, error)
      throw error
    }
  }

  /**
   * Update pricing for a specific model
   * @param {string} accountId - The account ID
   * @param {string} modelName - The model name
   * @param {Object} multipliers - { input, output, cacheCreate, cacheRead }
   * @returns {Promise<boolean>} - Success status
   */
  async setModelPricing(accountId, modelName, multipliers) {
    if (!accountId || !modelName) {
      throw new Error('Account ID and model name are required')
    }

    // Validate multipliers
    this.validateMultipliers(multipliers)

    try {
      const currentPricing = (await this.getPricing(accountId)) || {}
      currentPricing[modelName] = {
        input: multipliers.input ?? 1.0,
        output: multipliers.output ?? 1.0,
        cacheCreate: multipliers.cacheCreate ?? 1.0,
        cacheRead: multipliers.cacheRead ?? 1.0
      }

      await this.setPricing(accountId, currentPricing)
      logger.info(`💰 Set pricing multipliers for account ${accountId}, model ${modelName}`)
      return true
    } catch (error) {
      logger.error(`Failed to set model pricing for account ${accountId}:`, error)
      throw error
    }
  }

  /**
   * Delete pricing for a specific model
   * @param {string} accountId - The account ID
   * @param {string} modelName - The model name
   * @returns {Promise<boolean>} - Success status
   */
  async deleteModelPricing(accountId, modelName) {
    if (!accountId || !modelName) {
      throw new Error('Account ID and model name are required')
    }

    try {
      const currentPricing = await this.getPricing(accountId)
      if (!currentPricing || !currentPricing[modelName]) {
        return false
      }

      delete currentPricing[modelName]

      // If no models left, delete the entire key
      if (Object.keys(currentPricing).length === 0) {
        await this.deletePricing(accountId)
      } else {
        await this.setPricing(accountId, currentPricing)
      }

      logger.info(`💰 Deleted pricing multipliers for account ${accountId}, model ${modelName}`)
      return true
    } catch (error) {
      logger.error(`Failed to delete model pricing for account ${accountId}:`, error)
      throw error
    }
  }

  /**
   * Delete all pricing for an account
   * @param {string} accountId - The account ID
   * @returns {Promise<boolean>} - Success status
   */
  async deletePricing(accountId) {
    if (!accountId) {
      throw new Error('Account ID is required')
    }

    try {
      const client = redis.getClient()
      if (!client) {
        throw new Error('Redis client not available')
      }

      const key = `${REDIS_KEY_PREFIX}${accountId}`
      await client.del(key)

      logger.info(`💰 Deleted all pricing multipliers for account ${accountId}`)
      return true
    } catch (error) {
      logger.error(`Failed to delete pricing for account ${accountId}:`, error)
      throw error
    }
  }

  /**
   * Get multipliers for a specific account and model
   * Priority: model-specific > account default (_default) > system default (1.0)
   * @param {string} accountId - The account ID
   * @param {string} modelName - The model name
   * @returns {Promise<Object>} - { input, output, cacheCreate, cacheRead }
   */
  async getMultipliers(accountId, modelName) {
    const defaultMultipliers = {
      input: 1.0,
      output: 1.0,
      cacheCreate: 1.0,
      cacheRead: 1.0
    }

    if (!accountId || !modelName) {
      return defaultMultipliers
    }

    try {
      const pricing = await this.getPricing(accountId)
      if (!pricing) {
        return defaultMultipliers
      }

      // Priority: model-specific > account default (_default) > system default
      const modelPricing = pricing[modelName] || pricing['_default']
      if (!modelPricing) {
        return defaultMultipliers
      }

      return {
        input: modelPricing.input ?? 1.0,
        output: modelPricing.output ?? 1.0,
        cacheCreate: modelPricing.cacheCreate ?? 1.0,
        cacheRead: modelPricing.cacheRead ?? 1.0
      }
    } catch (error) {
      logger.error(`Failed to get multipliers for account ${accountId}, model ${modelName}:`, error)
      return defaultMultipliers
    }
  }

  /**
   * Validate pricing object structure
   * @param {Object} pricing - Pricing object to validate
   */
  validatePricing(pricing) {
    if (!pricing || typeof pricing !== 'object') {
      throw new Error('Pricing must be an object')
    }

    for (const [modelName, multipliers] of Object.entries(pricing)) {
      if (typeof modelName !== 'string' || !modelName.trim()) {
        throw new Error('Model name must be a non-empty string')
      }
      this.validateMultipliers(multipliers)
    }
  }

  /**
   * Validate multipliers object
   * @param {Object} multipliers - Multipliers to validate
   */
  validateMultipliers(multipliers) {
    if (!multipliers || typeof multipliers !== 'object') {
      throw new Error('Multipliers must be an object')
    }

    const validKeys = ['input', 'output', 'cacheCreate', 'cacheRead']
    for (const [key, value] of Object.entries(multipliers)) {
      if (!validKeys.includes(key)) {
        throw new Error(`Invalid multiplier key: ${key}`)
      }
      if (typeof value !== 'number' || value < 0 || value > 10) {
        throw new Error(`Multiplier ${key} must be a number between 0 and 10`)
      }
    }
  }
}

module.exports = new AccountPricingService()
