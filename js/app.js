// ============================================================================
// App Entry Point — Initialisation, Event Bindings, Service Worker
// ============================================================================

// Global error handlers — logError imported from utils.js (imports hoist before body runs in ES modules)

window.onerror = (message, source, lineno, colno, error) => {
  const msg = String(message);
  // SW script fetch failures are transient network errors — not app bugs
  if (msg.includes("load failed") && source && source.includes("sw.js")) return;
  logError(msg, error?.stack || `${source}:${lineno}:${colno}`);
};

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  logError(reason?.message || String(reason), reason?.stack || "");
});

// DA4: window.onerror does not fire for ES module top-level import failures.
// A failed static import causes the entire module script to not execute — the
// error surfaces as an 'error' event on the script element itself.
window.addEventListener(
  "error",
  (event) => {
    if (event.target && event.target.tagName === "SCRIPT") {
      logError(
        `Module load failed: ${event.target.src || "(inline)"}`,
        "script-load-error",
      );
    }
  },
  true,
); // capture phase to catch script element errors

import { state, currencies } from "./state.js";
import {
  logError,
  showMessage,
  generateId,
  sanitizeHTML,
  getErrorLog,
  clearErrorLog,
  evaluateAmountExpr,
  formatDate,
} from "./utils.js";
import { t } from "./i18n.js";
import {
  initDB,
  migrateFromLocalStorage,
  loadDataFromDB,
  saveTransactionToDB,
  markTransactionSettled,
} from "./db.js";
import {
  setCurrency,
  updateCurrencyDisplay,
  toggleCurrencySelector,
  closeCurrencySelector,
  formatCurrency,
} from "./currency.js";
import { validateTransaction, detectDuplicate } from "./validation.js";
import {
  updateUI,
  updateReportsView,
  switchTab,
  quickAddTransaction,
  onSummaryTileClick,
  updateGroupedView,
  changeGrouping,
  editTransaction,
  deleteTransaction,
  confirmDelete,
  closeDeleteModal,
  deleteBudgetConfirm,
  cancelEdit,
  selectType,
  updateCategoryOptions,
  filterByMonth,
  filterByCategory,
  filterByAccount,
  nextPage,
  prevPage,
  openFeedbackModal,
  closeFeedbackModal,
  renderFormTagChips,
  renderTagPicker,
} from "./ui.js";
import {
  getAllTags,
  renameTag,
  deleteTag,
  cycleTagColor,
  ensureTagColor,
  initTagColors,
} from "./search.js";
import { renderTagManagement } from "./settings.js";
import {
  toggleDarkMode,
  loadDarkMode,
  hideInstallPrompt,
  checkInstallPrompt,
  checkAppVersion,
  checkForUpdates,
  reloadApp,
  dismissUpdate,
  loadBackupTimestamp,
  showUpdatePrompt,
  updateSettingsContent,
} from "./settings.js";
import {
  loadRecurringIntoState,
  checkRecurringTransactions,
  closeRecurringModal,
  saveRecurringTemplate,
  selectRecurringType,
  initRecurringTagEvents,
  renderSubscriptionTracker,
} from "./recurring.js";
import {
  initBudgets,
  renderBudgetList,
  renderBudgetAlerts,
  saveBudget,
  renderBudgetModal,
} from "./budget.js";
import {
  bindAccountAutocomplete,
  getTransferFormData,
  clearTransferFields,
} from "./transfer.js";
import {
  initOptionalFields,
  getOptionalFieldValues,
  clearOptionalFields,
  bindFieldAutocomplete,
  renderFieldToggles,
  dismissCategorySuggestion,
  bindOptionalFieldsEvents,
} from "./optional-fields.js";
import {
  initQuickEntry,
  renderQuickBar,
  renderTemplateManager,
  bindQuickEntryEvents,
} from "./quick-entry.js";
import {
  initAccounts,
  renderNetWorthDashboard,
  renderAccountManager,
  bindAccountEvents,
  isAccountsSectionVisible,
  setAccountsSectionVisible,
} from "./accounts.js";
import { renderSavingsDashboard } from "./savings.js";
import {
  initAlerts,
  runAlertChecks,
  renderAlertBanners,
  renderAlertHistory,
  bindAlertEvents,
} from "./alerts.js";
import { renderAnnualReport, bindAnnualReportEvents } from "./annual-report.js";
import { renderForecast } from "./forecast.js";
import {
  initAutoBackup,
  requestStoragePersistence,
  bindAutoBackupEvents,
} from "./auto-backup.js";
import {
  renderMultiCurrencyFields,
  getMultiCurrencyFormData,
  clearMultiCurrencyFields,
  bindMultiCurrencyEvents,
} from "./multi-currency.js";
import {
  renderSettlementDashboard,
  bindSettlementEvents,
} from "./settlement.js";
import { initGoals, renderGoalsDashboard, bindGoalEvents } from "./goals.js";
import { bindReconciliationEvents } from "./reconciliation.js";
import { initAppLock, lock, renderLockSettings } from "./app-lock.js";

