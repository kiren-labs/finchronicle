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

## [3.10.3] - 2026-02-23

### Added
- **User Feedback System** - Easy ways for users to provide feedback
  - GitHub Issues integration for bug reports, feature requests, and general feedback
  - Pre-configured issue templates (bug report, feature request, general feedback)
  - Email fallback for users without GitHub accounts
  - Feedback button in header navigation for easy access
  - Feedback button in Settings page for better discoverability
  - Modal with organized feedback options

- **Automated Release System** - Streamlined release process
  - `release.sh` - One-command automated release process
  - `bump-version.sh` - Automatic version updates across all files
  - GitHub Actions workflow for automated releases and tagging
  - RELEASE.md documentation with detailed release guide
  - Pull request template for code contributions

### Technical
- New feedback modal UI component with responsive design
- New functions: `openFeedbackModal()`, `closeFeedbackModal()`
- GitHub issue templates in `.github/ISSUE_TEMPLATE/`
- GitHub Actions release workflow in `.github/workflows/release.yml`
- Feedback modal styled to match app design system
- Mobile-responsive feedback interface
- Version consistency validation in CI/CD pipeline
- Automatic changelog extraction for release notes

---

## [3.10.2] - 2026-02-20

### Added
- **Transaction Validation Layer** - Comprehensive validation for all transactions (Foundation for future features)
  - Type validation: Only 'income' or 'expense' allowed
  - Amount validation: Must be positive, maximum ₹99 crore (999,999,999)
  - Category validation: Must match available categories for transaction type
  - Date validation: No future dates, no dates before 1900
  - Notes sanitization: XSS protection via HTML sanitization
  - Notes length validation: Maximum 500 characters
  - Centralized validation logic for maintainability

### Security
- Implemented XSS protection for notes field using HTML sanitization
- All user inputs now validated before saving to database
- Sanitized transaction data stored to prevent injection attacks

### Technical
- New functions: `validateTransaction()`, `sanitizeHTML()`
- Updated form submission handler to use centralized validation
- Validation returns detailed error objects for debugging
- All validation errors displayed to user with clear messages
- Zero breaking changes - backward compatible with existing data
- No database migration required (validation is JavaScript-only)

### Improved
- Better error messages for invalid transaction data
- Consolidated validation logic (previously scattered across form handler)
- Data integrity protection for all future features
- Performance: Negligible impact (~1ms per validation)

---

## [3.10.1] - 2026-02-16

### Fixed
- **Amount Validation** - Fixed floating point precision issue in decimal validation
  - Form input now correctly accepts amounts with 1-2 decimal places (e.g., 2550.3, 2550.30)
  - Previously rejected valid amounts due to JavaScript floating point arithmetic issues
  - Refactored validation logic to use string-based decimal checking instead of `Number.isInteger(amount * 100)`
  - Added centralized `validateAmount()` function for consistent validation across form and CSV imports
  - CSV imports now also validate decimal places (max 2 decimals)
  - Improved error messages and validation consistency

### Changed
- Centralized amount validation logic for better maintainability
- Amount values are now rounded to 2 decimal places for consistency


## [3.10.0] - 2026-02-16

### Added
- **Budget Health Card** - Real-time spending insights and projections
  - Daily spending pace tracker showing average daily expenses
  - Days remaining in current month counter
  - Projected month-end spending based on current pace
  - Health status indicator: On Track, Caution, or Over Pace
  - Color-coded visual indicators (green/yellow/red)
  - Automatically displays in Monthly Insights section
  - Smart detection of current vs historical months

### Improved
- Monthly insights now provide more actionable spending data
- Better visibility into spending patterns and trends
- Helps users stay within budget through proactive alerts

---

## [3.9.1] - 2026-02-08

### Fixed
- Dark mode contrast for backup status, backup header, and FAQ headers/icons
- Backup status now refreshes immediately after CSV export

## [3.9.0] - 2026-02-08

