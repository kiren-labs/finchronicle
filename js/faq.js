// ============================================================================
// FAQ Data and Rendering (v3.9.0)
// ============================================================================

import { t } from "./i18n.js";

// Build FAQ structure from i18n
export const faqData = [
  {
    category: t("faq.category_backup"),
    icon: "ri-shield-check-line",
    questions: [
      { q: t("faq.q_storage"), a: t("faq.a_storage") },
      { q: t("faq.q_backup"), a: t("faq.a_backup") },
      { q: t("faq.q_device_loss"), a: t("faq.a_device_loss") },
      { q: t("faq.q_restore"), a: t("faq.a_restore") },
      { q: t("faq.q_backup_frequency"), a: t("faq.a_backup_frequency") },
    ],
  },
  {
    category: t("faq.category_privacy"),
    icon: "ri-lock-line",
    questions: [
      { q: t("faq.q_privacy"), a: t("faq.a_privacy") },
      { q: t("faq.q_access"), a: t("faq.a_access") },
      { q: t("faq.q_creator_access"), a: t("faq.a_creator_access") },
    ],
  },
  {
    category: t("faq.category_usage"),
    icon: "ri-question-line",
    questions: [
      { q: t("faq.q_import"), a: t("faq.a_import") },
      { q: t("faq.q_currency"), a: t("faq.a_currency") },
      { q: t("faq.q_insights"), a: t("faq.a_insights") },
    ],
  },
  {
    category: t("faq.category_accounts"),
    icon: "ri-bank-line",
    questions: [
      { q: t("faq.q_what_are_accounts"), a: t("faq.a_what_are_accounts") },
      { q: t("faq.q_opening_balance"), a: t("faq.a_opening_balance") },
      { q: t("faq.q_link_transactions"), a: t("faq.a_link_transactions") },
      { q: t("faq.q_transfer_vs_expense"), a: t("faq.a_transfer_vs_expense") },
      { q: t("faq.q_net_worth_wrong"), a: t("faq.a_net_worth_wrong") },
      { q: t("faq.q_savings_as_expense"), a: t("faq.a_savings_as_expense") },
      { q: t("faq.q_balance_drift"), a: t("faq.a_balance_drift") },
    ],
  },
  {
    category: t("faq.category_tabs"),
    icon: "ri-layout-bottom-line",
    questions: [
      { q: t("faq.q_tab_add"), a: t("faq.a_tab_add") },
      { q: t("faq.q_tab_list"), a: t("faq.a_tab_list") },
      { q: t("faq.q_tab_reports"), a: t("faq.a_tab_reports") },
      { q: t("faq.q_tab_groups"), a: t("faq.a_tab_groups") },
      { q: t("faq.q_tab_settings"), a: t("faq.a_tab_settings") },
      { q: t("faq.q_tab_summary"), a: t("faq.a_tab_summary") },
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
