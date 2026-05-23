// ============================================================================
// App Entry Point — Initialisation, Event Bindings, Service Worker
// ============================================================================

// ---- Global Error Log (v3.29.0) ----
// Must be before any imports to catch early errors.
const ERROR_LOG_KEY = "errorLog";
const MAX_ERRORS = 50;

function logError(message, stack) {
  try {
    const log = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) || "[]");
    log.push({ timestamp: new Date().toISOString(), message, stack: stack || "" });
    if (log.length > MAX_ERRORS) log.splice(0, log.length - MAX_ERRORS);
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(log));
  } catch (_) { /* localStorage full or unavailable — silently ignore */ }
}

window.onerror = (message, source, lineno, colno, error) => {
  logError(String(message), error?.stack || `${source}:${lineno}:${colno}`);
};

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  logError(
    reason?.message || String(reason),
    reason?.stack || ""
  );
});

import { state, currencies } from "./state.js";
import { showMessage, generateId, sanitizeHTML, getErrorLog, clearErrorLog } from "./utils.js";
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
  getCurrency,
} from "./currency.js";
import { validateTransaction } from "./validation.js";
import {
  updateUI,
  updateReportsView,
  switchTab,
  quickAddTransaction,
  toggleSummaryCollapse,
  loadSummaryState,
  onSummaryTileClick,
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
  nextPage,
  prevPage,
  openFeedbackModal,
  closeFeedbackModal,
  renderFormTagChips,
  renderTagPicker,
} from "./ui.js";
import { getAllTags, renameTag, deleteTag, cycleTagColor, ensureTagColor, initTagColors } from "./search.js";
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
  openRecurringModal,
  closeRecurringModal,
  saveRecurringTemplate,
  selectRecurringType,
  initRecurringTagEvents,
} from "./recurring.js";
import {
  initBudgets,
  renderBudgetList,
  renderBudgetAlerts,
  saveBudget,
  deleteBudget,
  renderBudgetModal,
} from "./budget.js";
import {
  toggleTransferFields,
  bindAccountAutocomplete,
  getTransferFormData,
  clearTransferFields,
} from "./transfer.js";
import {
  initOptionalFields,
  renderOptionalFieldsForm,
  getOptionalFieldValues,
  setOptionalFieldValues,
  clearOptionalFields,
  bindFieldAutocomplete,
  renderFieldToggles,
  handleFieldToggle,
  handleNoteInput,
  acceptCategorySuggestion,
  dismissCategorySuggestion,
  rebuildSmartKeywords,
} from "./optional-fields.js";
import {
  initQuickEntry,
  renderQuickBar,
  prefillFromTemplate,
  cloneLast,
  saveAsTemplate,
  renderTemplateManager,
  deleteTemplate,
  moveTemplate,
  editTemplateLabel,
} from "./quick-entry.js";
import {
  initAccounts,
  renderNetWorthDashboard,
  renderAccountManager,
  showAddAccountForm,
  showEditAccountForm,
  closeAccountForm,
  handleAccountFormSubmit,
  removeAccount,
} from "./accounts.js";
import { renderSavingsDashboard } from "./savings.js";
import {
  initAlerts,
  runAlertChecks,
  renderAlertBanners,
  dismissAlert,
  dismissAllAlerts,
  renderAlertHistory,
  clearAlertHistory,
} from "./alerts.js";
import { renderAnnualReport, exportAnnualCSV } from "./annual-report.js";
import {
  initAutoBackup,
  getBackupSettings,
  saveBackupSettings,
  performJsonBackup,
  performCsvBackup,
  performEncryptedBackup,
  importEncryptedBackup,
  renderAutoBackupSettings,
  renderStorageHealth,
  requestStoragePersistence,
} from "./auto-backup.js";
import {
  renderMultiCurrencyFields,
  getMultiCurrencyFormData,
  setMultiCurrencyFormData,
  clearMultiCurrencyFields,
} from "./multi-currency.js";
import {
  renderSettlementDashboard,
  navigateSettlementPeriod,
  copySettlementSummary,
} from "./settlement.js";
import {
  initGoals,
  renderGoalsDashboard,
  showGoalForm,
  closeGoalForm,
  handleGoalFormSubmit,
  showContributionForm,
  closeContributionForm,
  handleContributionSubmit,
  removeGoal,
} from "./goals.js";

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
  // ---- Header buttons ----
  document
    .querySelector('.header-btn[aria-label="Send Feedback"]')
    .addEventListener("click", openFeedbackModal);
  document
    .querySelector('.header-btn[aria-label="Quick Add Transaction"]')
    .addEventListener("click", quickAddTransaction);

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

  // ---- Summary section header (collapse) ----
  document
    .querySelector(".summary-header")
    .addEventListener("click", toggleSummaryCollapse);
  document.querySelector(".collapse-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleSummaryCollapse();
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
  ["add", "list", "reports", "groups", "settings"].forEach((tab) => {
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
  document
    .getElementById("cancelEditBtn")
    .addEventListener("click", cancelEdit);

  // ---- Category filter (onchange) ----
  document
    .getElementById("categoryFilter")
    .addEventListener("change", filterByCategory);

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
    .querySelectorAll("#restorePreviewModal .modal-btn-cancel")
    .forEach((btn) =>
      btn.addEventListener("click", async () => {
        const mod = await getImportExportModule();
        mod.closeRestorePreview();
      }),
    );
  document
    .querySelector("#restorePreviewModal .modal-btn-confirm")
    .addEventListener("click", async () => {
      const mod = await getImportExportModule();
      mod.confirmRestore();
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
  });

  // ---- Restore Preview modal close (X button) ----
  document
    .querySelector("#restorePreviewModal .close-btn")
    .addEventListener("click", async () => {
      const mod = await getImportExportModule();
      mod.closeRestorePreview();
    });

  // ---- Hidden file inputs ----
  document
    .getElementById("importFile")
    .addEventListener("change", async (e) => {
      const mod = await getImportExportModule();
      mod.handleImport(e);
    });
  document
    .getElementById("restoreFile")
    .addEventListener("change", async (e) => {
      const mod = await getImportExportModule();
      mod.handleRestore(e);
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
}

function bindSettingsButtons() {
  const actions = {
    "Export CSV": async () => {
      const mod = await getImportExportModule();
      mod.exportToCSV();
    },
    "Import CSV": async () => {
      const mod = await getImportExportModule();
      mod.triggerImport();
    },
    "Create Backup": async () => {
      const mod = await getImportExportModule();
      await mod.createBackup();
    },
    "Restore from Backup": async () => {
      const mod = await getImportExportModule();
      mod.triggerRestore();
    },
    "Check for updates": checkForUpdates,
    "Change currency": toggleCurrencySelector,
    "Toggle dark mode": toggleDarkMode,
    "Send Feedback": () => openFeedbackModal(),
  };

  document.querySelectorAll("#settingsTab .toolbar-btn").forEach((btn) => {
    const label = btn.getAttribute("aria-label");
    if (actions[label]) {
      btn.addEventListener("click", actions[label]);
    }
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
      const id = Number(btn.dataset.id);
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
    showMessage(`Currency changed to ${currencies[code].name}`);
  });

  // Budget container: collapse toggle + edit / delete
  document.getElementById("budgetContainer").addEventListener("click", (e) => {
    // Collapse toggle — ignore clicks on the Add button inside the header
    const toggleHeader = e.target.closest("[data-toggle-budget-collapse]");
    if (toggleHeader && !e.target.closest("#addBudgetBtn")) {
      const body    = toggleHeader.closest(".card").querySelector(".budget-collapse-body");
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
  document.getElementById("tagManagementContainer").addEventListener("click", async (e) => {
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
      input.style.cssText = "padding: 4px 8px; font-size: 13px; width: 140px;";

      const saveBtn = document.createElement("button");
      saveBtn.className = "tag-manage-btn tag-manage-btn-rename";
      saveBtn.textContent = "Save";

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "tag-manage-btn";
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.cssText = "background: var(--color-bg); border-color: var(--color-border);";

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
            state.searchTags = state.searchTags.map((t) => (t === oldName ? newName : t));
          }
        }
        renderTagManagement();
        updateUI();
      };

      saveBtn.addEventListener("click", doSave);
      input.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") doSave();
        if (ev.key === "Escape") { renderTagManagement(); }
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
        const text = log.map((e) => `[${e.timestamp}] ${e.message}\n${e.stack}`).join("\n---\n");
        navigator.clipboard.writeText(text).then(() => showMessage("Error log copied"));
      }
      if (btn.dataset.action === "clearErrorLog") {
        clearErrorLog();
        updateSettingsContent();
        showMessage("Error log cleared");
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
    const tag = value.trim().toLowerCase().replace(/,/g, "");
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
      .map((t) => `<div class="tag-suggestion-item" data-suggestion="${sanitizeHTML(t)}">${sanitizeHTML(t)}</div>`)
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
    } else if (e.key === "Backspace" && !tagInput.value && state.formTags.length > 0) {
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
    if (!e.target.closest("#tagInputWrapper") && !e.target.closest("#tagSuggestions")) {
      hideSuggestions();
    }
  });
}

// ============================================================================
// Optional Fields Events (v3.16.0)
// ============================================================================

function bindOptionalFieldsEvents() {
  // Collapsible "Additional Details" toggle
  const toggle = document.getElementById("optionalFieldsToggle");
  const container = document.getElementById("optionalFieldsContainer");
  if (toggle && container) {
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      container.hidden = expanded;
      toggle.querySelector(".optional-fields-chevron").classList.toggle("expanded", !expanded);
    });
  }

  // Notes input → smart category suggestion
  const notesInput = document.getElementById("notes");
  if (notesInput) {
    notesInput.addEventListener("input", () => {
      handleNoteInput(notesInput.value);
    });
  }

  // Category suggestion accept/dismiss
  const suggestionBanner = document.getElementById("categorySuggestion");
  if (suggestionBanner) {
    suggestionBanner.querySelector(".suggestion-accept").addEventListener("click", acceptCategorySuggestion);
    suggestionBanner.querySelector(".suggestion-dismiss").addEventListener("click", dismissCategorySuggestion);
  }

  // Field toggle switches in Settings
  document.getElementById("optionalFieldToggles").addEventListener("change", (e) => {
    const checkbox = e.target.closest("[data-field-toggle]");
    if (!checkbox) return;
    handleFieldToggle(checkbox.dataset.fieldToggle, checkbox.checked);
  });
}

// ============================================================================
// Quick Entry Events (v3.17.0)
// ============================================================================

function bindQuickEntryEvents() {
  // Quick bar pill clicks
  const bar = document.getElementById("quickEntryBar");
  if (bar) {
    bar.addEventListener("click", (e) => {
      const pill = e.target.closest("[data-template-id]");
      if (pill) {
        prefillFromTemplate(Number(pill.dataset.templateId));
        return;
      }
      if (e.target.closest("#cloneLastBtn")) {
        cloneLast();
      }
    });
  }

  // "Save as Template" button
  const saveTemplateBtn = document.getElementById("saveAsTemplateBtn");
  if (saveTemplateBtn) {
    saveTemplateBtn.addEventListener("click", saveAsTemplate);
  }

  // Custom event: quick-entry-type → update category options + transfer fields
  document.addEventListener("quick-entry-type", (e) => {
    updateCategoryOptions(e.detail);
    selectType(e.detail);
  });

  // Custom event: quick-entry-tags → re-render form tag chips
  document.addEventListener("quick-entry-tags", () => {
    renderFormTagChips();
  });

  // Template manager delegated events (Settings)
  const templatesList = document.getElementById("quickTemplatesList");
  if (templatesList) {
    templatesList.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest("[data-delete]");
      if (deleteBtn) {
        deleteTemplate(Number(deleteBtn.dataset.delete));
        return;
      }
      const moveBtn = e.target.closest("[data-move]");
      if (moveBtn) {
        moveTemplate(Number(moveBtn.dataset.id), moveBtn.dataset.move);
        return;
      }
      // Double-click to edit label
      const label = e.target.closest(".template-item-label");
      if (label) {
        const item = label.closest(".template-item");
        if (!item) return;
        const id = Number(item.dataset.templateId);
        const currentLabel = label.textContent;
        const input = document.createElement("input");
        input.type = "text";
        input.value = currentLabel;
        input.maxLength = 30;
        input.className = "template-edit-input";
        label.replaceWith(input);
        input.focus();
        input.select();
        const commit = () => {
          const newVal = input.value.trim() || currentLabel;
          editTemplateLabel(id, newVal);
        };
        input.addEventListener("blur", commit);
        input.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") input.blur();
          if (ev.key === "Escape") { input.value = currentLabel; input.blur(); }
        });
      }
    });
  }
}

