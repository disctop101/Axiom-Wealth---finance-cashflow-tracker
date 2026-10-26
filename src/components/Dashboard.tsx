import React from 'react';
import {
  AssetItem,
  LiabilityItem,
  MONTH_NAMES,
  PeriodSettings,
  TransactionItem,
  RecurringExpenseItem,
  PaymentMethodType,
  formatCurrency,
} from '../types/finance';
import { PeriodExpenseChart } from './PeriodExpenseChart';
import { exportStatementToPdf } from '../services/pdfExport';
import { ConfirmModal } from './ConfirmModal';
import {
  Calendar,
  RefreshCw,
  Info,
  HelpCircle,
  Edit3,
  UserCheck,
  Check,
  FileDown,
  Loader2,
  Trash2,
  LayoutDashboard,
  ReceiptText,
  ArrowDownUp,
  Scale,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';
import { Tooltip } from './Tooltip';

interface DashboardProps {
  period: PeriodSettings;
  setPeriod: React.Dispatch<React.SetStateAction<PeriodSettings>>;
  assets: AssetItem[];
  liabilities: LiabilityItem[];
  transactions: TransactionItem[];
  currencySymbol: string;
  onSelectCategory: (category: string, type: 'income' | 'expense' | 'asset' | 'liability') => void;
  onResetToDefault: () => void;
  userName?: string;
  onUpdateUserName?: (name: string) => void;
  onWipeAllTransactions?: () => Promise<void> | void;
  activeSubTab?: 'dashboard' | 'income' | 'cashflow' | 'balancesheet';
  onSubTabChange?: (tab: 'dashboard' | 'income' | 'cashflow' | 'balancesheet') => void;
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
  hasApexAccess?: boolean;
  onOpenGrowthCheckpoint?: (trigger?: 'export') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  period,
  setPeriod,
  assets,
  liabilities,
  transactions,
  currencySymbol,
  onSelectCategory,
  onResetToDefault,
  userName = '',
  onUpdateUserName,
  onWipeAllTransactions,
  activeSubTab,
  onSubTabChange,
  recurringExpenses = [],
  onAddRecurringExpense,
  onUpdateRecurringExpense,
  onDeleteRecurringExpense,
  onPayRecurringExpense,
  onOpenHelp,
  hasApexAccess = true,
  onOpenGrowthCheckpoint,
}) => {
  const [internalSubTab, setInternalSubTab] = React.useState<'dashboard' | 'income' | 'cashflow' | 'balancesheet'>('dashboard');
  const currentSubTab = activeSubTab || internalSubTab;

  const handleTabChange = (tab: 'dashboard' | 'income' | 'cashflow' | 'balancesheet') => {
    if (onSubTabChange) onSubTabChange(tab);
    setInternalSubTab(tab);
  };
  // Set Period to Current System Month & Year
  const handleSetCurrentMonth = () => {
    const now = new Date();
    const currMonthName = MONTH_NAMES[now.getMonth()];
    const currYear = now.getFullYear();
    setFilterByPeriod(true);
    setPeriod((prev) => ({
      ...prev,
      startMonth: currMonthName,
      startYear: currYear,
      endMonth: currMonthName,
      endYear: currYear,
    }));
  };

  // PDF Export State & Handler
  const [isExportingPdf, setIsExportingPdf] = React.useState(false);
  const handleExportPdf = async () => {
    if (!hasApexAccess) {
      if (onOpenGrowthCheckpoint) onOpenGrowthCheckpoint('export');
      return;
    }
    try {
      setIsExportingPdf(true);
      const safeOwner = (userName && userName.trim()) || 'Personal';
      const cleanOwner = safeOwner.replace(/[^a-zA-Z0-9_-]/g, '_');
      await exportStatementToPdf({
        data: {
          userName: safeOwner,
          currencySymbol,
          periodLabel: !filterByPeriod
            ? 'All-Time Financial History (All Logged Records)'
            : `${period.startMonth} ${period.startYear} to ${period.endMonth} ${period.endYear}`,
          recordsCount: periodTransactions.length,
          earnedIncomeItems: [
            { name: 'Salary / Wages', amount: salaryWages },
          ],
          passiveIncomeItems: [
            { name: 'Interest & Dividends', amount: interestDividends },
            { name: 'Investments Return', amount: investmentsIncome },
            { name: 'Real Estate / Business Inv.', amount: realEstatePassive },
          ],
          otherIncomeItems: [
            { name: 'Account Payables', amount: payablesIncome },
            { name: 'Account Receivables', amount: receivablesIncome },
            { name: 'Bank Transactions', amount: bankIncome },
            { name: 'Savings / Deposits', amount: savingsIncome },
          ].filter((i) => i.amount > 0),
          totalIncome,
          fixedExpenseItems: [
            { name: 'Housing', amount: housingExpense },
            { name: 'Investments', amount: invExpense },
            { name: 'Utilities', amount: utilitiesExpense },
            { name: 'Food', amount: foodExpense },
            { name: 'Health Care', amount: healthCareExpense },
            { name: 'Personal Care', amount: personalCareExpense },
          ],
          variableExpenseItems: [
            { name: 'Entertainment', amount: entertainmentExpense },
            { name: 'Transportation', amount: transportationExpense },
            { name: 'Account Payables', amount: payablesExpense },
            { name: 'Account Receivables', amount: receivablesExpense },
            { name: 'Bank Transactions', amount: bankExpense },
            { name: 'Miscellaneous', amount: miscExpense },
            { name: 'Real Estate / Business Expenses', amount: reBusinessExpense },
            { name: 'Savings Outflows', amount: savingsExpense },
          ],
          totalExpenses,
          netIncome,
          cashInflows,
          cashOutflows,
          netCashFlow,
          beginningBalance: rollingBeginningBalance,
          endingBalance: cashFlowEndingBalance,
          assetItems: [
            { name: 'Cash and cash equivalents', amount: cashEquivalents },
            { name: 'Stocks / Equities', amount: stockAssets },
            { name: 'Crypto', amount: cryptoAssets },
            { name: 'Real estate', amount: realEstateAssets },
            { name: 'Vehicles', amount: vehicleAssets },
            { name: 'Investment accounts', amount: investmentAccounts },
            { name: 'Retirement accounts', amount: retirementAccounts },
            { name: 'Other assets', amount: otherAssets },
          ].filter((item) => item.amount > 0 || item.name === 'Cash and cash equivalents'),
          totalAssets,
          liabilityItems: [
            { name: 'Mortgage balance', amount: mortgageBalance },
            { name: 'Auto loan (Car loan)', amount: carLoan },
            { name: 'Credit card balances', amount: creditCardBalances },
            { name: 'Personal loan', amount: personalLoan },
            { name: 'Student loan', amount: studentLoan },
            { name: 'Other debts', amount: otherDebts },
          ].filter((item) => item.amount > 0),
          totalLiabilities,
          netWorth,
          expenseVisualizerItems: expenseChartData,
        },
        filename: `${cleanOwner}_Financial_Statement.pdf`,
      });
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to export PDF. Please check console for details.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Dynamic Name Editing State
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [tempName, setTempName] = React.useState(userName || '');

  React.useEffect(() => {
    if (userName) setTempName(userName);
  }, [userName]);

  const handleSaveName = () => {
    if (tempName.trim()) {
      if (onUpdateUserName) onUpdateUserName(tempName.trim());
      setIsEditingName(false);
    }
  };

  const rawName = (userName && userName.trim()) || 'My Personal Ledger';
  const possessiveName = rawName.endsWith('s') || rawName.endsWith('S') ? `${rawName}'` : `${rawName}'s`;
  const hasCustomName = !!(userName && userName.trim());
  const displayTitle = hasCustomName ? `${possessiveName} Financial Statement` : 'My Personal Financial Statement';

  // Collapsible Statement Controls Accordion state (Collapsed by default on mobile < 768px)
  const [isControlsExpanded, setIsControlsExpanded] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [timePreset, setTimePreset] = React.useState<'day' | 'week' | 'month' | 'year' | 'all'>('month');
  const [exactDateRange, setExactDateRange] = React.useState<{ start: string; end: string } | null>(null);

  // Date Syncing for Period Filtering (Default true, toggleable to All Time)
  const [filterByPeriod, setFilterByPeriod] = React.useState(true);

  // Helper to calculate exact start and end dates for a preset
  const calculatePresetRange = (preset: 'day' | 'week' | 'month' | 'year' | 'all'): { start: string; end: string } | null => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'day') {
      return { start: todayStr, end: todayStr };
    } else if (preset === 'week') {
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
    }
    return null; // 'all'
  };

  const handleApplyPreset = (preset: 'day' | 'week' | 'month' | 'year' | 'all') => {
    setTimePreset(preset);
    if (preset === 'all') {
      setFilterByPeriod(false);
      setExactDateRange(null);
    } else {
      setFilterByPeriod(true);
      const range = calculatePresetRange(preset);
      setExactDateRange(range);
      if (range) {
        const startParts = range.start.split('-');
        const endParts = range.end.split('-');
        const startMIdx = parseInt(startParts[1]) - 1;
        const endMIdx = parseInt(endParts[1]) - 1;
        setPeriod((prev) => ({
          ...prev,
          startMonth: MONTH_NAMES[startMIdx],
          startYear: parseInt(startParts[0]),
          endMonth: MONTH_NAMES[endMIdx],
          endYear: parseInt(endParts[0]),
        }));
      }
    }
  };

  const handleJumpToCurrent = () => {
    const activePreset = timePreset === 'all' ? 'month' : timePreset;
    handleApplyPreset(activePreset);
  };

  const isDateInPeriod = (dateStr?: string) => {
    if (!filterByPeriod) return true;
    if (!dateStr) return true;

    // If active preset has exact day-level bounds (e.g. Day, Week)
    if (exactDateRange) {
      if (exactDateRange.start && dateStr < exactDateRange.start) return false;
      if (exactDateRange.end && dateStr > exactDateRange.end) return false;
      return true;
    }

    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    if (isNaN(year) || isNaN(month)) return true;

    const startMonthIdx = MONTH_NAMES.indexOf(period.startMonth) + 1;
    const endMonthIdx = MONTH_NAMES.indexOf(period.endMonth) + 1;

    const txVal = year * 12 + month;
    const startVal = period.startYear * 12 + startMonthIdx;
    const endVal = period.endYear * 12 + endMonthIdx;

    return txVal >= startVal && txVal <= endVal;
  };

  const periodTransactions = React.useMemo(() => {
    return transactions.filter((t) => isDateInPeriod(t.date));
  }, [transactions, period, filterByPeriod]);

  // Compute Income categories by summing transactions
  const getIncomeAmount = (category: string) => {
    return periodTransactions
      .filter((t) => t.type === 'income' && t.category.toLowerCase() === category.toLowerCase())
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getExpenseAmount = (category: string) => {
    return periodTransactions
      .filter((t) => t.type === 'expense' && t.category.toLowerCase() === category.toLowerCase())
      .reduce((sum, t) => sum + t.amount, 0);
  };

  // Income items
  const salaryWages = getIncomeAmount('Salary/Wages');
  const earnedIncome = salaryWages;

  const interestDividends = getIncomeAmount('Interest/Dividends');
  const investmentsIncome = getIncomeAmount('Investments');
  const realEstatePassive = getIncomeAmount('Real Estate/Business Investments');
  const passiveIncome = interestDividends + investmentsIncome + realEstatePassive;

  const payablesIncome = getIncomeAmount('Account Payables');
  const receivablesIncome = getIncomeAmount('Account Receivables');
  const bankIncome = getIncomeAmount('Bank Transaction');
  const savingsIncome = getIncomeAmount('Savings');
  const otherIncome = payablesIncome + receivablesIncome + bankIncome + savingsIncome;

  const totalIncome = earnedIncome + passiveIncome + otherIncome;

  // Fixed Expense items
  const housingExpense = getExpenseAmount('Housing');
  const invExpense = getExpenseAmount('Investments');
  const utilitiesExpense = getExpenseAmount('Utilities');
  const foodExpense = getExpenseAmount('Food');
  const healthCareExpense = getExpenseAmount('Health Care');
  const personalCareExpense = getExpenseAmount('Personal Care');
  const fixedExpenses =
    housingExpense + invExpense + utilitiesExpense + foodExpense + healthCareExpense + personalCareExpense;

  // Variable Expense items
  const entertainmentExpense = getExpenseAmount('Entertainment');
  const transportationExpense = getExpenseAmount('Transportation');
  const payablesExpense = getExpenseAmount('Account Payables');
  const receivablesExpense = getExpenseAmount('Account Receivables');
  const bankExpense = getExpenseAmount('Bank Transaction');
  const miscExpense = getExpenseAmount('Miscellaneous');
  const reInvestmentsExpense = getExpenseAmount('Real Estate/Business Investments');
  const reBusinessExpense = getExpenseAmount('Real Estate/Business Expenses');
  const savingsExpense = getExpenseAmount('Savings');
  const variableExpenses =
    entertainmentExpense +
    transportationExpense +
    payablesExpense +
    receivablesExpense +
    bankExpense +
    miscExpense +
    reInvestmentsExpense +
    reBusinessExpense +
    savingsExpense;

  // Rolling Balance: Compute accumulated net cash flows prior to the active period
  // This enforces that the beginning balance of any period automatically pulls the previous period's ending balance!
  const priorNetCashFlow = React.useMemo(() => {
    if (!filterByPeriod) return 0;
    const startMonthIdx = MONTH_NAMES.indexOf(period.startMonth) + 1;
    const startVal = period.startYear * 12 + startMonthIdx;

    return transactions
      .filter((t) => {
        if (!t.date) return false;
        const parts = t.date.split('-');
        const y = parseInt(parts[0]);
        const m = parseInt(parts[1]);
        if (isNaN(y) || isNaN(m)) return false;
        const txVal = y * 12 + m;
        return txVal < startVal;
      })
      .reduce((sum, t) => {
        return t.type === 'income' ? sum + t.amount : sum - t.amount;
      }, 0);
  }, [transactions, period, filterByPeriod]);

  // Active period beginning balance = base starting balance + all prior net cash flows
  const rollingBeginningBalance = (period.beginningBalance || 0) + priorNetCashFlow;

  const totalExpenses = fixedExpenses + variableExpenses;
  const netIncome = totalIncome - totalExpenses;
  const endingBalance = rollingBeginningBalance + netIncome;

  // Cash Flow Calculations
  const cashInflows = totalIncome;
  const cashOutflows = totalExpenses;
  const netCashFlow = cashInflows - cashOutflows;
  const cashFlowEndingBalance = rollingBeginningBalance + netCashFlow;

  // Compute active date boundaries for time-bound balance sheet verification
  const periodEndDateStr = React.useMemo(() => {
    if (!filterByPeriod) return null; // All-time
    if (exactDateRange?.end) return exactDateRange.end;
    const endMonthIdx = MONTH_NAMES.indexOf(period.endMonth) + 1;
    const daysInEndMonth = new Date(period.endYear, endMonthIdx, 0).getDate();
    return `${period.endYear}-${String(endMonthIdx).padStart(2, '0')}-${String(daysInEndMonth).padStart(2, '0')}`;
  }, [filterByPeriod, exactDateRange, period]);

  const periodStartDateStr = React.useMemo(() => {
    if (!filterByPeriod) return null; // All-time
    if (exactDateRange?.start) return exactDateRange.start;
    const startMonthIdx = MONTH_NAMES.indexOf(period.startMonth) + 1;
    return `${period.startYear}-${String(startMonthIdx).padStart(2, '0')}-01`;
  }, [filterByPeriod, exactDateRange, period]);

  // Asset values from Assets Page (respecting acquisition/creation date)
  const timeBoundDashboardAssets = React.useMemo(() => {
    return assets.filter((a) => {
      if (!periodEndDateStr) return true;
      if (!a.date) return true;
      return a.date <= periodEndDateStr;
    });
  }, [assets, periodEndDateStr]);

  const assetMap: Record<string, number> = {};
  timeBoundDashboardAssets.forEach((a) => {
    assetMap[a.category] = (assetMap[a.category] || 0) + a.initialValue;
  });

  // Synchronized rolling cash and specific asset category holdings
  const liquidCashAssets = (assetMap['Liquid Cash'] || 0) + (assetMap['Cash and cash equivalents'] || 0);
  const cashEquivalents = endingBalance + liquidCashAssets;
  const stockAssets = assetMap['Stocks'] || 0;
  const cryptoAssets = assetMap['Crypto'] || 0;
  const realEstateAssets = assetMap['Real estate'] || 0;
  const vehicleAssets = assetMap['Vehicles'] || 0;
  const investmentAccounts = assetMap['Investment accounts'] || 0;
  const retirementAccounts = assetMap['Retirement accounts'] || 0;
  const otherAssets = assetMap['Other assets'] || 0;

  const totalAssets =
    cashEquivalents +
    stockAssets +
    cryptoAssets +
    realEstateAssets +
    vehicleAssets +
    investmentAccounts +
    retirementAccounts +
    otherAssets;

  // Liabilities from Liabilities Page (respecting origination date AND settlement date)
  const timeBoundDashboardLiabilities = React.useMemo(() => {
    return liabilities.filter((l) => {
      // 1. Exclude if origination/creation is after active period
      if (periodEndDateStr && l.date && l.date > periodEndDateStr) return false;

      // 2. Settlement exclusion: if liability reached zero or is marked settled,
      // exclude if the active period begins after its settlement date
      const isSettled = l.initialAmount <= 0 || (l.notes && l.notes.toLowerCase().includes('settled'));
      if (isSettled && periodStartDateStr && l.date && periodStartDateStr > l.date) {
        return false;
      }
      return true;
    });
  }, [liabilities, periodEndDateStr, periodStartDateStr]);

  const liabilityMap: Record<string, number> = {};
  timeBoundDashboardLiabilities.forEach((l) => {
    liabilityMap[l.category] = (liabilityMap[l.category] || 0) + l.initialAmount;
  });

  const mortgageBalance = liabilityMap['Mortgage balance'] || 0;
  const carLoan = liabilityMap['Car loan'] || 0;
  const creditCardBalances = liabilityMap['Credit card balances'] || 0;
  const personalLoan = liabilityMap['Personal loan'] || 0;
  const studentLoan = liabilityMap['Student loan'] || 0;
  const otherDebts = liabilityMap['Other debts'] || 0;

  const totalLiabilities =
    mortgageBalance + carLoan + creditCardBalances + personalLoan + studentLoan + otherDebts;

  const netWorth = totalAssets - totalLiabilities;

  // Expenses for the chart
  const expenseChartData = [
    { category: 'Housing', amount: housingExpense },
    { category: 'Investments', amount: invExpense },
    { category: 'Utilities', amount: utilitiesExpense },
    { category: 'Food', amount: foodExpense },
    { category: 'Health Care', amount: healthCareExpense },
    { category: 'Personal Care', amount: personalCareExpense },
    { category: 'Entertainment', amount: entertainmentExpense },
    { category: 'Transportation', amount: transportationExpense },
    { category: 'Account Payables', amount: payablesExpense },
    { category: 'Account Receivables', amount: receivablesExpense },
    { category: 'Bank Transaction', amount: bankExpense },
    { category: 'Miscellaneous', amount: miscExpense },
    { category: 'Real Estate/Business Investments', amount: reInvestmentsExpense },
    { category: 'Real Estate/Business Expenses', amount: reBusinessExpense },
    { category: 'Savings', amount: savingsExpense },
  ];

  // Incomes for the chart
  const incomeChartData = [
    { category: 'Salary/Wages', amount: salaryWages },
    { category: 'Interest/Dividends', amount: interestDividends },
    { category: 'Investments', amount: investmentsIncome },
    { category: 'Real Estate/Business Investments', amount: realEstatePassive },
    { category: 'Account Payables', amount: payablesIncome },
    { category: 'Account Receivables', amount: receivablesIncome },
    { category: 'Bank Transaction', amount: bankIncome },
    { category: 'Savings', amount: savingsIncome },
  ];


  const renderIncomeStatement = (isMobileSubpage = false) => (
            <div className="border border-neutral-300 bg-white shadow-xs rounded-xs overflow-hidden">
      {isMobileSubpage && (
        <div className="flex items-center justify-between bg-neutral-800 text-white px-3 py-2 border-b border-neutral-700">
          <button
            type="button"
            onClick={() => handleTabChange('dashboard')}
            className="inline-flex items-center gap-1 text-xs text-emerald-400 font-bold hover:text-emerald-300 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Overview</span>
          </button>
          <span className="text-[10px] text-neutral-400 font-mono">Personal Income Statement</span>
        </div>
      )}
          {/* Header */}
          <div className="bg-[#2d3134] text-white p-2.5 text-center border-b border-neutral-700">
            <h2 className="font-bold text-sm sm:text-base tracking-wide">
              Income Statement (Personal)
            </h2>
            <p className="text-[11px] text-neutral-300 font-mono">
              Period of {period.startMonth} to {period.endMonth} {period.endYear}
            </p>
          </div>

          <div className="divide-y divide-neutral-200 text-xs">
            {/* Table Header: Period Income | Amount */}
            <div className="grid grid-cols-12 bg-[#3f454a] text-white font-bold py-1.5 px-3 uppercase text-[11px]">
              <div className="col-span-8">Period Income</div>
              <div className="col-span-4 text-right">Amount</div>
            </div>

            {/* Salary/Wages */}
            <div
              onClick={() => onSelectCategory('Salary/Wages', 'income')}
              className="grid grid-cols-12 py-1 px-3 bg-white hover:bg-emerald-50 cursor-pointer transition items-center"
              title="Click to view breakdown of Salary/Wages"
            >
              <div className="col-span-8 text-neutral-800 font-medium hover:text-emerald-700">Salary/Wages</div>
              <div className="col-span-4 text-right font-mono text-neutral-900 font-medium">
                {formatCurrency(salaryWages, currencySymbol)}
              </div>
            </div>

            {/* Income (Earned) Subtotal */}
            <div className="grid grid-cols-12 py-1 px-3 bg-[#e8f5e9] text-[#137333] font-bold items-center border-t border-b border-emerald-100">
              <div className="col-span-8">Income (Earned)</div>
              <div className="col-span-4 text-right font-mono">{formatCurrency(earnedIncome, currencySymbol)}</div>
            </div>

            {/* Interest/Dividends */}
            <div
              onClick={() => onSelectCategory('Interest/Dividends', 'income')}
              className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] hover:bg-emerald-50 cursor-pointer transition items-center"
              title="Click to view Interest/Dividends"
            >
              <div className="col-span-8 text-neutral-700 hover:text-emerald-700">Interest/Dividends</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(interestDividends, currencySymbol)}
              </div>
            </div>

            {/* Investments */}
            <div
              onClick={() => onSelectCategory('Investments', 'income')}
              className="grid grid-cols-12 py-1 px-3 bg-white hover:bg-emerald-50 cursor-pointer transition items-center"
              title="Click to view Investments"
            >
              <div className="col-span-8 text-neutral-700 hover:text-emerald-700">Investments</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(investmentsIncome, currencySymbol)}
              </div>
            </div>

            {/* Real Estate/Business Investments */}
            <div
              onClick={() => onSelectCategory('Real Estate/Business Investments', 'income')}
              className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] hover:bg-emerald-50 cursor-pointer transition items-center"
              title="Click to view Real Estate/Business Investments"
            >
              <div className="col-span-8 text-neutral-700 hover:text-emerald-700">Real Estate/Business Investments</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(realEstatePassive, currencySymbol)}
              </div>
            </div>

            {/* Income (Portfolio/Passive) Subtotal */}
            <div className="grid grid-cols-12 py-1 px-3 bg-[#f1f3f4] text-neutral-800 font-bold items-center">
              <div className="col-span-8">Income (Portfolio/Passive)</div>
              <div className="col-span-4 text-right font-mono">{formatCurrency(passiveIncome, currencySymbol)}</div>
            </div>

            {/* Account Payables (Inflow) */}
            <div
              onClick={() => onSelectCategory('Account Payables', 'income')}
              className="grid grid-cols-12 py-1 px-3 bg-white hover:bg-emerald-50 cursor-pointer transition items-center"
              title="Click to view Account Payables inflows"
            >
              <div className="col-span-8 text-neutral-700 hover:text-emerald-700">Account Payables</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(payablesIncome, currencySymbol)}
              </div>
            </div>

            {/* Account Receivables (Inflow) */}
            <div
              onClick={() => onSelectCategory('Account Receivables', 'income')}
              className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] hover:bg-emerald-50 cursor-pointer transition items-center"
              title="Click to view Account Receivables"
            >
              <div className="col-span-8 text-neutral-700 hover:text-emerald-700">Account Receivables</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(receivablesIncome, currencySymbol)}
              </div>
            </div>

            {/* Bank Transaction */}
            <div
              onClick={() => onSelectCategory('Bank Transaction', 'income')}
              className="grid grid-cols-12 py-1 px-3 bg-white hover:bg-emerald-50 cursor-pointer transition items-center"
              title="Click to view Bank Transactions"
            >
              <div className="col-span-8 text-neutral-700 hover:text-emerald-700">Bank Transaction</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(bankIncome, currencySymbol)}
              </div>
            </div>

            {/* Savings */}
            <div
              onClick={() => onSelectCategory('Savings', 'income')}
              className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] hover:bg-emerald-50 cursor-pointer transition items-center"
              title="Click to view Savings"
            >
              <div className="col-span-8 text-neutral-700 hover:text-emerald-700">Savings</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(savingsIncome, currencySymbol)}
              </div>
            </div>

            {/* Other Income: Subtotal */}
            <div className="grid grid-cols-12 py-1 px-3 bg-[#e8f5e9] text-[#137333] font-bold items-center border-t border-b border-emerald-100">
              <div className="col-span-8">Other Income:</div>
              <div className="col-span-4 text-right font-mono">{formatCurrency(otherIncome, currencySymbol)}</div>
            </div>

            {/* Total Income: Major Summary */}
            <div className="statement-light-row grid grid-cols-12 py-1.5 px-3 bg-[#e0e2e5] font-extrabold items-center border-b-2 border-neutral-400">
              <div className="col-span-8 text-xs uppercase tracking-wide text-neutral-950 dark:!text-neutral-950">
                Total Income:
              </div>
              <div className="col-span-4 text-right font-mono text-sm text-neutral-950 dark:!text-neutral-950">
                {formatCurrency(totalIncome, currencySymbol)}
              </div>
            </div>

            {/* Table Header: Period Expenses | Amount */}
            <div className="grid grid-cols-12 bg-[#3f454a] text-white font-bold py-1.5 px-3 uppercase text-[11px] mt-2">
              <div className="col-span-8">Period Expenses</div>
              <div className="col-span-4 text-right">Amount</div>
            </div>

            {/* Fixed Expenses Group */}
            <div
              onClick={() => onSelectCategory('Housing', 'expense')}
              className="grid grid-cols-12 py-1 px-3 bg-white hover:bg-red-50 cursor-pointer transition items-center"
              title="Click to view Housing expenses"
            >
              <div className="col-span-8 text-neutral-700 hover:text-red-700">Housing</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(housingExpense > 0 ? -housingExpense : 0, currencySymbol)}
              </div>
            </div>

            <div
              onClick={() => onSelectCategory('Investments', 'expense')}
              className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] hover:bg-red-50 cursor-pointer transition items-center"
              title="Click to view Investment expenses"
            >
              <div className="col-span-8 text-neutral-700 hover:text-red-700">Investments</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(invExpense > 0 ? -invExpense : 0, currencySymbol)}
              </div>
            </div>

            <div
              onClick={() => onSelectCategory('Utilities', 'expense')}
              className="grid grid-cols-12 py-1 px-3 bg-white hover:bg-red-50 cursor-pointer transition items-center"
              title="Click to view Utilities expenses"
            >
              <div className="col-span-8 text-neutral-700 hover:text-red-700">Utilities</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(utilitiesExpense > 0 ? -utilitiesExpense : 0, currencySymbol)}
              </div>
            </div>

            <div
              onClick={() => onSelectCategory('Food', 'expense')}
              className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] hover:bg-red-50 cursor-pointer transition items-center"
              title="Click to view Food expenses"
            >
              <div className="col-span-8 text-neutral-700 hover:text-red-700">Food</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(foodExpense > 0 ? -foodExpense : 0, currencySymbol)}
              </div>
            </div>

            <div
              onClick={() => onSelectCategory('Health Care', 'expense')}
              className="grid grid-cols-12 py-1 px-3 bg-white hover:bg-red-50 cursor-pointer transition items-center"
              title="Click to view Health Care expenses"
            >
              <div className="col-span-8 text-neutral-700 hover:text-red-700">Health Care</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(healthCareExpense > 0 ? -healthCareExpense : 0, currencySymbol)}
              </div>
            </div>

            <div
              onClick={() => onSelectCategory('Personal Care', 'expense')}
              className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] hover:bg-red-50 cursor-pointer transition items-center"
              title="Click to view Personal Care expenses"
            >
              <div className="col-span-8 text-neutral-700 hover:text-red-700">Personal Care</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(personalCareExpense > 0 ? -personalCareExpense : 0, currencySymbol)}
              </div>
            </div>

            {/* Fixed Expenses Subtotal */}
            <div className="grid grid-cols-12 py-1 px-3 bg-[#fde8e8] text-[#c5221f] font-bold items-center border-t border-b border-red-200">
              <div className="col-span-8">Fixed Expenses</div>
              <div className="col-span-4 text-right font-mono">
                {formatCurrency(fixedExpenses > 0 ? -fixedExpenses : 0, currencySymbol)}
              </div>
            </div>

            {/* Variable Expenses Group */}
            <div
              onClick={() => onSelectCategory('Entertainment', 'expense')}
              className="grid grid-cols-12 py-1 px-3 bg-white hover:bg-red-50 cursor-pointer transition items-center"
              title="Click to view Entertainment expenses"
            >
              <div className="col-span-8 text-neutral-700 hover:text-red-700">Entertainment</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(entertainmentExpense > 0 ? -entertainmentExpense : 0, currencySymbol)}
              </div>
            </div>

            <div
              onClick={() => onSelectCategory('Transportation', 'expense')}
              className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] hover:bg-red-50 cursor-pointer transition items-center"
              title="Click to view Transportation expenses"
            >
              <div className="col-span-8 text-neutral-700 hover:text-red-700">Transportation</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(transportationExpense > 0 ? -transportationExpense : 0, currencySymbol)}
              </div>
            </div>

            <div
              onClick={() => onSelectCategory('Account Payables', 'expense')}
              className="grid grid-cols-12 py-1 px-3 bg-white hover:bg-red-50 cursor-pointer transition items-center"
              title="Click to view Account Payables outflows"
            >
              <div className="col-span-8 text-neutral-700 hover:text-red-700">Account Payables</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(payablesExpense > 0 ? -payablesExpense : 0, currencySymbol)}
              </div>
            </div>

            <div
              onClick={() => onSelectCategory('Account Receivables', 'expense')}
              className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] hover:bg-red-50 cursor-pointer transition items-center"
              title="Click to view Account Receivables"
            >
              <div className="col-span-8 text-neutral-700 hover:text-red-700">Account Receivables</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(receivablesExpense > 0 ? -receivablesExpense : 0, currencySymbol)}
              </div>
            </div>

            <div
              onClick={() => onSelectCategory('Bank Transaction', 'expense')}
              className="grid grid-cols-12 py-1 px-3 bg-white hover:bg-red-50 cursor-pointer transition items-center"
              title="Click to view Bank Transaction fees"
            >
              <div className="col-span-8 text-neutral-700 hover:text-red-700">Bank Transaction</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(bankExpense > 0 ? -bankExpense : 0, currencySymbol)}
              </div>
            </div>

            <div
              onClick={() => onSelectCategory('Miscellaneous', 'expense')}
              className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] hover:bg-red-50 cursor-pointer transition items-center"
              title="Click to view Miscellaneous expenses"
            >
              <div className="col-span-8 text-neutral-700 hover:text-red-700">Miscellaneous</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(miscExpense > 0 ? -miscExpense : 0, currencySymbol)}
              </div>
            </div>

            <div
              onClick={() => onSelectCategory('Real Estate/Business Investments', 'expense')}
              className="grid grid-cols-12 py-1 px-3 bg-white hover:bg-red-50 cursor-pointer transition items-center"
            >
              <div className="col-span-8 text-neutral-700 hover:text-red-700">Real Estate/Business Investments</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(reInvestmentsExpense > 0 ? -reInvestmentsExpense : 0, currencySymbol)}
              </div>
            </div>

            <div
              onClick={() => onSelectCategory('Real Estate/Business Expenses', 'expense')}
              className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] hover:bg-red-50 cursor-pointer transition items-center"
            >
              <div className="col-span-8 text-neutral-700 hover:text-red-700">Real Estate/Business Expenses</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(reBusinessExpense > 0 ? -reBusinessExpense : 0, currencySymbol)}
              </div>
            </div>

            <div
              onClick={() => onSelectCategory('Savings', 'expense')}
              className="grid grid-cols-12 py-1 px-3 bg-white hover:bg-red-50 cursor-pointer transition items-center"
            >
              <div className="col-span-8 text-neutral-700 hover:text-red-700">Savings</div>
              <div className="col-span-4 text-right font-mono text-neutral-800">
                {formatCurrency(savingsExpense > 0 ? -savingsExpense : 0, currencySymbol)}
              </div>
            </div>

            {/* Variable Expenses Subtotal */}
            <div className="grid grid-cols-12 py-1 px-3 bg-[#fde8e8] text-[#c5221f] font-bold items-center border-t border-b border-red-200">
              <div className="col-span-8">Variable Expenses</div>
              <div className="col-span-4 text-right font-mono">
                {formatCurrency(variableExpenses > 0 ? -variableExpenses : 0, currencySymbol)}
              </div>
            </div>

            {/* Total Expenses Row */}
            <div className="statement-light-row grid grid-cols-12 py-1.5 px-3 bg-[#e0e2e5] font-extrabold items-center">
              <div className="col-span-8 text-xs uppercase tracking-wide text-neutral-950 dark:!text-neutral-950">
                Total Expenses
              </div>
              <div className="statement-red-text col-span-4 text-right font-mono text-sm text-[#c5221f] dark:!text-[#c5221f]">
                {formatCurrency(totalExpenses > 0 ? -totalExpenses : 0, currencySymbol)}
              </div>
            </div>

            {/* Net Income Row */}
            <div className="statement-light-row grid grid-cols-12 py-1.5 px-3 bg-[#e8eaed] items-center border-t border-neutral-300">
              <div className="col-span-8 font-bold text-neutral-950 dark:!text-neutral-950 text-[11px] sm:text-xs">
                Net Income (Total Income - Total Expenses)
              </div>
              <div
                className={`col-span-4 text-right font-mono font-bold text-xs ${
                  netIncome >= 0
                    ? 'statement-green-text text-[#137333] dark:!text-[#137333]'
                    : 'statement-red-text text-[#c5221f] dark:!text-[#c5221f]'
                }`}
              >
                {formatCurrency(netIncome, currencySymbol)}
              </div>
            </div>

            {/* Previous Month's Balance (Rolling Beginning Balance) */}
            <div className="grid grid-cols-12 py-1 px-3 bg-white items-center">
              <div className="col-span-8 text-neutral-800 font-medium">Previous Month's Balance</div>
              <div className="col-span-4 text-right font-mono text-neutral-900 font-semibold">
                {formatCurrency(rollingBeginningBalance, currencySymbol)}
              </div>
            </div>

            {/* Ending Balance */}
            <div className="grid grid-cols-12 py-1.5 px-3 bg-[#3f454a] text-white font-black items-center">
              <div className="col-span-8 uppercase tracking-wide text-xs">Ending Balance</div>
              <div className="col-span-4 text-right font-mono text-sm text-emerald-300">
                {formatCurrency(endingBalance, currencySymbol)}
              </div>
            </div>
          </div>
        </div>
  );

  const renderCashFlowStatement = (isMobileSubpage = false) => (
            <div className="border border-neutral-300 bg-white shadow-xs rounded-xs overflow-hidden flex flex-col justify-between">
      {isMobileSubpage && (
        <div className="flex items-center justify-between bg-neutral-800 text-white px-3 py-2 border-b border-neutral-700">
          <button
            type="button"
            onClick={() => handleTabChange('dashboard')}
            className="inline-flex items-center gap-1 text-xs text-emerald-400 font-bold hover:text-emerald-300 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Overview</span>
          </button>
          <span className="text-[10px] text-neutral-400 font-mono">Cash Flow Statement</span>
        </div>
      )}
          <div>
            {/* Header */}
            <div className="bg-[#2d3134] text-white p-2.5 text-center border-b border-neutral-700">
              <h2 className="font-bold text-sm sm:text-base tracking-wide">
                Cash Flow Statement
              </h2>
              <p className="text-[11px] text-neutral-300 font-mono">
                Period of {period.startMonth} to {period.endMonth}
              </p>
            </div>

            {/* Beginning Balance Bar (Rolling) */}
            <div className="statement-light-row bg-[#e8eaed] p-2 flex items-center justify-between border-b border-neutral-300 px-4">
              <span className="font-bold text-neutral-950 dark:!text-neutral-950 text-xs sm:text-sm">
                Beginning Balance
              </span>
              <span className="font-mono font-bold text-neutral-950 dark:!text-neutral-950 text-sm">
                {formatCurrency(rollingBeginningBalance, currencySymbol)}
              </span>
            </div>

            {/* Inflows & Outflows Side-by-Side or Stacked */}
            <div className="grid grid-cols-1 md:grid-cols-2 text-xs divide-y md:divide-y-0 md:divide-x divide-neutral-200">
              {/* Cash Inflows Column */}
              <div>
                <div className="bg-[#3f454a] text-white font-bold py-1 px-2.5 uppercase text-[10px] flex justify-between">
                  <span>Cash Inflows</span>
                  <span>Amount</span>
                </div>
                <div className="divide-y divide-neutral-100 text-[11px]">
                  <div
                    onClick={() => onSelectCategory('Salary/Wages', 'income')}
                    className="flex justify-between py-1 px-2.5 bg-white hover:bg-emerald-50 cursor-pointer"
                  >
                    <span className="text-neutral-700">Salary/Wages received</span>
                    <span className="font-mono text-neutral-900">{formatCurrency(salaryWages, currencySymbol)}</span>
                  </div>
                  <div
                    onClick={() => onSelectCategory('Account Receivables', 'income')}
                    className="flex justify-between py-1 px-2.5 bg-[#f8f9fa] hover:bg-emerald-50 cursor-pointer"
                  >
                    <span className="text-neutral-700">Cash from Account Receivables</span>
                    <span className="font-mono text-neutral-900">{formatCurrency(receivablesIncome, currencySymbol)}</span>
                  </div>
                  <div
                    onClick={() => onSelectCategory('Investments', 'income')}
                    className="flex justify-between py-1 px-2.5 bg-white hover:bg-emerald-50 cursor-pointer"
                  >
                    <span className="text-neutral-700">Cash from Investments</span>
                    <span className="font-mono text-neutral-900">{formatCurrency(investmentsIncome, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between py-1 px-2.5 bg-[#e8f5e9] text-[#137333] font-bold">
                    <span>Cash from investing</span>
                    <span className="font-mono">{formatCurrency(receivablesIncome, currencySymbol)}</span>
                  </div>
                  <div
                    onClick={() => onSelectCategory('Interest/Dividends', 'income')}
                    className="flex justify-between py-1 px-2.5 bg-white hover:bg-emerald-50 cursor-pointer"
                  >
                    <span className="text-neutral-700">Interest/Dividends received</span>
                    <span className="font-mono text-neutral-900">{formatCurrency(interestDividends, currencySymbol)}</span>
                  </div>
                  <div
                    onClick={() => onSelectCategory('Account Payables', 'income')}
                    className="flex justify-between py-1 px-2.5 bg-[#f8f9fa] hover:bg-emerald-50 cursor-pointer"
                  >
                    <span className="text-neutral-700">Cash from Account Payables</span>
                    <span className="font-mono text-neutral-900">{formatCurrency(payablesIncome, currencySymbol)}</span>
                  </div>
                  <div
                    onClick={() => onSelectCategory('Savings', 'income')}
                    className="flex justify-between py-1 px-2.5 bg-white hover:bg-emerald-50 cursor-pointer"
                  >
                    <span className="text-neutral-700">Savings</span>
                    <span className="font-mono text-neutral-900">{formatCurrency(savingsIncome, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between py-1 px-2.5 bg-[#e8f5e9] text-[#137333] font-bold">
                    <span>Cash from financing</span>
                    <span className="font-mono">{formatCurrency(payablesIncome, currencySymbol)}</span>
                  </div>
                </div>
              </div>

              {/* Cash Outflows Column */}
              <div>
                <div className="bg-[#3f454a] text-white font-bold py-1 px-2.5 uppercase text-[10px] flex justify-between">
                  <span>Cash Outflows</span>
                  <span>Amount</span>
                </div>
                <div className="divide-y divide-neutral-100 text-[11px]">
                  <div
                    onClick={() => onSelectCategory('Bank Transaction', 'expense')}
                    className="flex justify-between py-0.5 px-2.5 bg-white hover:bg-red-50 cursor-pointer"
                  >
                    <span className="text-neutral-700">Payments to Bank Transactions</span>
                    <span className="font-mono text-neutral-800">{formatCurrency(bankExpense > 0 ? -bankExpense : 0, currencySymbol)}</span>
                  </div>
                  <div
                    onClick={() => onSelectCategory('Savings', 'expense')}
                    className="flex justify-between py-0.5 px-2.5 bg-[#f8f9fa] hover:bg-red-50 cursor-pointer"
                  >
                    <span className="text-neutral-700">Savings</span>
                    <span className="font-mono text-neutral-800">{formatCurrency(savingsExpense > 0 ? -savingsExpense : 0, currencySymbol)}</span>
                  </div>
                  <div
                    onClick={() => onSelectCategory('Transportation', 'expense')}
                    className="flex justify-between py-0.5 px-2.5 bg-white hover:bg-red-50 cursor-pointer"
                  >
                    <span className="text-neutral-700">Transportation expenses</span>
                    <span className="font-mono text-neutral-800">{formatCurrency(transportationExpense > 0 ? -transportationExpense : 0, currencySymbol)}</span>
                  </div>
                  <div
                    onClick={() => onSelectCategory('Utilities', 'expense')}
                    className="flex justify-between py-0.5 px-2.5 bg-[#f8f9fa] hover:bg-red-50 cursor-pointer"
                  >
                    <span className="text-neutral-700">Utilities expenses</span>
                    <span className="font-mono text-neutral-800">{formatCurrency(utilitiesExpense > 0 ? -utilitiesExpense : 0, currencySymbol)}</span>
                  </div>
                  <div
                    onClick={() => onSelectCategory('Food', 'expense')}
                    className="flex justify-between py-0.5 px-2.5 bg-white hover:bg-red-50 cursor-pointer"
                  >
                    <span className="text-neutral-700">Food expenses</span>
                    <span className="font-mono text-neutral-800">{formatCurrency(foodExpense > 0 ? -foodExpense : 0, currencySymbol)}</span>
                  </div>
                  <div
                    onClick={() => onSelectCategory('Entertainment', 'expense')}
                    className="flex justify-between py-0.5 px-2.5 bg-[#f8f9fa] hover:bg-red-50 cursor-pointer"
                  >
                    <span className="text-neutral-700">Entertainment expenses</span>
                    <span className="font-mono text-neutral-800">{formatCurrency(entertainmentExpense > 0 ? -entertainmentExpense : 0, currencySymbol)}</span>
                  </div>
                  <div
                    onClick={() => onSelectCategory('Housing', 'expense')}
                    className="flex justify-between py-0.5 px-2.5 bg-white hover:bg-red-50 cursor-pointer"
                  >
                    <span className="text-neutral-700">Housing expenses</span>
                    <span className="font-mono text-neutral-800">{formatCurrency(housingExpense > 0 ? -housingExpense : 0, currencySymbol)}</span>
                  </div>
                  <div
                    onClick={() => onSelectCategory('Health Care', 'expense')}
                    className="flex justify-between py-0.5 px-2.5 bg-[#f8f9fa] hover:bg-red-50 cursor-pointer"
                  >
                    <span className="text-neutral-700">Health Care expenses</span>
                    <span className="font-mono text-neutral-800">{formatCurrency(healthCareExpense > 0 ? -healthCareExpense : 0, currencySymbol)}</span>
                  </div>
                  <div
                    onClick={() => onSelectCategory('Personal Care', 'expense')}
                    className="flex justify-between py-0.5 px-2.5 bg-white hover:bg-red-50 cursor-pointer"
                  >
                    <span className="text-neutral-700">Personal Care expenses</span>
                    <span className="font-mono text-neutral-800">{formatCurrency(personalCareExpense > 0 ? -personalCareExpense : 0, currencySymbol)}</span>
                  </div>
                  <div
                    onClick={() => onSelectCategory('Miscellaneous', 'expense')}
                    className="flex justify-between py-0.5 px-2.5 bg-[#f8f9fa] hover:bg-red-50 cursor-pointer"
                  >
                    <span className="text-neutral-700">Miscellaneous expenses</span>
                    <span className="font-mono text-neutral-800">{formatCurrency(miscExpense > 0 ? -miscExpense : 0, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between py-1 px-2.5 bg-[#fde8e8] text-[#c5221f] font-bold">
                    <span>Recurring Expenses</span>
                    <span className="font-mono">
                      {formatCurrency(
                        fixedExpenses + entertainmentExpense + transportationExpense + bankExpense + miscExpense > 0
                          ? -(fixedExpenses + entertainmentExpense + transportationExpense + bankExpense + miscExpense)
                          : 0,
                        currencySymbol
                      )}
                    </span>
                  </div>
                  <div
                    onClick={() => onSelectCategory('Account Payables', 'expense')}
                    className="flex justify-between py-0.5 px-2.5 bg-white hover:bg-red-50 cursor-pointer"
                  >
                    <span className="text-neutral-700">Payments to Account Payables</span>
                    <span className="font-mono text-neutral-800">{formatCurrency(payablesExpense > 0 ? -payablesExpense : 0, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between py-1 px-2.5 bg-[#fde8e8] text-[#c5221f] font-bold">
                    <span>Cash from financing</span>
                    <span className="font-mono">{formatCurrency(payablesExpense > 0 ? -payablesExpense : 0, currencySymbol)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Horizontal Bar Chart for Visualizing Period Expenses & Wealth */}
            <div className="px-2">
              <PeriodExpenseChart
                incomes={incomeChartData}
                expenses={expenseChartData}
                assets={[
                  { category: 'Cash and cash equivalents', value: cashEquivalents },
                  { category: 'Stocks', value: stockAssets },
                  { category: 'Crypto', value: cryptoAssets },
                  { category: 'Real estate', value: realEstateAssets },
                  { category: 'Vehicles', value: vehicleAssets },
                  { category: 'Investment accounts', value: investmentAccounts },
                  { category: 'Retirement accounts', value: retirementAccounts },
                  { category: 'Other assets', value: otherAssets },
                ].filter((a) => a.value > 0 || a.category === 'Cash and cash equivalents')}
                liabilities={[
                  { category: 'Mortgage balance', amount: mortgageBalance },
                  { category: 'Car loan', amount: carLoan },
                  { category: 'Credit card balances', amount: creditCardBalances },
                  { category: 'Personal loan', amount: personalLoan },
                  { category: 'Student loan', amount: studentLoan },
                  { category: 'Other debts', amount: otherDebts },
                ].filter((l) => l.amount > 0)}
                currencySymbol={currencySymbol}
                onSelectCategory={(cat, type) => onSelectCategory(cat, type)}
              />
            </div>
          </div>

          {/* Bottom Cash Flow Summary Blocks */}
          <div className="p-3 bg-neutral-100 border-t border-neutral-300">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 border border-neutral-300 flex justify-between items-center">
                <span className="font-bold text-neutral-800">Total Cash Inflows</span>
                <span className="font-mono font-bold text-neutral-900">{formatCurrency(cashInflows, currencySymbol)}</span>
              </div>
              <div className="bg-white p-2 border border-neutral-300 flex justify-between items-center">
                <span className="font-bold text-neutral-800">Total Cash Outflows</span>
                <span className="font-mono font-bold text-[#c5221f]">
                  {formatCurrency(cashOutflows > 0 ? -cashOutflows : 0, currencySymbol)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
              <div className="bg-[#e8f5e9] p-2 border border-emerald-300">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-[#137333] dark:text-emerald-400">Net Cash Flow</span>
                  <span className="font-mono font-bold text-[#137333] dark:text-emerald-300 text-sm">
                    {formatCurrency(netCashFlow, currencySymbol)}
                  </span>
                </div>
                <div className="text-[10px] text-neutral-600 dark:text-emerald-200/90 font-mono mt-0.5">
                  [Total Cash Inflows] - [Total Cash Outflows]
                </div>
              </div>

              <div className="statement-light-row bg-[#fef9c3] p-2 border border-yellow-300">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-amber-950 dark:!text-amber-950">Ending Balance</span>
                  <span className="font-mono font-bold text-amber-950 dark:!text-amber-950 text-sm">
                    {formatCurrency(cashFlowEndingBalance, currencySymbol)}
                  </span>
                </div>
                <div className="text-[10px] text-neutral-800 dark:!text-neutral-900 font-mono font-semibold mt-0.5">
                  [Beginning Balance] + [Net Cash Flow]
                </div>
              </div>
            </div>
          </div>
        </div>
  );

  const renderBalanceSheet = (isMobileSubpage = false) => (
          <div className="border border-neutral-300 bg-white shadow-xs rounded-xs overflow-hidden">
      {isMobileSubpage && (
        <div className="flex items-center justify-between bg-neutral-800 text-white px-3 py-2 border-b border-neutral-700">
          <button
            type="button"
            onClick={() => handleTabChange('dashboard')}
            className="inline-flex items-center gap-1 text-xs text-emerald-400 font-bold hover:text-emerald-300 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Overview</span>
          </button>
          <span className="text-[10px] text-neutral-400 font-mono">Personal Balance Sheet</span>
        </div>
      )}
        {/* Banner Header */}
        <div className="bg-[#2d3134] text-white p-2.5 text-center border-b border-neutral-700">
          <h2 className="font-bold text-base tracking-wide uppercase">Personal Balance Sheet</h2>
        </div>

        <div className={`grid grid-cols-1 ${isExportingPdf ? 'grid-cols-2 divide-x' : 'md:grid-cols-2 divide-y md:divide-y-0 md:divide-x'} divide-neutral-200 text-xs`}>
          {/* Assets Column */}
          <div>
            <div className="grid grid-cols-12 bg-[#3f454a] text-white font-bold py-1.5 px-3 uppercase text-[11px]">
              <div className="col-span-8">Assets:</div>
              <div className="col-span-4 text-right">Value</div>
            </div>

            <div className="divide-y divide-neutral-100">
              <div className="grid grid-cols-12 py-1 px-3 bg-white items-center">
                <div className="col-span-8 text-neutral-800">
                  Cash and cash equivalents
                  <span className="text-[10px] text-neutral-400 block">
                    (Synchronized with ending balance &amp; liquid cash)
                  </span>
                </div>
                <div className="col-span-4 text-right font-mono font-semibold text-neutral-900">
                  {formatCurrency(cashEquivalents, currencySymbol)}
                </div>
              </div>

              <div className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] items-center">
                <div className="col-span-8 text-neutral-700">Stocks / Equities</div>
                <div className="col-span-4 text-right font-mono text-neutral-800">
                  {formatCurrency(stockAssets, currencySymbol)}
                </div>
              </div>

              <div className="grid grid-cols-12 py-1 px-3 bg-white items-center">
                <div className="col-span-8 text-neutral-700">Crypto</div>
                <div className="col-span-4 text-right font-mono text-neutral-800">
                  {formatCurrency(cryptoAssets, currencySymbol)}
                </div>
              </div>

              <div className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] items-center">
                <div className="col-span-8 text-neutral-700">Real estate</div>
                <div className="col-span-4 text-right font-mono text-neutral-800">
                  {formatCurrency(realEstateAssets, currencySymbol)}
                </div>
              </div>

              <div className="grid grid-cols-12 py-1 px-3 bg-white items-center">
                <div className="col-span-8 text-neutral-700">Vehicles</div>
                <div className="col-span-4 text-right font-mono text-neutral-800">
                  {formatCurrency(vehicleAssets, currencySymbol)}
                </div>
              </div>

              <div className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] items-center">
                <div className="col-span-8 text-neutral-700">Investment accounts</div>
                <div className="col-span-4 text-right font-mono text-neutral-800">
                  {formatCurrency(investmentAccounts, currencySymbol)}
                </div>
              </div>

              <div className="grid grid-cols-12 py-1 px-3 bg-white items-center">
                <div className="col-span-8 text-neutral-700">Retirement accounts</div>
                <div className="col-span-4 text-right font-mono text-neutral-800">
                  {formatCurrency(retirementAccounts, currencySymbol)}
                </div>
              </div>

              <div className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] items-center">
                <div className="col-span-8 text-neutral-700">Other assets</div>
                <div className="col-span-4 text-right font-mono text-neutral-800">
                  {formatCurrency(otherAssets, currencySymbol)}
                </div>
              </div>

              {/* Total Assets Summary */}
              <div className="grid grid-cols-12 py-2 px-3 bg-[#343a40] text-white font-extrabold items-center">
                <div className="col-span-8 uppercase tracking-wide">Total Assets</div>
                <div className="col-span-4 text-right font-mono text-sm text-emerald-300">
                  {formatCurrency(totalAssets, currencySymbol)}
                </div>
              </div>

              {/* Net Worth Row */}
              <div className="grid grid-cols-12 py-2.5 px-3 bg-[#1e293b] text-white font-black items-center border-t-2 border-emerald-500">
                <div className="col-span-8 uppercase tracking-wider text-xs sm:text-sm text-emerald-400">
                  Net Worth:
                </div>
                <div className="col-span-4 text-right font-mono text-sm sm:text-base text-white">
                  {formatCurrency(netWorth, currencySymbol)}
                </div>
              </div>
            </div>
          </div>

          {/* Liabilities Column */}
          <div>
            <div className="grid grid-cols-12 bg-[#3f454a] text-white font-bold py-1.5 px-3 uppercase text-[11px]">
              <div className="col-span-8">Liabilities:</div>
              <div className="col-span-4 text-right">Value</div>
            </div>

            <div className="divide-y divide-neutral-100">
              <div className="grid grid-cols-12 py-1 px-3 bg-white items-center">
                <div className="col-span-8 text-neutral-800">Mortgage balance</div>
                <div className="col-span-4 text-right font-mono font-semibold text-neutral-900">
                  {formatCurrency(mortgageBalance, currencySymbol)}
                </div>
              </div>

              <div className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] items-center">
                <div className="col-span-8 text-neutral-700">Auto loan (Car loan)</div>
                <div className="col-span-4 text-right font-mono text-neutral-800">
                  {formatCurrency(carLoan, currencySymbol)}
                </div>
              </div>

              <div className="grid grid-cols-12 py-1 px-3 bg-white items-center">
                <div className="col-span-8 text-neutral-700">Credit card balances</div>
                <div className="col-span-4 text-right font-mono text-neutral-800">
                  {formatCurrency(creditCardBalances, currencySymbol)}
                </div>
              </div>

              <div className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] items-center">
                <div className="col-span-8 text-neutral-700">Personal loan</div>
                <div className="col-span-4 text-right font-mono text-neutral-800">
                  {formatCurrency(personalLoan, currencySymbol)}
                </div>
              </div>

              <div className="grid grid-cols-12 py-1 px-3 bg-white items-center">
                <div className="col-span-8 text-neutral-700">Student loan</div>
                <div className="col-span-4 text-right font-mono text-neutral-800">
                  {formatCurrency(studentLoan, currencySymbol)}
                </div>
              </div>

              <div className="grid grid-cols-12 py-1 px-3 bg-[#f8f9fa] items-center">
                <div className="col-span-8 text-neutral-700">Other debts</div>
                <div className="col-span-4 text-right font-mono text-neutral-800">
                  {formatCurrency(otherDebts, currencySymbol)}
                </div>
              </div>

              {/* Total Liabilities Summary */}
              <div className="grid grid-cols-12 py-2 px-3 bg-[#343a40] text-white font-extrabold items-center">
                <div className="col-span-8 uppercase tracking-wide">Total Liabilities</div>
                <div className="col-span-4 text-right font-mono text-sm text-red-300">
                  {formatCurrency(totalLiabilities, currencySymbol)}
                </div>
              </div>

              {/* Summary note */}
              <div className="py-2.5 px-3 bg-neutral-100 text-neutral-500 text-[11px] flex justify-between items-center italic">
                <span>Total Assets - Total Liabilities</span>
                <span className="font-mono font-semibold text-neutral-700">= Net Worth</span>
              </div>
            </div>
          </div>
        </div>
      </div>
  );

  
  const renderOverview = () => (
    <div className="space-y-3">
      {/* 4 Key Metric Cards for Mobile */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Net Worth */}
        <div className="bg-white p-3 border border-neutral-300 shadow-xs rounded">
          <div className="flex items-center justify-between text-neutral-500 font-medium">
            <span>Net Worth</span>
            <Scale className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-base font-bold font-mono text-neutral-900 mt-1">
            {formatCurrency(netWorth, currencySymbol)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Assets - Liabilities
          </div>
        </div>

        {/* Ending Balance (Rolling Liquid Cash) */}
        <div className="bg-white p-3 border border-neutral-300 shadow-xs rounded">
          <div className="flex items-center justify-between text-neutral-500 font-medium">
            <span>Cash &amp; Bank</span>
            <Wallet className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-base font-bold font-mono text-emerald-700 mt-1">
            {formatCurrency(endingBalance, currencySymbol)}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5 truncate">
            Rolling Cash Equivalents
          </div>
        </div>

        {/* Net Income (Period) */}
        <div className="bg-white p-3 border border-neutral-300 shadow-xs rounded">
          <div className="flex items-center justify-between text-neutral-500 font-medium">
            <span>Net Income</span>
            {netIncome >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-red-600" />
            )}
          </div>
          <div
            className={`text-base font-bold font-mono mt-1 ${
              netIncome >= 0 ? 'text-[#137333]' : 'text-[#c5221f]'
            }`}
          >
            {formatCurrency(netIncome, currencySymbol)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Income - Expenses
          </div>
        </div>

        {/* Operating Cash Flow */}
        <div className="bg-white p-3 border border-neutral-300 shadow-xs rounded">
          <div className="flex items-center justify-between text-neutral-500 font-medium">
            <span>Net Cash Flow</span>
            <ArrowDownUp className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <div
            className={`text-base font-bold font-mono mt-1 ${
              netCashFlow >= 0 ? 'text-neutral-900' : 'text-[#c5221f]'
            }`}
          >
            {formatCurrency(netCashFlow, currencySymbol)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
            Inflows - Outflows
          </div>
        </div>
      </div>

      {/* Mobile Subpage Navigation Cards with drill-down buttons */}
      <div className="space-y-2">
        {/* Income Statement Jump Card */}
        <div
          onClick={() => handleTabChange('income')}
          className="bg-white p-3 border border-neutral-300 rounded shadow-xs cursor-pointer hover:border-emerald-500 transition space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
                <ReceiptText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-neutral-900">Personal Income Statement</h3>
                <p className="text-[10px] text-neutral-500 font-mono">
                  Earned income, investments &amp; categorized expenses
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="grid grid-cols-3 gap-1 pt-1 border-t border-neutral-100 text-[11px]">
            <div>
              <span className="text-neutral-400 text-[10px] block">Earned Income</span>
              <span className="font-mono font-bold text-neutral-900">{formatCurrency(earnedIncome, currencySymbol)}</span>
            </div>
            <div>
              <span className="text-neutral-400 text-[10px] block">Total Expenses</span>
              <span className="font-mono font-bold text-[#c5221f]">{formatCurrency(totalExpenses > 0 ? -totalExpenses : 0, currencySymbol)}</span>
            </div>
            <div>
              <span className="text-neutral-400 text-[10px] block">Net Income</span>
              <span className={`font-mono font-bold ${netIncome >= 0 ? 'text-[#137333]' : 'text-[#c5221f]'}`}>
                {formatCurrency(netIncome, currencySymbol)}
              </span>
            </div>
          </div>
        </div>

        {/* Cash Flow Statement Jump Card */}
        <div
          onClick={() => handleTabChange('cashflow')}
          className="bg-white p-3 border border-neutral-300 rounded shadow-xs cursor-pointer hover:border-emerald-500 transition space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
                <ArrowDownUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-neutral-900">Cash Flow Statement</h3>
                <p className="text-[10px] text-neutral-500 font-mono">
                  Cash inflows, outflows &amp; ending balance tracking
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="grid grid-cols-3 gap-1 pt-1 border-t border-neutral-100 text-[11px]">
            <div>
              <span className="text-neutral-400 text-[10px] block">Cash Inflows</span>
              <span className="font-mono font-bold text-neutral-900">{formatCurrency(cashInflows, currencySymbol)}</span>
            </div>
            <div>
              <span className="text-neutral-400 text-[10px] block">Cash Outflows</span>
              <span className="font-mono font-bold text-[#c5221f]">{formatCurrency(cashOutflows > 0 ? -cashOutflows : 0, currencySymbol)}</span>
            </div>
            <div>
              <span className="text-neutral-400 text-[10px] block">Ending Cash</span>
              <span className="font-mono font-bold text-emerald-700">{formatCurrency(endingBalance, currencySymbol)}</span>
            </div>
          </div>
        </div>

        {/* Balance Sheet Jump Card */}
        <div
          onClick={() => handleTabChange('balancesheet')}
          className="bg-white p-3 border border-neutral-300 rounded shadow-xs cursor-pointer hover:border-emerald-500 transition space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-neutral-900">Personal Balance Sheet</h3>
                <p className="text-[10px] text-neutral-500 font-mono">
                  Assets, properties, debts &amp; net worth
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="grid grid-cols-3 gap-1 pt-1 border-t border-neutral-100 text-[11px]">
            <div>
              <span className="text-neutral-400 text-[10px] block">Total Assets</span>
              <span className="font-mono font-bold text-emerald-700">{formatCurrency(totalAssets, currencySymbol)}</span>
            </div>
            <div>
              <span className="text-neutral-400 text-[10px] block">Total Liabilities</span>
              <span className="font-mono font-bold text-red-700">{formatCurrency(totalLiabilities, currencySymbol)}</span>
            </div>
            <div>
              <span className="text-neutral-400 text-[10px] block">Net Worth</span>
              <span className="font-mono font-bold text-neutral-900">{formatCurrency(netWorth, currencySymbol)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Bar Chart for Visualizing Period Expenses & Wealth */}
      <div className="bg-white p-2 border border-neutral-300 rounded shadow-xs overflow-x-auto">
        <PeriodExpenseChart
          incomes={incomeChartData}
          expenses={expenseChartData}
          assets={[
            { category: 'Cash and cash equivalents', value: cashEquivalents },
            { category: 'Stocks', value: stockAssets },
            { category: 'Crypto', value: cryptoAssets },
            { category: 'Real estate', value: realEstateAssets },
            { category: 'Vehicles', value: vehicleAssets },
            { category: 'Investment accounts', value: investmentAccounts },
            { category: 'Retirement accounts', value: retirementAccounts },
            { category: 'Other assets', value: otherAssets },
          ].filter((a) => a.value > 0 || a.category === 'Cash and cash equivalents')}
          liabilities={[
            { category: 'Mortgage balance', amount: mortgageBalance },
            { category: 'Car loan', amount: carLoan },
            { category: 'Credit card balances', amount: creditCardBalances },
            { category: 'Personal loan', amount: personalLoan },
            { category: 'Student loan', amount: studentLoan },
            { category: 'Other debts', amount: otherDebts },
          ].filter((l) => l.amount > 0)}
          currencySymbol={currencySymbol}
          onSelectCategory={(cat, type) => onSelectCategory(cat, type)}
        />
      </div>
    </div>
  );


  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 select-none">
      {/* ================= TOP CONTROL BAR (OUTSIDE PRINTABLE FINANCIAL STATEMENT AREA) ================= */}
      <div className="bg-[#1f2324] text-white rounded-lg border border-neutral-700 shadow-md print:hidden overflow-hidden">
        {/* Accordion Summary Header Bar (Always visible, click to toggle full controls) */}
        <div className="p-3 sm:p-3.5 bg-neutral-900/80 border-b border-neutral-800 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setIsControlsExpanded((prev) => !prev)}
              className="flex items-center gap-2 text-xs font-bold text-white hover:text-emerald-400 transition cursor-pointer"
              title="Toggle statement controls and filters"
            >
              <div className="w-6 h-6 rounded-md bg-neutral-800 border border-neutral-700 flex items-center justify-center text-emerald-400 shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <span className="uppercase tracking-wider">Statement Filters &amp; Controls</span>
              {isControlsExpanded ? (
                <ChevronUp className="w-4 h-4 text-neutral-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsControlsExpanded((prev) => !prev)}
              className="px-2.5 py-1 text-[11px] font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded border border-neutral-700 transition cursor-pointer"
            >
              {isControlsExpanded ? 'Hide Controls' : 'Edit Filters'}
            </button>
          </div>
        </div>

        {/* Collapsible Panel Body */}
        {isControlsExpanded && (
          <div className="p-3 sm:p-3.5 space-y-3 animate-in fade-in duration-150">
            {/* Ledger Owner & Quick Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-neutral-800">
              {/* Dynamic Personalization / Ledger Owner Control */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider">
                  Ledger Owner:
                </span>
                {isEditingName ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      placeholder="Enter ledger owner name"
                      className="bg-neutral-800 text-white border border-neutral-600 rounded px-2.5 py-1 text-xs focus:outline-hidden focus:border-emerald-500 font-medium"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') setIsEditingName(false);
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-neutral-800/90 border border-neutral-700 px-2.5 py-1 rounded">
                    <span className="text-xs font-bold text-emerald-300">
                      {rawName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTempName(rawName);
                        setIsEditingName(true);
                      }}
                      className="text-neutral-400 hover:text-white p-0.5 rounded transition cursor-pointer"
                      title="Change personalized ledger name"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-neutral-400 hover:text-emerald-400" />
                    </button>
                  </div>
                )}
              </div>

              {/* Global Time Window Preset Bar (Day, Week, Month, Year, All Time, Current) */}
              <div className="flex flex-wrap items-center gap-1 bg-[#282d30] p-1 rounded-lg border border-neutral-600 text-xs">
                <span className="text-[10px] uppercase font-bold text-neutral-400 px-1 hidden sm:inline">
                  Time Window:
                </span>
                {(['day', 'week', 'month', 'year', 'all'] as const).map((p) => {
                  const labels = {
                    day: 'Day',
                    week: 'Week',
                    month: 'Month',
                    year: 'Year',
                    all: 'All Time',
                  };
                  const isSelected = (!filterByPeriod && p === 'all') || (filterByPeriod && timePreset === p);

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-xs font-bold'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-700/60'
                      }`}
                      title={p === 'all' ? 'Display complete ledger history across all time' : `Filter statement by ${labels[p]}`}
                    >
                      <span>{labels[p]}</span>
                    </button>
                  );
                })}

                {/* Current Button alongside selector: dynamically jumps to present period */}
                <button
                  type="button"
                  onClick={handleJumpToCurrent}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-xs transition cursor-pointer ml-0.5"
                  title="Jump to present active period (Today / Current Week / Current Month / Current Year)"
                >
                  <Clock className="w-3 h-3" />
                  <span>Current</span>
                </button>
              </div>
            </div>

            {/* Date Filter Inputs & Action Buttons */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-xs">
              {/* Start and End Selectors */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                {/* Start Month & Year */}
                <div className={`flex items-center justify-between bg-[#282d30] px-3 py-2 rounded border transition min-h-[42px] flex-1 sm:flex-initial sm:w-auto ${filterByPeriod ? 'border-neutral-600' : 'border-neutral-700 opacity-60'}`}>
                  <span className="text-neutral-400 font-semibold mr-2 uppercase text-[10px] shrink-0">
                    Start:
                  </span>
                  <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
                    <select
                      value={period.startMonth}
                      onChange={(e) => {
                        setFilterByPeriod(true);
                        setPeriod((prev) => ({ ...prev, startMonth: e.target.value }));
                      }}
                      className="bg-transparent text-white font-medium focus:outline-hidden cursor-pointer text-xs truncate"
                    >
                      {MONTH_NAMES.map((m) => (
                        <option key={m} value={m} className="bg-neutral-800 text-white">
                          {m}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={period.startYear}
                      onChange={(e) => {
                        setFilterByPeriod(true);
                        setPeriod((prev) => ({ ...prev, startYear: parseInt(e.target.value) || new Date().getFullYear() }));
                      }}
                      className="w-16 min-w-[3.5rem] bg-transparent text-white text-right font-medium focus:outline-hidden border-l border-neutral-700 pl-2 shrink-0"
                    />
                  </div>
                </div>

                {/* End Month & Year */}
                <div className={`flex items-center justify-between bg-[#282d30] px-3 py-2 rounded border transition min-h-[42px] flex-1 sm:flex-initial sm:w-auto ${filterByPeriod ? 'border-neutral-600' : 'border-neutral-700 opacity-60'}`}>
                  <span className="text-neutral-400 font-semibold mr-2 uppercase text-[10px] shrink-0">
                    End:
                  </span>
                  <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
                    <select
                      value={period.endMonth}
                      onChange={(e) => {
                        setFilterByPeriod(true);
                        setPeriod((prev) => ({ ...prev, endMonth: e.target.value }));
                      }}
                      className="bg-transparent text-white font-medium focus:outline-hidden cursor-pointer text-xs truncate"
                    >
                      {MONTH_NAMES.map((m) => (
                        <option key={m} value={m} className="bg-neutral-800 text-white">
                          {m}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={period.endYear}
                      onChange={(e) => {
                        setFilterByPeriod(true);
                        setPeriod((prev) => ({ ...prev, endYear: parseInt(e.target.value) || new Date().getFullYear() }));
                      }}
                      className="w-16 min-w-[3.5rem] bg-transparent text-white text-right font-medium focus:outline-hidden border-l border-neutral-700 pl-2 shrink-0"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons in a responsive grid for mobile, flex for desktop */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                {/* Contextual Guide Popup Button */}
                {onOpenHelp && (
                  <Tooltip content="Open operational guide and button explanations for Financial Statements" position="bottom">
                    <button
                      type="button"
                      onClick={onOpenHelp}
                      className="flex-1 sm:flex-initial min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded text-xs font-semibold transition border border-neutral-600 shadow-xs cursor-pointer"
                      title="Open operational guide"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Guide</span>
                    </button>
                  </Tooltip>
                )}

                {/* Current Month Quick Filter Button */}
                <Tooltip content="Set period filter to the current system month and year" position="bottom">
                  <button
                    type="button"
                    onClick={handleSetCurrentMonth}
                    className="flex-1 sm:flex-initial min-h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded text-xs font-semibold transition border border-neutral-500 shadow-xs cursor-pointer"
                    title="Set period filter to the current system month and year"
                  >
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Current Month</span>
                  </button>
                </Tooltip>

                {/* PDF Export Button */}
                <Tooltip content="Generate and download a high-resolution printable PDF statement" position="bottom">
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={isExportingPdf}
                    className="w-full sm:w-auto min-h-[40px] flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-white rounded text-xs font-semibold transition shadow-xs border border-emerald-600 cursor-pointer"
                    title="Export statement as PDF document"
                  >
                    {isExportingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileDown className="w-3.5 h-3.5" />
                    )}
                    <span>{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= PRINTABLE FINANCIAL STATEMENT AREA ================= */}
      <div id="printable-statement" className="printable-statement space-y-4">
        {/* Main Statement Title Bar (Clean, Professional, Print-Ready) */}
        <div className="bg-[#2e3436] text-white p-3.5 shadow-sm border border-neutral-700 print:bg-neutral-900 print:text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-sm sm:text-base md:text-lg font-black tracking-wider uppercase text-white break-words">
                {displayTitle}
              </h1>
              <p className="text-xs text-neutral-300 font-medium">
                {!filterByPeriod
                  ? 'All-Time Financial History (All Logged Records)'
                  : `Personal Cashflow & Balance Sheet Statement · ${period.startMonth} ${period.startYear} to ${period.endMonth} ${period.endYear}`}
              </p>
            </div>
            <div className="text-left sm:text-right font-mono text-[11px] text-neutral-300 flex flex-col sm:items-end">
              <span className={`font-semibold px-2 py-0.5 rounded border self-start sm:self-auto text-[10px] sm:text-[11px] ${
                !filterByPeriod
                  ? 'text-emerald-300 bg-emerald-950/90 border-emerald-700'
                  : 'text-emerald-400 bg-neutral-900/80 border-neutral-700'
              }`}>
                {!filterByPeriod
                  ? 'Quick Select: All Time History'
                  : `Period: ${period.startMonth} ${period.startYear} to ${period.endMonth} ${period.endYear}`}
              </span>
              <span className="text-neutral-400 text-[10px] mt-0.5">
                Currency: {currencySymbol} · Records: {periodTransactions.length}
              </span>
            </div>
          </div>
        </div>


        {/* ================= DESKTOP SIDE-BY-SIDE VIEW (lg and up, and on print) ================= */}
        <div className="hidden lg:block print:block space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {renderIncomeStatement(false)}
            {renderCashFlowStatement(false)}
          </div>
          {renderBalanceSheet(false)}
        </div>

        {/* ================= MOBILE DISTINCT SUBPAGES VIEW (under lg) ================= */}
        <div className="lg:hidden print:hidden space-y-3">
          {currentSubTab === 'dashboard' && renderOverview()}
          {currentSubTab === 'income' && renderIncomeStatement(true)}
          {currentSubTab === 'cashflow' && renderCashFlowStatement(true)}
          {currentSubTab === 'balancesheet' && renderBalanceSheet(true)}
        </div>
      </div>
    </div>
  );
};
