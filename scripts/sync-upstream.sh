#!/bin/bash

# ==============================================================================
# Upstream Sync Workflow Script
# Based on .github/WORKFLOW_GUIDE.md
# ==============================================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
UPSTREAM_REMOTE="upstream"
ORIGIN_REMOTE="origin"
UPSTREAM_BRANCH_NAME="main"      # Branch name on the upstream remote
LOCAL_SYNC_BRANCH="upstream"     # Local branch that tracks upstream
FEATURE_BRANCH="main"            # Your customized branch

# Parse arguments
STOP_AT_STEP=""
AUTO_YES=false
DRY_RUN=false

print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -s, --stop-at STEP    Stop after specified step (1-6)"
    echo "  -y, --yes             Auto-confirm all prompts"
    echo "  -d, --dry-run         Show what would be done without executing"
    echo "  -h, --help            Show this help message"
    echo ""
    echo "Steps:"
    echo "  1. Checkout local sync branch (upstream)"
    echo "  2. Fetch upstream remote"
    echo "  3. Merge upstream/main into local sync branch (fast-forward)"
    echo "  4. Push local sync branch to origin"
    echo "  5. Checkout feature branch (main) and merge sync branch"
    echo "  6. Push feature branch and verify"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run full workflow interactively"
    echo "  $0 -s 4               # Stop after pushing main"
    echo "  $0 -y                 # Run without confirmations"
    echo "  $0 -d                 # Dry run (show commands only)"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--stop-at)
            STOP_AT_STEP="$2"
            shift 2
            ;;
        -y|--yes)
            AUTO_YES=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            print_usage
            exit 1
            ;;
    esac
done

# Helper functions
print_step() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step $1:${NC} $2"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_cmd() {
    echo -e "${YELLOW}$ $1${NC}"
}

run_cmd() {
    print_cmd "$1"
    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}  (dry run - skipped)${NC}"
    else
        eval "$1"
    fi
}

confirm() {
    if [ "$AUTO_YES" = true ]; then
        return 0
    fi
    echo ""
    read -p "$(echo -e ${YELLOW}"Continue? [Y/n]: "${NC})" -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo -e "${RED}Aborted by user${NC}"
        exit 1
    fi
}

check_stop() {
    if [ "$STOP_AT_STEP" = "$1" ]; then
        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}Stopped after step $1 as requested${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        exit 0
    fi
}

