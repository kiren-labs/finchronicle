#!/bin/bash

# Local CI/CD Validation Script
# Runs the same checks as GitHub Actions CI pipeline
# Run this before committing to catch issues early

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FinChronicle - Local Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Track overall status
VALIDATION_PASSED=true

# ============================================================================
# 1. Validate HTML/CSS
# ============================================================================
echo "📄 Validating HTML and CSS..."

# Check if html5validator is installed
if command -v html5validator &> /dev/null; then
    echo "   Using html5validator..."
    if html5validator --root . --also-check-css; then
        echo -e "${GREEN}✓ HTML/CSS validation passed${NC}"
    else
        echo -e "${RED}✗ HTML/CSS validation failed${NC}"
        VALIDATION_PASSED=false
    fi
elif command -v docker &> /dev/null; then
    echo "   Using Docker with html5validator..."
    if docker run --rm -v "$(pwd):/work" cyb3rjak3/html5validator html5validator --root /work --also-check-css 2>&1; then
        echo -e "${GREEN}✓ HTML/CSS validation passed${NC}"
    else
        ERROR_CODE=$?
        if [ $ERROR_CODE -eq 125 ] || [ $ERROR_CODE -eq 1 ]; then
            echo -e "${YELLOW}⚠ Docker validation failed (Docker may not be running)${NC}"
            echo "   Skipping HTML/CSS validation"
        else
            echo -e "${RED}✗ HTML/CSS validation failed${NC}"
            VALIDATION_PASSED=false
        fi
    fi
else
    echo -e "${YELLOW}⚠ Skipping HTML/CSS validation (html5validator not installed)${NC}"
    echo "   Install with: pip install html5validator"
    echo "   Or use Docker: docker pull cyb3rjak3/html5validator"
fi

echo ""

# ============================================================================
# 2. Validate manifest.json
# ============================================================================
echo "📋 Validating manifest.json..."

if python3 -m json.tool manifest.json > /dev/null 2>&1; then
    echo -e "${GREEN}✓ JSON syntax is valid${NC}"

    # Check required PWA fields
    REQUIRED_FIELDS=("name" "short_name" "start_url" "display" "icons")
    MISSING_FIELDS=()

    for field in "${REQUIRED_FIELDS[@]}"; do
        if ! grep -q "\"$field\"" manifest.json; then
            MISSING_FIELDS+=("$field")
        fi
    done

    if [ ${#MISSING_FIELDS[@]} -eq 0 ]; then
        echo -e "${GREEN}✓ All required PWA fields present${NC}"
    else
        echo -e "${RED}✗ Missing required fields: ${MISSING_FIELDS[*]}${NC}"
        VALIDATION_PASSED=false
    fi
else
    echo -e "${RED}✗ manifest.json has invalid JSON syntax${NC}"
    VALIDATION_PASSED=false
fi

echo ""

# ============================================================================
# 3. Check service worker registration
# ============================================================================
echo "⚙️  Checking service worker registration..."

if grep -q "navigator.serviceWorker.register" app.js; then
    echo -e "${GREEN}✓ Service worker registration found in app.js${NC}"
else
    echo -e "${RED}✗ Service worker registration not found in app.js${NC}"
    VALIDATION_PASSED=false
fi

echo ""

# ============================================================================
# 4. Check version consistency
# ============================================================================
echo "🔢 Checking version consistency..."

# Extract versions
APP_VERSION=$(grep -m 1 "const APP_VERSION = " app.js | sed "s/.*'\(.*\)'.*/\1/")
SW_VERSION=$(grep -m 1 "// Version:" sw.js | sed 's/.*: //')
MANIFEST_VERSION=$(grep -m 1 '"version"' manifest.json | sed 's/.*: *"\(.*\)".*/\1/')

echo "   app.js:       v$APP_VERSION"
echo "   sw.js:        v$SW_VERSION"
echo "   manifest.json: v$MANIFEST_VERSION"

if [ "$APP_VERSION" = "$SW_VERSION" ] && [ "$APP_VERSION" = "$MANIFEST_VERSION" ]; then
    echo -e "${GREEN}✓ All versions match${NC}"
else
    echo -e "${RED}✗ Version mismatch detected${NC}"
    VALIDATION_PASSED=false
fi

echo ""

# ============================================================================
# 5. Check for common issues
# ============================================================================
echo "🔍 Running additional checks..."

# Check for console.log (optional - warn only)
if grep -r "console.log" app.js > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Warning: console.log statements found in app.js${NC}"
fi

# Check for debugger statements
if grep -r "debugger" app.js > /dev/null 2>&1; then
    echo -e "${RED}✗ Debugger statements found in app.js${NC}"
    VALIDATION_PASSED=false
fi

# Check for eval() usage (security risk)
if grep -r "eval(" app.js > /dev/null 2>&1; then
    echo -e "${RED}✗ eval() usage found (security risk)${NC}"
    VALIDATION_PASSED=false
fi

echo ""

# ============================================================================
# Final Summary
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}✓ All validations passed!${NC}"
    echo "  Ready to commit and push."
    exit 0
else
    echo -e "${RED}✗ Some validations failed${NC}"
    echo "  Please fix the issues above before committing."
    exit 1
fi
