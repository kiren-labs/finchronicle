#!/bin/bash

# FinChronicle Release Script
# Automates the full release process

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get repository root directory (one level up from scripts/)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Check if version argument is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Version number required${NC}"
    echo "Usage: ./release.sh <version>"
    echo "Example: ./release.sh 3.10.3"
    exit 1
fi

NEW_VERSION="$1"
TAG="v$NEW_VERSION"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  FinChronicle Release v$NEW_VERSION${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Step 1: Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}Error: You have uncommitted changes${NC}"
    echo "Please commit or stash them before releasing"
    exit 1
fi

# Step 2: Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}Warning: You're on branch '$CURRENT_BRANCH', not 'main'${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 3: Pull latest changes
echo -e "${YELLOW}Pulling latest changes...${NC}"
git pull origin main

# Step 4: Bump version
echo -e "\n${YELLOW}Bumping version to $NEW_VERSION...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/bump-version.sh" "$NEW_VERSION"

# Step 5: Check if CHANGELOG has entry
if ! grep -q "## \[$NEW_VERSION\]" CHANGELOG.md; then
    echo -e "\n${RED}Error: No CHANGELOG entry found for v$NEW_VERSION${NC}"
    echo "Please add release notes to CHANGELOG.md before releasing"
    echo ""
    echo "Add a section like:"
    echo "## [$NEW_VERSION] - $(date +%Y-%m-%d)"
    echo ""
    read -p "Open CHANGELOG.md to edit? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} CHANGELOG.md
        echo "Please run this script again after updating CHANGELOG.md"
    fi
    exit 1
fi

# Step 6: Review changes
echo -e "\n${YELLOW}Changes to be committed:${NC}"
git diff HEAD app.js sw.js manifest.json

read -p "$(echo -e ${YELLOW}Continue with release? (y/N)${NC}) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Release cancelled"
    exit 1
fi

# Step 7: Commit version bump
echo -e "\n${YELLOW}Committing version bump...${NC}"
git add app.js sw.js manifest.json CHANGELOG.md
git commit -m "chore: release v$NEW_VERSION" || true

# Step 8: Create and push tag
echo -e "\n${YELLOW}Creating tag $TAG...${NC}"
git tag -a "$TAG" -m "Release v$NEW_VERSION"

echo -e "\n${YELLOW}Pushing to GitHub...${NC}"
git push origin main
git push origin "$TAG"

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Release v$NEW_VERSION created successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo "Next steps:"
echo "1. GitHub Actions will automatically create a release"
echo "2. View release: https://github.com/kiren-labs/finance-tracker/releases/tag/$TAG"
echo "3. GitHub Pages will auto-deploy in 1-2 minutes"
echo "4. Live site: https://kiren-labs.github.io/finance-tracker/"
echo ""
