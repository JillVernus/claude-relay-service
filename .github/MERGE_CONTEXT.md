# Merge Context Document

> **Purpose**: Complete guide for AI-assisted upstream synchronization and conflict resolution
>
> **Last Updated**: 2025-01-07
> **Custom Branch**: `origin/main` > **Upstream**: `upstream/main` (original claude-relay-service)
> **Automation Script**: `scripts/sync-upstream.sh` (for conflict-free syncs)

---

## 🚀 Complete Sync Workflow

### Overview

This section contains the complete upstream synchronization workflow extracted from `sync-upstream.sh`. Follow these steps when syncing upstream changes. When conflicts occur, refer to the [Conflict Resolution Strategies](#%EF%B8%8F-conflict-resolution-strategies) section below.

```
Branch Structure:
  upstream/main      → Original upstream repository (read-only)
       ↓
  origin/upstream    → Mirror of upstream on our remote (clean copy)
       ↓
  origin/main        → Our customized branch (with features)
```

---

### Step 1: Checkout Local Sync Branch

**Purpose**: Switch to the local branch that tracks upstream

**Commands**:

```bash
git checkout upstream
```

**What This Does**:

- Switches to your local `upstream` branch
- This branch should be a clean mirror of `upstream/main`
- No custom code should exist on this branch

**Pre-flight Checks**:

- ✅ Verify no uncommitted changes
- ✅ Confirm `upstream` remote exists: `git remote -v`

---

### Step 2: Fetch Upstream Updates

**Purpose**: Download latest changes from upstream repository

**Commands**:

```bash
git fetch upstream
```

**What This Does**:

- Downloads all new commits from `upstream/main`
- Does NOT modify any local branches yet
- Shows how many commits are new

**Expected Output**:

```
From https://github.com/original/repo
 * branch            main       -> FETCH_HEAD
   abc1234..def5678  main       -> upstream/main
```

**Check Progress**:

```bash
# See how many commits we're behind
git rev-list --count HEAD..upstream/main

# Preview new commits
git log --oneline HEAD..upstream/main | head -10
```

---

### Step 3: Merge Upstream into Local Sync Branch

**Purpose**: Update local `upstream` branch to match `upstream/main` (fast-forward only)

**Commands**:

```bash
git merge --ff-only upstream/main
```

**What This Does**:

- Fast-forward merges (no merge commit needed)
- Ensures `upstream` branch stays clean
- Should NEVER have conflicts (this branch has no custom code)

**If Fast-Forward Fails**:

```
❌ Error: "fatal: Not possible to fast-forward, aborting."

Cause: Local upstream branch has diverged (shouldn't happen!)

Solution:
# Reset to upstream (this is safe - upstream branch has no custom code)
git reset --hard upstream/main
```

**After This Step**:

- `upstream` branch = exact copy of `upstream/main` ✅

---

### Step 4: Push Local Sync Branch to Origin

**Purpose**: Update our remote mirror of upstream

**Commands**:

```bash
git push origin upstream
```

**What This Does**:

- Pushes updated `upstream` branch to our remote repository
- Creates `origin/upstream` as a clean reference point
- Useful for comparing changes later

**Expected Output**:

```
To https://github.com/yourname/repo
   abc1234..def5678  upstream -> upstream
```

**After This Step**:

- `origin/upstream` = latest upstream code ✅
- Available for teammates to reference

---

### Step 5: Merge Sync Branch into Feature Branch ⚠️ **CONFLICT ZONE**

**Purpose**: Merge upstream changes into our customized `main` branch

**Commands**:

```bash
git checkout main
git merge upstream -m "Merge upstream updates into main"
```

**What This Does**:

- Switches to your `main` branch (with custom features)
- Attempts to merge `upstream` branch
- **This is where conflicts typically occur**

**Success Scenario** ✅:

```
Auto-merging src/some-file.js
Merge made by the 'recursive' strategy.
 5 files changed, 120 insertions(+), 30 deletions(-)
```

**Conflict Scenario** ⚠️:

```
Auto-merging src/middleware/auth.js
CONFLICT (content): Merge conflict in src/middleware/auth.js
Auto-merging src/routes/admin/index.js
CONFLICT (content): Merge conflict in src/routes/admin/index.js
Automatic merge failed; fix conflicts and then commit the result.
```

---

### 🔥 Step 5A: Handling Merge Conflicts (AI-Assisted)

**When conflicts occur, STOP and follow this process:**

#### 1. **Identify Conflicted Files**

```bash
# List all conflicted files
git diff --name-only --diff-filter=U
```

**Example Output**:

```
src/middleware/auth.js
src/routes/admin/index.js
package.json
```

#### 2. **Analyze Each Conflict with AI**

**For EACH conflicted file**, provide AI with this context:

```
File: src/middleware/auth.js

Conflict Preview:
<paste output of: git diff src/middleware/auth.js>

Questions for AI:
1. What is the conflict category? (See categories below)
2. What resolution strategy should I use?
3. Can you show me the exact resolved version?
```

#### 3. **Apply Resolution Based on Category**

Jump to the appropriate section below:

- [Category 1: Custom Feature Files](#category-1-custom-feature-files-always-preserve-ours)
- [Category 2: Middleware Integration](#category-2-middleware-integration-merge-carefully)
- [Category 3: Router Registration](#category-3-router-registration-merge-both)
- [Category 4: Configuration Files](#category-4-configuration-files-merge-dependencies)
- [Category 5: Server Bootstrap](#category-5-server-bootstrap-merge-middleware)

#### 4. **Stage Resolved Files**

```bash
# After resolving each file
git add <resolved-file>

# Verify no unresolved conflicts remain
git diff --name-only --diff-filter=U
# (should be empty)
```

#### 5. **Complete the Merge**

```bash
# Create merge commit
git commit -m "Merge upstream updates into main (conflicts resolved)"
```

**DO NOT**:

- ❌ Use `git merge --abort` unless you want to start over
- ❌ Skip files with conflicts
- ❌ Commit with unresolved conflicts

---

### Step 6: Push Feature Branch and Verify

**Purpose**: Push merged changes and validate custom features still work

**Commands**:

```bash
git push origin main
```

**What This Does**:

- Pushes merged `main` branch to remote
- Makes changes available to teammates
- Triggers CI/CD if configured

**Verification Checklist** ✅:

```bash
# 1. Check critical files exist
ls -la src/routes/admin/requestLogs.js
ls -la src/services/requestLogService.js
ls -la web/admin-spa/src/views/RequestLogsView.vue

# 2. Install dependencies
npm install
cd web/admin-spa && npm install && cd ../..

# 3. Build frontend
npm run build:web

# 4. Lint check
npm run lint:check

# 5. Start dev server
npm run dev

# 6. Test request logging endpoint
curl http://localhost:3000/admin/request-logs \
  -H "Authorization: Bearer <admin-token>"

# 7. Open admin UI and verify
# http://localhost:3000/web/admin/ → Request Logs tab
```

**Success Criteria**:

- ✅ All critical files present
- ✅ No build errors
- ✅ No lint errors
- ✅ Server starts without errors
- ✅ Request logs visible in admin UI
- ✅ New requests appear in real-time

**If Verification Fails**:

- Review merge conflicts again
- Check [Post-Merge Validation](#-post-merge-validation) section
- Consider rolling back: `git reset --hard origin/main` (if not pushed yet)

---

## 📋 Quick Command Reference

```bash
# Full workflow (no conflicts)
git checkout upstream
git fetch upstream
git merge --ff-only upstream/main
git push origin upstream
git checkout main
git merge upstream -m "Merge upstream updates"
git push origin main

# Resume after fixing conflicts
git add <resolved-files>
git commit -m "Merge upstream updates (conflicts resolved)"
git push origin main

# Abort if needed
git merge --abort
git checkout main
```

---

## 🎯 Using the Automation Script

The `scripts/sync-upstream.sh` script automates the above workflow:

```bash
# Run full workflow interactively
./scripts/sync-upstream.sh

# Resume from Step 5 (after fixing conflicts)
./scripts/sync-upstream.sh -f 5

# Stop after Step 4 (before merging into main)
./scripts/sync-upstream.sh -s 4

# Auto-confirm all prompts
./scripts/sync-upstream.sh -y

# Dry run (show commands without executing)
./scripts/sync-upstream.sh -d
```

**When to use the script**:

- ✅ Quick syncs when you expect no conflicts
- ✅ Resuming after manual conflict resolution
- ❌ NOT recommended for complex conflicts (use manual workflow with AI)

---

## 🎯 Core Custom Features

### 1. **Request Logging System** ⭐ (Primary Feature)

**Purpose**: Real-time request/response logging with detailed metrics, visible in admin UI

**Architecture**:

- **Storage**: Redis Streams (`request:logs`)
- **Backend Service**: `src/services/requestLogService.js`
- **API Endpoint**: `src/routes/admin/requestLogs.js` (`GET /admin/request-logs`)
- **Frontend View**: `web/admin-spa/src/views/RequestLogsView.vue`
- **Middleware Integration**:
  - `src/middleware/requestContext.js` - AsyncLocalStorage context
  - `src/utils/requestContext.js` - Context utilities
  - `src/middleware/auth.js` - Request ID injection, log emission

**Key Implementation Details**:

```javascript
// Request lifecycle logging
1. Request enters → `requestLogService.emitStart()` (auth.js ~line 1134)
2. Request processed → context tracked via AsyncLocalStorage
3. Response sent → `requestLogService.emitFinish()` with metrics
4. Frontend polls → `/admin/request-logs` endpoint for real-time updates
```

**Data Flow**:

```
Incoming Request
  ↓
auth.js middleware (adds requestId, emits start event)
  ↓
requestContext middleware (AsyncLocalStorage)
  ↓
Business logic execution
  ↓
Response interceptor (captures error messages)
  ↓
requestLogService.emitFinish() (with tokens, cost, duration)
  ↓
Redis Stream (request:logs)
  ↓
Admin UI polling (RequestLogsView.vue)
```

**Files Involved**:

- ✅ **Must preserve**: `src/services/requestLogService.js`
- ✅ **Must preserve**: `src/routes/admin/requestLogs.js`
- ✅ **Must preserve**: `web/admin-spa/src/views/RequestLogsView.vue`
- ⚠️ **Contains hooks**: `src/middleware/auth.js` (lines ~1096-1142)
- ⚠️ **Contains hooks**: `src/middleware/requestContext.js` (entire file)
- ⚠️ **Contains hooks**: `src/utils/requestContext.js` (entire file)
- ⚠️ **Router config**: `src/routes/admin/index.js` (line 24, 39)

---

### 2. **Admin SPA Enhancements**

**Custom Views & Components**:

- `web/admin-spa/src/views/RequestLogsView.vue` - Request logs page
- `web/admin-spa/src/components/layout/MainLayout.vue` - Added nav link
- `web/admin-spa/src/components/layout/TabBar.vue` - Added tab bar link
- `web/admin-spa/src/router/index.js` - Route config for `/request-logs`

**Version Management**:

- `web/admin-spa/src/config/app.js` - `requestLogVersion` config
- Build-time version injection from `FEAT-VERSION` file
- Version displayed in admin UI

**Dependencies** (web/admin-spa/package.json):

```json
{
  "vue": "^3.3.4",
  "element-plus": "^2.4.4",
  "chart.js": "^4.4.0",
  "xlsx": "^0.18.5",
  "xlsx-js-style": "^1.2.0"
}
```

---

### 3. **Browser Fallback Support**

**File**: `src/middleware/browserFallback.js` (lines ~42-67)

**Purpose**: Allow Chrome extension and browser requests by impersonating `claude-cli`

**Key Logic**:

```javascript
// Detects browser/extension requests
// Sets User-Agent to 'claude-cli/1.0.110 (external, cli, browser-fallback)'
// Adds anthropic-dangerous-direct-browser-access header
```

---

### 4. **Cost Calculation Enhancements**

**Files**:

- `src/routes/admin/requestLogs.js` - Uses cost calculation utilities
- Cost breakdown for different account types
- Support for cache tokens (create/read)

**Account Type Mapping**:

```javascript
const accountTypeNames = {
  claude: 'Claude官方',
  'claude-console': 'Claude Console',
  ccr: 'Claude Console Relay',
  openai: 'OpenAI'
  // ... etc
}
```

---

## 🔧 Modified Upstream Files

### High-Impact Modifications

| File                        | Modification          | Risk Level | Notes                                                     |
| --------------------------- | --------------------- | ---------- | --------------------------------------------------------- |
| `src/middleware/auth.js`    | Request logging hooks | 🔴 HIGH    | Lines ~1096-1142: Request ID, log emission, error capture |
| `src/routes/admin/index.js` | Route registration    | 🟡 MEDIUM  | Line 24, 39: Import and mount requestLogs router          |
| `src/server.js`             | Middleware chain      | 🟡 MEDIUM  | Likely adds `requestContextMiddleware`                    |

### Low-Impact Modifications

| File              | Modification         | Risk Level | Notes                       |
| ----------------- | -------------------- | ---------- | --------------------------- |
| `package.json`    | Scripts/dependencies | 🟢 LOW     | Build scripts for admin SPA |
| `web/admin-spa/*` | Entire directory     | 🟢 LOW     | Isolated frontend code      |

---

## ⚔️ Conflict Resolution Strategies

### Category 1: Custom Feature Files (ALWAYS PRESERVE OURS)

**Files**:

- `src/services/requestLogService.js`
- `src/routes/admin/requestLogs.js`
- `src/middleware/requestContext.js`
- `src/utils/requestContext.js`
- `web/admin-spa/src/views/RequestLogsView.vue`

**Strategy**:

```bash
# Always keep our version
git checkout --ours <file>
```

**Rationale**: These files are 100% custom and don't exist upstream.

---

### Category 2: Middleware Integration (MERGE CAREFULLY)

**File**: `src/middleware/auth.js`

**Common Conflict Scenarios**:

#### Scenario A: Upstream modifies middleware chain

```diff
<<<<<<< HEAD (ours)
+ const requestId = uuid.v4()
+ req.requestId = requestId
+ res.setHeader('X-Request-ID', requestId)
+
+ // Request log emission
+ if (shouldLogRequest) {
+   requestLogService.emitStart({ requestId, ... })
+ }
=======
// Upstream added new auth logic here
>>>>>>> upstream/main
```

**Resolution**: **MERGE BOTH**

- Keep our request logging logic
- Add upstream's new auth logic
- Ensure our hooks run at appropriate lifecycle points

#### Scenario B: Upstream changes request handling flow

**Action**:

1. Understand upstream's change (performance? security?)
2. Adapt our logging hooks to fit new flow
3. Test that logs still emit correctly

---

### Category 3: Router Registration (MERGE BOTH)

**File**: `src/routes/admin/index.js`

**Strategy**:

```javascript
// Keep both upstream routes AND our custom routes
const requestLogsRoutes = require('./requestLogs') // Our addition

// Mount all routes
router.use('/', upstreamRoute1)
router.use('/', upstreamRoute2)
router.use('/', requestLogsRoutes) // Our addition
```

**Principle**: Additive - we're adding routes, not replacing

---

### Category 4: Configuration Files (MERGE DEPENDENCIES)

**File**: `package.json`

**Strategy**:

```json
{
  "scripts": {
    // Merge: Keep upstream scripts + our custom scripts
    "build:web": "cd web/admin-spa && npm run build", // Ours
    "upstream-script": "..." // Theirs
  },
  "dependencies": {
    // Merge: Keep all dependencies, resolve version conflicts
    // If version conflict → prefer upstream version unless our feature breaks
  }
}
```

---

### Category 5: Server Bootstrap (MERGE MIDDLEWARE)

**File**: `src/server.js` (or `src/app.js`)

**Expected Conflict**: Middleware registration order

**Strategy**:

```javascript
// Our requestContext middleware should be early in the chain
app.use(requestContextMiddleware) // Ours - needs to be EARLY
app.use(express.json())
app.use(otherMiddleware)
app.use(authMiddleware)
```

**Principle**: AsyncLocalStorage context must be established before request processing

---

## 🛡️ Conflict Prevention Rules

### Rule 1: Preserve Custom Hooks

**Watch for**: Upstream removing or relocating code sections where we've added hooks

**Example**:

```javascript
// If upstream refactors auth.js and moves request handling
// → We need to move our requestLogService.emit*() calls too
```

### Rule 2: Maintain Middleware Order

**Critical**: `requestContextMiddleware` must run before business logic

### Rule 3: Dependency Version Conflicts

**Strategy**:

- Minor version differences → Accept upstream's version
- Major version changes → Test our features thoroughly
- New dependencies → Accept unless conflicts with ours

### Rule 4: Database Schema Changes

**Watch for**: Upstream adding Redis keys that conflict with `request:logs` stream

**Current Custom Keys**:

- `request:logs` (Redis Stream, max 5000 entries)

---

## 🧪 Post-Merge Validation

### Must-Run Checks After Conflict Resolution

```bash
# 1. Verify critical files exist
ls -la src/routes/admin/requestLogs.js
ls -la src/services/requestLogService.js
ls -la web/admin-spa/src/views/RequestLogsView.vue

# 2. Install dependencies
npm install
cd web/admin-spa && npm install && cd ../..

# 3. Build frontend
npm run build:web

# 4. Lint check
npm run lint:check

# 5. Start dev server
npm run dev

# 6. Test request logging
curl http://localhost:3000/admin/request-logs \
  -H "Authorization: Bearer <admin-token>"

# 7. Open admin UI
# Navigate to http://localhost:3000/web/admin/ → Request Logs
# Verify logs appear in real-time
```

### Functional Tests

- [ ] Request logs visible in admin UI
- [ ] New requests appear in real-time
- [ ] Cost calculation works for all account types
- [ ] No errors in browser console
- [ ] No errors in server logs (`logs/combined.log`)

---

## 📊 Feature Dependencies

```
Request Logging Feature
├─ Depends on: Redis (ioredis)
├─ Depends on: Express middleware chain
├─ Depends on: uuid (for requestId generation)
├─ Depends on: AsyncLocalStorage (Node.js built-in)
│
├─ Hooks into:
│   ├─ src/middleware/auth.js (request ID, log emission)
│   ├─ src/routes/admin/index.js (route registration)
│   └─ src/server.js (middleware registration)
│
└─ Frontend Dependencies:
    ├─ Vue 3 + Vue Router
    ├─ Element Plus (UI components)
    ├─ Chart.js (visualizations)
    └─ xlsx (export functionality)
```

---

## 🚨 Known Conflict Hotspots

### Hotspot 1: `src/middleware/auth.js`

**Likelihood**: 🔴 **HIGH**
**Reason**: Core authentication logic changes frequently upstream
**Our Modifications**: Lines ~1096-1142 (request logging integration)

### Hotspot 2: `src/routes/admin/index.js`

**Likelihood**: 🟡 **MEDIUM**
**Reason**: New admin routes added upstream
**Our Modifications**: Lines 24, 39 (import and mount)

### Hotspot 3: `package.json`

**Likelihood**: 🟡 **MEDIUM**
**Reason**: Dependency updates, new scripts
**Our Modifications**: `build:web`, `install:web` scripts

### Hotspot 4: `src/server.js`

**Likelihood**: 🟢 **LOW**
**Reason**: Server structure is relatively stable
**Our Modifications**: `requestContextMiddleware` registration

---

## 💡 AI Assistant Guidelines

When helping resolve conflicts:

1. **Understand the upstream change first**

   - What problem is upstream solving?
   - Is it a bug fix, feature, or refactor?

2. **Identify conflict type** (use categories above)

3. **Apply resolution strategy**

   - Custom files → Keep ours
   - Hooks/integrations → Merge carefully, maintain functionality
   - Dependencies → Prefer upstream unless breaking

4. **Verify business logic**

   - Ensure request logging still works end-to-end
   - Check that custom features aren't broken by upstream changes

5. **Suggest validation steps**
   - Specific tests to run
   - Files to manually inspect

---

## 📝 Maintenance Notes

### When to Update This Document

- ✅ After adding new custom features
- ✅ After modifying upstream files with new hooks
- ✅ After resolving complex merge conflicts (document lessons learned)
- ✅ Every 3 months (regular review)

### Version History

- **2025-01-07**: Initial version (documented request logging system)

---

## 🔗 Related Documentation

- `.github/WORKFLOW_GUIDE.md` - Complete workflow guide
- `scripts/sync-upstream.sh` - Automated sync script
- `web/admin-spa/README.md` - Frontend documentation
- `CHANGELOG.md` - Feature changelog

---

## 📞 Emergency Contacts

If merge becomes too complex or breaks critical features:

1. **Abort the merge**: `git merge --abort`
2. **Review this document** carefully
3. **Ask AI assistant** to analyze specific conflict with full context
4. **Test incrementally** - resolve one file at a time

---

**Remember**: When in doubt, preserve our custom features first, then carefully integrate upstream improvements. Our request logging system is the core value-add of this fork.