// ============================================================================
// Account Events (v3.18.0)
// ============================================================================

function bindAccountEvents() {
  // Add account button
  const addBtn = document.getElementById("addAccountBtn");
  if (addBtn) {
    addBtn.addEventListener("click", showAddAccountForm);
  }

  // Account form save
  const saveBtn = document.getElementById("accountFormSaveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", handleAccountFormSubmit);
  }

  // Account form close
  const closeBtn = document.querySelector(".account-form-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeAccountForm);
  }

  // Close modal on backdrop click
  const modal = document.getElementById("accountFormModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeAccountForm();
    });
  }

  // Account list delegated events (edit, delete)
  const accountsList = document.getElementById("accountsList");
  if (accountsList) {
    accountsList.addEventListener("click", async (e) => {
      const editBtn = e.target.closest(".account-edit-btn");
      if (editBtn) {
        showEditAccountForm(Number(editBtn.dataset.id));
        return;
      }
      const deleteBtn = e.target.closest(".account-delete-btn");
      if (deleteBtn) {
        const id = Number(deleteBtn.dataset.id);
        const account = state.accounts.find((a) => a.id === id);
        if (account && confirm(`Delete account "${account.name}"?`)) {
          await removeAccount(id);
          renderAccountManager();
          renderNetWorthDashboard();
          renderSavingsDashboard();
        }
      }
    });
  }
}

