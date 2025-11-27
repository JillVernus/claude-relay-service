# Known Issues

## 200 OK logs missing details for `/api/v1/messages?beta=true`

- **Symptoms:** Request log rows show status/time, but API key, account, model, tokens, and price remain empty.
- **Root cause:** For Claude Code/beta streams, the backend never emits usage data, so `recordUsageWithDetails` is not called and no second `emitFinish` is sent. The SSE parser in `claudeRelayService` only captures usage from `message_start`, `message_delta`, and `message_stop`. The beta variant appears to put usage in a different event/shape that is not parsed, so `usageDataCaptured` stays false and the middleware’s first finish event (with empty metadata) is all the UI receives.
- **Current status:** Frontend merge guards handle null/empty values; `message_stop` is parsed, but beta streams still don’t surface usage through the current parser. Logs remain empty for these requests.
- **Next steps to resolve:**
  1. Capture raw SSE frames for a failing `/api/v1/messages?beta=true` call (first few events) to see where usage fields appear.
  2. Extend the SSE parser in `claudeRelayService` to extract usage from that event/shape.
  3. (Optional safety net) Emit a second `emitFinish` at stream end even when usage is missing, so account/model propagate while tokens/price stay null.

