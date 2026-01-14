# Offline-First Finance Tracker 💰

## Simple. Fast. Works Offline.

A lightweight, offline-first Progressive Web App (PWA) for tracking your daily transactions. No internet required, no complex setup, just add transactions and view insights.

---

## ✨ Features

### Core Features
✅ **Offline First** - Works completely without internet
✅ **Simple Entry** - Add transaction in < 10 seconds
✅ **Edit Transactions** - Update existing entries
✅ **Delete Transactions** - Remove entries with confirmation
✅ **Multi-Currency** - 20 currencies supported (USD, EUR, GBP, INR, THB, etc.)
✅ **Smart Type Toggle** - Toggle button for Income/Expense (mobile-friendly)
✅ **Dynamic Categories** - Categories filter based on transaction type
✅ **Transaction List** - View all your transactions
✅ **Monthly Filtering** - Filter by any month
✅ **Category Filtering** - Filter by specific category
✅ **Category Grouping** - See spending by category
✅ **Monthly Reports** - Income vs expenses breakdown
✅ **Export to CSV** - Download all data for backup
✅ **Dark Mode** - Easy on the eyes at night
✅ **Auto-Save** - All data saved automatically
✅ **Auto-Updates** - Notifies when new version is available
✅ **Version Display** - Always know which version you're running
✅ **Install as App** - Installs on iPhone like native app

### What You Can Track
- 💸 Expenses (Food, Transport, Shopping, etc.)
- 💰 Income (Salary, Freelance, Business, etc.)
- 📅 Date of transaction
- 📝 Notes/descriptions
- 📊 Monthly summaries
- 🎯 Category-wise spending

---

## 🚀 Quick Start (5 Minutes)

### Option 1: Test Locally (Fastest - 1 Minute)

**Using the start script (easiest):**
```bash
cd offline-tracker
./start-server.sh
# Then open: http://localhost:8000
```

**Or manually:**
```bash
cd offline-tracker
python3 -m http.server 8000
# Then open: http://localhost:8000
```

**Important:** Don't open `index.html` directly - Service Workers require HTTP/HTTPS!

### Option 2: Deploy to GitHub Pages (5 Minutes)

### Step 1: Deploy to GitHub Pages (2 minutes)

1. **Create GitHub repository:**
   - Go to github.com (create account if needed)
   - Click "New repository"
   - Name: `finance-tracker`
   - Make it Public
   - Click "Create repository"

2. **Upload files:**
   - Click "uploading an existing file"
   - Drag and drop these files:
     - `index.html`
     - `sw.js`
     - `manifest.json`
   - Click "Commit changes"

3. **Enable GitHub Pages:**
   - Go to Settings → Pages
   - Source: "Deploy from a branch"
   - Branch: "main" → folder: "/(root)"
   - Click "Save"
   - Wait 1-2 minutes
   - Your URL: `https://YOUR-USERNAME.github.io/finance-tracker`

### Step 2: Open on iPhone (1 minute)

1. Open Safari on your iPhone
2. Go to your GitHub Pages URL
3. The app loads and works immediately!

### Step 3: Install as App (2 minutes)

1. In Safari, tap the **Share** button (square with arrow)
2. Scroll down and tap **"Add to Home Screen"**
3. Name it: **Finance Tracker**
4. Tap **"Add"**
5. Done! You now have an app icon on your home screen

---

## 📱 How to Use

### Adding a Transaction (10 seconds)

1. Open the app
2. You're on the "Add" tab by default
3. Fill in:
   - Type: Income or Expense
   - Amount: Enter amount
   - Category: Select from dropdown
   - Date: Auto-filled (today), or change
   - Notes: Optional description
4. Tap "Save Transaction"
5. Done! ✅

### Viewing Transactions

1. Tap **"List"** tab
2. See all transactions (newest first)
3. Filter by month using buttons at top
4. Each transaction shows:
   - Icon (💰 for income, 💸 for expense)
   - Category
   - Notes (if any)
   - Date
   - Amount (color-coded: green for income, red for expense)

### Viewing Groups

1. Tap **"Groups"** tab
2. Switch between:
   - **By Month** - See monthly income/expense summary
   - **By Category** - See total spending per category
3. Each group shows:
   - Total amount
   - Number of entries
   - Income/expense breakdown (for monthly view)

### Summary Cards (Top of App)

Always visible at top:
- **This Month** - Net income (income - expenses)
- **Total Entries** - Total transactions logged
- **Income** - Total income this month
- **Expenses** - Total expenses this month

### Editing Transactions

