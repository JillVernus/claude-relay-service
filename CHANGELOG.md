# Changelog

All notable changes to Claude Relay Service will be documented in this file.

---

## [jill-v1.08] - 2025-11-27

### Added: Token Usage Statistics to Request Logs

**New Features:**

1. **Token 使用分布 (Token Usage Distribution)** - Visual pie chart showing token usage distribution across different models

   - Color-coded chart with automatic theme adaptation (light/dark mode)
   - Smart number formatting (K/M suffixes)
   - Responsive design

2. **详细统计数据 (Detailed Statistics Table)** - Comprehensive statistics table displaying:
   - Model name
   - Request count
   - Total tokens consumed
   - Cost breakdown
   - Usage percentage

**Behavior:**

- Displays today's data (based on system timezone UTC+8)
- Auto-refreshes every 30 seconds with countdown indicator
- Located at the top of Request Logs page
- Grid layout: 2 columns on desktop, 1 column on mobile

**Components Added:**

- `web/admin-spa/src/components/common/TokenDistributionChart.vue` - Pie chart visualization
- `web/admin-spa/src/components/common/DetailedStatsTable.vue` - Statistics table

**Files Changed:**

- `web/admin-spa/src/views/RequestLogsView.vue` - Added statistics section with auto-refresh logic
- `web/admin-spa/src/stores/dashboard.js` - Added `loadRequestLogsModelStats()` function for today's data
- Fixed ESLint/Prettier errors to enable Docker build

---

## [jill-v1.07] - 2025-11-25

### Added: Error Message Tooltip for Failed Requests

Hover over error status codes (4xx/5xx) in Request Logs to see detailed error messages.

**Changes:**

- Backend: Capture error messages in request log events (`src/middleware/auth.js`, `src/routes/api.js`)
- Frontend: Add `<el-tooltip>` to status column with dark mode support (`RequestLogsView.vue`)

### Fixed: Request Log Missing Detail Fields (Race Condition)

**Problem:** Account, model, tokens, and price fields appeared empty in Request Logs despite successful API requests (status 200).

**Root Cause:** Dual finish event pattern caused race condition:

1. Streaming requests emit **two finish events**:
   - First from middleware (`res.on('finish')`) - fires early with `null` usage data
   - Second from usage callback (`api.js`) - fires late with actual data
2. Frontend `mergeEvents()` used inconsistent merge logic:
   - Lines 209-211: Used `if (event.accountId)` - only updates if truthy ✅
   - Lines 256-273: Used `if (event.tokensIn !== undefined && !== null)` - **accepts null values** ❌
3. Result: If first event (null values) processed after second event (valid data), null overwrites valid data

**Solution:** Fixed frontend merge logic to preserve non-null values:

```javascript
// Only update if new value is non-null AND existing value is null
if (
  event.tokensIn !== undefined &&
  event.tokensIn !== null &&
  (row.tokensIn === undefined || row.tokensIn === null)
) {
  row.tokensIn = event.tokensIn
}
```

**Files Changed:**

- `web/admin-spa/src/views/RequestLogsView.vue` (lines 209-212, 260-301) - Protected account/model/tokens/price fields from null overwrites with proper Prettier formatting

---

## [jill-v1.06] - 2025-11-23

### Added: Feature Version Display in Request Logs

Display version number (e.g., "ver.jill-v1.06") next to page title.

**Config:** Version centrally managed in `web/admin-spa/src/config/app.js` → `APP_CONFIG.requestLogVersion`

**Files Changed:**

- `web/admin-spa/src/config/app.js` - Added `requestLogVersion` property
- `web/admin-spa/src/views/RequestLogsView.vue` - Display version from config

---

## [jill-v1.05] - 2025-11-22

### Enhanced: Request Log UI Improvements

**1. Flash Effects for Real-time Updates**

- New requests flash blue for 2s, completed requests flash green for 2s
- Implementation: `_flashState` tracking, CSS keyframe animations, dark mode compatible

**2. Compact Token Display**

- Reduced from 5 lines to 2-3 lines with symbols (↑↓⚡) and semantic colors
- Format: `In/Out: 8 (↑) / 139 (↓)`, `Cache: 5 (↑) / 10 (⚡)`, `Total: 1800`
- Cache line only shown when cache exists

**Files Changed:** `web/admin-spa/src/views/RequestLogsView.vue` - Added flash tracking, compact layout, CSS animations

---

## [jill-v1.04f] - 2025-11-22

### Fixed: Request Log Sorting - Preserve Start Event Redis Stream ID

**Problem:** Requests re-ordered incorrectly when completing at different times within same second.

**Root Cause:** Frontend `mergeEvents()` was overwriting start event ID with finish event ID:

