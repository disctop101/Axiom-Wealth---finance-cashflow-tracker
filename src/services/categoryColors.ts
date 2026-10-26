/**
 * Unified Category Color Management Service
 * Provides customizable, persistent category color palettes
 * synced across all charts, distribution graphs, and category tags.
 */

export const STORAGE_KEY_CATEGORY_COLORS = 'finance_tracker_category_colors_v1';

export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  // Income Categories
  'Salary/Wages': '#10b981', // Emerald
  'Interest/Dividends': '#0284c7', // Sky
  'Investments': '#6366f1', // Indigo
  'Real Estate/Business Investments': '#0d9488', // Teal
  'Account Payables': '#f97316', // Orange
  'Account Receivables': '#8b5cf6', // Purple
  'Bank Transaction': '#06b6d4', // Cyan
  'Savings': '#14b8a6', // Teal bright

  // Expense Categories
  'Housing': '#3b82f6', // Blue
  'Utilities': '#06b6d4', // Cyan
  'Food': '#f59e0b', // Amber
  'Health Care': '#ec4899', // Pink
  'Personal Care': '#d946ef', // Fuchsia
  'Entertainment': '#a855f7', // Purple
  'Transportation': '#e11d48', // Rose
  'Miscellaneous': '#64748b', // Slate
  'Real Estate/Business Expenses': '#84cc16', // Lime

  // Asset Categories
  'Cash and cash equivalents': '#10b981', // Emerald
  'Liquid Cash': '#14b8a6', // Teal
  'Stocks': '#059669', // Emerald dark
  'Crypto': '#f59e0b', // Amber
  'Investment accounts': '#0284c7', // Sky
  'Retirement accounts': '#6366f1', // Indigo
  'Real estate': '#0d9488', // Teal
  'Vehicles': '#f97316', // Orange
  'Other assets': '#8b5cf6', // Purple

  // Liability Categories
  'Mortgage balance': '#ef4444', // Red
  'Car loan': '#f97316', // Orange
  'Credit card balances': '#f43f5e', // Rose
  'Personal loan': '#e11d48', // Red Rose
  'Student loan': '#eab308', // Yellow
  'Other debts': '#ec4899', // Pink
};

export const COLOR_PRESETS = [
  '#10b981', // Emerald
  '#0d9488', // Teal
  '#06b6d4', // Cyan
  '#0284c7', // Sky
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#a855f7', // Violet
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#22c55e', // Green
  '#64748b', // Slate
];

export function loadCategoryColors(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORY_COLORS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CATEGORY_COLORS, ...parsed };
    }
  } catch {
    // fallback
  }
  return { ...DEFAULT_CATEGORY_COLORS };
}

export function saveCategoryColors(colors: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY_CATEGORY_COLORS, JSON.stringify(colors));
  } catch (e) {
    console.error('Error saving category colors:', e);
  }
}

export function getCategoryColor(categoryName: string, customMap?: Record<string, string>): string {
  const map = customMap || loadCategoryColors();
  if (map[categoryName]) return map[categoryName];
  // Fallback to deterministic hash index
  const keys = Object.keys(DEFAULT_CATEGORY_COLORS);
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = (hash << 5) - hash + categoryName.charCodeAt(i);
    hash |= 0;
  }
  const colorIndex = Math.abs(hash) % COLOR_PRESETS.length;
  return COLOR_PRESETS[colorIndex];
}
