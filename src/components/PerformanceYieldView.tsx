import React, { useState, useMemo } from 'react';
import {
  AssetItem,
  AssetTransaction,
  AssetCategory,
  LiabilityItem,
  formatCurrency,
} from '../types/finance';
import { getCategoryColor } from '../services/categoryColors';
import {
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ArrowLeft,
  PieChart,
  DollarSign,
  Percent,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building,
  Briefcase,
  Layers,
  Landmark,
  Wallet,
  Coins,
  Car,
  FileText,
  BarChart3,
  Table,
} from 'lucide-react';

interface PerformanceYieldViewProps {
  assets: AssetItem[];
  assetTransactions: AssetTransaction[];
  liabilities?: LiabilityItem[];
  currencySymbol: string;
  startDate: string;
  endDate: string;
}

interface AssetPerformance {
  asset: AssetItem;
  investedCapital: number;
  currentValuation: number;
  netGainLoss: number;
  yieldPercent: number;
  txCount: number;
  lastValuationDate: string;
}

interface CategoryPerformance {
  category: AssetCategory;
  categoryLabel: string;
  totalInvested: number;
  currentValuation: number;
  netGainLoss: number;
  yieldPercent: number;
  assetCount: number;
  assets: AssetPerformance[];
}

const CATEGORY_ICONS: Record<AssetCategory, React.ComponentType<{ className?: string }>> = {
  'Stocks': TrendingUp,
  'Crypto': Coins,
  'Liquid Cash': Wallet,
  'Investment accounts': Briefcase,
  'Real estate': Building,
  'Cash and cash equivalents': Wallet,
  'Retirement accounts': Landmark,
  'Vehicles': Car,
  'Other assets': Layers,
};

