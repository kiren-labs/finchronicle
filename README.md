# 📖 FinChronicle

> A beautiful, offline-first Progressive Web App for chronicling your financial journey. No sign-up, no ads, no tracking - just simple expense and income management. Built by Kiren Labs.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Version](https://img.shields.io/badge/version-3.28.0-blue.svg)](VERSION.md)
[![Code of Conduct](https://img.shields.io/badge/code%20of%20conduct-contributor%20covenant-purple.svg)](CODE_OF_CONDUCT.md)
[![Security](https://img.shields.io/badge/security-policy-blue.svg)](SECURITY.md)

**[Live Demo](https://kiren-labs.github.io/finchronicle/)** | **[Documentation](VERSION.md)** | **[Contributing](CONTRIBUTING.md)** | **[Security](SECURITY.md)**

---

## 📱 Screenshots

<div align="center">
  <img src="screenshots/add-transaction.png" alt="Home Screen" width="200"/>
  <img src="screenshots/add-transaction.png" alt="Add Transaction" width="200"/>
  <img src="screenshots/list.png" alt="Transaction List" width="200"/>
  <img src="screenshots/dark-mode.png" alt="Dark Mode" width="200"/>
</div>

---

## ✨ Features

### 🎯 Core Features
- ✅ **100% Offline** - Works without internet connection
- ✅ **Privacy First** - All data stays on your device
- ✅ **No Sign-Up** - Start using immediately
- ✅ **Installable** - Add to home screen like a native app
- ✅ **Fast & Lightweight** - Only ~15KB total size
- ✅ **Dark Mode** - Easy on the eyes at night

### 💰 Financial Tracking
- ✅ **Income, Expenses & Transfers** - Track all transaction types
- ✅ **Categories** - Organize by customizable categories
- ✅ **Multi-Currency** - Support for 20+ major currencies
- ✅ **Monthly Budgets** - Set limits with over-budget alerts
- ✅ **Recurring Transactions** - Templates for regular payments
- ✅ **Tags & Search** - Full-text search and tag-based filtering
- ✅ **Accounts & Net Worth** - Track multiple accounts
- ✅ **Savings Rate Dashboard** - Monitor saving habits
- ✅ **Savings Goals** - Progress tracking with milestones
- ✅ **Smart Spending Alerts** - Pattern detection with rolling 90-day averages (v3.21.0)
- ✅ **Annual Report** - Year scorecard with YoY comparison & CSV export (v3.21.0)
- ✅ **Auto-Backup** - Scheduled encrypted backups (AES-GCM-256) + storage health (v3.22.0)
- ✅ **Multi-Currency** - Per-transaction foreign currency + exchange rate entry (v3.24.0)
- ✅ **Family Settlement** - Per-person balance from `attachedTo` tags (v3.26.0)
- ✅ **Reimbursement Workflow** - Mark-as-settled flow + settlement dashboard breakdown (v3.27.0)
- ✅ **Net Worth Trend** - Monthly snapshot store + SVG line chart (v3.28.0)
- ✅ **Export to CSV** - Backup, restore, and annual exports

### 🎨 User Experience
- ✅ **Quick Entry Templates** - Save & reuse common transactions
- ✅ **Optional Fields** - Payment method, merchant, expense type
- ✅ **Smart Category Suggestions** - Auto-suggest from notes
- ✅ **Transfer Autocomplete** - From/to account suggestions
- ✅ **Edit & Delete** - Manage transactions easily
- ✅ **Month & Category Filtering** - View specific time periods
- ✅ **Auto-Updates** - Get notified of new versions
- ✅ **Modern Icons** - Professional Remix Icon font

### 🛠️ Technical Features
- ✅ **ES Modules** - 25 focused modules, no build step required
- ✅ **Zero Dependencies** - No npm, no frameworks
- ✅ **Service Worker** - Cache-first offline strategy
- ✅ **IndexedDB** - 8 object stores for robust data (DB_VERSION 10)
- ✅ **Responsive Design** - Works on all screen sizes
- ✅ **WCAG AA Compliant** - Fully accessible
- ✅ **Version Management** - Semantic versioning with auto-update

---

## 🚀 Quick Start

### Option 1: Use the Hosted Version

1. Visit: **[https://kiren-labs.github.io/finchronicle/](https://kiren-labs.github.io/finchronicle/)**
2. On mobile, tap **Share** → **Add to Home Screen**
3. Start tracking your finances!

### Option 2: Self-Host (5 Minutes)

#### Using GitHub Pages

1. Fork this repository
2. Go to Settings → Pages
3. Source: Deploy from branch `main`
4. Your app will be at: `https://kiren-labs.github.io/finchronicle`

#### Using Local Server

```bash
# Clone the repository
git clone https://github.com/kiren-labs/finchronicle.git
cd finchronicle

# Start local server
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

**Note:** Service Worker requires HTTP/HTTPS. Don't open `index.html` directly!

---

## 💻 Development

### Prerequisites

- Any modern web browser
- A local web server (for testing service worker)
- Text editor (VS Code, Sublime, etc.)

### Project Structure

```
finchronicle/
├── index.html          # Main HTML structure
├── sw.js               # Service Worker (cache-first)
├── manifest.json       # PWA manifest
├── js/
│   ├── app.js          # Entry point — init, event bindings, SW registration
│   ├── state.js        # Single source of truth: state object, constants
│   ├── db.js           # All IndexedDB operations
│   ├── ui.js           # DOM rendering and UI state
│   ├── validation.js   # Transaction validation
│   ├── utils.js        # formatCurrency, formatDate, showMessage, sanitizeHTML
│   ├── currency.js     # Currency selector modal
│   ├── settings.js     # Dark mode, version checks, backup timestamp
│   ├── chart.js        # CSS conic-gradient donut chart
│   ├── recurring.js    # Recurring transaction templates
│   ├── budget.js       # Budget limits & alerts
│   ├── search.js       # Tags & full-text search
│   ├── transfer.js     # Transfer transactions, account autocomplete
│   ├── optional-fields.js  # Payment method, merchant, smart suggestions
│   ├── quick-entry.js  # Quick entry templates
│   ├── accounts.js     # Account CRUD & net worth dashboard
│   ├── savings.js      # Savings rate dashboard
│   ├── goals.js        # Savings goals with progress tracking
│   ├── alerts.js       # Smart spending alerts (v3.21.0)
│   ├── annual-report.js # Year scorecard & CSV export (v3.21.0)
│   ├── auto-backup.js  # Scheduled encrypted backups + storage health (v3.22.0)
│   ├── multi-currency.js # Per-transaction FX + exchange rate history (v3.24.0)
│   ├── settlement.js   # Family expense settlement (v3.26.0)
│   ├── faq.js          # Lazy-loaded FAQ
│   └── import-export.js # Lazy-loaded CSV import/export
├── css/
│   ├── tokens.css      # Design tokens (CSS custom properties)
│   ├── styles.css      # Component styles
│   ├── chart.css       # Chart-specific styles
│   └── dark-mode.css   # Dark theme overrides
├── icons/              # PWA icons
├── scripts/            # Build & release scripts
├── docs/               # Feature roadmap & architecture docs
├── CHANGELOG.md        # Detailed changelog
└── README.md           # This file
```

### Making Changes

1. **Edit files** — logic lives in `js/` modules, UI structure in `index.html`, styling in `css/`
2. **Update version** in three places:
   ```javascript
   // js/state.js
   export const APP_VERSION = '3.28.0';

   // sw.js
   const CACHE_NAME = 'finchronicle-v3.28.0';
   ```
   ```json
   // manifest.json
   "version": "3.28.0"
   ```
3. **Test locally**:
   ```bash
   python3 -m http.server 8000
   ```
4. **Update** `CHANGELOG.md` with your changes
5. **Commit and push**

### Customization

#### Change Currency

Click the currency button in the toolbar and select from 20+ currencies!

Or modify the default in [js/currency.js](js/currency.js):
```javascript
// In js/currency.js, getCurrency() function:
export function getCurrency() {
    const saved = localStorage.getItem('currency');
    return saved && currencies[saved] ? saved : 'INR'; // Change to your default
}
```

#### Add Categories

```javascript
// In js/state.js, categories object:
export const categories = {
    income: [
        'Salary',
        'Business',
        'Investment',
        'Your New Category', // Add here
        'Other Income'
    ],
    expense: [
        'Food',
        'Groceries',
        'Transport',
        'Your New Category', // Add here
        'Other Expense'
    ]
};
```

#### Change Theme Colors

```css
/* In css/tokens.css: */
--color-primary: #0051D5;     /* Blue - main app color */
--color-success: #34c759;     /* Green - income */
--color-danger: #ff3b30;      /* Red - expense */
--color-bg: #f5f5f7;          /* Light mode background */
--color-surface: #ffffff;     /* Card background */
```

---

## 📊 Supported Currencies

20 major currencies supported:

**Americas**: USD ($), CAD (C$)
**Europe**: EUR (€), GBP (£), CHF (Fr)
**Asia**: INR (₹), JPY (¥), CNY (¥), THB (฿), SGD (S$), HKD (HK$), KRW (₩), MYR (RM), PHP (₱), IDR (Rp), VND (₫)
**Middle East**: AED (د.إ), SAR (SR)
**Oceania**: AUD (A$), NZD (NZ$)

---

## 🔒 Privacy & Security

### Your Data
- ✅ Stored **locally** on your device only
- ✅ **Never sent** to any server
- ✅ **No tracking** or analytics
- ✅ **No accounts** or sign-up required
- ✅ **No ads** or monetization

### What We Collect
- ❌ **Nothing!** This app collects zero data.

### Data Access
- Only you can access your data
- Transaction data stays in your browser's IndexedDB
- Settings stay in your browser's localStorage
- Even we (the developers) can't see your data

---

## 🛣️ Roadmap

### Completed (v3.11–3.28)
- ✅ Recurring transactions (v3.11)
- ✅ Budget limits & alerts (v3.13)
- ✅ Tags & full-text search (v3.14)
- ✅ Transfer transactions + audit trail (v3.15)
- ✅ Optional fields system (v3.16)
- ✅ Quick Entry templates (v3.17)
- ✅ Accounts & Net Worth (v3.18)
- ✅ Savings Rate Dashboard (v3.19)
- ✅ Savings Goals (v3.20)
- ✅ Smart Spending Alerts & Annual Report (v3.21)
- ✅ Auto-Backup with AES-GCM-256 encryption (v3.22)
- ✅ Multi-Currency Transactions (v3.24)
- ✅ Family Expense Settlement (v3.26)
- ✅ Reimbursement Workflow (v3.27)
- ✅ Net Worth Trend chart (v3.28)

### Upcoming

- [ ] Dashboard & UI/UX fixes — savings rate, alert overload, period sync (v3.28.1)
- [ ] Budget vs Actual Report — consolidated table with variance per category (v3.29)
- [ ] Financial Health Ratios — emergency fund, debt-to-income, housing cost KPIs (v3.30)
- [ ] Cash Flow Forecast — 30/60/90-day projection from recurring templates (v3.31)
- [ ] Subscription Tracker — total monthly/yearly subscription cost view (v3.32)
- [ ] Duplicate Transaction Detection (v3.33)
- [ ] Loan / EMI Tracker — amortization schedule, payoff calculator (v3.34)
- [ ] Bank Statement CSV Importer — generic column mapper (v3.35)
- [ ] Local Notifications — recurring reminders, budget warnings (v3.36)
- [ ] Bulk Transaction Operations — recategorize, tag, delete (v3.37)
- [ ] Category Management — rename, merge, cleanup suggestions (v3.38)
- [ ] Business & Tax Export with tax year configuration (v3.39)
- [ ] Receipt Photos (v3.40)

See [FinChronicleFeatureRoadmap_v2.md](docs/FinChronicleFeatureRoadmap_v2.md) for detailed roadmap.

---

## 🤝 Contributing

We love contributions! Whether it's:

- 🐛 Bug reports
- 💡 Feature requests
- 📝 Documentation improvements
- 🔧 Code contributions

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Contribution Guide

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## 📈 Stats

- **Size**: ~15KB (total app)
- **Dependencies**: 1 (Remix Icon font - CDN)
- **Performance**: 100/100 Lighthouse score
- **Accessibility**: WCAG AA compliant
- **PWA Score**: Fully installable

---

## 🌟 Why This App?

### vs Mint / YNAB
- ✅ Free forever (no subscription)
- ✅ No sign-up required
- ✅ Complete privacy (data stays local)
- ✅ Works 100% offline
- ❌ No bank integration

### vs Spreadsheets
- ✅ Easier to use on mobile
- ✅ Offline-first mobile app
- ✅ Quick transaction entry
- ✅ Built-in insights
- ✅ Can export to CSV anytime

### vs Other PWAs
- ✅ Ultra lightweight (~15KB)
- ✅ True offline-first (no internet needed)
- ✅ Open source
- ✅ No vendor lock-in

---

## 🐛 Bug Reports

Found a bug? Please [open an issue](https://github.com/kiren-labs/finchronicle/issues/new) with:

- Browser and OS version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**TL;DR**: You can use, modify, and distribute this app freely. Just keep the original copyright notice.

---

## 🙏 Acknowledgments

- **Icons**: [Remix Icon](https://remixicon.com/) - Beautiful icon set
- **Inspiration**: Built with love for simple, privacy-focused finance tracking
- **Community**: Thanks to all contributors!

---

## 📞 Support

- **Documentation**: [VERSION.md](VERSION.md)
- **Issues**: [GitHub Issues](https://github.com/kiren-labs/finchronicle/issues)
- **Discussions**: [GitHub Discussions](https://github.com/kiren-labs/finchronicle/discussions)

---

## ⭐ Show Your Support

If this project helped you, please consider:
- ⭐ Starring the repository
- 🐦 Sharing on social media
- 🤝 Contributing improvements
- 📝 Writing a blog post about it

---

## 📜 Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

**Latest Release: v3.28.0**
- 📈 Net Worth Trend — monthly snapshot store (DB_VERSION 10) + SVG line chart
- ✅ Reimbursement Workflow — mark-as-settled flow + settlement dashboard breakdown (v3.27.0)
- 🌍 Multi-Currency Transactions — per-transaction FX + exchange rate history (v3.24.0)
- 🔐 Auto-Backup — AES-GCM-256 encryption + storage health dashboard (v3.22.0)
- 👨‍👩‍👧 Family Expense Settlement — per-person balance from `attachedTo` tags (v3.26.0)

---

<div align="center">

**Made with ❤️ for simple, private finance tracking**

[Report Bug](https://github.com/kiren-labs/finchronicle/issues) · [Request Feature](https://github.com/kiren-labs/finchronicle/issues) · [Contribute](CONTRIBUTING.md)

</div>
