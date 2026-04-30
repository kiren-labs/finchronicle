// ============================================================================
// Accounts & Net Worth (v3.18.0)
// ============================================================================

import { state, ACCOUNT_TYPES } from "./state.js";
import { loadAccounts, saveAccount, deleteAccount } from "./db.js";
import { formatCurrency } from "./currency.js";
import { sanitizeHTML, showMessage } from "./utils.js";

// ---- Init ----

export async function initAccounts() {
  try {
    await loadAccounts();
  } catch (err) {
    console.error("Failed to load accounts:", err);
    state.accounts = [];
  }
}

// ---- Balance Calculation ----

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
      if (t.fromAccount === accountName || t.toAccount === accountName) {
        credits += t.amount;
      }
    } else if (t.type === "expense") {
      if (t.fromAccount === accountName || t.toAccount === accountName) {
        debits += t.amount;
      }
    }
  });

  return opening + credits - debits;
}

/**
 * Get net worth breakdown: assets, liabilities, net.
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
    if (a.type === "credit-card") {
      // Credit card: positive balance = owed (liability)
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

// ---- Account CRUD UI ----

export async function addAccount(formData) {
  const { name, type, openingBalance } = formData;

  if (!name || !name.trim()) {
    showMessage("Account name is required.");
    return false;
  }

  const trimmedName = sanitizeHTML(name.trim());

  // Check for duplicate name
  if (state.accounts.some((a) => a.name.toLowerCase() === trimmedName.toLowerCase())) {
    showMessage("An account with that name already exists.");
    return false;
  }

  if (!ACCOUNT_TYPES.includes(type)) {
    showMessage("Invalid account type.");
    return false;
  }

  const parsedBalance = parseFloat(openingBalance) || 0;

  const account = {
    id: Date.now(),
    name: trimmedName,
    type,
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
  const index = state.accounts.findIndex((a) => a.id === id);
  if (index === -1) return false;

  const account = state.accounts[index];

  // If name changed, check for duplicates
  if (updates.name && updates.name !== account.name) {
    const trimmedName = sanitizeHTML(updates.name.trim());
    if (state.accounts.some((a) => a.id !== id && a.name.toLowerCase() === trimmedName.toLowerCase())) {
      showMessage("An account with that name already exists.");
      return false;
    }
    updates.name = trimmedName;
  }

  const updated = { ...account, ...updates, updatedAt: new Date().toISOString() };

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
  const account = state.accounts.find((a) => a.id === id);
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
    state.accounts = state.accounts.filter((a) => a.id !== id);
    showMessage(`Account "${account.name}" deleted.`);
    return true;
  } catch (err) {
    console.error("Failed to delete account:", err);
    showMessage("Failed to delete account.");
    return false;
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
      const typeLabel = a.type.replace("-", " ");
      html += `
      <div class="account-balance-row">
        <div class="account-balance-info">
          <span class="account-balance-name">${sanitizeHTML(a.name)}</span>
          <span class="account-balance-type">${typeLabel}</span>
        </div>
        <span class="account-balance-amount ${balClass}">${formatCurrency(a.balance)}</span>
      </div>`;
    });

  html += `</div>`;
  container.innerHTML = html;
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
    const savingsBadge = account.isSavings ? `<span class="savings-badge">savings</span>` : "";

    html += `
    <div class="account-item${inactive}" data-id="${account.id}">
      <div class="account-item-info">
        <div class="account-item-icon">${getAccountIcon(account.type)}</div>
        <div class="account-item-details">
          <span class="account-item-name">${sanitizeHTML(account.name)}</span>
          <span class="account-item-meta">${typeLabel} ${savingsBadge}</span>
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
    default:
      return '<i class="ri-wallet-3-line"></i>';
  }
}

// ---- Account Form Helpers ----

export function showAddAccountForm() {
  const modal = document.getElementById("accountFormModal");
  if (!modal) return;

  document.getElementById("accountFormTitle").textContent = "Add Account";
  document.getElementById("accountNameInput").value = "";
  document.getElementById("accountTypeSelect").value = "checking";
  document.getElementById("accountBalanceInput").value = "";
  document.getElementById("accountSavingsToggle").checked = false;
  modal.dataset.editId = "";
  modal.classList.add("show");
}

export function showEditAccountForm(id) {
  const account = state.accounts.find((a) => a.id === id);
  if (!account) return;

  const modal = document.getElementById("accountFormModal");
  if (!modal) return;

  document.getElementById("accountFormTitle").textContent = "Edit Account";
  document.getElementById("accountNameInput").value = account.name;
  document.getElementById("accountTypeSelect").value = account.type;
  document.getElementById("accountBalanceInput").value = account.openingBalance || "";
  document.getElementById("accountSavingsToggle").checked = account.isSavings || false;
  modal.dataset.editId = String(id);
  modal.classList.add("show");
}

export function closeAccountForm() {
  const modal = document.getElementById("accountFormModal");
  if (modal) modal.classList.remove("show");
}

export async function handleAccountFormSubmit() {
  const modal = document.getElementById("accountFormModal");
  const editId = modal.dataset.editId ? Number(modal.dataset.editId) : null;

  const name = document.getElementById("accountNameInput").value;
  const type = document.getElementById("accountTypeSelect").value;
  const openingBalance = document.getElementById("accountBalanceInput").value;
  const isSavings = document.getElementById("accountSavingsToggle").checked;

  let success;
  if (editId) {
    success = await updateAccount(editId, { name: name.trim(), type, openingBalance: parseFloat(openingBalance) || 0, isSavings });
  } else {
    success = await addAccount({ name, type, openingBalance });
    // Also set isSavings if user toggled it
    if (success && isSavings) {
      const newAccount = state.accounts[state.accounts.length - 1];
      if (newAccount && !newAccount.isSavings) {
        await updateAccount(newAccount.id, { isSavings: true });
      }
    }
  }

  if (success) {
    closeAccountForm();
    renderAccountManager();
    renderNetWorthDashboard();
  }
}

/**
 * Get active account names for dropdowns (replaces free-text savedAccounts).
 */
export function getActiveAccountNames() {
  return state.accounts
    .filter((a) => a.isActive !== false)
    .map((a) => a.name);
}