// ============================================================================
// Goal Events (v3.20.0)
// ============================================================================

function bindGoalEvents() {
  // Add goal button
  const addBtn = document.getElementById("addGoalBtn");
  if (addBtn) {
    addBtn.addEventListener("click", () => showGoalForm());
  }

  // Goal form save
  const saveBtn = document.getElementById("goalFormSaveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", handleGoalFormSubmit);
  }

  // Goal form close
  const closeBtn = document.getElementById("goalFormCloseBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeGoalForm);
  }

  // Goal form modal backdrop
  const goalModal = document.getElementById("goalFormModal");
  if (goalModal) {
    goalModal.addEventListener("click", (e) => {
      if (e.target === goalModal) closeGoalForm();
    });
  }

  // Contribution modal save
  const contribSaveBtn = document.getElementById("contributionSaveBtn");
  if (contribSaveBtn) {
    contribSaveBtn.addEventListener("click", handleContributionSubmit);
  }

  // Contribution modal close
  const contribCloseBtn = document.getElementById("contributionCloseBtn");
  if (contribCloseBtn) {
    contribCloseBtn.addEventListener("click", closeContributionForm);
  }

  // Contribution modal backdrop
  const contribModal = document.getElementById("contributionModal");
  if (contribModal) {
    contribModal.addEventListener("click", (e) => {
      if (e.target === contribModal) closeContributionForm();
    });
  }

  // Goals dashboard delegated events (contribute, edit, delete)
  const goalsDashboard = document.getElementById("goalsDashboard");
  if (goalsDashboard) {
    goalsDashboard.addEventListener("click", async (e) => {
      const contributeBtn = e.target.closest(".goal-contribute-btn");
      if (contributeBtn) {
        showContributionForm(Number(contributeBtn.dataset.id));
        return;
      }
      const editBtn = e.target.closest(".goal-edit-btn");
      if (editBtn) {
        showGoalForm(Number(editBtn.dataset.id));
        return;
      }
      const deleteBtn = e.target.closest(".goal-delete-btn");
      if (deleteBtn) {
        const id = Number(deleteBtn.dataset.id);
        const goal = state.savingsGoals.find((g) => g.id === id);
        if (goal && confirm(`Delete goal "${goal.name}"?`)) {
          await removeGoal(id);
          renderGoalsDashboard();
        }
      }
    });
  }
}

