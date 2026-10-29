import React, { useState } from 'react';
import {
  X,
  Save,
  Trash2,
  Calendar,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import {
  TransactionItem,
  TransactionType,
  PaymentMethodType,
  IncomeClassification,
  ExpenseClassification,
  CategoryBudget,
  formatCurrency,
} from '../types/finance';

const INCOME_CATEGORIES: { name: string; sub: IncomeClassification }[] = [
  { name: 'Salary/Wages', sub: 'earned' },
  { name: 'Interest/Dividends', sub: 'passive' },
  { name: 'Investments', sub: 'passive' },
  { name: 'Real Estate/Business Investments', sub: 'passive' },
  { name: 'Account Payables', sub: 'other' },
  { name: 'Account Receivables', sub: 'other' },
  { name: 'Bank Transaction', sub: 'other' },
  { name: 'Savings', sub: 'other' },
];

const EXPENSE_CATEGORIES: { name: string; sub: ExpenseClassification }[] = [
  { name: 'Housing', sub: 'fixed' },
  { name: 'Investments', sub: 'fixed' },
  { name: 'Utilities', sub: 'fixed' },
  { name: 'Food', sub: 'fixed' },
  { name: 'Health Care', sub: 'fixed' },
  { name: 'Personal Care', sub: 'fixed' },
  { name: 'Entertainment', sub: 'variable' },
  { name: 'Transportation', sub: 'variable' },
  { name: 'Account Payables', sub: 'variable' },
  { name: 'Account Receivables', sub: 'variable' },
  { name: 'Bank Transaction', sub: 'variable' },
  { name: 'Miscellaneous', sub: 'variable' },
  { name: 'Real Estate/Business Investments', sub: 'variable' },
  { name: 'Real Estate/Business Expenses', sub: 'variable' },
  { name: 'Savings', sub: 'variable' },
];

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionItem | null;
  currencySymbol: string;
  budgets?: CategoryBudget[];
  onSave: (updated: TransactionItem) => void;
  onDelete?: (id: string) => void;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  onClose,
  transaction,
  currencySymbol,
  budgets = [],
  onSave,
  onDelete,
}) => {
  if (!isOpen || !transaction) return null;

  const [type, setType] = useState<TransactionType>(transaction.type || 'expense');
  const [category, setCategory] = useState<string>(transaction.category || 'Food');
  const [name, setName] = useState<string>(transaction.name || '');
  const [amount, setAmount] = useState<string>(transaction.amount?.toString() || '');
  const [date, setDate] = useState<string>(
    transaction.date || new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>(
    transaction.paymentMethod || 'Cash'
  );
  const [description, setDescription] = useState<string>(transaction.description || '');
  const [isRecordOnly, setIsRecordOnly] = useState<boolean>(!!transaction.isRecordOnly);

  const activeCategories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Budget context
  const selectedBudget =
    type === 'expense'
      ? budgets.find((b) => b.category.toLowerCase() === category.toLowerCase())
      : null;

  const budgetAllocated = selectedBudget?.allocatedAmount || 0;
  const budgetSpent = selectedBudget?.spentAmount || 0;
  // Exclude current transaction's previous amount from spent comparison if it was already an expense
  const baselineSpent =
    transaction.type === 'expense' && transaction.category.toLowerCase() === category.toLowerCase()
      ? Math.max(0, budgetSpent - transaction.amount)
      : budgetSpent;
  const projectedSpent = baselineSpent + (parseFloat(amount) || 0);
  const isOverBudget = budgetAllocated > 0 && projectedSpent > budgetAllocated;
  const remainingBudget = Math.max(0, budgetAllocated - baselineSpent);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    if (!name.trim()) return;

    const matchedCat = activeCategories.find((c) => c.name === category);
    const subCategory = matchedCat?.sub || (type === 'income' ? 'earned' : 'variable');

    const updatedTx: TransactionItem = {
      ...transaction,
      name: name.trim(),
      type,
      category,
      subCategory,
      amount: numAmount,
      date,
      paymentMethod,
      description: description.trim() || undefined,
      isRecordOnly,
      updatedAt: new Date().toISOString(),
    };

    onSave(updatedTx);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white text-neutral-900 w-full max-w-md rounded-xl shadow-2xl border border-neutral-300 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#212529] text-white flex items-center justify-between border-b border-neutral-700">
          <div>
            <h2 className="font-bold text-sm text-white">Edit Transaction</h2>
            <p className="text-[10px] text-neutral-400 font-mono">
              Ref: {transaction.entryNo || transaction.id.slice(0, 8)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {/* Type Toggle */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Transaction Type *</label>
            <div className="grid grid-cols-2 gap-1 rounded bg-neutral-100 p-1 border border-neutral-200">
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setCategory('Salary/Wages');
                }}
                className={`py-1.5 rounded font-bold text-xs transition cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setCategory('Food');
                }}
                className={`py-1.5 rounded font-bold text-xs transition cursor-pointer ${
                  type === 'expense'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Expense
              </button>
            </div>
          </div>

          {/* Category Dropdown & Budget Alert */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-neutral-700">Category *</label>
              {type === 'expense' && budgetAllocated > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                    isOverBudget
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {isOverBudget ? (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Over Budget!
                    </span>
                  ) : (
                    `Margin: ${formatCurrency(remainingBudget, currencySymbol)} left`
                  )}
                </span>
              )}
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-2.5 py-2 border border-neutral-300 rounded focus:outline-hidden bg-white cursor-pointer font-medium text-xs"
            >
              {activeCategories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.sub})
                </option>
              ))}
            </select>
          </div>

          {/* Title/Name */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Title / Vendor *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 py-2 border border-neutral-300 rounded focus:outline-hidden focus:border-neutral-800 text-xs"
            />
          </div>

          {/* Amount & Date side-by-side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Amount ({currencySymbol}) *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-2.5 py-2 border border-neutral-300 rounded focus:outline-hidden focus:border-neutral-800 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                <span>Date *</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-2.5 py-2 border border-neutral-300 rounded focus:outline-hidden focus:border-neutral-800 text-xs font-mono"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
              <span>{type === 'income' ? 'Deposit To *' : 'Payment Method *'}</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
              className="w-full px-2.5 py-2 border border-neutral-300 rounded focus:outline-hidden bg-white cursor-pointer font-medium text-xs"
            >
              <option value="Cash">Cash on Hand</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer / Online</option>
            </select>
          </div>

          {/* Notes / Description */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Description / Notes
            </label>
            <input
              type="text"
              placeholder="Optional notes or details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-2.5 py-2 border border-neutral-300 rounded focus:outline-hidden text-xs"
            />
          </div>

          {/* Record Only Option */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-neutral-600">
              <input
                type="checkbox"
                checked={isRecordOnly}
                onChange={(e) => setIsRecordOnly(e.target.checked)}
                className="rounded text-neutral-600 cursor-pointer"
              />
              <span>Record only (Do not affect cash flow totals)</span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-neutral-200 flex items-center justify-between">
            {onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete transaction "${transaction.name}"?`)) {
                    onDelete(transaction.id);
                    onClose();
                  }
                }}
                className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 font-semibold rounded text-xs transition flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold rounded text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs transition flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
