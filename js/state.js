// ============================================================================
// Shared Application State & Constants
// ============================================================================

// App Version
export const APP_VERSION = "4.5.0";
export const VERSION_KEY = "app_version";

// IndexedDB Configuration
export const DB_NAME = "FinChronicleDB";
export const DB_VERSION = 12;
export const STORE_NAME = "transactions";
export const RECURRING_STORE = "recurringTemplates";
export const BUDGETS_STORE = "budgets";
export const APP_SETTINGS_STORE = "appSettings";
export const QUICK_TEMPLATES_STORE = "quickTemplates";
export const ACCOUNTS_STORE = "accounts";
export const GOALS_STORE = "savingsGoals";
export const NET_WORTH_SNAPSHOTS_STORE = "netWorthSnapshots";
export const MAX_QUICK_TEMPLATES = 20;

// Account types
export const ACCOUNT_TYPES = [
  "checking",
  "savings",
  "credit-card",
  "cash",
  "investment",
  "loan",
  "mortgage",
  "other",
];

// Default classification per account type (v4.0.0)
export const ACCOUNT_CLASSIFICATION = {
  checking: "asset",
  savings: "asset",
  "credit-card": "liability",
  cash: "asset",
  investment: "asset",
  loan: "liability",
  mortgage: "liability",
  other: "asset",
};

// Pagination
export const ITEMS_PER_PAGE = 20;

// Mutable application state (single source of truth)
export const state = {
  db: null,
  transactions: [],
  currentTab: "home",
  currentGrouping: "month",
  selectedMonth: "all",
  selectedCategory: "all",
  selectedType: "all",
  insightsMonth: "current",
  editingId: null,
  deleteId: null,
  deleteBudgetId: null,
  updateAvailable: false,
  lastBackupTimestamp: null,
  pendingRestoreData: null,
  currentPage: 1,
  recurringTemplates: [],
  reportRange: "6m",
  budgets: [],
  searchQuery: "",
  searchTags: [],
  formTags: [],
  savedAccounts: ["Cash", "Savings", "Credit Card", "Bank Account"],
  appSettings: null,
  quickTemplates: [],
  accounts: [],
  savingsGoals: [],
  storagePersisted: null, // null = unknown, true = persisted, false = denied
  backupDue: false,
};

// Default optional fields configuration
export const DEFAULT_APP_SETTINGS = {
  id: "config",
  enabledFields: {
    tags: true,
    paymentMethod: false,
    merchant: false,
    expenseType: false,
    attachedTo: false,
    referenceId: false,
    location: false,
    transactionCurrency: false,
    accountLinking: false,
  },
  smartCategoryKeywords: {},
  lastUpdated: null,
};

// Payment method options
export const PAYMENT_METHODS = [
  "cash",
  "credit-card",
  "debit-card",
  "bank-transfer",
  "wallet",
  "other",
];

// Expense type options
export const EXPENSE_TYPES = ["personal", "business", "reimbursable"];

// Category definitions
// Category hierarchy: { type: { parent: [children] | [] } }
// Parents with empty array are leaf nodes with no sub-categories.
// Existing flat category names are preserved as parents for backwards compatibility.
export const categories = {
  income: {
    Salary: [],
    Business: ["Consulting", "Sales", "Services"],
    Investment: ["Dividends", "Capital Gains", "Interest"],
    "Rental Income": [],
    Freelance: [],
    Bonus: [],
    "Gifts/Refunds": ["Gift Received", "Refund", "Cashback"],
    "Other Income": [],
  },
  transfer: {
    Transfer: [],
  },
  expense: {
    Food: ["Groceries", "Restaurants", "Coffee/Tea", "Delivery"],
    Transport: ["Fuel", "Public Transit", "Taxi/Cab", "Vehicle Maintenance"],
    "Utilities/Bills": ["Electricity", "Water", "Internet", "Phone", "Gas"],
    Healthcare: ["Doctor", "Medicine", "Insurance", "Gym"],
    Housing: ["Rent", "Mortgage", "Maintenance", "Furnishings"],
    "Kids/School": ["Tuition", "Supplies", "Activities"],
    "Personal/Shopping": ["Clothing", "Electronics", "Beauty", "Subscriptions"],
    "Savings/Investments": [
      "Emergency Fund",
      "Retirement",
      "Stocks/Mutual Funds",
    ],
    "Debt/Loans": ["EMI", "Credit Card", "Personal Loan"],
    "Insurance/Taxes": ["Life Insurance", "Vehicle Insurance", "Income Tax"],
    "Charity/Gifts": ["Donation", "Gift Given"],
    "Fees/Docs": [],
    Household: [],
    "Misc/Buffer": [],
    "Other Expense": [],
  },
};

