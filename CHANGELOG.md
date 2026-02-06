# Changelog

All notable changes to Finance Tracker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Budget tracking per category
- Recurring transactions
- Search functionality
- Charts and graphs

---

## [3.4.0] - 2026-02-06

### Added
- ✨ **Enhanced Form Feedback**: Multi-layered confirmation when adding transactions
  - Loading state with spinner animation while saving
  - Success state with checkmark and green button color
  - Card pulse animation with green glow effect
  - Haptic feedback (vibration) on mobile devices
  - Improved success message with bounce animation and checkmark icon
- 📱 **Better Mobile Keyboard**: Amount input now shows optimized decimal keypad
  - Added `inputmode="decimal"` for perfect currency input experience
  - Consistent across iOS and Android devices

### Changed
- 🗄️ **Major upgrade: IndexedDB storage** for transactions (unlimited scale)
- 💾 localStorage now used only for settings (currency, dark mode, version)
- 🔄 Auto-migration from localStorage to IndexedDB on first load
- ⚡ Improved performance with indexed queries for filters
- 🎨 Cleaner amount input field (removed spinner arrows on desktop)
- 📅 Fixed date input field overflow and height consistency on iOS devices
- 🔢 Improved decimal precision for amount input (step changed to 0.01)

### Technical
- Added IndexedDB wrapper with Promise-based API
- Hybrid storage architecture (IndexedDB + localStorage)
- Backward compatible migration (preserves existing data)
- Implemented button state management (loading, success, disabled states)
- Added CSS animations: `successPulse`, `slideDownBounce`, spinner rotation
- Enhanced form submission flow with 800ms feedback cycle
- Added haptic feedback using Vibration API

---

## [3.3.2] - 2026-01-31

### Changed
- 📱 Refined transaction list layout on mobile for better readability and spacing
- 🎨 Replaced transaction icon with a styled status indicator for more room
- 🧊 Softened edit/delete button styling with translucent treatments

---

## [3.3.1] - 2026-01-31

### Changed
- 💎 Enhanced currency display with badge styling for better visibility
- 📊 Reorganized currency list by priority (local, major, regional currencies)

---

## [3.3.0] - 2026-01-31

### Added
- 📥 **CSV Import**: Import transactions from CSV files via toolbar button
  - Supports app export format and custom CSVs with Date, Category, Amount, Notes/Description
  - Automatic date normalization for common formats

### Changed
- Expanded and refined expense categories for better budgeting accuracy

---

## [3.1.0] - 2025-01-15

### Added
- 🎨 **Professional Icons**: Replaced all emoji icons with Remix Icon font for consistent appearance across all devices
- 🔄 **Manual Update Check**: Added refresh button in toolbar to check for updates manually
- 🎯 **Improved Update Mechanism**:
  - Service worker now activates immediately without closing tabs
  - One-click "Update Now" button with automatic reload
  - Background update checking every 60 seconds
  - Shows clear update available notification

### Changed
- Transaction icons now use colored, filled arrow icons (up for income, down for expense)
- Action buttons (edit/delete) now use professional icon font
- Tab icons updated to modern, clean designs
- Dark mode toggle uses sun/moon icons instead of emojis

### Fixed
- Update mechanism now works properly - no need to delete and reinstall app
- Icons now render consistently on iOS, Android, Windows, and macOS
- Spinning animation on update check button

### Technical
- Added Remix Icon font from CDN
- Updated service worker cache to v5
- Added proper icon styling for light and dark modes
- Improved service worker message handling

---

## [3.0.0] - 2025-01-14

### Added
- 💱 **Multi-Currency Support**: Choose from 20 major world currencies
  - USD, EUR, GBP, INR, JPY, CNY, THB, SGD, and 12 more
  - Beautiful currency selector modal
  - Currency symbol updates throughout the app
  - Persistent currency selection stored locally
- 🎛️ **Smart Type Toggle**: Replaced dropdown with mobile-friendly toggle buttons for Income/Expense
- 📊 **Dynamic Categories**: Categories now filter based on selected transaction type
  - Income categories: Salary, Freelance, Business, Investment, Other
  - Expense categories: Food, Transport, Shopping, Bills, Entertainment, Health, Education, Other
- 🔢 **Version Display**: Version number now visible in app header
- 🔔 **Auto-Update Notifications**:
  - Automatic version checking on app load
  - Green banner notification when updates available
  - Shows old → new version number
- 🔄 **Service Worker Updates**: Detects and notifies about new versions

### Changed
- Transaction type selection is now a toggle button instead of dropdown
- Category dropdown populates dynamically based on selected type
- Amount label now shows selected currency symbol
- CSV export now includes currency code in header
- Improved update flow with better user feedback

### Technical
- Added version management system with localStorage
- Service worker cache updated to v3
- Added currency selector modal with 20 currencies
- Improved form UX with toggle buttons
- Added proper ARIA roles for accessibility

---

## [2.0.0] - 2025-01-13

### Added
- ✏️ **Edit Transactions**: Update any existing transaction
  - Click edit button on transaction
  - Form pre-fills with transaction data
  - Save updates or cancel
