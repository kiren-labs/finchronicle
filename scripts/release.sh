#!/bin/bash

# ============================================================================
# FinChronicle Release Script
# ============================================================================
# Full release: bump version → validate → commit → tag → push
#
# Usage:
#   bash scripts/release.sh <version> [<db-version>]
#
# Examples:
#   bash scripts/release.sh 4.4.0        # app version only
#   bash scripts/release.sh 4.4.0 13     # app version + DB schema version
# ============================================================================

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SCRIPT_DIR="$REPO_ROOT/scripts"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# Helpers
# ============================================================================

error() { echo -e "\n${RED}✗ Error: $1${NC}" >&2; exit 1; }
warn()  { echo -e "  ${YELLOW}⚠${NC} $1"; }
info()  { echo -e "  ${BLUE}ℹ${NC} $1"; }
pass()  { echo -e "  ${GREEN}✓${NC} $1"; }
section() { echo -e "\n${YELLOW}─── $1 ───${NC}"; }

confirm() {
  local prompt="$1"
  local reply
  read -r -p "$(echo -e "  ${YELLOW}?${NC} $prompt (y/N) ")" -n 1 reply
  echo
  [[ "$reply" =~ ^[Yy]$ ]]
}

# ============================================================================
# Parse args
# ============================================================================

NEW_VERSION="${1:-}"
DB_VERSION="${2:-}"

if [[ -z "$NEW_VERSION" ]]; then
  error "Version required\nUsage: $0 <version> [<db-version>]\nExample: $0 4.4.0"
fi

if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  error "Invalid version: '$NEW_VERSION' (must be X.Y.Z)"
fi

if [[ -n "$DB_VERSION" ]] && ! [[ "$DB_VERSION" =~ ^[0-9]+$ ]]; then
  error "Invalid DB version: '$DB_VERSION' (must be integer)"
fi

TAG="v$NEW_VERSION"

echo -e "\n${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║          FinChronicle Release Utility                      ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
echo -e "  Releasing: ${GREEN}$TAG${NC}"
[[ -n "$DB_VERSION" ]] && echo -e "  DB Version: ${GREEN}$DB_VERSION${NC}"

# ============================================================================
# Pre-flight checks
# ============================================================================
section "Pre-flight checks"

# Must be on main
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  warn "On branch '$CURRENT_BRANCH', not 'main'"
  confirm "Continue anyway?" || { echo "  Release cancelled."; exit 1; }
else
  pass "On main branch"
fi

# Must have clean working tree
if ! git diff-index --quiet HEAD --; then
  error "Uncommitted changes in working tree — commit or stash first"
fi
pass "Working tree clean"

# Tag must not already exist
if git rev-parse "$TAG" &>/dev/null; then
  error "Tag $TAG already exists"
fi
pass "Tag $TAG is available"

# CHANGELOG must have an entry for this version
# Format: ## [X.Y.Z] or ## [X.Y.Z] — date  or  ## vX.Y.Z
if grep -qE "^## \[?v?${NEW_VERSION}\]?" CHANGELOG.md; then
  pass "CHANGELOG.md has entry for v$NEW_VERSION"
else
  error "No CHANGELOG entry found for v$NEW_VERSION\n\n  Add a section like:\n  ## [$NEW_VERSION] — $(date +%Y-%m-%d)\n\n  Then re-run this script."
fi

# Pull latest
section "Syncing with remote"
info "Pulling latest from origin/$CURRENT_BRANCH..."
git pull origin "$CURRENT_BRANCH"
pass "Up to date with origin"

# ============================================================================
# Bump version
# ============================================================================
section "Bumping version"

BUMP_ARGS=("$NEW_VERSION")
[[ -n "$DB_VERSION" ]] && BUMP_ARGS+=("$DB_VERSION")

if ! bash "$SCRIPT_DIR/bump-version.sh" "${BUMP_ARGS[@]}"; then
  error "bump-version.sh failed — see output above"
fi

# ============================================================================
# Validate
# ============================================================================
section "Running validation"

if ! bash "$SCRIPT_DIR/validate-local.sh"; then
  echo ""
  warn "Validation reported failures above."
  confirm "Proceed despite validation failures?" || { echo "  Release cancelled."; exit 1; }
fi

# ============================================================================
# Review & commit
# ============================================================================
section "Review changes"

echo ""
git diff HEAD -- js/state.js sw.js manifest.json ARCHITECTURE.md README.md
echo ""

confirm "Commit and push release $TAG?" || { echo "  Release cancelled."; exit 1; }

section "Committing"

git add js/state.js sw.js manifest.json ARCHITECTURE.md README.md
git commit -m "chore: release $TAG"
pass "Committed version bump"

# ============================================================================
# Tag & push
# ============================================================================
section "Tagging & pushing"

git tag -a "$TAG" -m "Release $TAG"
pass "Created tag $TAG"

git push origin "$CURRENT_BRANCH"
pass "Pushed branch to origin"

git push origin "$TAG"
pass "Pushed tag $TAG to origin"

# ============================================================================
# Done
# ============================================================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Released $TAG successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Releases:   https://github.com/kiren-labs/finchronicle/releases/tag/$TAG"
echo "  Live site:  https://kiren-labs.github.io/finchronicle/"
echo ""
