# FinChronicle Scripts

This directory contains automation scripts for FinChronicle development and release management.

## 📜 Available Scripts

### `release.sh` - Automated Release

Full automated release process. Handles version bumping, committing, tagging, and pushing.

**Usage:**
```bash
./scripts/release.sh 3.10.3
```

**What it does:**
1. ✅ Validates version format (semantic versioning)
2. ✅ Checks for uncommitted changes
3. ✅ Pulls latest changes from main branch
4. ✅ Updates version in `app.js`, `sw.js`, `manifest.json`
5. ✅ Verifies CHANGELOG.md has entry for version
6. ✅ Shows diff for review
7. ✅ Commits version bump
8. ✅ Creates git tag (e.g., `v3.10.3`)
9. ✅ Pushes commit and tag to GitHub
10. ✅ Triggers GitHub Actions for release creation

**Requirements:**
- Clean working directory (no uncommitted changes)
- CHANGELOG.md must have entry for the new version
- Must be run from repository root

---

### `bump-version.sh` - Version Update Only

Updates version numbers in all version-controlled files without committing.

**Usage:**
```bash
./scripts/bump-version.sh 3.10.3
```

**What it updates:**
- `app.js` → Line 2: `const APP_VERSION = '3.10.3'`
- `sw.js` → Line 3: `// Version: 3.10.3`
- `sw.js` → Line 4: `const CACHE_NAME = 'finchronicle-v3.10.3'`
- `manifest.json` → `"version": "3.10.3"`

**Use cases:**
- Preview version changes before committing
- Update versions manually (commit yourself)
- Testing version update logic

---

## 🚀 Quick Start

### Standard Release Flow

```bash
# 1. Update CHANGELOG.md
nano CHANGELOG.md

# 2. Run release script
./scripts/release.sh 3.10.3

# Done! GitHub Actions handles the rest.
```

### Manual Control Flow

```bash
# 1. Update CHANGELOG.md
nano CHANGELOG.md

# 2. Bump version only
./scripts/bump-version.sh 3.10.3

# 3. Review changes
git diff app.js sw.js manifest.json

# 4. Commit and tag manually
git add app.js sw.js manifest.json CHANGELOG.md
git commit -m "chore: release v3.10.3"
git tag v3.10.3
git push origin main --tags
```

---

## 📋 Version Format

FinChronicle uses [Semantic Versioning](https://semver.org/):

**Format:** `MAJOR.MINOR.PATCH`

- **MAJOR** (3.x.x): Breaking changes
- **MINOR** (x.10.x): New features (backward compatible)
- **PATCH** (x.x.3): Bug fixes (backward compatible)

**Examples:**
- `3.10.2` → `3.10.3` (bug fix)
- `3.10.3` → `3.11.0` (new feature)
- `3.11.0` → `4.0.0` (breaking change)

---

## 🔍 Script Details

### Version Validation

Both scripts validate version format:
- Must match: `MAJOR.MINOR.PATCH`
- Must be numeric: `3.10.3` ✅
- Invalid: `v3.10.3` ❌ (no 'v' prefix)
- Invalid: `3.10` ❌ (missing patch)

### Pre-flight Checks (release.sh)

Before releasing, the script checks:
- ✅ No uncommitted changes
- ✅ On main branch (warns if not)
- ✅ CHANGELOG.md has entry for version
- ✅ Version format is valid

### Post-execution

After successful release:
1. GitHub Actions workflow triggers (`.github/workflows/release.yml`)
2. Release created at: `https://github.com/kiren-labs/finance-tracker/releases`
3. GitHub Pages deploys automatically
4. Live site updates in 1-2 minutes

---

## 🛠️ Troubleshooting

### "Version number required"
```bash
# Wrong
./scripts/release.sh

# Correct
./scripts/release.sh 3.10.3
```

### "Invalid version format"
Use semantic versioning: `MAJOR.MINOR.PATCH`
```bash
# Wrong
./scripts/release.sh v3.10.3  # No 'v' prefix
./scripts/release.sh 3.10     # Missing patch

# Correct
./scripts/release.sh 3.10.3
```

### "No CHANGELOG entry found"
Add a section to `CHANGELOG.md`:
```markdown
## [3.10.3] - 2026-02-23

### Added
- Feature description
```

### "You have uncommitted changes"
Commit or stash changes first:
```bash
git status
git add .
git commit -m "fix: something"
# Then try release again
```

### Permission denied
Make scripts executable:
```bash
chmod +x scripts/*.sh
```

---

## 📖 Related Documentation

- [RELEASE.md](../RELEASE.md) - Complete release guide
- [CHANGELOG.md](../CHANGELOG.md) - Version history
- [CLAUDE.md](../CLAUDE.md) - Development guide

---

## 🔐 Safety Features

Both scripts include safety measures:

1. **Input validation** - Version format checked
2. **Pre-flight checks** - Git status verified
3. **Interactive prompts** - Review before pushing
4. **Backup files** - Temporary .bak files during edits
5. **Rollback friendly** - Easy to revert with git

---

**Last Updated:** 2026-02-23
