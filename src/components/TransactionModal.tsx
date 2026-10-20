import React, { useState, useEffect } from 'react';
import {
  TransactionType,
  TransactionItem,
  IncomeClassification,
  ExpenseClassification,
} from '../types/finance';
import { X, PlusCircle } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
  defaultCategory?: string;
  currentAmount?: number;
  onSave: (data: {
    type: TransactionType;
    category: string;
    subCategory: IncomeClassification | ExpenseClassification;
    description: string;
    amount: number;
    date: string;
  }) => void;
}

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

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'income',
  defaultCategory = 'Salary/Wages',
  currentAmount,
  onSave,
}) => {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [category, setCategory] = useState<string>(defaultCategory);
  const [amount, setAmount] = useState<string>(currentAmount ? currentAmount.toString() : '');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setType(defaultType);
    setCategory(defaultCategory);
    setAmount(currentAmount !== undefined ? currentAmount.toString() : '');
    setDescription(currentAmount !== undefined ? `Adjusted ${defaultCategory} amount` : '');
  }, [defaultType, defaultCategory, currentAmount, isOpen]);

  if (!isOpen) return null;

  const activeCategories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount) || 0;
    if (numericAmount <= 0) return;

    const found = activeCategories.find((c) => c.name === category);
    const subCategory = found ? found.sub : type === 'income' ? 'earned' : 'fixed';

    onSave({
      type,
      category,
      subCategory,
      description: description.trim() || `${category} entry`,
      amount: numericAmount,
      date,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-neutral-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-3 bg-[#2d3134] text-white">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-sm">
              {currentAmount !== undefined ? `Update ${category}` : 'Add Financial Transaction'}
            </h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          {/* Type Toggle */}
          <div className="flex rounded bg-neutral-100 p-0.5 border border-neutral-200">
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory('Salary/Wages');
              }}
              className={`flex-1 py-1.5 rounded font-semibold transition ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Income / Inflow
            </button>
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategory('Utilities');
              }}
              className={`flex-1 py-1.5 rounded font-semibold transition ${
                type === 'expense'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Expense / Outflow
            </button>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block font-medium text-neutral-700 mb-1">Statement Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-hidden cursor-pointer bg-white"
            >
              {activeCategories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.sub})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block font-medium text-neutral-700 mb-1">
              Amount *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              placeholder="e.g. 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-300 rounded font-mono text-sm focus:outline-hidden focus:border-neutral-800"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-medium text-neutral-700 mb-1">Description / Memo</label>
            <input
              type="text"
              placeholder="e.g. Monthly salary payout, grocery shopping at Landers"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-hidden"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block font-medium text-neutral-700 mb-1">Transaction Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-hidden"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#2d3134] hover:bg-neutral-900 text-white rounded font-medium shadow-xs"
            >
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
