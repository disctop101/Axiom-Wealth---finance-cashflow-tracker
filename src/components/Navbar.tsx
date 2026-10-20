import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  FileText,
  Wallet,
  ReceiptText,
  EyeOff,
  Settings,
  User as UserIcon,
  Bell,
  TrendingUp,
  Calculator,
  ChevronDown,
  LogOut,
  LogIn,
  AlertTriangle,
  Clock,
  DollarSign,
  ArrowRight,
  HelpCircle,
  BookOpen,
  Moon,
  Sun,
  Shield,
  PlusCircle,
} from 'lucide-react';
import {
  CurrencyConfig,
  RecurringExpenseItem,
  CategoryBudget,
  TransactionItem,
  PaymentMethodType,
  formatCurrency,
} from '../types/finance';
import {
  computeRecurringStatus,
  PayRecurringModal,
  RecurringStatusItem,
} from './RecurringExpensesSection';
import { useTooltips } from '../context/TooltipContext';
import { useTheme } from '../context/ThemeContext';
import { Tooltip } from './Tooltip';

export type AppNavTab =
  | 'dashboard'
  | 'income-expenses'
  | 'wealth'
  | 'settings'
  | 'assets'
  | 'liabilities'
  | 'analytics'
  | 'purchase-checker'
  | 'stock-dividend-calculator'
  | 'notifications';

