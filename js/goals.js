// ============================================================================
// Savings Goals (v3.20.0)
// ============================================================================

import { state } from "./state.js";
import { loadGoals, saveGoal, deleteGoal } from "./db.js";
import { formatCurrency } from "./currency.js";
import { sanitizeHTML, showMessage } from "./utils.js";
import { getActiveAccountNames } from "./accounts.js";

// ---- Init ----

export async function initGoals() {
  await loadGoals();
}

// ---- Goal CRUD ----

export async function addGoal(formData) {
  const goal = {
    id: Date.now(),
    name: sanitizeHTML(formData.name.trim()),
    targetAmount: Math.abs(parseFloat(formData.targetAmount)),
    currentAmount: 0,
    deadline: formData.deadline || null,
    linkedAccount: formData.linkedAccount || null,
    createdAt: new Date().toISOString(),
  };

  if (!goal.name || isNaN(goal.targetAmount) || goal.targetAmount <= 0) {
    showMessage("Please enter a valid goal name and target amount.");
    return false;
  }

  await saveGoal(goal);
  state.savingsGoals.push(goal);
  return true;
}

export async function updateGoalAmount(id, amount) {
  const goal = state.savingsGoals.find((g) => g.id === id);
  if (!goal) return false;

  const prevPercent = getProgressPercent(goal);
  goal.currentAmount = Math.max(0, goal.currentAmount + amount);
  await saveGoal(goal);

  // Check for milestone crossing
  const newPercent = getProgressPercent(goal);
  checkMilestone(goal, prevPercent, newPercent);
  return true;
}

export async function editGoal(id, updates) {
  const goal = state.savingsGoals.find((g) => g.id === id);
  if (!goal) return false;

  if (updates.name !== undefined) goal.name = sanitizeHTML(updates.name.trim());
  if (updates.targetAmount !== undefined) goal.targetAmount = Math.abs(parseFloat(updates.targetAmount));
  if (updates.deadline !== undefined) goal.deadline = updates.deadline || null;
  if (updates.linkedAccount !== undefined) goal.linkedAccount = updates.linkedAccount || null;

  await saveGoal(goal);
  return true;
}

export async function removeGoal(id) {
  await deleteGoal(id);
  state.savingsGoals = state.savingsGoals.filter((g) => g.id !== id);
}

// ---- Progress Calculation ----

function getProgressPercent(goal) {
  if (!goal.targetAmount || goal.targetAmount <= 0) return 0;
  return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
}

function getMilestoneLevel(percent) {
  if (percent >= 100) return 100;
  if (percent >= 75) return 75;
  if (percent >= 50) return 50;
  if (percent >= 25) return 25;
  return 0;
}

function checkMilestone(goal, prevPercent, newPercent) {
  const prevLevel = getMilestoneLevel(prevPercent);
  const newLevel = getMilestoneLevel(newPercent);

  if (newLevel > prevLevel) {
    const messages = {
      25: `🎯 25% — Great start on "${goal.name}"!`,
      50: `🔥 Halfway there! "${goal.name}" is 50% funded.`,
      75: `🚀 75%! "${goal.name}" is almost done!`,
      100: `🎉 Goal reached! "${goal.name}" is fully funded!`,
    };
    showMessage(messages[newLevel] || `Milestone: ${newLevel}%`);
  }
}

function getDaysRemaining(deadline) {
  if (!deadline) return null;
  const now = new Date();
  const end = new Date(deadline + "T23:59:59");
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff;
}

// ---- Render ----

export function renderGoalsDashboard() {
  const container = document.getElementById("goalsDashboard");
  const section = document.getElementById("goalsSection");
  if (!container || !section) return;

  if (state.savingsGoals.length === 0) {
    section.hidden = true;
    return;
  }

  section.hidden = false;

  // Sort: incomplete first (by % asc), completed at bottom
  const sorted = [...state.savingsGoals].sort((a, b) => {
    const aDone = a.currentAmount >= a.targetAmount;
    const bDone = b.currentAmount >= b.targetAmount;
    if (aDone !== bDone) return aDone ? 1 : -1;
    return getProgressPercent(a) - getProgressPercent(b);
  });

  let html = '<div class="goals-list">';

  sorted.forEach((goal) => {
    const percent = getProgressPercent(goal);
    const isComplete = percent >= 100;
    const days = getDaysRemaining(goal.deadline);
    const circumference = 2 * Math.PI * 36; // r=36
    const offset = circumference - (percent / 100) * circumference;
    const colorClass = isComplete ? "complete" : percent >= 75 ? "high" : percent >= 50 ? "mid" : "low";

    let deadlineText = "";
    if (goal.deadline) {
      if (days !== null && days < 0) {
        deadlineText = `<span class="goal-overdue">Overdue</span>`;
      } else if (days !== null && days <= 30) {
        deadlineText = `<span class="goal-deadline-near">${days}d left</span>`;
      } else if (goal.deadline) {
        deadlineText = `<span class="goal-deadline">${new Date(goal.deadline + "T00:00:00").toLocaleDateString("en", { month: "short", year: "numeric" })}</span>`;
      }
    }

    html += `
      <div class="goal-card ${isComplete ? "goal-complete" : ""}" data-id="${goal.id}">
        <div class="goal-progress-ring">
          <svg viewBox="0 0 80 80">
            <circle class="goal-ring-bg" cx="40" cy="40" r="36" />
            <circle class="goal-ring-fill ${colorClass}" cx="40" cy="40" r="36"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}" />
          </svg>
          <span class="goal-ring-pct">${Math.round(percent)}%</span>
        </div>
        <div class="goal-info">
          <span class="goal-name">${goal.name}</span>
          <span class="goal-amounts">${formatCurrency(goal.currentAmount)} / ${formatCurrency(goal.targetAmount)}</span>
          ${deadlineText}
        </div>
        <div class="goal-actions">
          ${!isComplete ? `<button class="goal-contribute-btn" data-id="${goal.id}" title="Add contribution"><i class="ri-add-line"></i></button>` : ""}
          <button class="goal-edit-btn" data-id="${goal.id}" title="Edit"><i class="ri-pencil-line"></i></button>
          <button class="goal-delete-btn" data-id="${goal.id}" title="Delete"><i class="ri-delete-bin-line"></i></button>
        </div>
      </div>`;
  });

  html += "</div>";
  container.innerHTML = html;
}