```javascript
// OLD: Always overwrites
if (event.id) existing.id = event.id // ❌ Replaces arrival time with completion time
```

**Solution:** Preserve the start event Redis Stream ID:

```javascript
// NEW: Only set ID once (from start event)
if (event.id && !existing.id) existing.id = event.id // ✅ Preserves arrival time
```

**Files Changed:** `web/admin-spa/src/views/RequestLogsView.vue` (line 156-157) - Added `!existing.id` check

---

## [jill-v1.04e] - 2025-11-21

### Fixed: Request Log Ordering - Redis Stream ID as Primary Sort Key

**Problem:** Incorrect ordering during start phase (pending requests) due to timestamp precision mismatch.

**Solution:** Always use Redis Stream ID (millisecond + sequence precision) as primary sort key:

```javascript
// NEW: Redis Stream ID primary, timestamp as fallback
if (a.id && b.id) return b.id.localeCompare(a.id)
// Fallback only if ID missing
const timeA = new Date(a.completedAt || a.timestamp || 0).getTime()
const timeB = new Date(b.completedAt || b.timestamp || 0).getTime()
return timeB - timeA
```

**Files Changed:** `web/admin-spa/src/views/RequestLogsView.vue` (lines 244-266) - Changed to Redis Stream ID primary sort

---

## [jill-v1.04d] - 2025-11-21

### Fixed: Request Log Ordering Within Same Second (Deprecated - See v1.04e)

**Problem:** Requests within same second appeared in reverse order.

**Root Cause (Identified by Codex):**

1. `mergeEvents` only set `id` once: Used `if (event.id && !existing.id)` → kept start event ID
2. Comparator typo: `b.completedAt || a.timestamp` (should be `b.timestamp`)

**Solution:** Fixed both bugs - always update Redis Stream ID + fixed comparator typo

**Files Changed:** `web/admin-spa/src/views/RequestLogsView.vue` - Lines 156, 240, 242-246

---

## [jill-v1.04c] - 2025-11-21

### Fixed: Streaming Request Log Missing Fields

**Problem:** Streaming requests showed missing API key, account, model, tokens, cost fields.

**Root Cause:** Response `finish` event fired BEFORE usage callback captured token data from SSE stream.

**Solution:** Emit second `emitFinish()` after `recordUsageWithDetails()` completes with full usage data. Frontend merges duplicate events by `requestId`.

**Files Changed:** `src/routes/api.js` - Added second `emitFinish()` for Claude official, Console, CCR streaming (lines 239-270, 351-381, 520-550)

---

## [jill-v1.04b] - 2025-11-21

### Fixed: Request Log Issues (Filtering, Loading, Missing Fields)

**Problems:**

1. Management endpoints `/apiStats/api/...` incorrectly logged as API Key requests
2. Old logs loaded first, new logs delayed 3 seconds
3. Missing fields in some logs

**Solutions:**

1. Enhanced regex with negative lookahead: `/^\/(?!apistats)(api|claude|openai|droid|gemini|azure)/i`
2. Use `XREVRANGE` for initial load to get newest logs first, then reverse for chronological order
3. Enhanced field validation with null fallbacks, smart debug logging only for API Key requests with token usage

**Files Changed:**

- `src/middleware/auth.js` (line 1025, 1117-1151) - Regex fix, enhanced logging
- `src/services/requestLogService.js` (lines 65-73) - XREVRANGE for initial load

---

## [jill-v1.04a] - 2025-11-21

### Fixed: Request Log Missing Data (AsyncLocalStorage Context Loss)

**Problem:** Some 200 OK requests showed `null` for accountId, model, tokens, price.

**Root Cause:** `AsyncLocalStorage` context lost in streaming callbacks. `getRequest()` returned `null` when `recordUsage()` called after SSE stream completes.

**Solution:** Pass `req` object explicitly through callback chain instead of relying on `AsyncLocalStorage`.

**Files Changed:**

- `src/services/apiKeyService.js` - Added optional `req` parameter to `attachRequestLogMeta()`, `recordUsage()`, `recordUsageWithDetails()`
- Route handlers in `src/routes/*.js` - Pass `req` to usage recording functions (api.js, azureOpenaiRoutes.js, geminiRoutes.js, etc.)

---

## [jill-v1.04] - 2025-11-21

### Changed

- Updated request log table header to "API Key" and display `apiKeyName` instead of ID
- Display `accountName` instead of `accountId` in request logs

---

## Version Naming Convention

- `jill-vX.YYz` where:
  - `X` = Major version
  - `YY` = Minor version (zero-padded)
  - `z` = Patch letter (a, b, c...)

---
