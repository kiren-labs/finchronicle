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
  {
    category: t("faq.category_statuses"),
    icon: "ri-checkbox-circle-line",
    questions: [
      { q: t("faq.q_what_is_pending"), a: t("faq.a_what_is_pending") },
      { q: t("faq.q_how_to_clear_one"), a: t("faq.a_how_to_clear_one") },
      { q: t("faq.q_what_is_reconciled"), a: t("faq.a_what_is_reconciled") },
      { q: t("faq.q_bulk_select"), a: t("faq.a_bulk_select") },
      { q: t("faq.q_bulk_clear_pending"), a: t("faq.a_bulk_clear_pending") },
      { q: t("faq.q_select_all"), a: t("faq.a_select_all") },
    ],
  },
  {
    category: t("faq.category_recurring"),
    icon: "ri-repeat-line",
    questions: [
      { q: t("faq.q_what_is_recurring"), a: t("faq.a_what_is_recurring") },
      {
        q: t("faq.q_how_to_set_recurring"),
        a: t("faq.a_how_to_set_recurring"),
      },
      { q: t("faq.q_recurring_auto_add"), a: t("faq.a_recurring_auto_add") },
      {
        q: t("faq.q_what_is_subscription"),
        a: t("faq.a_what_is_subscription"),
      },
      {
        q: t("faq.q_subscription_missing"),
        a: t("faq.a_subscription_missing"),
      },
    ],
  },
  {
    category: t("faq.category_grouped"),
    icon: "ri-list-ordered",
    questions: [
      { q: t("faq.q_what_is_grouped"), a: t("faq.a_what_is_grouped") },
      { q: t("faq.q_grouped_by_month"), a: t("faq.a_grouped_by_month") },
      { q: t("faq.q_grouped_by_category"), a: t("faq.a_grouped_by_category") },
    ],
  },
  {
    category: t("faq.category_budgets"),
    icon: "ri-wallet-3-line",
    questions: [
      { q: t("faq.q_what_are_budgets"), a: t("faq.a_what_are_budgets") },
      { q: t("faq.q_budget_alert"), a: t("faq.a_budget_alert") },
      { q: t("faq.q_edit_budget"), a: t("faq.a_edit_budget") },
    ],
  },
  {
    category: t("faq.category_goals"),
    icon: "ri-trophy-line",
    questions: [
      { q: t("faq.q_what_are_goals"), a: t("faq.a_what_are_goals") },
      {
        q: t("faq.q_add_goal_contribution"),
        a: t("faq.a_add_goal_contribution"),
      },
      { q: t("faq.q_goal_vs_transaction"), a: t("faq.a_goal_vs_transaction") },
    ],
  },
  {
    category: t("faq.category_alerts"),
    icon: "ri-alarm-warning-line",
    questions: [
      { q: t("faq.q_what_are_alerts"), a: t("faq.a_what_are_alerts") },
      { q: t("faq.q_dismiss_alert"), a: t("faq.a_dismiss_alert") },
      { q: t("faq.q_alerts_too_noisy"), a: t("faq.a_alerts_too_noisy") },
    ],
  },
  {
    category: t("faq.category_search_tags"),
    icon: "ri-search-line",
    questions: [
      { q: t("faq.q_how_to_search"), a: t("faq.a_how_to_search") },
      { q: t("faq.q_what_are_tags"), a: t("faq.a_what_are_tags") },
      { q: t("faq.q_filter_by_tag"), a: t("faq.a_filter_by_tag") },
      { q: t("faq.q_manage_tags"), a: t("faq.a_manage_tags") },
    ],
  },
  {
    category: t("faq.category_applock"),
    icon: "ri-lock-password-line",
    questions: [
      { q: t("faq.q_what_is_applock"), a: t("faq.a_what_is_applock") },
      { q: t("faq.q_forgot_pin"), a: t("faq.a_forgot_pin") },
      { q: t("faq.q_applock_timeout"), a: t("faq.a_applock_timeout") },
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
// Show a context-specific help sheet with a subset of FAQ questions.
// categoryKey: one of the faq category keys (e.g. "category_recurring")
export function showContextualHelp(categoryKey) {
  const sheet = document.getElementById("faqHelpSheet");
  const titleEl = document.getElementById("faqHelpSheetTitle");
  const bodyEl = document.getElementById("faqHelpSheetBody");
  if (!sheet || !bodyEl) return;

  const section = faqData.find((s) => s.category === t(`faq.${categoryKey}`));
  if (!section) return;

  if (titleEl) titleEl.textContent = section.category;

  let html = "";
  section.questions.forEach((qa, i) => {
    html += `
      <div class="faq-item">
        <button class="faq-question" data-help-item="${i}" aria-expanded="false" aria-controls="helpAnswer${i}">
          <span>${qa.q}</span>
          <i class="ri-add-line faq-item-icon" id="helpIcon${i}" aria-hidden="true"></i>
        </button>
        <div class="faq-answer" id="helpAnswer${i}" style="display:none;" role="region">${qa.a}</div>
      </div>`;
  });
  bodyEl.innerHTML = html;

  // bind toggle events
  bodyEl.querySelectorAll("[data-help-item]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = btn.dataset.helpItem;
      const ans = document.getElementById(`helpAnswer${i}`);
      const ico = document.getElementById(`helpIcon${i}`);
      const open = ans.style.display !== "none";
      ans.style.display = open ? "none" : "block";
      ico.className = open
        ? "ri-add-line faq-item-icon"
        : "ri-subtract-line faq-item-icon";
      btn.setAttribute("aria-expanded", String(!open));
    });
  });

  sheet.classList.add("show");
  document.body.classList.add("help-sheet-open");
}

export function closeHelpSheet() {
  const sheet = document.getElementById("faqHelpSheet");
  if (sheet) sheet.classList.remove("show");
  document.body.classList.remove("help-sheet-open");
}

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
