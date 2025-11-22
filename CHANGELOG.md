# Changelog

All notable changes to Claude Relay Service will be documented in this file.

---

## [jill-v1.05] - 2025-11-22

### Enhanced: Request Log UI Improvements

#### 1. Flash Effects for Real-time Updates (Stock Trading Style)

Added visual flash effects when request logs update, similar to stock trading platforms:

- **New requests**: Row flashes **blue** for 2 seconds when a request first appears
- **Completed requests**: Row flashes **green** for 2 seconds when status changes from pending to completed

**Implementation Details:**
- Added `_flashState` and `_flashTimestamp` tracking properties to row objects
- CSS keyframe animations with smooth 2-second fade-out effect
- Dark mode compatible with adjusted opacity (0.25 vs 0.3)
- Auto-cleanup: Flash state automatically clears after animation completes

**Colors:**
| Event | Color | RGB |
|-------|-------|-----|
| New request | Blue | rgba(59, 130, 246, 0.3) |
| Completed | Green | rgba(34, 197, 94, 0.3) |

#### 2. Compact Token Display Layout

Reduced token field from 5 lines to 2-3 lines with improved readability:

**Before (5 lines max):**
```
In: 1000
Out: 500
Cache+: 200
Cache Hit: 100
Total: 1800
```

**After (2-3 lines max):**
```
In/Out : ↑1000/↓500
Cache  : ↑200/⚡100    ← only shown when cache exists
Total  : 1800
```

**Features:**
- Fixed-width labels (`w-12`) for aligned ":" separator
- Monospace font (`font-mono`) for consistent number alignment
- Cache line only appears when cache values exist
- Smaller font size (`text-xs` = 12px) for compact display

#### 3. Token Type Symbols with Semantic Colors

Added visual symbols and colors for different token types:

| Token Type | Symbol | Color | Meaning |
|------------|--------|-------|---------|
| Input | ↑ | Green (`text-green-600`) | Tokens sent up (input) |
| Output | ↓ | Blue (`text-blue-600`) | Tokens received (output) |
| Cache Create | ↑ | Green (`text-green-600`) | Cache write |
| Cache Hit | ⚡ | Amber (`text-amber-600`) | Fast retrieval from cache |
| Total | — | Purple (`text-purple-600`) | Consistent with project styling |

#### Files Changed

- `web/admin-spa/src/views/RequestLogsView.vue`
  - Added flash state tracking in `mergeEvents()` function
  - Added `getFlashClass()` helper function
  - Added `hasCache()` helper function
  - Updated token display template with new compact layout
  - Added CSS keyframe animations for flash effects
  - Updated table header from "Tokens (In/Out/Total)" to "Tokens"

---

## [jill-v1.04f] - 2025-11-22

### Fixed: Request Log Sorting - Preserve Start Event Redis Stream ID

#### Problem

When multiple requests arrived in the same second and completed at different times, the request log would not re-sort correctly until ALL requests completed. Even with frequent polling, individual request completions didn't trigger proper re-sorting.

**Example:**
- Request A starts at 10:00:00.100 (Redis Stream ID: `1732233456100-0`)
- Request B starts at 10:00:00.200 (Redis Stream ID: `1732233456200-0`)
- Request A completes at 10:00:01.500 (finish event ID: `1732233457500-0`)
- Request B completes at 10:00:03.800 (finish event ID: `1732233459800-0`)

After Request A completed, it would jump to the top of the list (newer finish ID), breaking chronological order.

#### Root Cause

**Redis Stream ID Overwriting Issue:**

The backend creates **separate Redis Stream entries** for start and finish events:
- `emitStart()` creates entry with ID based on arrival time
- `emitFinish()` creates NEW entry with ID based on completion time

The frontend `mergeEvents()` function (line 156-158) was **overwriting** the start event ID with the finish event ID:

```javascript
// OLD: Always overwrites with latest event ID
if (event.id) {
  existing.id = event.id  // ❌ Replaces arrival time with completion time
}
```

This caused requests to be sorted by **completion time** instead of **arrival time**, breaking chronological order.

#### Solution

**Preserve the start event Redis Stream ID:**

```javascript
// NEW: Only set ID once (from start event)
if (event.id && !existing.id) {
  existing.id = event.id  // ✅ Preserves arrival time
}
```

Now the Redis Stream ID is set from the first event (start) and never changed by subsequent events (finish), ensuring consistent chronological ordering.