# Pre-flight checks
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Upstream Sync Workflow${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN MODE - No changes will be made${NC}"
fi

if [ -n "$STOP_AT_STEP" ]; then
    echo -e "${YELLOW}Will stop after step $STOP_AT_STEP${NC}"
fi

echo ""
echo "Checking prerequisites..."

# Check if upstream remote exists
if ! git remote | grep -q "^${UPSTREAM_REMOTE}$"; then
    print_error "Upstream remote '${UPSTREAM_REMOTE}' not found"
    echo "Add it with: git remote add upstream <upstream-url>"
    exit 1
fi
print_success "Upstream remote exists"

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --staged --quiet; then
    print_warning "You have uncommitted changes"
    git status --short
    confirm
fi

# Show current state
echo ""
echo "Current branch: $(git branch --show-current)"
echo "Upstream URL: $(git remote get-url $UPSTREAM_REMOTE)"

confirm

# ==============================================================================
# Step 1: Checkout local sync branch
# ==============================================================================
print_step "1" "Checkout local sync branch ($LOCAL_SYNC_BRANCH)"

run_cmd "git checkout $LOCAL_SYNC_BRANCH"

print_success "On $LOCAL_SYNC_BRANCH branch"
check_stop "1"

# ==============================================================================
# Step 2: Fetch upstream
# ==============================================================================
print_step "2" "Fetch upstream updates"

run_cmd "git fetch $UPSTREAM_REMOTE"

# Show what's new
if [ "$DRY_RUN" = false ]; then
    BEHIND=$(git rev-list --count HEAD..$UPSTREAM_REMOTE/$UPSTREAM_BRANCH_NAME 2>/dev/null || echo "0")
    if [ "$BEHIND" -gt 0 ]; then
        print_success "Found $BEHIND new commit(s) from upstream"
        echo ""
        echo "New commits:"
        git log --oneline HEAD..$UPSTREAM_REMOTE/$UPSTREAM_BRANCH_NAME | head -10
    else
        print_success "Already up to date with upstream"
    fi
fi

check_stop "2"

# ==============================================================================
# Step 3: Merge upstream into local sync branch (fast-forward only)
# ==============================================================================
print_step "3" "Merge $UPSTREAM_REMOTE/$UPSTREAM_BRANCH_NAME into $LOCAL_SYNC_BRANCH (fast-forward)"

if [ "$DRY_RUN" = false ]; then
    if git merge --ff-only $UPSTREAM_REMOTE/$UPSTREAM_BRANCH_NAME; then
        print_success "Fast-forward merge successful"
    else
        print_error "Fast-forward merge failed!"
        echo ""
        echo "This means $LOCAL_SYNC_BRANCH has diverged from upstream."
        echo "To fix this, you can reset $LOCAL_SYNC_BRANCH to upstream:"
        echo -e "${YELLOW}  git reset --hard $UPSTREAM_REMOTE/$UPSTREAM_BRANCH_NAME${NC}"
        echo ""
        read -p "Reset $LOCAL_SYNC_BRANCH to upstream? [y/N]: " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            run_cmd "git reset --hard $UPSTREAM_REMOTE/$UPSTREAM_BRANCH_NAME"
            print_success "$LOCAL_SYNC_BRANCH reset to upstream"
        else
            print_error "Please resolve manually"
            exit 1
        fi
    fi
else
    print_cmd "git merge --ff-only $UPSTREAM_REMOTE/$UPSTREAM_BRANCH_NAME"
    echo -e "${CYAN}  (dry run - skipped)${NC}"
fi

check_stop "3"

# ==============================================================================
# Step 4: Push local sync branch to origin
# ==============================================================================
print_step "4" "Push updated $LOCAL_SYNC_BRANCH to origin"

confirm

run_cmd "git push $ORIGIN_REMOTE $LOCAL_SYNC_BRANCH"

print_success "$LOCAL_SYNC_BRANCH pushed to origin"
check_stop "4"

# ==============================================================================
# Step 5: Merge local sync branch into feature branch
# ==============================================================================
print_step "5" "Checkout feature branch and merge $LOCAL_SYNC_BRANCH"

run_cmd "git checkout $FEATURE_BRANCH"

echo ""
echo "Merging $LOCAL_SYNC_BRANCH into $FEATURE_BRANCH..."

if [ "$DRY_RUN" = false ]; then
    if git merge $LOCAL_SYNC_BRANCH -m "Merge upstream updates into $FEATURE_BRANCH"; then
        print_success "Merge successful"
    else
        print_error "Merge conflicts detected!"
        echo ""
        echo "Please resolve conflicts manually:"
        echo "  1. Edit conflicted files"
        echo "  2. git add <resolved-files>"
        echo "  3. git commit"
        echo ""
        echo "Conflicted files:"
        git diff --name-only --diff-filter=U
        exit 1
    fi
else
    print_cmd "git merge $LOCAL_SYNC_BRANCH -m \"Merge upstream updates into $FEATURE_BRANCH\""
    echo -e "${CYAN}  (dry run - skipped)${NC}"
fi

check_stop "5"

# ==============================================================================
# Step 6: Push feature branch and verify
# ==============================================================================
print_step "6" "Push feature branch and verify custom features"

confirm

run_cmd "git push $ORIGIN_REMOTE $FEATURE_BRANCH"

echo ""
echo "Verifying custom features..."

# Verify critical files exist
VERIFY_FILES=(
    "src/routes/admin/requestLogs.js"
    "src/services/requestLogService.js"
    "web/admin-spa/src/views/RequestLogsView.vue"
)

ALL_OK=true
for file in "${VERIFY_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_success "$file exists"
    else
        print_error "$file MISSING!"
        ALL_OK=false
    fi
done

if [ "$ALL_OK" = true ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✓ Workflow completed successfully!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Test the application: npm run dev"
    echo "  2. Build Docker image: docker-compose build"
    echo "  3. Deploy: docker-compose up -d"
else
    print_error "Some custom features are missing! Please check."
    exit 1
fi
