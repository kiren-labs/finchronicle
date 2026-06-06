#!/bin/bash

# ============================================================================
# FinChronicle Version Bump Script
# ============================================================================
# Updates version across all tracked files:
#   - js/state.js (APP_VERSION, VERSION_HISTORY)
#   - sw.js (Version comment, CACHE_NAME)
#   - manifest.json (version field)
#   - ARCHITECTURE.md (version badge in header)
#
# Usage:
#   ./scripts/bump-version.sh <version> [<db-version>] [--dry-run]
#
# Examples:
#   ./scripts/bump-version.sh 4.4.0                # App version only
#   ./scripts/bump-version.sh 4.4.0 13            # App version + DB version update
#   ./scripts/bump-version.sh 4.4.0 13 --dry-run  # Preview changes without writing
#
# Note: This script requires that the new version is already documented
#       in js/state.js VERSION_HISTORY before running.
# ============================================================================

set -e

# ============================================================================
# Configuration & Helpers
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get repository root directory (one level up from scripts/)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Files to update
APP_JS="js/state.js"
SW_JS="sw.js"
MANIFEST_JSON="manifest.json"
ARCHITECTURE_MD="ARCHITECTURE.md"
README_MD="README.md"

# Parse flags
DRY_RUN=false
if [[ "$3" == "--dry-run" || "$2" == "--dry-run" ]]; then
  DRY_RUN=true
fi

# ============================================================================
# Helper Functions
# ============================================================================

error() {
  echo -e "${RED}✗ Error: $1${NC}" >&2
  exit 1
}

warn() {
  echo -e "${YELLOW}⚠ Warning: $1${NC}"
}

info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

success() {
  echo -e "${GREEN}✓ $1${NC}"
}

log_section() {
  echo -e "\n${YELLOW}─── $1 ───${NC}"
}

# Run sed but capture errors better
safe_sed() {
  local file="$1"
  local pattern="$2"
  local replacement="$3"
  
  if ! sed -i.bak "$pattern" "$file" 2>/dev/null; then
    error "Failed to update $file with pattern: $pattern"
  fi
  rm -f "$file.bak"
}

# ============================================================================
# Validation
# ============================================================================

validate_args() {
  if [[ -z "$NEW_VERSION" ]]; then
    error "Version number required\nUsage: $0 <version> [<db-version>] [--dry-run]\nExample: $0 4.4.0"
  fi
  
  # Validate semantic versioning format
  if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    error "Invalid version format: '$NEW_VERSION'\nMust be semantic versioning (e.g., 4.4.0)"
  fi
  
  # Validate DB version if provided (must be integer)
  if [[ -n "$DB_VERSION" ]] && ! [[ "$DB_VERSION" =~ ^[0-9]+$ ]]; then
    error "Invalid DB version: '$DB_VERSION' (must be integer)"
  fi
}