1. Go to **"List"** tab
2. Find the transaction you want to edit
3. Tap the **blue edit button (✏️)**
4. Form opens with transaction data pre-filled
5. Make your changes
6. Tap **"Update Transaction"**
7. Done! ✅

### Deleting Transactions

1. Go to **"List"** tab
2. Find the transaction you want to delete
3. Tap the **red delete button (🗑️)**
4. Confirm deletion in the popup
5. Done! Transaction removed ✅

### Filtering by Category

1. Go to **"List"** tab
2. Use the **category dropdown** below month filters
3. Select a specific category (or "All Categories")
4. List updates instantly to show only that category

### Exporting to CSV

1. Tap the **"📥 Export CSV"** button at the top
2. File downloads automatically
3. File name: `finance-tracker-YYYY-MM-DD.csv`
4. Open in Excel, Google Sheets, or any spreadsheet app
5. Contains all your transactions with headers

### Dark Mode

1. Tap the **moon icon (🌙)** at the top right
2. App switches to dark theme
3. Tap **sun icon (☀️)** to switch back to light mode
4. Preference is saved automatically

---

## 💾 Data Storage

### Where is data stored?

All data is stored **locally on your device** using browser localStorage.

**Important:**
- ✅ Data stays on your device
- ✅ Works completely offline
- ✅ Private (only you can access)
- ✅ No account needed
- ✅ No internet required

