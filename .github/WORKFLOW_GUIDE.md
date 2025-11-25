# Git Workflow Guide for Fork with Custom Features

## Overview
This guide explains how to maintain a fork with custom features while regularly syncing with upstream.

## Branch Strategy

- **`main`**: Clean mirror of `upstream/main` (no custom code)
- **`feature/request-logs`**: Main + custom features (build from this)
- **`upstream`**: Remote tracking the original repository

## Regular Workflow

### 1. Sync upstream updates (weekly/as needed)

```bash
# Make sure you're on main
git checkout main

# Fetch latest from upstream
git fetch upstream

# Fast-forward main to match upstream (should be clean merge)
git merge --ff-only upstream/main

# If --ff-only fails, your main has custom commits (bad state)
# In that case, reset it: git reset --hard upstream/main

# Push updated main to your fork
git push origin main
```

### 2. Merge upstream updates into your feature branch

```bash
# Switch to your feature branch
git checkout feature/request-logs

# Merge the updated main into your feature branch
git merge main -m "Merge upstream updates into feature/request-logs"

# If conflicts occur:
# - Resolve them carefully (preserve your custom features)
# - Always check that /request-logs route is preserved
# - git add <resolved-files>
# - git commit

# Push updated feature branch
git push origin feature/request-logs
```

### 3. Build and deploy

```bash
# Build Docker image from feature branch
docker build -t claude-relay-service:latest .

# Or use docker-compose
docker-compose build
```

## Handling Merge Conflicts

When merging main into feature branch:

1. **Identify your custom code**:
   ```bash
   # List files with your custom features
   git diff main...feature/request-logs --name-only
   ```

2. **During conflict resolution**:
   - **KEEP**: Your custom feature code (request-logs route, etc.)
   - **ACCEPT**: Upstream improvements to other files
   - **MERGE**: If both modified the same file

3. **Verify critical features after merge**:
   ```bash
   # Check request-logs route exists
   grep -n "request-logs" src/routes/admin.js

   # Check requestLogService exists
   ls -la src/services/requestLogService.js

   # Check frontend view exists
   ls -la web/admin-spa/src/views/RequestLogsView.vue
   ```

## Emergency: If You Mess Up

### If main has custom commits (should be clean):
```bash
git checkout main
git reset --hard upstream/main
git push -f origin main
```

### If feature branch breaks after bad merge:
```bash
# Create backup
git branch backup-$(date +%Y%m%d) feature/request-logs

# Find last working commit
git log feature/request-logs --oneline

# Reset to that commit
git checkout feature/request-logs
git reset --hard <last-working-commit>

# Redo the merge properly
git merge main

# Force push (since we rewrote history)
git push -f origin feature/request-logs
```

## Best Practices

1. **Never commit directly to main** - it should only receive upstream updates
2. **Always work in feature/request-logs** - this is your integration branch
3. **Test after every merge** - build and verify features work
4. **Keep main in sync regularly** - smaller, frequent merges are easier
5. **Document your custom features** - helps during conflict resolution

## Your Custom Features (as of v1.06)

Files with custom code:
- `src/routes/admin.js` - `/request-logs` route (line ~9804)
- `src/services/requestLogService.js` - Request log service
- `src/middleware/auth.js` - Request log polling exceptions
- `src/middleware/requestContext.js` - Request context handling
- `src/utils/requestContext.js` - Request context utilities
- `src/services/apiKeyService.js` - API key name resolution
- `web/admin-spa/src/views/RequestLogsView.vue` - Frontend view
- `web/admin-spa/src/router/index.js` - Router config
- `web/admin-spa/src/components/layout/MainLayout.vue` - Nav link
- `web/admin-spa/src/components/layout/TabBar.vue` - Tab bar link
- `web/admin-spa/src/config/app.js` - Request log version config
- `CHANGELOG.md` - Your feature changelog

When merging, ensure these files preserve your changes.

## Quick Reference

```bash
# Weekly sync routine
git checkout main && git fetch upstream && git merge --ff-only upstream/main && git push origin main
git checkout feature/request-logs && git merge main && git push origin feature/request-logs

# Check feature health
grep "request-logs" src/routes/admin.js && echo "✅ Route OK"

# Build and deploy
docker-compose build && docker-compose up -d
```

## What NOT to Do

❌ Don't commit features to main
❌ Don't rebase feature branch (merge conflicts will be harder)
❌ Don't merge feature into main (main should stay clean)
❌ Don't forget to test after merging
❌ Don't force push without a backup branch