// ============================================================================
// Lazy-loading for optional features (FAQ, Import/Export)
// ============================================================================

// Lazy-load FAQ module
let faqModule = null;
async function getFAQModule() {
  if (!faqModule) {
    faqModule = await import("./faq.js");
  }
  return faqModule;
}

// Lazy-load Import/Export module
let importExportModule = null;
async function getImportExportModule() {
  if (!importExportModule) {
    importExportModule = await import("./import-export.js");
  }
  return importExportModule;
}

// ============================================================================
// Event Bindings (replaces all inline onclick/onchange/onkeydown in HTML)
// ============================================================================

function bindStaticEvents() {
  // ---- Amount field arithmetic ----
  const amountInput = document.getElementById("amount");
  if (amountInput) {
    amountInput.addEventListener("blur", () => {
      const raw = amountInput.value.trim();
      if (!raw || /^[\d.]+$/.test(raw)) return; // plain number, nothing to evaluate
      const result = evaluateAmountExpr(raw);
      if (!isNaN(result)) amountInput.value = result;
    });
  }

  // ---- Header buttons ----
  document
    .querySelector('.header-btn[aria-label="Send feedback"]')
    .addEventListener("click", openFeedbackModal);
  document
    .querySelector('.header-btn[aria-label="Quick Add Transaction"]')
    .addEventListener("click", quickAddTransaction);
  document.getElementById("lockNowBtn")?.addEventListener("click", lock);

  // ---- Update prompt ----
  document
    .querySelector(".update-btn-primary")
    .addEventListener("click", reloadApp);
  document
    .querySelector(".update-btn-secondary")
    .addEventListener("click", dismissUpdate);

  // ---- Install prompt ----
  document
    .querySelector("#installPrompt button")
    .addEventListener("click", hideInstallPrompt);

  // ---- Status strip button: navigate to Home ----
  document
    .getElementById("statusStripToggle")
    ?.addEventListener("click", () => switchTab("home"));

  // ---- fc:navigate CustomEvent (used by savings prompt, etc.) ----
  document.addEventListener("fc:navigate", (e) => {
    const { tab, type } = e.detail || {};
    if (tab) switchTab(tab);
    if (type) selectType(type);
  });

  // ---- Grouped View segue panel ----
  document
    .getElementById("openGroupedViewBtn")
    ?.addEventListener("click", () => {
      const panel = document.getElementById("groupedViewPanel");
      if (panel) {
        panel.classList.add("open");
        panel.removeAttribute("inert");
        updateGroupedView();
      }
    });
  document
    .getElementById("closeGroupedViewBtn")
    ?.addEventListener("click", () => {
      const panel = document.getElementById("groupedViewPanel");
      if (panel) {
        panel.classList.remove("open");
        panel.setAttribute("inert", "");
      }
    });
  document.querySelectorAll("#groupedViewPanel .filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) =>
      changeGrouping(e.target.dataset.group, e),
    );
  });

  // ---- Subscription Tracker segue panel ----
  document
    .getElementById("openSubscriptionBtn")
    ?.addEventListener("click", () => {
      const panel = document.getElementById("subscriptionPanel");
      if (panel) {
        panel.classList.add("open");
        panel.removeAttribute("inert");
        renderSubscriptionTracker();
      }
    });
  document
    .getElementById("closeSubscriptionBtn")
    ?.addEventListener("click", () => {
      const panel = document.getElementById("subscriptionPanel");
      if (panel) {
        panel.classList.remove("open");
        panel.setAttribute("inert", "");
      }
    });

  // ---- Summary tile clicks ----
  document.querySelectorAll(".summary-card").forEach((card) => {
    const label = card.getAttribute("aria-label") || "";
    let tileType = null;
    if (label.includes("View transactions for this month"))
      tileType = "this-month";
    else if (label.includes("View all transactions"))
      tileType = "total-entries";
    else if (label.includes("View income")) tileType = "income";
    else if (label.includes("View expense")) tileType = "expenses";

    if (tileType) {
      card.addEventListener("click", () => onSummaryTileClick(tileType));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSummaryTileClick(tileType);
        }
      });
    }
  });

  // ---- Currency modal close ----
  document
    .querySelector("#currencyModal .close-btn")
    .addEventListener("click", closeCurrencySelector);

  // ---- Tab navigation (top tabs + bottom nav) ----
  ["home", "add", "list", "reports", "settings"].forEach((tab) => {
    const topTab = document.getElementById(`${tab}-tab`);
    if (topTab) topTab.addEventListener("click", () => switchTab(tab));

    const botNav = document.getElementById(`${tab}-nav`);
    if (botNav) botNav.addEventListener("click", () => switchTab(tab));
  });

  // ---- Add Transaction form: type toggle ----
  document.querySelectorAll(".type-option").forEach((btn) => {
    btn.addEventListener("click", () => selectType(btn.dataset.type));
  });

  // ---- Cancel Edit button ----
  document.getElementById("cancelEditBtn").addEventListener("click", () => {
    cancelEdit();
    hideDuplicateWarning();
    allowDuplicateSubmit = false;
  });

  // ---- Category filter (onchange) ----
  document
    .getElementById("categoryFilter")
    .addEventListener("change", filterByCategory);

  // ---- Account filter (onchange) ----
  document
    .getElementById("accountFilter")
    .addEventListener("change", filterByAccount);

  // ---- Pagination ----
  document.getElementById("prevBtn").addEventListener("click", prevPage);
  document.getElementById("nextBtn").addEventListener("click", nextPage);

  // ---- Groups tab: grouping toggle (By Month / By Category) ----
  document
    .querySelectorAll("#groupsTab > .filters > .filter-btn")
    .forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const type = btn.textContent.trim().toLowerCase().includes("month")
          ? "month"
          : "category";
        changeGrouping(type, e);
      });
    });

  // ---- Reports tab: chart date range pills ----
  document.querySelector(".range-pills").addEventListener("click", (e) => {
    const btn = e.target.closest(".range-pill");
    if (!btn) return;
    state.reportRange = btn.dataset.range;
    updateReportsView();
  });

  // ---- Reports tab: forecast horizon toggle ----
  document
    .querySelector(".forecast-horizon-toggle")
    .addEventListener("click", (e) => {
      const btn = e.target.closest(".horizon-btn");
      if (!btn) return;
      document
        .querySelectorAll(".horizon-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderForecast(parseInt(btn.dataset.days, 10));
    });

  // ---- Settings toolbar buttons ----
  bindSettingsButtons();

  // ---- Delete modal buttons ----
  document
    .querySelector("#deleteModal .modal-btn-cancel")
    .addEventListener("click", closeDeleteModal);
  document
    .querySelector("#deleteModal .modal-btn-confirm")
    .addEventListener("click", confirmDelete);

  // ---- Restore Preview modal buttons ----
  document
    .querySelector("#restoreCancelBtn")
    ?.addEventListener("click", async () => {
      const mod = await getImportExportModule();
      mod.closeRestorePreview();
    });
  document
    .querySelector("#restorePreviewModal .close-btn")
    ?.addEventListener("click", async () => {
      const mod = await getImportExportModule();
      mod.closeRestorePreview();
    });

  // ---- Restore Report modal ----
  document
    .querySelector("#restoreReportModal .modal-btn-confirm")
    .addEventListener("click", async () => {
      const mod = await getImportExportModule();
      mod.closeRestoreReport();
    });
  document
    .querySelector("#restoreReportModal .close-btn")
    .addEventListener("click", async () => {
      const mod = await getImportExportModule();
      mod.closeRestoreReport();
    });

  // ---- Feedback modal close ----
  document
    .querySelector("#feedbackModal .close-btn")
    .addEventListener("click", closeFeedbackModal);

  // ---- Recurring modal ----
  document
    .querySelector("#recurringModal .close-btn")
    .addEventListener("click", closeRecurringModal);
  document
    .getElementById("recurringCancelBtn")
    .addEventListener("click", closeRecurringModal);
  document
    .getElementById("recurringSaveBtn")
    .addEventListener("click", saveRecurringTemplate);

  document
    .getElementById("recurringTypeExpense")
    .addEventListener("click", () => selectRecurringType("expense"));
  document
    .getElementById("recurringTypeIncome")
    .addEventListener("click", () => selectRecurringType("income"));

  document
    .getElementById("recurringFrequency")
    .addEventListener("change", () => {
      const freq = document.getElementById("recurringFrequency").value;
      document.getElementById("recurringDayGroup").style.display =
        freq === "monthly" ? "block" : "none";
    });

  // ---- Add Budget button (delegated — button is re-rendered by renderBudgetList) ----
  document.addEventListener("click", (e) => {
    if (e.target.closest("#addBudgetBtn")) openBudgetModal();
    const setBudgetBtn = e.target.closest("[data-set-budget]");
    if (setBudgetBtn)
      openBudgetModal({ category: setBudgetBtn.dataset.setBudget });
  });

  // ---- Search bar (v3.14.0) ----
  bindSearchEvents();

  // ---- Tag chip input in form (v3.14.0) ----
  bindTagInputEvents();
  initRecurringTagEvents();

  // ---- Optional fields (v3.16.0) ----
  bindOptionalFieldsEvents();

  // ---- Quick Entry (v3.17.0) ----
  bindQuickEntryEvents();

  // ---- Accounts (v3.18.0) ----
  bindAccountEvents();

  // ---- Feature visibility toggles (v4.3.1) ----
  const toggleAccounts = document.getElementById("toggleAccountsSection");
  if (toggleAccounts) {
    toggleAccounts.checked = isAccountsSectionVisible();
    toggleAccounts.addEventListener("change", () => {
      setAccountsSectionVisible(toggleAccounts.checked);
    });
  }

  // ---- Reconciliation (v4.0.0) ----
  bindReconciliationEvents();
  document.addEventListener("reconciliation:finalised", () => {
    renderAccountManager();
    renderNetWorthDashboard();
  });

  // ---- Goals (v3.20.0) ----
  bindGoalEvents();

  // ---- Smart Alerts (v3.21.0) ----
  bindAlertEvents();

  // ---- Annual Report (v3.21.0) ----
  bindAnnualReportEvents();

  // ---- Auto-Backup (v3.22.0) ----
  bindAutoBackupEvents();

  // ---- Multi-Currency (v3.24.0) ----
  bindMultiCurrencyEvents();

  // ---- Settlement (v3.26.0) ----
  bindSettlementEvents();

  // ---- Duplicate warning actions (v4.8.0) ----
  bindDuplicateWarningEvents();
}

