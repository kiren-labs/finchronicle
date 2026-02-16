# Scripts

This directory contains utility scripts for FinChronicle development.

## validate-local.sh

Runs the same validation checks as the CI/CD pipeline locally, allowing you to catch issues before pushing code.

### Installation

**Option 1: Install html5validator (Recommended)**
```bash
pip install html5validator
```

**Option 2: Use Docker**
```bash
docker pull cyb3rjak3/html5validator
```

### Usage

```bash
# Run all validations
./scripts/validate-local.sh

# Or from project root
bash scripts/validate-local.sh
```

### What it checks

✅ **HTML/CSS Validation** - Validates all HTML and CSS files
✅ **manifest.json** - Checks JSON syntax and required PWA fields
✅ **Service Worker** - Verifies service worker registration exists
✅ **Version Consistency** - Ensures app.js, sw.js, and manifest.json versions match
✅ **Code Quality** - Checks for debugger statements, eval(), and console.logs

### Exit Codes

- `0` - All validations passed ✓
- `1` - Some validations failed ✗

### Integration with Git Hooks

You can add this to your pre-commit hook:

```bash
# Create .git/hooks/pre-commit
#!/bin/bash
./scripts/validate-local.sh
```

Then make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

### CI/CD Pipeline

This script mirrors the GitHub Actions CI workflow defined in `.github/workflows/ci.yml`. Running it locally helps catch issues early and speeds up development.