// ============================================================================
// Alert Events (v3.21.0)
// ============================================================================

function bindAlertEvents() {
  // Dismiss alert banners
  const alertsContainer = document.getElementById("smartAlerts");
  if (alertsContainer) {
    alertsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-dismiss]");
      if (!btn) return;
      const alertId = btn.dataset.dismiss;
      dismissAlert(alertId);
      const banner = btn.closest(".smart-alert");
      if (banner) banner.remove();
      // Hide container if empty
      if (!alertsContainer.querySelector(".smart-alert")) {
        alertsContainer.hidden = true;
      }
    });
  }

  // Alert summary chip toggle (collapse/expand when > 2 alerts)
  if (alertsContainer) {
    alertsContainer.addEventListener("click", (e) => {
      if (e.target.closest("#alertSummaryToggle")) {
        const expanded = localStorage.getItem("alertsExpanded") === "true";
        localStorage.setItem("alertsExpanded", expanded ? "false" : "true");
        renderAlertBanners(runAlertChecks());
        return;
      }
      if (e.target.closest("#alertDismissAll")) {
        const alerts = runAlertChecks();
        dismissAllAlerts(alerts);
        localStorage.removeItem("alertsExpanded");
        renderAlertBanners([]);
        return;
      }
    });
  }

  // Clear alert history button
  const clearBtn = document.getElementById("clearAlertsBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      clearAlertHistory();
      renderAlertHistory();
    });
  }
}