function bindSettingsButtons() {
  const bindings = [
    ["updateCheckBtn", checkForUpdates],
    ["currencyBtn", toggleCurrencySelector],
    ["darkModeBtn", toggleDarkMode],
    ["feedbackBtn", () => openFeedbackModal()],
  ];
  bindings.forEach(([id, handler]) => {
    document.getElementById(id)?.addEventListener("click", handler);
  });
}

// ============================================================================
// Event Delegation for Dynamic Content
// ============================================================================

function bindDelegatedEvents() {
  // Transaction list: edit / delete buttons + tag click-to-filter (v3.14.0)
  document.getElementById("transactionsList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (btn) {
      const id = btn.dataset.id;
      if (btn.dataset.action === "edit") editTransaction(id);
      if (btn.dataset.action === "delete") deleteTransaction(id);
      if (btn.dataset.action === "mark-settled") handleMarkSettled(id);
      return;
    }
    const tagEl = e.target.closest("[data-tag]");
    if (tagEl) {
      const tag = tagEl.dataset.tag;
      if (!state.searchTags.includes(tag)) {
        state.searchTags = [...state.searchTags, tag];
        state.currentPage = 1;
        updateUI();
      }
    }
  });

  // Month filter buttons
  document.getElementById("monthFilters").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-month]");
    if (btn) filterByMonth(btn.dataset.month);
  });

  // Currency list items
  document.getElementById("currencyList").addEventListener("click", (e) => {
    const item = e.target.closest("[data-code]");
    if (!item) return;
    const code = item.dataset.code;
    setCurrency(code);
    updateCurrencyDisplay();
    updateUI();
    closeCurrencySelector();
    showMessage(`Currency changed to ${currencies[code].name}.`);
  });

  // Budget container: collapse toggle + edit / delete
  document.getElementById("budgetContainer").addEventListener("click", (e) => {
    // Collapse toggle — ignore clicks on the Add button inside the header
    const toggleHeader = e.target.closest("[data-toggle-budget-collapse]");
    if (toggleHeader && !e.target.closest("#addBudgetBtn")) {
      const body = toggleHeader
        .closest(".card")
        .querySelector(".budget-collapse-body");
      const chevron = toggleHeader.querySelector(".budget-chevron");
      if (body) {
        body.hidden = !body.hidden;
        chevron && chevron.classList.toggle("expanded", !body.hidden);
        toggleHeader.setAttribute("aria-expanded", String(!body.hidden));
        localStorage.setItem("budgetListExpanded", String(!body.hidden));
      }
      return;
    }

    const editBtn = e.target.closest("[data-edit-budget]");
    if (editBtn) {
      const budgetId = Number(editBtn.dataset.editBudget);
      const budget = state.budgets.find((b) => b.id === budgetId);
      if (budget) {
        openBudgetModal(budget);
      }
    }

    const deleteBtn = e.target.closest("[data-delete-budget]");
    if (deleteBtn) {
      const budgetId = Number(deleteBtn.dataset.deleteBudget);
      deleteBudgetConfirm(budgetId);
    }
  });

  // Active tag filter pills — remove (v3.14.0)
  document.getElementById("activeTagFilters").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-tag]");
    if (!btn) return;
    const tag = btn.dataset.removeTag;
    state.searchTags = state.searchTags.filter((t) => t !== tag);
    state.currentPage = 1;
    updateUI();
  });

  // Tag management — rename / delete (v3.14.0)
  document
    .getElementById("tagManagementContainer")
    .addEventListener("click", async (e) => {
      // Color dot click — cycle to next palette color
      const colorDot = e.target.closest("[data-color-tag]");
      if (colorDot) {
        cycleTagColor(colorDot.dataset.colorTag);
        renderTagManagement();
        updateUI();
        return;
      }

      const renameBtn = e.target.closest("[data-rename-tag]");
      if (renameBtn) {
        const oldName = renameBtn.dataset.renameTag;
        const row = renameBtn.closest(".tag-manage-row");
        const nameSpan = row.querySelector(".tag-manage-name");
        const actionsDiv = row.querySelector(".tag-manage-actions");

        // Inline rename input
        const input = document.createElement("input");
        input.type = "text";
        input.value = oldName;
        input.className = "search-input";
        input.style.cssText =
          "padding: 4px 8px; font-size: 13px; width: 140px;";

        const saveBtn = document.createElement("button");
        saveBtn.className = "tag-manage-btn tag-manage-btn-rename";
        saveBtn.textContent = "Save";

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "tag-manage-btn";
        cancelBtn.textContent = "Cancel";
        cancelBtn.style.cssText =
          "background: var(--color-bg); border-color: var(--color-border);";

        nameSpan.replaceWith(input);
        actionsDiv.innerHTML = "";
        actionsDiv.appendChild(saveBtn);
        actionsDiv.appendChild(cancelBtn);
        input.focus();
        input.select();

        const doSave = async () => {
          const newName = input.value.trim().toLowerCase();
          if (newName && newName !== oldName) {
            await renameTag(oldName, newName);
            // Update searchTags if the renamed tag is active
            if (state.searchTags.includes(oldName)) {
              state.searchTags = state.searchTags.map((t) =>
                t === oldName ? newName : t,
              );
            }
          }
          renderTagManagement();
          updateUI();
        };

        saveBtn.addEventListener("click", doSave);
        input.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") doSave();
          if (ev.key === "Escape") {
            renderTagManagement();
          }
        });
        cancelBtn.addEventListener("click", () => renderTagManagement());
        return;
      }

      const deleteBtn = e.target.closest("[data-delete-tag]");
      if (deleteBtn) {
        const tagName = deleteBtn.dataset.deleteTag;
        await deleteTag(tagName);
        state.searchTags = state.searchTags.filter((t) => t !== tagName);
        renderTagManagement();
        updateUI();
      }
    });

  // FAQ sections & items (delegated from faqContainer) - Lazy-loaded
  document
    .getElementById("faqContainer")
    .addEventListener("click", async (e) => {
      const mod = await getFAQModule();
      const sectionHeader = e.target.closest("[data-faq-section]");
      if (sectionHeader) {
        mod.toggleFAQSection(Number(sectionHeader.dataset.faqSection));
        return;
      }
      const questionBtn = e.target.closest("[data-faq-item]");
      if (questionBtn) {
        const [section, item] = questionBtn.dataset.faqItem
          .split("-")
          .map(Number);
        mod.toggleFAQItem(section, item);
      }
    });

  // Backup status container: export & scrollToFAQ actions - Lazy-loaded
  document
    .getElementById("backupStatusContainer")
    .addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      if (btn.dataset.action === "exportBackup") {
        const mod = await getImportExportModule();
        mod.exportToCSV();
      }
      if (btn.dataset.action === "scrollToFAQ") {
        const mod = await getFAQModule();
        mod.scrollToFAQ();
      }
    });

  // Error log container: copy & clear actions (v3.29.0)
  const errorLogEl = document.getElementById("errorLogContainer");
  if (errorLogEl) {
    errorLogEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      if (btn.dataset.action === "copyErrorLog") {
        const log = getErrorLog();
        const text = log
          .map((e) => `[${e.timestamp}] ${e.message}\n${e.stack}`)
          .join("\n---\n");
        navigator.clipboard
          .writeText(text)
          .then(() => showMessage("Error log copied."));
      }
      if (btn.dataset.action === "clearErrorLog") {
        clearErrorLog();
        updateSettingsContent();
        showMessage("Error log cleared.");
      }
    });
  }
}

