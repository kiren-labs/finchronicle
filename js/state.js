// ============================================================================
// Shared Application State & Constants
// ============================================================================

// App Version
export const APP_VERSION = "3.14.0";
export const VERSION_KEY = "app_version";

// IndexedDB Configuration
export const DB_NAME = "FinChronicleDB";
export const DB_VERSION = 4;
export const STORE_NAME = "transactions";
export const RECURRING_STORE = "recurringTemplates";
export const BUDGETS_STORE = "budgets";

// Pagination
export const ITEMS_PER_PAGE = 20;

// Mutable application state (single source of truth)
export const state = {
  db: null,
  transactions: [],
  currentTab: "add",
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
};

// Category definitions
export const categories = {
  income: [
    "Salary",
    "Business",
    "Investment",
    "Rental Income",
    "Gifts/Refunds",
    "Freelance",
    "Bonus",
    "Other Income",
  ],
  expense: [
    "Food",
    "Groceries",
    "Transport",
    "Utilities/Bills",
    "Kids/School",
    "Fees/Docs",
    "Debt/Loans",
    "Household",
    "Other Expense",
    "Rent",
    "Healthcare",
    "Personal/Shopping",
    "Insurance/Taxes",
    "Savings/Investments",
    "Charity/Gifts",
    "Misc/Buffer",
  ],
};

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
const DOM_CACHE_IDS = [
  "monthNet",
  "totalEntries",
  "monthIncome",
  "monthExpense",
  "monthNetTrend",
  "monthIncomeTrend",
  "monthExpenseMeta",
  "compactNet",
  "compactEntries",
  "compactIncome",
  "compactExpense",
  "transactionsList",
  "paginationControls",
  "pageInfo",
  "prevBtn",
  "nextBtn",
  "monthFilters",
  "categoryFilter",
  "groupedContent",
];

export function getDOM() {
  if (!_dom) {
    _dom = DOM_CACHE_IDS.reduce((acc, id) => {
      acc[id] = document.getElementById(id);
      return acc;
    }, {});
  }
  return _dom;
}
