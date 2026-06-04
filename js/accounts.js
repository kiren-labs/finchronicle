// ============================================================================
// Accounts & Net Worth (v3.18.0)
// ============================================================================

import { state, ACCOUNT_TYPES, ACCOUNT_CLASSIFICATION } from "./state.js";
import {
  loadAccounts,
  saveAccount,
  deleteAccount,
  saveNetWorthSnapshot,
  loadNetWorthSnapshots,
  getNetWorthSnapshotByDate,
} from "./db.js";
import { formatCurrency } from "./currency.js";
import { sanitizeHTML, showMessage, generateId } from "./utils.js";
import { renderSavingsDashboard } from "./savings.js";
import { openReconciliationModal } from "./reconciliation.js";

// ---- Init ----

export async function initAccounts() {
  try {
    await loadAccounts();
    if (state.accounts.length > 0) {
      await captureMonthlySnapshot();
    }
  } catch (err) {
    console.error("Failed to load accounts:", err);
    state.accounts = [];
    showMessage("Failed to load accounts. Some data may be unavailable.");
  }
}

// ---- Pure Computation ----

/**
 * Compute derived balance for an account from opening balance + transactions.
 * Credits: transfers TO this account, income linked to this account
 * Debits: transfers FROM this account, expenses linked to this account
 */
export function getAccountBalance(accountName) {
  const account = state.accounts.find((a) => a.name === accountName);
  if (!account) return 0;

  const opening = account.openingBalance || 0;

  let credits = 0;
  let debits = 0;

  state.transactions.forEach((t) => {
    if (t.deleted) return;

    if (t.type === "transfer") {
      if (t.toAccount === accountName) credits += t.amount;
      if (t.fromAccount === accountName) debits += t.amount;
    } else if (t.type === "income") {
      if (t.toAccount === accountName) credits += t.amount;
    } else if (t.type === "expense") {
      if (t.fromAccount === accountName) debits += t.amount;
    }
  });

  return opening + credits - debits;
}

/**
 * Get net worth breakdown: assets, liabilities, net.
 * Uses account.classification field (v4.0.0) with fallback to type-based heuristic.
 */
export function getNetWorth() {
  let totalAssets = 0;
  let totalLiabilities = 0;

  const accountBalances = state.accounts
    .filter((a) => a.isActive !== false)
    .map((a) => {
      const balance = getAccountBalance(a.name);
      return { ...a, balance };
    });

  accountBalances.forEach((a) => {
    const classification =
      a.classification || ACCOUNT_CLASSIFICATION[a.type] || "asset";
    if (classification === "liability") {
      totalLiabilities += Math.abs(a.balance);
    } else {
      if (a.balance >= 0) {
        totalAssets += a.balance;
      } else {
        totalLiabilities += Math.abs(a.balance);
      }
    }
  });

  return {
    assets: totalAssets,
    liabilities: totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    accounts: accountBalances,
  };
}

/**
 * Get active account names for dropdowns.
 */
export function getActiveAccountNames() {
  return state.accounts.filter((a) => a.isActive !== false).map((a) => a.name);
}

// ---- Account CRUD ----

export async function addAccount(formData) {
  const { name, type, openingBalance } = formData;

  if (!name || !name.trim()) {
    showMessage("Account name is required.");
    return false;
  }

  const trimmedName = sanitizeHTML(name.trim());

  // Check for duplicate name
  if (
    state.accounts.some(
      (a) => a.name.toLowerCase() === trimmedName.toLowerCase(),
    )
  ) {
    showMessage("An account with that name already exists.");
    return false;
  }

  if (!ACCOUNT_TYPES.includes(type)) {
    showMessage("Invalid account type.");
    return false;
  }

  const parsedBalance = parseFloat(openingBalance) || 0;

  const account = {
    id: generateId(),
    name: trimmedName,
    type,
    classification: ACCOUNT_CLASSIFICATION[type] || "asset",
    openingBalance: parsedBalance,
    isSavings: type === "savings" || type === "investment",
    isActive: true,
    sortOrder: state.accounts.length,
    createdAt: new Date().toISOString(),
  };

  try {
    await saveAccount(account);
    state.accounts.push(account);
    showMessage(`Account "${trimmedName}" created.`);
    return true;
  } catch (err) {
    console.error("Failed to save account:", err);
    showMessage("Failed to create account.");
    return false;
  }
}