// ============================================================================
// Search & Tag Events (v3.14.0)
// ============================================================================

function bindSearchEvents() {
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("searchClearBtn");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    state.searchQuery = searchInput.value;
    clearBtn.hidden = !searchInput.value;
    state.currentPage = 1;
    if (state.currentTab === "list") updateUI();
  });

  clearBtn.addEventListener("click", () => {
    state.searchQuery = "";
    searchInput.value = "";
    clearBtn.hidden = true;
    state.currentPage = 1;
    if (state.currentTab === "list") updateUI();
  });
}

function bindTagInputEvents() {
  const tagInput = document.getElementById("tagInput");
  const suggestions = document.getElementById("tagSuggestions");
  if (!tagInput) return;

  // Add a tag from the current input value
  function addTag(value) {
    const tag = value.trim().toLowerCase().replaceAll(",", "");
    if (!tag || tag.length > 30) return;
    if (state.formTags.includes(tag)) {
      tagInput.value = "";
      hideSuggestions();
      return;
    }
    if (state.formTags.length >= 15) return;
    ensureTagColor(tag);
    state.formTags = [...state.formTags, tag];
    renderFormTagChips(); // also calls renderTagPicker()
    tagInput.value = "";
    hideSuggestions();
  }

  // Tag picker chip click — toggle the tag in formTags
  document.getElementById("tagPickerRow").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-pick-tag]");
    if (!chip) return;
    const tag = chip.dataset.pickTag;
    if (state.formTags.includes(tag)) {
      state.formTags = state.formTags.filter((t) => t !== tag);
    } else {
      if (state.formTags.length < 15) {
        state.formTags = [...state.formTags, tag];
      }
    }
    renderFormTagChips(); // also calls renderTagPicker()
  });

  function showSuggestions(query) {
    const existing = getAllTags().filter(
      (t) => t.includes(query) && !state.formTags.includes(t),
    );
    if (!query || existing.length === 0) {
      hideSuggestions();
      return;
    }
    suggestions.innerHTML = existing
      .slice(0, 8)
      .map(
        (t) =>
          `<div class="tag-suggestion-item" data-suggestion="${sanitizeHTML(t)}">${sanitizeHTML(t)}</div>`,
      )
      .join("");
    suggestions.hidden = false;
  }

  function hideSuggestions() {
    suggestions.hidden = true;
    suggestions.innerHTML = "";
  }

  tagInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (tagInput.value.trim()) {
        e.preventDefault();
        addTag(tagInput.value);
      }
    } else if (
      e.key === "Backspace" &&
      !tagInput.value &&
      state.formTags.length > 0
    ) {
      state.formTags = state.formTags.slice(0, -1);
      renderFormTagChips();
    }
  });

  tagInput.addEventListener("input", () => {
    showSuggestions(tagInput.value.trim().toLowerCase());
  });

  suggestions.addEventListener("click", (e) => {
    const item = e.target.closest("[data-suggestion]");
    if (item) addTag(item.dataset.suggestion);
  });

  // Hide suggestions when focus leaves the tag input area
  document.addEventListener("click", (e) => {
    if (
      !e.target.closest("#tagInputWrapper") &&
      !e.target.closest("#tagSuggestions")
    ) {
      hideSuggestions();
    }
  });
}

