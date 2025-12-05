/**
 * Account Pricing Adjuster
 * Wraps CostCalculator to apply account-specific pricing multipliers
 *
 * This module applies multipliers AFTER the base cost calculation,
 * allowing per-account, per-model pricing adjustments without modifying upstream code.
 *
 * Supported account types: claude-console, openai-responses
 */

const CostCalculator = require('./costCalculator')
const accountPricingService = require('../services/accountPricingService')
const logger = require('./logger')

// Account types that support pricing multipliers
const SUPPORTED_ACCOUNT_TYPES = ['claude-console', 'openai-responses']

/**
 * Calculate cost with account-specific pricing multipliers
 * @param {Object} usage - Usage data (input_tokens, output_tokens, etc.)
 * @param {string} model - Model name
 * @param {string} accountType - Account type (claude-console, openai-responses, etc.)
 * @param {string} accountId - Account ID
 * @returns {Promise<Object>} - Cost info with multipliers applied
 */
async function calculateCostWithAccountType(usage, model, accountType, accountId) {
  // Get base cost calculation from upstream (unchanged)
  const baseCost = CostCalculator.calculateCost(usage, model)

  // Check if account type supports multipliers
  if (!accountType || !SUPPORTED_ACCOUNT_TYPES.includes(accountType)) {
    return baseCost
  }

  // Check if accountId is provided
  if (!accountId) {
    return baseCost
  }

  try {
    // Get multipliers for this account and model
    const multipliers = await accountPricingService.getMultipliers(accountId, model)

    // Check if any multiplier is different from default (1.0)
    const hasCustomMultipliers =
      multipliers.input !== 1.0 ||
      multipliers.output !== 1.0 ||
      multipliers.cacheCreate !== 1.0 ||
      multipliers.cacheRead !== 1.0

    if (!hasCustomMultipliers) {
      return baseCost
    }

    // Apply multipliers to costs
    const adjustedCosts = {
      input: baseCost.costs.input * multipliers.input,
      output: baseCost.costs.output * multipliers.output,
      cacheWrite: baseCost.costs.cacheWrite * multipliers.cacheCreate,
      cacheRead: baseCost.costs.cacheRead * multipliers.cacheRead,
      total: 0
    }

    // Recalculate total
    adjustedCosts.total =
      adjustedCosts.input +
      adjustedCosts.output +
      adjustedCosts.cacheWrite +
      adjustedCosts.cacheRead

    // Return adjusted cost info
    return {
      ...baseCost,
      costs: adjustedCosts,
      formatted: {
        input: CostCalculator.formatCost(adjustedCosts.input),
        output: CostCalculator.formatCost(adjustedCosts.output),
        cacheWrite: CostCalculator.formatCost(adjustedCosts.cacheWrite),
        cacheRead: CostCalculator.formatCost(adjustedCosts.cacheRead),
        total: CostCalculator.formatCost(adjustedCosts.total)
      },
      // Add multiplier info for debugging/display
      multipliers: {
        applied: true,
        accountId,
        accountType,
        values: multipliers
      },
      // Keep original costs for reference
      originalCosts: baseCost.costs
    }
  } catch (error) {
    logger.error(
      `Failed to apply pricing multipliers for account ${accountId}, model ${model}:`,
      error
    )
    // Fallback to base cost on error
    return baseCost
  }
}

/**
 * Synchronous version for compatibility - uses cached multipliers
 * Note: This version cannot fetch from Redis, use async version when possible
 * @param {Object} usage - Usage data
 * @param {string} model - Model name
 * @param {Object} multipliers - Pre-fetched multipliers object
 * @returns {Object} - Cost info with multipliers applied
 */
function calculateCostWithMultipliers(usage, model, multipliers) {
  const baseCost = CostCalculator.calculateCost(usage, model)

  if (!multipliers) {
    return baseCost
  }

  // Check if any multiplier is different from default (1.0)
  const hasCustomMultipliers =
    (multipliers.input ?? 1.0) !== 1.0 ||
    (multipliers.output ?? 1.0) !== 1.0 ||
    (multipliers.cacheCreate ?? 1.0) !== 1.0 ||
    (multipliers.cacheRead ?? 1.0) !== 1.0

  if (!hasCustomMultipliers) {
    return baseCost
  }

  // Apply multipliers to costs
  const adjustedCosts = {
    input: baseCost.costs.input * (multipliers.input ?? 1.0),
    output: baseCost.costs.output * (multipliers.output ?? 1.0),
    cacheWrite: baseCost.costs.cacheWrite * (multipliers.cacheCreate ?? 1.0),
    cacheRead: baseCost.costs.cacheRead * (multipliers.cacheRead ?? 1.0),
    total: 0
  }

  adjustedCosts.total =
    adjustedCosts.input + adjustedCosts.output + adjustedCosts.cacheWrite + adjustedCosts.cacheRead

  return {
    ...baseCost,
    costs: adjustedCosts,
    formatted: {
      input: CostCalculator.formatCost(adjustedCosts.input),
      output: CostCalculator.formatCost(adjustedCosts.output),
      cacheWrite: CostCalculator.formatCost(adjustedCosts.cacheWrite),
      cacheRead: CostCalculator.formatCost(adjustedCosts.cacheRead),
      total: CostCalculator.formatCost(adjustedCosts.total)
    },
    multipliers: {
      applied: true,
      values: multipliers
    },
    originalCosts: baseCost.costs
  }
}

module.exports = {
  calculateCostWithAccountType,
  calculateCostWithMultipliers,
  SUPPORTED_ACCOUNT_TYPES
}
