#!/bin/bash

# ============================================================================
# FinChronicle Local Validation Script
# ============================================================================
# Run before committing to catch version drift, missing cache entries,
# security issues, and broken PWA config.
#
# Usage:
#   bash scripts/validate-local.sh
# ============================================================================

# Don't use set -e — we track failures manually via VALIDATION_PASSED
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=true
WARN_COUNT=0
FAIL_COUNT=0

# ============================================================================
# Helpers
# ============================================================================

pass() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; PASS=false; FAIL_COUNT=$((FAIL_COUNT + 1)); }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; WARN_COUNT=$((WARN_COUNT + 1)); }
info() { echo -e "  ${BLUE}ℹ${NC} $1"; }
section() { echo -e "\n${YELLOW}─── $1 ───${NC}"; }

# ============================================================================
# 1. Version Consistency
# ============================================================================
section "Version consistency"

# Extract from all 7 locations
VER_STATE=$(grep -m1 "const APP_VERSION = " js/state.js | awk -F'"' '{print $2}')
VER_SW_COMMENT=$(grep -m1 "^// Version:" sw.js | awk '{print $NF}')
VER_CACHE_NAME=$(grep -m1 "^const CACHE_NAME = " sw.js | sed 's/.*finchronicle-v\([^"'"'"']*\).*/\1/')
VER_CACHE_VER=$(grep -m1 "^const CACHE_VERSION = " sw.js | awk -F'"' '{print $2}')
VER_MANIFEST=$(grep -m1 '"version":' manifest.json | awk -F'"' '{print $4}')
VER_ARCH=$(grep -m1 "^\*\*Version:\*\*" ARCHITECTURE.md | awk '{print $NF}')
VER_README=$(grep -m1 "version-.*-blue\.svg" README.md | sed 's/.*version-\([^-]*\)-blue.*/\1/')

echo "  js/state.js APP_VERSION:   $VER_STATE"
echo "  sw.js // Version:          $VER_SW_COMMENT"
echo "  sw.js CACHE_NAME:          $VER_CACHE_NAME"
echo "  sw.js CACHE_VERSION:       $VER_CACHE_VER"
echo "  manifest.json:             $VER_MANIFEST"
echo "  ARCHITECTURE.md:           $VER_ARCH"
echo "  README.md badge:           $VER_README"
echo ""

BASELINE="$VER_STATE"
ALL_MATCH=true

for var_name in VER_SW_COMMENT VER_CACHE_NAME VER_CACHE_VER VER_MANIFEST VER_ARCH VER_README; do
  val="${!var_name}"
  if [[ "$val" != "$BASELINE" ]]; then
    fail "$var_name ($val) does not match state.js ($BASELINE)"
    ALL_MATCH=false
  fi
done

[[ "$ALL_MATCH" == true ]] && pass "All 7 version locations consistent: $BASELINE"

# Soft check — CHANGELOG should mention current version
if grep -q "## \[v\?$BASELINE\]\|## v\?$BASELINE" CHANGELOG.md 2>/dev/null; then
  pass "CHANGELOG.md mentions v$BASELINE"
else
  warn "CHANGELOG.md does not mention v$BASELINE — remember to document the release"
fi

# ============================================================================
# 2. Service Worker Cache Coverage
# ============================================================================
section "Service worker cache coverage"

