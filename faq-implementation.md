# FAQ Page Implementation for FinChronicle

## Overview

Add a comprehensive FAQ section to the Settings tab to answer common user questions about data backup, privacy, usage, and troubleshooting.

---

## Design Mockup

```
┌─────────────────────────────────────────┐
│ Settings                           [×]  │
├─────────────────────────────────────────┤
│                                         │
│ [Currency] [Dark Mode] [FAQ]           │ ← New FAQ tab
│                                         │
│ 📚 Frequently Asked Questions          │
│                                         │
│ ▼ Data Backup & Recovery               │
│   • Where is my data stored?           │
│   • How do I backup my data?           │
│   • What if I lose my device?          │
│   • Can I sync across devices?         │
│                                         │
│ ▼ Privacy & Security                   │
│   • Is my data sent to servers?        │
│   • Who can see my transactions?       │
│   • Is the app secure?                 │
│                                         │
│ ▼ Usage & Features                     │
│   • How to import bank statements?     │
│   • How to change currency?            │
│   • What are insights?                 │
│                                         │
│ ▼ Troubleshooting                      │
│   • App won't install                  │
│   • Data not saving                    │
│   • Export doesn't work                │
│                                         │
└─────────────────────────────────────────┘
```

---

## Implementation

### Step 1: Add FAQ Data Structure