// ============================================================================
// Form Submission Handler
// ============================================================================

let saveRenderTimeout = null;
let allowDuplicateSubmit = false;
let duplicateTxId = null;

function hideDuplicateWarning() {
  const warning = document.getElementById("duplicateWarning");
  const message = document.getElementById("duplicateWarningMessage");
  if (warning) warning.hidden = true;
  if (message) message.textContent = "";
  duplicateTxId = null;
}

function showDuplicateWarning(duplicateTx) {
  const warning = document.getElementById("duplicateWarning");
  const message = document.getElementById("duplicateWarningMessage");
  if (!warning || !message || !duplicateTx) return;

  const descriptor =
    (duplicateTx.merchant || duplicateTx.notes || duplicateTx.category || "")
      .toString()
      .trim() || duplicateTx.category;
  const preview = `${formatDate(duplicateTx.date)} - ${descriptor} - ${formatCurrency(duplicateTx.homeAmount ?? duplicateTx.amount)}`;
  message.textContent = t("message.duplicate_warning", { preview });
  warning.hidden = false;
  duplicateTxId = duplicateTx.id;
}

function bindDuplicateWarningEvents() {
  const addAnywayBtn = document.getElementById("duplicateAddAnywayBtn");
  const viewExistingBtn = document.getElementById("duplicateViewExistingBtn");

  addAnywayBtn?.addEventListener("click", () => {
    allowDuplicateSubmit = true;
    hideDuplicateWarning();
    document.getElementById("transactionForm")?.requestSubmit();
  });

  viewExistingBtn?.addEventListener("click", () => {
    if (!duplicateTxId) return;
    const id = duplicateTxId;
    hideDuplicateWarning();
    editTransaction(id);
  });
}