**Benefits:**
- ✅ Requests stay in correct chronological order (by arrival time)
- ✅ Re-sorting happens correctly after each individual request completes
- ✅ No visual "jumping" when requests complete at different times
- ✅ Consistent with the design principle: sort by when request started, not when it finished

#### Files Changed

- `web/admin-spa/src/views/RequestLogsView.vue` (line 156-157) - Added `!existing.id` check to preserve start event ID

#### Verification

1. Send 3-4 requests rapidly (within same second)
2. Observe request log page as they complete at different times
3. Verify: Requests maintain chronological order by arrival time
4. Verify: No visual jumping or re-ordering when individual requests complete

---

## [jill-v1.04e] - 2025-11-21

### Fixed: Request Log Ordering - Redis Stream ID as Primary Sort Key

#### Problem

Even after v1.04d fixes, ordering was still incorrect during the **start phase** (pending requests). When multiple requests arrived in the same second:

- Start phase: Showed incorrect order (oldest first)
- Complete phase: Corrected to proper order (newest first)

This created a confusing UX where the 1st request completed while the 2nd was still pending, making it appear out of order.

#### Root Cause

**Inconsistent sorting between start and complete phases:**

- **Start phase**: Used `timestamp` (second precision) → all requests in same second had equal timestamps → tiebreaker used Redis Stream ID
- **Complete phase**: Used `completedAt` (millisecond precision) → different completion times → sorted by completion time
- **Mixed state**: When some requests completed and others were pending, comparison mixed `completedAt` (millisecond) with `timestamp` (second), causing incorrect ordering

#### Solution

**Always use Redis Stream ID as primary sort key:**

```javascript
// OLD: Timestamp primary, Redis ID as tiebreaker
const timeA = new Date(a.completedAt || a.timestamp || 0).getTime()
const timeB = new Date(b.completedAt || b.timestamp || 0).getTime()
if (timeA === timeB && a.id && b.id) {
  return b.id.localeCompare(a.id)
}
return timeB - timeA

// NEW: Redis Stream ID primary, timestamp as fallback
if (a.id && b.id) {
  return b.id.localeCompare(a.id) // Always use Redis Stream ID
}
// Fallback to timestamp only if ID is missing
const timeA = new Date(a.completedAt || a.timestamp || 0).getTime()
const timeB = new Date(b.completedAt || b.timestamp || 0).getTime()
return timeB - timeA
```

**Benefits:**

- ✅ Consistent ordering in both start and complete phases
- ✅ Redis Stream ID has millisecond + sequence precision
- ✅ Always available (both start and finish events)
- ✅ Represents true arrival order

#### Files Changed

- `web/admin-spa/src/views/RequestLogsView.vue` (lines 244-266) - Changed to Redis Stream ID primary sort

#### Verification

1. Send 3-4 requests rapidly (within same second)
2. Observe during **start phase** (pending) - should show correct order (newest first)
3. Observe during **complete phase** - should maintain correct order
4. No visual "jumping" or reordering when requests complete

---

## [jill-v1.04d] - 2025-11-21

### Fixed: Request Log Ordering Within Same Second (Deprecated - See v1.04e)

#### Problem

When multiple requests (2-4) arrived within the same second, they appeared in **reverse order** of arrival. The first request to arrive showed at the bottom of that second's group, and the last request showed at the top.

#### Root Cause (Identified by Codex Review)

**Two bugs in frontend sorting:**

1. **`mergeEvents` only set `id` once**: Used `if (event.id && !existing.id)`, so after the finish event arrived, the row kept the **start event's Redis Stream ID** (older). The tiebreaker compared older IDs, maintaining start-order.

2. **Comparator typo**: `const timeB = new Date(b.completedAt || a.timestamp || 0)` used `a.timestamp` instead of `b.timestamp`. When `completedAt` was missing, both sides collapsed to the same timestamp, and sort fell back to original array order (oldest-first).

#### Solution

**Fixed both bugs:**

1. **Always update Redis Stream ID**: Changed to `if (event.id) existing.id = event.id` to keep the latest ID
2. **Fixed comparator typo**: Changed to `b.completedAt || b.timestamp`

```javascript
// Fix 1: Always use latest Redis Stream ID
if (event.id) existing.id = event.id

// Fix 2: Correct comparator
const timeB = new Date(b.completedAt || b.timestamp || 0).getTime()

// Tiebreaker for same-second requests
if (timeA === timeB && a.id && b.id) {
  return b.id.localeCompare(a.id) // Newer ID = newer request
}
```

