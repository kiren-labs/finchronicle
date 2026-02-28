// ============================================================================
// App Entry Point — Initialisation, Event Bindings, Service Worker
// ============================================================================

import { state } from './state.js';
import { showMessage } from './utils.js';
import { initDB, migrateFromLocalStorage, loadDataFromDB, saveTransactionToDB } from './db.js';
import { currencies, setCurrency, updateCurrencyDisplay, toggleCurrencySelector, closeCurrencySelector, getCurrency } from './currency.js';
import { validateTransaction } from './validation.js';
import {
    updateUI, switchTab, quickAddTransaction, toggleSummaryCollapse, loadSummaryState,
    onSummaryTileClick, changeGrouping, editTransaction, deleteTransaction,
    confirmDelete, closeDeleteModal, cancelEdit, selectType, updateCategoryOptions,
    filterByMonth, filterByCategory, nextPage, prevPage,
    openFeedbackModal, closeFeedbackModal
} from './ui.js';
import {
    exportToCSV, createBackup, triggerImport, handleImport,
    triggerRestore, handleRestore, confirmRestore,
    closeRestorePreview, closeRestoreReport
} from './import-export.js';
import { toggleFAQSection, toggleFAQItem, scrollToFAQ } from './faq.js';
import {
    toggleDarkMode, loadDarkMode, hideInstallPrompt, checkInstallPrompt,
    checkAppVersion, checkForUpdates, reloadApp, dismissUpdate,
    loadBackupTimestamp, showUpdatePrompt, updateSettingsContent
} from './settings.js';

// ============================================================================
// Event Bindings (replaces all inline onclick/onchange/onkeydown in HTML)
// ============================================================================

function bindStaticEvents() {
    // ---- Header buttons ----
    document.querySelector('.header-btn[aria-label="Send Feedback"]')
        .addEventListener('click', openFeedbackModal);
    document.querySelector('.header-btn[aria-label="Quick Add Transaction"]')
        .addEventListener('click', quickAddTransaction);

    // ---- Update prompt ----
    document.querySelector('.update-btn-primary')
        .addEventListener('click', reloadApp);
    document.querySelector('.update-btn-secondary')
        .addEventListener('click', dismissUpdate);

    // ---- Install prompt ----
    document.querySelector('#installPrompt button')
        .addEventListener('click', hideInstallPrompt);

    // ---- Summary section header (collapse) ----
    document.querySelector('.summary-header')
        .addEventListener('click', toggleSummaryCollapse);
    document.querySelector('.collapse-btn')
        .addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSummaryCollapse();
        });

    // ---- Summary tile clicks ----
    document.querySelectorAll('.summary-card').forEach(card => {
        const label = card.getAttribute('aria-label') || '';
        let tileType = null;
        if (label.includes('View transactions for this month')) tileType = 'this-month';
        else if (label.includes('View all transactions')) tileType = 'total-entries';
        else if (label.includes('View income')) tileType = 'income';
        else if (label.includes('View expense')) tileType = 'expenses';

        if (tileType) {
            card.addEventListener('click', () => onSummaryTileClick(tileType));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSummaryTileClick(tileType);
                }
            });
        }
    });

    // ---- Currency modal close ----
    document.querySelector('#currencyModal .close-btn')
        .addEventListener('click', closeCurrencySelector);

    // ---- Tab navigation (top tabs + bottom nav) ----
    ['add', 'list', 'groups', 'settings'].forEach(tab => {
        const topTab = document.getElementById(`${tab}-tab`);
        if (topTab) topTab.addEventListener('click', () => switchTab(tab));

        const botNav = document.getElementById(`${tab}-nav`);
        if (botNav) botNav.addEventListener('click', () => switchTab(tab));
    });

    // ---- Add Transaction form: type toggle ----
    document.querySelectorAll('.type-option').forEach(btn => {
        btn.addEventListener('click', () => selectType(btn.dataset.type));
    });

    // ---- Cancel Edit button ----
    document.getElementById('cancelEditBtn')
        .addEventListener('click', cancelEdit);

    // ---- Category filter (onchange) ----
    document.getElementById('categoryFilter')
        .addEventListener('change', filterByCategory);

    // ---- Pagination ----
    document.getElementById('prevBtn')
        .addEventListener('click', prevPage);
    document.getElementById('nextBtn')
        .addEventListener('click', nextPage);

    // ---- Groups tab: grouping toggle (By Month / By Category) ----
    document.querySelectorAll('#groupsTab > .filters > .filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = btn.textContent.trim().toLowerCase().includes('month') ? 'month' : 'category';
            changeGrouping(type, e);
        });
    });

    // ---- Settings toolbar buttons ----
    bindSettingsButtons();

    // ---- Delete modal buttons ----
    document.querySelector('#deleteModal .modal-btn-cancel')
        .addEventListener('click', closeDeleteModal);
    document.querySelector('#deleteModal .modal-btn-confirm')
        .addEventListener('click', confirmDelete);

    // ---- Restore Preview modal buttons ----
    document.querySelectorAll('#restorePreviewModal .modal-btn-cancel')
        .forEach(btn => btn.addEventListener('click', closeRestorePreview));
    document.querySelector('#restorePreviewModal .modal-btn-confirm')
        .addEventListener('click', confirmRestore);

    // ---- Restore Report modal ----
    document.querySelector('#restoreReportModal .modal-btn-confirm')
        .addEventListener('click', closeRestoreReport);
    document.querySelector('#restoreReportModal .close-btn')
        .addEventListener('click', closeRestoreReport);

    // ---- Feedback modal close ----
    document.querySelector('#feedbackModal .close-btn')
        .addEventListener('click', closeFeedbackModal);

    // ---- Restore Preview modal close (X button) ----
    document.querySelector('#restorePreviewModal .close-btn')
        .addEventListener('click', closeRestorePreview);

    // ---- Hidden file inputs ----
    document.getElementById('importFile')
        .addEventListener('change', handleImport);
    document.getElementById('restoreFile')
        .addEventListener('change', handleRestore);
}

