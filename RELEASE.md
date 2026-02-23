# Release Process

This document describes how to create a new release of FinChronicle.

## Quick Release (Recommended)

```bash
# 1. Update CHANGELOG.md
nano CHANGELOG.md

# 2. Run release script
./scripts/release.sh 3.10.3
```

Done! The script handles everything automatically.

---

## Detailed Release Steps

### 1. Update CHANGELOG.md

Add a new version section at the top of `CHANGELOG.md`:

```markdown
## [3.10.3] - 2026-02-23

### Added
- New feature description

### Fixed
- Bug fix description

### Changed
- Change description
```

### 2. Run Release Script

```bash
./scripts/release.sh 3.10.3
```

The script will:
1. ✓ Validate version format (semantic versioning)
2. ✓ Check for uncommitted changes
3. ✓ Pull latest changes from main
4. ✓ Update version in `app.js`, `sw.js`, `manifest.json`
5. ✓ Verify CHANGELOG has entry for this version
6. ✓ Show diff for review
7. ✓ Commit version bump
8. ✓ Create git tag (`v3.10.3`)
9. ✓ Push commit and tag to GitHub

### 3. GitHub Actions Takes Over

Once the tag is pushed, GitHub Actions automatically:
1. ✓ Verifies version consistency across files
2. ✓ Extracts changelog for this version
3. ✓ Creates GitHub Release with notes
4. ✓ Triggers GitHub Pages deployment

View release at: `https://github.com/kiren-labs/finance-tracker/releases/tag/v3.10.3`

---

## Manual Process (Alternative)

If you prefer manual control:

### Step 1: Bump Version

```bash
./scripts/bump-version.sh 3.10.3
```

This updates:
- `app.js` → `APP_VERSION = '3.10.3'`
- `sw.js` → Version comment and `CACHE_NAME`
- `manifest.json` → `"version": "3.10.3"`

### Step 2: Update CHANGELOG

Edit `CHANGELOG.md` and add version section.

### Step 3: Commit and Tag

```bash
git add app.js sw.js manifest.json CHANGELOG.md
git commit -m "chore: release v3.10.3"
git tag v3.10.3
git push origin main --tags
```

### Step 4: Wait for GitHub Actions

GitHub Actions will create the release automatically.

---

## Scripts Reference

### `release.sh <version>`

Full automated release process. Bumps version, commits, tags, and pushes.

**Usage:**
```bash
./scripts/release.sh 3.10.3
```

**Features:**
- Pre-flight checks (uncommitted changes, branch validation)
- Automatic version bumping
- CHANGELOG validation
- Interactive review before pushing
- Creates and pushes git tag

### `bump-version.sh <version>`

Updates version numbers in all 3 files. Use this if you only want to update versions without committing.

**Usage:**
```bash
./scripts/bump-version.sh 3.10.3
```

**Updates:**
- `app.js` line 2
- `sw.js` lines 3-4
- `manifest.json` version field

---

## Versioning Strategy

FinChronicle follows [Semantic Versioning](https://semver.org/):

**Format:** `MAJOR.MINOR.PATCH` (e.g., `3.10.3`)

- **MAJOR**: Breaking changes (rare)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

**Examples:**
- Bug fix: `3.10.2` → `3.10.3`
- New feature: `3.10.3` → `3.11.0`
- Breaking change: `3.11.0` → `4.0.0`

---

## Troubleshooting

### "No CHANGELOG entry found"

Add a section to `CHANGELOG.md`:

```markdown
## [3.10.3] - 2026-02-23

### Added
- Feature description
```

### "Version mismatch" error

The tag version must match versions in `app.js`, `sw.js`, and `manifest.json`.

Run:
```bash
./scripts/bump-version.sh 3.10.3
```

### GitHub Actions failed

Check:
1. All 3 files have matching versions
2. CHANGELOG has entry for this version
3. GitHub Actions has write permissions

View logs: https://github.com/kiren-labs/finance-tracker/actions

### Need to delete a tag

```bash
# Delete local tag
git tag -d v3.10.3

# Delete remote tag
git push origin :refs/tags/v3.10.3
```

---

## Post-Release Checklist

After releasing:

- [ ] View release on GitHub: https://github.com/kiren-labs/finance-tracker/releases
- [ ] Wait 1-2 minutes for GitHub Pages deployment
- [ ] Test live site: https://kiren-labs.github.io/finance-tracker/
- [ ] Check version in footer matches new version
- [ ] Test update notification (clear cache or use incognito)
- [ ] Announce release (Twitter, blog, etc.)

---

**Last Updated:** 2026-02-23