**Limitations:**
- ❌ Data is device-specific (doesn't sync across devices)
- ❌ Clearing browser data deletes transactions
- ❌ No cloud backup (yet)

### Backing Up Your Data

**CSV Export (Available Now!):**
✅ Tap "📥 Export CSV" button to download all your data
✅ File contains: Date, Type, Category, Amount, Notes
✅ Open in Excel, Google Sheets, Numbers, etc.
✅ Keep backups in cloud storage (Google Drive, iCloud, Dropbox)

**Additional Backup Methods:**
1. Don't clear Safari cache/data
2. Keep the app installed
3. Regular iPhone backups (iCloud backup includes app data)
4. Export CSV regularly and store in cloud

**Future Enhancement:**
- Import from CSV
- Automatic cloud sync (optional)
- Google Sheets integration

---

## 🎨 Categories

### Income Categories
- Salary - Regular salary/wages
- Freelance - Freelance work
- Business - Business income
- Investment - Dividends, interest, etc.
- Other Income - Any other income

### Expense Categories
- Food - Groceries, restaurants, dining
- Transport - Uber, petrol, public transport
- Shopping - Clothes, gadgets, online shopping
- Bills - Utilities, rent, subscriptions
- Entertainment - Movies, hobbies, games
- Health - Medical, gym, medicines
- Education - Courses, books, learning
- Other Expense - Any other expense

**Note:** You can edit these categories by modifying the HTML file.

---

## 🔧 Customization

### Changing Categories

Edit `index.html` and find this section:

```html
<select id="category" required>
    <optgroup label="Income">
        <option value="Salary">Salary</option>
        <!-- Add your income categories here -->
    </optgroup>
    <optgroup label="Expense">
        <option value="Food">Food</option>
        <!-- Add your expense categories here -->
    </optgroup>
</select>
```

Add/remove/rename categories as needed.

### Changing Currency

**Easy Way (v3.0+):** Click the currency button in the toolbar and select from 20 supported currencies!

**Manual Way:** Find all instances of `₹` in `index.html` and replace with your currency symbol.

### Changing Colors

Edit the CSS in `index.html`:
- Primary color: Search for `#007AFF` (blue)
- Income color: Search for `#34c759` (green)
- Expense color: Search for `#ff3b30` (red)

---

## 📊 Understanding the Groups

### By Month View

Shows for each month:
- **Income** - Total money received
- **Expenses** - Total money spent
- **Net** - Income minus Expenses
- **Entries** - Number of transactions

**Example:**
```
January 2025          5 entries
Income:    ₹50,000
Expenses:  ₹30,000
Net:       ₹20,000  (green = positive)
```

### By Category View

Shows for each category:
- **Total** - Sum of all transactions in that category
- **Entries** - How many times you used this category

**Example:**
```
Food                  12 entries
Total:    ₹8,500
```

Categories are sorted by total amount (highest first).

---

## 🎯 Best Practices

### Daily Usage

1. **Log immediately** - Add transaction right after making it
2. **Be consistent** - Log every transaction, no matter how small
3. **Use notes** - Add context for future reference
4. **Check daily** - Quick glance at "This Month" summary

### Weekly Review

1. **Check List tab** - Review all transactions
2. **Verify amounts** - Make sure nothing is missing
3. **Look at categories** - See where money is going
4. **Adjust behavior** - Based on insights

### Monthly Analysis

1. **Review Groups** - Check monthly breakdown
2. **Compare months** - See trends over time
3. **Identify patterns** - Find areas to save
4. **Set goals** - For next month

---

## 🚨 Troubleshooting

### App won't load

**Solution:**
1. Check internet connection (needed for first load)
2. Clear Safari cache
3. Try incognito/private mode
4. Re-install from GitHub Pages URL

### Data disappeared

**Solution:**
1. Check if you cleared Safari data
2. Check if you're on same device
3. Data is device-specific, won't appear on other devices
4. Check iPhone storage (low storage can clear cache)

### Can't install on iPhone

**Solution:**
1. Must use Safari (not Chrome or other browsers)
2. Make sure iOS is up to date (iOS 13+)
3. Try "Add to Home Screen" instead of PWA install
4. Check if website is HTTPS (GitHub Pages is HTTPS)

### Transaction not saving

**Solution:**
1. Check all required fields are filled
2. Amount must be positive number
3. Date must be valid
4. Try refreshing the page
5. Check browser console for errors (Safari → Develop → Show Console)

### Summary showing wrong numbers

**Solution:**
1. Pull down to refresh
2. Check transaction dates
3. Verify transaction types (income vs expense)
4. Make sure amounts are correct

---

## 💡 Tips & Tricks

### Faster Entry

1. **Use Today's Date** - Pre-filled automatically
2. **Common Categories** - Keep most used at top (edit HTML)
3. **Skip Notes** - Optional for quick entry
4. **Keyboard Shortcuts** - Tab to move between fields

### Better Organization

1. **Consistent Categories** - Use same category for similar items
2. **Meaningful Notes** - "Lunch with team" vs just "food"
3. **Regular Updates** - Daily is easier than weekly
4. **Monthly Reviews** - Set reminder for month-end

### Privacy

1. **Lock Your Phone** - App is private only if phone is locked
2. **Don't Share URL** - Keep GitHub Pages URL private
3. **No Sensitive Info** - Avoid adding sensitive details in notes

---

## 🔮 Future Enhancements

Planning to add:

### v2.1 (Next Release)
- [ ] Import from CSV
- [ ] Bulk operations (delete multiple)
- [ ] Transaction search by text
- [ ] Custom date range filtering

### v3.0 (Future)
- [ ] Budget setting per category
- [ ] Budget alerts
- [ ] Charts and graphs
- [ ] Recurring transactions
- [ ] Tags system

### v4.0 (Advanced)
- [ ] Google Sheets sync (optional)
- [ ] Multi-device sync
- [ ] Cloud backup
- [ ] Categories management UI
- [ ] Advanced reports

---

## 🆚 vs AppSheet

| Feature | Offline Tracker | AppSheet |
|---------|----------------|----------|
| **Setup Time** | 5 minutes | 2-4 hours |
| **Offline First** | ✅ Yes | Partial |
| **Internet Required** | Only for first load | For sync |
| **Cost** | Free | Free / $5-10 |
| **Customization** | Easy (edit HTML) | Limited |
| **Data Storage** | Local only | Google Sheets |
| **Speed** | Instant | 1-2 sec delay |
| **Complexity** | Very simple | More features |

**Use Offline Tracker if:**
- Want simplest solution
- Don't need cloud sync
- Single device usage
- Want to learn/customize

**Use AppSheet if:**
- Need cloud backup
- Want multi-device sync
- Need more advanced features
- Don't want to code

---

## 📈 Use Cases

### Personal Finance Tracking
Track daily expenses and income, understand spending patterns, save money.

### Travel Expenses
Log expenses during trips, see total spent, categorize by type.

### Business Expenses
Track business costs, separate from personal, easy for accounting.

### Shared Expenses
Track group expenses (trips, events), calculate splits later.

### Budget Monitoring
Set mental budgets, track against them using monthly summaries.

---

## 🔒 Privacy & Security

### What's Stored
- Transaction details (type, amount, category, date, notes)
- All stored in browser localStorage
- Nothing sent to any server
- No analytics or tracking

### What's NOT Stored
- No personal information
- No account/login data
- No payment information
- No location data

### Data Access
- Only accessible from your device
- Only in your browser
- Even the developer (you) can't access others' data
- Completely private

---

## 🛠️ Technical Details

### Technologies Used
- **HTML5** - Structure
- **CSS3** - Styling
- **JavaScript** - Logic
- **localStorage** - Data storage
- **Service Worker** - Offline support
- **PWA** - App-like experience

### Browser Support
- ✅ Safari (iOS 13+)
- ✅ Chrome (mobile & desktop)
- ✅ Firefox (mobile & desktop)
- ✅ Edge (mobile & desktop)

### Size
- **Total:** ~15 KB
- **index.html:** ~13 KB
- **sw.js:** ~1 KB
- **manifest.json:** ~1 KB

### Performance
- **First Load:** < 1 second
- **Add Transaction:** Instant
- **View List:** Instant (even with 1000+ transactions)
- **Switch Tabs:** Instant

---

## 📝 Development

### Local Testing

1. Open `index.html` in browser
2. Works immediately (no server needed)
3. Service worker needs HTTPS (use GitHub Pages or localhost)

### File Structure
```
offline-tracker/
├── index.html        # Main app (HTML + CSS + JS)
├── sw.js            # Service Worker (offline support)
├── manifest.json    # PWA manifest (install info)
└── README.md        # This file
```

### Making Changes

1. Edit `index.html` locally
2. Test in browser
3. Upload to GitHub (replaces old file)
4. Changes appear instantly on iPhone (after refresh)

---

## 🤝 Contributing

Want to improve the app? Feel free to:
- Fork the repository
- Make changes
- Test thoroughly
- Share your improvements

---

## 📄 License

Free to use, modify, and distribute. No restrictions.

---

## 🆘 Support

**Need Help?**
- Re-read this README
- Check Troubleshooting section
- Test in browser console (Safari → Develop)
- Start fresh (clear data, re-install)

---

## 🎉 Success Stories

### Typical Journey

**Day 1:**
- ✅ Deploy to GitHub Pages
- ✅ Install on iPhone
- ✅ Add first transaction
- ✅ Works offline!

**Week 1:**
- ✅ Daily transaction logging
- ✅ 50+ transactions logged
- ✅ Understanding spending patterns

**Month 1:**
- ✅ Complete month of data
- ✅ First monthly review
- ✅ Identified savings opportunities

**Month 3:**
- ✅ Habit formed
- ✅ Better financial decisions
- ✅ Reduced unnecessary spending
- ✅ Saving more money

---

## 🚀 Get Started Now

**You're 5 minutes away from your own finance tracker!**

1. **Upload to GitHub Pages** (2 min)
2. **Open on iPhone** (1 min)
3. **Add to Home Screen** (1 min)
4. **Add first transaction** (1 min)

**Total: 5 minutes → Working offline-first finance tracker!**

---

## 📞 Quick Reference

### Key Features
✅ Offline-first ✅ Simple entry ✅ Easy filtering
✅ Monthly groups ✅ Category insights ✅ No internet needed

### Setup
1. GitHub Pages → 2 minutes
2. iPhone install → 2 minutes
3. Ready to use!

### Daily Use
1. Open app (offline)
2. Add transaction (10 seconds)
3. Done!

### Data
📍 Stored locally
🔒 Private & secure
💾 Auto-saved

---

**Happy Tracking! 💰📊**

---

## 📱 Version & Updates

### Current Version: 3.0.0

The app version is always visible in the header (top right). When a new version is available:
- 🎉 Green update banner appears automatically
- Shows what version you're updating from/to
- One-click "Update Now" button to reload
- All your data is preserved during updates

### Version History

See [VERSION.md](VERSION.md) for detailed changelog and release notes.

---

## 🎉 What's New in v3.0.0

**🎨 Major UX Improvements:**
- 💱 **Multi-Currency Support** - Choose from 20 currencies (USD, EUR, GBP, INR, THB, JPY, etc.)
- 🎛️ **Smart Toggle Button** - Better mobile UX for Income/Expense selection
- 📊 **Dynamic Categories** - Categories automatically filter based on type
- 🔢 **Version Display** - See current version in header
- 🔔 **Auto-Update Notifications** - Get notified when new version is available
- 🔄 **One-Click Updates** - Update the app instantly from notification

**💰 Currency Features:**
- Beautiful currency selector modal
- 20 popular currencies supported
- Persistent currency selection
- Updates all amounts instantly
- CSV export includes currency code
- Dark mode support

**Previous Features (v2.0):**
- ✏️ Edit transactions
- 🗑️ Delete transactions
- 🔍 Category filtering
- 📥 CSV export
- 🌙 Dark mode

---

*Version: 3.0.0*
*Last Updated: 2025-01-14*
*Made with ❤️ for simple, offline-first finance tracking*