// ---- Goal Form Modal ----

export function showGoalForm(goalId = null) {
  const modal = document.getElementById("goalFormModal");
  const title = document.getElementById("goalFormTitle");
  const nameInput = document.getElementById("goalNameInput");
  const targetInput = document.getElementById("goalTargetInput");
  const deadlineInput = document.getElementById("goalDeadlineInput");
  const linkedSelect = document.getElementById("goalLinkedAccount");
  const saveBtn = document.getElementById("goalFormSaveBtn");

  if (!modal) return;

  // Populate linked account options
  const accounts = getActiveAccountNames();
  linkedSelect.innerHTML = '<option value="">None</option>' +
    accounts.map((a) => `<option value="${a}">${a}</option>`).join("");

  if (goalId) {
    const goal = state.savingsGoals.find((g) => g.id === goalId);
    if (!goal) return;
    title.textContent = "Edit Goal";
    nameInput.value = goal.name;
    targetInput.value = goal.targetAmount;
    deadlineInput.value = goal.deadline || "";
    linkedSelect.value = goal.linkedAccount || "";
    saveBtn.dataset.editId = goalId;
  } else {
    title.textContent = "New Savings Goal";
    nameInput.value = "";
    targetInput.value = "";
    deadlineInput.value = "";
    linkedSelect.value = "";
    delete saveBtn.dataset.editId;
  }

  modal.classList.add("show");
  nameInput.focus();
}

export function closeGoalForm() {
  const modal = document.getElementById("goalFormModal");
  if (modal) modal.classList.remove("show");
}

export async function handleGoalFormSubmit() {
  const nameInput = document.getElementById("goalNameInput");
  const targetInput = document.getElementById("goalTargetInput");
  const deadlineInput = document.getElementById("goalDeadlineInput");
  const linkedSelect = document.getElementById("goalLinkedAccount");
  const saveBtn = document.getElementById("goalFormSaveBtn");

  const editId = saveBtn.dataset.editId ? Number(saveBtn.dataset.editId) : null;

  if (editId) {
    const success = await editGoal(editId, {
      name: nameInput.value,
      targetAmount: parseFloat(targetInput.value),
      deadline: deadlineInput.value,
      linkedAccount: linkedSelect.value,
    });
    if (success) {
      closeGoalForm();
      renderGoalsDashboard();
      showMessage("Goal updated.");
    }
  } else {
    const success = await addGoal({
      name: nameInput.value,
      targetAmount: targetInput.value,
      deadline: deadlineInput.value,
      linkedAccount: linkedSelect.value,
    });
    if (success) {
      closeGoalForm();
      renderGoalsDashboard();
      showMessage("Goal created!");
    }
  }
}

// ---- Contribution Modal ----

export function showContributionForm(goalId) {
  const goal = state.savingsGoals.find((g) => g.id === goalId);
  if (!goal) return;

  const modal = document.getElementById("contributionModal");
  const label = document.getElementById("contributionGoalName");
  const input = document.getElementById("contributionAmountInput");
  const remaining = document.getElementById("contributionRemaining");

  if (!modal) return;

  label.textContent = goal.name;
  const left = Math.max(0, goal.targetAmount - goal.currentAmount);
  remaining.textContent = `Remaining: ${formatCurrency(left)}`;
  input.value = "";
  input.max = left;
  modal.classList.add("show");
  modal.dataset.goalId = goalId;
  input.focus();
}

export function closeContributionForm() {
  const modal = document.getElementById("contributionModal");
  if (modal) modal.classList.remove("show");
}

export async function handleContributionSubmit() {
  const modal = document.getElementById("contributionModal");
  const input = document.getElementById("contributionAmountInput");
  const goalId = Number(modal.dataset.goalId);
  const amount = parseFloat(input.value);

  if (isNaN(amount) || amount <= 0) {
    showMessage("Enter a valid amount.");
    return;
  }

  const success = await updateGoalAmount(goalId, amount);
  if (success) {
    closeContributionForm();
    renderGoalsDashboard();
  }
}