- 🗑️ **Delete Transactions**: Remove transactions with confirmation
  - Click delete button on transaction
  - Confirmation modal to prevent accidents
  - Permanent deletion
- 🔍 **Category Filtering**: Filter transaction list by specific category
  - Dropdown in List tab
  - Shows all categories from transactions
  - Filter by income or expense categories
- 📥 **Export to CSV**: Download all transactions
  - Export button in toolbar
  - CSV includes: Date, Type, Category, Amount, Notes
  - Filename includes current date
  - Open in Excel, Google Sheets, etc.
- 🌙 **Dark Mode**: Toggle between light and dark themes
  - Moon/sun icon in toolbar
  - Saves preference to localStorage
  - All UI elements adapt to dark theme
- 🎨 **Improved UI**: Better mobile experience
  - Larger touch targets
  - Better spacing
  - Smoother animations
  - iOS-style design polish

### Changed
- Transaction items now show edit and delete buttons
- Toolbar redesigned with export and dark mode buttons
- Improved transaction list layout
- Better visual feedback on interactions

### Fixed
- Color contrast issues for WCAG AA compliance
- Form label associations for accessibility
- Service Worker registration error handling

### Technical
- Added modal system for confirmations
- Implemented CSV generation and download
- Added dark mode CSS with all component support
- Service worker cache updated to v2
- Improved localStorage data management

---

## [1.0.0] - 2025-01-12

### Added
- 💰 **Track Transactions**: Add income and expense transactions
  - Type (Income/Expense)
  - Amount
  - Category
  - Date
  - Notes (optional)
- 📊 **Monthly Summary**: View current month's financial overview
  - Net amount (income - expenses)
  - Total income
  - Total expenses
  - Transaction count
- 📋 **Transaction List**: View all transactions chronologically
  - Color-coded by type (green for income, red for expense)
  - Shows category, notes, date, and amount
  - Newest first
- 📅 **Month Filtering**: Filter transactions by specific month
  - Buttons for recent months
  - Dynamic month list based on transactions
- 🎯 **Category Grouping**: View spending by category
  - By Month view: Income/Expense/Net per month
  - By Category view: Total spending per category
  - Entry counts for each group
- 💾 **Offline-First**: Works completely without internet
  - Service Worker caching
  - localStorage persistence
  - All data stays on device
- 📱 **Progressive Web App**: Installable on mobile devices
  - Add to Home Screen on iOS
  - Manifest.json configuration
  - App-like experience
- ♿ **Accessible**: WCAG AA compliant
  - Proper semantic HTML
  - ARIA labels
  - Keyboard navigable
  - Screen reader friendly
- 🎨 **Beautiful Design**: iOS-style interface
  - Clean, modern look
  - Smooth animations
  - Responsive layout
  - Works on all screen sizes

### Technical
- Single HTML file with embedded CSS and JavaScript
- Service Worker for offline support
- Web App Manifest for PWA
- localStorage for data persistence
- No backend or database required
- No external dependencies (except icons)
- Total size: ~15KB

---

## Version History

- **v3.4.0** - IndexedDB storage, enhanced form feedback, mobile improvements (2026-02-06)
- **v3.3.2** - Mobile layout refinements (2026-01-31)
- **v3.3.1** - Currency display improvements (2026-01-31)
- **v3.3.0** - CSV import (2026-01-31)
- **v3.1.0** - Professional icons, improved updates (2025-01-15)
- **v3.0.0** - Multi-currency, smart toggles, version system (2025-01-14)
- **v2.0.0** - Edit, delete, filter, export, dark mode (2025-01-13)
- **v1.0.0** - Initial release (2025-01-12)

---

## Upgrade Notes

### Upgrading to v3.4.0
- **Automatic data migration**: All transactions automatically migrate from localStorage to IndexedDB
- Migration happens seamlessly on first load
- All existing data preserved (transactions, currency, dark mode preference)
- Enhanced form feedback works immediately
- Mobile keyboard improvements apply automatically
- No manual action required

### Upgrading from v3.0.0 to v3.1.0
- No data migration needed
- Icons automatically update to new font
- Currency selection is preserved
- All transactions remain intact

### Upgrading from v2.0.0 to v3.0.0
- No data migration needed
- Default currency set to INR (changeable in settings)
- Transaction categories work same way
- All existing data compatible

### Upgrading from v1.0.0 to v2.0.0
- No data migration needed
- All transactions automatically get IDs
- Dark mode preference starts as disabled
- All existing transactions editable/deletable

---

## Breaking Changes

### v3.0.0
- Category structure changed to object format
- Type dropdown replaced with toggle button

### v2.0.0
- Transaction data structure extended with `createdAt` field
- Service worker cache name changed (old cache auto-deleted)

---

## Links

- [Documentation](VERSION.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [MIT License](LICENSE)
- [GitHub Repository](https://github.com/kiren-labs/finchronicle)
- [Live Demo](https://kiren-labs.github.io/finchronicle/)
