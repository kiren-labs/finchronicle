// ============================================================================
// Reconciliation Workflow (v4.0.0)
// ============================================================================

import { state } from "./state.js";
import { saveTransactionToDB } from "./db.js";
import { formatCurrency } from "./currency.js";
import { formatDate, showMessage, generateId } from "./utils.js";
import { updateUI } from "./ui.js";

// Module-level reconciliation session — not on global state object
let reconciliationState = null;

// ---- Internal helpers ----

function getModal() {
  return document.getElementById("reconciliationModal");
}

/**
 * Compute balance from openingBalance + all already-reconciled transactions for this account.
 * Does NOT include candidates being evaluated in the current session.
 */
export function computeReconciledBase(accountName, accounts, transactions) {
  const account = (accounts || []).find((a) => a.name === accountName);
  let balance = account ? parseFloat(account.openingBalance) || 0 : 0;

  for (const t of transactions || []) {
    if (t.status !== "reconciled") continue;
    if (t.type === "transfer") continue;
    if (t.type === "income" && t.toAccount === accountName)
      balance += parseFloat(t.amount) || 0;
    if (t.type === "expense" && t.fromAccount === accountName)
      balance -= parseFloat(t.amount) || 0;
  }

  return balance;
}

/**
 * Add/subtract checked candidate transactions on top of reconciledBase.
 */
export function computeCheckedBalance(
  reconciledBase,
  accountName,
  candidates,
  checkedIds,
) {
  let balance = reconciledBase;

  for (const t of candidates || []) {
    if (!checkedIds.has(t.id)) continue;
    if (t.type === "income" && t.toAccount === accountName)
      balance += parseFloat(t.amount) || 0;
    if (t.type === "expense" && t.fromAccount === accountName)
      balance -= parseFloat(t.amount) || 0;
  }

  return balance;
}

/**
 * Filter transactions to reconciliation candidates for an account up to statementDate.
 */
