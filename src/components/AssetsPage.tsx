import React, { useState, useMemo } from 'react';
import {
  AssetCategory,
  AssetItem,
  AssetTransaction,
  AssetTransactionType,
  TransactionType,
  IncomeClassification,
  ExpenseClassification,
  formatCurrency,
} from '../types/finance';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Building,
  Briefcase,
  Car,
  CircleDollarSign,
  Landmark,
  Layers,
  X,
  History,
  TrendingUp,
  Link2,
  Calendar,
  Scale,
  CheckCircle2,
  Coins,
  Wallet,
  AlertCircle,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { Tooltip } from './Tooltip';

interface AssetsPageProps {
  assets: AssetItem[];
  assetTransactions: AssetTransaction[];
  currencySymbol: string;
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
  onOpenHelp?: () => void;
}

const CATEGORIES: AssetCategory[] = [
  'Stocks',
  'Real estate',
  'Vehicles',
  'Crypto',
  'Liquid Cash',
  'Investment accounts',
  'Retirement accounts',
  'Cash and cash equivalents',
  'Other assets',
];

export const AssetsPage: React.FC<AssetsPageProps> = ({
  assets,
  assetTransactions,
  currencySymbol,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
  onAddAssetTransaction,
  onDeleteAssetTransaction,
  currentCashBalance,
  onAddTransaction,
  onOpenHelp,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Asset creation / edit modal
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);

  // Asset history popup modal
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<AssetItem | null>(null);

  // New asset transaction log form inside history popup
  const [showLogTxForm, setShowLogTxForm] = useState(false);
  const [txName, setTxName] = useState('');
  const [txType, setTxType] = useState<AssetTransactionType>('buy');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txNotes, setTxNotes] = useState('');
  const [txStockCode, setTxStockCode] = useState('');
  const [txBroker, setTxBroker] = useState('');
  const [txAutoLedger, setTxAutoLedger] = useState(true);

  // Sorting state for selected asset transaction history modal
  const [historySortField, setHistorySortField] = useState<'entryNo' | 'date' | 'name' | 'type' | 'amount'>('date');
  const [historySortDirection, setHistorySortDirection] = useState<'asc' | 'desc'>('desc');

  const handleHistorySort = (field: 'entryNo' | 'date' | 'name' | 'type' | 'amount') => {
    if (historySortField === field) {
      setHistorySortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setHistorySortField(field);
      setHistorySortDirection(field === 'date' || field === 'amount' || field === 'entryNo' ? 'desc' : 'asc');
    }
  };

  // Delete confirmations
  const [assetToDelete, setAssetToDelete] = useState<AssetItem | null>(null);

  // Form states for Asset
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('Stocks');
  const [initialValue, setInitialValue] = useState('');
  const [institution, setInstitution] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecordOnly, setIsRecordOnly] = useState(false);

  // Specific Stock Inputs & Portfolio Tracking Fields
  const [stockCode, setStockCode] = useState('');
  const [stockName, setStockName] = useState('');
  const [broker, setBroker] = useState('');
  const [totalShares, setTotalShares] = useState('');
  const [avgCostPerShare, setAvgCostPerShare] = useState('');
  const [totalFeesPaid, setTotalFeesPaid] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [totalDividendsCollected, setTotalDividendsCollected] = useState('');
  const [autoLedgerAcquisition, setAutoLedgerAcquisition] = useState(true);

  // Adjust Balance Modal states
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [actualBalanceInput, setActualBalanceInput] = useState('');
  const [adjustDate, setAdjustDate] = useState(new Date().toISOString().split('T')[0]);
  const [adjustNotes, setAdjustNotes] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Check if active category is an investment/stock
  const isStockCategory = category === 'Stocks';
  const isInvestmentCategory =
    category === 'Stocks' || category === 'Investment accounts' || category === 'Retirement accounts';

  const computeAssetValue = (asset: AssetItem): number => {
    if (asset.category === 'Stocks' && asset.totalShares) {
      const price = asset.currentPrice || asset.avgCostPerShare || 0;
      return asset.totalShares * price;
    }
    const txs = assetTransactions.filter((t) => t.assetId === asset.id);
    const netTransactions = txs.reduce((sum, t) => {
      if (t.type === 'buy' || t.type === 'deposit' || t.type === 'appreciation') {
        return sum + t.amount;
      } else {
        return sum - t.amount;
      }
    }, 0);
    return Math.max(0, asset.initialValue + netTransactions);
  };

  const effectiveLiquidCash = useMemo(() => {
    const liquidAssetsSum = assets
      .filter((a) => a.category === 'Cash and cash equivalents' || a.category === 'Liquid Cash')
      .reduce((s, a) => s + computeAssetValue(a), 0);
    return (currentCashBalance || 0) + liquidAssetsSum;
  }, [currentCashBalance, assets, assetTransactions]);

  const openAdjustModal = (asset?: AssetItem) => {
    setActualBalanceInput(effectiveLiquidCash > 0 ? effectiveLiquidCash.toString() : '');
    setAdjustDate(new Date().toISOString().split('T')[0]);
    setAdjustNotes('');
    setIsAdjustModalOpen(true);
  };

  const handleApplyBalanceAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(actualBalanceInput);
    if (isNaN(target)) return;

    const diff = target - effectiveLiquidCash;
    if (Math.abs(diff) < 0.001) {
      setIsAdjustModalOpen(false);
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      if (onAddTransaction) {
        await onAddTransaction({
          name: 'Balance Reconciliation',
          type: diff > 0 ? 'income' : 'expense',
          category: 'Bank Transaction',
          subCategory: diff > 0 ? 'other' : 'variable',
          description:
            adjustNotes.trim() ||
            `Balance Reconciliation: Cash adjustment to match physical bank/wallet balance (${
              diff > 0 ? '+' : '-'
            }${formatCurrency(Math.abs(diff), currencySymbol)})`,
          amount: Math.abs(diff),
          date: adjustDate || new Date().toISOString().split('T')[0],
        });
      }

      // Also ensure Cash and cash equivalents asset in inventory aligns
      const cashAsset = assets.find((a) => a.category === 'Cash and cash equivalents');
      if (cashAsset && onUpdateAsset) {
        onUpdateAsset({
          ...cashAsset,
          initialValue: target,
          updatedAt: new Date().toISOString(),
        });
      }

      setIsAdjustModalOpen(false);
      setActualBalanceInput('');
      setAdjustNotes('');
    } catch (err) {
      console.error('Error applying balance adjustment:', err);
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const openAddAssetModal = () => {
    setEditingAsset(null);
    setName('');
    setCategory('Stocks');
    setInitialValue('');
    setInstitution('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setStockCode('');
    setStockName('');
    setBroker('');
    setTotalShares('');
    setAvgCostPerShare('');
    setTotalFeesPaid('');
    setCurrentPrice('');
    setTotalDividendsCollected('');
    setIsRecordOnly(false);
    setAutoLedgerAcquisition(true);
    setIsAssetModalOpen(true);
  };

  const openEditAssetModal = (asset: AssetItem) => {
    setEditingAsset(asset);
    setName(asset.name);
    setCategory(asset.category);
    setInitialValue(asset.initialValue.toString());
    setInstitution(asset.institution || '');
    setNotes(asset.notes || '');
    setDate(asset.date || new Date().toISOString().split('T')[0]);
    setStockCode(asset.stockCode || '');
    setStockName(asset.stockName || '');
    setBroker(asset.broker || '');
    setTotalShares(asset.totalShares !== undefined ? asset.totalShares.toString() : '');
    setAvgCostPerShare(asset.avgCostPerShare !== undefined ? asset.avgCostPerShare.toString() : '');
    setTotalFeesPaid(asset.totalFeesPaid !== undefined ? asset.totalFeesPaid.toString() : '');
    setCurrentPrice(asset.currentPrice !== undefined ? asset.currentPrice.toString() : '');
    setTotalDividendsCollected(asset.totalDividendsCollected !== undefined ? asset.totalDividendsCollected.toString() : '');
    setIsRecordOnly(Boolean(asset.isRecordOnly));
    setAutoLedgerAcquisition(false);
    setIsAssetModalOpen(true);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const numericValue = parseFloat(initialValue) || 0;
    if (!name.trim()) return;

    const sharesNum = parseFloat(totalShares) || 0;
    const avgCostNum = parseFloat(avgCostPerShare) || 0;
    const feesNum = parseFloat(totalFeesPaid) || 0;
    const currentPriceNum = parseFloat(currentPrice) || avgCostNum;
    const divCollectedNum = parseFloat(totalDividendsCollected) || 0;

    let computedBaseValue = numericValue;
    if (isStockCategory && sharesNum > 0 && avgCostNum > 0) {
      computedBaseValue = sharesNum * avgCostNum + feesNum;
    }
    const computedValuation = isStockCategory && sharesNum > 0 ? sharesNum * currentPriceNum : computedBaseValue;
    const unrealizedGain = isStockCategory ? computedValuation - computedBaseValue : undefined;
    const unrealizedGainPct = isStockCategory && computedBaseValue > 0 ? ((computedValuation - computedBaseValue) / computedBaseValue) * 100 : undefined;

    if (editingAsset) {
      onUpdateAsset({
        ...editingAsset,
        name: name.trim(),
        category,
        initialValue: computedBaseValue,
        institution: institution.trim() || undefined,
        notes: notes.trim() || undefined,
        isRecordOnly,
        date,
        stockCode: isInvestmentCategory ? stockCode.trim() || undefined : undefined,
        stockName: isInvestmentCategory ? stockName.trim() || undefined : undefined,
        broker: isInvestmentCategory ? broker.trim() || undefined : undefined,
        totalShares: isStockCategory ? sharesNum : undefined,
        avgCostPerShare: isStockCategory ? avgCostNum : undefined,
        totalFeesPaid: isStockCategory ? feesNum : undefined,
        currentPrice: isStockCategory ? currentPriceNum : undefined,
        unrealizedGainLoss: unrealizedGain,
        unrealizedGainLossPercent: unrealizedGainPct,
        totalDividendsCollected: isStockCategory ? divCollectedNum : undefined,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Cross-linked ledger: Acquiring a new asset that costs money logs as Expense
      const ledgerCategory =
        category === 'Real estate'
          ? 'Real Estate/Business Investments'
          : category === 'Vehicles'
          ? 'Transportation'
          : 'Investments';

      onAddAsset({
        name: name.trim(),
        category,
        initialValue: computedBaseValue,
        institution: institution.trim() || undefined,
        notes: notes.trim() || undefined,
        date,
        isRecordOnly,
        stockCode: isInvestmentCategory ? stockCode.trim() || undefined : undefined,
        stockName: isInvestmentCategory ? stockName.trim() || undefined : undefined,
        broker: isInvestmentCategory ? broker.trim() || undefined : undefined,
        totalShares: isStockCategory ? sharesNum : undefined,
        avgCostPerShare: isStockCategory ? avgCostNum : undefined,
        totalFeesPaid: isStockCategory ? feesNum : undefined,
        currentPrice: isStockCategory ? currentPriceNum : undefined,
        unrealizedGainLoss: unrealizedGain,
        unrealizedGainLossPercent: unrealizedGainPct,
        totalDividendsCollected: isStockCategory ? divCollectedNum : undefined,
      });
    }

    setIsAssetModalOpen(false);
  };

  const handleSaveAssetTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForHistory) return;
    const numAmount = parseFloat(txAmount) || 0;
    if (numAmount <= 0 || !txName.trim()) return;

    // Cross-linked ledger logic:
    // Buying asset: Expense
    // Selling asset or dividend: Income
    const isEarning = txType === 'sell' || txType === 'deposit';
    const ledgerType: 'income' | 'expense' = isEarning ? 'income' : 'expense';
    const ledgerCategory =
      txType === 'deposit'
        ? 'Interest/Dividends'
        : selectedAssetForHistory.category === 'Real estate'
        ? 'Real Estate/Business Investments'
        : 'Investments';

    onAddAssetTransaction(
      {
        assetId: selectedAssetForHistory.id,
        name: txName.trim(),
        type: txType,
        amount: numAmount,
        date: txDate,
        notes: txNotes.trim() || undefined,
        stockCode: txStockCode.trim() || selectedAssetForHistory.stockCode,
        broker: txBroker.trim() || selectedAssetForHistory.broker,
        isRecordOnly: selectedAssetForHistory.isRecordOnly,
      },
      {
        enabled: !selectedAssetForHistory.isRecordOnly && txAutoLedger,
        type: ledgerType,
        category: ledgerCategory,
      }
    );

    setTxName('');
    setTxAmount('');
    setTxNotes('');
    setTxStockCode('');
    setShowLogTxForm(false);
  };

  type AssetSortField =
    | 'name'
    | 'category'
    | 'date'
    | 'institution'
    | 'txCount'
    | 'value'
    | 'shares'
    | 'avgCost'
    | 'currentPrice'
    | 'gainLoss'
    | 'dividends'
    | 'fees';

  const [sortField, setSortField] = useState<AssetSortField>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: AssetSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(
        field === 'date' ||
          field === 'value' ||
          field === 'txCount' ||
          field === 'gainLoss' ||
          field === 'dividends' ||
          field === 'shares' ||
          field === 'currentPrice'
          ? 'desc'
          : 'asc'
      );
    }
  };

  // Filtered & Sorted Assets
  const filteredAssets = useMemo(() => {
    return assets
      .filter((asset) => {
        const matchesCat = selectedCategory === 'all' || asset.category === selectedCategory;
        const matchesQuery =
          asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (asset.stockCode && asset.stockCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (asset.stockName && asset.stockName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (asset.broker && asset.broker.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (asset.institution && asset.institution.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (asset.notes && asset.notes.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCat && matchesQuery;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'name') {
          diff = a.name.localeCompare(b.name);
        } else if (sortField === 'category') {
          diff = a.category.localeCompare(b.category);
        } else if (sortField === 'date') {
          diff = (a.date || '').localeCompare(b.date || '');
        } else if (sortField === 'institution') {
          const instA = a.institution || a.stockCode || a.broker || '';
          const instB = b.institution || b.stockCode || b.broker || '';
          diff = instA.localeCompare(instB);
        } else if (sortField === 'txCount') {
          const countA = assetTransactions.filter((t) => t.assetId === a.id).length;
          const countB = assetTransactions.filter((t) => t.assetId === b.id).length;
          diff = countA - countB;
        } else if (sortField === 'value') {
          const valA = computeAssetValue(a);
          const valB = computeAssetValue(b);
          diff = valA - valB;
        } else if (sortField === 'shares') {
          diff = (a.totalShares || 0) - (b.totalShares || 0);
        } else if (sortField === 'avgCost') {
          diff = (a.avgCostPerShare || 0) - (b.avgCostPerShare || 0);
        } else if (sortField === 'currentPrice') {
          const priceA = a.currentPrice || a.avgCostPerShare || 0;
          const priceB = b.currentPrice || b.avgCostPerShare || 0;
          diff = priceA - priceB;
        } else if (sortField === 'gainLoss') {
          const valA = computeAssetValue(a);
          const costA = (a.totalShares || 0) * (a.avgCostPerShare || 0) + (a.totalFeesPaid || 0);
          const glA = a.unrealizedGainLoss !== undefined ? a.unrealizedGainLoss : valA - costA;
          const valB = computeAssetValue(b);
          const costB = (b.totalShares || 0) * (b.avgCostPerShare || 0) + (b.totalFeesPaid || 0);
          const glB = b.unrealizedGainLoss !== undefined ? b.unrealizedGainLoss : valB - costB;
          diff = glA - glB;
        } else if (sortField === 'dividends') {
          diff = (a.totalDividendsCollected || 0) - (b.totalDividendsCollected || 0);
        } else if (sortField === 'fees') {
          diff = (a.totalFeesPaid || 0) - (b.totalFeesPaid || 0);
        }
        return sortDirection === 'asc' ? diff : -diff;
      });
  }, [assets, assetTransactions, currentCashBalance, selectedCategory, searchQuery, sortField, sortDirection]);

  const totalAssetValue = useMemo(() => {
    return assets.reduce((sum, a) => {
      return sum + computeAssetValue(a);
    }, 0);
  }, [assets, assetTransactions]);

  const getCategoryIcon = (cat: AssetCategory) => {
    switch (cat) {
      case 'Cash and cash equivalents':
        return <CircleDollarSign className="w-4 h-4 text-emerald-600" />;
      case 'Liquid Cash':
        return <Wallet className="w-4 h-4 text-teal-600" />;
      case 'Crypto':
        return <Coins className="w-4 h-4 text-amber-500" />;
      case 'Stocks':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'Investment accounts':
        return <Landmark className="w-4 h-4 text-blue-600" />;
      case 'Retirement accounts':
        return <Briefcase className="w-4 h-4 text-amber-600" />;
      case 'Real estate':
        return <Building className="w-4 h-4 text-indigo-600" />;
      case 'Vehicles':
        return <Car className="w-4 h-4 text-purple-600" />;
      default:
        return <Layers className="w-4 h-4 text-neutral-600" />;
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* Top Banner */}
      <div className="bg-[#2e3436] text-white p-3.5 shadow-sm border border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black tracking-wider uppercase">
            Asset Inventory &amp; Account History
          </h2>
          <p className="text-xs text-neutral-300 font-mono">
            Auto-computes current balance from buy/sell transactions · Click any asset to inspect history
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onOpenHelp && (
            <Tooltip content="Open operational guide and button explanations for Asset Inventory & Stocks" position="bottom">
              <button
                type="button"
                onClick={onOpenHelp}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-600 rounded text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                <span>Guide</span>
              </button>
            </Tooltip>
          )}

          <Tooltip content="Add a new holding, stock position, property, vehicle, or cash account" position="bottom">
            <button
              onClick={openAddAssetModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Asset</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-white dark:bg-[#1a1f20] p-3 border border-neutral-300 dark:border-neutral-700 shadow-xs">
          <div className="text-neutral-500 dark:text-neutral-400 font-medium">Auto-Computed Total Assets</div>
          <div className="text-base sm:text-lg font-bold font-mono text-neutral-900 dark:text-white mt-1">
            {formatCurrency(totalAssetValue, currencySymbol)}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
            Synchronizes with Dashboard Balance Sheet
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1f20] p-3 border border-neutral-300 dark:border-neutral-700 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-neutral-500 dark:text-neutral-400 font-medium">Liquid Cash &amp; Bank</div>
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1">
              {formatCurrency(effectiveLiquidCash, currencySymbol)}
            </div>
            <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">Cash and cash equivalents</div>
          </div>
          <button
            type="button"
            onClick={() => openAdjustModal()}
            className="mt-2.5 self-start inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold transition shadow-xs cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Adjust Balance</span>
          </button>
        </div>

        <div className="bg-white dark:bg-[#1a1f20] p-3 border border-neutral-300 dark:border-neutral-700 shadow-xs">
          <div className="text-neutral-500 dark:text-neutral-400 font-medium">Investments &amp; Equities</div>
          <div className="text-base sm:text-lg font-bold font-mono text-blue-700 dark:text-blue-400 mt-1">
            {formatCurrency(
              assets
                .filter((a) => a.category === 'Stocks' || a.category === 'Investment accounts' || a.category === 'Retirement accounts')
                .reduce((s, a) => s + computeAssetValue(a), 0),
              currencySymbol
            )}
          </div>
          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">Stocks, mutual funds, REITs</div>
        </div>

        <div className="bg-white dark:bg-[#1a1f20] p-3 border border-neutral-300 dark:border-neutral-700 shadow-xs">
          <div className="text-neutral-500 dark:text-neutral-400 font-medium">Property, Real Estate &amp; Other</div>
          <div className="text-base sm:text-lg font-bold font-mono text-neutral-800 dark:text-neutral-100 mt-1">
            {formatCurrency(
              assets
                .filter(
                  (a) =>
                    a.category === 'Real estate' ||
                    a.category === 'Vehicles' ||
                    a.category === 'Other assets'
                )
                .reduce((s, a) => s + computeAssetValue(a), 0),
              currencySymbol
            )}
          </div>
          <div className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
            {assets.length} accounts tracked
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2 bg-white dark:bg-[#1a1f20] p-2.5 border border-neutral-300 dark:border-neutral-700">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
          <input
            type="text"
            placeholder="Search by asset name, ticker/code, broker, institution..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 rounded focus:bg-white dark:focus:bg-neutral-800 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedCategory(selectedCategory === 'Stocks' ? 'all' : 'Stocks')}
            className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition cursor-pointer ${
              selectedCategory === 'Stocks'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Stocks Ledger</span>
          </button>

          <Filter className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-700 py-1.5 px-2.5 rounded focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Asset Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Conditionally Render Dedicated Stocks Portfolio Ledger OR General Asset Table */}
      {selectedCategory === 'Stocks' ? (
        /* ================= DEDICATED STOCKS PORTFOLIO LEDGER TABLE ================= */
        <div className="border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1f20] shadow-xs overflow-x-auto">
          <div className="p-3 bg-neutral-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-700">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-xs uppercase tracking-wider">
                Stocks Portfolio &amp; Equity Holdings Ledger
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded-full font-mono font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                {filteredAssets.length} Active Holdings
              </span>
            </div>
            <span className="text-[11px] text-neutral-400 font-mono">
              Tracks Ticker, Broker, Shares, Avg Cost, Fees &amp; Taxes, Current Price, P/L, Dividends
            </span>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#2d3134] text-white uppercase text-[10px] font-bold select-none">
                <th
                  className="py-2.5 px-3 cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    <span>Ticker &amp; Security</span>
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleSort('institution')}
                >
                  <div className="flex items-center gap-1">
                    <span>Broker Name</span>
                    {sortField === 'institution' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleSort('shares')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Shares</span>
                    {sortField === 'shares' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleSort('avgCost')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Avg Cost / Share</span>
                    {sortField === 'avgCost' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleSort('currentPrice')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Current Price</span>
                    {sortField === 'currentPrice' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleSort('fees')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total Fees &amp; Taxes</span>
                    {sortField === 'fees' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleSort('dividends')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Dividends Collected</span>
                    {sortField === 'dividends' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleSort('value')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Current Valuation</span>
                    {sortField === 'value' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleSort('gainLoss')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Unrealised Gain/Loss</span>
                    {sortField === 'gainLoss' ? (
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
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-neutral-500 italic">
                    No stock holdings recorded yet. Click "Add New Asset" or use the Stock Simulator to log stock holdings.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset, idx) => {
                  const computedVal = computeAssetValue(asset);
                  const shares = asset.totalShares || 0;
                  const avgCost = asset.avgCostPerShare || 0;
                  const curPrice = asset.currentPrice || avgCost;
                  const fees = asset.totalFeesPaid || 0;
                  const dividends = asset.totalDividendsCollected || 0;
                  const investedCost = shares > 0 && avgCost > 0 ? shares * avgCost + fees : asset.initialValue;
                  const gainLoss = asset.unrealizedGainLoss !== undefined ? asset.unrealizedGainLoss : computedVal - investedCost;
                  const gainLossPct = investedCost > 0 ? (gainLoss / investedCost) * 100 : 0;
                  const isPositive = gainLoss >= 0;

                  return (
                    <tr
                      key={asset.id}
                      className={`transition hover:bg-emerald-50/50 cursor-pointer ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'
                      }`}
                      onClick={() => setSelectedAssetForHistory(asset)}
                      title="Click to view full transaction history"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-neutral-900 flex items-center gap-1.5 flex-wrap">
                          {asset.stockCode ? (
                            <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold border border-emerald-300">
                              {asset.stockCode}
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono px-2 py-0.5 bg-neutral-200 text-neutral-700 rounded font-bold">
                              EQUITY
                            </span>
                          )}
                          <span className="font-bold">{asset.name}</span>
                          {asset.isRecordOnly && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded font-bold border border-amber-300 dark:border-amber-700" title="Record only: bypasses Income & Expense cashflow statement">
                              Record Only
                            </span>
                          )}
                          <History className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        </div>
                        {asset.notes && (
                          <div className="text-[11px] text-neutral-500 italic truncate max-w-xs mt-0.5">
                            {asset.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-700 font-medium">
                        {asset.broker || asset.institution || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-800">
                        {shares.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-700">
                        {formatCurrency(avgCost, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900">
                        {formatCurrency(curPrice, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-600">
                        {formatCurrency(fees, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                        {formatCurrency(dividends, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900 text-sm">
                        {formatCurrency(computedVal, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-xs">
                        <span className={`inline-block px-1.5 py-0.5 rounded ${isPositive ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                          {isPositive ? '+' : ''}{formatCurrency(gainLoss, currencySymbol)}
                          <span className="text-[10px] ml-1 font-semibold">
                            ({isPositive ? '+' : ''}{gainLossPct.toFixed(2)}%)
                          </span>
                        </span>
                      </td>
                      <td
                        className="py-2.5 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedAssetForHistory(asset)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition"
                            title="View transaction history"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditAssetModal(asset)}
                            className="p-1 text-neutral-500 hover:text-blue-600 hover:bg-neutral-100 rounded transition"
                            title="Edit asset details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setAssetToDelete(asset)}
                            className="p-1 text-neutral-500 hover:text-red-600 hover:bg-neutral-100 rounded transition"
                            title="Delete asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              {(() => {
                const stockAssets = filteredAssets.filter((a) => a.category === 'Stocks');
                const totalStockVal = stockAssets.reduce((s, a) => s + computeAssetValue(a), 0);
                const totalStockCost = stockAssets.reduce((s, a) => {
                  const sh = a.totalShares || 0;
                  const avg = a.avgCostPerShare || 0;
                  const fee = a.totalFeesPaid || 0;
                  return s + (sh > 0 && avg > 0 ? sh * avg + fee : a.initialValue);
                }, 0);
                const totalStockGain = totalStockVal - totalStockCost;
                const totalGainPct = totalStockCost > 0 ? (totalStockGain / totalStockCost) * 100 : 0;
                const totalDividends = stockAssets.reduce((s, a) => s + (a.totalDividendsCollected || 0), 0);
                const totalFees = stockAssets.reduce((s, a) => s + (a.totalFeesPaid || 0), 0);

                return (
                  <tr className="bg-[#24292b] text-white font-extrabold text-xs">
                    <td colSpan={5} className="py-2.5 px-3 uppercase tracking-wider">
                      Total Stocks Valuation ({stockAssets.length} Holdings)
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-300">
                      {formatCurrency(totalFees, currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-300">
                      {formatCurrency(totalDividends, currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-300 text-sm">
                      {formatCurrency(totalStockVal, currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs">
                      <span className={totalStockGain >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {totalStockGain >= 0 ? '+' : ''}{formatCurrency(totalStockGain, currencySymbol)} ({totalStockGain >= 0 ? '+' : ''}{totalGainPct.toFixed(2)}%)
                      </span>
                    </td>
                    <td></td>
                  </tr>
                );
              })()}
            </tfoot>
          </table>
        </div>
      ) : (
        /* ================= GENERAL ASSET TABLE WITH CONTRASTING GREY ROWS ================= */
        <div className="border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#1a1f20] shadow-xs overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#2d3134] text-white uppercase text-[11px] font-bold select-none">
                <th
                  className="py-2.5 px-3 cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    <span>Asset Description</span>
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:bg-neutral-700 transition"
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
                  className="py-2.5 px-3 cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    <span>Acquired Date</span>
                    {sortField === 'date' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleSort('institution')}
                >
                  <div className="flex items-center gap-1">
                    <span>Stock / Institution</span>
                    {sortField === 'institution' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleSort('txCount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Transactions</span>
                    {sortField === 'txCount' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 text-right cursor-pointer hover:bg-neutral-700 transition"
                  onClick={() => handleSort('value')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Auto-Computed Value ({currencySymbol})</span>
                    {sortField === 'value' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-500 dark:text-neutral-400 italic">
                    No assets found. Click "Add New Asset" to create one.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset, idx) => {
                  const isStockHolding = asset.category === 'Stocks';
                  const computedVal = computeAssetValue(asset);
                  const txCount = assetTransactions.filter((t) => t.assetId === asset.id).length;

                  const shares = asset.totalShares || 0;
                  const avgCost = asset.avgCostPerShare || 0;
                  const fees = asset.totalFeesPaid || 0;
                  const curPrice = asset.currentPrice || avgCost;
                  const investedCost = shares > 0 && avgCost > 0 ? shares * avgCost + fees : asset.initialValue;
                  const gainLoss = asset.unrealizedGainLoss !== undefined ? asset.unrealizedGainLoss : computedVal - investedCost;
                  const gainLossPct = investedCost > 0 ? (gainLoss / investedCost) * 100 : 0;
                  const isPositive = gainLoss >= 0;

                  return (
                    <tr
                      key={asset.id}
                      className={`transition hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer ${
                        idx % 2 === 0 ? 'bg-white dark:bg-[#1a1f20]' : 'bg-[#f8f9fa] dark:bg-[#15191b]'
                      }`}
                      onClick={() => setSelectedAssetForHistory(asset)}
                      title="Click to view full transaction history"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          <span>{asset.name}</span>
                          {asset.isRecordOnly && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 rounded font-bold border border-amber-300 dark:border-amber-700" title="Record only: bypasses Income & Expense cashflow statement">
                              Record Only
                            </span>
                          )}
                          {asset.stockCode && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded font-bold border border-blue-200 dark:border-blue-800">
                              {asset.stockCode}
                            </span>
                          )}
                          {isCashAsset && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openAdjustModal(asset);
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded text-[10px] font-bold transition shadow-2xs"
                              title="Adjust Cash Balance against physical wallet/bank"
                            >
                              <Scale className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>Adjust Balance</span>
                            </button>
                          )}
                          <History className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        </div>

                        {/* Dedicated Stocks Metrics Info Strip */}
                        {isStockHolding && (
                          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-mono">
                            {asset.broker && (
                              <span className="px-1.5 py-0.2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded border border-neutral-200 dark:border-neutral-700">
                                Broker: {asset.broker}
                              </span>
                            )}
                            {shares > 0 && (
                              <span className="px-1.5 py-0.2 bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800">
                                {shares.toLocaleString()} shs @ {formatCurrency(avgCost, currencySymbol)}
                              </span>
                            )}
                            {curPrice > 0 && (
                              <span className="px-1.5 py-0.2 bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800">
                                Mkt: {formatCurrency(curPrice, currencySymbol)}
                              </span>
                            )}
                            {fees > 0 && (
                              <span className="px-1.5 py-0.2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">
                                Fees: {formatCurrency(fees, currencySymbol)}
                              </span>
                            )}
                            {shares > 0 && (
                              <span
                                className={`px-1.5 py-0.2 rounded font-bold ${
                                  isPositive
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                                }`}
                              >
                                P/L: {isPositive ? '+' : ''}{formatCurrency(gainLoss, currencySymbol)} ({isPositive ? '+' : ''}{gainLossPct.toFixed(1)}%)
                              </span>
                            )}
                            {(asset.totalDividendsCollected || 0) > 0 && (
                              <span className="px-1.5 py-0.2 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800">
                                Div: {formatCurrency(asset.totalDividendsCollected || 0, currencySymbol)}
                              </span>
                            )}
                          </div>
                        )}

                        {asset.notes && (
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 italic truncate max-w-xs mt-0.5">
                            {asset.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {getCategoryIcon(asset.category)}
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">{asset.category}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-400 font-mono">
                        {asset.date || '2024-01-01'}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 dark:text-neutral-400 font-mono">
                        {asset.broker || asset.institution || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-700 dark:text-neutral-300">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-[10px] font-bold">
                          {txCount} txs
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900 dark:text-white text-sm">
                        {formatCurrency(computedVal, currencySymbol)}
                      </td>
                      <td
                        className="py-2.5 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {isCashAsset && (
                            <button
                              type="button"
                              onClick={() => openAdjustModal(asset)}
                              className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950 rounded transition"
                              title="Adjust Cash Balance"
                            >
                              <Scale className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedAssetForHistory(asset)}
                            className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950 rounded transition"
                            title="View transaction history"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditAssetModal(asset)}
                            className="p-1 text-neutral-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition"
                            title="Edit asset details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setAssetToDelete(asset)}
                            className="p-1 text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition"
                            title="Delete asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[#343a40] text-white font-extrabold text-xs">
                <td colSpan={5} className="py-2 px-3 uppercase tracking-wider">
                  Total Asset Valuation
                </td>
                <td className="py-2 px-3 text-right font-mono text-emerald-300 text-sm">
                  {formatCurrency(totalAssetValue, currencySymbol)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ================= ASSET TRANSACTION HISTORY POPUP MODAL ================= */}
      {selectedAssetForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl max-w-xl w-full border border-neutral-300 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#2d3134] text-white">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-blue-600/30 text-blue-400 rounded">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-1.5">
                    <span>{selectedAssetForHistory.name}</span>
                    {selectedAssetForHistory.stockCode && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-blue-500 text-white rounded">
                        {selectedAssetForHistory.stockCode}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {selectedAssetForHistory.category} · {selectedAssetForHistory.broker || selectedAssetForHistory.institution || 'Self-Custody'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedAssetForHistory(null);
                  setShowLogTxForm(false);
                }}
                className="text-neutral-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Valuation Summary Banner */}
            <div className="px-5 py-3 bg-neutral-100 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-neutral-500 font-medium">Auto-Computed Current Value:</span>
                <div className="text-xl font-bold font-mono text-emerald-700">
                  {formatCurrency(computeAssetValue(selectedAssetForHistory), currencySymbol)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-neutral-500 block">Initial Base Valuation:</span>
                <span className="text-xs font-mono font-semibold text-neutral-700">
                  {formatCurrency(selectedAssetForHistory.initialValue, currencySymbol)}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
              {/* Action Bar */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800">
                  Historical Movements &amp; Activity Log
                </span>
                <button
                  onClick={() => setShowLogTxForm(!showLogTxForm)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showLogTxForm ? 'Close Form' : 'Log Asset Movement'}</span>
                </button>
              </div>

              {/* Log Transaction Inline Form */}
              {showLogTxForm && (
                <form
                  onSubmit={handleSaveAssetTransaction}
                  className="p-3 bg-neutral-50 border border-neutral-300 rounded text-xs space-y-2.5"
                >
                  <div className="font-semibold text-neutral-800 border-b border-neutral-200 pb-1 flex items-center justify-between">
                    <span>Record Buy, Sell, Dividend or Value Change</span>
                    <span className="text-[10px] text-emerald-600 font-mono">Two-Way Ledger Active</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-neutral-600 mb-1">Movement Type *</label>
                      <select
                        value={txType}
                        onChange={(e) => setTxType(e.target.value as AssetTransactionType)}
                        className="w-full px-2 py-1 border border-neutral-300 rounded bg-white"
                      >
                        <option value="buy">Buy (+ value, logs expense)</option>
                        <option value="deposit">Deposit / Dividend (+ value, logs income)</option>
                        <option value="sell">Sell (- value, logs income)</option>
                        <option value="withdrawal">Withdrawal (- value)</option>
                        <option value="appreciation">Appreciation (+ value)</option>
                        <option value="depreciation">Depreciation (- value)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-neutral-600 mb-1">Amount ({currencySymbol}) *</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        placeholder="0.00"
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                        className="w-full px-2 py-1 border border-neutral-300 rounded font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-neutral-600 mb-1">Movement Name / Description *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bought 200 shares AREIT, Cash Dividend received"
                      value={txName}
                      onChange={(e) => setTxName(e.target.value)}
                      className="w-full px-2 py-1 border border-neutral-300 rounded"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-neutral-600 mb-1">Transaction Date *</label>
                      <input
                        type="date"
                        required
                        value={txDate}
                        onChange={(e) => setTxDate(e.target.value)}
                        className="w-full px-2 py-1 border border-neutral-300 rounded font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-600 mb-1">Broker / Platform</label>
                      <input
                        type="text"
                        placeholder="e.g. COL Financial"
                        value={txBroker}
                        onChange={(e) => setTxBroker(e.target.value)}
                        className="w-full px-2 py-1 border border-neutral-300 rounded"
                      />
                    </div>
                  </div>

                  {/* Auto-ledger Checkbox */}
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="txAutoLedger"
                      checked={txAutoLedger}
                      onChange={(e) => setTxAutoLedger(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <label htmlFor="txAutoLedger" className="text-[11px] text-blue-900 cursor-pointer flex items-center gap-1 font-medium">
                      <Link2 className="w-3 h-3 text-blue-600" />
                      <span>Auto-sync corresponding record to Income &amp; Expenses ledger</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowLogTxForm(false)}
                      className="px-2.5 py-1 text-neutral-600 border border-neutral-300 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-emerald-600 text-white font-bold rounded"
                    >
                      Confirm Movement
                    </button>
                  </div>
                </form>
              )}

              {/* Transactions Table with Sortable Entry No. column */}
              <div className="overflow-x-auto border border-neutral-200 rounded">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#3f454a] text-white uppercase text-[10px] font-bold select-none">
                      <th
                        className="py-2 px-2.5 cursor-pointer hover:bg-neutral-600 transition"
                        onClick={() => handleHistorySort('entryNo')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Entry No.</span>
                          {historySortField === 'entryNo' ? (
                            historySortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-2 px-2.5 cursor-pointer hover:bg-neutral-600 transition"
                        onClick={() => handleHistorySort('date')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Date</span>
                          {historySortField === 'date' ? (
                            historySortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-2 px-2.5 cursor-pointer hover:bg-neutral-600 transition"
                        onClick={() => handleHistorySort('name')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Description / Notes</span>
                          {historySortField === 'name' ? (
                            historySortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-2 px-2.5 cursor-pointer hover:bg-neutral-600 transition"
                        onClick={() => handleHistorySort('type')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Type</span>
                          {historySortField === 'type' ? (
                            historySortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                          )}
                        </div>
                      </th>
                      <th
                        className="py-2 px-2.5 text-right cursor-pointer hover:bg-neutral-600 transition"
                        onClick={() => handleHistorySort('amount')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Amount ({currencySymbol})</span>
                          {historySortField === 'amount' ? (
                            historySortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                          )}
                        </div>
                      </th>
                      <th className="py-2 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {assetTransactions.filter((t) => t.assetId === selectedAssetForHistory.id).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-neutral-500 italic">
                          No individual buy/sell transactions logged yet. The asset is at its base valuation.
                        </td>
                      </tr>
                    ) : (
                      assetTransactions
                        .filter((t) => t.assetId === selectedAssetForHistory.id)
                        .sort((a, b) => {
                          let diff = 0;
                          if (historySortField === 'entryNo') {
                            const eA = a.entryNo || '';
                            const eB = b.entryNo || '';
                            diff = eA.localeCompare(eB, undefined, { numeric: true });
                          } else if (historySortField === 'date') {
                            diff = new Date(a.date).getTime() - new Date(b.date).getTime();
                          } else if (historySortField === 'name') {
                            diff = (a.name || '').localeCompare(b.name || '');
                          } else if (historySortField === 'type') {
                            diff = a.type.localeCompare(b.type);
                          } else if (historySortField === 'amount') {
                            diff = a.amount - b.amount;
                          }
                          return historySortDirection === 'asc' ? diff : -diff;
                        })
                        .map((tx, idx) => {
                          const isPositive =
                            tx.type === 'buy' || tx.type === 'deposit' || tx.type === 'appreciation';

                          return (
                            <tr
                              key={tx.id}
                              className={`transition hover:bg-neutral-50 ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'
                              }`}
                            >
                              <td className="py-2 px-2.5 font-mono whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded bg-neutral-100 border border-neutral-300 text-neutral-700 font-bold text-[10px] tracking-tight">
                                  {tx.entryNo || `AST-${String(idx + 1).padStart(4, '0')}`}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 font-mono text-neutral-600 whitespace-nowrap">
                                {tx.date}
                              </td>
                              <td className="py-2 px-2.5">
                                <div className="font-semibold text-neutral-900">{tx.name}</div>
                                <div className="text-[10px] text-neutral-500 space-x-1 font-mono">
                                  {tx.stockCode && <span>Stock: {tx.stockCode}</span>}
                                  {tx.broker && <span>· Broker: {tx.broker}</span>}
                                  {tx.notes && <span>· {tx.notes}</span>}
                                </div>
                              </td>
                              <td className="py-2 px-2.5">
                                <span
                                  className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded font-bold ${
                                    isPositive
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {tx.type}
                                </span>
                              </td>
                              <td className="py-2 px-2.5 text-right">
                                <span
                                  className={`font-mono font-bold text-xs ${
                                    isPositive ? 'text-emerald-700' : 'text-red-700'
                                  }`}
                                >
                                  {isPositive ? '+' : '-'}{formatCurrency(tx.amount, currencySymbol)}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-center">
                                <button
                                  onClick={() => onDeleteAssetTransaction(tx.id)}
                                  className="text-neutral-400 hover:text-red-600 p-1 transition"
                                  title="Delete entry"
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

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-200 flex justify-end">
              <button
                onClick={() => {
                  setSelectedAssetForHistory(null);
                  setShowLogTxForm(false);
                }}
                className="px-3.5 py-1.5 bg-neutral-800 text-white rounded text-xs font-semibold hover:bg-neutral-900 transition"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Asset Modal (with Date Syncing & Specific Stock Inputs) */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-neutral-300 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#2d3134] text-white">
              <h3 className="font-semibold text-sm">
                {editingAsset ? 'Edit Asset Account' : 'Add New Asset Account'}
              </h3>
              <button
                onClick={() => setIsAssetModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  Asset Title / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BPI Savings, Condominium Unit, Stock Portfolio"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-hidden focus:border-neutral-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AssetCategory)}
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-hidden cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Acquisition Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Dedicated Stocks Portfolio Tracking Fields when category === 'Stocks' */}
              {isStockCategory ? (
                <div className="p-3 bg-emerald-50/70 border border-emerald-300 rounded-lg space-y-2.5">
                  <div className="font-bold text-emerald-900 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs">
                      <TrendingUp className="w-4 h-4 text-emerald-700" />
                      <span>Stock Portfolio Holding Details</span>
                    </div>
                    <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      PORTFOLIO TRACKING
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-neutral-700 font-semibold text-[11px] mb-0.5">
                        Ticker Symbol *
                      </label>
                      <input
                        type="text"
                        required={isStockCategory}
                        placeholder="e.g. AAPL, NVDA, BDO"
                        value={stockCode}
                        onChange={(e) => {
                          const code = e.target.value.toUpperCase();
                          setStockCode(code);
                          if (!name || name === `${stockCode} Shares` || name.endsWith(' Shares')) {
                            setName(`${code} Shares`);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded font-mono font-bold uppercase focus:outline-emerald-600 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-700 font-semibold text-[11px] mb-0.5">
                        Broker Name *
                      </label>
                      <input
                        type="text"
                        required={isStockCategory}
                        placeholder="e.g. Interactive Brokers, COL Financial"
                        value={broker}
                        onChange={(e) => setBroker(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded focus:outline-emerald-600 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-neutral-700 font-semibold text-[11px] mb-0.5">
                        Total Shares *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required={isStockCategory}
                        placeholder="e.g. 100"
                        value={totalShares}
                        onChange={(e) => setTotalShares(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded font-mono font-bold focus:outline-emerald-600 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-700 font-semibold text-[11px] mb-0.5">
                        Avg Cost per Share ({currencySymbol}) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required={isStockCategory}
                        placeholder="e.g. 150.00"
                        value={avgCostPerShare}
                        onChange={(e) => setAvgCostPerShare(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded font-mono font-bold focus:outline-emerald-600 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-neutral-700 font-semibold text-[11px] mb-0.5">
                        Current Market Price ({currencySymbol}) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required={isStockCategory}
                        placeholder="e.g. 175.00"
                        value={currentPrice}
                        onChange={(e) => setCurrentPrice(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded font-mono font-bold focus:outline-emerald-600 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-neutral-700 font-semibold text-[11px] mb-0.5">
                        Total Fees &amp; Taxes Paid ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="e.g. 15.00"
                        value={totalFeesPaid}
                        onChange={(e) => setTotalFeesPaid(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded font-mono focus:outline-emerald-600 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-neutral-700 font-semibold text-[11px] mb-0.5">
                      Total Dividends Collected ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 50.00"
                      value={totalDividendsCollected}
                      onChange={(e) => setTotalDividendsCollected(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded font-mono focus:outline-emerald-600 text-xs"
                    />
                  </div>

                  {/* Real-time calculated preview */}
                  {(() => {
                    const sh = parseFloat(totalShares) || 0;
                    const avg = parseFloat(avgCostPerShare) || 0;
                    const fees = parseFloat(totalFeesPaid) || 0;
                    const cur = parseFloat(currentPrice) || avg;
                    const invested = sh * avg + fees;
                    const valuation = sh * cur;
                    const gain = valuation - invested;
                    const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
                    if (sh > 0) {
                      return (
                        <div className="mt-2 p-2.5 bg-white rounded border border-emerald-200 text-[11px] space-y-1">
                          <div className="flex justify-between text-neutral-600">
                            <span>Invested Capital (Cost + Fees):</span>
                            <span className="font-mono font-bold">{formatCurrency(invested, currencySymbol)}</span>
                          </div>
                          <div className="flex justify-between text-neutral-600">
                            <span>Current Market Valuation:</span>
                            <span className="font-mono font-bold text-neutral-900">{formatCurrency(valuation, currencySymbol)}</span>
                          </div>
                          <div className="flex justify-between font-bold pt-1 border-t border-neutral-100">
                            <span className="text-neutral-700">Unrealised Gain / Loss:</span>
                            <span className={`font-mono ${gain >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                              {gain >= 0 ? '+' : ''}{formatCurrency(gain, currencySymbol)} ({gain >= 0 ? '+' : ''}{gainPct.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : (
                <>
                  {isInvestmentCategory && (
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded space-y-2">
                      <div className="font-semibold text-blue-900 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-700" />
                        <span>Investment / Equity Details</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-neutral-600 text-[11px] mb-0.5">Stock Code / Ticker</label>
                          <input
                            type="text"
                            placeholder="e.g. SMPH, BDO, AAPL"
                            value={stockCode}
                            onChange={(e) => setStockCode(e.target.value.toUpperCase())}
                            className="w-full px-2 py-1 bg-white border border-neutral-300 rounded font-mono font-bold uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-neutral-600 text-[11px] mb-0.5">Stock Name</label>
                          <input
                            type="text"
                            placeholder="e.g. SM Prime Holdings"
                            value={stockName}
                            onChange={(e) => setStockName(e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-neutral-300 rounded"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-neutral-600 text-[11px] mb-0.5">Broker / Platform</label>
                        <input
                          type="text"
                          placeholder="e.g. COL Financial, First Metro Sec, GoTyme"
                          value={broker}
                          onChange={(e) => setBroker(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-neutral-300 rounded"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Initial Base Value ({currencySymbol}) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="0"
                        value={initialValue}
                        onChange={(e) => setInitialValue(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded font-mono font-bold focus:outline-hidden focus:border-neutral-800"
                      />
                    </div>

                    <div>
                      <label className="block font-medium text-neutral-700 mb-1">
                        Institution / Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. BDO, Maya, Private Holding"
                        value={institution}
                        onChange={(e) => setInstitution(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-hidden"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Record Only (Off-Ledger) Toggle */}
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecordOnly}
                    onChange={(e) => setIsRecordOnly(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300 cursor-pointer"
                  />
                  <div>
                    <div className="font-semibold text-xs text-neutral-900 flex items-center gap-1.5">
                      <span>Record only (Do not reflect on Income/Expense ledger)</span>
                      <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold border border-amber-300">
                        OFF-LEDGER
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                      When enabled, this asset is saved to your wealth inventory and portfolio history, but bypasses the cashflow ledger so operating cash is not altered.
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or account specifics..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsAssetModalOpen(false)}
                  className="px-3 py-1.5 border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium shadow-xs"
                >
                  {editingAsset ? 'Save Changes' : 'Create Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-xs shadow-xl max-w-md w-full border border-neutral-300 overflow-hidden">
            <div className="bg-[#2e3436] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs uppercase tracking-wider">
                  Adjust Cash &amp; Bank Balance
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-neutral-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyBalanceAdjustment} className="p-4 space-y-3.5 text-xs">
              <p className="text-neutral-600 leading-relaxed text-[11px]">
                Reconcile your recorded cash balance with your actual physical wallet or bank account balance.
                The app will calculate the difference and automatically log a <strong className="text-neutral-900">Balance Reconciliation</strong> transaction to correct your ledger.
              </p>

              {/* Current Recorded Balance Card */}
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-neutral-500 font-medium">Current Ledger Balance</div>
                  <div className="text-sm font-bold font-mono text-neutral-900 mt-0.5">
                    {formatCurrency(effectiveLiquidCash, currencySymbol)}
                  </div>
                </div>
                <div className="text-[11px] text-neutral-400 font-mono">
                  Cash &amp; Equivalents
                </div>
              </div>

              {/* Input for Actual Cash Amount */}
              <div>
                <label className="block font-bold text-neutral-800 mb-1">
                  Actual Real-World Cash Amount ({currencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono font-bold">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    autoFocus
                    placeholder="Enter actual physical cash amount"
                    value={actualBalanceInput}
                    onChange={(e) => setActualBalanceInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-neutral-300 rounded font-mono font-bold text-sm focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Live Reconciliation Difference Preview */}
              {actualBalanceInput !== '' && !isNaN(parseFloat(actualBalanceInput)) && (() => {
                const target = parseFloat(actualBalanceInput);
                const diff = target - effectiveLiquidCash;
                if (Math.abs(diff) < 0.001) {
                  return (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span className="text-[11px] font-medium">
                        Ledger matches your physical cash balance. No adjustment needed.
                      </span>
                    </div>
                  );
                }

                if (diff > 0) {
                  return (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded text-emerald-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                        <TrendingUp className="w-4 h-4" />
                        <span>Surplus of +{formatCurrency(diff, currencySymbol)}</span>
                      </div>
                      <div className="text-[11px] text-emerald-800 leading-snug">
                        Will automatically log an <strong>Income</strong> transaction named{' '}
                        <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono font-bold">Balance Reconciliation</code>{' '}
                        (category: <span className="font-semibold">Bank Transaction</span>) to increase your cash balance.
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="p-2.5 bg-rose-50 border border-rose-300 rounded text-rose-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-rose-700">
                      <AlertCircle className="w-4 h-4" />
                      <span>Shortfall of -{formatCurrency(Math.abs(diff), currencySymbol)}</span>
                    </div>
                    <div className="text-[11px] text-rose-800 leading-snug">
                      Will automatically log an <strong>Expense</strong> transaction named{' '}
                      <code className="bg-rose-100 px-1 py-0.5 rounded font-mono font-bold">Balance Reconciliation</code>{' '}
                      (category: <span className="font-semibold">Bank Transaction</span>) to decrease your cash balance.
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-600 text-[11px] font-medium mb-1">
                    Adjustment Date
                  </label>
                  <input
                    type="date"
                    value={adjustDate}
                    onChange={(e) => setAdjustDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-neutral-600 text-[11px] font-medium mb-1">
                    Memo / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bank statement count"
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  disabled={isSubmittingAdjust}
                  className="px-3 py-1.5 border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmittingAdjust ||
                    actualBalanceInput === '' ||
                    isNaN(parseFloat(actualBalanceInput))
                  }
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded font-medium shadow-xs transition"
                >
                  {isSubmittingAdjust ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Reconciling...</span>
                    </>
                  ) : (
                    <>
                      <Scale className="w-3.5 h-3.5" />
                      <span>Apply &amp; Reconcile Ledger</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!assetToDelete}
        title="Delete Asset Entry"
        message={`Are you sure you want to delete "${assetToDelete?.name}"? All associated buy/sell history will also be removed, and your Total Assets will update immediately.`}
        confirmLabel="Delete Asset"
        onConfirm={() => {
          if (assetToDelete) {
            onDeleteAsset(assetToDelete.id);
            setAssetToDelete(null);
          }
        }}
        onCancel={() => setAssetToDelete(null)}
      />
    </div>
  );
};
