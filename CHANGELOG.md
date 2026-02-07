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

## [3.7.0] - 2026-02-07

### Added
- 🎯 **Actionable Summary Tiles**: Tap summary cards to instantly navigate to filtered views
  - **This Month** → View all transactions for current month
  - **Total Entries** → View all transactions for current month
  - **Income** → View income transactions (current month)
  - **Expenses** → View expense transactions (current month)
  - Haptic feedback on mobile tap (50ms vibration)
  - Keyboard accessible (Tab, Enter, Space)
  - ARIA labels for screen readers

- 📊 **Trend Indicators**: Month-over-month insights at a glance
  - **This Month Net**: Shows MoM % change with ↑/↓ arrows and color coding
  - **Income**: Optional MoM trend (currently enabled)
  - **Expenses**: Shows "% of income" for spending context
  - Edge case handling: Shows "—" when no previous month data exists
  - Smart direction indicators: Green for improvements, red for declines

- 🎨 **Visual Consistency Improvements**:
  - Uniform tile heights (104px minimum)
  - Consistent cursor pointer on all interactive elements
  - Smooth `:active` state with scale animation
  - Focus-visible outline for keyboard navigation (3px primary color)
  - Enhanced hover states with translateY animation

- 📈 **Advanced Calculations**:
  - `calculateMoMDelta()`: Month-over-month percentage and absolute change
  - `calculateExpensePercentage()`: Expenses as % of income
  - `getMonthTotals()`: Aggregates transactions by month for trend analysis
  - `getPreviousMonth()`: Smart month navigation with year rollover
  - Handles edge cases: first month, zero income, empty previous month

- 🔍 **Type Filtering**: New `selectedType` filter ('all', 'income', 'expense')
  - Allows filtering transaction list by type
  - Integrated with summary tile navigation
  - Works alongside existing month and category filters

### Changed
- 📊 **Total Entries**: Now shows current month count (was: all-time count)
  - More contextually relevant to "This Month" summary
  - Aligns with user mental model when viewing monthly dashboard
- 🎨 **Summary Card Styling**: Enhanced interactive states for better UX
- 📝 **Summary Meta**: Added "This month" label to Total Entries for clarity
- 🎨 **"This Month" Card**: Now consistently blue (neutral) regardless of net balance
  - Aligns with CR spec: neutral tiles always use primary color
  - Only the trend indicator is colored green/red, not the entire card
  - Provides better visual distinction between static metrics and trends

### Technical
- Added 4 new helper functions for trend calculations (60+ lines)
- Extended `updateTransactionsList()` with type filtering
- Enhanced `updateSummary()` with trend calculation and display logic
- Added `selectedType` global variable to filter state
- New CSS classes: `.summary-trend`, `.summary-meta` for Phase 2 styling
- Updated summary card HTML with semantic attributes (role, tabindex, aria-label)

### Documentation
- 📋 Created **Change Request (CR) - REVISED.md**: Comprehensive implementation plan
  - Aligned with privacy-first, offline-first, vanilla JS architecture
  - Split into 2 phases: Visual Consistency + Tap Actions, Trend Indicators
  - Removed analytics/telemetry requirements
  - Includes MoM calculation formulas with edge case handling

### Fixed
- ♿ **Accessibility: Improved Contrast Ratios** - WCAG AA compliance for both light and dark modes

  **Light Mode Improvements:**
  - Success-strong: `#1e8e3e` → `#147A33` (darker green, 7:1 contrast on white)
  - Danger-strong: `#d93025` → `#C41E1A` (darker red, 6:1 contrast on white)
  - Compact summary income/expense amounts now highly visible on white surfaces

  **Dark Mode Improvements:**
  - Primary color: `#0051D5` → `#0053AD` (better balance for dark backgrounds)
  - Primary hover: Updated to `#409CFF` for better visibility
  - Success-strong: `#1e8e3e` → `#30E85D` (vibrant green, 9:1 contrast on `#1c1c1e`)
  - Danger-strong: `#d93025` → `#FF6B6B` (bright coral, 6.5:1 contrast on `#1c1c1e`)
  - Text-muted: `#98989d` → `#aeaeb2` (8.5:1 contrast)
  - Text-subtle: `#98989d` → `#8e8e93` (6.5:1 contrast)
  - Filter buttons: Active state now uses white text for proper contrast
  - Filter labels: Use CSS variables with proper contrast
  - Grouped view labels: Removed hardcoded colors, use theme-aware variables

  **Cross-Theme Fixes:**
  - Removed all hardcoded color values in favor of CSS variables
  - All text and interactive elements meet WCAG AA standards (4.5:1+)
  - Mobile and desktop audits now pass for both themes