Redis Stream IDs have format `<millisecond-timestamp>-<sequence>`, where the sequence increments for events in the same millisecond. String comparison correctly orders them newest-first.

#### Files Changed

- `web/admin-spa/src/views/RequestLogsView.vue`:
  - Line 156: Always update Redis Stream ID (removed `!existing.id` check)
  - Line 240: Fixed comparator typo (`b.timestamp` instead of `a.timestamp`)
  - Lines 242-246: Redis Stream ID tiebreaker

#### Code Review

- ✅ Reviewed by Codex MCP - identified both bugs
- ✅ Backend logic confirmed correct

#### Verification

1. Send 3-4 requests rapidly (within same second)
2. Check Request Logs page
3. Verify: Most recent request appears at the top, even within the same second

---

## [jill-v1.04c] - 2025-11-21

### Fixed: Streaming Request Log Missing Fields

#### Problem

Streaming requests (especially from Claude Code to `/api/v1/messages`) showed missing fields in request logs: API key, account, model, tokens, cost, and sometimes even status.

#### Root Cause

**Timing Issue with Streaming Responses:**

For streaming requests, the response finishes and `res.on('finish')` fires BEFORE the usage callback captures the token data from the SSE stream:

```
1. Request starts → emitStart() called
2. Response streams → res.on('finish') fires → emitFinish() called (missing data!)
3. Usage callback fires → recordUsageWithDetails() → attachRequestLogMeta() (too late!)
```

The `emitFinish()` was called before `req.requestLogMeta` was populated, resulting in null values for all usage-related fields.

#### Solution

**Emit Second Finish Event After Usage Capture:**

Added a second `emitFinish()` call after `recordUsageWithDetails()` completes, which updates the log entry with the captured usage data:

```javascript
apiKeyService
  .recordUsageWithDetails(req.apiKey.id, usageObject, model, accountId, accountType, null, req)
  .then(() => {
    // Emit updated finish event with complete usage data
    const meta = req.requestLogMeta || {}
    requestLogService.emitFinish({
      requestId: req.requestId
      // ... all fields including model, tokens, cost, account
    })
  })
```

The frontend already handles duplicate events by merging them, so the second event updates the existing row with complete data.

#### Files Changed

- `src/routes/api.js` - Added second `emitFinish()` after usage capture for:
  - Claude official streaming (line 239-270)
  - Claude Console streaming (line 351-381)
  - CCR streaming (line 520-550)

#### Verification

1. Send streaming request from Claude Code to `/api/v1/messages`
2. Check Request Logs page - all fields should be populated
3. Verify: API key, account name, model, tokens (in/out/cache), cost, status all visible

---

## [jill-v1.04b] - 2025-11-21

### Fixed: Request Log Issues (Filtering, Loading, Missing Fields)

#### Problems

1. **Management endpoints appearing in logs**: Endpoints starting with `/apiStats/api/...` were incorrectly logged as API Key requests
2. **Delayed loading of new logs**: When navigating to request logs page, old logs loaded instantly but new logs took 3 seconds to appear
3. **Missing fields in some logs**: Some logs showed missing API key, account, model, tokens, cost, and status fields

#### Root Causes

**Issue 1 - Incorrect Regex Matching:**
The regex `/^\/(api|claude|openai|droid|gemini|azure)/` matched `/apiStats/api/...` because it starts with `/api`.

**Issue 2 - Wrong Pagination Direction:**
Initial load used `XRANGE` from beginning ('-'), fetching the OLDEST 200 logs first. Newer logs only appeared after the next 3-second polling cycle.

**Issue 3 - Insufficient Field Validation:**
`emitFinish()` didn't explicitly set null values, and debug logging was too noisy for non-usage requests.

#### Solutions

**Fix 1 - Enhanced Regex with Negative Lookahead (`src/middleware/auth.js:1025`):**

```javascript
// Before
const shouldLogRequest = /^\/(api|claude|openai|droid|gemini|azure)/.test(req.path || '')

// After (case-insensitive, excludes /apiStats)
const shouldLogRequest = /^\/(?!apistats)(api|claude|openai|droid|gemini|azure)/i.test(
  req.path || ''
)
```

**Fix 2 - Reverse Initial Load (`src/services/requestLogService.js:65-73`):**

```javascript
// Use XREVRANGE for initial load to get newest logs first
if (cursor === '0-0') {
  const results = await client.xrevrange(STREAM_KEY, '+', '-', 'COUNT', limit)
  const events = results.map(parseEntry).reverse() // Reverse to maintain chronological order
  // ...
}
```