# Every js/*.js on disk must be in CACHE_URLS
JS_MISSING=()
for f in js/*.js; do
  basename_f="$(basename "$f")"
  if ! grep -q "\"./js/${basename_f}\"" sw.js; then
    JS_MISSING+=("$basename_f")
  fi
done

if [[ ${#JS_MISSING[@]} -eq 0 ]]; then
  pass "All js/*.js files listed in CACHE_URLS"
else
  for m in "${JS_MISSING[@]}"; do
    fail "js/$m is NOT in sw.js CACHE_URLS"
  done
fi

# Every css/*.css on disk must be in CACHE_URLS
CSS_MISSING=()
for f in css/*.css; do
  basename_f="$(basename "$f")"
  if ! grep -q "\"./css/${basename_f}\"" sw.js; then
    CSS_MISSING+=("$basename_f")
  fi
done

if [[ ${#CSS_MISSING[@]} -eq 0 ]]; then
  pass "All css/*.css files listed in CACHE_URLS"
else
  for m in "${CSS_MISSING[@]}"; do
    fail "css/$m is NOT in sw.js CACHE_URLS"
  done
fi

# Check lang/en.js is cached
if grep -q '"./js/lang/en.js"' sw.js; then
  pass "js/lang/en.js listed in CACHE_URLS"
else
  fail "js/lang/en.js is NOT in sw.js CACHE_URLS"
fi

# ============================================================================
# 3. Service Worker Registration
# ============================================================================
section "Service worker registration"

if grep -q "register.*sw\.js" js/app.js; then
  pass "Service worker registration found in js/app.js"
else
  fail "Service worker registration not found in js/app.js"
fi

# ============================================================================
# 4. manifest.json
# ============================================================================
section "manifest.json"

if python3 -m json.tool manifest.json > /dev/null 2>&1; then
  pass "JSON syntax valid"
else
  fail "manifest.json has invalid JSON syntax"
fi

REQUIRED_MANIFEST_FIELDS=("name" "short_name" "start_url" "display" "icons" "version")
MISSING_MANIFEST=()
for field in "${REQUIRED_MANIFEST_FIELDS[@]}"; do
  grep -q "\"$field\"" manifest.json || MISSING_MANIFEST+=("$field")
done

if [[ ${#MISSING_MANIFEST[@]} -eq 0 ]]; then
  pass "All required PWA fields present"
else
  fail "Missing manifest fields: ${MISSING_MANIFEST[*]}"
fi

# ============================================================================
# 5. Security & Code Quality (all js/ modules)
# ============================================================================
section "Security & code quality"

# debugger statements — hard fail
DEBUGGER_FILES=$(grep -rl "debugger" js/ 2>/dev/null || true)
if [[ -z "$DEBUGGER_FILES" ]]; then
  pass "No debugger statements found"
else
  while IFS= read -r f; do
    fail "debugger statement in $f"
  done <<< "$DEBUGGER_FILES"
fi

# eval() — hard fail
EVAL_FILES=$(grep -rl "eval(" js/ 2>/dev/null || true)
if [[ -z "$EVAL_FILES" ]]; then
  pass "No eval() usage found"
else
  while IFS= read -r f; do
    fail "eval() usage in $f"
  done <<< "$EVAL_FILES"
fi

# innerHTML with user-visible string concatenation patterns — warn
# Catches innerHTML = `...${someVar}...` where the var looks like user data
UNSAFE_INNER=$(grep -rn 'innerHTML\s*=.*\${' js/ 2>/dev/null | grep -v "sanitizeHTML\|formatCurrency\|formatDate\|t(\|ri-\|class=\|style=" | grep -v "\.js:[0-9]*:.*//") || true
if [[ -n "$UNSAFE_INNER" ]]; then
  warn "Potential unsafe innerHTML (verify user input is sanitized):"
  while IFS= read -r line; do
    echo "    $line"
  done <<< "$UNSAFE_INNER"
else
  pass "No obviously unsafe innerHTML patterns"
fi

# console.log — warn (exclude intentional SW/startup logs in app.js)
CONSOLE_FILES=$(grep -rl "console\.log" js/ 2>/dev/null || true)
if [[ -z "$CONSOLE_FILES" ]]; then
  pass "No console.log statements found"
else
  LOG_COUNT=$(grep -r "console\.log" js/ 2>/dev/null | wc -l | tr -d ' ')
  warn "$LOG_COUNT console.log statement(s) found (remove before release):"
  grep -rn "console\.log" js/ 2>/dev/null | sed 's/^/    /'
fi

# ============================================================================
# 6. HTML/CSS (optional — only if html5validator is locally installed)
# ============================================================================
if command -v html5validator &> /dev/null; then
  section "HTML/CSS validation"
  if html5validator --root . --also-check-css 2>&1; then
    pass "html5validator passed"
  else
    fail "html5validator reported errors"
  fi
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ "$PASS" == true ]]; then
  echo -e "${GREEN}✓ All checks passed${NC} ($WARN_COUNT warning(s))"
  echo "  Ready to commit."
  exit 0
else
  echo -e "${RED}✗ $FAIL_COUNT check(s) failed${NC} ($WARN_COUNT warning(s))"
  echo "  Fix the issues above before committing."
  exit 1
fi
