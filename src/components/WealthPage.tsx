import React, { useState, useMemo } from 'react';
import {
  AssetItem,
  AssetTransaction,
  AssetCategory,
  LiabilityItem,
  LiabilityPayment,
  LiabilityCategory,
  TransactionType,
  IncomeClassification,
  ExpenseClassification,
  formatCurrency,
} from '../types/finance';
import { AssetsPage } from './AssetsPage';
import { LiabilitiesPage } from './LiabilitiesPage';
import { InteractiveFinanceChart, ChartSliceData } from './InteractiveFinanceChart';
import { getCategoryColor } from '../services/categoryColors';
import { ConfirmModal } from './ConfirmModal';
import {
  Wallet,
  CreditCard,
  Scale,
  ShieldCheck,
  History,
  PieChart as PieIcon,
  BarChart2,
  Search,
  Filter,
  ArrowDownUp,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Calendar,
  Layers,
  Trash2,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Building,
  Landmark,
  Receipt,
  Tag,
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { Tooltip } from './Tooltip';

interface WealthPageProps {
  assets: AssetItem[];
  assetTransactions: AssetTransaction[];
  liabilities: LiabilityItem[];
  liabilityPayments: LiabilityPayment[];
  currencySymbol: string;
  onOpenHelp?: () => void;
  onAddAsset: (
    asset: Omit<AssetItem, 'id' | 'createdAt' | 'updatedAt'>,
    autoLedger?: { enabled: boolean; type: 'expense' | 'income'; category: string }
  ) => void;
  onUpdateAsset: (asset: AssetItem) => void;
  onDeleteAsset: (assetId: string) => void;
  onAddAssetTransaction: (
    data: Omit<AssetTransaction, 'id' | 'createdAt'>,
    autoLedger?: { enabled: boolean; type: 'expense' | 'income'; category: string }
  ) => void;
  onDeleteAssetTransaction: (txId: string) => void;
  onAddLiability: (
    liability: Omit<LiabilityItem, 'id' | 'createdAt' | 'updatedAt'>,
    autoLedger?: { enabled: boolean; type: 'expense' | 'income'; category: string }
  ) => void;
  onUpdateLiability: (liability: LiabilityItem) => void;
  onDeleteLiability: (liabilityId: string) => void;
  onAddLiabilityPayment: (
    data: Omit<LiabilityPayment, 'id' | 'createdAt'>,
    autoLedger?: { enabled: boolean; category: string }
  ) => void;
  onDeleteLiabilityPayment: (paymentId: string) => void;
  currentCashBalance?: number;
  onAddTransaction?: (data: {
    name: string;
    type: TransactionType;
    category: string;
    subCategory: IncomeClassification | ExpenseClassification;
    description?: string;
    amount: number;
    date: string;
  }) => Promise<void> | void;
  activeSubTab?: 'assets' | 'liabilities' | 'summary';
  onSubTabChange?: (tab: 'assets' | 'liabilities' | 'summary') => void;
}

// Unified representation for the comprehensive visible transaction history
interface UnifiedWealthMovement {
  id: string;
  sourceType: 'asset_tx' | 'liability_payment';
  originalId: string;
  date: string;
  typeBadge: string;
  badgeColor: string;
  parentName: string;
  parentCategory: string;
  subDetail: string;
  notes?: string;
  amount: number;
  netWorthImpact: 'positive' | 'negative' | 'neutral';
  impactAmount: number;
  extraMeta?: string;
}

export const WealthPage: React.FC<WealthPageProps> = ({
  assets,
  assetTransactions,
  liabilities,
  liabilityPayments,
  currencySymbol,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  onAddAssetTransaction,
  onDeleteAssetTransaction,
  onAddLiability,
  onUpdateLiability,
  onDeleteLiability,
  onAddLiabilityPayment,
  onDeleteLiabilityPayment,
  currentCashBalance,
  onAddTransaction,
  activeSubTab,
  onSubTabChange,
  onOpenHelp,
}) => {
  // Sub-view tab switcher: 'assets' | 'liabilities' | 'history'
  const [wealthTab, setWealthTab] = useState<'assets' | 'liabilities' | 'history'>('assets');

  // Effective mobile sub-tab: 'assets' | 'liabilities' | 'summary'
  const currentMobileTab = activeSubTab || (wealthTab === 'history' ? 'summary' : wealthTab);

  const handleMobileTabSelect = (tab: 'assets' | 'liabilities' | 'summary') => {
    if (tab === 'summary') {
      setWealthTab('history');
    } else {
      setWealthTab(tab);
    }
    if (onSubTabChange) {
      onSubTabChange(tab);
    }
  };

  // Chart Visualisation Controls
  const [showCharts, setShowCharts] = useState<boolean>(true);
  const [chartScope, setChartScope] = useState<'both' | 'assets' | 'liabilities'>('both');
  const [chartStyle, setChartStyle] = useState<'donut' | 'bar'>('donut');
  const [chartGranularity, setChartGranularity] = useState<'category' | 'individual'>('category');

  // Transaction History Controls
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyFilterType, setHistoryFilterType] = useState<
    'all' | 'asset_tx' | 'liability_payment' | 'inflow' | 'outflow'
  >('all');
  const [historySortBy, setHistorySortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [historySortColumn, setHistorySortColumn] = useState<'date' | 'type' | 'account' | 'details' | 'amount' | 'impact'>('date');
  const [historySortDirection, setHistorySortDirection] = useState<'asc' | 'desc'>('desc');

  const handleHistorySort = (col: 'date' | 'type' | 'account' | 'details' | 'amount' | 'impact') => {
    if (historySortColumn === col) {
      setHistorySortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setHistorySortColumn(col);
      setHistorySortDirection(col === 'date' || col === 'amount' ? 'desc' : 'asc');
    }
  };

  // Delete confirmation modal state
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'asset_tx' | 'liability_payment';
    id: string;
    name: string;
  } | null>(null);

  // Global Time Window Filter Controls for Wealth
  const [timePreset, setTimePreset] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('all');
  const [exactDateRange, setExactDateRange] = useState<{ start: string; end: string } | null>(null);

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
    setExactDateRange(calculatePresetRange(preset));
  };

  const handleJumpToCurrent = () => {
    const activePreset = timePreset === 'all' ? 'month' : timePreset;
    handleApplyPreset(activePreset);
  };

  // Helper to determine whether an item with a given acquisition date is active in the selected window
  const isItemAcquiredInWindow = (itemDate?: string): boolean => {
    if (!exactDateRange || !exactDateRange.end) return true; // All time or open ended
    if (!itemDate) return true;
    // Exclude if acquisition/creation date is after the window end date
    return itemDate <= exactDateRange.end;
  };

  // Helper to check if a liability has been settled prior to or by the window
  const getLiabilitySettlementInfo = (l: LiabilityItem) => {
    const pays = liabilityPayments
      .filter((p) => p.liabilityId === l.id)
      .sort((a, b) => a.date.localeCompare(b.date));
    let accumulated = 0;
    let settlementDate: string | null = null;
    for (const p of pays) {
      accumulated += p.amount;
      if (accumulated >= l.initialAmount) {
        settlementDate = p.date;
        break;
      }
    }
    const currentBalance = Math.max(0, l.initialAmount - accumulated);
    const isSettled = currentBalance <= 0 || (l.notes && l.notes.toLowerCase().includes('settled'));
    return { isSettled, settlementDate, currentBalance };
  };

  // Filtered Assets respecting acquisition/creation date
  const timeBoundAssets = useMemo(() => {
    return assets.filter((a) => isItemAcquiredInWindow(a.date));
  }, [assets, exactDateRange]);

  // Filtered Liabilities respecting acquisition date AND settlement exclusion
  const timeBoundLiabilities = useMemo(() => {
    return liabilities.filter((l) => {
      // 1. Exclude if acquisition date is after window
      if (!isItemAcquiredInWindow(l.date)) return false;

      // 2. Settlement exclusion: if liability reached zero or marked settled,
      // exclude if the selected time window falls strictly after settlement
      const { isSettled, settlementDate } = getLiabilitySettlementInfo(l);
      if (isSettled && settlementDate && exactDateRange?.start) {
        if (exactDateRange.start > settlementDate) {
          return false;
        }
      }
      return true;
    });
  }, [liabilities, liabilityPayments, exactDateRange]);

  // Compute live Total Assets (time-bound)
  const totalAssets = useMemo(() => {
    return timeBoundAssets.reduce((sum, a) => {
      const txs = assetTransactions.filter((t) => {
        if (t.assetId !== a.id) return false;
        if (exactDateRange?.end && t.date > exactDateRange.end) return false;
        return true;
      });
      const net = txs.reduce((s, t) => {
        return t.type === 'buy' || t.type === 'deposit' || t.type === 'appreciation'
          ? s + t.amount
          : s - t.amount;
      }, 0);
      return sum + Math.max(0, a.initialValue + net);
    }, 0);
  }, [timeBoundAssets, assetTransactions, exactDateRange]);

  // Compute live Total Liabilities (time-bound)
  const totalLiabilities = useMemo(() => {
    return timeBoundLiabilities.reduce((sum, l) => {
      const pays = liabilityPayments.filter((p) => {
        if (p.liabilityId !== l.id) return false;
        if (exactDateRange?.end && p.date > exactDateRange.end) return false;
        return true;
      });
      const totalPaid = pays.reduce((s, p) => s + p.amount, 0);
      return sum + Math.max(0, l.initialAmount - totalPaid);
    }, 0);
  }, [timeBoundLiabilities, liabilityPayments, exactDateRange]);

  const netWorth = totalAssets - totalLiabilities;
  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  // -------------------------------------------------------------
  // Chart Data Preparation: Asset Distribution
  // -------------------------------------------------------------
  const assetChartData: ChartSliceData[] = useMemo(() => {
    if (chartGranularity === 'category') {
      const map: Record<string, number> = {};
      timeBoundAssets.forEach((a) => {
        const txs = assetTransactions.filter((t) => {
          if (t.assetId !== a.id) return false;
          if (exactDateRange?.end && t.date > exactDateRange.end) return false;
          return true;
        });
        const net = txs.reduce((s, t) => {
          return t.type === 'buy' || t.type === 'deposit' || t.type === 'appreciation'
            ? s + t.amount
            : s - t.amount;
        }, 0);
        const currentVal = Math.max(0, a.initialValue + net);
        map[a.category] = (map[a.category] || 0) + currentVal;
      });

      return Object.entries(map)
        .filter(([, amount]) => amount > 0)
        .map(([cat, amount]) => ({
          category: cat,
          amount,
          color: getCategoryColor(cat),
        }));
    } else {
      // Individual Assets
      return timeBoundAssets.map((a) => {
        const txs = assetTransactions.filter((t) => {
          if (t.assetId !== a.id) return false;
          if (exactDateRange?.end && t.date > exactDateRange.end) return false;
          return true;
        });
        const net = txs.reduce((s, t) => {
          return t.type === 'buy' || t.type === 'deposit' || t.type === 'appreciation'
            ? s + t.amount
            : s - t.amount;
        }, 0);
        const currentVal = Math.max(0, a.initialValue + net);
        return {
          category: a.name,
          amount: currentVal,
          color: getCategoryColor(a.category),
        };
      }).filter((s) => s.amount > 0);
    }
  }, [timeBoundAssets, assetTransactions, chartGranularity, exactDateRange]);

  // -------------------------------------------------------------
  // Chart Data Preparation: Liability Distribution
  // -------------------------------------------------------------
  const liabilityChartData: ChartSliceData[] = useMemo(() => {
    if (chartGranularity === 'category') {
      const map: Record<string, number> = {};
      timeBoundLiabilities.forEach((l) => {
        const pays = liabilityPayments.filter((p) => {
          if (p.liabilityId !== l.id) return false;
          if (exactDateRange?.end && p.date > exactDateRange.end) return false;
          return true;
        });
        const paid = pays.reduce((s, p) => s + p.amount, 0);
        const balance = Math.max(0, l.initialAmount - paid);
        map[l.category] = (map[l.category] || 0) + balance;
      });

      return Object.entries(map)
        .filter(([, amount]) => amount > 0)
        .map(([cat, amount]) => ({
          category: cat,
          amount,
          color: getCategoryColor(cat),
        }));
    } else {
      // Individual Liabilities
      return timeBoundLiabilities.map((l, idx) => {
        const pays = liabilityPayments.filter((p) => {
          if (p.liabilityId !== l.id) return false;
          if (exactDateRange?.end && p.date > exactDateRange.end) return false;
          return true;
        });
        const paid = pays.reduce((s, p) => s + p.amount, 0);
        const balance = Math.max(0, l.initialAmount - paid);
        const palette = ['#ef4444', '#f97316', '#e11d48', '#8b5cf6', '#b91c1c', '#f43f5e'];
        return {
          category: l.name,
          amount: balance,
          color: palette[idx % palette.length],
        };
      }).filter((s) => s.amount > 0);
    }
  }, [timeBoundLiabilities, liabilityPayments, chartGranularity, exactDateRange]);

  // -------------------------------------------------------------
  // Comprehensive Unified Wealth Transaction History
  // -------------------------------------------------------------
  const unifiedHistory = useMemo<UnifiedWealthMovement[]>(() => {
    const list: UnifiedWealthMovement[] = [];

    // 1. Asset Movements
    assetTransactions.forEach((tx) => {
      const parentAsset = assets.find((a) => a.id === tx.assetId);
      const parentName = parentAsset?.name || 'Asset Account';
      const parentCategory = parentAsset?.category || 'Asset';

      let typeBadge = tx.type.toUpperCase();
      let badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
      let netWorthImpact: 'positive' | 'negative' | 'neutral' = 'neutral';
      let impactAmount = 0;

      if (tx.type === 'buy') {
        typeBadge = 'BUY / ACQUIRE';
        badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700';
        netWorthImpact = 'positive';
        impactAmount = tx.amount;
      } else if (tx.type === 'sell') {
        typeBadge = 'SELL / DISPOSAL';
        badgeColor = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700';
        netWorthImpact = 'negative';
        impactAmount = -tx.amount;
      } else if (tx.type === 'deposit') {
        typeBadge = 'DIVIDEND / DEPOSIT';
        badgeColor = 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-700';
        netWorthImpact = 'positive';
        impactAmount = tx.amount;
      } else if (tx.type === 'withdrawal') {
        typeBadge = 'WITHDRAWAL';
        badgeColor = 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/80 dark:text-orange-300 dark:border-orange-700';
        netWorthImpact = 'negative';
        impactAmount = -tx.amount;
      } else if (tx.type === 'appreciation') {
        typeBadge = 'VALUE INCREASE';
        badgeColor = 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950/80 dark:text-green-300 dark:border-green-700';
        netWorthImpact = 'positive';
        impactAmount = tx.amount;
      } else if (tx.type === 'depreciation') {
        typeBadge = 'VALUE LOSS';
        badgeColor = 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/80 dark:text-red-300 dark:border-red-700';
        netWorthImpact = 'negative';
        impactAmount = -tx.amount;
      }

      const extra = [tx.stockCode ? `Ticker: ${tx.stockCode}` : null, tx.broker ? `Broker: ${tx.broker}` : null]
        .filter(Boolean)
        .join(' · ');

      list.push({
        id: `ast-${tx.id}`,
        sourceType: 'asset_tx',
        originalId: tx.id,
        date: tx.date,
        typeBadge,
        badgeColor,
        parentName,
        parentCategory,
        subDetail: tx.name,
        notes: tx.notes,
        amount: tx.amount,
        netWorthImpact,
        impactAmount,
        extraMeta: extra,
      });
    });

    // 2. Liability Payments
    liabilityPayments.forEach((p) => {
      const parentLiab = liabilities.find((l) => l.id === p.liabilityId);
      const parentName = parentLiab?.name || 'Loan Obligation';
      const parentCategory = parentLiab?.category || 'Debt';
      const lender = parentLiab?.lender ? `Lender: ${parentLiab.lender}` : '';

      list.push({
        id: `liab-${p.id}`,
        sourceType: 'liability_payment',
        originalId: p.id,
        date: p.date,
        typeBadge: 'DEBT AMORTIZATION',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-700',
        parentName,
        parentCategory,
        subDetail: `Principal payment on ${parentName}`,
        notes: p.notes,
        amount: p.amount,
        netWorthImpact: 'positive', // Reducing debt increases net worth!
        impactAmount: p.amount,
        extraMeta: lender,
      });
    });

    return list;
  }, [assetTransactions, liabilityPayments, assets, liabilities]);

  // Filtered and sorted historical transactions
  const filteredHistory = useMemo(() => {
    let result = [...unifiedHistory];

    // Search query
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      result = result.filter(
        (m) =>
          m.parentName.toLowerCase().includes(q) ||
          m.subDetail.toLowerCase().includes(q) ||
          m.parentCategory.toLowerCase().includes(q) ||
          (m.notes && m.notes.toLowerCase().includes(q)) ||
          (m.extraMeta && m.extraMeta.toLowerCase().includes(q)) ||
          m.date.includes(q)
      );
    }

    // Type filter
    if (historyFilterType === 'asset_tx') {
      result = result.filter((m) => m.sourceType === 'asset_tx');
    } else if (historyFilterType === 'liability_payment') {
      result = result.filter((m) => m.sourceType === 'liability_payment');
    } else if (historyFilterType === 'inflow') {
      result = result.filter((m) => m.netWorthImpact === 'positive');
    } else if (historyFilterType === 'outflow') {
      result = result.filter((m) => m.netWorthImpact === 'negative');
    }

    // Sort order
    result.sort((a, b) => {
      let diff = 0;
      if (historySortColumn === 'date') {
        diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (historySortColumn === 'type') {
        diff = a.typeBadge.localeCompare(b.typeBadge);
      } else if (historySortColumn === 'account') {
        diff = a.parentName.localeCompare(b.parentName);
      } else if (historySortColumn === 'details') {
        diff = a.subDetail.localeCompare(b.subDetail);
      } else if (historySortColumn === 'amount') {
        diff = a.amount - b.amount;
      } else if (historySortColumn === 'impact') {
        diff = a.impactAmount - b.impactAmount;
      }
      return historySortDirection === 'asc' ? diff : -diff;
    });

    return result;
  }, [unifiedHistory, historySearch, historyFilterType, historySortColumn, historySortDirection]);

  // Total historical capital stats
  const totalAssetCapitalLogged = useMemo(() => {
    return assetTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [assetTransactions]);

  const totalDebtPaidOff = useMemo(() => {
    return liabilityPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [liabilityPayments]);

  const confirmDelete = () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'asset_tx') {
      onDeleteAssetTransaction(itemToDelete.id);
    } else {
      onDeleteLiabilityPayment(itemToDelete.id);
    }
    setItemToDelete(null);
  };

  const renderAssets = () => (
    <AssetsPage
      assets={timeBoundAssets}
      assetTransactions={assetTransactions}
      currencySymbol={currencySymbol}
      onAddAsset={onAddAsset}
      onUpdateAsset={onUpdateAsset}
      onDeleteAsset={onDeleteAsset}
      onAddAssetTransaction={onAddAssetTransaction}
      onDeleteAssetTransaction={onDeleteAssetTransaction}
      currentCashBalance={currentCashBalance}
      onAddTransaction={onAddTransaction}
      onOpenHelp={onOpenHelp}
    />
  );

  const renderLiabilities = () => (
    <LiabilitiesPage
      liabilities={timeBoundLiabilities}
      liabilityPayments={liabilityPayments}
      totalAssets={totalAssets}
      currencySymbol={currencySymbol}
      onAddLiability={onAddLiability}
      onUpdateLiability={onUpdateLiability}
      onDeleteLiability={onDeleteLiability}
      onAddLiabilityPayment={onAddLiabilityPayment}
      onDeleteLiabilityPayment={onDeleteLiabilityPayment}
      onOpenHelp={onOpenHelp}
    />
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 select-none">
      {/* ================= MOBILE VIEW: CONTEXT-AWARE SCREEN-SIZED SUBPAGES (lg:hidden) ================= */}
      <div className="lg:hidden space-y-3">
        {/* Distinct Screen-Sized Mobile Subpage */}
        {currentMobileTab === 'assets' && renderAssets()}
        {currentMobileTab === 'liabilities' && renderLiabilities()}
        {currentMobileTab === 'summary' && (
          <div className="bg-[#24282a] text-white p-3.5 border border-neutral-700 rounded-xs shadow-sm">
            <div className="flex items-center space-x-2.5 mb-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded bg-neutral-800 border border-neutral-600 text-emerald-400">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black tracking-wider uppercase">
                  Portfolio &amp; Debt Summary
                </h2>
                <p className="text-[11px] text-neutral-400 font-mono">
                  Live Net Worth &amp; Allocation Breakdown
                </p>
              </div>
            </div>

            {/* 4 KPIs Grid for Mobile */}
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="bg-neutral-900/90 p-2.5 rounded border border-neutral-700/80">
                <span className="text-[10px] text-neutral-400 uppercase block font-sans">Total Assets</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {formatCurrency(totalAssets, currencySymbol)}
                </span>
              </div>

              <div className="bg-neutral-900/90 p-2.5 rounded border border-neutral-700/80">
                <span className="text-[10px] text-neutral-400 uppercase block font-sans">Total Debts</span>
                <span className="font-bold text-red-400 text-sm">
                  {formatCurrency(totalLiabilities, currencySymbol)}
                </span>
              </div>

              <div className="bg-emerald-950/70 p-2.5 rounded border border-emerald-700/70">
                <span className="text-[10px] text-emerald-300 uppercase block font-sans font-semibold">Net Worth</span>
                <span className="font-black text-white text-sm">
                  {formatCurrency(netWorth, currencySymbol)}
                </span>
              </div>

              <div className="bg-neutral-900/90 p-2.5 rounded border border-neutral-700/80">
                <span className="text-[10px] text-neutral-400 uppercase block font-sans">Debt-to-Asset</span>
                <span className="font-bold text-neutral-200 text-sm">
                  {debtToAssetRatio.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= DESKTOP VIEW: TOP COMBINED WEALTH HEADER (hidden lg:block) ================= */}
      <div className="hidden lg:block bg-[#24282a] text-white p-3.5 border border-neutral-700 rounded-xs shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-wider uppercase">
              Personal Balance &amp; Wealth Management
            </h1>
            <p className="text-xs text-neutral-400 font-mono">
              Unified Assets, Debts, Distribution Charts &amp; History
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Net Worth Quick Stats */}
            <div className="flex flex-wrap items-center gap-3 bg-neutral-900/80 px-3 py-1.5 rounded border border-neutral-700 font-mono text-xs">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase block">Total Assets</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(totalAssets, currencySymbol)}
                </span>
              </div>
              <div className="text-neutral-600 font-bold">−</div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase block">Total Debts</span>
                <span className="font-bold text-red-400">
                  {formatCurrency(totalLiabilities, currencySymbol)}
                </span>
              </div>
              <div className="text-neutral-600 font-bold">=</div>
              <div className="bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-700/60">
                <span className="text-[10px] text-emerald-300 uppercase block font-semibold">Net Worth</span>
                <span className="font-black text-white text-sm">
                  {formatCurrency(netWorth, currencySymbol)}
                </span>
              </div>
              <div className="border-l border-neutral-700 pl-2">
                <span className="text-[10px] text-neutral-400 uppercase block">Debt-to-Asset</span>
                <span className="font-bold text-neutral-200">
                  {debtToAssetRatio.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Contextual Guide Popup Button */}
            {onOpenHelp && (
              <Tooltip content="Open operational guide and button explanations for Wealth & Portfolio" position="bottom">
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
        </div>

        {/* Global Time Window Filter Bar for Wealth & Balance Sheet */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-neutral-800">
          <div className="flex flex-wrap items-center gap-1 bg-[#1a1d1e] p-1 rounded-lg border border-neutral-700 text-xs">
            <span className="text-[10px] uppercase font-bold text-neutral-400 px-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-400" />
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
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                  title={p === 'all' ? 'Display full portfolio without time limits' : `Filter wealth records to ${labels[p]}`}
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

          <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-2">
            <span>
              Tracking: <b className="text-emerald-400">{timeBoundAssets.length}</b> assets · <b className="text-red-400">{timeBoundLiabilities.length}</b> liabilities
            </span>
            {exactDateRange && exactDateRange.end && (
              <span className="bg-neutral-800 px-2 py-0.5 rounded text-[10px] text-neutral-300 border border-neutral-700">
                Thru {exactDateRange.end}
              </span>
            )}
          </div>
        </div>

        {/* Top Switcher between Management Tabs and Visualisations Toggle */}
        <div className="mt-3 pt-3 border-t border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap rounded bg-neutral-900 p-1 border border-neutral-700 gap-1">
            <button
              onClick={() => setWealthTab('assets')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold tracking-wide transition ${
                wealthTab === 'assets'
                  ? 'bg-neutral-700 text-white shadow-xs border border-neutral-500'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Assets &amp; Holdings ({timeBoundAssets.length})</span>
            </button>

            <button
              onClick={() => setWealthTab('liabilities')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold tracking-wide transition ${
                wealthTab === 'liabilities'
                  ? 'bg-neutral-700 text-white shadow-xs border border-neutral-500'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4 text-red-400" />
              <span>Loans &amp; Liabilities ({timeBoundLiabilities.length})</span>
            </button>

            <button
              onClick={() => setWealthTab('history')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold tracking-wide transition ${
                wealthTab === 'history'
                  ? 'bg-neutral-700 text-white shadow-xs border border-neutral-500'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4 text-cyan-400" />
              <span>Transaction History ({unifiedHistory.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCharts(!showCharts)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border transition ${
                showCharts
                  ? 'bg-neutral-800 text-emerald-300 border-emerald-600/60'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-700 hover:text-neutral-200'
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>{showCharts ? 'Hide Visualisations' : 'Show Visualisations'}</span>
              {showCharts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <div className="hidden lg:flex items-center gap-1 text-[11px] text-neutral-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Auto-Ledgers Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= SWITCHABLE CHARTS (PIE / DONUT vs BAR GRAPH VIEW) ================= */}
      {(showCharts || currentMobileTab === 'summary') && (
        <div
          className={`bg-white border border-neutral-300 p-3.5 shadow-xs rounded-xs space-y-3 ${
            currentMobileTab !== 'summary' ? 'hidden lg:block' : ''
          } ${!showCharts ? 'lg:hidden' : ''}`}
        >
          {/* Chart Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-2 border-b border-neutral-200 gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-neutral-100 text-neutral-700 border border-neutral-300">
                <PieIcon className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-800">
                  Wealth &amp; Portfolio Distribution Visualisations
                </h3>
                <p className="text-[11px] text-neutral-500 font-mono">
                  Switch visual style between Pie/Donut and Bar graph · Breakdown by category or item
                </p>
              </div>
            </div>

            {/* Interactive Control Toggles */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Scope Switcher: Both, Assets, Liabilities */}
              <div className="flex rounded bg-neutral-100 p-0.5 border border-neutral-300 text-xs">
                <button
                  type="button"
                  onClick={() => setChartScope('both')}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    chartScope === 'both' ? 'bg-white text-neutral-900 shadow-xs font-bold' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Dual View
                </button>
                <button
                  type="button"
                  onClick={() => setChartScope('assets')}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    chartScope === 'assets' ? 'bg-white text-emerald-800 shadow-xs font-bold' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Assets Only
                </button>
                <button
                  type="button"
                  onClick={() => setChartScope('liabilities')}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    chartScope === 'liabilities' ? 'bg-white text-red-800 shadow-xs font-bold' : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Debts Only
                </button>
              </div>

              {/* Pie vs Bar View Toggle */}
              <div className="flex rounded bg-neutral-100 p-0.5 border border-neutral-300 text-xs">
                <button
                  type="button"
                  onClick={() => setChartStyle('donut')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
                    chartStyle === 'donut'
                      ? 'bg-neutral-800 text-white shadow-xs font-bold'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                  title="Pie / Donut Chart View"
                >
                  <PieIcon className="w-3.5 h-3.5" />
                  <span>Pie / Donut</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartStyle('bar')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
                    chartStyle === 'bar'
                      ? 'bg-neutral-800 text-white shadow-xs font-bold'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                  title="Standard Bar Graph View"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Bar Graph</span>
                </button>
              </div>

              {/* Granularity Switcher: By Category vs By Individual Item */}
              <div className="flex rounded bg-neutral-100 p-0.5 border border-neutral-300 text-xs">
                <button
                  type="button"
                  onClick={() => setChartGranularity('category')}
                  className={`px-2 py-1 rounded transition ${
                    chartGranularity === 'category'
                      ? 'bg-white text-neutral-800 shadow-xs font-bold'
                      : 'text-neutral-600'
                  }`}
                >
                  By Category
                </button>
                <button
                  type="button"
                  onClick={() => setChartGranularity('individual')}
                  className={`px-2 py-1 rounded transition ${
                    chartGranularity === 'individual'
                      ? 'bg-white text-neutral-800 shadow-xs font-bold'
                      : 'text-neutral-600'
                  }`}
                >
                  By Item / Account
                </button>
              </div>
            </div>
          </div>

          {/* Visualisations Grid */}
          <div
            className={`grid gap-4 ${
              chartScope === 'both' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto'
            }`}
          >
            {/* Asset Distribution Chart */}
            {(chartScope === 'both' || chartScope === 'assets') && (
              <div className="bg-neutral-50/70 border border-neutral-200 rounded p-3 shadow-xs">
                <InteractiveFinanceChart
                  title={chartGranularity === 'category' ? 'Asset Distribution by Category' : 'Asset Allocation by Holding'}
                  data={assetChartData}
                  total={totalAssets}
                  currencySymbol={currencySymbol}
                  type="asset"
                  defaultStyle={chartStyle}
                  allowStyleToggle={true}
                  allowSort={true}
                />
              </div>
            )}

            {/* Liability Distribution Chart */}
            {(chartScope === 'both' || chartScope === 'liabilities') && (
              <div className="bg-neutral-50/70 border border-neutral-200 rounded p-3 shadow-xs">
                <InteractiveFinanceChart
                  title={chartGranularity === 'category' ? 'Debt Distribution by Category' : 'Liabilities by Obligation'}
                  data={liabilityChartData}
                  total={totalLiabilities}
                  currencySymbol={currencySymbol}
                  type="liability"
                  defaultStyle={chartStyle}
                  allowStyleToggle={true}
                  allowSort={true}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= SUB-VIEW MANAGEMENT CONTENT (DESKTOP: hidden lg:block) ================= */}
      <div className="hidden lg:block">
        {wealthTab === 'assets' && (
          <AssetsPage
            assets={timeBoundAssets}
            assetTransactions={assetTransactions}
            currencySymbol={currencySymbol}
            onAddAsset={onAddAsset}
            onUpdateAsset={onUpdateAsset}
            onDeleteAsset={onDeleteAsset}
            onAddAssetTransaction={onAddAssetTransaction}
            onDeleteAssetTransaction={onDeleteAssetTransaction}
            currentCashBalance={currentCashBalance}
            onAddTransaction={onAddTransaction}
          />
        )}

        {wealthTab === 'liabilities' && (
          <LiabilitiesPage
            liabilities={timeBoundLiabilities}
            liabilityPayments={liabilityPayments}
            totalAssets={totalAssets}
            currencySymbol={currencySymbol}
            onAddLiability={onAddLiability}
            onUpdateLiability={onUpdateLiability}
            onDeleteLiability={onDeleteLiability}
            onAddLiabilityPayment={onAddLiabilityPayment}
            onDeleteLiabilityPayment={onDeleteLiabilityPayment}
          />
        )}
      </div>

      {/* ================= COMPREHENSIVE VISIBLE TRANSACTION HISTORY SECTION ================= */}
      {/* Fully visible on desktop, shown on mobile only during Summary subpage */}
      <div
        className={`bg-white border border-neutral-300 p-3.5 shadow-xs rounded-xs space-y-3 ${
          currentMobileTab !== 'summary' ? 'hidden lg:block' : ''
        }`}
      >
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-neutral-200 gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-neutral-900 text-white">
              <History className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-900">
                  Visible Portfolio &amp; Debt Transaction History
                </h3>
                <span className="text-[10px] bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded font-mono font-bold border border-cyan-300">
                  {filteredHistory.length} of {unifiedHistory.length} movements
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 font-mono">
                Historical record of all asset purchases, stock trades, dividend inflows, value adjustments, and loan amortization payments
              </p>
            </div>
          </div>

          {/* Quick Historical Stats */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-medium text-[11px]">
              Asset Capital Logged: <b>{formatCurrency(totalAssetCapitalLogged, currencySymbol)}</b>
            </span>
            <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded font-medium text-[11px]">
              Debt Principal Paid: <b>{formatCurrency(totalDebtPaidOff, currencySymbol)}</b>
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by asset, debt, stock ticker, broker, lender, notes..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-300 rounded focus:border-neutral-700 focus:outline-hidden"
            />
          </div>

          {/* Type Filters & Sorting Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Type Filter */}
            <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded border border-neutral-300">
              <span className="text-[11px] font-semibold text-neutral-500 px-1.5 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              <button
                type="button"
                onClick={() => setHistoryFilterType('all')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                  historyFilterType === 'all'
                    ? 'bg-neutral-800 text-white font-bold shadow-xs'
                    : 'text-neutral-700 hover:text-neutral-900'
                }`}
              >
                All Movements
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilterType('asset_tx')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                  historyFilterType === 'asset_tx'
                    ? 'bg-neutral-800 text-white font-bold shadow-xs'
                    : 'text-neutral-700 hover:text-neutral-900'
                }`}
              >
                Asset Trades
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilterType('liability_payment')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                  historyFilterType === 'liability_payment'
                    ? 'bg-neutral-800 text-white font-bold shadow-xs'
                    : 'text-neutral-700 hover:text-neutral-900'
                }`}
              >
                Debt Payments
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilterType('inflow')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                  historyFilterType === 'inflow'
                    ? 'bg-emerald-800 text-white font-bold shadow-xs'
                    : 'text-neutral-700 hover:text-neutral-900'
                }`}
              >
                + Growth / Paydown
              </button>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1 border border-neutral-300 rounded px-2 py-1 bg-neutral-50">
              <ArrowDownUp className="w-3.5 h-3.5 text-neutral-500" />
              <select
                value={`${historySortColumn}_${historySortDirection}`}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'date_desc') {
                    setHistorySortColumn('date');
                    setHistorySortDirection('desc');
                  } else if (val === 'date_asc') {
                    setHistorySortColumn('date');
                    setHistorySortDirection('asc');
                  } else if (val === 'amount_desc') {
                    setHistorySortColumn('amount');
                    setHistorySortDirection('desc');
                  } else if (val === 'amount_asc') {
                    setHistorySortColumn('amount');
                    setHistorySortDirection('asc');
                  }
                }}
                className="bg-transparent text-xs text-neutral-800 focus:outline-hidden font-medium"
              >
                <option value="date_desc">Date (Newest First)</option>
                <option value="date_asc">Date (Oldest First)</option>
                <option value="amount_desc">Amount (Highest First)</option>
                <option value="amount_asc">Amount (Lowest First)</option>
              </select>
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto border border-neutral-300 rounded-xs shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#2d3134] text-white uppercase text-[11px] font-bold select-none">
                <th
                  className="py-2.5 px-3 cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleHistorySort('date')}
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    {historySortColumn === 'date' ? (
                      historySortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleHistorySort('type')}
                >
                  <div className="flex items-center gap-1">
                    <span>Type &amp; Action</span>
                    {historySortColumn === 'type' ? (
                      historySortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleHistorySort('account')}
                >
                  <div className="flex items-center gap-1">
                    <span>Holding / Loan Account</span>
                    {historySortColumn === 'account' ? (
                      historySortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleHistorySort('details')}
                >
                  <div className="flex items-center gap-1">
                    <span>Movement Details &amp; Notes</span>
                    {historySortColumn === 'details' ? (
                      historySortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleHistorySort('amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount</span>
                    {historySortColumn === 'amount' ? (
                      historySortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-center cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleHistorySort('impact')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Net Worth Impact</span>
                    {historySortColumn === 'impact' ? (
                      historySortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400 bg-neutral-50">
                    <History className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                    <p className="font-medium text-xs text-neutral-600">No wealth transactions found</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {historySearch
                        ? `No records matching "${historySearch}". Try clearing the search filter.`
                        : 'Log transactions on your assets or pay downs on your liabilities to view history here.'}
                    </p>
                    {historySearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setHistorySearch('');
                          setHistoryFilterType('all');
                        }}
                        className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Reset filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <tr
                      key={item.id}
                      className={`transition hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                        isEven ? 'bg-white dark:bg-[#1a1e20]' : 'bg-neutral-50/60 dark:bg-[#141718]'
                      }`}
                    >
                      {/* Date */}
                      <td className="py-2.5 px-3 font-mono text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                          <span>{item.date}</span>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${item.badgeColor}`}
                        >
                          {item.typeBadge}
                        </span>
                      </td>

                      {/* Parent Asset or Liability */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                          {item.sourceType === 'asset_tx' ? (
                            <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                          )}
                          <span>{item.parentName}</span>
                        </div>
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
                          {item.parentCategory}
                        </div>
                      </td>

                      {/* Movement Details / Memo / Notes */}
                      <td className="py-2.5 px-3">
                        <div className="text-neutral-800 dark:text-neutral-200 font-medium">
                          {item.subDetail}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          {item.extraMeta && (
                            <span className="text-[10px] text-neutral-700 dark:text-neutral-300 font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.2 rounded border border-neutral-200 dark:border-neutral-700">
                              {item.extraMeta}
                            </span>
                          )}
                          {item.notes && (
                            <span className="text-[10px] text-neutral-500 dark:text-neutral-300 italic">
                              "{item.notes}"
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap text-neutral-900 dark:text-neutral-100">
                        {formatCurrency(item.amount, currencySymbol)}
                      </td>

                      {/* Net Worth Impact */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-[11px]">
                        {item.netWorthImpact === 'positive' && (
                          <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-700 px-1.5 py-0.5 rounded">
                            <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            +{formatCurrency(Math.abs(item.impactAmount), currencySymbol)}
                          </span>
                        )}
                        {item.netWorthImpact === 'negative' && (
                          <span className="inline-flex items-center gap-0.5 text-red-700 dark:text-red-300 font-bold bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-700 px-1.5 py-0.5 rounded">
                            <ArrowDownRight className="w-3 h-3 text-red-600 dark:text-red-400" />
                            −{formatCurrency(Math.abs(item.impactAmount), currencySymbol)}
                          </span>
                        )}
                        {item.netWorthImpact === 'neutral' && (
                          <span className="text-neutral-400 dark:text-neutral-400">Neutral</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            setItemToDelete({
                              type: item.sourceType,
                              id: item.originalId,
                              name: `${item.typeBadge}: ${item.subDetail}`,
                            })
                          }
                          className="p-1 text-neutral-400 hover:text-red-600 transition rounded hover:bg-neutral-100"
                          title="Delete historical entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        title="Delete Historical Entry"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This will revert its effect on the asset or liability balance.`}
        confirmLabel="Delete Entry"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};