function bindFormSubmit() {
  const formEl = document.getElementById("transactionForm");

  ["input", "change"].forEach((eventName) => {
    formEl.addEventListener(eventName, () => {
      if (!document.getElementById("duplicateWarning")?.hidden) {
        hideDuplicateWarning();
      }
      allowDuplicateSubmit = false;
    });
  });

  document
    .getElementById("transactionForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const submitBtn = document.getElementById("submitBtn");
      const formCard = document.querySelector("#addTab .card");
      const originalBtnText = submitBtn.textContent;

      const rawAmount = document.getElementById("amount").value.trim();
      const amountInput = rawAmount;
      const amount = evaluateAmountExpr(rawAmount);

      if (!amountInput) {
        showMessage(t("validation.enter_amount"));
        submitBtn.classList.remove("loading");
        submitBtn.disabled = false;
        return;
      }

      if (!isNaN(amount) && !Number.isInteger(amount * 100)) {
        showMessage(t("validation.amount_decimals"));
        submitBtn.classList.remove("loading");
        submitBtn.disabled = false;
        return;
      }

      submitBtn.classList.add("loading");
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="btn-spinner"></span> Saving…';

      const type = document.getElementById("type").value;
      const now = new Date().toISOString();
      const existingTx = state.editingId
        ? state.transactions.find((t) => t.id === state.editingId)
        : null;
      const transaction = {
        id: state.editingId || generateId(),
        type,
        amount,
        category: document.getElementById("category").value,
        date: document.getElementById("date").value,
        notes: document.getElementById("notes").value,
        tags: [...state.formTags],
        status: existingTx ? existingTx.status || "cleared" : "cleared",
        createdAt: existingTx ? existingTx.createdAt : now,
        updatedAt: now,
        ...(type === "transfer" ? getTransferFormData() : {}),
        ...getOptionalFieldValues(),
        ...getMultiCurrencyFormData(),
      };

      // Clear field errors from previous submit
      ["amount", "category", "date"].forEach((field) => {
        const el = document.getElementById(`${field}Error`);
        if (el) el.textContent = "";
      });

      const validation = validateTransaction(transaction);

      if (!validation.valid) {
        // Surface per-field errors via aria-describedby spans
        validation.errors.forEach((err) => {
          const el = document.getElementById(`${err.field}Error`);
          if (el) el.textContent = err.message;
        });
        const errorMessage = validation.errors
          .map((err) => err.message)
          .join(", ");
        showMessage(errorMessage);
        submitBtn.classList.remove("loading");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
      }

      const sanitizedTransaction = validation.sanitized;

      const duplicateMatch = detectDuplicate(
        sanitizedTransaction,
        state.transactions,
      );
      if (duplicateMatch && !allowDuplicateSubmit) {
        showDuplicateWarning(duplicateMatch);
        submitBtn.classList.remove("loading");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
      }

      allowDuplicateSubmit = false;
      hideDuplicateWarning();

      // Cache timestamp for fast sorting
      sanitizedTransaction.dateTs = new Date(
        sanitizedTransaction.date,
      ).getTime();

      try {
        try {
          await saveTransactionToDB(sanitizedTransaction);
        } catch (retryErr) {
          // One retry after 300ms — handles transient IDB lock / quota spike
          logError(retryErr?.message, retryErr?.stack);
          await new Promise((r) => setTimeout(r, 300));
          await saveTransactionToDB(sanitizedTransaction);
        }

        submitBtn.classList.remove("loading");
        submitBtn.classList.add("success");
        submitBtn.innerHTML = '<i class="ri-check-line btn-icon"></i> Saved!';

        if ("vibrate" in navigator) {
          navigator.vibrate(50);
        }

        formCard.classList.add("success-pulse");

        if (state.editingId) {
          const index = state.transactions.findIndex(
            (t) => t.id === state.editingId,
          );
          if (index !== -1) {
            state.transactions[index] = sanitizedTransaction;
          }
          showMessage(t("message.transaction_updated"));
        } else {
          state.transactions.unshift(sanitizedTransaction);
          showMessage(t("message.transaction_saved"));
        }

        const savedEditingId = state.editingId;
        clearTimeout(saveRenderTimeout);
        saveRenderTimeout = setTimeout(() => {
          submitBtn.classList.remove("success");
          submitBtn.disabled = false;
          submitBtn.textContent = state.editingId
            ? "Update Transaction"
            : "Save Transaction";
          formCard.classList.remove("success-pulse");

          // If the user quickly opened a new edit session, don't reset the form
          if (state.editingId !== savedEditingId) return;

          document.getElementById("transactionForm").reset();
          document.getElementById("date").valueAsDate = new Date();
          state.editingId = null;
          state.formTags = [];
          renderFormTagChips();
          clearTransferFields();
          clearOptionalFields();
          clearMultiCurrencyFields();
          dismissCategorySuggestion();
          hideDuplicateWarning();
          selectType("expense");
          document.getElementById("formTitle").textContent = "Add Transaction";
          document.getElementById("cancelEditBtn").style.display = "none";

          updateUI();
          renderQuickBar();
          renderAccountManager();
          renderAlertBanners(runAlertChecks(sanitizedTransaction));
          renderAnnualReport();
          renderForecast();
          renderSettlementDashboard();
        }, 800);
      } catch (err) {
        logError(err?.message, err?.stack);
        console.error("Save failed:", err);
        submitBtn.classList.remove("loading");
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        showMessage(t("error.transaction_save_failed"));
      }
    });
}