interface NavbarProps {
  activeTab: AppNavTab;
  setActiveTab: (tab: AppNavTab) => void;
  currency: CurrencyConfig;
  user: User | null;
  onOpenAuthModal?: () => void;
  onSignOut?: () => void;
  onToggleHide?: () => void;
  userName?: string;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean | ((prev: boolean) => boolean)) => void;
  recurringExpenses?: RecurringExpenseItem[];
  budgets?: CategoryBudget[];
  transactions?: TransactionItem[];
  onPayRecurringExpense?: (
    id: string,
    instanceAmount: number,
    paymentMethod?: PaymentMethodType,
    paidDate?: string
  ) => Promise<void> | void;
  onQuickLog?: () => void;
  onOpenHelp?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currency,
  user,
  onOpenAuthModal,
  onSignOut,
  onToggleHide,
  userName,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  recurringExpenses = [],
  budgets = [],
  transactions = [],
  onPayRecurringExpense,
  onQuickLog,
  onOpenHelp,
}) => {
  // Dropdown states for Desktop & Header
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Quick Pay Modal from Bell Dropdown
  const [payModalItem, setPayModalItem] = useState<RecurringExpenseItem | null>(null);

  // Master platform-wide tooltips toggle
  const { tooltipsEnabled, toggleTooltips } = useTooltips();
  // Master Dark/Light Mode toggle
  const { theme, isDark, toggleTheme } = useTheme();

  const navContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        navContainerRef.current &&
        !navContainerRef.current.contains(e.target as Node)
      ) {
        setIsToolsOpen(false);
        setIsBellOpen(false);
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectTab = (tab: AppNavTab) => {
    setActiveTab(tab);
    setIsToolsOpen(false);
    setIsBellOpen(false);
    setIsProfileOpen(false);
    if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
  };

  const handleTriggerQuickLog = () => {
    setIsToolsOpen(false);
    setIsBellOpen(false);
    setIsProfileOpen(false);
    if (setIsMobileMenuOpen) setIsMobileMenuOpen(false);
    if (onQuickLog) {
      onQuickLog();
    } else {
      setActiveTab('income-expenses');
    }
  };

  // Synchronized Reviewed Notification IDs from localStorage
  const STORAGE_KEY_REVIEWED = 'finance_tracker_notifications_reviewed_v1';
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_REVIEWED);
      if (raw) return new Set(JSON.parse(raw));
    } catch {
      // ignore
    }
    return new Set<string>();
  });

  useEffect(() => {
    const handleSyncReviewed = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_REVIEWED);
        if (raw) setReviewedIds(new Set(JSON.parse(raw)));
        else setReviewedIds(new Set());
      } catch {
        // ignore
      }
    };

    window.addEventListener('notifications_reviewed_changed', handleSyncReviewed);
    window.addEventListener('storage', handleSyncReviewed);
    return () => {
      window.removeEventListener('notifications_reviewed_changed', handleSyncReviewed);
      window.removeEventListener('storage', handleSyncReviewed);
    };
  }, []);

  // Compute Active Notifications & Alerts (excluding reviewed items)
  const today = useMemo(() => new Date(), []);

  // 1. Recurring Bills due within 5 days or overdue (excluding reviewed)
  const urgentBills = useMemo<RecurringStatusItem[]>(() => {
    if (!recurringExpenses || recurringExpenses.length === 0) return [];
    return recurringExpenses
      .map((item) => computeRecurringStatus(item, today))
      .filter((s) => s.diffDays <= 5 && !reviewedIds.has(s.id))
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [recurringExpenses, today, reviewedIds]);

  // 2. Budget Cap Warnings (>= 75% for current month, excluding reviewed)
  const currentMonthNum = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const budgetAlerts = useMemo(() => {
    if (!budgets || !transactions) return [];
    const alerts: Array<{
      id: string;
      category: string;
      spent: number;
      budget: number;
      ratio: number;
    }> = [];

    budgets.forEach((b) => {
      const alertId = `budget-${b.category}-${currentMonthKey}`;
      if (reviewedIds.has(alertId)) return;

      const budgetAmount = b.periodBudgets?.[currentMonthKey] ?? b.monthlyBudget;
      if (budgetAmount <= 0) return;

      const spent = transactions
        .filter((t) => {
          if (t.type !== 'expense') return false;
          if (t.category.toLowerCase() !== b.category.toLowerCase()) return false;
          return t.date.startsWith(currentMonthKey);
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const ratio = spent / budgetAmount;
      if (ratio >= 0.75) {
        alerts.push({
          id: alertId,
          category: b.category,
          spent,
          budget: budgetAmount,
          ratio,
        });
      }
    });

    return alerts;
  }, [budgets, transactions, currentMonthKey, reviewedIds]);

  const totalAlertCount = urgentBills.length + budgetAlerts.length;

  return (
    <>
      <header
        ref={navContainerRef}
        className="bg-[#212529] text-white border-b border-neutral-700 fixed top-0 left-0 right-0 z-50 select-none shadow-md print:hidden overflow-visible"
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          {/* ================= DESKTOP NAVBAR (md and up) ================= */}
          <div className="hidden md:flex items-center justify-between h-14 gap-2">
            {/* Logo & Brand Title */}
            <div
              onClick={() => handleSelectTab('dashboard')}
              className="flex items-center gap-2.5 shrink-0 cursor-pointer group"
            >
              <img
                src="/logo.png"
                alt="Axiom Wealth Logo"
                className="h-8 w-auto object-contain rounded shadow-xs group-hover:scale-105 transition"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fb = e.currentTarget.parentElement?.querySelector('.logo-fallback');
                  if (fb) fb.classList.remove('hidden');
                }}
              />
              <div className="logo-fallback hidden flex items-center justify-center w-8 h-8 rounded bg-neutral-800 border border-neutral-600 font-bold text-emerald-400 text-sm font-mono shadow-inner">
                {currency.symbol}
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold tracking-wider text-sm text-neutral-100 uppercase whitespace-nowrap">
                  Axiom Wealth
                </span>
                <span className="text-[9px] text-neutral-400 font-medium tracking-tight hidden xl:inline">
                  Professional Personal Ledger
                </span>
              </div>
            </div>

            {/* Navigation Links (Financial Statement, Income & Expenses, Wealth, and Tools dropdown exclusively) */}
            <nav className="flex items-center gap-1.5 shrink-0">
              {/* Tab 1: Financial Statement */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => handleSelectTab('dashboard')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold tracking-wide transition shrink-0 cursor-pointer ${
                    activeTab === 'dashboard'
                      ? 'bg-neutral-800 text-white shadow-xs border border-neutral-600'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="whitespace-nowrap">Financial Statement</span>
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2.5 py-1 bg-neutral-900 text-neutral-200 text-[11px] rounded shadow-xl border border-neutral-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 font-normal">
                  Personal Income Statement, Cashflow &amp; Balance Sheet
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-neutral-900" />
                </div>
              </div>

              {/* Tab 2: Income & Expenses */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => handleSelectTab('income-expenses')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold tracking-wide transition shrink-0 cursor-pointer ${
                    activeTab === 'income-expenses'
                      ? 'bg-neutral-800 text-white shadow-xs border border-neutral-600'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                  }`}
                >
                  <ReceiptText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="whitespace-nowrap">Income &amp; Expenses</span>
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2.5 py-1 bg-neutral-900 text-neutral-200 text-[11px] rounded shadow-xl border border-neutral-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 font-normal">
                  Log transactions, analyze cashflow pace, recurring engine &amp; budget targets
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-neutral-900" />
                </div>
              </div>

              {/* Tab 3: Wealth */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => handleSelectTab('wealth')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold tracking-wide transition shrink-0 cursor-pointer ${
                    activeTab === 'wealth' || activeTab === 'assets' || activeTab === 'liabilities'
                      ? 'bg-neutral-800 text-white shadow-xs border border-neutral-600'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="whitespace-nowrap">Wealth</span>
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2.5 py-1 bg-neutral-900 text-neutral-200 text-[11px] rounded shadow-xl border border-neutral-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50 font-normal">
                  Portfolio assets, property values, liabilities &amp; net worth
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-neutral-900" />
                </div>
              </div>

              {/* Tab 4: Tools Dropdown Menu (Exclusive Home for Analytics & Purchase Checker) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsOpen((prev) => !prev);
                    setIsBellOpen(false);
                    setIsProfileOpen(false);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold tracking-wide transition shrink-0 cursor-pointer ${
                    activeTab === 'analytics' || activeTab === 'purchase-checker' || isToolsOpen
                      ? 'bg-neutral-800 text-white shadow-xs border border-neutral-600'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                  }`}
                  aria-expanded={isToolsOpen}
                >
                  <Calculator className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="whitespace-nowrap">Tools</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isToolsOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Tools Dropdown Content */}
                {isToolsOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl py-1.5 z-50 animate-in fade-in-50 duration-100 divide-y divide-neutral-800">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Financial Utilities
                    </div>
                    <div className="py-1">
                      {/* Tool 1: Analytics (Stock-Market Trends & Financial Telemetry) */}
                      <button
                        type="button"
                        onClick={() => handleSelectTab('analytics')}
                        className={`w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-neutral-800 transition cursor-pointer ${
                          activeTab === 'analytics' ? 'bg-neutral-800/80 font-bold' : ''
                        }`}
                      >
                        <TrendingUp className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-semibold text-neutral-100">Analytics</div>
                          <div className="text-[10px] text-neutral-400 leading-tight">
                            Stock-Market Style Trends &amp; Telemetry
                          </div>
                        </div>
                      </button>

                      {/* Tool 2: Purchase Checker (10x Affordability Evaluator) */}
                      <button
                        type="button"
                        onClick={() => handleSelectTab('purchase-checker')}
                        className={`w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-neutral-800 transition cursor-pointer ${
                          activeTab === 'purchase-checker' ? 'bg-neutral-800/80 font-bold' : ''
                        }`}
                      >
                        <Shield className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-semibold text-neutral-100">Purchase Checker</div>
                          <div className="text-[10px] text-neutral-400 leading-tight">
                            10x Rule Affordability &amp; Impulse Evaluator
                          </div>
                        </div>
                      </button>

                      {/* Tool 3: Stock & Dividend Calculator */}
                      <button
                        type="button"
                        onClick={() => handleSelectTab('stock-dividend-calculator')}
                        className={`w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-neutral-800 transition cursor-pointer ${
                          activeTab === 'stock-dividend-calculator' ? 'bg-neutral-800/80 font-bold' : ''
                        }`}
                      >
                        <Calculator className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-semibold text-neutral-100">Stock &amp; Dividend Calculator</div>
                          <div className="text-[10px] text-neutral-400 leading-tight">
                            DRIP Compounding &amp; Yield Projections
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* Right Controls: Quick Log, Master Tooltip Toggle, Help & Guide, Hide Nav Toggle, Bell Icon, User Profile Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Universal Prominent 'Quick Log' Button */}
              <Tooltip content="Quickly log an income deposit or expense outflow" position="bottom">
                <button
                  type="button"
                  onClick={handleTriggerQuickLog}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-md text-xs shadow-sm transition hover:scale-105 active:scale-95 cursor-pointer"
                  title="Quick Log Transaction (Income or Expense)"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>Quick Log</span>
                </button>
              </Tooltip>




              {/* Hide Navigation Toggle Button */}
              {onToggleHide && (
                <button
                  type="button"
                  onClick={onToggleHide}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 rounded text-xs font-medium transition cursor-pointer"
                  title="Hide navigation bar for a distraction-free view"
                >
                  <EyeOff className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="hidden xl:inline">Hide Menu</span>
                </button>
              )}

              {/* Notification Bell with Red Badge Counter */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsBellOpen((prev) => !prev);
                    setIsToolsOpen(false);
                    setIsProfileOpen(false);
                  }}
                  className="relative flex items-center justify-center w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 transition cursor-pointer group shadow-xs hover:border-amber-400 shrink-0"
                  aria-label="Notifications and Alerts"
                  title={`${totalAlertCount} active alerts`}
                >
                  <Bell className="w-4 h-4 text-neutral-300 group-hover:text-amber-400 transition" />
                  {totalAlertCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[17px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-extrabold shadow-sm ring-2 ring-neutral-900 animate-pulse">
                      {totalAlertCount > 9 ? '9+' : totalAlertCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Menu */}
                {isBellOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl overflow-hidden z-50 animate-in fade-in-50 duration-100">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-800/90 border-b border-neutral-700">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-xs text-white">Notifications &amp; Alerts</span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-700 text-rose-300">
                        {totalAlertCount} Active
                      </span>
                    </div>

                    {/* Scrollable Alert List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-neutral-800 text-xs">
                      {totalAlertCount === 0 ? (
                        <div className="p-6 text-center text-neutral-400 space-y-1">
                          <Clock className="w-6 h-6 text-emerald-400 mx-auto mb-1 opacity-75" />
                          <p className="font-medium text-neutral-200">All clear!</p>
                          <p className="text-[11px] text-neutral-400">
                            No bills due soon and all budget categories are comfortably below cap.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Urgent Recurring Bills */}
                          {urgentBills.length > 0 && (
                            <div>
                              <div className="px-3 py-1 bg-neutral-800/40 text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                                <span>Upcoming Bills ({urgentBills.length})</span>
                                <span className="text-[9px] font-normal text-amber-400">Due &le; 5 days</span>
                              </div>
                              {urgentBills.map((u) => {
                                const isOverdue = u.diffDays < 0;
                                const isToday = u.diffDays === 0;

                                return (
                                  <div
                                    key={u.id}
                                    className="p-3 hover:bg-neutral-800/50 transition flex items-center justify-between gap-2.5"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-semibold text-neutral-100 truncate">
                                          {u.name}
                                        </span>
                                        <span
                                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                            isOverdue
                                              ? 'bg-rose-950/80 text-rose-300 border border-rose-700'
                                              : isToday
                                              ? 'bg-amber-950/80 text-amber-300 border border-amber-700'
                                              : 'bg-yellow-950/80 text-yellow-300 border border-yellow-700'
                                          }`}
                                        >
                                          {isOverdue
                                            ? `Overdue (${Math.abs(u.diffDays)}d)`
                                            : isToday
                                            ? 'Due Today'
                                            : `Due in ${u.diffDays}d`}
                                        </span>
                                      </div>
                                      <div className="text-[10px] text-neutral-400 flex items-center gap-2 mt-0.5">
                                        <span>{u.category}</span>
                                        <span>&bull;</span>
                                        <span className="font-mono font-medium text-neutral-300">
                                          {formatCurrency(u.amount, currency.symbol)}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Quick Pay Button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPayModalItem(u);
                                        setIsBellOpen(false);
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] transition shadow-xs cursor-pointer shrink-0 flex items-center gap-1"
                                      title="Record payment for this bill"
                                    >
                                      <DollarSign className="w-3 h-3" />
                                      <span>Pay</span>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Budget Cap Warnings */}
                          {budgetAlerts.length > 0 && (
                            <div>
                              <div className="px-3 py-1 bg-neutral-800/40 text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                                <span>Budget Alerts ({budgetAlerts.length})</span>
                                <span className="text-[9px] font-normal text-rose-400">&ge; 75% cap hit</span>
                              </div>
                              {budgetAlerts.map((b) => (
                                <div
                                  key={b.category}
                                  className="p-3 hover:bg-neutral-800/50 transition flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      <span className="font-semibold text-neutral-100 truncate">
                                        {b.category}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-neutral-400 mt-0.5">
                                      Spent {formatCurrency(b.spent, currency.symbol)} of{' '}
                                      {formatCurrency(b.budget, currency.symbol)} ({Math.round(b.ratio * 100)}%)
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-bold text-amber-400 font-mono shrink-0">
                                    {Math.round(b.ratio * 100)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Footer Link to Dedicated Notifications Page */}
                    <div className="p-2 bg-neutral-800/90 border-t border-neutral-700 text-center">
                      <button
                        type="button"
                        onClick={() => handleSelectTab('notifications')}
                        className="w-full py-1.5 px-3 bg-neutral-700/60 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded text-[11px] font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>View All Notifications &amp; History</span>
                        <ArrowRight className="w-3 h-3 text-emerald-400" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Avatar with Dropdown Menu (Home for Settings & Utilities) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen((prev) => !prev);
                    setIsToolsOpen(false);
                    setIsBellOpen(false);
                  }}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 transition cursor-pointer group shadow-xs hover:border-emerald-500 shrink-0"
                  title={user ? `Signed in as ${user.displayName || user.email}` : 'User Profile & Menu'}
                  aria-label="User Profile and Menu"
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-full h-full rounded-full object-cover ring-1 ring-emerald-500"
                    />
                  ) : user ? (
                    <div className="w-full h-full rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-full bg-neutral-700 text-neutral-300 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
                    </div>
                  )}
                </button>

                {/* User Profile Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-64 bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl py-1.5 z-50 animate-in fade-in-50 duration-100 text-xs">
                    {/* User Identity Header */}
                    <div className="px-3.5 py-2.5 border-b border-neutral-800">
                      <div className="font-bold text-neutral-100 truncate">
                        {user?.displayName || userName || 'Guest User'}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        {user?.email || 'Local Offline Mode'}
                      </div>
                      <div className="mt-1.5 inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-950/80 border border-emerald-700/80 text-emerald-300">
                        {user ? 'Cloud Synchronized' : 'Local Storage Mode'}
                      </div>
                    </div>

                    {/* Navigation Items in User Profile Dropdown */}
                    <div className="py-1">
                      {/* Notifications Link */}
                      <button
                        type="button"
                        onClick={() => handleSelectTab('notifications')}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-neutral-800 transition cursor-pointer ${
                          activeTab === 'notifications' ? 'bg-neutral-800/80 font-bold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 text-neutral-200">
                          <Bell className="w-4 h-4 text-amber-400" />
                          <span>Notifications</span>
                        </div>
                        {totalAlertCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-rose-950/90 border border-rose-700 text-rose-300 text-[10px] font-bold">
                            {totalAlertCount}
                          </span>
                        )}
                      </button>

                      {/* Settings & Utilities Link */}
                      <button
                        type="button"
                        onClick={() => handleSelectTab('settings')}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-neutral-800 transition cursor-pointer ${
                          activeTab === 'settings' ? 'bg-neutral-800/80 font-bold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 text-neutral-200">
                          <Settings className="w-4 h-4 text-emerald-400" />
                          <span>Settings &amp; Utilities</span>
                        </div>
                        <span className="text-[10px] text-neutral-400">Manage</span>
                      </button>

                      {/* Master Help & Guide Link */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          if (onOpenHelp) onOpenHelp();
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-neutral-800 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2 text-neutral-200">
                          <BookOpen className="w-4 h-4 text-emerald-400" />
                          <span>Help &amp; Guide</span>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-mono">Master Docs</span>
                      </button>

                      {/* Tooltips Master Switch */}
                      <button
                        type="button"
                        onClick={() => {
                          toggleTooltips();
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-neutral-800 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2 text-neutral-200">
                          <HelpCircle className={`w-4 h-4 ${tooltipsEnabled ? 'text-emerald-400' : 'text-neutral-500'}`} />
                          <span>Hover Tooltips</span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          tooltipsEnabled
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                        }`}>
                          {tooltipsEnabled ? 'ON' : 'OFF'}
                        </span>
                      </button>

                      {/* Theme Toggle (Dark / Light) */}
                      <button
                        type="button"
                        onClick={() => {
                          toggleTheme();
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-neutral-800 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2 text-neutral-200">
                          {isDark ? (
                            <Moon className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <Sun className="w-4 h-4 text-amber-400" />
                          )}
                          <span>Theme Mode</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                          isDark
                            ? 'bg-neutral-800 text-cyan-300 border border-cyan-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-700'
                        }`}>
                          {isDark ? 'DARK' : 'LIGHT'}
                        </span>
                      </button>
                    </div>

                    {/* Authentication Section */}
                    <div className="border-t border-neutral-800 pt-1 mt-1">
                      {user ? (
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileOpen(false);
                            if (onSignOut) onSignOut();
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-rose-400 hover:bg-rose-950/30 transition cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileOpen(false);
                            if (onOpenAuthModal) onOpenAuthModal();
                          }}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-emerald-400 hover:bg-emerald-950/30 transition cursor-pointer"
                        >
                          <LogIn className="w-4 h-4" />
                          <span>Sign In / Register</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================= MOBILE NAVBAR HEADER ================= */}
          <div className="flex md:hidden items-center justify-between h-12 w-full">
            {/* Mobile Brand */}
            <div
              onClick={() => handleSelectTab('dashboard')}
              className="flex items-center gap-2 cursor-pointer"
            >
              <img
                src="/logo.png"
                alt="Axiom Wealth Logo"
                className="h-7 w-auto object-contain rounded"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fb = e.currentTarget.parentElement?.querySelector('.mobile-logo-fallback');
                  if (fb) fb.classList.remove('hidden');
                }}
              />
              <div className="mobile-logo-fallback hidden flex items-center justify-center w-7 h-7 rounded bg-neutral-800 border border-neutral-600 font-bold text-emerald-400 text-xs font-mono">
                {currency.symbol}
              </div>
              <span className="font-extrabold tracking-wider text-xs text-neutral-100 uppercase">
                Axiom Wealth
              </span>
            </div>

            {/* Mobile Right Controls: Universal 'Quick Log', Bell, User Profile Icon (No redundant hamburger icon!) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Universal Prominent 'Quick Log' Button for Mobile */}
              <button
                type="button"
                onClick={handleTriggerQuickLog}
                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded text-xs shadow-xs transition active:scale-95 cursor-pointer"
                title="Quick Log Transaction"
                aria-label="Quick Log Transaction"
              >
                <PlusCircle className="w-3.5 h-3.5 text-white shrink-0" />
                <span>Log</span>
              </button>

              {/* Mobile Notification Bell */}
              <button
                type="button"
                onClick={() => handleSelectTab('notifications')}
                className="relative flex items-center justify-center w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-neutral-200 transition cursor-pointer"
                aria-label="Notifications"
                title={`${totalAlertCount} active alerts`}
              >
                <Bell className="w-3.5 h-3.5 text-neutral-300" />
                {totalAlertCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[14px] h-3.5 px-0.5 rounded-full bg-rose-600 text-white text-[8px] font-extrabold ring-1 ring-neutral-900 animate-pulse">
                    {totalAlertCount > 9 ? '9+' : totalAlertCount}
                  </span>
                )}
              </button>

              {/* User Profile Avatar / Icon */}
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen((prev) => !prev);
                  setIsToolsOpen(false);
                  setIsBellOpen(false);
                }}
                className="flex items-center justify-center p-1 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-neutral-200 transition cursor-pointer"
                aria-label="Account & Settings"
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-emerald-500"
                  />
                ) : user ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-300">
                    <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Profile Dropdown when toggled on mobile */}
        {isProfileOpen && (
          <div className="md:hidden border-t border-neutral-700 bg-neutral-900 px-4 py-3 space-y-2 shadow-2xl animate-in slide-in-from-top-2 duration-150">
            <div className="border-b border-neutral-800 pb-2">
              <div className="font-bold text-neutral-100 text-xs">
                {user?.displayName || userName || 'Guest User'}
              </div>
              <div className="text-[10px] text-neutral-400">
                {user?.email || 'Local Offline Mode'}
              </div>
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleSelectTab('notifications')}
                className="w-full flex items-center justify-between py-2 text-neutral-200 text-xs hover:bg-neutral-800 px-2 rounded transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span>Notifications</span>
                </div>
                {totalAlertCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-900 text-rose-200 text-[10px] font-bold">
                    {totalAlertCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSelectTab('settings')}
                className="w-full flex items-center justify-between py-2 text-neutral-200 text-xs hover:bg-neutral-800 px-2 rounded transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-emerald-400" />
                  <span>Settings &amp; Utilities</span>
                </div>
              </button>

              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    if (onSignOut) onSignOut();
                  }}
                  className="w-full flex items-center gap-2 py-2 text-rose-400 text-xs hover:bg-rose-950/30 px-2 rounded transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    if (onOpenAuthModal) onOpenAuthModal();
                  }}
                  className="w-full flex items-center gap-2 py-2 text-emerald-400 text-xs hover:bg-emerald-950/30 px-2 rounded transition cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In / Register</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Pay Recurring Modal triggered directly from Bell Dropdown */}
      {payModalItem && onPayRecurringExpense && (
        <PayRecurringModal
          item={payModalItem}
          currencySymbol={currency.symbol}
          onClose={() => setPayModalItem(null)}
          onConfirm={async (id, instanceAmount, paymentMethod, paidDate) => {
            await onPayRecurringExpense(id, instanceAmount, paymentMethod, paidDate);
            setPayModalItem(null);
          }}
        />
      )}
    </>
  );
};