**Fix 3 - Enhanced Field Handling (`src/middleware/auth.js:1117-1151`):**

- Explicitly set all fields with null fallbacks
- Added smart debug logging that only triggers for API Key requests with actual token usage
- Reduced debug noise by gating warnings on `req.apiKey && tokensTotal !== null`

#### Files Changed

- `src/middleware/auth.js` - Regex fix (line 1025), enhanced logging (lines 1117-1151)
- `src/services/requestLogService.js` - XREVRANGE for initial load (lines 65-73)

#### Trade-offs

- **Pagination limitation**: Initial load shows only the newest 200 logs. Older logs beyond this are not accessible via UI pagination (can view in Winston log files or increase limit).
- **Benefit**: Users see the most recent activity immediately without waiting for polling.

#### Verification

1. Navigate to Request Logs page - newest logs appear immediately
2. Verify no `/apiStats/api/...` endpoints in the log list
3. Check that all completed requests show: API key, account, model, tokens, cost, status
4. Confirm case-insensitive filtering works for `/ApiStats`, `/APISTATS`, etc.

#### Code Review

Changes reviewed by Codex MCP with feedback addressed:

- ✅ Added case-insensitive flag to regex
- ✅ Reduced debug logging noise
- ✅ Documented pagination trade-off

---

## [jill-v1.04a] - 2025-11-21

### Fixed: Request Log Missing Data (AsyncLocalStorage Context Loss)

#### Problem

Some 200 OK requests showed `null` values for `accountId`, `accountName`, `model`, `tokensIn`, `tokensOut`, and `price` in request logs.

#### Root Cause

`AsyncLocalStorage` context was lost in streaming response callbacks. When `recordUsage()` was called inside the usage callback (fired after SSE stream completes), `getRequest()` returned `null` because the callback ran outside the original request's async context.

**Broken Flow:**

```
Route Handler → relayStreamRequestWithUsageCapture(usageCallback)
                         ↓
              usageCallback fires (LOSES AsyncLocalStorage context)
                         ↓
              recordUsage() → attachRequestLogMeta() → getRequest() returns NULL ❌
```

#### Solution

Pass `req` object explicitly through the callback chain instead of relying on `AsyncLocalStorage`.

**Fixed Flow:**

```
Route Handler → usageCallback(req) → recordUsage(..., req) → attachRequestLogMeta(data, req) ✅
```

#### Files Changed

**Core Changes (`src/services/apiKeyService.js`):**

- `attachRequestLogMeta(data, req = null)` - Added optional `req` parameter with fallback to `getRequest()`
- `recordUsage(..., req = null)` - Added `req` as 11th parameter
- `recordUsageWithDetails(..., req = null)` - Added `req` as 8th parameter

**Route Handler Updates:**
| File | Lines | Description |
|------|-------|-------------|
| `src/routes/api.js` | 230, 315, 373, 458, 651 | Claude, Console, Bedrock, CCR stream/non-stream callbacks |
| `src/routes/azureOpenaiRoutes.js` | 82 | Azure OpenAI usage recording |
| `src/routes/geminiRoutes.js` | 758, 1024 | Gemini streaming and non-streaming |
| `src/routes/openaiClaudeRoutes.js` | 285, 373 | OpenAI-to-Claude format conversion |
| `src/routes/openaiGeminiRoutes.js` | 503, 584 | OpenAI-to-Gemini format conversion |
| `src/routes/openaiRoutes.js` | 607, 739 | OpenAI responses format |
| `src/routes/standardGeminiRoutes.js` | 297, 608 | Standard Gemini API |

**Services (No Change Needed):**

- `droidRelayService.js`, `geminiRelayService.js`, etc. use AsyncLocalStorage fallback (no `req` in scope)

#### Verification

- All modified files pass Node.js syntax check
- Backward compatible - `req` defaults to `null`, falls back to `getRequest()`
- No breaking changes to existing API

#### Testing

Send a streaming request and verify request logs show all fields populated:

```bash
curl -X POST "http://localhost:3000/api/v1/messages" \
  -H "x-api-key: cr_xxx" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":50,"stream":true,"messages":[{"role":"user","content":"Hello"}]}'
```

Check Admin UI → Request Logs for: `apiKeyName`, `accountName`, `model`, `tokensIn`, `tokensOut`, `price` (all non-null)

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
