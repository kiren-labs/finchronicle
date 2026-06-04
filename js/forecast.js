// ============================================================================
// Cash-Flow Forecast (v4.1.0)
// ============================================================================

import { state } from "./state.js";
import { formatCurrency } from "./currency.js";
import { formatDate } from "./utils.js";
import { getAccountBalance } from "./accounts.js";
import { computeNextDueDate } from "./recurring.js";

// ---- Pure forecast engine ----

export function buildForecast(
  accounts,
  transactions,
  recurringTemplates,
  horizonDays = 90,
) {
  if (!recurringTemplates || recurringTemplates.length === 0) {
    return { accountForecasts: {}, warnings: [] };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(today.getDate() + horizonDays);

  // Collect all future events from enabled templates
  const events = [];
  for (const tmpl of recurringTemplates) {
    if (!tmpl.enabled) continue;
    if (!tmpl.fromAccount && !tmpl.toAccount) continue;

    let dateStr = tmpl.nextDueDate;
    if (!dateStr) continue;

    // Walk occurrences within horizon
    let safety = 0;
    while (safety < 400) {
      safety++;
      const d = new Date(`${dateStr  }T00:00:00`);
      if (d > horizon) break;
      if (d >= today) {
        events.push({
          date: dateStr,
          dateObj: d,
          label: tmpl.name || tmpl.category || "Recurring",
          amount: tmpl.amount,
          type: tmpl.type,
          fromAccount: tmpl.fromAccount || null,
          toAccount: tmpl.toAccount || null,
        });
      }
      dateStr = computeNextDueDate(
        tmpl.frequency,
        tmpl.dayOfMonth || new Date(`${dateStr  }T00:00:00`).getDate(),
        dateStr,
      );
    }
  }

  // Sort events by date
  events.sort((a, b) => a.dateObj - b.dateObj);

  // Determine which accounts are relevant
  const relevantAccounts = new Set();
  for (const e of events) {
    if (e.fromAccount) relevantAccounts.add(e.fromAccount);
    if (e.toAccount) relevantAccounts.add(e.toAccount);
  }

  if (relevantAccounts.size === 0) {
    return { accountForecasts: {}, warnings: [] };
  }

  // Seed running balances
  const runningBalances = {};
  for (const name of relevantAccounts) {
    runningBalances[name] = getAccountBalance(name);
  }

  // Build per-account timelines
  const accountForecasts = {};
  for (const name of relevantAccounts) {
    accountForecasts[name] = {
      currentBalance: runningBalances[name],
      events: [],
    };
  }

  const warnings = [];

  for (const e of events) {
    // Apply to fromAccount (debit)
    if (e.fromAccount && accountForecasts[e.fromAccount]) {
      runningBalances[e.fromAccount] -= e.amount;
      const bal = runningBalances[e.fromAccount];
      accountForecasts[e.fromAccount].events.push({
        date: e.date,
        label: e.label,
        amount: -e.amount,
        runningBalance: bal,
      });
      if (bal < 0) {
        warnings.push({
          account: e.fromAccount,
          date: e.date,
          balance: bal,
          message: `${e.fromAccount} goes negative on ${e.date} (${formatCurrency(bal)})`,
        });
      }
    }

    // Apply to toAccount (credit)
    if (e.toAccount && accountForecasts[e.toAccount]) {
      runningBalances[e.toAccount] += e.amount;
      const bal = runningBalances[e.toAccount];
      accountForecasts[e.toAccount].events.push({
        date: e.date,
        label: e.label,
        amount: e.amount,
        runningBalance: bal,
      });
    }
  }

  return { accountForecasts, warnings };
}

// ---- UI Renderer ----

let activeHorizon = 30;

export function renderForecast(horizonDays) {
  if (horizonDays) activeHorizon = horizonDays;
  const container = document.getElementById("forecast-content");
  if (!container) return;

  const { accountForecasts, warnings } = buildForecast(
    state.accounts,
    state.transactions,
    state.recurringTemplates,
    activeHorizon,
  );

  const accountNames = Object.keys(accountForecasts);

  if (accountNames.length === 0) {
    container.innerHTML = `<p class="forecast-empty">Add recurring transactions with account links to see your forecast.</p>`;
    return;
  }

  let html = "";

  // Warning banners
  if (warnings.length > 0) {
    const unique = [...new Map(warnings.map((w) => [w.account, w])).values()];
    html += `<div class="forecast-warnings">${unique.map((w) => `<div class="forecast-warning"><i class="ri-alarm-warning-fill"></i><span data-msg="${w.account} goes negative on ${w.date} (${formatCurrency(w.balance)})"> </span></div>`).join("")}</div>`;
  }

  // Account cards
  for (const name of accountNames) {
    const { currentBalance, events } = accountForecasts[name];
    if (events.length === 0) continue;

    html += `<div class="forecast-account-card">
      <div class="forecast-account-header">
        <span class="forecast-account-name"></span>
        <span class="forecast-account-balance">${formatCurrency(currentBalance)}</span>
      </div>
      <div class="forecast-timeline">
        <div class="forecast-event-row forecast-event-today">
          <span class="forecast-event-date">Today</span>
          <span class="forecast-event-label">Opening Balance</span>
          <span class="forecast-event-amount neutral">${formatCurrency(currentBalance)}</span>
        </div>`;

    for (const ev of events) {
      const isNeg = ev.runningBalance < 0;
      const amountClass = ev.amount < 0 ? "negative-amount" : "positive-amount";
      const rowClass = isNeg
        ? "forecast-event-row forecast-event-negative"
        : "forecast-event-row";
      const amountStr = (ev.amount >= 0 ? "+" : "") + formatCurrency(ev.amount);
      const balStr = formatCurrency(ev.runningBalance);
      html += `<div class="${rowClass}" data-label="${ev.label}" data-date="${ev.date}" data-amount="${amountStr}" data-bal="${balStr}" data-neg="${isNeg}"></div>`;
    }

    html += `</div></div>`;
  }

  container.innerHTML = html;

  // Set text content safely (no innerHTML with user data)
  container
    .querySelectorAll(".forecast-warning span[data-msg]")
    .forEach((el) => {
      el.textContent = el.dataset.msg;
    });

  container.querySelectorAll(".forecast-account-card").forEach((card, i) => {
    const name = accountNames[i];
    const nameEl = card.querySelector(".forecast-account-name");
    if (nameEl) nameEl.textContent = name;
  });

  container
    .querySelectorAll(".forecast-event-row[data-date]")
    .forEach((row) => {
      const label = row.querySelector(".forecast-event-label") || row;
      const [dateEl, labelEl, amountEl, balEl] = [
        "forecast-event-date",
        "forecast-event-label",
        "forecast-event-amount",
        "forecast-event-balance",
      ].map((cls) => {
        const el = document.createElement("span");
        el.className = cls;
        return el;
      });
      dateEl.textContent = row.dataset.date;
      labelEl.textContent = row.dataset.label;
      amountEl.textContent = row.dataset.amount;
      amountEl.classList.add(
        row.dataset.amount.startsWith("+")
          ? "positive-amount"
          : "negative-amount",
      );
      balEl.textContent = row.dataset.bal;
      if (row.dataset.neg === "true") balEl.classList.add("balance-negative");

      row.innerHTML = "";
      row.append(dateEl, labelEl, amountEl, balEl);
    });
}
