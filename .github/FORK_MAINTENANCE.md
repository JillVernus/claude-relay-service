# Fork Maintenance Guide

> **Purpose**: Manual reference for maintaining your fork and syncing with upstream
>
> **Last Updated**: 2025-01-07
> **Automation**: Use `scripts/sync-upstream.sh` for streamlined workflow
> **AI Assistance**: See `MERGE_CONTEXT.md` for conflict resolution help

---

## 📋 Quick Links

- **🤖 Automated Sync**: Use `./scripts/sync-upstream.sh` (recommended)
- **🧠 AI Conflict Help**: Read `MERGE_CONTEXT.md` before resolving conflicts
- **📖 This Guide**: Manual commands for understanding the workflow

---

## 🌳 Branch Structure

```
upstream/main          → Original upstream repository (read-only)
     ↓
upstream (local)       → Clean mirror of upstream/main (no custom code)
     ↓
origin/upstream        → Remote backup of clean mirror
     ↓
main (local)           → Your customized branch with features
     ↓
origin/main            → Remote custom branch (deployed from this)
```

**Key Principles**:
- ✅ **`upstream` branch** = Clean mirror (NEVER add custom code here)
- ✅ **`main` branch** = Your custom features (all work happens here)
- ✅ **`origin/upstream`** = Backup reference of clean upstream
- ✅ **`origin/main`** = Deployed version with your features

---

## 🚀 Recommended Workflow (Automated)

**Use the automation script for regular syncs:**

```bash
# Full sync workflow (interactive)
./scripts/sync-upstream.sh

# Resume from specific step (e.g., after fixing conflicts)
./scripts/sync-upstream.sh -f 5

# Auto-confirm all prompts
./scripts/sync-upstream.sh -y

# Dry run (preview without executing)
./scripts/sync-upstream.sh -d
```

**The script handles**:
1. ✅ Checking out `upstream` branch
2. ✅ Fetching from upstream
3. ✅ Fast-forward merging
4. ✅ Pushing to `origin/upstream`
5. ✅ Merging into `main` branch
6. ✅ Conflict detection and guidance
7. ✅ Verification of custom features

---

## 🔧 Manual Workflow (Step-by-Step)

For understanding or when you need manual control:

### Step 1: Checkout Local Sync Branch

```bash
git checkout upstream
```

**Purpose**: Switch to the clean mirror branch

### Step 2: Fetch Upstream Updates

```bash
git fetch upstream
```

**Check what's new**:
```bash
# See how many commits behind
git rev-list --count HEAD..upstream/main

# Preview new commits
git log --oneline HEAD..upstream/main | head -10
```

### Step 3: Update Local Sync Branch

```bash
git merge --ff-only upstream/main
```

**Should always succeed** (no conflicts expected here).

**If fast-forward fails** (upstream branch has diverged):
```bash
# Safe to reset - this branch has no custom code
git reset --hard upstream/main
```

### Step 4: Push to Remote Mirror

```bash
git push origin upstream
```

**Purpose**: Keep `origin/upstream` as a clean reference

### Step 5: Merge into Custom Branch ⚠️

```bash
git checkout main
git merge upstream -m "Merge upstream updates into main"
```

**If conflicts occur**:
1. 📖 **Read** `.github/MERGE_CONTEXT.md` for context
2. 🤖 **Ask Claude**: "Read .github/MERGE_CONTEXT.md and help resolve conflicts"
3. 🔧 **Resolve** conflicts following strategies in MERGE_CONTEXT.md
4. ✅ **Stage**: `git add <resolved-files>`
5. ✅ **Commit**: `git commit -m "Merge upstream updates (conflicts resolved)"`

### Step 6: Push and Verify

```bash
git push origin main
```

**Verification checklist**:
```bash
# Check critical files exist
ls -la src/routes/admin/requestLogs.js
ls -la src/services/requestLogService.js
ls -la web/admin-spa/src/views/RequestLogsView.vue

# Install dependencies
npm install
cd web/admin-spa && npm install && cd ../..

# Build frontend
npm run build:web

# Run linter
npm run lint:check

# Start dev server
npm run dev
```

---

## ⚔️ Handling Merge Conflicts

### Quick Reference

When conflicts occur during Step 5:

**1. Identify Conflicted Files**:
```bash
git diff --name-only --diff-filter=U
```

**2. Categorize Conflicts** (see MERGE_CONTEXT.md):
- **Custom Feature Files** → Keep ours
- **Middleware Integration** → Merge carefully
- **Router Registration** → Merge both
- **Configuration Files** → Merge dependencies
- **Server Bootstrap** → Merge middleware

