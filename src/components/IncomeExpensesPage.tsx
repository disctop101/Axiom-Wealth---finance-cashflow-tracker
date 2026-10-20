import React, { useState, useMemo, useCallback } from 'react';
import {
  TransactionItem,
  CategoryBudget,
  TransactionType,
  IncomeClassification,
  ExpenseClassification,
  PaymentMethodType,
  RecurringExpenseItem,
  formatCurrency,
} from '../types/finance';
import { RecurringExpensesModule } from './RecurringExpensesSection';
import {
  PlusCircle,
  Calendar,
  Layers,
  Search,
  Trash2,
  Edit2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Target,
  Clock,
  CalendarDays,
  CheckCircle2,
  PieChart,
  Link2,
  BarChart2,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  CalendarRange,
  Copy,
  Repeat,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  X,
  Sliders,
  ReceiptText,
  CreditCard,
  QrCode,
  Wallet,
  Activity,
  Shield,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Camera,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { InteractiveFinanceChart } from './InteractiveFinanceChart';
import { CashFlowTrendChart } from './CashFlowTrendChart';
import { getCategoryColor } from '../services/categoryColors';
import { ReceiptCaptureModal } from './ReceiptCaptureModal';
import { Tooltip } from './Tooltip';

interface IncomeExpensesPageProps {
  transactions: TransactionItem[];
  budgets: CategoryBudget[];
  currencySymbol: string;
  onAddTransaction: (data: {
    name: string;
    type: TransactionType;
    category: string;
    subCategory: IncomeClassification | ExpenseClassification;
    description?: string;
    amount: number;
    date: string;
    paymentMethod?: PaymentMethodType;
  }) => void;
  onUpdateTransaction: (tx: TransactionItem) => void;
  onDeleteTransaction: (txId: string) => void;
  onUpdateBudget: (
    category: string,
    amount: number,
    options?: {
      scope?: 'month' | 'year';
      monthKey?: string;
      year?: number;
    }
  ) => void;
  onCopyBudgets?: (sourceKey: string, targetKey: string, scope: 'month' | 'year') => void;
  onRolloutYear?: (monthKey: string) => void;
  activeSubTab?: 'entry' | 'transactions' | 'budgets' | 'recurring' | 'analytics';
  onSubTabChange?: (tab: 'entry' | 'transactions' | 'budgets' | 'recurring' | 'analytics') => void;
  recurringExpenses?: RecurringExpenseItem[];
  onAddRecurringExpense?: (item: Omit<RecurringExpenseItem, 'id'>) => void;
  onUpdateRecurringExpense?: (item: RecurringExpenseItem) => void;
  onDeleteRecurringExpense?: (id: string) => void;
  onPayRecurringExpense?: (
    id: string,
    instanceAmount: number,
    paymentMethod?: PaymentMethodType,
    paidDate?: string
  ) => Promise<void> | void;
  onOpenHelp?: () => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

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

export const IncomeExpensesPage: React.FC<IncomeExpensesPageProps> = ({
  transactions,
  budgets,
  currencySymbol,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onUpdateBudget,
  onCopyBudgets,
  onRolloutYear,
  activeSubTab,
  onSubTabChange,
  recurringExpenses = [],
  onAddRecurringExpense,
  onUpdateRecurringExpense,
  onDeleteRecurringExpense,
  onPayRecurringExpense,
  onOpenHelp,
}) => {
  // Mobile sub-tab switcher: 'entry' | 'transactions' | 'budgets' | 'recurring' | 'analytics'
  const [internalSubTab, setInternalSubTab] = useState<'entry' | 'transactions' | 'budgets' | 'recurring' | 'analytics'>('entry');
  const currentTab = activeSubTab !== undefined ? activeSubTab : internalSubTab;

  const handleSubTabChange = (tab: 'entry' | 'transactions' | 'budgets' | 'recurring' | 'analytics') => {
    if (onSubTabChange) {
      onSubTabChange(tab);
    } else {
      setInternalSubTab(tab);
    }
  };

  // New entry form state
  const [entryType, setEntryType] = useState<TransactionType>('expense');
  const [entryCategory, setEntryCategory] = useState<string>('Food');
  const [entryName, setEntryName] = useState<string>('');
  const [entryAmount, setEntryAmount] = useState<string>('');
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [entryPaymentMethod, setEntryPaymentMethod] = useState<PaymentMethodType>('Cash');
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Current Date Initializers
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => today.toISOString().split('T')[0], [today]);
  const currentYear = useMemo(() => today.getFullYear(), [today]);
  const currentMonthNum = useMemo(() => today.getMonth() + 1, [today]); // 1-12
  const currentMonthShort = useMemo(
    () => MONTH_NAMES[currentMonthNum - 1]?.slice(0, 3) || 'Current',
    [currentMonthNum]
  );
  const budgetYearOptions = useMemo(
    () =>
      Array.from(
        new Set([2023, 2024, 2025, 2026, 2027, currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2])
      ).sort((a, b) => a - b),
    [currentYear]
  );
  const startOfMonthIso = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
    [today]
  );

  // Helper to compute present period for any preset
  const getCurrentPeriodDates = useCallback((preset: 'day' | 'week' | 'month' | 'year' | 'all') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'day') {
      return { start: todayStr, end: todayStr };
    } else if (preset === 'week') {
      // Current week: Monday to Sunday of the current week
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0],
      };
    } else if (preset === 'month') {
      // 1st day to last day of current month
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    } else if (preset === 'year') {
      return {
        start: `${y}-01-01`,
        end: `${y}-12-31`,
      };
    } else {
      // All time
      const minDate = transactions.reduce((min, t) => (t.date < min ? t.date : min), todayStr);
      const maxDate = transactions.reduce((max, t) => (t.date > max ? t.date : max), todayStr);
      return { start: minDate, end: maxDate };
    }
  }, [transactions]);

  // Global Time Window & Date Selection State
  // Presets: 'day' | 'week' | 'month' | 'year' | 'all' | 'custom'
  // Defaults to 'month' with current month's full range (1st to last day)
  const initialMonthRange = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return {
      start: new Date(y, m, 1).toISOString().split('T')[0],
      end: new Date(y, m + 1, 0).toISOString().split('T')[0],
    };
  }, []);

  const [timePreset, setTimePreset] = useState<'day' | 'week' | 'month' | 'year' | 'all' | 'custom'>('month');
  const [startDate, setStartDate] = useState<string>(initialMonthRange.start);
  const [endDate, setEndDate] = useState<string>(initialMonthRange.end);
  const [filterLogByWindow, setFilterLogByWindow] = useState<boolean>(false);

  // Preset setter handler: automatically defaults to the current active period
  const handleApplyPreset = (preset: 'day' | 'week' | 'month' | 'year' | 'all') => {
    setTimePreset(preset);
    const range = getCurrentPeriodDates(preset);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  // 'Current' button handler: dynamically jumps to present period based on active filter
  const handleJumpToCurrent = () => {
    const target = timePreset === 'custom' || timePreset === 'all' ? 'month' : timePreset;
    setTimePreset(target);
    const range = getCurrentPeriodDates(target);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  // Running cashflow breakdown view: daily | weekly | monthly
  const [breakdownView, setBreakdownView] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCardExpanded = (key: string) => {
    setExpandedCards((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Time-Based Budgeting Assignment State (Defaults to current year and current month)
  const [budgetYear, setBudgetYear] = useState<number>(currentYear);
  const [budgetMonth, setBudgetMonth] = useState<number>(currentMonthNum);
  const [budgetPacing, setBudgetPacing] = useState<'daily' | 'weekly' | 'month' | 'year'>('month');
  const [budgetFeedback, setBudgetFeedback] = useState<string | null>(null);

  // Budget item editing dialog / inline state
  const [editingBudgetItem, setEditingBudgetItem] = useState<{
    category: string;
    amount: string;
    scope: 'month' | 'year';
  } | null>(null);

  // Budget drilldown pop-up modal state
  const [budgetDrilldownModal, setBudgetDrilldownModal] = useState<{
    isOpen: boolean;
    category: string;
    monthKey: string;
    monthName: string;
    year: number;
    pacedTarget: number;
    pacedSpent: number;
    remaining: number;
    percent: number;
    pacingSuffix: string;
  } | null>(null);

  // Transaction list search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Edit transaction state
  const [editingTx, setEditingTx] = useState<TransactionItem | null>(null);
  const [txToDelete, setTxToDelete] = useState<TransactionItem | null>(null);

  const activeCategories = entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Handle form submission
  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(entryAmount) || 0;
    if (numericAmount <= 0 || !entryName.trim()) return;

    const found = activeCategories.find((c) => c.name === entryCategory);
    const subCategory = found ? found.sub : entryType === 'income' ? 'earned' : 'fixed';

    if (editingTx) {
      onUpdateTransaction({
        ...editingTx,
        name: entryName.trim(),
        type: entryType,
        category: entryCategory,
        subCategory,
        amount: numericAmount,
        date: entryDate,
        month: parseInt(entryDate.split('-')[1]) || 1,
        year: parseInt(entryDate.split('-')[0]) || 2024,
        paymentMethod: entryPaymentMethod,
        updatedAt: new Date().toISOString(),
      });
      setEditingTx(null);
      setFormSuccess(`Updated "${entryName.trim()}" successfully!`);
    } else {
      onAddTransaction({
        name: entryName.trim(),
        type: entryType,
        category: entryCategory,
        subCategory,
        amount: numericAmount,
        date: entryDate,
        paymentMethod: entryPaymentMethod,
      });
      setFormSuccess(`Logged "${entryName.trim()}" for ${formatCurrency(numericAmount, currencySymbol)}!`);
    }

    setEntryName('');
    setEntryAmount('');
    setEntryPaymentMethod('Cash');
    setTimeout(() => setFormSuccess(null), 3000);
  };

  const startEditTx = (tx: TransactionItem) => {
    setEditingTx(tx);
    setEntryType(tx.type);
    setEntryCategory(tx.category);
    setEntryName(tx.name || tx.description || '');
    setEntryAmount(tx.amount.toString());
    setEntryDate(tx.date);
    const rawMethod = tx.paymentMethod || 'Cash';
    const normalizedMethod: PaymentMethodType =
      (rawMethod as any) === 'Credit Card'
        ? 'Card'
        : (rawMethod as any) === 'QR Payment'
        ? 'Bank Transfer'
        : (rawMethod as PaymentMethodType);
    setEntryPaymentMethod(normalizedMethod);
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingTx(null);
    setEntryName('');
    setEntryAmount('');
    setEntryPaymentMethod('Cash');
    setEntryDate(new Date().toISOString().split('T')[0]);
  };

  // Transactions filtered by active Time Window (for Charts & KPIs)
  const windowTransactions = useMemo(() => {
    if (timePreset === 'all') return transactions;
    return transactions.filter((t) => t.date >= startDate && t.date <= endDate);
  }, [transactions, startDate, endDate, timePreset]);

  // Sorting state for Logged Transactions ledger
  const [sortField, setSortField] = useState<'entryNo' | 'date' | 'name' | 'category' | 'type' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'entryNo' | 'date' | 'name' | 'category' | 'type' | 'amount') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'date' || field === 'amount' || field === 'entryNo' ? 'desc' : 'asc');
    }
  };

  // Filtered transactions for the log table
  const filteredTransactions = useMemo(() => {
    const source = filterLogByWindow ? windowTransactions : transactions;
    return source
      .filter((tx) => {
        const matchesType = typeFilter === 'all' || tx.type === typeFilter;
        const matchesCat = categoryFilter === 'all' || tx.category === categoryFilter;
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          (tx.name && tx.name.toLowerCase().includes(query)) ||
          (tx.description && tx.description.toLowerCase().includes(query)) ||
          tx.category.toLowerCase().includes(query) ||
          tx.date.includes(query) ||
          (tx.entryNo && tx.entryNo.toLowerCase().includes(query));
        return matchesType && matchesCat && matchesQuery;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'entryNo') {
          const eA = a.entryNo || '';
          const eB = b.entryNo || '';
          diff = eA.localeCompare(eB, undefined, { numeric: true });
        } else if (sortField === 'date') {
          diff = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (sortField === 'name') {
          const nameA = a.name || a.description || '';
          const nameB = b.name || b.description || '';
          diff = nameA.localeCompare(nameB);
        } else if (sortField === 'category') {
          diff = a.category.localeCompare(b.category);
        } else if (sortField === 'type') {
          diff = a.type.localeCompare(b.type);
        } else if (sortField === 'amount') {
          diff = a.amount - b.amount;
        }
        return sortDirection === 'asc' ? diff : -diff;
      });
  }, [transactions, windowTransactions, filterLogByWindow, typeFilter, categoryFilter, searchQuery, sortField, sortDirection]);

  // Aggregate totals for the active Time Window
  const totalIncome = useMemo(() => {
    return windowTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [windowTransactions]);

  const totalExpense = useMemo(() => {
    return windowTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [windowTransactions]);

  const netCashflow = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  // Chart Slices Data: Income by Category (Active Window)
  const incomeSlices = useMemo(() => {
    const map: Record<string, number> = {};
    windowTransactions
      .filter((t) => t.type === 'income')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });

    return Object.entries(map).map(([category, amount]) => ({
      category,
      amount,
      color: getCategoryColor(category),
    }));
  }, [windowTransactions]);

  // Chart Slices Data: Expenses by Category (Active Window)
  const expenseSlices = useMemo(() => {
    const map: Record<string, number> = {};
    windowTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });

    return Object.entries(map).map(([category, amount]) => ({
      category,
      amount,
      color: getCategoryColor(category),
    }));
  }, [windowTransactions]);

  // Period-over-Period Analytical Comparison Calculations
  const comparisonData = useMemo(() => {
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    const diffDays = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const prevEnd = new Date(sDate);
    prevEnd.setDate(sDate.getDate() - 1);

    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevEnd.getDate() - diffDays + 1);

    const prevStartStr = prevStart.toISOString().split('T')[0];
    const prevEndStr = prevEnd.toISOString().split('T')[0];

    const prevTxs = transactions.filter((t) => t.date >= prevStartStr && t.date <= prevEndStr);

    const prevIncome = prevTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const prevExpense = prevTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const prevNet = prevIncome - prevExpense;

    const incomeDiff = totalIncome - prevIncome;
    const incomePercent = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : (totalIncome > 0 ? 100 : 0);

    const expenseDiff = totalExpense - prevExpense;
    const expensePercent = prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : (totalExpense > 0 ? 100 : 0);

    const netDiff = netCashflow - prevNet;
    const netPercent =
      prevNet !== 0
        ? ((netCashflow - prevNet) / Math.abs(prevNet)) * 100
        : netCashflow > 0
        ? 100
        : netCashflow < 0
        ? -100
        : 0;

    return {
      prevStartStr,
      prevEndStr,
      diffDays,
      prevIncome,
      prevExpense,
      prevNet,
      incomeDiff,
      incomePercent,
      expenseDiff,
      expensePercent,
      netDiff,
      netPercent,
    };
  }, [startDate, endDate, transactions, totalIncome, totalExpense, netCashflow]);

  const categoryExpenseMap = useMemo(() => {
    const map: Record<string, number> = {};
    windowTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });
    return map;
  }, [windowTransactions]);

  // Running Cashflow Breakdowns: Daily, Weekly, Monthly (including both Income & Expenses)
  const runningBreakdown = useMemo(() => {
    const sortedTxs = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (breakdownView === 'daily') {
      const dailyMap: Record<
        string,
        {
          inflow: number;
          outflow: number;
          net: number;
          count: number;
          incomeCount: number;
          expenseCount: number;
          items: TransactionItem[];
        }
      > = {};

      sortedTxs.forEach((t) => {
        const dateKey = t.date;
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = {
            inflow: 0,
            outflow: 0,
            net: 0,
            count: 0,
            incomeCount: 0,
            expenseCount: 0,
            items: [],
          };
        }
        if (t.type === 'income') {
          dailyMap[dateKey].inflow += t.amount;
          dailyMap[dateKey].incomeCount += 1;
        } else {
          dailyMap[dateKey].outflow += t.amount;
          dailyMap[dateKey].expenseCount += 1;
        }
        dailyMap[dateKey].net = dailyMap[dateKey].inflow - dailyMap[dateKey].outflow;
        dailyMap[dateKey].count += 1;
        dailyMap[dateKey].items.push(t);
      });

      return Object.entries(dailyMap).map(([date, data]) => ({
        label: date,
        periodName: new Date(date).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        inflow: data.inflow,
        outflow: data.outflow,
        net: data.net,
        count: data.count,
        incomeCount: data.incomeCount,
        expenseCount: data.expenseCount,
        items: data.items,
      }));
    } else if (breakdownView === 'weekly') {
      const weeklyMap: Record<
        string,
        {
          label: string;
          inflow: number;
          outflow: number;
          net: number;
          count: number;
          incomeCount: number;
          expenseCount: number;
          items: TransactionItem[];
        }
      > = {};

      sortedTxs.forEach((t) => {
        const d = new Date(t.date);
        const dayOfMonth = d.getDate();
        const weekNum = Math.ceil(dayOfMonth / 7);
        const monthName = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const key = `${monthName} - Week ${weekNum}`;

        if (!weeklyMap[key]) {
          weeklyMap[key] = {
            label: key,
            inflow: 0,
            outflow: 0,
            net: 0,
            count: 0,
            incomeCount: 0,
            expenseCount: 0,
            items: [],
          };
        }
        if (t.type === 'income') {
          weeklyMap[key].inflow += t.amount;
          weeklyMap[key].incomeCount += 1;
        } else {
          weeklyMap[key].outflow += t.amount;
          weeklyMap[key].expenseCount += 1;
        }
        weeklyMap[key].net = weeklyMap[key].inflow - weeklyMap[key].outflow;
        weeklyMap[key].count += 1;
        weeklyMap[key].items.push(t);
      });

      return Object.entries(weeklyMap).map(([, data]) => ({
        label: data.label,
        periodName: data.label,
        inflow: data.inflow,
        outflow: data.outflow,
        net: data.net,
        count: data.count,
        incomeCount: data.incomeCount,
        expenseCount: data.expenseCount,
        items: data.items,
      }));
    } else {
      const monthlyMap: Record<
        string,
        {
          label: string;
          inflow: number;
          outflow: number;
          net: number;
          count: number;
          incomeCount: number;
          expenseCount: number;
          items: TransactionItem[];
        }
      > = {};

      sortedTxs.forEach((t) => {
        const d = new Date(t.date);
        const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        if (!monthlyMap[key]) {
          monthlyMap[key] = {
            label: key,
            inflow: 0,
            outflow: 0,
            net: 0,
            count: 0,
            incomeCount: 0,
            expenseCount: 0,
            items: [],
          };
        }
        if (t.type === 'income') {
          monthlyMap[key].inflow += t.amount;
          monthlyMap[key].incomeCount += 1;
        } else {
          monthlyMap[key].outflow += t.amount;
          monthlyMap[key].expenseCount += 1;
        }
        monthlyMap[key].net = monthlyMap[key].inflow - monthlyMap[key].outflow;
        monthlyMap[key].count += 1;
        monthlyMap[key].items.push(t);
      });

      return Object.entries(monthlyMap).map(([, data]) => ({
        label: data.label,
        periodName: data.label,
        inflow: data.inflow,
        outflow: data.outflow,
        net: data.net,
        count: data.count,
        incomeCount: data.incomeCount,
        expenseCount: data.expenseCount,
        items: data.items,
      }));
    }
  }, [transactions, breakdownView]);

  // Budget Alert System: Compute categories that have hit 75%+ of their assigned spending cap
  const budgetAlerts = useMemo(() => {
    const currentMonthKey = `${budgetYear}-${String(budgetMonth).padStart(2, '0')}`;
    const alerts: { category: string; percent: number; spent: number; target: number; isOver: boolean }[] = [];

    EXPENSE_CATEGORIES.forEach((cat) => {
      const budgetItem = budgets.find((b) => b.category === cat.name);
      const rawMonthBudget = budgetItem?.periodBudgets?.[currentMonthKey] ?? budgetItem?.monthlyBudget ?? 0;
      if (rawMonthBudget <= 0) return;

      const spent = transactions
        .filter((t) => t.type === 'expense' && t.category === cat.name && t.date.startsWith(currentMonthKey))
        .reduce((sum, t) => sum + t.amount, 0);

      const percent = (spent / rawMonthBudget) * 100;
      if (percent >= 75) {
        alerts.push({
          category: cat.name,
          percent,
          spent,
          target: rawMonthBudget,
          isOver: spent > rawMonthBudget,
        });
      }
    });

    return alerts.sort((a, b) => b.percent - a.percent);
  }, [budgets, transactions, budgetYear, budgetMonth]);

  // Cash Flow Trend Points (strictly bound to active Time Window & global date filter)
  const cashFlowTrendPoints = useMemo(() => {
    if (!startDate || !endDate) return [];

    const sDate = new Date(startDate + 'T00:00:00');
    const eDate = new Date(endDate + 'T00:00:00');
    const validStart = sDate <= eDate ? sDate : eDate;
    const validEnd = sDate <= eDate ? eDate : sDate;

    const diffDays = Math.round(
      (validEnd.getTime() - validStart.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    // Case A: 1 Day
    if (diffDays <= 1) {
      const dateKey = validStart.toISOString().split('T')[0];
      const dayTxs = windowTransactions.filter((t) => t.date === dateKey);
      const inflow = dayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const outflow = dayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      if (dayTxs.length > 1) {
        let runningNet = 0;
        return dayTxs.map((t, idx) => {
          runningNet += t.type === 'income' ? t.amount : -t.amount;
          return {
            date: t.date,
            label: `${t.name} (#${idx + 1})`,
            inflow: t.type === 'income' ? t.amount : 0,
            outflow: t.type === 'expense' ? t.amount : 0,
            net: runningNet,
          };
        });
      }

      return [
        {
          date: dateKey,
          label: `${dateKey} (Start)`,
          inflow: 0,
          outflow: 0,
          net: 0,
        },
        {
          date: dateKey,
          label: dateKey,
          inflow,
          outflow,
          net: inflow - outflow,
        },
      ];
    }

    // Case B: Span <= 31 days (Day/Week/Month/Custom Window)
    if (diffDays <= 31) {
      const points: Array<{ date: string; label: string; inflow: number; outflow: number; net: number }> = [];
      const curr = new Date(validStart);

      while (curr <= validEnd) {
        const yStr = curr.getFullYear();
        const mStr = String(curr.getMonth() + 1).padStart(2, '0');
        const dStr = String(curr.getDate()).padStart(2, '0');
        const dateKey = `${yStr}-${mStr}-${dStr}`;
        const weekday = curr.toLocaleDateString('en-US', { weekday: 'short' });
        const label = diffDays <= 7 ? `${weekday} ${dStr}` : `${mStr}-${dStr}`;

        const dayTxs = windowTransactions.filter((t) => t.date === dateKey);
        const inflow = dayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const outflow = dayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

        points.push({
          date: dateKey,
          label,
          inflow,
          outflow,
          net: inflow - outflow,
        });

        curr.setDate(curr.getDate() + 1);
      }
      return points;
    }

    // Case C: Multi-Month or Year (Span > 31 days)
    const monthMap: Record<string, { label: string; dateSort: string; inflow: number; outflow: number }> = {};
    windowTransactions.forEach((t) => {
      const parts = t.date.split('-');
      const yStr = parts[0];
      const mStr = parts[1];
      const key = `${yStr}-${mStr}`;
      const mNum = parseInt(mStr, 10);
      const shortMonth = MONTH_NAMES[mNum - 1]?.slice(0, 3) || `M${mNum}`;
      const label = diffDays <= 366 ? shortMonth : `${shortMonth} '${yStr.slice(2)}`;

      if (!monthMap[key]) {
        monthMap[key] = { label, dateSort: `${key}-01`, inflow: 0, outflow: 0 };
      }
      if (t.type === 'income') monthMap[key].inflow += t.amount;
      else monthMap[key].outflow += t.amount;
    });

    const sortedEntries = Object.entries(monthMap).sort((a, b) => a[1].dateSort.localeCompare(b[1].dateSort));
    return sortedEntries.map(([, d]) => ({
      date: d.dateSort,
      label: d.label,
      inflow: d.inflow,
      outflow: d.outflow,
      net: d.inflow - d.outflow,
    }));
  }, [windowTransactions, startDate, endDate]);



  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 select-none">
      {/* Top Banner with Page Title and Help & Guide Button */}
      <div className="flex bg-[#2e3436] text-white p-3.5 shadow-sm border border-neutral-700 flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg">
        <div>
          <h1 className="text-base sm:text-lg font-black tracking-wider uppercase">
            Income &amp; Expenses Cashflow Dashboard
          </h1>
          <p className="text-xs text-neutral-300 font-mono">
            Time-Based Budgeting Pacing, Cashflow Breakdown &amp; Analytics
          </p>
        </div>
        {onOpenHelp && (
          <Tooltip content="Open operational guide and button explanations for Income & Expenses" position="bottom">
            <button
              type="button"
              onClick={onOpenHelp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-600 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>Guide</span>
            </button>
          </Tooltip>
        )}
      </div>

      {/* ================= GLOBAL TIME WINDOW & DATE SELECTION ================= */}
      <div
        className={`bg-white border border-neutral-300 p-3 shadow-xs rounded-xs ${
          currentTab !== 'analytics' ? 'hidden lg:block' : ''
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider mr-1 flex items-center gap-1">
              <CalendarRange className="w-3.5 h-3.5 text-blue-600" />
              <span>Time Window:</span>
            </span>

            {(['day', 'week', 'month', 'year', 'all'] as const).map((p) => {
              const labels = {
                day: 'Day',
                week: 'Week',
                month: 'Month',
                year: 'Year',
                all: 'All Time',
              };
              const isSelected = timePreset === p;

              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className={`px-3 py-1 rounded text-xs font-bold tracking-wide transition ${
                    isSelected
                      ? 'bg-neutral-800 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}

            {/* Current Button alongside Time Window Selector */}
            <button
              type="button"
              onClick={handleJumpToCurrent}
              className="flex items-center gap-1 px-3 py-1 rounded text-xs font-bold tracking-wide bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-xs transition cursor-pointer ml-1"
              title="Jump to present active period based on active filter (Day, Week, Month, Year)"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Current</span>
            </button>
          </div>

          {/* Custom Date Range Picker */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-neutral-500 font-medium">Custom Range:</span>
            <div className="flex items-center gap-1 bg-neutral-50 border border-neutral-300 px-2 py-1 rounded">
              <span className="text-[10px] text-neutral-400 uppercase font-mono">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setTimePreset('custom');
                }}
                className="bg-transparent font-mono text-neutral-800 focus:outline-hidden"
              />
            </div>

            <span className="text-neutral-400">to</span>

            <div className="flex items-center gap-1 bg-neutral-50 border border-neutral-300 px-2 py-1 rounded">
              <span className="text-[10px] text-neutral-400 uppercase font-mono">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setTimePreset('custom');
                }}
                className="bg-transparent font-mono text-neutral-800 focus:outline-hidden"
              />
            </div>

            {/* Quick Badge */}
            <span className="text-[11px] font-mono bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-bold">
              {windowTransactions.length} entries
            </span>
          </div>
        </div>
      </div>

      {/* ================= PERIOD-OVER-PERIOD COMPARISON ANALYTICAL VIEW ================= */}
      <div
        className={`bg-[#1f2324] text-white p-3.5 border border-neutral-700 rounded-xs shadow-xs ${
          currentTab !== 'analytics' ? 'hidden lg:block' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-2 border-b border-neutral-700 gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-blue-900/60 text-blue-400 border border-blue-700/60">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-100">
                Period-over-Period Variance Analysis
              </h3>
              <p className="text-[11px] text-neutral-400 font-mono">
                Current Window ({startDate} → {endDate}) vs. Prior Cycle ({comparisonData.prevStartStr} → {comparisonData.prevEndStr}) · {comparisonData.diffDays} days
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono bg-neutral-800 px-2 py-0.5 rounded text-neutral-300 border border-neutral-700 self-start sm:self-auto">
            Δ Absolute &amp; % Variance
          </span>
        </div>

        {/* 3 Comparative KPI Panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mt-2">
          {/* 1. Income Inflow Comparison */}
          <div className="bg-neutral-900/90 border border-neutral-700/80 p-2.5 rounded">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <span className="font-semibold uppercase text-[10px]">Total Cash Inflow</span>
              <span className="font-mono text-[10px]">Prior: {formatCurrency(comparisonData.prevIncome, currencySymbol)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold font-mono text-emerald-400">
                {formatCurrency(totalIncome, currencySymbol)}
              </span>
              <div
                className={`flex items-center gap-1 font-mono font-bold text-xs px-1.5 py-0.5 rounded ${
                  comparisonData.incomeDiff >= 0
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-red-950 text-red-300 border border-red-800'
                }`}
              >
                {comparisonData.incomeDiff >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                )}
                <span>
                  {comparisonData.incomeDiff >= 0 ? '+' : ''}
                  {formatCurrency(comparisonData.incomeDiff, currencySymbol)}
                </span>
                <span className="text-[10px] opacity-80">
                  ({comparisonData.incomePercent >= 0 ? '+' : ''}
                  {comparisonData.incomePercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* 2. Expense Outflow Comparison */}
          <div className="bg-neutral-900/90 border border-neutral-700/80 p-2.5 rounded">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <span className="font-semibold uppercase text-[10px]">Total Cash Outflows</span>
              <span className="font-mono text-[10px]">Prior: {formatCurrency(comparisonData.prevExpense, currencySymbol)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold font-mono text-red-400">
                {formatCurrency(totalExpense > 0 ? -totalExpense : 0, currencySymbol)}
              </span>
              <div
                className={`flex items-center gap-1 font-mono font-bold text-xs px-1.5 py-0.5 rounded ${
                  comparisonData.expenseDiff <= 0
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-red-950 text-red-300 border border-red-800'
                }`}
              >
                {comparisonData.expenseDiff <= 0 ? (
                  <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />
                )}
                <span>
                  {comparisonData.expenseDiff > 0 ? '+' : ''}
                  {formatCurrency(comparisonData.expenseDiff, currencySymbol)}
                </span>
                <span className="text-[10px] opacity-80">
                  ({comparisonData.expensePercent > 0 ? '+' : ''}
                  {comparisonData.expensePercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* 3. Net Cashflow Comparison */}
          <div className="bg-neutral-900/90 border border-neutral-700/80 p-2.5 rounded">
            <div className="flex items-center justify-between text-neutral-400 mb-1">
              <span className="font-semibold uppercase text-[10px]">Net Cashflow Trajectory</span>
              <span className="font-mono text-[10px]">Prior: {formatCurrency(comparisonData.prevNet, currencySymbol)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span
                className={`text-base sm:text-lg font-bold font-mono ${
                  netCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {formatCurrency(netCashflow, currencySymbol)}
              </span>
              <div
                className={`flex items-center gap-1 font-mono font-bold text-xs px-1.5 py-0.5 rounded ${
                  comparisonData.netDiff >= 0
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-red-950 text-red-300 border border-red-800'
                }`}
              >
                {comparisonData.netDiff >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                )}
                <span>
                  {comparisonData.netDiff >= 0 ? '+' : ''}
                  {formatCurrency(comparisonData.netDiff, currencySymbol)}
                </span>
                <span className="text-[10px] opacity-80">
                  ({comparisonData.netPercent >= 0 ? '+' : ''}
                  {comparisonData.netPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= DEDICATED CASHFLOW KPI METRICS (ACTIVE WINDOW) ================= */}
      <div
        className={`grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs ${
          currentTab !== 'analytics' ? 'hidden lg:grid' : ''
        }`}
      >
        <div className="bg-white p-3 border border-neutral-300 shadow-xs">
          <div className="text-neutral-500 font-medium">Window Cash Inflows</div>
          <div className="text-base sm:text-lg font-bold font-mono text-emerald-700 mt-1">
            {formatCurrency(totalIncome, currencySymbol)}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">
            {windowTransactions.filter((t) => t.type === 'income').length} income records
          </div>
        </div>

        <div className="bg-white p-3 border border-neutral-300 shadow-xs">
          <div className="text-neutral-500 font-medium">Window Cash Outflows</div>
          <div className="text-base sm:text-lg font-bold font-mono text-red-700 mt-1">
            {formatCurrency(totalExpense > 0 ? -totalExpense : 0, currencySymbol)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            {windowTransactions.filter((t) => t.type === 'expense').length} expense entries
          </div>
        </div>

        <div className="bg-white p-3 border border-neutral-300 shadow-xs">
          <div className="text-neutral-500 font-medium">Net Period Cashflow</div>
          <div
            className={`text-base sm:text-lg font-bold font-mono mt-1 ${
              netCashflow >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            {formatCurrency(netCashflow, currencySymbol)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 font-mono">
            Inflows minus Outflows
          </div>
        </div>

        <div className="bg-white p-3 border border-neutral-300 shadow-xs">
          <div className="text-neutral-500 font-medium">Cashflow Savings Rate</div>
          <div className="text-base sm:text-lg font-bold font-mono text-neutral-900 mt-1">
            {savingsRate.toFixed(1)}%
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            Percentage of income retained
          </div>
        </div>
      </div>

      {/* ================= PRIMARY CASH FLOW TREND LINE CHART (EXPANSIVE FULL WIDTH) ================= */}
      <div
        className={`w-full ${
          currentTab !== 'analytics' ? 'hidden lg:block' : ''
        }`}
      >
        <CashFlowTrendChart
          data={cashFlowTrendPoints}
          currencySymbol={currencySymbol}
          title={`Cash Flow Trend Line Chart (${startDate} to ${endDate})`}
        />
      </div>

      {/* ================= DYNAMIC VISUAL CHARTS (DONUT / BAR & SORT CONTROLS) ================= */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${
          currentTab !== 'analytics' ? 'hidden lg:grid' : ''
        }`}
      >
        {/* Chart 1: Income Breakdown with Interactive Controls */}
        <InteractiveFinanceChart
          title="Income Contributors by Category"
          data={incomeSlices}
          total={totalIncome}
          currencySymbol={currencySymbol}
          type="income"
          defaultStyle="donut"
          allowStyleToggle={true}
          allowSort={true}
          onSelectCategory={(cat) => {
            setCategoryFilter(cat);
            setTypeFilter('income');
          }}
        />

        {/* Chart 2: Expenses Breakdown with Interactive Controls */}
        <InteractiveFinanceChart
          title="Expenses Distribution by Category"
          data={expenseSlices}
          total={totalExpense}
          currencySymbol={currencySymbol}
          type="expense"
          defaultStyle="donut"
          allowStyleToggle={true}
          allowSort={true}
          onSelectCategory={(cat) => {
            setCategoryFilter(cat);
            setTypeFilter('expense');
          }}
        />
      </div>

      {/* Grid: Left Column (New Entry Form) & Right Column (Budget Tracking) */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-12 gap-5 ${
          currentTab !== 'entry' && currentTab !== 'budgets' ? 'hidden lg:grid' : ''
        }`}
      >
        {/* ================= 3. TRANSACTION LOGGING FORM ================= */}
        <div
          className={`lg:col-span-5 bg-white border border-neutral-300 shadow-xs ${
            currentTab !== 'entry' ? 'hidden lg:block' : ''
          }`}
        >
          <div className="bg-[#2d3134] text-white p-3 flex items-center justify-between border-b border-neutral-700">
            <div className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <h2 className="font-bold text-sm tracking-wide">
                {editingTx ? 'Edit Transaction Entry' : 'Log New Transaction'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {!editingTx && (
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
                  title="Upload or snap a receipt/bank transaction to auto-fill"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Scan Receipt / Slip</span>
                </button>
              )}
              {editingTx && (
                <button
                  onClick={cancelEdit}
                  className="text-xs text-neutral-300 hover:text-white underline cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          <form id="transaction-entry-form" onSubmit={handleSubmitEntry} className="p-4 space-y-3.5 text-xs">
            {formSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            {/* Type Toggle */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Transaction Type *</label>
              <div className="grid grid-cols-2 gap-1 rounded bg-neutral-100 p-1 border border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setEntryType('income');
                    setEntryCategory('Salary/Wages');
                  }}
                  className={`py-1.5 rounded font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                    entryType === 'income'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Income / Inflow</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEntryType('expense');
                    setEntryCategory('Food');
                  }}
                  className={`py-1.5 rounded font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                    entryType === 'expense'
                      ? 'bg-red-700 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Expense / Outflow</span>
                </button>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Category *</label>
              <select
                value={entryCategory}
                onChange={(e) => setEntryCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-hidden bg-white cursor-pointer font-medium"
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
                id="entryNameInput"
                type="text"
                required
                placeholder={
                  entryType === 'income'
                    ? 'e.g. Monthly Salary, Freelance Milestone, Stock Dividend'
                    : 'e.g. Landers Grocery, Meralco Electricity, Doctor Checkup'
                }
                value={entryName}
                onChange={(e) => setEntryName(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-hidden focus:border-neutral-800"
              />
            </div>

            {/* Amount & Date in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Amount ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="0.00"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded font-mono text-sm focus:outline-hidden focus:border-neutral-800 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Transaction Date *
                </label>
                <input
                  type="date"
                  required
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-hidden font-mono"
                />
              </div>
            </div>

            {/* Payment Method / Deposit To Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{entryType === 'income' ? 'Deposit To *' : 'Payment Method *'}</span>
                </label>
                <select
                  value={entryPaymentMethod}
                  onChange={(e) => setEntryPaymentMethod(e.target.value as PaymentMethodType)}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-hidden bg-white cursor-pointer font-medium"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-200 flex justify-end">
              <button
                type="submit"
                className={`px-4 py-2 text-white font-bold rounded shadow-xs transition flex items-center gap-1.5 text-xs ${
                  entryType === 'income'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-700 hover:bg-red-800'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>{editingTx ? 'Update Entry' : 'Log Transaction'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ================= 4. TIME-BASED CATEGORY BUDGET LIMITS ================= */}
        <div
          className={`lg:col-span-7 bg-white dark:bg-[#1e2324] border border-neutral-300 dark:border-neutral-700 shadow-xs flex flex-col justify-between ${
            currentTab !== 'budgets' ? 'hidden lg:flex' : ''
          }`}
        >
          <div>
            {/* Header matching reference image */}
            <div className="bg-[#2d3134] text-white p-3 flex items-center justify-between border-b border-neutral-700">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                <h2 className="font-bold text-sm tracking-wide">Category Budget Limits</h2>
              </div>
              <span className="text-[11px] text-neutral-300 font-mono">
                Tracking expenses against max targets
              </span>
            </div>

            <div className="p-4 space-y-3">
              {/* Sub-bar with tracked count and instructions */}
              <div className="text-[11px] text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-[#16191b] p-2 rounded border border-neutral-200 dark:border-neutral-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span>Set maximum spending targets per category. Progress bars update in real time.</span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200 shrink-0">11 tracked categories</span>
              </div>

              {/* Month Selection Tool & Pacing Toggle Bar */}
              <div className="bg-neutral-50/80 dark:bg-[#16191b] p-2.5 rounded border border-neutral-200 dark:border-neutral-700/80 space-y-2.5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                  {/* Month Selection Tool */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider text-[10px] flex items-center gap-1 shrink-0">
                      <CalendarCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Budget Month:</span>
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (budgetMonth === 1) {
                            setBudgetMonth(12);
                            setBudgetYear((y) => y - 1);
                          } else {
                            setBudgetMonth((m) => m - 1);
                          }
                        }}
                        className="p-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
                        title="Previous Month"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <select
                        value={budgetMonth}
                        onChange={(e) => setBudgetMonth(parseInt(e.target.value) || 1)}
                        className="px-2 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-hidden cursor-pointer text-xs"
                      >
                        {MONTH_NAMES.map((m, idx) => (
                          <option key={m} value={idx + 1}>
                            {m}
                          </option>
                        ))}
                      </select>

                      <select
                        value={budgetYear}
                        onChange={(e) => setBudgetYear(parseInt(e.target.value) || currentYear)}
                        className="px-2 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 font-mono font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-hidden cursor-pointer text-xs"
                      >
                        {budgetYearOptions.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          if (budgetMonth === 12) {
                            setBudgetMonth(1);
                            setBudgetYear((y) => y + 1);
                          } else {
                            setBudgetMonth((m) => m + 1);
                          }
                        }}
                        className="p-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
                        title="Next Month"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBudgetMonth(currentMonthNum);
                          setBudgetYear(currentYear);
                        }}
                        className="text-[10px] text-blue-700 dark:text-blue-400 hover:underline font-semibold ml-1 cursor-pointer whitespace-nowrap"
                        title={`Reset budget view to current month (${currentMonthShort} ${currentYear})`}
                      >
                        Current
                      </button>
                    </div>
                  </div>

                  {/* Budget Pacing Toggle Switch: Day, Week, Month, Year */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-mono font-bold shrink-0">
                      Pacing:
                    </span>
                    <div className="flex flex-wrap rounded bg-neutral-200 dark:bg-neutral-800 p-0.5 text-xs font-semibold gap-0.5">
                      {(['daily', 'weekly', 'month', 'year'] as const).map((p) => {
                        const labels = {
                          daily: 'Daily',
                          weekly: 'Weekly',
                          month: 'Monthly',
                          year: 'Yearly',
                        };
                        const isActive = budgetPacing === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setBudgetPacing(p)}
                            className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                              isActive
                                ? 'bg-neutral-800 text-white dark:bg-neutral-700 dark:text-white shadow-xs font-bold'
                                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                            }`}
                          >
                            {labels[p]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Duplication & Rollout Action Buttons */}
                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700 gap-1.5 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Copy Previous Month */}
                    <button
                      type="button"
                      onClick={() => {
                        const prevMonth = budgetMonth === 1 ? 12 : budgetMonth - 1;
                        const prevYear = budgetMonth === 1 ? budgetYear - 1 : budgetYear;
                        const prevKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
                        const currentKey = `${budgetYear}-${String(budgetMonth).padStart(2, '0')}`;
                        if (onCopyBudgets) {
                          onCopyBudgets(prevKey, currentKey, 'month');
                          setBudgetFeedback(
                            `Copied budget limits from ${MONTH_NAMES[prevMonth - 1]} ${prevYear} to ${MONTH_NAMES[budgetMonth - 1]} ${budgetYear}!`
                          );
                          setTimeout(() => setBudgetFeedback(null), 3500);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 font-medium text-[11px] shadow-2xs cursor-pointer"
                      title="Copy previous month's category budgets"
                    >
                      <Copy className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span>Copy Prev Month</span>
                    </button>

                    {/* Copy Previous Year */}
                    <button
                      type="button"
                      onClick={() => {
                        const prevYear = budgetYear - 1;
                        if (onCopyBudgets) {
                          onCopyBudgets(String(prevYear), String(budgetYear), 'year');
                          setBudgetFeedback(
                            `Copied all 12-month budget setups from ${prevYear} into ${budgetYear}!`
                          );
                          setTimeout(() => setBudgetFeedback(null), 3500);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 font-medium text-[11px] shadow-2xs cursor-pointer"
                      title="Copy all months from previous year"
                    >
                      <Repeat className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Copy Prev Year ({budgetYear - 1})</span>
                    </button>

                    {/* Roll Month to Full Year */}
                    <button
                      type="button"
                      onClick={() => {
                        const currentKey = `${budgetYear}-${String(budgetMonth).padStart(2, '0')}`;
                        if (onRolloutYear) {
                          onRolloutYear(currentKey);
                          setBudgetFeedback(
                            `Rolled out ${MONTH_NAMES[budgetMonth - 1]} ${budgetYear} budget targets to all 12 months of ${budgetYear}!`
                          );
                          setTimeout(() => setBudgetFeedback(null), 3500);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 font-medium text-[11px] shadow-2xs cursor-pointer"
                      title="Apply this month's budget to all 12 months"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>Roll to All 12 Months</span>
                    </button>
                  </div>

                  <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                    Period Key: <b>{`${budgetYear}-${String(budgetMonth).padStart(2, '0')}`}</b>
                  </span>
                </div>

                {/* Feedback Toast Banner */}
                {budgetFeedback && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded text-xs flex items-center justify-between animate-in fade-in">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      {budgetFeedback}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBudgetFeedback(null)}
                      className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Category Budgets Grid */}
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {EXPENSE_CATEGORIES.map((cat) => {
                  const currentMonthKey = `${budgetYear}-${String(budgetMonth).padStart(2, '0')}`;
                  const budgetItem = budgets.find((b) => b.category === cat.name);
                  const rawMonthBudget =
                    budgetItem?.periodBudgets?.[currentMonthKey] ?? budgetItem?.monthlyBudget ?? 0;

                  // Compute actual spending in this selected month
                  const actualMonthSpent = transactions
                    .filter(
                      (t) =>
                        t.type === 'expense' &&
                        t.category === cat.name &&
                        t.date.startsWith(currentMonthKey)
                    )
                    .reduce((sum, t) => sum + t.amount, 0);

                  // Compute actual spending in this whole year
                  const actualYearSpent = transactions
                    .filter(
                      (t) =>
                        t.type === 'expense' &&
                        t.category === cat.name &&
                        t.date.startsWith(`${budgetYear}-`)
                    )
                    .reduce((sum, t) => sum + t.amount, 0);

                  // Sum full year budget
                  let fullYearBudget = 0;
                  for (let m = 1; m <= 12; m++) {
                    const mk = `${budgetYear}-${String(m).padStart(2, '0')}`;
                    fullYearBudget +=
                      budgetItem?.periodBudgets?.[mk] ?? budgetItem?.monthlyBudget ?? 0;
                  }

                  const daysInSelectedMonth = new Date(budgetYear, budgetMonth, 0).getDate();

                  // Compute scaled target & spent based on active pacing
                  let pacedTarget = rawMonthBudget;
                  let pacedSpent = actualMonthSpent;
                  let pacingSuffix = '';

                  if (budgetPacing === 'daily') {
                    pacedTarget = rawMonthBudget / daysInSelectedMonth;
                    pacedSpent = actualMonthSpent / daysInSelectedMonth;
                    pacingSuffix = ' / day';
                  } else if (budgetPacing === 'weekly') {
                    pacedTarget = (rawMonthBudget * 12) / 52;
                    pacedSpent = (actualMonthSpent * 12) / 52;
                    pacingSuffix = ' / wk';
                  } else if (budgetPacing === 'year') {
                    pacedTarget = fullYearBudget;
                    pacedSpent = actualYearSpent;
                    pacingSuffix = ' / yr';
                  }

                  const percent = pacedTarget > 0 ? (pacedSpent / pacedTarget) * 100 : 0;
                  const remaining = pacedTarget - pacedSpent;
                  const isOver = pacedSpent > pacedTarget && pacedTarget > 0;
                  const isNear = !isOver && percent >= 75 && pacedTarget > 0;

                  return (
                    <div
                      key={cat.name}
                      onClick={() =>
                        setBudgetDrilldownModal({
                          isOpen: true,
                          category: cat.name,
                          monthKey: currentMonthKey,
                          monthName: MONTH_NAMES[budgetMonth - 1],
                          year: budgetYear,
                          pacedTarget,
                          pacedSpent,
                          remaining,
                          percent,
                          pacingSuffix,
                        })
                      }
                      className="p-2.5 border border-neutral-200 dark:border-neutral-700/80 rounded hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-xs transition bg-white dark:bg-[#1a1e20] cursor-pointer group relative"
                      title={`Click to view itemized transaction drilldown for ${cat.name}`}
                    >
                      <div className="flex flex-wrap items-center justify-between text-xs mb-1.5 gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span className="font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition truncate">
                            {cat.name}
                          </span>
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-normal group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition hidden sm:inline">
                            (click to inspect items)
                          </span>
                          {isOver && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-bold rounded flex items-center gap-1 border border-red-200 dark:border-red-800 shrink-0">
                              <AlertTriangle className="w-3 h-3" />
                              Over Budget
                            </span>
                          )}
                          {isNear && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold rounded border border-amber-300 dark:border-amber-700 flex items-center gap-1 shrink-0">
                              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span>75% Cap Hit</span>
                            </span>
                          )}
                        </div>

                        {/* Budget limit / edit trigger */}
                        <div className="flex items-center gap-1.5 text-[11px] shrink-0 ml-auto">
                          <div className="flex items-center gap-1 font-mono">
                            <span className="text-neutral-500 dark:text-neutral-400">Budget:</span>
                            <span className="font-bold text-neutral-800 dark:text-neutral-200">
                              {formatCurrency(pacedTarget, currencySymbol)}
                              {pacingSuffix}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingBudgetItem({
                                  category: cat.name,
                                  amount: rawMonthBudget.toString(),
                                  scope: 'month',
                                });
                              }}
                              className="text-neutral-400 hover:text-black dark:hover:text-white p-1 rounded transition hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                              title={`Edit budget target for ${cat.name}`}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar matching screenshot image_149afb.png */}
                      <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded overflow-hidden flex border border-neutral-200 dark:border-neutral-700">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isOver ? 'bg-red-600' : isNear ? 'bg-amber-500' : 'bg-emerald-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                        />
                      </div>

                      {/* Spent and Left status row */}
                      <div className="flex justify-between items-center text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 font-mono">
                        <span>
                          Spent: {formatCurrency(pacedSpent, currencySymbol)}
                          {pacingSuffix}
                        </span>
                        <span>
                          {pacedTarget > 0
                            ? `${percent.toFixed(0)}% used · ${
                                remaining >= 0
                                  ? `${formatCurrency(remaining, currencySymbol)}${pacingSuffix} left`
                                  : `${formatCurrency(Math.abs(remaining), currencySymbol)}${pacingSuffix} over`
                              }`
                            : 'No budget set'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 5. RUNNING CASHFLOW BREAKDOWN (INCOME & EXPENSES) ================= */}
      {/* Matches reference screenshot image_149e08.png with Inflow, Outflow, and Net Cashflow */}
      <div
        className={`bg-white dark:bg-[#1e2324] border border-neutral-300 dark:border-neutral-700 shadow-xs ${
          currentTab !== 'analytics' ? 'hidden lg:block' : ''
        }`}
      >
        <div className="bg-[#2d3134] text-white p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <div>
              <h2 className="font-bold text-sm tracking-wide">
                Running Income &amp; Expenses Breakdown
              </h2>
              <span className="text-[10px] text-neutral-300 font-mono block">
                Cash inflows, outflows &amp; net cashflow across periods
              </span>
            </div>
          </div>

          <div className="flex rounded bg-neutral-800 p-0.5 border border-neutral-600 self-start sm:self-auto text-xs">
            <button
              onClick={() => setBreakdownView('daily')}
              className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
                breakdownView === 'daily'
                  ? 'bg-neutral-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Daily View
            </button>
            <button
              onClick={() => setBreakdownView('weekly')}
              className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
                breakdownView === 'weekly'
                  ? 'bg-neutral-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Weekly View
            </button>
            <button
              onClick={() => setBreakdownView('monthly')}
              className={`px-3 py-1 rounded font-semibold transition cursor-pointer ${
                breakdownView === 'monthly'
                  ? 'bg-neutral-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Monthly View
            </button>
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {runningBreakdown.length === 0 ? (
            <div className="col-span-3 text-center py-6 text-neutral-500 italic text-xs">
              No transactions recorded yet for this view.
            </div>
          ) : (
            runningBreakdown.map((group, idx) => {
              const isExpanded = !!expandedCards[group.label];
              const visibleItems = isExpanded ? group.items : group.items.slice(0, 3);
              const remainingCount = group.items.length - 3;

              return (
                <div
                  key={idx}
                  className="border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50 dark:bg-[#1a1e20] p-3 rounded hover:border-neutral-400 dark:hover:border-neutral-600 transition flex flex-col justify-between"
                >
                  <div>
                    {/* Card Header matching screenshot */}
                    <div className="flex justify-between items-center text-xs pb-1.5 border-b border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center gap-1.5 font-bold text-neutral-800 dark:text-neutral-200">
                        <CalendarDays className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                        <span>{group.periodName}</span>
                      </div>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                        {group.count} item{group.count === 1 ? '' : 's'} ({group.incomeCount} in · {group.expenseCount} out)
                      </span>
                    </div>

                    {/* Both Inflows and Outflows calculated and displayed as requested */}
                    <div className="mt-2.5 space-y-1 text-xs">
                      {/* Period Inflow */}
                      <div className="flex justify-between items-baseline font-mono">
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-sans">Period Inflow:</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                          +{formatCurrency(group.inflow, currencySymbol)}
                        </span>
                      </div>

                      {/* Period Outflow (with parens matching reference image) */}
                      <div className="flex justify-between items-baseline font-mono">
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-sans">Period Outflow:</span>
                        <span className="font-bold text-red-700 dark:text-red-400 text-sm">
                          {formatCurrency(-group.outflow, currencySymbol)}
                        </span>
                      </div>

                      {/* Net Cashflow summary badge */}
                      <div className="flex justify-between items-baseline font-mono pt-1 border-t border-neutral-200/60 dark:border-neutral-700/60">
                        <span className="text-[11px] text-neutral-600 dark:text-neutral-300 font-bold font-sans">Net Cashflow:</span>
                        <span
                          className={`font-black text-xs px-1.5 py-0.2 rounded ${
                            group.net >= 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800'
                          }`}
                        >
                          {group.net >= 0 ? '+' : ''}
                          {formatCurrency(group.net, currencySymbol)}
                        </span>
                      </div>
                    </div>

                    {/* Itemized Transactions Preview: Income and Expense entries */}
                    <div className="mt-3 pt-2 border-t border-neutral-200/80 dark:border-neutral-700/80 space-y-1.5">
                      {visibleItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center text-[11px] text-neutral-700 dark:text-neutral-200 bg-white/70 dark:bg-neutral-800/90 px-1.5 py-1 rounded border border-neutral-200/50 dark:border-neutral-700/80"
                        >
                          <div className="flex items-center gap-1.5 truncate max-w-[155px]">
                            <span
                              className={`w-3.5 h-3.5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                item.type === 'income'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                                  : 'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300'
                              }`}
                            >
                              {item.type === 'income' ? '+' : '−'}
                            </span>
                            <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">
                              {item.name || item.category}
                            </span>
                          </div>
                          <span
                            className={`font-mono text-[11px] font-semibold shrink-0 ${
                              item.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-800 dark:text-neutral-200'
                            }`}
                          >
                            {item.type === 'income' ? '+' : ''}
                            {formatCurrency(item.amount, currencySymbol)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expand / Collapse Button if > 3 items */}
                  {group.items.length > 3 && (
                    <div className="mt-2 pt-1 text-right">
                      <button
                        type="button"
                        onClick={() => toggleCardExpanded(group.label)}
                        className="text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                      >
                        {isExpanded
                          ? 'Collapse entries'
                          : `+${remainingCount} more entries (Click to view)`}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= MODAL: BUDGET TARGET & SCOPE ASSIGNMENT ================= */}
      {editingBudgetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1e2324] rounded-lg shadow-xl max-w-md w-full border border-neutral-300 dark:border-neutral-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#16191b]">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                  Assign Category Budget: {editingBudgetItem.category}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingBudgetItem(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const numeric = parseFloat(editingBudgetItem.amount) || 0;
                const currentKey = `${budgetYear}-${String(budgetMonth).padStart(2, '0')}`;
                onUpdateBudget(editingBudgetItem.category, numeric, {
                  scope: editingBudgetItem.scope,
                  monthKey: currentKey,
                  year: budgetYear,
                });
                setBudgetFeedback(
                  `Assigned ${formatCurrency(numeric, currencySymbol)} to ${editingBudgetItem.category} (${
                    editingBudgetItem.scope === 'month'
                      ? `${MONTH_NAMES[budgetMonth - 1]} ${budgetYear} only`
                      : `all 12 months of ${budgetYear}`
                  })!`
                );
                setTimeout(() => setBudgetFeedback(null), 3500);
                setEditingBudgetItem(null);
              }}
              className="p-4 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Budget Target Amount ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  autoFocus
                  placeholder="e.g. 50000"
                  value={editingBudgetItem.amount}
                  onChange={(e) =>
                    setEditingBudgetItem({ ...editingBudgetItem, amount: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded font-mono text-sm font-bold text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:border-neutral-800 dark:focus:border-neutral-500"
                />
              </div>

              {/* Budget Scope Selection */}
              <div className="space-y-2 bg-neutral-50 dark:bg-[#16191b] p-3 rounded border border-neutral-200 dark:border-neutral-700">
                <span className="block font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider text-[10px]">
                  Assignment Scope:
                </span>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="budgetScope"
                    value="month"
                    checked={editingBudgetItem.scope === 'month'}
                    onChange={() =>
                      setEditingBudgetItem({ ...editingBudgetItem, scope: 'month' })
                    }
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                      Apply strictly to {MONTH_NAMES[budgetMonth - 1]} {budgetYear} only
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Keeps budgets for other months untouched.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer pt-1 border-t border-neutral-200 dark:border-neutral-700">
                  <input
                    type="radio"
                    name="budgetScope"
                    value="year"
                    checked={editingBudgetItem.scope === 'year'}
                    onChange={() =>
                      setEditingBudgetItem({ ...editingBudgetItem, scope: 'year' })
                    }
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 block">
                      Roll out for the entire year ({budgetYear} - all 12 months)
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Sets this limit across every month of {budgetYear} and updates default target.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setEditingBudgetItem(null)}
                  className="px-3 py-1.5 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded hover:bg-neutral-50 dark:hover:bg-neutral-700 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-white bg-neutral-900 dark:bg-emerald-600 hover:bg-black dark:hover:bg-emerald-500 rounded font-bold shadow-xs cursor-pointer"
                >
                  Save Budget Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 5. RECURRING EXPENSES ENGINE MODULE ================= */}
      <div
        className={`${
          currentTab !== 'recurring' ? 'hidden lg:block' : ''
        }`}
      >
        <RecurringExpensesModule
          recurringExpenses={recurringExpenses}
          currencySymbol={currencySymbol}
          onPayRecurringExpense={onPayRecurringExpense}
          onAddRecurringExpense={onAddRecurringExpense}
          onUpdateRecurringExpense={onUpdateRecurringExpense}
          onDeleteRecurringExpense={onDeleteRecurringExpense}
        />
      </div>

      {/* ================= 6. ALL TRANSACTIONS LOG TABLE ================= */}
      <div
        className={`bg-white border border-neutral-300 shadow-xs ${
          currentTab !== 'transactions' ? 'hidden lg:block' : ''
        }`}
      >
        <div className="bg-[#2d3134] text-white p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-sm tracking-wide">
              Logged Transactions ({filteredTransactions.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search transaction..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-2 py-1 bg-neutral-800 text-white rounded border border-neutral-600 text-xs focus:outline-hidden"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'income' | 'expense')}
              className="bg-neutral-800 text-white rounded border border-neutral-600 py-1 px-2 text-xs cursor-pointer focus:outline-hidden"
            >
              <option value="all">All Types</option>
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#3f454a] text-white uppercase text-[11px] font-bold select-none">
                <th
                  className="py-2.5 px-3 cursor-pointer hover:bg-neutral-600 transition"
                  onClick={() => handleSort('entryNo')}
                >
                  <div className="flex items-center gap-1">
                    <span>Entry No.</span>
                    {sortField === 'entryNo' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:bg-neutral-600 transition"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    {sortField === 'date' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:bg-neutral-600 transition"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    <span>Transaction Name / Item</span>
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:bg-neutral-600 transition"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-1">
                    <span>Category</span>
                    {sortField === 'category' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:bg-neutral-600 transition"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-1">
                    <span>Type</span>
                    {sortField === 'type' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-neutral-600 transition"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount ({currencySymbol})</span>
                    {sortField === 'amount' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-500 italic">
                    No transactions found matching your search.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    className={`transition hover:bg-blue-50 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'
                    }`}
                  >
                    <td className="py-2 px-3 font-mono whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-300 text-neutral-700 font-bold text-[10px] tracking-tight">
                        {tx.entryNo || `TXN-${String(idx + 1).padStart(4, '0')}`}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-neutral-600 whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                        <span>{tx.name || tx.description || 'Transaction'}</span>
                        {tx.autoGenerated && (
                          <span
                            className="text-[9px] px-1 py-0.2 rounded bg-blue-100 text-blue-700 font-mono font-semibold flex items-center gap-0.5"
                            title="Auto-linked from Wealth (Assets/Liabilities) ledger"
                          >
                            <Link2 className="w-2.5 h-2.5" />
                            Auto-Ledger
                          </span>
                        )}
                      </div>
                      {tx.description && tx.description !== tx.name && (
                        <div className="text-[11px] text-neutral-500 italic truncate max-w-xs">
                          {tx.description}
                        </div>
                      )}
                      {tx.paymentMethod && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-700 font-medium border border-neutral-200">
                            {tx.paymentMethod}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-neutral-700 font-medium">
                      {tx.category}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded font-bold ${
                          tx.type === 'income'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-mono font-bold text-sm ${
                        tx.type === 'income' ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {formatCurrency(tx.type === 'expense' ? -tx.amount : tx.amount, currencySymbol)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => startEditTx(tx)}
                          className="p-1 text-neutral-500 hover:text-blue-600 hover:bg-neutral-100 rounded"
                          title="Edit transaction"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setTxToDelete(tx)}
                          className="p-1 text-neutral-500 hover:text-red-600 hover:bg-neutral-100 rounded"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!txToDelete}
        title="Delete Transaction"
        message={`Are you sure you want to delete the transaction "${txToDelete?.name}" for ${
          txToDelete ? formatCurrency(txToDelete.amount, currencySymbol) : ''
        }? This will immediately update statement totals and running expense balances.`}
        confirmLabel="Delete Entry"
        onConfirm={() => {
          if (txToDelete) {
            onDeleteTransaction(txToDelete.id);
            setTxToDelete(null);
          }
        }}
        onCancel={() => setTxToDelete(null)}
      />

      {/* Category Budget Drilldown Pop-Up Modal */}
      {budgetDrilldownModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1e2324] border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden max-h-[85vh]">
            {/* Modal Header */}
            <div className="bg-[#212529] text-white p-4 flex items-center justify-between border-b border-neutral-700">
              <div>
                <div className="flex items-center gap-2">
                  <ReceiptText className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-base tracking-wide text-white">
                    {budgetDrilldownModal.category} Spending Details
                  </h3>
                </div>
                <p className="text-xs text-neutral-300 font-mono mt-0.5">
                  Itemized transactions for {budgetDrilldownModal.monthName} {budgetDrilldownModal.year} (Period: {budgetDrilldownModal.monthKey})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBudgetDrilldownModal(null)}
                className="text-neutral-400 hover:text-white p-1 rounded transition cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Metrics */}
            <div className="bg-neutral-50 dark:bg-[#16191b] p-3.5 border-b border-neutral-200 dark:border-neutral-700 grid grid-cols-3 gap-2 text-xs font-mono text-center">
              <div className="bg-white dark:bg-[#1a1e20] p-2 border border-neutral-200 dark:border-neutral-700 rounded">
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block uppercase font-sans">Budget Target</span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                  {formatCurrency(budgetDrilldownModal.pacedTarget, currencySymbol)}
                  {budgetDrilldownModal.pacingSuffix}
                </span>
              </div>
              <div className="bg-white dark:bg-[#1a1e20] p-2 border border-neutral-200 dark:border-neutral-700 rounded">
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block uppercase font-sans">Total Spent</span>
                <span className="font-bold text-red-600 dark:text-red-400 text-sm">
                  {formatCurrency(budgetDrilldownModal.pacedSpent, currencySymbol)}
                  {budgetDrilldownModal.pacingSuffix}
                </span>
              </div>
              <div className="bg-white dark:bg-[#1a1e20] p-2 border border-neutral-200 dark:border-neutral-700 rounded">
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block uppercase font-sans">Budget Status</span>
                <span
                  className={`font-bold text-sm ${
                    budgetDrilldownModal.remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {budgetDrilldownModal.remaining >= 0
                    ? `${formatCurrency(budgetDrilldownModal.remaining, currencySymbol)} left`
                    : `${formatCurrency(Math.abs(budgetDrilldownModal.remaining), currencySymbol)} over`}
                  <span className="text-[10px] block text-neutral-500 dark:text-neutral-400 font-normal">
                    ({budgetDrilldownModal.percent.toFixed(0)}% used)
                  </span>
                </span>
              </div>
            </div>

            {/* Filtered Transactions List */}
            <div className="p-4 overflow-y-auto flex-1 bg-white dark:bg-[#1e2324]">
              {(() => {
                const modalCat = budgetDrilldownModal.category;
                const modalMonthKey = budgetDrilldownModal.monthKey;
                const modalYear = budgetDrilldownModal.year;

                const matchedTxs = transactions.filter((t) => {
                  const isExpense = t.type === 'expense';
                  const isCategoryMatch = t.category.toLowerCase() === modalCat.toLowerCase();
                  const isTimeMatch =
                    budgetPacing === 'year'
                      ? t.date.startsWith(`${modalYear}-`)
                      : t.date.startsWith(modalMonthKey);
                  return isExpense && isCategoryMatch && isTimeMatch;
                });

                if (matchedTxs.length === 0) {
                  return (
                    <div className="text-center py-10 text-neutral-500 dark:text-neutral-400">
                      <ReceiptText className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                      <p className="font-semibold text-sm text-neutral-700 dark:text-neutral-300">No transactions recorded</p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 max-w-md mx-auto">
                        There are no expense transactions logged for <b>{modalCat}</b> during{' '}
                        <b>
                          {budgetDrilldownModal.monthName} {modalYear}
                        </b>
                        .
                      </p>
                    </div>
                  );
                }

                const totalMatchedSpent = matchedTxs.reduce((sum, t) => sum + t.amount, 0);

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                      <span>Itemized Expenses ({matchedTxs.length})</span>
                      <span className="font-mono text-red-600 dark:text-red-400">
                        Sum: {formatCurrency(-totalMatchedSpent, currencySymbol)}
                      </span>
                    </div>

                    <div className="divide-y divide-neutral-100 dark:divide-neutral-700/80 border border-neutral-200 dark:border-neutral-700 rounded overflow-hidden shadow-2xs">
                      {matchedTxs.map((t) => (
                        <div
                          key={t.id}
                          className="p-3 bg-white dark:bg-[#1a1e20] hover:bg-neutral-50 dark:hover:bg-neutral-800/80 flex items-center justify-between text-xs transition"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-900 dark:text-neutral-100">{t.name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-mono uppercase border border-neutral-200 dark:border-neutral-700">
                                {t.subCategory}
                              </span>
                            </div>
                            {t.description && (
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 italic">{t.description}</p>
                            )}
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">Logged Date: {t.date}</p>
                          </div>
                          <div className="text-right font-mono font-bold text-red-600 dark:text-red-400 text-sm">
                            {formatCurrency(-t.amount, currencySymbol)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="bg-neutral-100 dark:bg-[#16191b] px-4 py-2.5 border-t border-neutral-200 dark:border-neutral-700 flex justify-end">
              <button
                type="button"
                onClick={() => setBudgetDrilldownModal(null)}
                className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs font-semibold cursor-pointer transition shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OCR Receipt / Bank Slip Capture Modal */}
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
          setFormSuccess(`Auto-filled from ${name}! Please review details and save.`);
          setTimeout(() => setFormSuccess(null), 4000);
        }}
      />
    </div>
  );
};