```javascript
// Add to app.js
const faqData = [
    {
        category: "Data Backup & Recovery",
        icon: "ri-shield-check-line",
        questions: [
            {
                q: "Where is my data stored?",
                a: "All your data is stored locally on your device using IndexedDB, a secure browser database. Nothing is sent to external servers or the cloud. Your financial data stays 100% private and under your control."
            },
            {
                q: "How do I backup my data?",
                a: "Go to the <strong>Settings</strong> tab → <strong>Export</strong> → Tap <strong>Export to CSV</strong>. Save this file to your cloud storage (Google Drive, iCloud, Dropbox) or email it to yourself. We recommend backing up monthly or after significant changes."
            },
            {
                q: "What happens if I lose my device or it breaks?",
                a: "⚠️ <strong>Your data will be lost</strong> if you haven't created a backup. FinChronicle is a privacy-first app—no cloud storage means no automatic recovery. Always keep regular CSV backups in a safe location."
            },
            {
                q: "How do I restore my data from a backup?",
                a: "Go to <strong>Settings</strong> → <strong>Import</strong> → Select your CSV backup file → Tap <strong>Import Transactions</strong>. All transactions from the backup will be restored. Duplicates are automatically handled."
            },
            {
                q: "Can I sync across multiple devices?",
                a: "Not automatically. FinChronicle is device-local for privacy. However, you can manually sync by exporting from Device A and importing to Device B. Some browsers (Chrome/Edge with sync enabled) may sync IndexedDB, but this is not guaranteed."
            },
            {
                q: "How often should I backup?",
                a: "We recommend backing up <strong>at least once a month</strong>, or after adding many transactions. The app will remind you if you haven't backed up in 30+ days. Check the Backup Status card in Settings."
            }
        ]
    },
    {
        category: "Privacy & Security",
        icon: "ri-lock-line",
        questions: [
            {
                q: "Is my data sent to any servers or the cloud?",
                a: "Absolutely not. FinChronicle is 100% offline-first. Your transactions, categories, amounts—everything stays on your device. There's no backend server, no analytics, no tracking. We can't see your data because we never receive it."
            },
            {
                q: "Who can see my financial information?",
                a: "Only you. Data is stored in your browser's IndexedDB, which is sandboxed per website and inaccessible to other sites or apps. Even if someone has physical access to your device, they'd need your device password to access the browser data."
            },
            {
                q: "Is the app secure from hackers?",
                a: "Your data is as secure as your device. We use browser security best practices, avoid external dependencies, and never transmit data over the network. Keep your device and browser updated for best security."
            },
            {
                q: "Can the app creator access my data?",
                a: "No. As developers, we have zero access to your transactions. The app runs entirely in your browser without any server communication. Your privacy is guaranteed by design, not by policy."
            },
            {
                q: "What about the CSV export file?",
                a: "CSV files are plain text and unencrypted (by design, for compatibility). Store backups securely—don't share publicly or email over unencrypted connections. Consider password-protecting zip files or using encrypted cloud storage."
            }
        ]
    },
    {
        category: "Usage & Features",
        icon: "ri-question-line",
        questions: [
            {
                q: "How do I import bank statements?",
                a: "Download your bank statement as CSV. Open FinChronicle → <strong>Settings</strong> → <strong>Import</strong> → Select CSV file. The app expects columns: <code>Date</code>, <code>Category</code>, <code>Amount</code>. Adjust your CSV to match if needed."
            },
            {
                q: "How do I change currency?",
                a: "Go to <strong>Settings</strong> → Tap the currency button (e.g., ₹ INR) → Select your preferred currency from the list. The currency symbol updates throughout the app. Note: Amounts are not converted—only the display symbol changes."
            },
            {
                q: "What are 'Insights' in the Groups tab?",
                a: "Insights show your monthly financial overview: income, expenses, savings (net), and transaction count. They also display month-over-month trends (% change vs previous month) and your top 5 spending categories."
            },
            {
                q: "How do filters work in the List tab?",
                a: "Use the <strong>Month</strong> dropdown to filter by specific month or 'All'. Use <strong>Category</strong> to see specific expense/income types. Use <strong>Type</strong> to show only income or only expenses. Filters combine (Month AND Category AND Type)."
            },
            {
                q: "Can I edit or delete transactions?",
                a: "Yes! In the <strong>List</strong> tab, tap any transaction → Use the <strong>Edit</strong> (pencil icon) or <strong>Delete</strong> (trash icon) buttons. Changes are saved immediately. Tip: You can also filter to find specific transactions quickly."
            },
            {
                q: "How do I add income vs expense?",
                a: "In the <strong>Add</strong> tab, select the Type: <strong>Income</strong> (green) or <strong>Expense</strong> (red). Each type has different category options. Fill in amount, category, date, and notes, then tap <strong>Add Transaction</strong>."
            },
            {
                q: "What's the difference between Groups and List?",
                a: "<strong>List</strong> shows individual transactions with filters and pagination. <strong>Groups</strong> shows aggregated summaries (by month or category) plus monthly insights. Use List for details, Groups for overview."
            }
        ]
    },
    {
        category: "Troubleshooting",
        icon: "ri-tools-line",
        questions: [
            {
                q: "The app won't install as PWA on my phone",
                a: "Make sure you're using a supported browser (Chrome, Edge, Safari). On Android: Look for 'Add to Home Screen' in the browser menu. On iOS: Tap Share → Add to Home Screen. If unavailable, check if your browser supports PWA installation."
            },
            {
                q: "My transactions aren't saving",
                a: "Check if your browser's storage quota is full. Go to browser settings → Site settings → Storage → Check available space. Also ensure you haven't disabled cookies/storage for this site. Try refreshing the page and check if data persists."
            },
            {
                q: "The export button doesn't do anything",
                a: "Ensure pop-ups/downloads are allowed for this site in your browser settings. Some browsers block automatic downloads. Also check if you have any ad-blockers or privacy extensions that might block file downloads."
            },
            {
                q: "Dark mode isn't working properly",
                a: "Try toggling dark mode off and on again. If colors look wrong, clear your browser cache and reload the app. The dark mode state is saved in localStorage, so clearing it resets preferences."
            },
            {
                q: "The app says 'Update Available' but won't update",
                a: "Tap the <strong>Update Now</strong> button in the banner. If that fails, close all tabs with FinChronicle open, then reopen. For stubborn issues: Go to browser DevTools → Application → Service Workers → Unregister → Reload page."
            },
            {
                q: "I see 'Failed to load data' on startup",
                a: "Your IndexedDB might be corrupted or blocked. Try: 1) Refresh the page, 2) Export your data as backup (if possible), 3) Clear site data in browser settings, 4) Reimport your backup. If issue persists, try a different browser."
            },
            {
                q: "Insights show wrong numbers",
                a: "Insights calculate from your transaction data. If numbers seem wrong: 1) Check if transactions have correct dates/amounts, 2) Verify you're viewing the right month in the dropdown, 3) Refresh the page to recalculate."
            },
            {
                q: "The app is slow with many transactions",
                a: "Performance degrades with 10,000+ transactions. Solutions: 1) Export old data and archive it, 2) Delete very old transactions you don't need, 3) Filter by recent months only. We're working on performance improvements for large datasets."
            }
        ]
    },
    {
        category: "Technical Details",
        icon: "ri-code-line",
        questions: [
            {
                q: "What technologies does FinChronicle use?",
                a: "Pure HTML5, CSS3, and vanilla JavaScript (ES6+). No frameworks (React/Vue), no build tools (Webpack), no npm dependencies. Service Worker for offline mode. IndexedDB for storage. Remix Icon for UI icons (CDN only)."
            },
            {
                q: "Does the app work offline?",
                a: "Yes! After first load, the app is fully functional offline. Add, edit, delete transactions without internet. The service worker caches all files. Export/import also works offline. Only the initial installation requires internet."
            },
            {
                q: "How much storage does the app use?",
                a: "Minimal. The app itself is ~200KB (HTML+CSS+JS). Transaction data varies: 1 year (~500 txns) ≈ 100KB, 10 years ≈ 1MB. Browser storage limits vary but typically allow 50MB+ per site."
            },
            {
                q: "Can I self-host the app?",
                a: "Absolutely! Download the code from <a href='https://github.com/kiren-labs/finchronicle' target='_blank'>GitHub</a> → Run any local server (<code>python3 -m http.server</code>) → Access at localhost. No build process needed—it's just static files."
            },
            {
                q: "Is the code open source?",
                a: "Yes! View the source on <a href='https://github.com/kiren-labs/finchronicle' target='_blank'>GitHub</a>. Licensed under MIT. Contributions welcome. You can audit the code to verify privacy claims."
            }
        ]
    }
];
```