// ============================================================================
// Annual Report Events (v3.21.0)
// ============================================================================

function bindAnnualReportEvents() {
  const container = document.getElementById("annualReportContent");
  if (!container) return;

  container.addEventListener("click", (e) => {
    // Year selector pills
    const yearBtn = e.target.closest("[data-annual-year]");
    if (yearBtn) {
      renderAnnualReport(yearBtn.dataset.annualYear);
      return;
    }
    // Export CSV button
    const exportBtn = e.target.closest("[data-annual-export]");
    if (exportBtn) {
      exportAnnualCSV(exportBtn.dataset.annualExport);
    }
  });
}

function bindAutoBackupEvents() {
  // Use event delegation on the auto-backup container
  const container = document.getElementById("autoBackupContainer");
  if (!container) return;

  container.addEventListener("click", (e) => {
    // Toggle auto-backup on/off
    const toggle = e.target.closest("#autoBackupToggle");
    if (toggle) {
      const settings = getBackupSettings();
      settings.autoBackupEnabled = !settings.autoBackupEnabled;
      saveBackupSettings(settings);
      container.innerHTML = renderAutoBackupSettings();
      return;
    }

    // Manual backup now
    const manualBtn = e.target.closest("#manualBackupBtn");
    if (manualBtn) {
      const settings = getBackupSettings();
      if (settings.backupFormat === "json") {
        performJsonBackup(false);
      } else {
        performCsvBackup(false);
      }
      return;
    }

    // Encrypted backup
    const encBtn = e.target.closest("#encryptedBackupBtn");
    if (encBtn) {
      const passphrase = prompt(
        "Enter a passphrase (min 6 characters) to encrypt your backup:",
      );
      if (passphrase) {
        performEncryptedBackup(passphrase);
      }
      return;
    }

    // Import encrypted
    const impBtn = e.target.closest("#importEncryptedBtn");
    if (impBtn) {
      document.getElementById("encryptedRestoreFile").click();
      return;
    }
  });

  container.addEventListener("change", (e) => {
    // Frequency select
    if (e.target.id === "backupFrequency") {
      const settings = getBackupSettings();
      settings.backupFrequency = e.target.value;
      saveBackupSettings(settings);
    }
    // Format select
    if (e.target.id === "backupFormat") {
      const settings = getBackupSettings();
      settings.backupFormat = e.target.value;
      saveBackupSettings(settings);
    }
  });

  // Encrypted file input handler
  document
    .getElementById("encryptedRestoreFile")
    .addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const passphrase = prompt(
        "Enter the passphrase used to encrypt this backup:",
      );
      if (!passphrase) return;

      const data = await importEncryptedBackup(file, passphrase);
      if (data) {
        // Hand off to import-export module's restore flow
        const mod = await getImportExportModule();
        mod.processRestoredData(data);
      }
      e.target.value = "";
    });
}

