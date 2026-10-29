import React from 'react';
import { X, Calendar, ArrowUpRight, ArrowDownRight, Layers, AlertTriangle, CheckCircle } from 'lucide-react';
import { TransactionItem, CategoryBudget, formatCurrency } from '../types/finance';

interface CategoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  type: 'income' | 'expense';
  transactions: TransactionItem[];
  currencySymbol: string;
  onNavigateToEntries: () => void;
  budgets?: CategoryBudget[];
  currentMonthKey?: string;
}

export const CategoryDetailModal: React.FC<CategoryDetailModalProps> = ({
  isOpen,
  onClose,
  category,
  type,
  transactions,
  currencySymbol,
  onNavigateToEntries,
  budgets = [],
  currentMonthKey,
}) => {
  if (!isOpen) return null;

  // Filter transactions for this specific category and type
  const matchingTransactions = transactions.filter(
    (t) => t.type === type && t.category.toLowerCase() === category.toLowerCase()
  );

  const totalAmount = matchingTransactions.reduce((sum, t) => sum + t.amount, 0);

  // If type is expense, lookup corresponding budget allocation
  const budgetItem =
    type === 'expense'
      ? budgets.find(
          (b) =>
            b.category.toLowerCase() === category.toLowerCase() &&
            (!currentMonthKey || !b.monthKey || b.monthKey === currentMonthKey)
        )
      : null;

  const allocatedBudget = budgetItem ? budgetItem.allocatedAmount : null;
  const budgetRemaining = allocatedBudget !== null ? allocatedBudget - totalAmount : null;
  const percentUsed =
    allocatedBudget && allocatedBudget > 0 ? (totalAmount / allocatedBudget) * 100 : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full border border-neutral-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#2d3134] text-white">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-1.5 rounded ${
                type === 'income' ? 'bg-emerald-600/30 text-emerald-400' : 'bg-red-600/30 text-red-400'
              }`}
            >
              {type === 'income' ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : (
                <ArrowDownRight className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-wide">{category}</h3>
                <span
                  className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded font-semibold ${
                    type === 'income'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}
                >
                  {type}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Drill-down breakdown of transactions making up this total
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Metric */}
        <div className="px-5 py-3 bg-neutral-100 border-b border-neutral-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-neutral-500 font-medium">Category Sum Total:</span>
              <div
                className={`text-lg font-bold font-mono ${
                  type === 'income' ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {formatCurrency(type === 'expense' ? -totalAmount : totalAmount, currencySymbol)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-neutral-500 block">Entries count</span>
              <span className="text-xs font-bold font-mono text-neutral-800">
                {matchingTransactions.length} transaction{matchingTransactions.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Budget Awareness Bar for Expense Categories */}
          {type === 'expense' && allocatedBudget !== null && (
            <div className="mt-3 pt-2.5 border-t border-neutral-200">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-medium text-neutral-700 flex items-center gap-1">
                  Budget Allocation:
                  <span className="font-mono font-semibold text-neutral-900">
                    {formatCurrency(allocatedBudget, currencySymbol)}
                  </span>
                </span>
                <span className={`font-mono font-bold flex items-center gap-1 ${
                  (budgetRemaining || 0) < 0 ? 'text-red-600' : 'text-emerald-700'
                }`}>
                  {(budgetRemaining || 0) < 0 ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" /> Over budget by {formatCurrency(Math.abs(budgetRemaining || 0), currencySymbol)}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" /> Margin: {formatCurrency(budgetRemaining || 0, currencySymbol)} left
                    </>
                  )}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-300 ${
                    (percentUsed || 0) > 100
                      ? 'bg-red-500'
                      : (percentUsed || 0) > 85
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(percentUsed || 0, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-neutral-500 mt-1 font-mono">
                <span>{percentUsed !== null ? `${percentUsed.toFixed(1)}% consumed` : ''}</span>
                <span>Max: {formatCurrency(allocatedBudget, currencySymbol)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Items List */}
        <div className="p-4 max-h-80 overflow-y-auto divide-y divide-neutral-200 text-xs">
          {matchingTransactions.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 italic">
              No individual transactions logged under {category} yet.
            </div>
          ) : (
            matchingTransactions.map((tx) => (
              <div
                key={tx.id}
                className="py-2.5 flex items-center justify-between hover:bg-neutral-50 px-2 rounded transition"
              >
                <div className="space-y-0.5 max-w-[70%]">
                  <div className="font-semibold text-neutral-900 truncate">
                    {tx.name || tx.description || `${category} item`}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-neutral-400" />
                      {tx.date}
                    </span>
                    {tx.description && tx.description !== tx.name && (
                      <span className="truncate italic">· {tx.description}</span>
                    )}
                  </div>
                </div>

                <div
                  className={`font-mono font-bold text-sm ${
                    type === 'income' ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {formatCurrency(type === 'expense' ? -tx.amount : tx.amount, currencySymbol)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onNavigateToEntries();
            }}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Manage in Income &amp; Expenses Page</span>
          </button>

          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white text-xs font-medium rounded transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
