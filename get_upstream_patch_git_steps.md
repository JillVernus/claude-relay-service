# Syncing Fork with Upstream - Complete Guide

## Repository Setup Overview

```
Upstream (Original)  →  Origin (Your Fork)  →  Local Clone
     ↓                        ↓                      ↓
 upstream/main           origin/main           local main
                         origin/feature-*       local feature-*
```

**Remotes:**
- `upstream`: The original repository you forked from
- `origin`: Your fork on GitHub
- `local`: Your working copy on your machine

**Branches:**
- `main`: Main development branch (synced with upstream)
- `feature/request-logs`: Your feature branch with custom changes

---

## Prerequisites - One-Time Setup

If you haven't set up the upstream remote yet:

```bash
# Add upstream remote (only needed once)
git remote add upstream <original-repo-url>

# Verify remotes
git remote -v
# Should show:
# origin    https://github.com/YourUsername/repo.git (fetch)
# origin    https://github.com/YourUsername/repo.git (push)
# upstream  https://github.com/OriginalOwner/repo.git (fetch)
# upstream  https://github.com/OriginalOwner/repo.git (push)
```

---

## Complete Workflow: Syncing Fork with Upstream Updates

### Step 1: Switch to Main Branch

```bash
git checkout main
```

**Purpose:** Start from your main branch to receive upstream updates.

---

### Step 2: Fetch Latest Changes from Upstream

```bash
git fetch upstream
```

**Purpose:** Download latest commits from upstream without modifying your local files.

---

### Step 3: Merge Upstream Changes into Local Main

```bash
git merge upstream/main
```

**Expected outcomes:**

#### ✅ **No Conflicts (Fast-forward or Auto-merge)**
```
Updating abc1234..def5678
Fast-forward
 file1.js | 10 +++++-----
 file2.js | 5 +++--
 2 files changed, 8 insertions(+), 7 deletions(-)
```
→ Continue to Step 4

#### ⚠️ **Merge Conflicts**
```
Auto-merging src/routes/admin.js
CONFLICT (content): Merge conflict in src/routes/admin.js
Automatic merge failed; fix conflicts and then commit the result.
```
→ See **"Handling Merge Conflicts"** section below

---

### Step 4: Resolve Conflicts (If Any)

#### 4.1 Open Conflicted Files in VS Code

- **Source Control Panel**: Files with conflicts show under "Merge Changes"
- **File View**: Conflict markers appear with inline resolution buttons

#### 4.2 Understand Conflict Markers

```javascript
<<<<<<< HEAD (Current Change - Your Fork)
// Your code
=======
>>>>>>> upstream/main (Incoming Change - Upstream)
// Upstream code
```

#### 4.3 Resolve Using VS Code

**Options:**
- **Accept Current Change**: Keep your version
- **Accept Incoming Change**: Use upstream version
- **Accept Both Changes**: Keep both (be careful - may need manual editing)
- **Compare Changes**: Open 3-way merge editor for detailed comparison

**Guidelines:**
- Independent additions (different functions/routes) → Accept Both Changes
- Modified same code → Manual merge or choose one version
- Test that the result makes logical sense

#### 4.4 Stage and Commit Resolution

```bash
# Stage resolved files
git add <resolved-file>

# Complete the merge
git commit
# (Git will provide a default merge commit message)
```

**Verify:**
```bash
git status
# Should show: "nothing to commit, working tree clean"
```

---

### Step 5: Handle Remote Main Divergence (If Needed)

If `git push origin main` fails with:
```
! [rejected]        main -> main (fetch first)
```

This means your fork's `origin/main` has commits you don't have locally.

```bash
# Fetch and merge remote changes
git pull origin main --no-rebase --no-edit

# If there are conflicts (usually in VERSION or auto-generated files)
# Resolve them the same way as Step 4

# Push the merged result
git push origin main
```

---

### Step 6: Update Your Feature Branch

```bash
# Switch to feature branch
git checkout feature/request-logs

# Merge updated main into feature branch
git merge main
```

**Expected outcomes:**

#### ✅ **No Conflicts**
```
Merge made by the 'ort' strategy.
 21 files changed, 2752 insertions(+), 325 deletions(-)
```
→ Continue to Step 7

