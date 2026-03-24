// ============================================================================
// Shared Application State & Constants
// ============================================================================

// App Version
export const APP_VERSION = "3.12.0";
export const VERSION_KEY = "app_version";

// IndexedDB Configuration
export const DB_NAME = "FinChronicleDB";
export const DB_VERSION = 2;
export const STORE_NAME = "transactions";
export const RECURRING_STORE = "recurringTemplates";

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
  updateAvailable: false,
  lastBackupTimestamp: null,
  pendingRestoreData: null,
  currentPage: 1,
  recurringTemplates: [],
  reportRange: "6m",
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
  USD: { symbol: "$", name: "US Dollar" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  JPY: { symbol: "¥", name: "Japanese Yen" },
  CNY: { symbol: "¥", name: "Chinese Yuan" },
  SGD: { symbol: "S$", name: "Singapore Dollar" },
  HKD: { symbol: "HK$", name: "Hong Kong Dollar" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
  NZD: { symbol: "NZ$", name: "New Zealand Dollar" },
  KRW: { symbol: "₩", name: "South Korean Won" },
  MYR: { symbol: "RM", name: "Malaysian Ringgit" },
  PHP: { symbol: "₱", name: "Philippine Peso" },
  IDR: { symbol: "Rp", name: "Indonesian Rupiah" },
  VND: { symbol: "₫", name: "Vietnamese Dong" },
  AED: { symbol: "د.إ", name: "UAE Dirham" },
  SAR: { symbol: "SR", name: "Saudi Riyal" },
  CHF: { symbol: "Fr", name: "Swiss Franc" },
  CAD: { symbol: "C$", name: "Canadian Dollar" },
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