// ============================================================================
// Reimbursement Settlement (v3.27.0)
// ============================================================================

async function handleMarkSettled(id) {
  try {
    const updated = await markTransactionSettled(id);
    if (updated) {
      const idx = state.transactions.findIndex((t) => t.id === id);
      if (idx !== -1) {
        state.transactions[idx] = updated;
      }
      updateUI();
      showMessage(t("message.marked_settled"));
    }
  } catch (err) {
    logError(err?.message, err?.stack);
    console.error("Failed to mark transaction as settled:", err);
    showMessage(t("error.transaction_save_failed"));
  }
}

// ============================================================================
// Service Worker Registration
// ============================================================================

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || window.location.protocol === "file:") {
    if (window.location.protocol === "file:") {
      console.log(
        "ℹ️ Service Worker requires HTTP/HTTPS. Run a local server to enable offline mode.",
      );
      console.log("Quick start: python3 -m http.server 8000");
    }
    return;
  }

  let refreshing = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    console.log("🔄 New service worker taking control - reloading page...");
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker
    .register("./sw.js")
    .then((registration) => {
      console.log("✅ Service Worker registered - App works offline!");
      registration.update();

      // Check for SW updates on tab visibility (throttled to 5 min)
      let lastUpdateCheck = Date.now();
      document.addEventListener("visibilitychange", () => {
        if (
          document.visibilityState === "visible" &&
          Date.now() - lastUpdateCheck > 5 * 60 * 1000
        ) {
          lastUpdateCheck = Date.now();
          registration.update();
        }
      });

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        console.log("🆕 New service worker found - installing...");

        newWorker.addEventListener("statechange", () => {
          console.log("Service Worker state:", newWorker.state);
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            console.log("🎉 New version ready to activate!");
            showUpdatePrompt();
          }
        });
      });
    })
    .catch((err) =>
      console.error("❌ Service Worker registration failed:", err),
    );
}

