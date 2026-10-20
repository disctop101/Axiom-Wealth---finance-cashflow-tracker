import React, { useState } from 'react';
import { formatCurrency } from '../types/finance';
import { getCategoryColor } from '../services/categoryColors';

export type VisualizerMode = 'income' | 'expenses' | 'assets' | 'liabilities';

interface VisualizerItem {
  category: string;
  amount: number;
  type: 'income' | 'expense' | 'asset' | 'liability';
}

interface PeriodExpenseChartProps {
  expenses: { category: string; amount: number }[];
  incomes?: { category: string; amount: number }[];
  assets?: { category: string; value: number }[];
  liabilities?: { category: string; amount: number }[];
  currencySymbol?: string;
  onSelectCategory?: (category: string, type: 'income' | 'expense' | 'asset' | 'liability') => void;
}

export const PeriodExpenseChart: React.FC<PeriodExpenseChartProps> = ({
  expenses,
  incomes = [],
  assets = [],
  liabilities = [],
  currencySymbol = '₱',
  onSelectCategory,
}) => {
  // Four individual toggles: 'income' | 'expenses' | 'assets' | 'liabilities' (Default: 'expenses')
  const [activeView, setActiveView] = useState<VisualizerMode>('expenses');

  // Ordered Category lists
  const orderedIncomeCategories = [
    'Salary/Wages',
    'Interest/Dividends',
    'Investments',
    'Real Estate/Business Investments',
    'Account Payables',
    'Account Receivables',
    'Bank Transaction',
    'Savings',
  ];

  const orderedExpenseCategories = [
    'Housing',
    'Investments',
    'Utilities',
    'Food',
    'Health Care',
    'Personal Care',
    'Entertainment',
    'Transportation',
    'Account Payables',
    'Account Receivables',
    'Bank Transaction',
    'Miscellaneous',
    'Real Estate/Business Investments',
    'Real Estate/Business Expenses',
    'Savings',
  ];

  // Map income amounts
  const incomeAmountMap: Record<string, number> = {};
  incomes.forEach((item) => {
    incomeAmountMap[item.category] = (incomeAmountMap[item.category] || 0) + item.amount;
  });

  // Map expense amounts
  const expenseAmountMap: Record<string, number> = {};
  expenses.forEach((item) => {
    expenseAmountMap[item.category] = (expenseAmountMap[item.category] || 0) + item.amount;
  });

  // Assets data
  const assetItems: VisualizerItem[] = assets.map((a) => ({
    category: a.category,
    amount: a.value,
    type: 'asset',
  }));

  // Liabilities data
  const liabilityItems: VisualizerItem[] = liabilities.map((l) => ({
    category: l.category,
    amount: l.amount,
    type: 'liability',
  }));

  // Scales & Ticks
  const maxIncomeVal = Math.max(50000, ...incomes.map((i) => i.amount), 1);
  const maxExpenseVal = Math.max(50000, ...expenses.map((e) => e.amount), 1);
  const maxAssetVal = Math.max(100000, ...assets.map((a) => a.value), 1);
  const maxLiabilityVal = Math.max(50000, ...liabilities.map((l) => l.amount), 1);

  // Exact sums of active items
  const totalIncome = Object.values(incomeAmountMap).reduce((sum, v) => sum + v, 0);
  const totalExpenses = Object.values(expenseAmountMap).reduce((sum, v) => sum + v, 0);
  const totalAssets = assetItems.reduce((sum, a) => sum + a.amount, 0);
  const totalLiabilities = liabilityItems.reduce((sum, l) => sum + l.amount, 0);

  const getTitle = () => {
    switch (activeView) {
      case 'income':
        return 'Period Income Visualizer';
      case 'expenses':
        return 'Period Expenses Visualizer';
      case 'assets':
        return 'Balance Sheet Assets Visualizer';
      case 'liabilities':
        return 'Balance Sheet Liabilities Visualizer';
    }
  };

  return (
    <div id="period-expense-visualizer-container" className="bg-white dark:bg-[#1a1e20] border border-neutral-300 dark:border-neutral-700/80 p-3 my-2 text-xs select-none rounded-lg shadow-xs transition-colors">
      {/* Header with 4 Individual Toggle Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-2 border-b border-neutral-200 dark:border-neutral-700/80 gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-neutral-800 dark:text-neutral-100 tracking-tight text-xs uppercase">
            {getTitle()}
          </span>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
            ({currencySymbol})
          </span>
        </div>

        {/* 4 Distinct, Individual Visualiser Control Buttons */}
        <div className="flex flex-wrap rounded bg-neutral-100 dark:bg-neutral-800/80 p-0.5 border border-neutral-300 dark:border-neutral-700 gap-0.5 text-[11px] print:hidden">
          {/* 1. Income Button */}
          <button
            type="button"
            onClick={() => setActiveView('income')}
            className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer ${
              activeView === 'income'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60'
            }`}
            title="Filter Visualiser to show only Income categories"
          >
            Income
          </button>

          {/* 2. Expenses Button (Active Default) */}
          <button
            type="button"
            onClick={() => setActiveView('expenses')}
            className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer ${
              activeView === 'expenses'
                ? 'bg-neutral-800 dark:bg-neutral-700 text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60'
            }`}
            title="Filter Visualiser to show only Expenses categories"
          >
            Expenses
          </button>

          {/* 3. Assets Button */}
          <button
            type="button"
            onClick={() => setActiveView('assets')}
            className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer ${
              activeView === 'assets'
                ? 'bg-sky-700 text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60'
            }`}
            title="Filter Visualiser to show only Assets categories"
          >
            Assets
          </button>

          {/* 4. Liabilities Button */}
          <button
            type="button"
            onClick={() => setActiveView('liabilities')}
            className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer ${
              activeView === 'liabilities'
                ? 'bg-red-700 text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60'
            }`}
            title="Filter Visualiser to show only Liabilities categories"
          >
            Liabilities
          </button>
        </div>
      </div>

      {/* ================= 1. INCOME VIEW ================= */}
      {activeView === 'income' && (
        <div className="relative pt-1 pb-2">
          <div className="space-y-1">
            {orderedIncomeCategories.map((cat) => {
              const amount = incomeAmountMap[cat] || 0;
              const widthPct = Math.min(100, Math.max(0, (amount / maxIncomeVal) * 100));

              return (
                <div
                  key={cat}
                  onClick={() => onSelectCategory && onSelectCategory(cat, 'income')}
                  className="flex items-center text-[10px] group hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 py-0.5 cursor-pointer rounded-xs px-1 transition"
                  title={`Click to view transaction details for ${cat}`}
                >
                  <div
                    className="w-40 pr-2 truncate text-neutral-700 dark:text-neutral-300 text-right group-hover:text-emerald-700 dark:group-hover:text-emerald-400 font-medium"
                    title={cat}
                  >
                    {cat}
                  </div>

                  <div className="flex-1 h-3.5 bg-neutral-100 dark:bg-neutral-800 relative rounded-none border border-neutral-300 dark:border-neutral-700 flex overflow-hidden">
                    {amount > 0 && (
                      <div
                        className="h-full transition-all duration-300 group-hover:opacity-80"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: getCategoryColor(cat),
                        }}
                      />
                    )}
                  </div>

                  <div className="w-20 pl-1.5 text-right font-mono font-bold text-neutral-700 dark:text-neutral-300 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                    {amount > 0 ? formatCurrency(amount, currencySymbol) : '-'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Row */}
          <div className="flex items-center text-[10px] pt-1.5 border-t border-neutral-300 dark:border-neutral-700 mt-2 px-1 bg-emerald-50/50 dark:bg-emerald-950/25 rounded-xs">
            <div className="w-40 pr-2 truncate text-neutral-800 dark:text-neutral-200 text-right font-bold uppercase tracking-wider text-[10px]">
              Total Income
            </div>
            <div className="flex-1 h-3.5 flex items-center">
              <div className="w-full h-px bg-emerald-200 dark:bg-emerald-800" />
            </div>
            <div className="w-20 pl-1.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(totalIncome, currencySymbol)}
            </div>
          </div>
        </div>
      )}

      {/* ================= 2. EXPENSES VIEW (ACTIVE DEFAULT) ================= */}
      {activeView === 'expenses' && (
        <div className="relative pt-1 pb-2">
          <div className="space-y-1">
            {orderedExpenseCategories.map((cat) => {
              const amount = expenseAmountMap[cat] || 0;
              const widthPct = Math.min(100, Math.max(0, (amount / maxExpenseVal) * 100));

              return (
                <div
                  key={cat}
                  onClick={() => onSelectCategory && onSelectCategory(cat, 'expense')}
                  className="flex items-center text-[10px] group hover:bg-red-50/60 dark:hover:bg-red-950/30 py-0.5 cursor-pointer rounded-xs px-1 transition"
                  title={`Click to view transaction details for ${cat}`}
                >
                  <div
                    className="w-40 pr-2 truncate text-neutral-700 dark:text-neutral-300 text-right group-hover:text-red-700 dark:group-hover:text-red-400 font-medium"
                    title={cat}
                  >
                    {cat}
                  </div>

                  <div className="flex-1 h-3.5 bg-neutral-100 dark:bg-neutral-800 relative rounded-none border-l border-r border-neutral-300 dark:border-neutral-700 flex justify-end overflow-hidden">
                    {amount > 0 && (
                      <div
                        className="h-full transition-all duration-300 group-hover:opacity-80"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: getCategoryColor(cat),
                        }}
                      />
                    )}
                  </div>

                  <div className="w-20 pl-1.5 text-right font-mono text-neutral-600 dark:text-neutral-400 group-hover:font-bold group-hover:text-red-700 dark:group-hover:text-red-400">
                    {amount > 0 ? formatCurrency(-amount, currencySymbol) : '-'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Row */}
          <div className="flex items-center text-[10px] pt-1.5 border-t border-neutral-300 dark:border-neutral-700 mt-2 px-1 bg-neutral-100/80 dark:bg-neutral-800/50 rounded-xs">
            <div className="w-40 pr-2 truncate text-neutral-800 dark:text-neutral-200 text-right font-bold uppercase tracking-wider text-[10px]">
              Total Expenses
            </div>
            <div className="flex-1 h-3.5 flex items-center">
              <div className="w-full h-px bg-neutral-300 dark:bg-neutral-700" />
            </div>
            <div className="w-20 pl-1.5 text-right font-mono font-bold text-red-700 dark:text-red-400">
              {formatCurrency(-totalExpenses, currencySymbol)}
            </div>
          </div>
        </div>
      )}

      {/* ================= 3. ASSETS VIEW ================= */}
      {activeView === 'assets' && (
        <div className="relative pt-1 pb-2">
          <div className="space-y-1">
            {assetItems.map((item) => {
              const widthPct = Math.min(100, Math.max(0, (item.amount / maxAssetVal) * 100));
              const color = getCategoryColor(item.category);

              return (
                <div
                  key={item.category}
                  onClick={() => onSelectCategory && onSelectCategory(item.category, 'asset')}
                  className="flex items-center text-[10px] group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 py-0.5 cursor-pointer rounded-xs px-1 transition"
                  title={`Asset: ${item.category} · Click to inspect`}
                >
                  <div className="w-40 pr-2 truncate text-neutral-700 dark:text-neutral-300 text-right font-medium flex items-center justify-end gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate">{item.category}</span>
                  </div>

                  <div className="flex-1 h-3.5 bg-neutral-100 dark:bg-neutral-800 relative rounded-none border border-neutral-300 dark:border-neutral-700 flex overflow-hidden">
                    {item.amount > 0 && (
                      <div
                        className="h-full transition-all duration-300 group-hover:opacity-80"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: color,
                        }}
                      />
                    )}
                  </div>

                  <div className="w-20 pl-1.5 text-right font-mono font-bold text-neutral-800 dark:text-neutral-200">
                    {item.amount > 0 ? formatCurrency(item.amount, currencySymbol) : '-'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Row */}
          <div className="flex items-center text-[10px] pt-1.5 border-t border-neutral-300 dark:border-neutral-700 mt-2 px-1 bg-neutral-50 dark:bg-neutral-800/40 rounded-xs">
            <div className="w-40 pr-2 truncate text-neutral-900 dark:text-neutral-100 text-right font-bold uppercase tracking-wider text-[10px]">
              Total Assets
            </div>
            <div className="flex-1 h-3.5 flex items-center">
              <div className="w-full h-px bg-neutral-300 dark:bg-neutral-700" />
            </div>
            <div className="w-20 pl-1.5 text-right font-mono font-bold text-neutral-900 dark:text-neutral-100">
              {formatCurrency(totalAssets, currencySymbol)}
            </div>
          </div>
        </div>
      )}

      {/* ================= 4. LIABILITIES VIEW ================= */}
      {activeView === 'liabilities' && (
        <div className="relative pt-1 pb-2">
          <div className="space-y-1">
            {liabilityItems.map((item) => {
              const widthPct = Math.min(100, Math.max(0, (item.amount / maxLiabilityVal) * 100));
              const color = getCategoryColor(item.category);

              return (
                <div
                  key={item.category}
                  onClick={() => onSelectCategory && onSelectCategory(item.category, 'liability')}
                  className="flex items-center text-[10px] group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 py-0.5 cursor-pointer rounded-xs px-1 transition"
                  title={`Liability: ${item.category} · Click to inspect`}
                >
                  <div className="w-40 pr-2 truncate text-neutral-700 dark:text-neutral-300 text-right font-medium flex items-center justify-end gap-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate">{item.category}</span>
                  </div>

                  <div className="flex-1 h-3.5 bg-neutral-100 dark:bg-neutral-800 relative rounded-none border border-neutral-300 dark:border-neutral-700 flex overflow-hidden">
                    {item.amount > 0 && (
                      <div
                        className="h-full transition-all duration-300 group-hover:opacity-80"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: color,
                        }}
                      />
                    )}
                  </div>

                  <div className="w-20 pl-1.5 text-right font-mono font-bold text-neutral-800 dark:text-neutral-200">
                    {item.amount > 0 ? formatCurrency(item.amount, currencySymbol) : '-'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Row */}
          <div className="flex items-center text-[10px] pt-1.5 border-t border-neutral-300 dark:border-neutral-700 mt-2 px-1 bg-red-50/50 dark:bg-red-950/25 rounded-xs">
            <div className="w-40 pr-2 truncate text-red-950 dark:text-red-300 text-right font-bold uppercase tracking-wider text-[10px]">
              Total Liabilities
            </div>
            <div className="flex-1 h-3.5 flex items-center">
              <div className="w-full h-px bg-red-200 dark:bg-red-800" />
            </div>
            <div className="w-20 pl-1.5 text-right font-mono font-bold text-red-700 dark:text-red-400">
              {formatCurrency(totalLiabilities, currencySymbol)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