export function filterCandidates(accountName, statementDate, transactions) {
  return (transactions || [])
    .filter((t) => {
      if (t.type === "transfer") return false;
      if (t.status === "reconciled") return false;
      if (t.date > statementDate) return false;
      const isCredit = t.type === "income" && t.toAccount === accountName;
      const isDebit = t.type === "expense" && t.fromAccount === accountName;
      return isCredit || isDebit;
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// ---- Render helpers ----

function renderCandidateList() {
  const list = document.getElementById("reconciliationList");
  if (!list || !reconciliationState) return;

  const { candidates, checkedIds, accountName } = reconciliationState;

  if (candidates.length === 0) {
    list.textContent = "No transactions to check up to this date.";
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const t of candidates) {
    const isCredit = t.type === "income" && t.toAccount === accountName;
    const amount = parseFloat(t.amount) || 0;
    const signed = isCredit ? amount : -amount;

    const row = document.createElement("label");
    row.className = "reconciliation-row";
    row.setAttribute("for", `recon-chk-${t.id}`);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `recon-chk-${t.id}`;
    checkbox.dataset.reconId = t.id;
    checkbox.checked = checkedIds.has(t.id);
    checkbox.setAttribute("aria-label", "Mark as confirmed");

    const dateSpan = document.createElement("span");
    dateSpan.className = "recon-col recon-date";
    dateSpan.textContent = formatDate(t.date);

    const catSpan = document.createElement("span");
    catSpan.className = "recon-col recon-category";
    catSpan.textContent = t.category || "";

    const notesSpan = document.createElement("span");
    notesSpan.className = "recon-col recon-notes";
    notesSpan.textContent = t.notes || "";

    const amtSpan = document.createElement("span");
    amtSpan.className = `recon-col recon-amount ${isCredit ? "recon-credit" : "recon-debit"}`;
    amtSpan.textContent = (signed >= 0 ? "+" : "") + formatCurrency(signed);

    const statusSpan = document.createElement("span");
    statusSpan.className = "recon-col recon-status";
    statusSpan.textContent = t.status || "cleared";

    row.appendChild(checkbox);
    row.appendChild(dateSpan);
    row.appendChild(catSpan);
    row.appendChild(notesSpan);
    row.appendChild(amtSpan);
    row.appendChild(statusSpan);
    fragment.appendChild(row);
  }

  list.innerHTML = "";
  list.appendChild(fragment);
}

// ---- Exported API ----

export function openReconciliationModal(accountName) {
  reconciliationState = {
    accountName,
    statementBalance: null,
    statementDate: null,
    candidates: [],
    checkedIds: new Set(),
  };

  const modal = getModal();
  if (!modal) return;

  const heading = document.getElementById("reconciliationAccountName");
  if (heading) heading.textContent = `Check against statement: ${accountName}`;

  const balInput = document.getElementById("reconciliationStatementBalance");
  const dateInput = document.getElementById("reconciliationStatementDate");
  if (balInput) balInput.value = "";
  if (dateInput) {
    dateInput.value = "";
    dateInput.max = new Date().toISOString().slice(0, 10);
  }

  const list = document.getElementById("reconciliationList");
  if (list) list.innerHTML = "";

  const diff = document.getElementById("reconciliationDifference");
  if (diff) {
    diff.textContent = "";
    diff.className = "reconciliation-difference";
  }

  const step2 = document.getElementById("reconciliationStep2");
  if (step2) step2.hidden = true;

  const finaliseBtn = document.getElementById("reconciliationFinaliseBtn");
  const forceBtn = document.getElementById("reconciliationForceBtn");
  const adjustBtn = document.getElementById("reconciliationAdjustBtn");
  if (finaliseBtn) finaliseBtn.hidden = true;
  if (forceBtn) forceBtn.hidden = true;
  if (adjustBtn) adjustBtn.hidden = true;

  modal.classList.add("show");
  document.getElementById("reconciliationStatementBalance")?.focus();
}

export function loadReconciliationTransactions() {
  if (!reconciliationState) return;

  const balInput = document.getElementById("reconciliationStatementBalance");
  const dateInput = document.getElementById("reconciliationStatementDate");
  const rawBalance = balInput ? balInput.value.trim() : "";
  const rawDate = dateInput ? dateInput.value.trim() : "";

  if (rawBalance === "" || isNaN(parseFloat(rawBalance))) {
    showMessage("Enter a valid statement balance.");
    return;
  }
  if (!rawDate) {
    showMessage("Enter a statement date.");
    return;
  }

  reconciliationState.statementBalance = parseFloat(rawBalance);
  reconciliationState.statementDate = rawDate;
  reconciliationState.checkedIds = new Set();
  reconciliationState.candidates = filterCandidates(
    reconciliationState.accountName,
    rawDate,
    state.transactions,
  );

  renderCandidateList();
  renderReconciliationDifference();

  const step2 = document.getElementById("reconciliationStep2");
  if (step2) step2.hidden = false;

  const finaliseBtn = document.getElementById("reconciliationFinaliseBtn");
  if (finaliseBtn) finaliseBtn.hidden = false;
}

export function toggleReconciliationItem(transactionId) {
  if (!reconciliationState) return;

  // IDs may be strings (from dataset) or numbers — normalise to the same type as stored
  const raw = transactionId;
  const asNum = Number(raw);
  const id = Number.isFinite(asNum) ? asNum : raw;

  if (reconciliationState.checkedIds.has(id)) {
    reconciliationState.checkedIds.delete(id);
  } else {
    reconciliationState.checkedIds.add(id);
  }

  renderReconciliationDifference();
}

export function renderReconciliationDifference() {
  if (!reconciliationState) return;

  const diffEl = document.getElementById("reconciliationDifference");
  if (!diffEl) return;

  const { statementBalance, accountName, candidates, checkedIds } =
    reconciliationState;
  if (statementBalance === null) {
    diffEl.textContent = "";
    return;
  }

  const base = computeReconciledBase(
    accountName,
    state.accounts,
    state.transactions,
  );
  const checked = computeCheckedBalance(
    base,
    accountName,
    candidates,
    checkedIds,
  );
  const difference = Math.round((checked - statementBalance) * 100) / 100;

  diffEl.innerHTML = "";
  const label = document.createElement("span");
  label.textContent = "Difference: ";
  const value = document.createElement("strong");
  value.textContent = formatCurrency(difference);
  diffEl.appendChild(label);
  diffEl.appendChild(value);

  if (difference === 0) {
    diffEl.className = "reconciliation-difference reconciliation-match";
    const forceBtn = document.getElementById("reconciliationForceBtn");
    const adjustBtn = document.getElementById("reconciliationAdjustBtn");
    if (forceBtn) forceBtn.hidden = true;
    if (adjustBtn) adjustBtn.hidden = true;
  } else {
    diffEl.className = "reconciliation-difference reconciliation-mismatch";
    const hint = document.createElement("p");
    hint.className = "recon-hint";
    hint.textContent =
      "Review unmatched transactions first. Can't find the difference? Record a balance adjustment.";
    diffEl.appendChild(hint);
  }
}

export async function finaliseReconciliation(force = false) {
  if (!reconciliationState) return;

  const { accountName, candidates, checkedIds, statementBalance } =
    reconciliationState;
  const base = computeReconciledBase(
    accountName,
    state.accounts,
    state.transactions,
  );
  const checked = computeCheckedBalance(
    base,
    accountName,
    candidates,
    checkedIds,
  );
  const difference = Math.round((checked - statementBalance) * 100) / 100;

  if (difference !== 0 && !force) {
    const diffEl = document.getElementById("reconciliationDifference");
    if (diffEl && !diffEl.querySelector(".recon-force-warning")) {
      const warning = document.createElement("p");
      warning.className = "recon-hint recon-force-warning";
      warning.textContent =
        'Balance does not match. Use "Continue Anyway" or "Create Balance Adjustment" to proceed.';
      diffEl.appendChild(warning);
    }
    const forceBtn = document.getElementById("reconciliationForceBtn");
    const adjustBtn = document.getElementById("reconciliationAdjustBtn");
    if (forceBtn) forceBtn.hidden = false;
    if (adjustBtn) adjustBtn.hidden = false;
    return;
  }

  const toReconcile = candidates.filter((t) => checkedIds.has(t.id));

  for (const t of toReconcile) {
    t.status = "reconciled";
    await saveTransactionToDB(t);
  }

  for (const t of state.transactions) {
    if (checkedIds.has(t.id)) t.status = "reconciled";
  }

  const count = toReconcile.length;
  showMessage(
    `${count} transaction${count !== 1 ? "s" : ""} confirmed against your statement.`,
  );
  closeReconciliationModal();
  updateUI();
  document.dispatchEvent(new CustomEvent("reconciliation:finalised"));
}

async function createAdjustingEntry(accountName, difference, statementDate) {
  const isExpense = difference > 0;
  const entryDate = statementDate || new Date().toISOString().slice(0, 10);
  const entry = {
    id: generateId(),
    type: isExpense ? "expense" : "income",
    amount: Math.abs(difference),
    category: "Reconciliation Adjustment",
    date: entryDate,
    notes: "Balance adjustment — reconciliation",
    tags: ["adjustment"],
    status: "reconciled",
    isAdjustment: true,
    createdAt: new Date().toISOString(),
    ...(isExpense ? { fromAccount: accountName } : { toAccount: accountName }),
  };
  await saveTransactionToDB(entry);
  state.transactions.unshift(entry);
  return entry;
}

export async function finaliseWithAdjustment() {
  if (!reconciliationState) return;
  const { accountName, statementBalance, candidates, checkedIds } =
    reconciliationState;
  const base = computeReconciledBase(
    accountName,
    state.accounts,
    state.transactions,
  );
  const checked = computeCheckedBalance(
    base,
    accountName,
    candidates,
    checkedIds,
  );
  const difference = Math.round((checked - statementBalance) * 100) / 100;
  if (difference !== 0) {
    await createAdjustingEntry(
      accountName,
      difference,
      reconciliationState.statementDate,
    );
  }
  await finaliseReconciliation(true);
}

export function closeReconciliationModal() {
  const modal = getModal();
  if (modal) modal.classList.remove("show");
  reconciliationState = null;
}

// ============================================================================
// Event Bindings
// ============================================================================

export function bindReconciliationEvents() {
  const modal = document.getElementById("reconciliationModal");
  if (!modal) return;

  modal
    .querySelector(".reconciliation-close")
    ?.addEventListener("click", closeReconciliationModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeReconciliationModal();
  });

  document
    .getElementById("reconciliationLoadBtn")
    ?.addEventListener("click", loadReconciliationTransactions);
  document
    .getElementById("reconciliationFinaliseBtn")
    ?.addEventListener("click", () => finaliseReconciliation(false));
  document
    .getElementById("reconciliationForceBtn")
    ?.addEventListener("click", () => finaliseReconciliation(true));
  document
    .getElementById("reconciliationAdjustBtn")
    ?.addEventListener("click", () => finaliseWithAdjustment());

  document
    .getElementById("reconciliationList")
    ?.addEventListener("change", (e) => {
      const chk = e.target.closest("[data-recon-id]");
      if (chk) toggleReconciliationItem(chk.dataset.reconId);
    });
}