**3. Get AI Help**:
```bash
# Ask Claude with context:
"Read .github/MERGE_CONTEXT.md and help resolve conflicts.

Conflicted files:
<paste: git diff --name-only --diff-filter=U>

Conflict details:
<paste: git diff src/middleware/auth.js>
"
```

**4. Resolve and Continue**:
```bash
# After resolving
git add <resolved-files>
git commit -m "Merge upstream updates (conflicts resolved)"
git push origin main
```

### Common Conflict Scenarios

#### Scenario A: Custom Feature File Conflict

**Example**: `src/routes/admin/requestLogs.js`

**Strategy**: **ALWAYS KEEP OURS**
```bash
git checkout --ours src/routes/admin/requestLogs.js
git add src/routes/admin/requestLogs.js
```

**Reason**: This file is 100% custom and doesn't exist upstream

#### Scenario B: Middleware Integration Conflict

**Example**: `src/middleware/auth.js`

**Strategy**: **MERGE CAREFULLY**
- Keep your request logging hooks (lines ~1096-1142)
- Add upstream's new functionality
- Ensure both work together

**Get AI help** for this type - most complex to resolve

#### Scenario C: Configuration File Conflict

**Example**: `package.json`

**Strategy**: **MERGE DEPENDENCIES**
```bash
# Keep both scripts sections
# Keep all dependencies (resolve version conflicts)
# Prefer upstream versions unless your feature breaks
```

---

## 📊 Your Custom Features

**Core Feature**: Request Logging System

**Custom Files** (preserve during conflicts):
- `src/services/requestLogService.js` - Request log service
- `src/routes/admin/requestLogs.js` - `/admin/request-logs` API endpoint
- `src/middleware/requestContext.js` - AsyncLocalStorage context
- `src/utils/requestContext.js` - Context utilities
- `web/admin-spa/src/views/RequestLogsView.vue` - Frontend view

**Modified Files** (contains hooks/integrations):
- `src/middleware/auth.js` - Request ID injection, log emission (lines ~1096-1142)
- `src/routes/admin/index.js` - Route registration (lines 24, 39)
- `web/admin-spa/src/router/index.js` - Router config
- `web/admin-spa/src/components/layout/MainLayout.vue` - Nav link
- `web/admin-spa/src/components/layout/TabBar.vue` - Tab bar link
- `web/admin-spa/src/config/app.js` - Request log version config

**For detailed conflict strategies**, see `MERGE_CONTEXT.md`

---

## 🚨 Emergency Procedures

### If `upstream` Branch Gets Polluted

**Problem**: Accidentally committed custom code to `upstream` branch

**Solution**:
```bash
git checkout upstream
git reset --hard upstream/main
git push -f origin upstream
```

**Safe because**: `upstream` branch should only mirror upstream, no custom work

### If `main` Branch Breaks After Bad Merge

**Problem**: Merge went wrong, features broken

**Solution**:
```bash
# Create backup first
git branch backup-$(date +%Y%m%d-%H%M) main

# Find last working commit
git log main --oneline

# Reset to that commit
git checkout main
git reset --hard <last-working-commit-sha>

# Redo the merge properly (use AI help this time)
git merge upstream

# After fixing conflicts and verifying
git push -f origin main
```

### If You Accidentally Force-Pushed

**Problem**: Teammates lost work due to force push

**Solution**:
```bash
# Find the lost commit in reflog
git reflog show origin/main

# Recover it
git checkout main
git reset --hard <lost-commit-sha>
git push -f origin main

# Notify team immediately
```

---

## 📅 Recommended Sync Schedule

| Frequency | When | Command |
|-----------|------|---------|
| **Weekly** | Monday mornings | `./scripts/sync-upstream.sh` |
| **Before major work** | Starting new feature | `./scripts/sync-upstream.sh` |
| **After upstream release** | When upstream tags new version | `./scripts/sync-upstream.sh` |
| **Monthly minimum** | Even if no changes | `./scripts/sync-upstream.sh` |

**Why regular syncs matter**:
- ✅ Smaller, easier-to-resolve conflicts
- ✅ Stay current with security fixes
- ✅ Easier to track what changed
- ✅ Less merge debt accumulation

---

## ✅ Best Practices

### DO ✅

1. **Use the automation script** - `./scripts/sync-upstream.sh`
2. **Sync regularly** - Weekly or before major work
3. **Read MERGE_CONTEXT.md** - Before resolving conflicts
4. **Test after merging** - Run verification checklist
5. **Keep `upstream` clean** - Never commit custom code there
6. **Document new features** - Update MERGE_CONTEXT.md
7. **Create backups** - Before force pushing
8. **Use AI assistance** - For complex conflicts