export const PerformanceYieldView: React.FC<PerformanceYieldViewProps> = ({
  assets,
  assetTransactions,
  currencySymbol,
  startDate,
  endDate,
}) => {
  // Selected category for drill-down (micro view)
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);

  // Parent View Toggle: Visual 'benchmark' graph bars vs Raw data 'table' ledger
  const [macroDisplayMode, setMacroDisplayMode] = useState<'benchmark' | 'table'>('benchmark');

  // Macro-level sorting options: category | holdings | capital | valuation | gain | yield
  const [macroSortBy, setMacroSortBy] = useState<'category' | 'holdings' | 'capital' | 'valuation' | 'gain' | 'yield'>('yield');
  const [macroSortOrder, setMacroSortOrder] = useState<'asc' | 'desc'>('desc');

  // Micro-level sorting options: name | capital | valuation | gain | yield
  const [microSortBy, setMicroSortBy] = useState<'name' | 'capital' | 'valuation' | 'gain' | 'yield'>('yield');
  const [microSortOrder, setMicroSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter asset transactions strictly respecting startDate & endDate (or full range)
  const relevantTxs = useMemo(() => {
    return assetTransactions.filter((tx) => {
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      return true;
    });
  }, [assetTransactions, startDate, endDate]);

  // Compute performance for each individual asset based on active date window
  const assetPerformances = useMemo<AssetPerformance[]>(() => {
    return assets.map((asset) => {
      const txs = relevantTxs.filter((t) => t.assetId === asset.id);

      // Invested Capital Basis = initial cost basis + additional buys / deposits - withdrawals
      let capitalBasis = asset.initialValue;
      let netAppreciation = 0;

      txs.forEach((tx) => {
        if (tx.type === 'buy' || tx.type === 'deposit') {
          capitalBasis += tx.amount;
        } else if (tx.type === 'withdrawal' || tx.type === 'sell') {
          capitalBasis = Math.max(0, capitalBasis - tx.amount);
        } else if (tx.type === 'appreciation') {
          netAppreciation += tx.amount;
        } else if (tx.type === 'depreciation') {
          netAppreciation -= tx.amount;
        }
      });

      const currentValuation = Math.max(0, capitalBasis + netAppreciation);
      const netGainLoss = currentValuation - capitalBasis;
      const yieldPercent = capitalBasis > 0 ? (netGainLoss / capitalBasis) * 100 : 0;

      return {
        asset,
        investedCapital: capitalBasis,
        currentValuation,
        netGainLoss,
        yieldPercent,
        txCount: txs.length,
        lastValuationDate: txs.length > 0 ? txs[txs.length - 1].date : asset.date,
      };
    });
  }, [assets, relevantTxs]);

  // Group by Parent Categories (Macro-Level View)
  const rawCategoryPerformances = useMemo<CategoryPerformance[]>(() => {
    const categories: AssetCategory[] = [
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

    return categories
      .map((cat) => {
        const catAssets = assetPerformances.filter((ap) => ap.asset.category === cat);
        const totalInvested = catAssets.reduce((sum, a) => sum + a.investedCapital, 0);
        const currentValuation = catAssets.reduce((sum, a) => sum + a.currentValuation, 0);
        const netGainLoss = currentValuation - totalInvested;
        const yieldPercent = totalInvested > 0 ? (netGainLoss / totalInvested) * 100 : 0;

        return {
          category: cat,
          categoryLabel: cat === 'Other assets' ? 'Business & Alternative Assets' : cat,
          totalInvested,
          currentValuation,
          netGainLoss,
          yieldPercent,
          assetCount: catAssets.length,
          assets: catAssets,
        };
      })
      .filter((c) => c.assetCount > 0 || c.currentValuation > 0);
  }, [assetPerformances]);

  // Sort Macro Categories
  const categoryPerformances = useMemo(() => {
    const list = [...rawCategoryPerformances];
    list.sort((a, b) => {
      let diff = 0;
      if (macroSortBy === 'category') diff = a.categoryLabel.localeCompare(b.categoryLabel);
      else if (macroSortBy === 'holdings') diff = a.assetCount - b.assetCount;
      else if (macroSortBy === 'capital') diff = a.totalInvested - b.totalInvested;
      else if (macroSortBy === 'valuation') diff = a.currentValuation - b.currentValuation;
      else if (macroSortBy === 'gain') diff = a.netGainLoss - b.netGainLoss;
      else if (macroSortBy === 'yield') diff = a.yieldPercent - b.yieldPercent;

      return macroSortOrder === 'desc' ? -diff : diff;
    });
    return list;
  }, [rawCategoryPerformances, macroSortBy, macroSortOrder]);

  // Aggregate Portfolio Totals
  const portfolioSummary = useMemo(() => {
    const totalInvested = rawCategoryPerformances.reduce((sum, c) => sum + c.totalInvested, 0);
    const totalValuation = rawCategoryPerformances.reduce((sum, c) => sum + c.currentValuation, 0);
    const totalGainLoss = totalValuation - totalInvested;
    const portfolioYield = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalValuation,
      totalGainLoss,
      portfolioYield,
    };
  }, [rawCategoryPerformances]);

  // Max valuation among categories for comparative bar charts
  const maxCategoryValuation = useMemo(() => {
    return Math.max(...rawCategoryPerformances.map((c) => Math.max(c.totalInvested, c.currentValuation)), 1);
  }, [rawCategoryPerformances]);

  // Selected Category Drill-Down Data
  const currentCategoryData = useMemo(() => {
    if (!selectedCategory) return null;
    return rawCategoryPerformances.find((c) => c.category === selectedCategory) || null;
  }, [selectedCategory, rawCategoryPerformances]);

  // Sorted items for micro drill-down
  const sortedMicroAssets = useMemo(() => {
    if (!currentCategoryData) return [];
    const list = [...currentCategoryData.assets];

    list.sort((a, b) => {
      let diff = 0;
      if (microSortBy === 'yield') diff = a.yieldPercent - b.yieldPercent;
      else if (microSortBy === 'gain') diff = a.netGainLoss - b.netGainLoss;
      else if (microSortBy === 'valuation') diff = a.currentValuation - b.currentValuation;
      else if (microSortBy === 'capital') diff = a.investedCapital - b.investedCapital;
      else diff = a.asset.name.localeCompare(b.asset.name);

      return microSortOrder === 'desc' ? -diff : diff;
    });

    return list;
  }, [currentCategoryData, microSortBy, microSortOrder]);

  const toggleMacroSort = (column: typeof macroSortBy) => {
    if (macroSortBy === column) {
      setMacroSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setMacroSortBy(column);
      setMacroSortOrder('desc');
    }
  };

  const toggleMicroSort = (column: typeof microSortBy) => {
    if (microSortBy === column) {
      setMicroSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setMicroSortBy(column);
      setMicroSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* ================= PORTFOLIO YIELD SCORECARD ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Metric 1: Total Capital Invested */}
        <div className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 text-[11px] mb-1">
            <span className="uppercase tracking-wider font-semibold">Total Invested Capital</span>
            <DollarSign className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-white">
            {formatCurrency(portfolioSummary.totalInvested, currencySymbol)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            Cost basis deployed across holdings
          </div>
        </div>

        {/* Metric 2: Current Portfolio Valuation */}
        <div className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 text-[11px] mb-1">
            <span className="uppercase tracking-wider font-semibold">Current Total Valuation</span>
            <Building className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
            {formatCurrency(portfolioSummary.totalValuation, currencySymbol)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            Active mark-to-market net asset value
          </div>
        </div>

        {/* Metric 3: Net Unrealized Gain / Loss */}
        <div className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 text-[11px] mb-1">
            <span className="uppercase tracking-wider font-semibold">Total Capital Gain / Loss</span>
            {portfolioSummary.totalGainLoss >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            )}
          </div>
          <div
            className={`text-lg sm:text-xl font-bold font-mono ${
              portfolioSummary.totalGainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {portfolioSummary.totalGainLoss >= 0 ? '+' : ''}
            {formatCurrency(portfolioSummary.totalGainLoss, currencySymbol)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            Net delta over aggregate cost basis
          </div>
        </div>

        {/* Metric 4: Portfolio Return (Yield %) */}
        <div className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 text-[11px] mb-1">
            <span className="uppercase tracking-wider font-semibold">Portfolio Return (Yield)</span>
            <Percent className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div
            className={`text-lg sm:text-xl font-black font-mono ${
              portfolioSummary.portfolioYield >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {portfolioSummary.portfolioYield >= 0 ? '+' : ''}
            {portfolioSummary.portfolioYield.toFixed(2)}%
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            Weighted return on invested capital
          </div>
        </div>
      </div>

      {/* ================= DRILL-DOWN NAVIGATION / BREADCRUMB ================= */}
      {selectedCategory ? (
        /* ================= MICRO-LEVEL VIEW: DRILL-DOWN INTO SINGLE CATEGORY ================= */
        <div className="space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition border border-neutral-700 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to All Categories</span>
              </button>

              <div className="border-l border-neutral-700 pl-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-black uppercase text-white tracking-wide">
                    {currentCategoryData?.categoryLabel}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 font-mono font-bold">
                    {sortedMicroAssets.length} Individual Holdings
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Itemised asset performance, cost basis allocation &amp; yield rankings (Click column headers to sort)
                </p>
              </div>
            </div>

            {/* Quick Sort Toggle */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 self-start sm:self-auto">
              <span className="text-[11px] font-semibold">Rank by:</span>
              {(['yield', 'gain', 'valuation', 'capital', 'name'] as const).map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => toggleMicroSort(col)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold capitalize transition cursor-pointer flex items-center gap-1 ${
                    microSortBy === col
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  <span>{col === 'gain' ? 'Profit' : col}</span>
                  {microSortBy === col && (microSortOrder === 'desc' ? '↓' : '↑')}
                </button>
              ))}
            </div>
          </div>

          {/* Itemised Micro Table with clickable column sorting */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-sm overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-950/80 text-neutral-400 text-[10px] uppercase font-bold tracking-wider border-b border-neutral-800 select-none">
                    <th
                      onClick={() => toggleMicroSort('name')}
                      className="py-3 px-4 cursor-pointer hover:text-white transition"
                    >
                      <div className="flex items-center gap-1">
                        <span>Asset / Holding</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleMicroSort('capital')}
                      className="py-3 px-3 text-right cursor-pointer hover:text-white transition"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Invested Capital</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleMicroSort('valuation')}
                      className="py-3 px-3 text-right cursor-pointer hover:text-white transition"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Current Valuation</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleMicroSort('gain')}
                      className="py-3 px-3 text-right cursor-pointer hover:text-white transition"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Net Profit / Gain</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleMicroSort('yield')}
                      className="py-3 px-3 text-right cursor-pointer hover:text-white transition"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Yield Return (%)</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-right">Performance Bar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80 font-mono">
                  {sortedMicroAssets.map((item) => {
                    const isProfit = item.netGainLoss >= 0;
                    const catColor = getCategoryColor(item.asset.category);

                    return (
                      <tr
                        key={item.asset.id}
                        className="hover:bg-neutral-800/50 transition-colors"
                      >
                        <td className="py-3 px-4 font-sans">
                          <div className="font-bold text-white text-xs">{item.asset.name}</div>
                          <div className="text-[10px] text-neutral-400 flex items-center gap-2 mt-0.5">
                            {item.asset.institution && <span>{item.asset.institution}</span>}
                            {item.asset.stockCode && (
                              <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 font-mono text-[9px]">
                                {item.asset.stockCode}
                              </span>
                            )}
                            <span>{item.txCount} valuation actions</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right text-neutral-300 font-semibold">
                          {formatCurrency(item.investedCapital, currencySymbol)}
                        </td>
                        <td className="py-3 px-3 text-right text-white font-bold">
                          {formatCurrency(item.currentValuation, currencySymbol)}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-bold ${
                            isProfit ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {isProfit ? '+' : ''}
                          {formatCurrency(item.netGainLoss, currencySymbol)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-black text-xs ${
                              isProfit
                                ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800'
                                : 'bg-red-950/70 text-red-400 border border-red-800'
                            }`}
                          >
                            {isProfit ? '+' : ''}
                            {item.yieldPercent.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right w-44">
                          <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden flex">
                            <div
                              className="h-full"
                              style={{
                                width: `${Math.min(Math.abs(item.yieldPercent) * 2, 100)}%`,
                                backgroundColor: catColor,
                              }}
                            />
                          </div>
                          <span className="text-[9px] text-neutral-500 block mt-1">
                            {isProfit ? 'Capital Appreciation' : 'Depreciation/Loss'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ================= MACRO-LEVEL VIEW: COMBINED MODULE WITH TOGGLE SWITCH ================= */
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 shadow-sm space-y-4">
          {/* Header Bar with View Toggle Switch (Visual Benchmark vs Raw Data Table) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-400" />
                Asset Class Capital Deployment &amp; Yield Benchmark
              </h3>
              <p className="text-[11px] text-neutral-400">
                Macro comparison of total invested capital vs. active valuations across parent asset classes
              </p>
            </div>

            {/* Seamless Toggle Switch: Graph vs Table */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold font-mono">
                View:
              </span>
              <div className="flex rounded-md bg-neutral-950 p-0.5 border border-neutral-800 text-xs">
                <button
                  type="button"
                  onClick={() => setMacroDisplayMode('benchmark')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold text-xs transition cursor-pointer ${
                    macroDisplayMode === 'benchmark'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Visual Graph Bars View"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Benchmark Bars</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMacroDisplayMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold text-xs transition cursor-pointer ${
                    macroDisplayMode === 'table'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Raw Data Ledger Table View"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Ledger Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW 1: Visual Benchmark Bars */}
          {macroDisplayMode === 'benchmark' && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-neutral-400 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-neutral-300">Sort Categories:</span>
                  <div className="inline-flex rounded-md bg-neutral-950 p-0.5 border border-neutral-800 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleMacroSort('capital')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                        macroSortBy === 'capital'
                          ? 'bg-neutral-800 text-emerald-400 font-bold shadow-xs'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                      title="Sort by Invested Capital"
                    >
                      <span>Invested</span>
                      {macroSortBy === 'capital' ? (
                        macroSortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-neutral-500" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleMacroSort('valuation')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                        macroSortBy === 'valuation'
                          ? 'bg-neutral-800 text-emerald-400 font-bold shadow-xs'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                      title="Sort by Current Valuation"
                    >
                      <span>Valuation</span>
                      {macroSortBy === 'valuation' ? (
                        macroSortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-neutral-500" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleMacroSort('yield')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                        macroSortBy === 'yield'
                          ? 'bg-neutral-800 text-emerald-400 font-bold shadow-xs'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                      title="Sort by Return percentage"
                    >
                      <span>Return %</span>
                      {macroSortBy === 'yield' ? (
                        macroSortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-neutral-500" />
                      )}
                    </button>
                  </div>
                </div>

                <span className="font-mono text-[10px] text-neutral-400">
                  Dual bar: Grey (Invested) vs Color (Current Valuation)
                </span>
              </div>

              {categoryPerformances.map((cat) => {
                const IconComponent = CATEGORY_ICONS[cat.category] || Briefcase;
                const catColor = getCategoryColor(cat.category);
                const isGain = cat.netGainLoss >= 0;
                const valuationPctOfMax = (cat.currentValuation / maxCategoryValuation) * 100;
                const investedPctOfMax = (cat.totalInvested / maxCategoryValuation) * 100;

                return (
                  <div
                    key={cat.category}
                    onClick={() => setSelectedCategory(cat.category)}
                    className="p-3.5 rounded-lg bg-neutral-950/60 border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800/40 transition cursor-pointer group space-y-2.5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded flex items-center justify-center border border-neutral-700"
                          style={{
                            backgroundColor: `${catColor}20`,
                            color: catColor,
                          }}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-white text-xs sm:text-sm group-hover:text-emerald-400 transition flex items-center gap-1.5">
                            {cat.categoryLabel}
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-emerald-400 transition" />
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {cat.assetCount} tracked {cat.assetCount === 1 ? 'asset' : 'assets'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div className="text-right">
                          <span className="text-[10px] text-neutral-500 block">INVESTED</span>
                          <span className="text-neutral-300 font-medium">
                            {formatCurrency(cat.totalInvested, currencySymbol)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-neutral-500 block">VALUATION</span>
                          <span className="text-white font-bold">
                            {formatCurrency(cat.currentValuation, currencySymbol)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-neutral-500 block">RETURN</span>
                          <span
                            className={`font-black inline-flex items-center gap-0.5 ${
                              isGain ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {isGain ? '+' : ''}
                            {cat.yieldPercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dual Comparative Bar: Invested Capital vs Current Valuation */}
                    <div className="space-y-1">
                      <div className="w-full bg-neutral-800/80 rounded-full h-2 overflow-hidden relative">
                        <div
                          className="h-full bg-neutral-600 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(investedPctOfMax, 100)}%` }}
                          title={`Invested Capital: ${formatCurrency(cat.totalInvested, currencySymbol)}`}
                        />
                      </div>
                      <div className="w-full bg-neutral-800/80 rounded-full h-2.5 overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(valuationPctOfMax, 100)}%`,
                            backgroundColor: catColor,
                          }}
                          title={`Current Valuation: ${formatCurrency(cat.currentValuation, currencySymbol)}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 2: Raw Data Ledger Table with Full Column Sorting */}
          {macroDisplayMode === 'table' && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg shadow-sm overflow-hidden text-xs animate-in fade-in duration-150">
              <div className="px-4 py-2.5 border-b border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
                <span>Click any column header to sort; click any row to open itemised assets</span>
                <span className="font-mono text-emerald-400 font-bold">
                  Active Sort: {macroSortBy.toUpperCase()} ({macroSortOrder.toUpperCase()})
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse select-none">
                  <thead>
                    <tr className="bg-neutral-950/80 text-neutral-400 text-[10px] uppercase font-bold tracking-wider border-b border-neutral-800">
                      <th
                        onClick={() => toggleMacroSort('category')}
                        className="py-3 px-4 cursor-pointer hover:text-white transition"
                      >
                        <div className="flex items-center gap-1">
                          <span>Asset Class</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        onClick={() => toggleMacroSort('holdings')}
                        className="py-3 px-3 text-right cursor-pointer hover:text-white transition"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Holdings</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        onClick={() => toggleMacroSort('capital')}
                        className="py-3 px-3 text-right cursor-pointer hover:text-white transition"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Invested Capital</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        onClick={() => toggleMacroSort('valuation')}
                        className="py-3 px-3 text-right cursor-pointer hover:text-white transition"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Current Valuation</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        onClick={() => toggleMacroSort('gain')}
                        className="py-3 px-3 text-right cursor-pointer hover:text-white transition"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Net Profit / Loss</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        onClick={() => toggleMacroSort('yield')}
                        className="py-3 px-4 text-right cursor-pointer hover:text-white transition"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Yield Return (%)</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 font-mono">
                    {categoryPerformances.map((cat) => {
                      const isProfit = cat.netGainLoss >= 0;
                      const catColor = getCategoryColor(cat.category);

                      return (
                        <tr
                          key={cat.category}
                          onClick={() => setSelectedCategory(cat.category)}
                          className="hover:bg-neutral-800/60 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-4 font-sans font-bold text-white flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: catColor }}
                            />
                            <span>{cat.categoryLabel}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                          </td>
                          <td className="py-3.5 px-3 text-right text-neutral-400">
                            {cat.assetCount}
                          </td>
                          <td className="py-3.5 px-3 text-right text-neutral-300">
                            {formatCurrency(cat.totalInvested, currencySymbol)}
                          </td>
                          <td className="py-3.5 px-3 text-right text-white font-bold">
                            {formatCurrency(cat.currentValuation, currencySymbol)}
                          </td>
                          <td
                            className={`py-3.5 px-3 text-right font-bold ${
                              isProfit ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {isProfit ? '+' : ''}
                            {formatCurrency(cat.netGainLoss, currencySymbol)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded font-black text-xs ${
                                isProfit
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-red-950 text-red-400 border border-red-800'
                              }`}
                            >
                              {isProfit ? '+' : ''}
                              {cat.yieldPercent.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