validate_files_exist() {
  local missing=()
  for file in "$APP_JS" "$SW_JS" "$MANIFEST_JSON" "$ARCHITECTURE_MD" "$README_MD"; do
    if [[ ! -f "$file" ]]; then
      missing+=("$file")
    fi
  done
  
  if [[ ${#missing[@]} -gt 0 ]]; then
    error "Missing files: ${missing[*]}"
  fi
}

validate_file_markers() {
  log_section "Validating file markers"
  
  # Check for required patterns in each file
  grep -q "const APP_VERSION = " "$APP_JS" || error "$APP_JS missing APP_VERSION marker"
  success "$APP_JS has APP_VERSION marker"
  
  # VERSION_HISTORY is optional (added in recent refactoring)
  if grep -q "export const VERSION_HISTORY" "$APP_JS"; then
    success "$APP_JS has VERSION_HISTORY (enhanced tracking)"
  fi
  
  # Check sw.js for version markers
  if grep -q "// Version:" "$SW_JS"; then
    success "$SW_JS has Version comment"
  elif grep -q "// version:" "$SW_JS"; then
    success "$SW_JS has version comment"
  else
    warn "$SW_JS missing Version comment (optional)"
  fi
  
  grep -q "const CACHE_NAME = " "$SW_JS" || error "$SW_JS missing CACHE_NAME"
  success "$SW_JS has CACHE_NAME"
  
  grep -q '"version":' "$MANIFEST_JSON" || error "$MANIFEST_JSON missing version field"
  success "$MANIFEST_JSON has required marker"
  
  grep -q "^\*\*Version:\*\*" "$ARCHITECTURE_MD" || error "$ARCHITECTURE_MD missing Version badge"
  success "$ARCHITECTURE_MD has required marker"

  grep -q "version-.*-blue\.svg" "$README_MD" || warn "$README_MD missing version badge (optional)"
  success "$README_MD has version badge"
}

validate_version_in_history() {
  # This check only runs if VERSION_HISTORY exists (post-refactoring)
  if grep -q "export const VERSION_HISTORY" "$APP_JS"; then
    log_section "Checking VERSION_HISTORY"
    if grep -q "\"$NEW_VERSION\":" "$APP_JS"; then
      success "Version $NEW_VERSION found in VERSION_HISTORY"
    else
      warn "Version $NEW_VERSION not in VERSION_HISTORY (js/state.js)"
      warn "Add it manually before committing"
    fi
  fi
}

check_git_status() {
  log_section "Checking git status"
  
  if ! git diff-index --quiet HEAD --; then
    warn "Uncommitted changes detected in working directory"
    info "Stash or commit changes before bumping version"
  fi
}

# ============================================================================
# Get Current Versions
# ============================================================================

get_current_versions() {
  log_section "Current versions"
  
  # Robust extraction using awk for each file format
  CURRENT_APP=$(grep "const APP_VERSION = " "$APP_JS" | awk -F'"' '{print $2}' || echo "UNKNOWN")
  CURRENT_SW=$(grep "^// Version: " "$SW_JS" | awk '{print $NF}' || echo "UNKNOWN")
  CURRENT_MANIFEST=$(grep '"version":' "$MANIFEST_JSON" | awk -F'"' '{print $4}' || echo "UNKNOWN")
  CURRENT_ARCH=$(grep "^\*\*Version:\*\*" "$ARCHITECTURE_MD" | head -1 | awk '{print $NF}' || echo "UNKNOWN")
  CURRENT_DB=$(grep "^export const DB_VERSION = " "$APP_JS" | awk '{print $NF}' | tr -d ';' || echo "UNKNOWN")
  CURRENT_README=$(grep "version-.*-blue\.svg" "$README_MD" | head -1 | sed 's/.*version-\([^-]*\)-blue.*/\1/' || echo "UNKNOWN")

  echo "  js/state.js (APP_VERSION):   $CURRENT_APP"
  echo "  js/state.js (DB_VERSION):    $CURRENT_DB"
  echo "  sw.js (Version comment):     $CURRENT_SW"
  echo "  sw.js (CACHE_NAME/VERSION):  (same as Version comment)"
  echo "  manifest.json:               $CURRENT_MANIFEST"
  echo "  ARCHITECTURE.md:             $CURRENT_ARCH"
  echo "  README.md (badge):           $CURRENT_README"
}

# ============================================================================
# Update Files
# ============================================================================

update_app_js() {
  info "Updating APP_VERSION in $APP_JS..."
  # state.js uses double quotes; match both quote styles
  safe_sed "$APP_JS" "s/const APP_VERSION = ['\"][^'\"]*['\"]/const APP_VERSION = \"$NEW_VERSION\"/"

  if [[ -n "$DB_VERSION" ]]; then
    info "Updating DB_VERSION in $APP_JS..."
    safe_sed "$APP_JS" "s/const DB_VERSION = [0-9]*/const DB_VERSION = $DB_VERSION/"
  fi
}

update_sw_js() {
  info "Updating Version comment in $SW_JS..."
  safe_sed "$SW_JS" "s|// Version: .*|// Version: $NEW_VERSION|"

  info "Updating CACHE_NAME in $SW_JS..."
  # sw.js uses double quotes; match both quote styles
  safe_sed "$SW_JS" "s/const CACHE_NAME = ['\"]finchronicle-v[^'\"]*['\"]/const CACHE_NAME = \"finchronicle-v$NEW_VERSION\"/"

  info "Updating CACHE_VERSION in $SW_JS..."
  safe_sed "$SW_JS" "s/const CACHE_VERSION = ['\"][^'\"]*['\"]/const CACHE_VERSION = \"$NEW_VERSION\"/"
}

update_manifest_json() {
  info "Updating version in $MANIFEST_JSON..."
  safe_sed "$MANIFEST_JSON" "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/"
}

update_architecture_md() {
  info "Updating Version badge in $ARCHITECTURE_MD..."
  # Scope to the file header block (lines before the first ---) to avoid
  # touching **DB Version:** or any other versioned section further down.
  safe_sed "$ARCHITECTURE_MD" "1,/^---/s/^\*\*Version:\*\* .*/\*\*Version:\*\* $NEW_VERSION/"
}

update_readme_md() {
  info "Updating version badge in $README_MD..."
  safe_sed "$README_MD" "s|version-[0-9][^-]*-blue\.svg|version-$NEW_VERSION-blue.svg|g"
  safe_sed "$README_MD" "s|badge/version-[^)]*)|badge/version-$NEW_VERSION-blue.svg)|g"
}

verify_updates() {
  log_section "Verifying updates"

  # state.js uses double quotes
  NEW_APP=$(grep "const APP_VERSION = " "$APP_JS" | awk -F'"' '{print $2}')
  NEW_SW_COMMENT=$(grep "^// Version: " "$SW_JS" | awk '{print $NF}')
  NEW_CACHE_NAME=$(grep "^const CACHE_NAME = " "$SW_JS" | sed 's/.*finchronicle-v\([^"'"'"']*\).*/\1/')
  NEW_CACHE_VER=$(grep "^const CACHE_VERSION = " "$SW_JS" | awk -F'"' '{print $2}')
  NEW_MANIFEST=$(grep '"version":' "$MANIFEST_JSON" | awk -F'"' '{print $4}')
  NEW_ARCH=$(grep "^\*\*Version:\*\*" "$ARCHITECTURE_MD" | head -1 | awk '{print $NF}')
  NEW_README=$(grep "version-.*-blue\.svg" "$README_MD" | head -1 | sed 's/.*version-\([^-]*\)-blue.*/\1/')

  local verified=true
  [[ "$NEW_APP" == "$NEW_VERSION" ]]         && echo "  ✓ js/state.js APP_VERSION: $NEW_APP"            || { echo "  ✗ js/state.js APP_VERSION: $NEW_APP (expected $NEW_VERSION)"; verified=false; }
  [[ "$NEW_SW_COMMENT" == "$NEW_VERSION" ]]  && echo "  ✓ sw.js // Version: $NEW_SW_COMMENT"            || { echo "  ✗ sw.js // Version: $NEW_SW_COMMENT (expected $NEW_VERSION)"; verified=false; }
  [[ "$NEW_CACHE_NAME" == "$NEW_VERSION" ]]  && echo "  ✓ sw.js CACHE_NAME: finchronicle-v$NEW_CACHE_NAME" || { echo "  ✗ sw.js CACHE_NAME: $NEW_CACHE_NAME (expected $NEW_VERSION)"; verified=false; }
  [[ "$NEW_CACHE_VER" == "$NEW_VERSION" ]]   && echo "  ✓ sw.js CACHE_VERSION: $NEW_CACHE_VER"          || { echo "  ✗ sw.js CACHE_VERSION: $NEW_CACHE_VER (expected $NEW_VERSION)"; verified=false; }
  [[ "$NEW_MANIFEST" == "$NEW_VERSION" ]]    && echo "  ✓ manifest.json: $NEW_MANIFEST"                 || { echo "  ✗ manifest.json: $NEW_MANIFEST (expected $NEW_VERSION)"; verified=false; }
  [[ "$NEW_ARCH" == "$NEW_VERSION" ]]        && echo "  ✓ ARCHITECTURE.md: $NEW_ARCH"                   || { echo "  ✗ ARCHITECTURE.md: $NEW_ARCH (expected $NEW_VERSION)"; verified=false; }
  [[ "$NEW_README" == "$NEW_VERSION" ]]      && echo "  ✓ README.md badge: $NEW_README"                 || { echo "  ✗ README.md badge: $NEW_README (expected $NEW_VERSION)"; verified=false; }

  [[ "$verified" == true ]] && return 0 || return 1
}

# ============================================================================
# Main
# ============================================================================

main() {
  NEW_VERSION="$1"
  DB_VERSION="$2"
  
  # Allow --dry-run in position 2 or 3
  if [[ "$DB_VERSION" == "--dry-run" ]]; then
    DB_VERSION=""
    DRY_RUN=true
  fi
  
  echo -e "\n${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║          FinChronicle Version Bump Utility                 ║${NC}"
  echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
  
  # Phase 1: Validation
  validate_args
  validate_files_exist
  validate_file_markers
  get_current_versions
  validate_version_in_history
  check_git_status
  
  if [[ "$DRY_RUN" == true ]]; then
    info "\n${BLUE}DRY RUN MODE${NC} — Changes will not be written"
    echo ""
    echo "Would update:"
    echo "  js/state.js: APP_VERSION $CURRENT_APP → $NEW_VERSION"
    [[ -n "$DB_VERSION" ]] && echo "  js/state.js: DB_VERSION $CURRENT_DB → $DB_VERSION"
    echo "  sw.js: Version/CACHE_NAME/CACHE_VERSION $CURRENT_SW → $NEW_VERSION"
    echo "  manifest.json: $CURRENT_MANIFEST → $NEW_VERSION"
    echo "  ARCHITECTURE.md: $CURRENT_ARCH → $NEW_VERSION"
    echo "  README.md badge: $CURRENT_README → $NEW_VERSION"
    echo ""
    info "Run without --dry-run to apply changes"
    exit 0
  fi
  
  # Phase 2: Update
  log_section "Updating files"
  update_app_js
  update_sw_js
  update_manifest_json
  update_architecture_md
  update_readme_md
  
  # Phase 3: Verification
  if verify_updates; then
    success "\n✓ Version bumped to $NEW_VERSION successfully!"
  else
    error "Verification failed - some files were not updated correctly"
  fi
  
  # Phase 4: Next Steps
  log_section "Next steps"
  echo "1. Review changes:  ${BLUE}git diff${NC}"
  echo "2. Update CHANGELOG.md for v$NEW_VERSION"
  echo "3. Commit changes:  ${BLUE}git add . && git commit -m \"chore: bump version to v$NEW_VERSION\"${NC}"
  echo "4. Create tag:      ${BLUE}git tag v$NEW_VERSION${NC}"
  echo "5. Push changes:    ${BLUE}git push origin main --tags${NC}"
  echo ""
}

main "$@"