### DON'T ❌

1. **Don't commit directly to `upstream`** - It's a mirror only
2. **Don't rebase `main`** - Makes conflict resolution harder
3. **Don't merge `main` into `upstream`** - Flow is one-way only
4. **Don't skip verification** - Always test after merging
5. **Don't force push without backup** - You might lose work
6. **Don't ignore conflicts** - Resolve them properly
7. **Don't forget to update docs** - Keep MERGE_CONTEXT.md current
8. **Don't sync without committing** - Clean working directory first

---

## 🧪 Post-Merge Verification

### Critical File Check

```bash
# Verify request logging system files
ls -la src/routes/admin/requestLogs.js         # ✅ Should exist
ls -la src/services/requestLogService.js       # ✅ Should exist
ls -la web/admin-spa/src/views/RequestLogsView.vue  # ✅ Should exist

# Check route registration
grep "requestLogsRoutes" src/routes/admin/index.js  # ✅ Should find it
```

### Functional Testing

```bash
# 1. Install dependencies
npm install
cd web/admin-spa && npm install && cd ../..

# 2. Build frontend
npm run build:web

# 3. Run linter
npm run lint:check

# 4. Start server
npm run dev

# 5. Test request logs endpoint (in another terminal)
curl http://localhost:3000/admin/request-logs \
  -H "Authorization: Bearer <admin-token>"

# 6. Open admin UI
# Navigate to: http://localhost:3000/web/admin/
# Click "Request Logs" tab
# Verify logs appear in real-time
```

### Automated Tests

```bash
# If you have tests
npm test

# Build Docker image
docker-compose build

# Start in production mode
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

## 📖 Related Documentation

- **`scripts/sync-upstream.sh`** - Automation script (use this for regular syncs)
- **`.github/MERGE_CONTEXT.md`** - AI conflict resolution guide (read before fixing conflicts)
- **`CHANGELOG.md`** - Your feature changelog
- **`web/admin-spa/README.md`** - Frontend documentation
- **`CLAUDE.md`** - Project overview and development guide

---

## 🆘 Getting Help

### When to Use Each Resource

| Situation | Resource |
|-----------|----------|
| Regular sync | `./scripts/sync-upstream.sh` |
| Merge conflicts | Read `MERGE_CONTEXT.md` → Ask Claude |
| Complex conflict | Ask Claude with full context |
| Understanding workflow | This file (`FORK_MAINTENANCE.md`) |
| Emergency recovery | See "Emergency Procedures" above |

### Example AI Prompt

When you need help with conflicts:

```
I have merge conflicts while syncing with upstream.

Context:
1. Read .github/MERGE_CONTEXT.md for my custom features and conflict strategies
2. Read .github/FORK_MAINTENANCE.md for workflow understanding

Conflicted files:
src/middleware/auth.js
package.json

Conflict details for src/middleware/auth.js:
<paste: git diff src/middleware/auth.js>

Please analyze the conflict category and suggest resolution based on 
the strategies in MERGE_CONTEXT.md.
```

---

## 📊 Quick Command Reference

```bash
# ===== Automated Sync (Recommended) =====
./scripts/sync-upstream.sh                    # Full sync
./scripts/sync-upstream.sh -f 5               # Resume from step 5
./scripts/sync-upstream.sh -y                 # Auto-confirm
./scripts/sync-upstream.sh -d                 # Dry run

# ===== Manual Sync (Step-by-Step) =====
git checkout upstream                         # Step 1
git fetch upstream                            # Step 2
git merge --ff-only upstream/main             # Step 3
git push origin upstream                      # Step 4
git checkout main                             # Step 5
git merge upstream                            # Step 5
git push origin main                          # Step 6

# ===== Conflict Resolution =====
git diff --name-only --diff-filter=U          # List conflicts
git add <resolved-files>                      # Stage resolved
git commit -m "Merge upstream (resolved)"     # Commit
git push origin main                          # Push

# ===== Emergency =====
git reset --hard upstream/main                # Reset upstream branch
git reset --hard origin/main                  # Reset main branch
git branch backup-$(date +%Y%m%d) main        # Create backup

# ===== Verification =====
npm run lint:check                            # Check code style
npm run build:web                             # Build frontend
npm run dev                                   # Start dev server
docker-compose build && docker-compose up -d  # Production test
```

---

**Remember**: When in doubt, use the automation script and ask Claude for help with conflicts! 🚀