// ============================================================================
// Multi-Currency Events (v3.24.0)
// ============================================================================

function bindMultiCurrencyEvents() {
  // The multi-currency fields are rendered inside the optional fields container.
  // renderMultiCurrencyFields() handles its own event binding.
  // We just need to re-render when optional field toggles change.
  document.getElementById("optionalFieldToggles").addEventListener("change", (e) => {
    const checkbox = e.target.closest("[data-field-toggle]");
    if (checkbox && checkbox.dataset.fieldToggle === "transactionCurrency") {
      setTimeout(() => renderMultiCurrencyFields(), 50);
    }
  });
}

// ============================================================================
// Settlement Events (v3.26.0)
// ============================================================================

function bindSettlementEvents() {
  const container = document.getElementById("settlementDashboard");
  if (!container) return;

  container.addEventListener("click", async (e) => {
    // Period navigation
    const periodBtn = e.target.closest("[data-settlement-period]");
    if (periodBtn) {
      navigateSettlementPeriod(periodBtn.dataset.settlementPeriod);
      return;
    }

    // Copy summary
    const exportBtn = e.target.closest("[data-settlement-export]");
    if (exportBtn) {
      const ok = await copySettlementSummary();
      if (ok) {
        const { showMessage: msg } = await import("./utils.js");
        msg("Summary copied to clipboard!");
      }
      return;
    }
  });
}

// ============================================================================
// Form Submission Handler
// ============================================================================

