import React, { useState, useMemo } from 'react';
import { formatCurrency, AssetCategory, AssetItem } from '../types/finance';
import {
  ShieldCheck,
  ShieldAlert,
  Calculator,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sliders,
  Wallet,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Info,
  DollarSign,
  ShoppingBag,
  Loader2,
  Layers,
} from 'lucide-react';
import { Tooltip } from './Tooltip';

interface PurchaseCheckerPageProps {
  currencySymbol: string;
  cashEquivalents: number;
  monthlyNetIncome: number;
  onOpenHelp?: () => void;
  onLogTransactionAndAsset?: (data: {
    transaction: {
      name: string;
      amount: number;
      date: string;
      type: 'expense' | 'income';
      category: string;
      description?: string;
    };
    asset: Omit<AssetItem, 'id' | 'createdAt' | 'updatedAt'>;
  }) => Promise<any> | any;
  onNavigateToTab?: (tab: string) => void;
}

export const PurchaseCheckerPage: React.FC<PurchaseCheckerPageProps> = ({
  currencySymbol,
  cashEquivalents,
  monthlyNetIncome,
  onOpenHelp,
  onLogTransactionAndAsset,
  onNavigateToTab,
}) => {
  const [itemName, setItemName] = useState<string>('Apple MacBook Pro M3');
  const [itemPrice, setItemPrice] = useState<number>(85000);
  const [category, setCategory] = useState<string>('Electronics / Tech');
  const [multiplier, setMultiplier] = useState<number>(10); // Defaults to 10x rule
  const [comparisonBasis, setComparisonBasis] = useState<'cash' | 'income' | 'both'>('cash');
  const [isLogging, setIsLogging] = useState<boolean>(false);
  const [logSuccess, setLogSuccess] = useState<boolean>(false);

  // Multiplier presets
  const presets = [
    { label: '3x (Aggressive)', value: 3 },
    { label: '5x (Prudent)', value: 5 },
    { label: '10x (Wealth Rule)', value: 10, recommended: true },
    { label: '20x (Ultra Fortress)', value: 20 },
  ];

  // Calculations
  const requiredAmount = itemPrice * multiplier;

  // Evaluation against Cash Equivalents
  const cashPassed = cashEquivalents >= requiredAmount;
  const cashSurplus = cashEquivalents - requiredAmount;
  const cashDeficit = requiredAmount - cashEquivalents;
  const cashImpactPercent = cashEquivalents > 0 ? (itemPrice / cashEquivalents) * 100 : 100;
  const remainingCashAfterPurchase = cashEquivalents - itemPrice;

  // Evaluation against Monthly Net Income
  const incomeRequired = itemPrice * Math.max(1, multiplier / 2);
  const incomePassed = monthlyNetIncome > 0 && monthlyNetIncome >= incomeRequired;

  // Combined Decision
  const isApproved =
    comparisonBasis === 'cash'
      ? cashPassed
      : comparisonBasis === 'income'
      ? incomePassed
      : cashPassed && incomePassed;

  // Months to save deficit if denied
  const monthsToAfford = useMemo(() => {
    if (isApproved || monthlyNetIncome <= 0 || cashDeficit <= 0) return null;
    const months = Math.ceil(cashDeficit / monthlyNetIncome);
    return Math.max(1, months);
  }, [isApproved, monthlyNetIncome, cashDeficit]);

  // Push directly into Logged Transactions and Asset Inventory
  const handleLogAction = async () => {
    if (isLogging || !onLogTransactionAndAsset || itemPrice <= 0) return;
    setIsLogging(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const catLower = category.toLowerCase();
      const assetCat: AssetCategory =
        catLower.includes('vehicle') || catLower.includes('car')
          ? 'Vehicles'
          : catLower.includes('real estate') || catLower.includes('condo') || catLower.includes('house')
          ? 'Real estate'
          : catLower.includes('stock') || catLower.includes('equity')
          ? 'Stocks'
          : 'Other assets';

      await onLogTransactionAndAsset({
        transaction: {
          name: `Purchase: ${itemName.trim() || 'Evaluated Item'}`,
          amount: itemPrice,
          date: today,
          type: 'expense',
          category: category.trim() || 'Miscellaneous',
          description: `Evaluated via Buyer Checker with ${multiplier}x wealth rule (liquid cash impact: ${cashImpactPercent.toFixed(1)}%).`,
        },
        asset: {
          name: itemName.trim() || 'New Asset Item',
          category: assetCat,
          initialValue: itemPrice,
          date: today,
          institution: 'Personal Possession',
          notes: `Created from Buyer Checker verification. Multiplier target: ${multiplier}x, Outcome: ${isApproved ? 'Approved' : 'Self-Financed'}.`,
        },
      });
      setLogSuccess(true);
    } catch (err) {
      console.error('Failed to log transaction and asset from checker:', err);
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto select-none">
      {/* Top Banner */}
      <div className="bg-[#1e2324] text-white p-4 rounded-lg border border-neutral-700 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/80 flex items-center justify-center text-emerald-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-wide uppercase text-white flex items-center gap-2">
              Purchase Affordability Checker
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-bold tracking-normal">
                10X WEALTH RULE
              </span>
            </h1>
            <p className="text-xs text-neutral-400">
              Verify if an expense is truly affordable before you buy, without jeopardizing your financial safety buffer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {onOpenHelp && (
            <Tooltip content="Open complete guide and operational walkthrough for Buyer & Affordability Checker">
              <button
                type="button"
                onClick={onOpenHelp}
                className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold shadow-xs transition border border-neutral-700"
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>Help &amp; Guide</span>
              </button>
            </Tooltip>
          )}

          {/* Current Liquidity Metric Badge */}
          <div className="bg-neutral-900 border border-neutral-700 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-neutral-400 block uppercase font-semibold">
                Current Liquid Cash
              </span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {formatCurrency(cashEquivalents, currencySymbol)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Inputs on Left, Real-Time Decision on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ================= LEFT COLUMN: INPUTS & SETTINGS ================= */}
        <div className="lg:col-span-6 bg-white border border-neutral-300 rounded-lg shadow-xs overflow-hidden text-xs">
          <div className="bg-[#2d3134] text-white p-3 flex items-center justify-between border-b border-neutral-700">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <h2 className="font-bold text-sm tracking-wide">Purchase Details</h2>
            </div>
            <span className="text-[11px] text-neutral-300 font-mono">
              Evaluated against live ledger
            </span>
          </div>

          <div className="p-4 space-y-4">
            {/* Item Name */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Item / Purchase Description *
              </label>
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Designer Watch, Weekend Getaway, New Laptop"
                className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-hidden focus:border-emerald-600 font-medium text-neutral-900 text-xs"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Purchase Price ({currencySymbol}) *
              </label>
              <input
                type="number"
                step="any"
                min="1"
                required
                value={itemPrice || ''}
                onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-hidden focus:border-emerald-600 font-mono text-sm font-bold text-neutral-900"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-hidden focus:border-emerald-600 bg-white cursor-pointer text-xs"
              >
                <option value="Electronics / Tech">Electronics / Tech</option>
                <option value="Luxury / Fashion">Luxury / Fashion</option>
                <option value="Travel / Vacation">Travel / Vacation</option>
                <option value="Home / Furniture">Home / Furniture</option>
                <option value="Vehicles / Transportation">Vehicles / Transportation</option>
                <option value="Entertainment / Leisure">Entertainment / Leisure</option>
                <option value="Personal Wellness">Personal Wellness</option>
              </select>
            </div>

            {/* Customisable Affordability Multiplier */}
            <div className="space-y-2 pt-2 border-t border-neutral-200">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-neutral-800">
                  Affordability Multiplier: <span className="font-mono text-emerald-700 font-bold">{multiplier}x</span>
                </label>
                <span className="text-[10px] text-neutral-500 font-mono">
                  Default: 10x Rule
                </span>
              </div>

              {/* Multiplier Quick Preset Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setMultiplier(p.value)}
                    className={`py-1.5 px-2 rounded border text-center font-semibold transition cursor-pointer text-[11px] ${
                      multiplier === p.value
                        ? 'bg-emerald-800 text-white border-emerald-700 shadow-xs'
                        : 'bg-neutral-100 text-neutral-700 border-neutral-300 hover:bg-neutral-200'
                    }`}
                  >
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>

              {/* Multiplier Slider */}
              <div className="pt-2">
                <input
                  type="range"
                  min="2"
                  max="25"
                  step="1"
                  value={multiplier}
                  onChange={(e) => setMultiplier(parseInt(e.target.value) || 10)}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
                  <span>2x (Lenient)</span>
                  <span>10x (Wealth Rule)</span>
                  <span>25x (Ultra Secure)</span>
                </div>
              </div>
            </div>

            {/* Comparison Basis Selector */}
            <div className="pt-2 border-t border-neutral-200">
              <label className="block font-semibold text-neutral-700 mb-1">
                Comparison Baseline
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setComparisonBasis('cash')}
                  className={`py-1.5 px-2 rounded border text-center font-medium transition cursor-pointer text-[11px] ${
                    comparisonBasis === 'cash'
                      ? 'bg-neutral-800 text-white border-neutral-700 font-bold'
                      : 'bg-neutral-50 text-neutral-600 border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  Liquid Cash
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonBasis('income')}
                  className={`py-1.5 px-2 rounded border text-center font-medium transition cursor-pointer text-[11px] ${
                    comparisonBasis === 'income'
                      ? 'bg-neutral-800 text-white border-neutral-700 font-bold'
                      : 'bg-neutral-50 text-neutral-600 border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  Net Income
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonBasis('both')}
                  className={`py-1.5 px-2 rounded border text-center font-medium transition cursor-pointer text-[11px] ${
                    comparisonBasis === 'both'
                      ? 'bg-neutral-800 text-white border-neutral-700 font-bold'
                      : 'bg-neutral-50 text-neutral-600 border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  Strict (Both)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: REAL-TIME DECISION & METRICS ================= */}
        <div className="lg:col-span-6 space-y-4">
          {/* Decision Status Card */}
          <div
            className={`p-5 rounded-lg border-2 shadow-md text-white transition-all duration-200 ${
              isApproved
                ? 'bg-gradient-to-br from-emerald-950 via-neutral-900 to-emerald-950 border-emerald-500/80'
                : 'bg-gradient-to-br from-red-950 via-neutral-900 to-red-950 border-red-500/80'
            }`}
          >
            {/* Status Header Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-700/60">
              <div className="flex items-center gap-2">
                {isApproved ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-red-400" />
                )}
                <div>
                  <span className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider block">
                    Verification Outcome
                  </span>
                  <span
                    className={`font-black text-lg tracking-wide ${
                      isApproved ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {isApproved ? 'APPROVED TO BUY' : 'PURCHASE DENIED'}
                  </span>
                </div>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded font-bold border font-mono ${
                  isApproved
                    ? 'bg-emerald-900/80 text-emerald-200 border-emerald-500'
                    : 'bg-red-900/80 text-red-200 border-red-500'
                }`}
              >
                {multiplier}x Rule {isApproved ? 'Satisfied' : 'Failed'}
              </span>
            </div>

            {/* Explanation / Rationale */}
            <div className="py-3 text-xs text-neutral-300 space-y-2">
              <p>
                {isApproved ? (
                  <span>
                    Great news! Buying <b className="text-white">"{itemName}"</b> for{' '}
                    <b className="text-emerald-400 font-mono">{formatCurrency(itemPrice, currencySymbol)}</b> passes your{' '}
                    <b className="text-white">{multiplier}x affordability rule</b>. You have ample liquid reserves to absorb this expenditure without compromising your long-term wealth stability.
                  </span>
                ) : (
                  <span>
                    Hold on! Buying <b className="text-white">"{itemName}"</b> for{' '}
                    <b className="text-red-400 font-mono">{formatCurrency(itemPrice, currencySymbol)}</b> violates your{' '}
                    <b className="text-white">{multiplier}x buffer target</b>. It would overextend your liquid reserves by{' '}
                    <b className="text-red-300 font-mono">{formatCurrency(cashDeficit, currencySymbol)}</b>.
                  </span>
                )}
              </p>

              {!isApproved && monthsToAfford !== null && (
                <div className="p-2.5 bg-neutral-900/80 border border-neutral-700 rounded text-amber-300 text-[11px] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    At your current monthly savings run-rate, you can safely afford this purchase in approximately{' '}
                    <b>{monthsToAfford} month{monthsToAfford === 1 ? '' : 's'}</b>.
                  </span>
                </div>
              )}
            </div>

            {/* Key Comparison Grid */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-neutral-700/60 text-xs font-mono">
              <div className="bg-neutral-900/60 p-2.5 rounded border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block uppercase">
                  Required {multiplier}x Buffer
                </span>
                <span className="text-sm font-bold text-white">
                  {formatCurrency(requiredAmount, currencySymbol)}
                </span>
              </div>

              <div className="bg-neutral-900/60 p-2.5 rounded border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block uppercase">
                  Available Liquid Cash
                </span>
                <span className="text-sm font-bold text-emerald-400">
                  {formatCurrency(cashEquivalents, currencySymbol)}
                </span>
              </div>

              <div className="bg-neutral-900/60 p-2.5 rounded border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block uppercase">
                  Cash Left After Buy
                </span>
                <span
                  className={`text-sm font-bold ${
                    remainingCashAfterPurchase >= 0 ? 'text-neutral-200' : 'text-red-400'
                  }`}
                >
                  {formatCurrency(remainingCashAfterPurchase, currencySymbol)}
                </span>
              </div>

              <div className="bg-neutral-900/60 p-2.5 rounded border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block uppercase">
                  Reserves Consumed
                </span>
                <span
                  className={`text-sm font-bold ${
                    cashImpactPercent <= 10 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {cashImpactPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Action Pipeline: Log as Active Transaction & Asset */}
          <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>Ledger &amp; Balance Sheet Pipeline</span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Instantly push this evaluated trade/purchase into your Logged Transactions and create a holding entry in Asset Inventory.
                </p>
              </div>

              <button
                type="button"
                disabled={isLogging || itemPrice <= 0}
                onClick={handleLogAction}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-2 shrink-0 ${
                  logSuccess
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-white active:bg-black'
                }`}
              >
                {isLogging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Logging to Ledger...</span>
                  </>
                ) : logSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Logged to Ledger &amp; Assets ✓</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Log as Active Transaction &amp; Asset</span>
                  </>
                )}
              </button>
            </div>

            {logSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Successfully recorded in <b>Logged Transactions</b> (Expense) and <b>Asset Inventory</b> ({formatCurrency(itemPrice, currencySymbol)}).
                  </span>
                </div>
                {onNavigateToTab && (
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => onNavigateToTab('income-expenses')}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 px-2 py-0.5 bg-white rounded border border-emerald-300 transition"
                    >
                      View in Ledger &rarr;
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigateToTab('assets')}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 px-2 py-0.5 bg-white rounded border border-emerald-300 transition"
                    >
                      View in Assets &rarr;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Educational Insight Card: The 10x Wealth Rule */}
          <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-xs text-xs space-y-2.5">
            <div className="flex items-center gap-2 text-neutral-900 font-bold">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Why Use the 10x Wealth Rule?</span>
            </div>
            <p className="text-neutral-600 leading-relaxed">
              Standard consumer budgeting often only checks if you have enough money in your bank account to cover the sticker price right now.
              The <b>10x Rule</b> ensures you never suffer from lifestyle inflation or cashflow shocks:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-neutral-600">
              <li>
                <b>Zero Regret:</b> Even after purchasing, 90% of your initial capital buffer remains intact and productive.
              </li>
              <li>
                <b>Fortress Reserves:</b> Eliminates panic if unexpected medical, vehicle, or business expenses coincide with discretionary buys.
              </li>
              <li>
                <b>Compound Momentum:</b> Ensures capital stays in rolling liquid accounts and investments rather than leaking out prematurely.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
