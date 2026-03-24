// ============================================================================
// FAQ Data and Rendering (v3.9.0)
// ============================================================================

export const faqData = [
  {
    category: "Data Backup & Recovery",
    icon: "ri-shield-check-line",
    questions: [
      {
        q: "Where is my data stored?",
        a: "All your data is stored locally on your device using IndexedDB, a secure browser database. Nothing is sent to external servers or the cloud. Your financial data stays 100% private and under your control.",
      },
      {
        q: "How do I backup my data?",
        a: "Go to the <strong>Settings</strong> tab → <strong>Export</strong> section → Tap <strong>Export to CSV</strong>. Save this file to your cloud storage (Google Drive, iCloud, Dropbox) or email it to yourself. We recommend backing up monthly or after significant changes.",
      },
      {
        q: "What happens if I lose my device or it breaks?",
        a: "⚠️ <strong>Your data will be lost</strong> if you haven't created a backup. FinChronicle is a privacy-first app—no cloud storage means no automatic recovery. Always keep regular CSV backups in a safe location.",
      },
      {
        q: "How do I restore my data from a backup?",
        a: "Go to <strong>Settings</strong> → <strong>Import</strong> section → Select your CSV backup file → Tap <strong>Import Transactions</strong>. All transactions from the backup will be restored. Duplicates are handled automatically.",
      },
      {
        q: "How often should I backup?",
        a: "We recommend backing up <strong>at least once a month</strong>, or after adding many transactions. The app will show a warning if you haven't backed up in 30+ days. Check the Backup Status card above for your current status.",
      },
    ],
  },
  {
    category: "Privacy & Security",
    icon: "ri-lock-line",
    questions: [
      {
        q: "Is my data sent to any servers or the cloud?",
        a: "Absolutely not. FinChronicle is 100% offline-first. Your transactions, categories, amounts—everything stays on your device. There's no backend server, no analytics, no tracking. We can't see your data because we never receive it.",
      },
      {
        q: "Who can see my financial information?",
        a: "Only you. Data is stored in your browser's IndexedDB, which is sandboxed per website and inaccessible to other sites or apps. Even if someone has physical access to your device, they'd need your device password to access the browser data.",
      },
      {
        q: "Can the app creator access my data?",
        a: "No. As developers, we have zero access to your transactions. The app runs entirely in your browser without any server communication. Your privacy is guaranteed by design, not by policy.",
      },
    ],
  },
  {
    category: "Usage & Features",
    icon: "ri-question-line",
    questions: [
      {
        q: "How do I import bank statements?",
        a: "Download your bank statement as CSV. Open FinChronicle → <strong>Settings</strong> → <strong>Import</strong> section → Select CSV file. The app expects columns: <code>Date</code>, <code>Category</code>, <code>Amount</code>. You may need to adjust your CSV format to match.",
      },
      {
        q: "How do I change currency?",
        a: "Go to <strong>Settings</strong> → Tap the currency button (e.g., ₹ INR) → Select your preferred currency from the list. The currency symbol updates throughout the app. Note: Amounts are not converted—only the display symbol changes.",
      },
      {
        q: "What are 'Insights' in the Groups tab?",
        a: "Insights show your monthly financial overview: income, expenses, savings (net), and transaction count. They also display month-over-month trends (percentage change vs previous month) and your top 5 spending categories. Use the month dropdown to view insights for different months.",
      },
    ],
  },
];

// Render FAQ section
export function renderFAQ() {
  let html = '<div class="faq-container" id="faq-backup">';

  html += `
        <div class="faq-header">
            <i class="ri-questionnaire-line"></i>
            <h2>Frequently Asked Questions</h2>
        </div>
    `;

  faqData.forEach((section, sectionIndex) => {
    html += `
            <div class="faq-section">
                <button class="faq-section-header" data-faq-section="${sectionIndex}" aria-expanded="false" aria-controls="faqSection${sectionIndex}">
                    <div class="faq-section-title">
                        <i class="${section.icon}" aria-hidden="true"></i>
                        <h3 id="faqSection${sectionIndex}Header">${section.category}</h3>
                    </div>
                    <i class="ri-arrow-down-s-line faq-section-arrow" id="faqArrow${sectionIndex}" aria-hidden="true"></i>
                </button>
                <div class="faq-section-content" id="faqSection${sectionIndex}" style="display: none;" role="region" aria-labelledby="faqSection${sectionIndex}Header">
        `;

    section.questions.forEach((qa, qIndex) => {
      html += `
                <div class="faq-item">
                    <button class="faq-question" data-faq-item="${sectionIndex}-${qIndex}" aria-expanded="false" aria-controls="faqAnswer${sectionIndex}_${qIndex}">
                        <span>${qa.q}</span>
                        <i class="ri-add-line faq-item-icon" id="faqIcon${sectionIndex}_${qIndex}" aria-hidden="true"></i>
                    </button>
                    <div class="faq-answer" id="faqAnswer${sectionIndex}_${qIndex}" style="display: none;" role="region">
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

  html += "</div>";
  return html;
}

// Toggle FAQ section visibility
export function toggleFAQSection(sectionIndex) {
  const content = document.getElementById(`faqSection${sectionIndex}`);
  const arrow = document.getElementById(`faqArrow${sectionIndex}`);
  const header = arrow.closest(".faq-section-header");

  const isExpanded = content.style.display !== "none";

  if (isExpanded) {
    content.style.display = "none";
    arrow.style.transform = "rotate(0deg)";
    header.setAttribute("aria-expanded", "false");
  } else {
    content.style.display = "block";
    arrow.style.transform = "rotate(180deg)";
    header.setAttribute("aria-expanded", "true");
  }
}

// Toggle FAQ item visibility
export function toggleFAQItem(sectionIndex, qIndex) {
  const answer = document.getElementById(`faqAnswer${sectionIndex}_${qIndex}`);
  const icon = document.getElementById(`faqIcon${sectionIndex}_${qIndex}`);
  const question = icon.closest(".faq-question");

  const isExpanded = answer.style.display !== "none";

  if (isExpanded) {
    answer.style.display = "none";
    icon.className = "ri-add-line faq-item-icon";
    question.setAttribute("aria-expanded", "false");
  } else {
    answer.style.display = "block";
    icon.className = "ri-subtract-line faq-item-icon";
    question.setAttribute("aria-expanded", "true");
  }
}

// Scroll to FAQ section and auto-expand first section
export function scrollToFAQ() {
  const faqSection = document.getElementById("faq-backup");
  if (faqSection) {
    faqSection.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      const firstSection = document.getElementById("faqSection0");
      if (firstSection && firstSection.style.display === "none") {
        toggleFAQSection(0);
      }
    }, 500);
  }
}