// ---- Category helpers ----

/**
 * Get all valid category names for a type (parents + children, flat).
 * Used for validation and backwards-compat category matching.
 */
export function getAllCategoryNames(type) {
  const tree = categories[type];
  if (!tree) return [];
  const names = [];
  for (const [parent, children] of Object.entries(tree)) {
    names.push(parent);
    for (const child of children) names.push(child);
  }
  return names;
}

/**
 * Given a category name, find its parent category (or itself if it is a parent).
 * Returns null if not found in the type's tree.
 */
export function getCategoryParent(name, type) {
  const tree = categories[type];
  if (!tree) return null;
  for (const [parent, children] of Object.entries(tree)) {
    if (parent === name) return parent;
    if (children.includes(name)) return parent;
  }
  return null;
}

// Currency definitions
export const currencies = {
  INR: { symbol: "₹", name: "Indian Rupee" },
  THB: { symbol: "฿", name: "Thai Baht" },
  AED: { symbol: "د.إ", name: "UAE Dirham" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
  BRL: { symbol: "R$", name: "Brazilian Real" },
  CAD: { symbol: "C$", name: "Canadian Dollar" },
  CHF: { symbol: "Fr", name: "Swiss Franc" },
  CNY: { symbol: "元", name: "Chinese Yuan" },
  EGP: { symbol: "£", name: "Egyptian Pound" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  HKD: { symbol: "HK$", name: "Hong Kong Dollar" },
  IDR: { symbol: "Rp", name: "Indonesian Rupiah" },
  JPY: { symbol: "¥", name: "Japanese Yen" },
  KRW: { symbol: "₩", name: "South Korean Won" },
  MXN: { symbol: "$", name: "Mexican Peso" },
  MYR: { symbol: "RM", name: "Malaysian Ringgit" },
  NZD: { symbol: "NZ$", name: "New Zealand Dollar" },
  PHP: { symbol: "₱", name: "Philippine Peso" },
  SAR: { symbol: "SR", name: "Saudi Riyal" },
  SGD: { symbol: "S$", name: "Singapore Dollar" },

  USD: { symbol: "$", name: "US Dollar" },
  VND: { symbol: "₫", name: "Vietnamese Dong" },
  ZAR: { symbol: "R", name: "South African Rand" },
};

// Cached DOM references (populated once on first use)
let _dom = null;
export function getDOM() {
  if (!_dom) {
    _dom = {
      monthNet: document.getElementById("monthNet"),
      totalEntries: document.getElementById("totalEntries"),
      monthIncome: document.getElementById("monthIncome"),
      monthExpense: document.getElementById("monthExpense"),
      monthNetTrend: document.getElementById("monthNetTrend"),
      monthIncomeTrend: document.getElementById("monthIncomeTrend"),
      monthExpenseMeta: document.getElementById("monthExpenseMeta"),
      compactNet: document.getElementById("compactNet"),
      compactEntries: document.getElementById("compactEntries"),
      compactIncome: document.getElementById("compactIncome"),
      compactExpense: document.getElementById("compactExpense"),
      transactionsList: document.getElementById("transactionsList"),
      paginationControls: document.getElementById("paginationControls"),
      pageInfo: document.getElementById("pageInfo"),
      prevBtn: document.getElementById("prevBtn"),
      nextBtn: document.getElementById("nextBtn"),
      monthFilters: document.getElementById("monthFilters"),
      categoryFilter: document.getElementById("categoryFilter"),
      groupedContent: document.getElementById("groupedContent"),
    };
  }
  return _dom;
}
