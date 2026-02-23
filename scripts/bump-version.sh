#!/bin/bash

# FinChronicle Version Bump Script
# Updates version in app.js, sw.js, and manifest.json

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get repository root directory (one level up from scripts/)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Files to update (relative to repo root)
APP_JS="app.js"
SW_JS="sw.js"
MANIFEST_JSON="manifest.json"

# Check if version argument is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Version number required${NC}"
    echo "Usage: ./bump-version.sh <version>"
    echo "Example: ./bump-version.sh 3.10.3"
    exit 1
fi

NEW_VERSION="$1"

# Validate version format (semantic versioning)
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Error: Invalid version format${NC}"
    echo "Version must follow semantic versioning: MAJOR.MINOR.PATCH (e.g., 3.10.3)"
    exit 1
fi

echo -e "${YELLOW}Updating version to ${NEW_VERSION}...${NC}\n"

# Check if files exist
for file in "$APP_JS" "$SW_JS" "$MANIFEST_JSON"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}Error: $file not found${NC}"
        exit 1
    fi
done

# Get current versions
CURRENT_APP_VERSION=$(grep "const APP_VERSION = " "$APP_JS" | sed "s/.*'\(.*\)'.*/\1/")
CURRENT_SW_VERSION=$(grep "// Version: " "$SW_JS" | head -1 | sed 's/.*: //')
CURRENT_MANIFEST_VERSION=$(grep '"version":' "$MANIFEST_JSON" | sed 's/.*: "\(.*\)".*/\1/')

echo "Current versions:"
echo "  app.js:        $CURRENT_APP_VERSION"
echo "  sw.js:         $CURRENT_SW_VERSION"
echo "  manifest.json: $CURRENT_MANIFEST_VERSION"
echo ""

# Update app.js
echo "Updating $APP_JS..."
sed -i.bak "s/const APP_VERSION = '.*'/const APP_VERSION = '$NEW_VERSION'/" "$APP_JS"
rm -f "$APP_JS.bak"

# Update sw.js (both comment and CACHE_NAME)
echo "Updating $SW_JS..."
sed -i.bak "s/\/\/ Version: .*/\/\/ Version: $NEW_VERSION/" "$SW_JS"
sed -i.bak "s/const CACHE_NAME = 'finchronicle-v.*'/const CACHE_NAME = 'finchronicle-v$NEW_VERSION'/" "$SW_JS"
rm -f "$SW_JS.bak"

# Update manifest.json
echo "Updating $MANIFEST_JSON..."
sed -i.bak "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" "$MANIFEST_JSON"
rm -f "$MANIFEST_JSON.bak"

echo -e "\n${GREEN}✓ Version updated successfully!${NC}\n"

echo "Updated versions:"
echo "  app.js:        $(grep "const APP_VERSION = " "$APP_JS" | sed "s/.*'\(.*\)'.*/\1/")"
echo "  sw.js:         $(grep "// Version: " "$SW_JS" | head -1 | sed 's/.*: //')"
echo "  manifest.json: $(grep '"version":' "$MANIFEST_JSON" | sed 's/.*: "\(.*\)".*/\1/')"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Update CHANGELOG.md with changes for v$NEW_VERSION"
echo "2. Review the changes: git diff"
echo "3. Commit: git add . && git commit -m \"chore: bump version to v$NEW_VERSION\""
echo "4. Tag: git tag v$NEW_VERSION"
echo "5. Push: git push origin main --tags"
echo ""
echo "Or use the automated release workflow:"
echo "  git add . && git commit -m \"chore: bump version to v$NEW_VERSION\" && git push"