function bindFormSubmit() {
  document
    .getElementById("transactionForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const submitBtn = document.getElementById("submitBtn");
      const formCard = document.querySelector("#addTab .card");
      const originalBtnText = submitBtn.textContent;

      const amountInput = document.getElementById("amount").value.trim();
      const amount = parseFloat(amountInput);

      if (!amountInput) {
        showMessage("⚠️ Please enter an amount");
        submitBtn.classList.remove("loading");
        submitBtn.disabled = false;
        return;
      }

      if (!isNaN(amount) && !Number.isInteger(amount * 100)) {
        showMessage("⚠️ Amount can have at most 2 decimal places");
        submitBtn.classList.remove("loading");
        submitBtn.disabled = false;
        return;
      }

      submitBtn.classList.add("loading");
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="btn-spinner"></span> Saving...';

      const type = document.getElementById("type").value;
      const now = new Date().toISOString();
      const transaction = {
        id: state.editingId || generateId(),
        type: type,
        amount: amount,
        category: document.getElementById("category").value,
        date: document.getElementById("date").value,
        notes: document.getElementById("notes").value,
        tags: [...state.formTags],
        createdAt: state.editingId
          ? state.transactions.find((t) => t.id === state.editingId)?.createdAt
          : now,
        updatedAt: now,
      };

      // Add transfer-specific fields
      if (type === "transfer") {
        const transferData = getTransferFormData();
        transaction.fromAccount = transferData.fromAccount;
        transaction.toAccount = transferData.toAccount;
        transaction.transferNote = transferData.transferNote;
      }

      // Add optional fields (v3.16.0)
      const optionalValues = getOptionalFieldValues();
      Object.assign(transaction, optionalValues);

      // Add multi-currency fields (v3.24.0)
      const multiCurrencyValues = getMultiCurrencyFormData();
      Object.assign(transaction, multiCurrencyValues);

      const validation = validateTransaction(transaction);

      if (!validation.valid) {
        const errorMessage = validation.errors
          .map((err) => err.message)
          .join(", ");
        showMessage(`⚠️ ${errorMessage}`);
        submitBtn.classList.remove("loading");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
      }

      const sanitizedTransaction = validation.sanitized;
      // Cache timestamp for fast sorting
      sanitizedTransaction.dateTs = new Date(
        sanitizedTransaction.date,
      ).getTime();

      try {
        await saveTransactionToDB(sanitizedTransaction);

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
          showMessage("Transaction updated!");
        } else {
          state.transactions.unshift(sanitizedTransaction);
          showMessage("Transaction saved!");
        }

        setTimeout(() => {
          document.getElementById("transactionForm").reset();
          document.getElementById("date").valueAsDate = new Date();
          state.editingId = null;
          state.formTags = [];
          renderFormTagChips();
          clearTransferFields();
          clearOptionalFields();
          clearMultiCurrencyFields();
          dismissCategorySuggestion();
          selectType("expense");
          document.getElementById("formTitle").textContent = "Add Transaction";
          document.getElementById("cancelEditBtn").style.display = "none";

          submitBtn.classList.remove("success");
          submitBtn.disabled = false;
          submitBtn.textContent = "Save Transaction";

          formCard.classList.remove("success-pulse");

          updateUI();
          renderQuickBar();
          renderNetWorthDashboard();
          renderSavingsDashboard();
          renderAlertBanners(runAlertChecks(sanitizedTransaction));
          renderAnnualReport();
          renderSettlementDashboard();
        }, 800);
      } catch (err) {
        console.error("Save failed:", err);
        submitBtn.classList.remove("loading");
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        showMessage("Failed to save transaction");
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
      showMessage("Marked as settled");
    }
  } catch (err) {
    console.error("Failed to mark transaction as settled:", err);
    showMessage("Failed to mark as settled. Please try again.");
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

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data.type === "SW_UPDATED") {
      console.log("✅ Service Worker updated:", event.data.version);
      if (!refreshing) {
        showUpdatePrompt();
      }
    }
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    console.log("🔄 New service worker taking control - reloading page...");
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker.register("./sw.js")
    .then((registration) => {
      console.log("✅ Service Worker registered - App works offline!");
      registration.update();

      // Check for SW updates on tab visibility (throttled to 5 min)
      let lastUpdateCheck = Date.now();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && Date.now() - lastUpdateCheck > 5 * 60 * 1000) {
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
  const confirmBtn     = modal.element.querySelector(".modal-btn-confirm");

  const dupWarning = document.createElement("p");
  dupWarning.className = "budget-dup-warning";
  dupWarning.hidden = true;
  categorySelect.insertAdjacentElement("afterend", dupWarning);

  function checkDuplicate() {
    const selected = categorySelect.value;
    const existing = state.budgets.find(
      (b) => b.category === selected && b.id !== budget?.id
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
  modal.element.querySelector(".modal-btn-cancel").addEventListener("click", () => {
    modal.close();
  });

  // Confirm button
  confirmBtn.addEventListener("click", async () => {
    try {
      const formData = modal.getFormData();

      // Validation
      if (!formData.category) {
        showMessage("Please select a category", "error");
        return;
      }
      if (!formData.monthlyLimit || formData.monthlyLimit <= 0) {
        showMessage("Monthly limit must be greater than 0", "error");
        return;
      }

      await saveBudget(formData);
      modal.close();

      // Refresh the budget list and alerts
      renderBudgetList();
      renderBudgetAlerts();
      updateUI();
    } catch (error) {
      console.error("Error saving budget:", error);
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
    await loadRecurringIntoState();
    await initBudgets();
    await checkRecurringTransactions();
    await initOptionalFields();
    await initQuickEntry();
    await initAccounts();
    await initGoals();
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
    renderAlertBanners(runAlertChecks());
    renderAlertHistory();
    renderMultiCurrencyFields();
    renderSettlementDashboard();
    await initAutoBackup();
    checkAppVersion();
    loadDarkMode();
    loadSummaryState();
    updateCurrencyDisplay();
    loadBackupTimestamp();
    checkInstallPrompt();

    // Service Worker (non-blocking)
    registerServiceWorker();
  } catch (err) {
    console.error("App initialization failed:", err);
    showMessage("Failed to load data");
  }
}

// Since type="module" defers execution, DOM is ready
init();