function bindSettingsButtons() {
    const actions = {
        'Export CSV': exportToCSV,
        'Import CSV': triggerImport,
        'Create Backup': createBackup,
        'Restore from Backup': triggerRestore,
        'Check for updates': checkForUpdates,
        'Change currency': toggleCurrencySelector,
        'Toggle dark mode': toggleDarkMode,
        'Send Feedback': () => openFeedbackModal(),
    };

    document.querySelectorAll('#settingsTab .toolbar-btn').forEach(btn => {
        const label = btn.getAttribute('aria-label');
        if (actions[label]) {
            btn.addEventListener('click', actions[label]);
        }
    });
}

// ============================================================================
// Event Delegation for Dynamic Content
// ============================================================================

function bindDelegatedEvents() {
    // Transaction list: edit / delete buttons
    document.getElementById('transactionsList').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = Number(btn.dataset.id);
        if (btn.dataset.action === 'edit') editTransaction(id);
        if (btn.dataset.action === 'delete') deleteTransaction(id);
    });

    // Month filter buttons
    document.getElementById('monthFilters').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-month]');
        if (btn) filterByMonth(btn.dataset.month);
    });

    // Currency list items
    document.getElementById('currencyList').addEventListener('click', (e) => {
        const item = e.target.closest('[data-code]');
        if (!item) return;
        const code = item.dataset.code;
        setCurrency(code);
        updateCurrencyDisplay();
        updateUI();
        closeCurrencySelector();
        showMessage(`Currency changed to ${currencies[code].name}`);
    });

    // FAQ sections & items (delegated from faqContainer)
    document.getElementById('faqContainer').addEventListener('click', (e) => {
        const sectionHeader = e.target.closest('[data-faq-section]');
        if (sectionHeader) {
            toggleFAQSection(Number(sectionHeader.dataset.faqSection));
            return;
        }
        const questionBtn = e.target.closest('[data-faq-item]');
        if (questionBtn) {
            const [section, item] = questionBtn.dataset.faqItem.split('-').map(Number);
            toggleFAQItem(section, item);
        }
    });

    // Backup status container: export & scrollToFAQ actions
    document.getElementById('backupStatusContainer').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        if (btn.dataset.action === 'exportBackup') exportToCSV();
        if (btn.dataset.action === 'scrollToFAQ') scrollToFAQ();
    });
}

// ============================================================================
// Form Submission Handler
// ============================================================================

