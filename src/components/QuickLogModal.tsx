import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Calendar,
  CreditCard,
  CheckCircle2,
  Camera,
  PiggyBank,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  TransactionType,
  PaymentMethodType,
  IncomeClassification,
  ExpenseClassification,
  TransferDirection,
  CategoryBudget,
  formatCurrency,
} from '../types/finance';
import { ReceiptCaptureModal } from './ReceiptCaptureModal';

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

export interface QuickLogSubmitData {
  name: string;
  type: TransactionType;
  category: string;
  subCategory: IncomeClassification | ExpenseClassification;
  description?: string;
  amount: number;
  date: string;
  paymentMethod?: PaymentMethodType;
  transferDirection?: TransferDirection;
  isRecordOnly?: boolean;
}

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencySymbol: string;
  budgets?: CategoryBudget[];
  onAddTransaction: (data: QuickLogSubmitData) => void;
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  isOpen,
  onClose,
  currencySymbol,
  budgets = [],
  onAddTransaction,
}) => {
  const [entryType, setEntryType] = useState<TransactionType>('expense');
  const [entryCategory, setEntryCategory] = useState<string>('Food');
  const [entryName, setEntryName] = useState<string>('');
  const [entryAmount, setEntryAmount] = useState<string>('');
  const [entryDate, setEntryDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [entryPaymentMethod, setEntryPaymentMethod] = useState<PaymentMethodType>('Cash');
  const [transferDirection, setTransferDirection] = useState<TransferDirection>('cash_to_bank');
  const [savingsRate, setSavingsRate] = useState<number>(10); // Pay Yourself First %
  const [autoSaveSavings, setAutoSaveSavings] = useState<boolean>(false);
  const [isRecordOnly, setIsRecordOnly] = useState<boolean>(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeCategories = entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Contextual budget check for selected expense category
  const selectedBudget = entryType === 'expense'
    ? budgets.find((b) => b.category.toLowerCase() === entryCategory.toLowerCase())
    : null;

  const budgetAllocated = selectedBudget?.allocatedAmount || 0;
  const budgetSpent = selectedBudget?.spentAmount || 0;
  const newProjectedSpent = budgetSpent + (parseFloat(entryAmount) || 0);
  const isOverBudget = budgetAllocated > 0 && newProjectedSpent > budgetAllocated;
  const remainingBudget = Math.max(0, budgetAllocated - budgetSpent);

  // Pay Yourself First calculation
  const parsedIncome = parseFloat(entryAmount) || 0;
  const savingsAllocation = (parsedIncome * savingsRate) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(entryAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) return;

    if (entryType === 'transfer') {
      const defaultName =
        transferDirection === 'cash_to_bank'
          ? 'Transfer: Cash on Hand -> Bank Account'
          : 'Transfer: Bank Account -> Cash on Hand';

      onAddTransaction({
        name: entryName.trim() || defaultName,
        type: 'transfer',
        category: 'Bank Transaction',
        subCategory: 'variable',
        description: `Internal liquidity shift: ${transferDirection === 'cash_to_bank' ? 'Cash to Bank' : 'Bank to Cash'}`,
        amount: numericAmount,
        date: entryDate,
        paymentMethod: transferDirection === 'cash_to_bank' ? 'Cash' : 'Bank Transfer',
        transferDirection,
        isRecordOnly: false,
      });

      setSuccessMsg('Transfer logged successfully!');
      setTimeout(() => {
        setSuccessMsg(null);
        setEntryName('');
        setEntryAmount('');
        onClose();
      }, 400);
      return;
    }

    if (!entryName.trim()) return;

    const matchedCat = activeCategories.find((c) => c.name === entryCategory);
    const subCategory = matchedCat?.sub || (entryType === 'income' ? 'earned' : 'variable');

    onAddTransaction({
      name: entryName.trim(),
      type: entryType,
      category: entryCategory,
      subCategory,
      amount: numericAmount,
      date: entryDate,
      paymentMethod: entryPaymentMethod,
      isRecordOnly,
    });

    // Pay Yourself First automated split: if income and toggle checked
    if (entryType === 'income' && autoSaveSavings && savingsAllocation > 0) {
      onAddTransaction({
        name: `Savings Reserve (${savingsRate}% from ${entryName.trim()})`,
        type: 'expense',
        category: 'Savings',
        subCategory: 'variable',
        amount: savingsAllocation,
        date: entryDate,
        paymentMethod: entryPaymentMethod,
        description: `Pay Yourself First automatic ${savingsRate}% savings split`,
      });
    }

    setSuccessMsg(`Logged "${entryName.trim()}" successfully!`);
    setTimeout(() => {
      setSuccessMsg(null);
      setEntryName('');
      setEntryAmount('');
      setEntryPaymentMethod('Cash');
      setAutoSaveSavings(false);
      setIsRecordOnly(false);
      onClose();
    }, 400);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white text-neutral-900 w-full max-w-md rounded-xl shadow-2xl border border-neutral-300 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-[#212529] text-white flex items-center justify-between border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-600 flex items-center justify-center text-emerald-400">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Log Transaction</h2>
              <p className="text-[10px] text-neutral-400">Instant Ledger Entry &amp; Internal Shift</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {entryType !== 'transfer' && (
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
                title="Upload or snap a receipt/bank transaction to auto-fill"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan Slip</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1 rounded transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {successMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* 3-Way Type Toggle: Income, Expense, Transfer */}
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">Transaction Mode *</label>
            <div className="grid grid-cols-3 gap-1 rounded bg-neutral-100 p-1 border border-neutral-200">
              <button
                type="button"
                onClick={() => {
                  setEntryType('income');
                  setEntryCategory('Salary/Wages');
                }}
                className={`py-1.5 rounded font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer ${
                  entryType === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Income</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEntryType('expense');
                  setEntryCategory('Food');
                }}
                className={`py-1.5 rounded font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer ${
                  entryType === 'expense'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Expense</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEntryType('transfer');
                  setEntryName('Cash & Bank Transfer');
                }}
                className={`py-1.5 rounded font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer ${
                  entryType === 'transfer'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Transfer</span>
              </button>
            </div>
          </div>

          {/* TRANSFER MODE SPECIFIC INPUTS */}
          {entryType === 'transfer' ? (
            <div className="space-y-3 bg-blue-50/70 p-3 rounded-lg border border-blue-200">
              <div>
                <label className="block font-semibold text-blue-950 mb-1">
                  Transfer Direction *
                </label>
                <select
                  value={transferDirection}
                  onChange={(e) => setTransferDirection(e.target.value as TransferDirection)}
                  className="w-full px-2.5 py-2 border border-blue-300 rounded focus:outline-hidden bg-white cursor-pointer font-medium text-xs text-blue-900"
                >
                  <option value="cash_to_bank">Cash on Hand ➔ Bank Account (Deposit)</option>
                  <option value="bank_to_cash">Bank Account ➔ Cash on Hand (Withdrawal)</option>
                </select>
                <p className="text-[10px] text-blue-700 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Internal shift between liquid accounts. Does not impact Net Income or P&amp;L.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Optional Description / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. ATM withdrawal, Bank teller cash deposit"
                  value={entryName}
                  onChange={(e) => setEntryName(e.target.value)}
                  className="w-full px-2.5 py-2 border border-neutral-300 rounded focus:outline-hidden bg-white text-xs"
                />
              </div>
            </div>
          ) : (
            <>
              {/* Category Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-neutral-700">Category *</label>
                  {entryType === 'expense' && budgetAllocated > 0 && (
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
                  value={entryCategory}
                  onChange={(e) => setEntryCategory(e.target.value)}
                  className="w-full px-2.5 py-2 border border-neutral-300 rounded focus:outline-hidden bg-white cursor-pointer font-medium text-xs"
                >
                  {activeCategories.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.sub})
                    </option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Name of {entryType === 'income' ? 'Income' : 'Expense'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    entryType === 'income'
                      ? 'e.g. Monthly Salary, Freelance Milestone, Stock Dividend'
                      : 'e.g. Landers Grocery, Meralco Electricity, Doctor Checkup'
                  }
                  value={entryName}
                  onChange={(e) => setEntryName(e.target.value)}
                  className="w-full px-2.5 py-2 border border-neutral-300 rounded focus:outline-hidden focus:border-neutral-800 text-xs"
                />
              </div>
            </>
          )}

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
                placeholder="0.00"
                value={entryAmount}
                onChange={(e) => setEntryAmount(e.target.value)}
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
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-2.5 py-2 border border-neutral-300 rounded focus:outline-hidden focus:border-neutral-800 text-xs font-mono"
              />
            </div>
          </div>

          {/* Payment Method / Deposit To (if not transfer) */}
          {entryType !== 'transfer' && (
            <div>
              <label className="block font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
                <span>{entryType === 'income' ? 'Deposit To *' : 'Payment Method *'}</span>
              </label>
              <select
                value={entryPaymentMethod}
                onChange={(e) => setEntryPaymentMethod(e.target.value as PaymentMethodType)}
                className="w-full px-2.5 py-2 border border-neutral-300 rounded focus:outline-hidden bg-white cursor-pointer font-medium text-xs"
              >
                <option value="Cash">Cash on Hand</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer / Online</option>
              </select>
            </div>
          )}

          {/* PAY YOURSELF FIRST SLIDER (Income Mode) */}
          {entryType === 'income' && parsedIncome > 0 && (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                  <PiggyBank className="w-4 h-4 text-emerald-600" />
                  <span>Pay Yourself First</span>
                </div>
                <span className="font-mono font-bold text-emerald-700 text-xs">
                  {savingsRate}% ({formatCurrency(savingsAllocation, currencySymbol)})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={savingsRate}
                onChange={(e) => setSavingsRate(parseInt(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer h-1.5"
              />
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={autoSaveSavings}
                  onChange={(e) => setAutoSaveSavings(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-[11px] text-emerald-950 font-medium">
                  Auto-log {formatCurrency(savingsAllocation, currencySymbol)} to Savings category
                </span>
              </label>
            </div>
          )}

          {/* Record Only Option */}
          {entryType !== 'transfer' && (
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
          )}

          {/* Submit Action */}
          <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold rounded text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-white font-bold rounded shadow-xs transition flex items-center gap-1.5 text-xs cursor-pointer ${
                entryType === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : entryType === 'transfer'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-red-700 hover:bg-red-800'
              }`}
            >
              {entryType === 'transfer' ? (
                <ArrowRightLeft className="w-4 h-4" />
              ) : (
                <PlusCircle className="w-4 h-4" />
              )}
              <span>
                {entryType === 'transfer'
                  ? 'Execute Transfer'
                  : entryType === 'income'
                  ? 'Log Inflow'
                  : 'Log Outflow'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* OCR Capture Modal */}
      <ReceiptCaptureModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        currencySymbol={currencySymbol}
        onAutoFill={({ name, amount, date, type, category }) => {
          setEntryName(name);
          setEntryAmount(amount > 0 ? amount.toString() : '');
          setEntryDate(date);
          setEntryType(type);
          if (category) {
            setEntryCategory(category);
          } else {
            setEntryCategory(type === 'income' ? 'Salary/Wages' : 'Food');
          }
          setSuccessMsg(`Auto-filled from ${name}!`);
          setTimeout(() => setSuccessMsg(null), 3000);
        }}
      />
    </div>
  );
};
