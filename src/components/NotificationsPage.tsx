import React, { useState, useMemo, useEffect } from 'react';
import {
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
import {
  Bell,
  Clock,
  AlertTriangle,
  AlertCircle,
  DollarSign,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  Check,
  Target,
  Eye,
  EyeOff,
  ArrowUpDown,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { Tooltip } from './Tooltip';

interface NotificationsPageProps {
  recurringExpenses: RecurringExpenseItem[];
  currencySymbol: string;
  budgets: CategoryBudget[];
  transactions: TransactionItem[];
  onOpenHelp?: () => void;
  onPayRecurringExpense?: (
    id: string,
    instanceAmount: number,
    paymentMethod?: PaymentMethodType,
    paidDate?: string
  ) => Promise<void> | void;
  onNavigateToBudgets?: () => void;
}

type TimeWindowFilter = 'all' | 'day' | 'week' | 'month' | 'year' | 'custom';
type ReviewFilter = 'all' | 'active' | 'reviewed';
type SortOrder = 'newest' | 'oldest';

const STORAGE_KEY_REVIEWED = 'finance_tracker_notifications_reviewed_v1';

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  recurringExpenses,
  currencySymbol,
  budgets,
  transactions,
  onOpenHelp,
  onPayRecurringExpense,
  onNavigateToBudgets,
}) => {
  // Navigation tabs: Category filter
  const [filterType, setFilterType] = useState<'all' | 'bills' | 'budgets'>('all');
  
  // Review Status Filter: Active vs. Reviewed
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all');
  
  // Date Sort Order: Newest vs. Oldest
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // Time Window Selector
  const [timeWindow, setTimeWindow] = useState<TimeWindowFilter>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const [selectedPayItem, setSelectedPayItem] = useState<RecurringExpenseItem | null>(null);

  // Persistent Reviewed IDs state
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_REVIEWED);
      if (raw) return new Set(JSON.parse(raw));
    } catch {
      // ignore
    }
    return new Set<string>();
  });

  // Save reviewedIds changes to localStorage and broadcast to Navbar
  const toggleReviewed = (id: string) => {
    setReviewedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem(STORAGE_KEY_REVIEWED, JSON.stringify(Array.from(next)));
        window.dispatchEvent(new Event('notifications_reviewed_changed'));
      } catch (e) {
        console.error('Error saving reviewed notification status:', e);
      }
      return next;
    });
  };

  // Compute status for all recurring expenses
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);

  const allRecurringWithStatus = useMemo<RecurringStatusItem[]>(() => {
    return recurringExpenses.map((item) => computeRecurringStatus(item, today));
  }, [recurringExpenses, today]);

  // Urgent bill items: diffDays <= 5 (overdue, due today, or due within 5 days)
  const urgentBills = useMemo(() => {
    return allRecurringWithStatus.filter((item) => item.diffDays <= 5);
  }, [allRecurringWithStatus]);

  // Compute 75% budget cap hits for the current month
  const currentMonthNum = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const budgetAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      category: string;
      spent: number;
      budget: number;
      ratio: number;
      remaining: number;
      date: string;
    }> = [];

    budgets.forEach((b) => {
      const budgetAmount =
        b.periodBudgets?.[currentMonthKey] ?? b.monthlyBudget;
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
          id: `budget-${b.category}-${currentMonthKey}`,
          category: b.category,
          spent,
          budget: budgetAmount,
          ratio,
          remaining: Math.max(0, budgetAmount - spent),
          date: todayStr, // Active budget alerts anchor to current date
        });
      }
    });

    return alerts;
  }, [budgets, transactions, currentMonthKey, todayStr]);

  // Time window bounds calculation
  const timeWindowBounds = useMemo<{ start: string; end: string } | null>(() => {
    if (timeWindow === 'all') return null;

    const y = today.getFullYear();
    const m = today.getMonth();

    if (timeWindow === 'day') {
      return { start: todayStr, end: todayStr };
    } else if (timeWindow === 'week') {
      const day = today.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0],
      };
    } else if (timeWindow === 'month') {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      };
    } else if (timeWindow === 'year') {
      return {
        start: `${y}-01-01`,
        end: `${y}-12-31`,
      };
    } else if (timeWindow === 'custom') {
      if (customStartDate && customEndDate) {
        return { start: customStartDate, end: customEndDate };
      }
    }
    return null;
  }, [timeWindow, customStartDate, customEndDate, today, todayStr]);

  // Filter bills based on review status, category tab, and time window
  const filteredBills = useMemo(() => {
    let list = [...urgentBills];

    // Time window filter
    if (timeWindowBounds) {
      list = list.filter((b) => {
        const itemDate = b.nextDueDate;
        return itemDate >= timeWindowBounds.start && itemDate <= timeWindowBounds.end;
      });
    }

    // Review status filter
    if (reviewFilter === 'active') {
      list = list.filter((b) => !reviewedIds.has(b.id));
    } else if (reviewFilter === 'reviewed') {
      list = list.filter((b) => reviewedIds.has(b.id));
    }

    // Sort order
    list.sort((a, b) => {
      const diff = a.nextDueDate.localeCompare(b.nextDueDate);
      return sortOrder === 'newest' ? -diff : diff;
    });

    return list;
  }, [urgentBills, timeWindowBounds, reviewFilter, reviewedIds, sortOrder]);

  // Filter budget alerts based on review status, category tab, and time window
  const filteredBudgetAlerts = useMemo(() => {
    let list = [...budgetAlerts];

    // Time window filter
    if (timeWindowBounds) {
      list = list.filter((a) => {
        return a.date >= timeWindowBounds.start && a.date <= timeWindowBounds.end;
      });
    }

    // Review status filter
    if (reviewFilter === 'active') {
      list = list.filter((a) => !reviewedIds.has(a.id));
    } else if (reviewFilter === 'reviewed') {
      list = list.filter((a) => reviewedIds.has(a.id));
    }

    // Sort order (ratio / date)
    list.sort((a, b) => {
      const diff = b.ratio - a.ratio;
      return sortOrder === 'newest' ? diff : -diff;
    });

    return list;
  }, [budgetAlerts, timeWindowBounds, reviewFilter, reviewedIds, sortOrder]);

  const totalActiveCount = useMemo(() => {
    const unreviewedBills = urgentBills.filter((b) => !reviewedIds.has(b.id)).length;
    const unreviewedBudgets = budgetAlerts.filter((a) => !reviewedIds.has(a.id)).length;
    return unreviewedBills + unreviewedBudgets;
  }, [urgentBills, budgetAlerts, reviewedIds]);

  const totalRenderedCount = filteredBills.length + filteredBudgetAlerts.length;

  const handleConfirmPay = async (
    id: string,
    instanceAmount: number,
    paymentMethod: PaymentMethodType,
    paidDate: string
  ) => {
    if (onPayRecurringExpense) {
      await onPayRecurringExpense(id, instanceAmount, paymentMethod, paidDate);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto select-none">
      {/* ================= PAGE HEADER ================= */}
      <div className="bg-[#1e2324] text-white p-4 rounded-lg border border-neutral-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-950/80 border border-red-500/80 flex items-center justify-center text-red-400">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-wide uppercase text-white">
              Notifications &amp; Alert Center
            </h1>
            <p className="text-xs text-neutral-400">
              Automated reminders for due recurring commitments, bill cycles &amp; budget spending caps
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {onOpenHelp && (
            <Tooltip content="Open operational guide and button explanations for Notifications & Alert Center">
              <button
                type="button"
                onClick={onOpenHelp}
                className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold shadow-xs transition border border-neutral-700"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>Guide</span>
              </button>
            </Tooltip>
          )}

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-lg border border-neutral-700 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded font-semibold transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-neutral-700 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              All Alerts ({urgentBills.length + budgetAlerts.length})
            </button>
          <button
            type="button"
            onClick={() => setFilterType('bills')}
            className={`px-3 py-1.5 rounded font-semibold transition cursor-pointer ${
              filterType === 'bills'
                ? 'bg-neutral-700 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Due Bills ({urgentBills.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('budgets')}
            className={`px-3 py-1.5 rounded font-semibold transition cursor-pointer ${
              filterType === 'budgets'
                ? 'bg-neutral-700 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Budget Caps ({budgetAlerts.length})
          </button>
        </div>
      </div>
    </div>

      {/* ================= CONTROLS TOOLBAR: REVIEW FILTER + TIME WINDOW + SORTING ================= */}
      <div className="bg-white p-3 rounded-lg border border-neutral-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Left: Review Status Filter */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-md border border-neutral-200">
          <span className="text-[10px] uppercase font-bold text-neutral-500 px-1.5">Status:</span>
          {(['all', 'active', 'reviewed'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setReviewFilter(mode)}
              className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition cursor-pointer ${
                reviewFilter === mode
                  ? 'bg-white text-neutral-900 shadow-2xs font-bold border border-neutral-300'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {mode === 'active' ? 'Active / Unreviewed' : mode}
            </button>
          ))}
        </div>

        {/* Center: Standard Time Window Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-neutral-500">Window:</span>
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-md border border-neutral-200">
            {(['all', 'day', 'week', 'month', 'year', 'custom'] as const).map((tw) => (
              <button
                key={tw}
                type="button"
                onClick={() => setTimeWindow(tw)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize transition cursor-pointer ${
                  timeWindow === tw
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {tw === 'all' ? 'All Time' : tw}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers when 'custom' is active */}
          {timeWindow === 'custom' && (
            <div className="flex items-center gap-1 bg-neutral-50 px-2 py-1 rounded border border-neutral-200 text-[11px]">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-neutral-300 rounded px-1.5 py-0.5 font-mono text-[11px]"
              />
              <span className="text-neutral-400">&rarr;</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-neutral-300 rounded px-1.5 py-0.5 font-mono text-[11px]"
              />
            </div>
          )}
        </div>

        {/* Right: Date Sorting Order */}
        <div className="flex items-center gap-1.5 self-end md:self-auto">
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md border border-neutral-300 font-bold transition cursor-pointer text-xs"
            title="Toggle notification sort order"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
            <span>Sort: {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Pay Modal */}
      {selectedPayItem && (
        <PayRecurringModal
          item={selectedPayItem}
          currencySymbol={currencySymbol}
          onClose={() => setSelectedPayItem(null)}
          onConfirm={handleConfirmPay}
        />
      )}

      {/* Zero State if All Clear */}
      {totalRenderedCount === 0 && (
        <div className="bg-white border border-neutral-300 rounded-lg p-10 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 border border-emerald-300">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-neutral-800">
            {reviewFilter === 'reviewed'
              ? 'No reviewed notifications found'
              : "You're all caught up!"}
          </h2>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {reviewFilter === 'reviewed'
              ? 'Mark notifications as reviewed to store them in your reviewed archive.'
              : 'No alerts match your current filter settings. All spending and obligations are in order.'}
          </p>
        </div>
      )}

      {/* ================= SECTION 1: SCHEDULED BILLS (DUE & ALMOST DUE) ================= */}
      {(filterType === 'all' || filterType === 'bills') && filteredBills.length > 0 && (
        <div className="bg-white border border-neutral-300 rounded-lg shadow-xs overflow-hidden text-xs">
          <div className="bg-[#2d3134] text-white p-3 flex items-center justify-between border-b border-neutral-700">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h2 className="font-bold text-sm tracking-wide">
                Scheduled Bills Due &amp; Almost Due ({filteredBills.length})
              </h2>
            </div>
            <span className="text-[10px] text-neutral-300 font-mono">
              Actionable Recurring Obligations
            </span>
          </div>

          <div className="divide-y divide-neutral-200">
            {filteredBills.map((item) => {
              const isOverdue = item.status === 'overdue';
              const isDueToday = item.status === 'due_today';
              const isReviewed = reviewedIds.has(item.id);

              return (
                <div
                  key={item.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    isReviewed ? 'bg-neutral-50/70 opacity-75' : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-full mt-0.5 ${
                        isReviewed
                          ? 'bg-neutral-200 text-neutral-500 border border-neutral-300'
                          : isOverdue
                          ? 'bg-red-100 text-red-600 border border-red-300'
                          : isDueToday
                          ? 'bg-amber-100 text-amber-600 border border-amber-300'
                          : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                      }`}
                    >
                      {isReviewed ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-sm ${isReviewed ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>
                          {item.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {item.category}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 capitalize font-medium">
                          {item.frequency}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            isReviewed
                              ? 'bg-neutral-200 text-neutral-600'
                              : isOverdue
                              ? 'bg-red-600 text-white'
                              : isDueToday
                              ? 'bg-amber-500 text-neutral-950'
                              : 'bg-yellow-400 text-neutral-900'
                          }`}
                        >
                          {isReviewed ? 'REVIEWED' : item.statusLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-neutral-500 flex-wrap">
                        <span>
                          Target Due Date:{' '}
                          <b className="text-neutral-800 font-mono">{item.nextDueDate}</b>
                        </span>
                        {item.paymentMethod && (
                          <span>
                            Settlement via: <b>{item.paymentMethod}</b>
                          </span>
                        )}
                        {item.lastPaidDate && (
                          <span className="text-emerald-700">
                            Last paid: {item.lastPaidDate}
                            {item.lastPaidAmount !== undefined && (
                              <> ({formatCurrency(item.lastPaidAmount, currencySymbol)})</>
                            )}
                          </span>
                        )}
                      </div>
                      {item.notes && <p className="text-[11px] text-neutral-500 italic">"{item.notes}"</p>}
                    </div>
                  </div>

                  {/* Actions: Review Toggle & Pay Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-200">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                        Scheduled Amount
                      </span>
                      <span className="font-mono font-bold text-neutral-900 text-base">
                        {formatCurrency(item.amount, currencySymbol)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Mark as Reviewed Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleReviewed(item.id)}
                        className={`p-2 rounded font-semibold transition border cursor-pointer ${
                          isReviewed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-neutral-200'
                        }`}
                        title={isReviewed ? 'Mark as Unreviewed' : 'Mark as Reviewed'}
                      >
                        <Check className={`w-3.5 h-3.5 ${isReviewed ? 'text-emerald-600 font-bold' : 'text-neutral-400'}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedPayItem(item)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer text-xs"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Pay Bill</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= SECTION 2: BUDGET CAP ALERTS (75%+ HIT) ================= */}
      {(filterType === 'all' || filterType === 'budgets') && filteredBudgetAlerts.length > 0 && (
        <div className="bg-white border border-neutral-300 rounded-lg shadow-xs overflow-hidden text-xs">
          <div className="bg-[#2d3134] text-white p-3 flex items-center justify-between border-b border-neutral-700">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              <h2 className="font-bold text-sm tracking-wide">
                Budget Cap Warning Alerts ({filteredBudgetAlerts.length})
              </h2>
            </div>
            <span className="text-[10px] text-neutral-300 font-mono">
              Spending reached &ge;75% of assigned cap
            </span>
          </div>

          <div className="divide-y divide-neutral-200 p-4 space-y-3">
            {filteredBudgetAlerts.map((a) => {
              const pct = (a.ratio * 100).toFixed(1);
              const isOver = a.ratio >= 1.0;
              const isReviewed = reviewedIds.has(a.id);

              return (
                <div
                  key={a.id}
                  className={`p-3.5 rounded-lg border space-y-2 transition ${
                    isReviewed
                      ? 'bg-neutral-50/70 border-neutral-200 opacity-75'
                      : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${isReviewed ? 'text-neutral-500 line-through' : 'text-neutral-900'}`}>
                        {a.category}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          isReviewed
                            ? 'bg-neutral-200 text-neutral-600'
                            : isOver
                            ? 'bg-red-600 text-white'
                            : 'bg-amber-500 text-neutral-950'
                        }`}
                      >
                        {isReviewed ? 'REVIEWED' : isOver ? '100%+ EXCEEDED' : '75% CAP HIT'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono">
                        <span className="text-neutral-500 text-[11px]">Spent: </span>
                        <span className={`font-bold ${isOver ? 'text-red-700' : 'text-amber-800'}`}>
                          {formatCurrency(a.spent, currencySymbol)}
                        </span>
                        <span className="text-neutral-400 text-[11px]"> / {formatCurrency(a.budget, currencySymbol)}</span>
                        <span className="text-[10px] text-neutral-500 ml-1.5">({pct}%)</span>
                      </div>

                      {/* Review Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleReviewed(a.id)}
                        className={`p-1.5 rounded font-semibold transition border cursor-pointer ${
                          isReviewed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-100'
                        }`}
                        title={isReviewed ? 'Mark as Unreviewed' : 'Mark as Reviewed'}
                      >
                        <Check className={`w-3.5 h-3.5 ${isReviewed ? 'text-emerald-600 font-bold' : 'text-neutral-400'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isReviewed ? 'bg-neutral-400' : isOver ? 'bg-red-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(a.ratio * 100, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                    <span>
                      {isOver
                        ? `Over budget limit by ${formatCurrency(a.spent - a.budget, currencySymbol)}`
                        : `Remaining spending headroom: ${formatCurrency(a.remaining, currencySymbol)}`}
                    </span>
                    {onNavigateToBudgets && (
                      <button
                        type="button"
                        onClick={onNavigateToBudgets}
                        className="text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer"
                      >
                        Adjust category limit &rarr;
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