function bindFormSubmit() {
    document.getElementById('transactionForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        const formCard = document.querySelector('#addTab .card');
        const originalBtnText = submitBtn.textContent;

        const amountInput = document.getElementById('amount').value.trim();
        const amount = parseFloat(amountInput);

        if (!amountInput) {
            showMessage('⚠️ Please enter an amount');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            return;
        }

        if (!isNaN(amount) && !Number.isInteger(amount * 100)) {
            showMessage('⚠️ Amount can have at most 2 decimal places');
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            return;
        }

        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span> Saving...';

        const transaction = {
            id: state.editingId || Date.now(),
            type: document.getElementById('type').value,
            amount: amount,
            category: document.getElementById('category').value,
            date: document.getElementById('date').value,
            notes: document.getElementById('notes').value,
            createdAt: state.editingId ?
                state.transactions.find(t => t.id === state.editingId)?.createdAt :
                new Date().toISOString()
        };

        const validation = validateTransaction(transaction);

        if (!validation.valid) {
            const errorMessage = validation.errors.map(err => err.message).join(', ');
            showMessage(`⚠️ ${errorMessage}`);
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
        }

        const sanitizedTransaction = validation.sanitized;

        try {
            await saveTransactionToDB(sanitizedTransaction);

            submitBtn.classList.remove('loading');
            submitBtn.classList.add('success');
            submitBtn.innerHTML = '<i class="ri-check-line btn-icon"></i> Saved!';

            if ('vibrate' in navigator) {
                navigator.vibrate(50);
            }

            formCard.classList.add('success-pulse');

            if (state.editingId) {
                const index = state.transactions.findIndex(t => t.id === state.editingId);
                if (index !== -1) {
                    state.transactions[index] = sanitizedTransaction;
                }
                showMessage('Transaction updated!');
            } else {
                state.transactions.unshift(sanitizedTransaction);
                showMessage('Transaction saved!');
            }

            setTimeout(() => {
                document.getElementById('transactionForm').reset();
                document.getElementById('date').valueAsDate = new Date();
                state.editingId = null;
                document.getElementById('formTitle').textContent = 'Add Transaction';
                document.getElementById('cancelEditBtn').style.display = 'none';

                submitBtn.classList.remove('success');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Transaction';

                formCard.classList.remove('success-pulse');

                updateUI();
            }, 800);

        } catch (err) {
            console.error('Save failed:', err);
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            submitBtn.textContent = originalBtnText;
            showMessage('Failed to save transaction');
        }
    });
}

// ============================================================================
// Service Worker Registration
// ============================================================================

function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') {
        if (window.location.protocol === 'file:') {
            console.log('ℹ️ Service Worker requires HTTP/HTTPS. Run a local server to enable offline mode.');
            console.log('Quick start: python3 -m http.server 8000');
        }
        return;
    }

    let refreshing = false;

    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data.type === 'SW_UPDATED') {
            console.log('✅ Service Worker updated:', event.data.version);
            if (!refreshing) {
                showUpdatePrompt();
            }
        }
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        console.log('🔄 New service worker taking control - reloading page...');
        refreshing = true;
        window.location.reload();
    });

    navigator.serviceWorker.register('./sw.js')
        .then(registration => {
            console.log('✅ Service Worker registered - App works offline!');
            registration.update();

            setInterval(() => {
                registration.update();
            }, 60000);

            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🆕 New service worker found - installing...');

                newWorker.addEventListener('statechange', () => {
                    console.log('Service Worker state:', newWorker.state);
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('🎉 New version ready to activate!');
                        showUpdatePrompt();
                    }
                });
            });
        })
        .catch(err => console.error('❌ Service Worker registration failed:', err));
}

// ============================================================================
// App Initialisation
// ============================================================================

async function init() {
    try {
        await initDB();
        await migrateFromLocalStorage();
        await loadDataFromDB();

        // Set up UI defaults
        document.getElementById('date').valueAsDate = new Date();
        updateCategoryOptions('expense');

        // Bind all events before first render
        bindStaticEvents();
        bindDelegatedEvents();
        bindFormSubmit();

        // First render
        updateUI();

        // Post-render setup
        checkAppVersion();
        loadDarkMode();
        loadSummaryState();
        updateCurrencyDisplay();
        loadBackupTimestamp();
        checkInstallPrompt();

        // Service Worker (non-blocking)
        registerServiceWorker();
    } catch (err) {
        console.error('App initialization failed:', err);
        showMessage('Failed to load data');
    }
}

// Since type="module" defers execution, DOM is ready
init();