### Planned
- Budget tracking per category
- Recurring transactions
- Search functionality
- Charts and graphs

---

## [3.6.0] - 2026-02-07

### Added
- 📱 **iOS Optimizations**: Professional mobile experience
  - Zoom enabled for accessibility (users with low vision can zoom)
  - Font sizes 16px+ prevent iOS auto-zoom on input focus
  - Increased touch targets to 48px+ (iOS standard)
  - Safe area support for iPhone notch and home indicator
  - Larger fonts on mobile (14-16px minimum)
  - Bottom navigation height increased to 60px
  - Better spacing and padding throughout
- ♿ **100% Accessibility Compliance (WCAG AA)**:
  - Skip to main content link for keyboard users
  - All buttons have proper aria-labels
  - Improved color contrast ratios (all pass WCAG AA)
  - Status green: #00a83e → #008833 (4.5:1 contrast)
  - Subtle text: #8e8e93 → #6e6e73 (4.6:1 contrast)
  - Edit/delete transaction buttons have screen reader labels
  - Pagination buttons have accessible labels
  - Hidden file inputs have proper ARIA labels

### Changed
- 🔍 Enhanced compact summary readability
  - Larger font sizes (main: 18px, stats: 14px)
  - Better spacing between elements
  - More readable separators and icons
- 📊 Improved form usability on mobile
  - Labels: 16px, bolder (600 weight)
  - All inputs: min-height 48px
  - Primary button: min-height 52px
  - Better touch targets throughout
- 🎯 Bottom navigation improvements
  - Icons: 26px (larger and clearer)
  - Labels: 14px font
  - Item height: 60px (easier tapping)
  - Better vertical alignment

### Technical
- Viewport meta allows zoom for accessibility compliance
- Mobile token scale increased for better readability
- All CSS tokens cleanup completed (95%+ coverage)

---

## [3.5.1] - 2026-02-06

### Added
- 📱 **Bottom Navigation Bar**: Modern mobile-first navigation
  - Fixed bottom navigation with Add, List, Groups, Settings
  - Always accessible - no need to scroll to switch tabs
  - Better thumb reach on mobile devices
  - Icons with labels for clarity
- 🎛️ **Smart Collapsible Summary**: Space-saving with compact view
  - Toggle button to collapse/expand summary cards
  - **Collapsed view shows one-line summary in white card** with all key metrics
  - Shows: This Month net • Total entries • Income • Expenses (all in one line)
  - Proper card styling when collapsed (white background, shadow, padding)
  - Entire collapsed card is clickable to expand (better UX)
  - Hover effect on collapsed card
  - Smooth animation with fade and height transition
  - State saved to localStorage (remembers preference)
  - Arrow icon rotates to indicate state
  - Color-coded compact stats (green for positive, red for negative)

### Changed
- 🎨 Refactored styles to use shared design tokens and reduced repeated values
- 🧩 Added `css/tokens.css` and updated dark mode to override tokens
- 🔄 Moved tab navigation from middle of screen to fixed bottom bar
- 📐 Removed Quick Refresh button from header (redundant)
- 🎯 Summary card icons reduced to 24px (better proportions)
- ✍️ Improved app name typography (bolder, tighter letter-spacing, blue icon)
- ➡️ Quick Add button moved to right side of header (better mobile thumb reach)
- 📊 Added "Summary" section header with collapse control
- 📏 Compact summary view shows all stats in one line when collapsed
- 🔄 Both detailed cards and compact view stay in sync via updateSummary()
- 📱 **iOS Optimizations**: Better mobile experience
  - Disabled zoom (prevents accidental zoom, app-like experience)
  - Increased bottom nav height to 60px (better touch targets)
  - Larger font sizes on mobile (14px labels, 16px inputs)
  - Minimum touch target: 48x48px for all interactive elements
  - Added safe-area-inset support for iPhone notch/home indicator
  - Increased spacing and padding for better readability
  - Bottom nav icons: 26px (larger and clearer)

---

## [3.5.0] - 2026-02-06