### Step 2: Add FAQ Rendering Function

```javascript
// Render FAQ section
function renderFAQ() {
    let html = '<div class="faq-container">';

    html += '<div class="faq-header">';
    html += '<i class="ri-questionnaire-line"></i>';
    html += '<h2>Frequently Asked Questions</h2>';
    html += '</div>';

    faqData.forEach((section, sectionIndex) => {
        html += `
            <div class="faq-section">
                <div class="faq-section-header" onclick="toggleFAQSection(${sectionIndex})">
                    <div class="faq-section-title">
                        <i class="${section.icon}"></i>
                        <h3>${section.category}</h3>
                    </div>
                    <i class="ri-arrow-down-s-line faq-section-arrow" id="faqArrow${sectionIndex}"></i>
                </div>
                <div class="faq-section-content" id="faqSection${sectionIndex}" style="display: none;">
        `;

        section.questions.forEach((qa, qIndex) => {
            html += `
                <div class="faq-item">
                    <div class="faq-question" onclick="toggleFAQItem(${sectionIndex}, ${qIndex})">
                        <span>${qa.q}</span>
                        <i class="ri-add-line faq-item-icon" id="faqIcon${sectionIndex}_${qIndex}"></i>
                    </div>
                    <div class="faq-answer" id="faqAnswer${sectionIndex}_${qIndex}" style="display: none;">
                        ${qa.a}
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    html += '</div>';

    return html;
}

// Toggle FAQ section (category)
function toggleFAQSection(sectionIndex) {
    const content = document.getElementById(`faqSection${sectionIndex}`);
    const arrow = document.getElementById(`faqArrow${sectionIndex}`);

    if (content.style.display === 'none') {
        content.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
    } else {
        content.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    }
}

// Toggle individual FAQ item
function toggleFAQItem(sectionIndex, qIndex) {
    const answer = document.getElementById(`faqAnswer${sectionIndex}_${qIndex}`);
    const icon = document.getElementById(`faqIcon${sectionIndex}_${qIndex}`);

    if (answer.style.display === 'none') {
        answer.style.display = 'block';
        icon.className = 'ri-subtract-line faq-item-icon';
    } else {
        answer.style.display = 'none';
        icon.className = 'ri-add-line faq-item-icon';
    }
}
```

### Step 3: Update Settings Tab UI

Modify the settings tab in `index.html` or render dynamically:

```javascript
// Add to updateUI() or create updateSettingsTab()
function updateSettingsTab() {
    const settingsContent = document.getElementById('settingsContent');

    let html = `
        <!-- Existing Settings Content -->
        <div class="settings-section">
            <!-- Currency, Dark Mode, etc. -->
        </div>

        <!-- FAQ Section -->
        <div class="settings-section">
            ${renderFAQ()}
        </div>
    `;

    settingsContent.innerHTML = html;
}
```

### Step 4: Add CSS Styling

```css
/* FAQ Container */
.faq-container {
    margin-top: var(--space-lg);
}

.faq-header {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-bottom: var(--space-xl);
}

.faq-header i {
    font-size: var(--font-3xl);
    color: var(--color-primary);
}

.faq-header h2 {
    font-size: var(--font-2xl);
    font-weight: 600;
    margin: 0;
}

/* FAQ Section (Category) */
.faq-section {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-md);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
}

.faq-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md) var(--space-lg);
    cursor: pointer;
    background: var(--color-bg);
    transition: background 0.2s ease;
}

.faq-section-header:hover {
    background: var(--color-border);
}

.faq-section-title {
    display: flex;
    align-items: center;
    gap: var(--space-md);
}

.faq-section-title i {
    font-size: var(--font-xl);
    color: var(--color-primary);
}

.faq-section-title h3 {
    font-size: var(--font-lg);
    font-weight: 600;
    margin: 0;
}

.faq-section-arrow {
    font-size: var(--font-xl);
    transition: transform 0.3s ease;
    color: var(--color-text-muted);
}

.faq-section-content {
    padding: 0 var(--space-lg) var(--space-md);
}

/* FAQ Item (Individual Question) */
.faq-item {
    border-bottom: 1px solid var(--color-border);
    padding: var(--space-md) 0;
}

.faq-item:last-child {
    border-bottom: none;
}