### Added
- **Backup Reminder System** - Track and encourage regular data backups
  - Backup status card in Settings showing last backup date
  - Color-coded status indicators (green/yellow/red) based on backup age
  - One-click export directly from backup status card
  - 7-day grace period for new users before showing warnings
  - Automatic timestamp recording on each CSV export

- **Comprehensive FAQ** - In-app help section in Settings tab
  - Data Backup & Recovery section (5 questions)
    - Where data is stored, how to backup, device loss recovery
  - Privacy & Security section (3 questions)
    - Server communication, data access, security guarantees
  - Usage & Features section (3 questions)
    - Import bank statements, change currency, insights explanation
  - Collapsible accordion design for easy navigation
  - Direct link from backup card to FAQ backup section

### Improved
- Export function now records backup timestamp automatically
- Users proactively notified when backup is outdated (30+ days)
- Better onboarding for data safety awareness
- Settings tab provides comprehensive self-service help
- All new components fully responsive on mobile devices

### Technical
- New localStorage key: `last_backup_timestamp`
- New functions: `loadBackupTimestamp()`, `updateBackupTimestamp()`, `getDaysSinceBackup()`, `shouldShowBackupReminder()`, `renderBackupStatus()`, `renderFAQ()`, `toggleFAQSection()`, `toggleFAQItem()`, `scrollToFAQ()`, `updateSettingsContent()`
- Modified `exportToCSV()` to call `updateBackupTimestamp()`
- Modified `switchTab()` to populate settings content dynamically
- Added CSS for backup status card and FAQ accordion
- Full dark mode support for all new components
- Zero breaking changes - purely additive features

---

## [3.8.0] - 2026-02-07

### Added
- **Monthly Insights Panel** - Enhanced Groups tab with comprehensive monthly overview
  - Monthly summary cards showing income, expenses, savings, and transaction count
  - Month-over-month trend indicators for all metrics
  - **Month selector dropdown** - Switch between months directly in the insights section
  - Defaults to current month, with easy access to all historical months
- **Top Spending Categories** - Visual breakdown of top 5 expense categories
  - Shows category name, transaction count, total amount, and percentage of expenses
  - Sorted by spending amount (highest first)
  - Helps identify budget-consuming categories at a glance

### Improved
- Groups tab now provides actionable insights above existing month/category grouping
- Better visibility into spending patterns without complex accounting
- Month selector allows quick navigation between different months' insights
- Consistent design language with existing summary cards
- Fully responsive on mobile devices (dropdown goes full-width on small screens)

### Technical
- New functions: `getMonthInsights()`, `getTopSpendingCategories()`, `renderMonthlyInsights()`
- Updated `updateGroupedView()` to include insights section
- Added CSS styles for insights cards and category rows
- Dark mode support for all new UI components

---

## [3.7.1] - 2026-02-07

### Changed
- **Code Organization**: Separated JavaScript into external `app.js` file (~1,920 lines)
- Improved developer experience with cleaner file structure
- Better browser caching efficiency (HTML and JS cached independently)
- Enhanced code maintainability and debugging
- Service worker now caches `app.js` for offline functionality

### Technical
- Created `app.js` containing all application logic
- Updated service worker cache list to include `app.js`
- Maintained zero-framework, zero-build-tool philosophy
- All functionality remains identical to v3.7.0

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

- 🔤 **Enhanced Typography for Financial Data**: Improved readability and alignment
  - Added monospace font stack (`ui-monospace`, SF Mono, Monaco, etc.) for all numerical values
  - Applied to summary cards, transaction amounts, analytics, input fields, and reports
  - Enabled `font-variant-numeric: tabular-nums` for equal-width digits
  - Better visual alignment in transaction lists and grouped views
  - Zero external dependencies - uses system monospace fonts
  - New CSS token: `--font-family-mono` for numerical data

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
- New CSS token: `--font-family-mono` for numerical data typography
- Updated 9 CSS classes with monospace font: `.summary-value`, `.transaction-amount`, `.compact-stat`, `.group-value`, `.group-total`, `.pagination-info`, `.report-value`, `.preview-value`, `input[type="number"]`
- Applied `font-variant-numeric: tabular-nums` to body for equal-width digits

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