// ============================================================================
// Budget Modal Handler
// ============================================================================

function openBudgetModal(budget = null) {
  const modal = renderBudgetModal(budget);

  // Inline duplicate warning — injected below the category select
  const categorySelect = modal.element.querySelector("#budgetCategory");
  const confirmBtn = modal.element.querySelector(".modal-btn-confirm");

  const dupWarning = document.createElement("p");
  dupWarning.className = "budget-dup-warning";
  dupWarning.hidden = true;
  categorySelect.insertAdjacentElement("afterend", dupWarning);

  function checkDuplicate() {
    const selected = categorySelect.value;
    const existing = state.budgets.find(
      (b) => b.category === selected && b.id !== budget?.id,
    );
    if (existing) {
      dupWarning.textContent = `⚠ A budget for "${selected}" already exists. Edit it from the list instead.`;
      dupWarning.hidden = false;
      confirmBtn.disabled = true;
    } else {
      dupWarning.hidden = true;
      confirmBtn.disabled = false;
    }
  }

  categorySelect.addEventListener("change", checkDuplicate);
  // Run on open in case modal is pre-filled (edit mode)
  if (categorySelect.value) checkDuplicate();

  // Close button
  modal.element.querySelector(".close-btn").addEventListener("click", () => {
    modal.close();
  });

  // Cancel button
  modal.element
    .querySelector(".modal-btn-cancel")
    .addEventListener("click", () => {
      modal.close();
    });

  // Confirm button
  confirmBtn.addEventListener("click", async () => {
    try {
      const formData = modal.getFormData();

      // Validation
      if (!formData.category) {
        showMessage(t("validation.select_category"), "error");
        return;
      }
      if (!formData.monthlyLimit || formData.monthlyLimit <= 0) {
        showMessage(t("validation.budget_limit"), "error");
        return;
      }

      await saveBudget(formData);
      modal.close();

      // Refresh the budget list and alerts
      renderBudgetList();
      renderBudgetAlerts();
      updateUI();
    } catch (error) {
      logError(error?.message, error?.stack);
      console.error("Error saving budget:", error);
      showMessage(t("error.transaction_save_failed"));
    }
  });
}

// ============================================================================
// App Initialisation
// ============================================================================

async function init() {
  try {
    await initDB();
    await requestStoragePersistence();
    await migrateFromLocalStorage();
    await loadDataFromDB();

    // Independent feature inits — run in parallel (~150–300ms faster startup
    await Promise.all([
      loadRecurringIntoState(),
      initBudgets(),
      initQuickEntry(),
      initAccounts(),
      initOptionalFields(),
      initGoals(),
    ]);

    // Recurring check depends on loadRecurringIntoState completing first
    await checkRecurringTransactions();
    initAlerts();
    initTagColors();

    // Set up UI defaults
    document.getElementById("date").valueAsDate = new Date();
    updateCategoryOptions("expense");

    // Bind all events before first render
    bindStaticEvents();
    bindDelegatedEvents();
    bindFormSubmit();

    // Bind account autocomplete for transfer fields
    bindAccountAutocomplete("fromAccount", "fromAccountSuggestions");
    bindAccountAutocomplete("toAccount", "toAccountSuggestions");

    // Bind autocomplete for optional fields (v3.16.0)
    bindFieldAutocomplete("merchant", "merchantSuggestions", "merchant");
    bindFieldAutocomplete("attachedTo", "attachedToSuggestions", "attachedTo");
    renderFieldToggles();

    // First render
    updateUI();
    renderBudgetList();
    renderBudgetAlerts();
    renderTagPicker();
    renderTemplateManager();
    renderAccountManager();
    renderNetWorthDashboard();
    renderSavingsDashboard();
    renderGoalsDashboard();
    renderAnnualReport();
    renderForecast(30);
    renderAlertBanners(runAlertChecks());
    renderAlertHistory();
    renderMultiCurrencyFields();
    renderSettlementDashboard();
    await initAutoBackup();
    checkAppVersion();
    loadDarkMode();
    updateCurrencyDisplay();
    loadBackupTimestamp();
    checkInstallPrompt();

    // App Lock (v4.3.0) — render settings panel, then gate if enabled
    await renderLockSettings();
    await initAppLock();

    // Service Worker (non-blocking)
    registerServiceWorker();
  } catch (err) {
    logError(err?.message, err?.stack);
    console.error("App initialization failed:", err);
    showMessage(t("error.data_load_failed"));
  }
}

// M19: Register SW message listener early — before init() — so SW_UPDATED
// messages sent during fast updates are never missed.
if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "SW_UPDATED") {
      showUpdatePrompt();
    }
  });
}

// Since type="module" defers execution, DOM is ready
init();