.faq-question {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    font-weight: 500;
    color: var(--color-text);
    padding: var(--space-sm);
    border-radius: var(--radius-md);
    transition: background 0.2s ease;
}

.faq-question:hover {
    background: var(--color-bg);
}

.faq-item-icon {
    font-size: var(--font-lg);
    color: var(--color-primary);
    transition: transform 0.3s ease;
    flex-shrink: 0;
}

.faq-answer {
    padding: var(--space-md);
    color: var(--color-text-muted);
    line-height: 1.6;
    background: var(--color-bg);
    border-radius: var(--radius-md);
    margin-top: var(--space-sm);
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

.faq-answer strong {
    color: var(--color-text);
}

.faq-answer code {
    background: var(--color-surface);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    font-family: var(--font-family-mono);
    font-size: var(--font-sm);
    color: var(--color-primary);
}

.faq-answer a {
    color: var(--color-primary);
    text-decoration: none;
    border-bottom: 1px solid var(--color-primary);
}

.faq-answer a:hover {
    opacity: 0.8;
}

/* Dark Mode */
body.dark-mode .faq-section {
    background: var(--color-surface);
}

body.dark-mode .faq-section-header {
    background: var(--color-bg);
}

body.dark-mode .faq-section-header:hover {
    background: var(--color-border);
}

body.dark-mode .faq-question:hover {
    background: var(--color-surface);
}

body.dark-mode .faq-answer {
    background: var(--color-surface);
}

/* Mobile Responsive */
@media (max-width: 480px) {
    .faq-header {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-sm);
    }

    .faq-section-header {
        padding: var(--space-sm) var(--space-md);
    }

    .faq-section-content {
        padding: 0 var(--space-md) var(--space-sm);
    }

    .faq-question {
        font-size: var(--font-sm);
    }

    .faq-answer {
        font-size: var(--font-sm);
        padding: var(--space-sm);
    }
}
```

---

## User Experience Flow

1. **User goes to Settings tab**
2. **Scrolls down to FAQ section**
3. **Taps "Data Backup & Recovery" category** → expands to show questions
4. **Taps "What if I lose my device?"** → answer expands with warning
5. **Reads answer, understands backup importance**
6. **Scrolls to export section, creates backup**

---

## Search Functionality (Optional Enhancement)

```javascript
// Add search bar above FAQ
function addFAQSearch() {
    const searchHTML = `
        <div class="faq-search">
            <input
                type="text"
                id="faqSearchInput"
                placeholder="Search FAQ..."
                oninput="searchFAQ()"
            />
            <i class="ri-search-line"></i>
        </div>
    `;

    // Insert before FAQ sections
}

// Filter FAQ items by search term
function searchFAQ() {
    const searchTerm = document.getElementById('faqSearchInput').value.toLowerCase();

    if (searchTerm === '') {
        // Show all sections
        faqData.forEach((_, sectionIndex) => {
            document.getElementById(`faqSection${sectionIndex}`).style.display = 'block';
        });
        return;
    }

    // Hide/show based on match
    faqData.forEach((section, sectionIndex) => {
        let sectionHasMatch = false;

        section.questions.forEach((qa, qIndex) => {
            const questionMatch = qa.q.toLowerCase().includes(searchTerm);
            const answerMatch = qa.a.toLowerCase().includes(searchTerm);
            const match = questionMatch || answerMatch;

            const itemEl = document.getElementById(`faqAnswer${sectionIndex}_${qIndex}`).parentElement;
            itemEl.style.display = match ? 'block' : 'none';

            if (match) sectionHasMatch = true;
        });

        // Show/hide entire section
        document.getElementById(`faqSection${sectionIndex}`).style.display = sectionHasMatch ? 'block' : 'none';
    }
}
```

---

## Effort Estimate

- **FAQ Data Creation:** 2 hours (write all Q&A)
- **Rendering Functions:** 1 hour
- **CSS Styling:** 1 hour
- **Testing & Refinement:** 1 hour
- **Total:** 5 hours

---

## Benefits

1. ✅ Reduces support requests
2. ✅ Educates users about data safety
3. ✅ Builds trust (transparency)
4. ✅ Improves onboarding experience
5. ✅ SEO benefit (FAQ content)
6. ✅ User empowerment (self-service)

---

## Next Steps

1. **Implement FAQ in Settings tab**
2. **Add Backup Status card**
3. **Add Backup Reminder system**
4. **Test with real users**
5. **Iterate based on feedback**

---

## Alternative: External FAQ Page

If you want to keep Settings clean, create a dedicated FAQ page:

- Add new HTML file: `faq.html`
- Link from Settings: "Need Help? View FAQ →"
- Benefit: More space, better SEO
- Drawback: Extra navigation step

**Recommendation:** Start with in-app FAQ in Settings, migrate to separate page if it grows too large.