#### ⚠️ **Conflicts**
Resolve using the same process as Step 4.

**Common conflicts in feature branches:**
- Modified same function signatures (e.g., `recordUsage` parameters)
- Updated imports or dependencies
- Changes to shared utility files

**Resolution tips:**
- Feature branch changes often take precedence (Accept Current)
- But verify upstream improvements aren't lost
- Keep the most complete/correct version (e.g., full function signature)

```bash
# After resolving conflicts
git add <resolved-files>
git commit
```

---

### Step 7: Push Updated Branches

```bash
# Push updated feature branch
git push origin feature/request-logs

# Push updated main (if not done in Step 5)
git push origin main
```

---

## Verification Checklist

After completing all steps:

```bash
# Check branch status
git status
# Expected: "nothing to commit, working tree clean"

# Check main branch sync
git checkout main
git log --oneline -5
# Should include recent upstream commits

# Check feature branch sync
git checkout feature/request-logs
git log --oneline -5
# Should include both upstream updates and your feature commits

# Verify remotes are in sync
git fetch --all
git status
# Expected: "Your branch is up to date with 'origin/...'
```

---

## Troubleshooting

### Problem: "I accidentally chose the wrong conflict resolution"

**Solution:**
```bash
# If you haven't committed yet
git checkout --conflict=merge <file>
# This restores the conflict markers - resolve again

# If you already committed
git reset --soft HEAD~1
# Uncommit, keeping changes staged - resolve and commit again
```

---

### Problem: "Too many conflicts, want to start over"

**Solution:**
```bash
# Abort the merge
git merge --abort

# Start fresh from Step 3
```

---

### Problem: "Feature branch push rejected after merge"

**Solution:**
```bash
# If your feature branch is only used by you
git push origin feature/request-logs --force-with-lease

# WARNING: Only use if you're the only one working on this branch
```

---

### Problem: "Can't see conflict markers in VS Code"

**Solution:**
```bash
# Check if conflict exists
git status
# Look for "Unmerged paths: both modified: ..."

# Search for conflict markers in file
grep -n "<<<\|>>>" <file>

# Recreate markers if accidentally removed
git checkout --conflict=merge <file>
```

---

## Alternative: Rebase Instead of Merge

**When to use rebase:**
- Feature branch has never been pushed to remote
- You want a linear commit history
- No conflicts expected

**Steps:**
```bash
# Instead of Step 6 (merge)
git checkout feature/request-logs
git rebase main

# If conflicts occur, resolve and:
git add <resolved-files>
git rebase --continue

# Force push (rebase rewrites history)
git push origin feature/request-logs --force-with-lease
```

**⚠️ Use merge (not rebase) if:**
- Feature branch is shared with others
- You've already pushed the feature branch
- You prefer preserving exact commit history

---

## Best Practices

1. **Sync regularly**: Don't wait weeks between upstream syncs
2. **Commit before syncing**: Always have a clean working tree
3. **Read conflict context**: Understand what both sides changed
4. **Test after merging**: Ensure code still works after conflict resolution
5. **Keep feature branches focused**: Smaller changes = fewer conflicts
6. **Document custom changes**: Know which code is yours vs upstream

---

## Quick Reference Commands

```bash
# Full sync workflow (no conflicts)
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
git checkout feature/request-logs
git merge main
git push origin feature/request-logs

# Check sync status
git fetch --all
git log --oneline --graph --all --decorate -10

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Abort ongoing merge
git merge --abort
```

---

## Your Specific Setup

- **Upstream**: Original claude-relay-service repository
- **Origin**: Your fork (JillVernus/claude-relay-service)
- **Feature Branch**: `feature/request-logs`
- **Main conflicts**: Usually in `src/routes/admin.js`, `src/services/*`

**Typical conflict resolution:**
- Route additions: Accept Both Changes (upstream first)
- Function signature updates: Accept Current (feature branch) if you have newer params
- Version bumps: Accept higher version number
- Auto-generated files: Accept Incoming (upstream)

---

**Last Updated:** 2025-11-25
**Status:** Tested and verified with actual merge workflow