### Added
- 💾 **Backup and Restore System**: Complete backup/restore functionality
  - Create timestamped backups with metadata (backup date, version, transaction count, date range, currency)
  - Multiple backup support - keep as many backup files as you want
  - Backup preview modal - see what's in a backup before restoring
  - **Merge mode restore** - preserves existing data, adds only new transactions
  - **Automatic duplicate detection** - skips transactions that already exist
  - Enhanced CSV format with metadata headers as comments
  - All transaction fields included (ID, CreatedAt for data integrity)
- 🔍 **Backup Preview Modal**: Visual preview before restoring
  - Shows backup date, transaction count, date range, currency
  - Informational message about merge mode
  - Cancel or confirm restore action
- 📊 **Restore Report Modal**: Detailed statistics after restore
  - Total transactions in backup
  - New transactions added
  - Duplicates skipped
  - Current total transactions
  - Color-coded statistics with icons
- ✨ **Compact Single-Line Header**: Redesigned header for better space utilization
  - Quick Add button (+ icon) - instantly jump to add transaction form
  - Inline status and version - all in one line
  - Improved app name typography (bolder, tighter letter-spacing)
  - Blue wallet icon for better brand identity
  - Saves ~20px vertical space
- 🎨 **Enhanced Summary Cards with Icons**: Improved visual design
  - Icons added to all 4 cards (calendar, checklist, up/down arrows)
  - Color-coded icons match card purpose (green/red/blue)
  - 2x2 grid layout maintained for balance
  - Hover effects for interactivity
  - Clean white background with proper icon sizing (24px)

### Changed
- 🎨 Settings tab reorganized with backup/restore buttons
- 📦 Backup files now use timestamp-based naming: `finchronicle-backup-YYYY-MM-DD-HHMMSS.csv`
- ✅ Restore operations now use **merge mode** (safe, non-destructive)
- 🔄 Existing transactions are preserved during restore
- 🏗️ Header redesigned to single-line compact layout (saves vertical space)
- 📐 Summary cards now use hero layout with "This Month" emphasized
- 🎯 Better use of horizontal space in header with quick action buttons

### Technical
- Added `isDuplicateTransaction()` function for duplicate detection
- Added `createBackup()` and `generateBackupMetadata()` for enhanced backups
- Added `parseBackupCSV()` with metadata extraction
- Added `showRestoreReport()` and `closeRestoreReport()` for statistics display
- Added `quickAddTransaction()` function for header quick action
- Added restore report modal with `.restore-report-info` styling
- Added `.modal-info` component for informational messages
- Added `.header-content`, `.header-actions`, `.header-btn`, `.header-meta` CSS classes
- Added `.card-icon` and `.card-content` for icon-based card layout
- Updated summary cards to use flexbox with icons (24px size)
- Enhanced h1 typography: font-weight 700, letter-spacing -0.5px
- Blue wallet icon color (#0051D5) for brand identity
- Comprehensive error handling and validation for backup files
- Duplicate matching: same date, type, category, amount, and notes
- Header height reduced from ~56px to ~36px (saves 20px)
- Single-line header layout with flexbox for better space utilization

### Security
- Backup validation checks for required headers
- Data integrity validation (dates, amounts, types)
- Error recovery: if restore fails, existing data is preserved
- Safe merge mode prevents accidental data loss

### Technical
- Added `toggleSummaryCollapse()` and `loadSummaryState()` functions
- Compact summary dynamically updates via `updateSummary()`
- All hardcoded CSS values replaced with design tokens
- Added `--color-install` token for install prompt
- Mobile font scale increased: 13px → 14px, 15px → 16px
- Viewport meta allows user zoom for accessibility
- Minimum touch targets: 48px for iOS compliance
- Token coverage: 95%+ (only layout-specific values remain hardcoded)
- Summary values now use `--color-success-strong` (#1e8e3e) and `--color-danger-strong` (#d93025)
- Icons still use lighter colors, text uses darker colors for contrast
- Skip link positioned absolutely with focus transition
- All color combinations tested for 4.5:1 contrast ratio

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

- **v3.6.0** - iOS optimizations, enhanced mobile UX (2026-02-07)
- **v3.5.1** - Bottom navigation, design tokens, UI refinements (2026-02-06)
- **v3.5.0** - Backup and restore system with preview (2026-02-06)
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