export async function updateAccount(id, updates) {
  const index = state.accounts.findIndex((a) => String(a.id) === String(id));
  if (index === -1) return false;

  const account = state.accounts[index];

  // If name changed, check for duplicates
  if (updates.name && updates.name !== account.name) {
    const trimmedName = sanitizeHTML(updates.name.trim());
    if (
      state.accounts.some(
        (a) =>
          String(a.id) !== String(id) &&
          a.name.toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      showMessage("An account with that name already exists.");
      return false;
    }
    updates.name = trimmedName;
  }

  const updated = {
    ...account,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  try {
    await saveAccount(updated);
    state.accounts[index] = updated;
    return true;
  } catch (err) {
    console.error("Failed to update account:", err);
    showMessage("Failed to update account.");
    return false;
  }
}

export async function removeAccount(id) {
  const account = state.accounts.find((a) => String(a.id) === String(id));
  if (!account) return false;

  // Check if account is referenced by any transaction
  const isReferenced = state.transactions.some(
    (t) => t.fromAccount === account.name || t.toAccount === account.name,
  );

  if (isReferenced) {
    // Deactivate instead of deleting
    return updateAccount(id, { isActive: false });
  }

  try {
    await deleteAccount(id);
    state.accounts = state.accounts.filter((a) => String(a.id) !== String(id));
    showMessage(`Account "${account.name}" deleted.`);
    return true;
  } catch (err) {
    console.error("Failed to delete account:", err);
    showMessage("Failed to delete account.");
    return false;
  }
}

// ---- Monthly Snapshot (v3.28.0) ----

export async function captureMonthlySnapshot() {
  try {
    const now = new Date();
    const snapshotDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const existing = await getNetWorthSnapshotByDate(snapshotDate);
    if (existing) return; // already captured this month

    const { assets, liabilities, netWorth } = getNetWorth();
    await saveNetWorthSnapshot({
      snapshotDate,
      assets: Math.round(assets * 100) / 100,
      liabilities: Math.round(liabilities * 100) / 100,
      netWorth: Math.round(netWorth * 100) / 100,
      capturedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to capture net worth snapshot:", err);
  }
}

// ---- Render: Net Worth Dashboard ----

export function renderNetWorthDashboard() {
  const container = document.getElementById("netWorthDashboard");
  const section = document.getElementById("netWorthSection");
  if (!container || !section) return;

  if (state.accounts.length === 0) {
    section.hidden = true;
    return;
  }

  section.hidden = false;

  const { assets, liabilities, netWorth, accounts } = getNetWorth();
  const netClass = netWorth >= 0 ? "positive" : "negative";

  let html = `
    <div class="net-worth-summary">
      <div class="net-worth-main ${netClass}">
        <span class="net-worth-label">Net Worth</span>
        <span class="net-worth-value">${formatCurrency(netWorth)}</span>
      </div>
      <div class="net-worth-breakdown">
        <div class="net-worth-item assets">
          <span class="nw-item-label">Assets</span>
          <span class="nw-item-value">${formatCurrency(assets)}</span>
        </div>
        <div class="net-worth-item liabilities">
          <span class="nw-item-label">Liabilities</span>
          <span class="nw-item-value">${formatCurrency(liabilities)}</span>
        </div>
      </div>
    </div>
    <div class="account-balances-list">`;

  accounts
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .forEach((a) => {
      const balClass = a.balance >= 0 ? "positive" : "negative";
      html += `
      <div class="account-balance-row">
        <span class="account-balance-name">${sanitizeHTML(a.name)}</span>
        <span class="account-balance-amount ${balClass}">${formatCurrency(a.balance)}</span>
      </div>`;
    });

  html += `</div>`;
  container.innerHTML = html;

  // Render net worth trend chart below dashboard (v3.28.0)
  renderNetWorthTrend();
}

// ---- Net Worth Trend: Chart Rendering (v3.28.0) ----

async function renderNetWorthTrend() {
  const container = document.getElementById("netWorthTrendContainer");
  const chartEl = document.getElementById("netWorthTrend");
  if (!container || !chartEl) return;

  let snapshots;
  try {
    snapshots = await loadNetWorthSnapshots();
  } catch {
    return;
  }

  // Keep last 12 months only, sorted ascending
  snapshots = snapshots
    .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))
    .slice(-12);

  if (snapshots.length < 2) {
    container.hidden = false;
    chartEl.innerHTML = `<p class="nw-trend-placeholder">Track your net worth over time — check back next month for your first trend point.</p>`;
    return;
  }

  container.hidden = false;

  const values = snapshots.map((s) => s.netWorth);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const W = 300;
  const H = 120;
  const PAD_X = 10;
  const PAD_Y = 14;
  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y * 2;

  const points = snapshots.map((s, i) => {
    const x = PAD_X + (i / (snapshots.length - 1)) * chartW;
    const y = PAD_Y + chartH - ((s.netWorth - minVal) / range) * chartH;
    return { x, y, snapshot: s };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  const dotSVG = points
    .map((p, i) => {
      const isLast = i === points.length - 1;
      return `<circle cx="${p.x}" cy="${p.y}" r="${isLast ? 4 : 3}" class="nw-trend-dot${isLast ? " nw-trend-dot-last" : ""}" data-value="${p.snapshot.netWorth}" data-date="${p.snapshot.snapshotDate}" />`;
    })
    .join("");

  const labelFirst = formatMonthLabel(snapshots[0].snapshotDate);
  const labelLast = formatMonthLabel(snapshots.at(-1).snapshotDate);
  const latestNetWorth = snapshots.at(-1).netWorth;
  const prevNetWorth = snapshots[snapshots.length - 2].netWorth;
  const trendDiff = latestNetWorth - prevNetWorth;
  const trendClass = trendDiff >= 0 ? "positive" : "negative";
  const trendSign = trendDiff >= 0 ? "+" : "";

  chartEl.innerHTML = `
    <div class="nw-trend-header">
      <span class="nw-trend-current ${trendClass}">${formatCurrency(latestNetWorth)}</span>
      <span class="nw-trend-change ${trendClass}">${trendSign}${formatCurrency(trendDiff)} vs last month</span>
    </div>
    <svg class="nw-trend-svg" viewBox="0 0 ${W} ${H}" aria-label="Net worth trend chart">
      <polyline class="nw-trend-line" points="${polylinePoints}" />
      ${dotSVG}
    </svg>
    <div class="nw-trend-labels">
      <span>${labelFirst}</span>
      <span>${snapshots.length} months</span>
      <span>${labelLast}</span>
    </div>
  `;
}

function formatMonthLabel(snapshotDate) {
  const d = new Date(`${snapshotDate}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// ---- Render: Account Manager (Settings) ----

export function renderAccountManager() {
  const list = document.getElementById("accountsList");
  const count = document.getElementById("accountCount");
  if (!list) return;

  if (count) count.textContent = `(${state.accounts.length})`;

  if (state.accounts.length === 0) {
    list.innerHTML = `<p class="empty-state">No accounts configured. Add your bank accounts, cards, and wallets.</p>`;
    return;
  }

  let html = "";
  state.accounts.forEach((account) => {
    const balance = getAccountBalance(account.name);
    const balClass = balance >= 0 ? "positive" : "negative";
    const typeLabel = account.type.replace("-", " ");
    const inactive = account.isActive === false ? " inactive" : "";
    const savingsBadge = account.isSavings
      ? `<span class="savings-badge" aria-label="Savings account">savings</span>`
      : "";
    const classification =
      account.classification || ACCOUNT_CLASSIFICATION[account.type] || "asset";
    const classificationBadge =
      classification === "liability"
        ? `<span class="liability-badge" aria-label="Liability account">liability</span>`
        : "";

    html += `
    <div class="account-item${inactive}" data-id="${account.id}">
      <div class="account-item-info">
        <div class="account-item-icon">${getAccountIcon(account.type)}</div>
        <div class="account-item-details">
          <span class="account-item-name">${sanitizeHTML(account.name)}</span>
          <span class="account-item-meta">${typeLabel} ${savingsBadge}${classificationBadge}</span>
        </div>
      </div>
      <div class="account-item-right">
        <span class="account-item-balance ${balClass}">${formatCurrency(balance)}</span>
        <div class="account-item-actions">
          <button class="template-action-btn account-edit-btn" data-id="${account.id}" title="Edit">
            <i class="ri-pencil-line"></i>
          </button>
          <button class="template-action-btn template-delete-btn account-delete-btn" data-id="${account.id}" title="Delete">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      </div>
    </div>`;
  });

  list.innerHTML = html;
}

function getAccountIcon(type) {
  switch (type) {
    case "checking":
      return '<i class="ri-bank-line"></i>';
    case "savings":
      return '<i class="ri-safe-2-line"></i>';
    case "credit-card":
      return '<i class="ri-bank-card-line"></i>';
    case "cash":
      return '<i class="ri-money-dollar-circle-line"></i>';
    case "investment":
      return '<i class="ri-line-chart-line"></i>';
    case "loan":
      return '<i class="ri-hand-coin-line"></i>';
    case "mortgage":
      return '<i class="ri-home-line"></i>';
    default:
      return '<i class="ri-wallet-3-line"></i>';
  }
}

// ---- Account Form Helpers ----

export function updateAccountTypeIcon(type) {
  const preview = document.getElementById("accountTypeIconPreview");
  if (!preview) return;
  preview.innerHTML = getAccountIcon(type);
}

export function showAddAccountForm() {
  const modal = document.getElementById("accountFormModal");
  if (!modal) return;

  document.getElementById("accountFormTitle").textContent = "Add Account";
  document.getElementById("accountNameInput").value = "";
  document.getElementById("accountTypeSelect").value = "checking";
  document.getElementById("accountBalanceInput").value = "";
  document.getElementById("accountClassificationSelect").value = "asset";
  document.getElementById("accountSavingsToggle").checked = false;
  modal.dataset.editId = "";

  updateAccountTypeIcon("checking");

  const reconcileBtn = document.getElementById("accountReconcileBtn");
  if (reconcileBtn) reconcileBtn.hidden = true;

  modal.classList.add("show");
  document.getElementById("accountNameInput")?.focus();
}

export function showEditAccountForm(id) {
  const account = state.accounts.find((a) => String(a.id) === String(id));
  if (!account) return;

  const modal = document.getElementById("accountFormModal");
  if (!modal) return;

  document.getElementById("accountFormTitle").textContent = "Edit Account";
  document.getElementById("accountNameInput").value = account.name;
  document.getElementById("accountTypeSelect").value = account.type;
  document.getElementById("accountBalanceInput").value =
    account.openingBalance || "";
  document.getElementById("accountClassificationSelect").value =
    account.classification || ACCOUNT_CLASSIFICATION[account.type] || "asset";
  document.getElementById("accountSavingsToggle").checked =
    account.isSavings || false;
  modal.dataset.editId = String(id);

  updateAccountTypeIcon(account.type);

  const reconcileBtn = document.getElementById("accountReconcileBtn");
  if (reconcileBtn) {
    reconcileBtn.hidden = false;
    reconcileBtn.dataset.accountName = account.name;
  }

  modal.classList.add("show");
  document.getElementById("accountNameInput")?.focus();
}

export function closeAccountForm() {
  const modal = document.getElementById("accountFormModal");
  if (modal) modal.classList.remove("show");
}

export async function handleAccountFormSubmit() {
  const modal = document.getElementById("accountFormModal");
  const editId = modal.dataset.editId || null;

  const name = document.getElementById("accountNameInput").value;
  const type = document.getElementById("accountTypeSelect").value;
  const openingBalance = document.getElementById("accountBalanceInput").value;
  const classification = document.getElementById(
    "accountClassificationSelect",
  ).value;
  const isSavings = document.getElementById("accountSavingsToggle").checked;

  let success;
  if (editId) {
    success = await updateAccount(editId, {
      name: name.trim(),
      type,
      classification,
      openingBalance: parseFloat(openingBalance) || 0,
      isSavings,
    });
  } else {
    success = await addAccount({ name, type, openingBalance });
    // Set classification + isSavings if user overrode defaults
    if (success) {
      const newAccount = state.accounts.at(-1);
      if (newAccount) {
        const updates = {};
        if (classification !== (ACCOUNT_CLASSIFICATION[type] || "asset"))
          updates.classification = classification;
        if (isSavings && !newAccount.isSavings) updates.isSavings = true;
        if (Object.keys(updates).length > 0)
          await updateAccount(newAccount.id, updates);
      }
    }
  }

  if (success) {
    closeAccountForm();
    renderAccountManager();
    renderNetWorthDashboard();
  }
}

// ============================================================================
// Event Bindings
// ============================================================================

export function bindAccountEvents() {
  const addBtn = document.getElementById("addAccountBtn");
  if (addBtn) addBtn.addEventListener("click", showAddAccountForm);

  const saveBtn = document.getElementById("accountFormSaveBtn");
  if (saveBtn) saveBtn.addEventListener("click", handleAccountFormSubmit);

  const closeBtn = document.querySelector(".account-form-close");
  if (closeBtn) closeBtn.addEventListener("click", closeAccountForm);

  const reconcileBtn = document.getElementById("accountReconcileBtn");
  if (reconcileBtn) {
    reconcileBtn.addEventListener("click", () => {
      const name = reconcileBtn.dataset.accountName;
      if (!name) return;
      closeAccountForm();
      openReconciliationModal(name);
    });
  }

  const modal = document.getElementById("accountFormModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeAccountForm();
    });
  }

  const typeSelect = document.getElementById("accountTypeSelect");
  if (typeSelect) {
    typeSelect.addEventListener("change", () => {
      const classSelect = document.getElementById(
        "accountClassificationSelect",
      );
      if (classSelect) {
        classSelect.value = ACCOUNT_CLASSIFICATION[typeSelect.value] || "asset";
      }
      updateAccountTypeIcon(typeSelect.value);
    });
  }

  const accountsList = document.getElementById("accountsList");
  if (accountsList) {
    accountsList.addEventListener("click", async (e) => {
      const editBtn = e.target.closest(".account-edit-btn");
      if (editBtn) {
        showEditAccountForm(editBtn.dataset.id);
        return;
      }
      const deleteBtn = e.target.closest(".account-delete-btn");
      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        const account = state.accounts.find((a) => String(a.id) === id);
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
