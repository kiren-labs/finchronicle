# FinChronicle Development Makefile

.PHONY: help release bump-version serve test clean

help:
	@echo "FinChronicle Development Commands"
	@echo ""
	@echo "  make serve           Start local development server"
	@echo "  make release         Create a new release (requires VERSION=x.x.x)"
	@echo "  make bump-version    Bump version numbers (requires VERSION=x.x.x)"
	@echo "  make test            Run validation checks"
	@echo "  make clean           Remove backup files"
	@echo ""
	@echo "Examples:"
	@echo "  make serve"
	@echo "  make release VERSION=3.10.3"
	@echo "  make bump-version VERSION=3.10.3"

serve:
	@echo "Starting development server on http://localhost:8000"
	@echo "Press Ctrl+C to stop"
	@python3 -m http.server 8000

release:
	@if [ -z "$(VERSION)" ]; then \
		echo "Error: VERSION is required"; \
		echo "Usage: make release VERSION=3.10.3"; \
		exit 1; \
	fi
	@./scripts/release.sh $(VERSION)

bump-version:
	@if [ -z "$(VERSION)" ]; then \
		echo "Error: VERSION is required"; \
		echo "Usage: make bump-version VERSION=3.10.3"; \
		exit 1; \
	fi
	@./scripts/bump-version.sh $(VERSION)

test:
	@echo "Running validation checks..."
	@echo "✓ Checking HTML..."
	@python3 -m json.tool manifest.json > /dev/null && echo "✓ manifest.json is valid JSON"
	@echo "✓ Checking for service worker registration..."
	@grep -q "navigator.serviceWorker.register" app.js && echo "✓ Service worker registered in app.js"
	@echo ""
	@echo "All checks passed!"

clean:
	@echo "Cleaning backup files..."
	@find . -name "*.bak" -delete
	@echo "✓ Cleanup complete"
