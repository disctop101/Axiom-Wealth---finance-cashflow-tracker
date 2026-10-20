import React, { useState, useMemo, useEffect } from 'react';
import { formatCurrency, AssetItem } from '../types/finance';
import {
  Calculator,
  TrendingUp,
  Percent,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  PieChart as PieIcon,
  Sparkles,
  RotateCcw,
  Info,
  HelpCircle,
  BarChart3,
  SlidersHorizontal,
  Plus,
  Trash2,
  ArrowDownUp,
  ShieldCheck,
  Coins,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { Tooltip } from './Tooltip';

interface StockDividendCalculatorPageProps {
  currencySymbol?: string;
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

export interface CustomFeeItem {
  id: string;
  name: string;
  type: 'percent' | 'flat';
  value: number; // percentage (e.g., 0.25) or flat amount in currency
  appliesTo: 'both' | 'buy' | 'sell';
}

const DEFAULT_FEES: CustomFeeItem[] = [
  { id: 'fee-comm', name: 'Broker Commission', type: 'percent', value: 0.25, appliesTo: 'both' },
  { id: 'fee-vat', name: 'Commission VAT', type: 'percent', value: 12.0, appliesTo: 'both' }, // 12% of commission
  { id: 'fee-pse', name: 'Exchange Transaction Fee', type: 'percent', value: 0.005, appliesTo: 'both' },
  { id: 'fee-sccp', name: 'Clearing & Depository Fee', type: 'percent', value: 0.01, appliesTo: 'both' },
  { id: 'fee-sales-tax', name: 'Sales Tax', type: 'percent', value: 0.60, appliesTo: 'sell' },
];

// Pre-calculated static fallback objects to guarantee structural UI loads without math breaking
const STATIC_DEFAULT_TRADE_MATH = {
  gross: 32500,
  totalFees: 281.125,
  feeBreakdown: [
    { name: 'Broker Commission', amount: 81.25, detail: '0.25% of Gross' },
    { name: 'Commission VAT', amount: 9.75, detail: '12% of Comm' },
    { name: 'Exchange Transaction Fee', amount: 1.625, detail: '0.005% of Gross' },
    { name: 'Clearing & Depository Fee', amount: 3.25, detail: '0.01% of Gross' },
  ],
  netAmountDue: 32781.125,
  netPricePerShare: 32.781,
  remainingPower: 67218.875,
  powerUsed: 32781.125,
};

const STATIC_DEFAULT_DIVIDEND_MATH = {
  overallShareCost: 32500,
  grossYearlyDividend: 1200,
  taxDeduction: 120,
  netYearlyDividend: 1080,
  dividendPerPayout: 270,
  trueYieldPercent: 3.32,
  grossYieldPercent: 3.69,
  yearsForRoi: 30.09,
};

const STATIC_DEFAULT_COMPOUND_CALCULATIONS = {
  initialInvestment: 75000,
  finalPortfolioValue: 161921.2,
  finalTotalReturn: 86921.2,
  finalTotalReturnPercent: 115.9,
  finalAnnualDividend: 7286.45,
  finalTotalShares: 809.6,
  annualizedReturn: 8.0,
  yearlyBreakdown: [],
};

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class CalculatorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('StockDividendCalculator caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-950/20 border border-red-800 rounded-xl text-white space-y-4 max-w-xl mx-auto my-8">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="w-6 h-6" />
            <h2 className="font-bold text-base">Calculator Render Recovered</h2>
          </div>
          <p className="text-xs text-neutral-300">
            A calculation or parameter formatting error occurred. The calculator state has been safeguarded to prevent application disruption.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold transition cursor-pointer"
          >
            Reset Simulator
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const StockDividendCalculatorContent: React.FC<StockDividendCalculatorPageProps> = ({
  currencySymbol = '$',
  onOpenHelp,
  onLogTransactionAndAsset,
  onNavigateToTab,
}) => {
  // Guard initial component mount to ensure structural UI renders completely before math executes
  const [isMounted, setIsMounted] = useState<boolean>(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Safe fallback currency symbol
  const safeCurrency = currencySymbol || '$';

  // Navigation / View Tabs
  const [activeTab, setActiveTab] = useState<'trade' | 'dividend' | 'compound'>('trade');

  // ================= 1. STOCK TRADE & CUSTOM FEE SIMULATOR STATE =================
  const [tradeAction, setTradeAction] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeStockCode, setTradeStockCode] = useState<string>('');
  const [tradeCompanyName, setTradeCompanyName] = useState<string>('');
  const [tradePricePerShare, setTradePricePerShare] = useState<number>(0);
  const [tradeShares, setTradeShares] = useState<number>(0);
  const [buyingPowerBudget, setBuyingPowerBudget] = useState<number>(0);

  // Dynamic Custom Fees
  const [customFees, setCustomFees] = useState<CustomFeeItem[]>(DEFAULT_FEES);
  const [newFeeName, setNewFeeName] = useState<string>('');
  const [newFeeType, setNewFeeType] = useState<'percent' | 'flat'>('percent');
  const [newFeeValue, setNewFeeValue] = useState<number>(0);
  const [newFeeAppliesTo, setNewFeeAppliesTo] = useState<'both' | 'buy' | 'sell'>('both');

  // Pipeline logging states for trade
  const [isLoggingTrade, setIsLoggingTrade] = useState<boolean>(false);
  const [tradeLogSuccess, setTradeLogSuccess] = useState<boolean>(false);

  // Push directly into Logged Transactions and Asset Inventory
  const handleLogTradeAction = async () => {
    if (isLoggingTrade || !onLogTransactionAndAsset) return;
    setIsLoggingTrade(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const code = tradeStockCode.trim() || 'STOCK';
      const company = tradeCompanyName.trim() || code;
      const sharesCount = Math.max(1, tradeShares || 1);
      const isBuy = tradeAction === 'BUY';

      await onLogTransactionAndAsset({
        transaction: {
          name: `${isBuy ? 'Stock Purchase' : 'Stock Sale'}: ${code} (${sharesCount.toLocaleString()} shs)`,
          amount: tradeMath.netAmountDue,
          date: today,
          type: isBuy ? 'expense' : 'income',
          category: 'Investments',
          description: `Stock Simulator execution: ${tradeAction} ${sharesCount.toLocaleString()} shares of ${code} @ ${formatCurrency(tradePricePerShare, safeCurrency)}/sh. Total fees & taxes: ${formatCurrency(tradeMath.totalFees, safeCurrency)}.`,
        },
        asset: {
          name: `${code} - ${company}`,
          category: 'Stocks',
          date: today,
          stockCode: code,
          stockName: company,
          broker: 'Direct Brokerage',
          totalShares: sharesCount,
          avgCostPerShare: tradeMath.netPricePerShare,
          totalFeesPaid: tradeMath.totalFees,
          currentPrice: tradePricePerShare,
          unrealizedGainLoss: 0,
          unrealizedGainLossPercent: 0,
          totalDividendsCollected: 0,
          initialValue: isBuy ? tradeMath.netAmountDue : 0,
          institution: 'Stock Brokerage',
          notes: `Simulated trade logged directly into active asset inventory. Action: ${tradeAction}, Shares: ${sharesCount}, Fees: ${formatCurrency(tradeMath.totalFees, safeCurrency)}.`,
        },
      });
      setTradeLogSuccess(true);
    } catch (err) {
      console.error('Failed to log simulated trade:', err);
    } finally {
      setIsLoggingTrade(false);
    }
  };

  // Strict null-checking & fallback math for Trade
  const tradeMath = useMemo(() => {
    if (!isMounted) {
      return STATIC_DEFAULT_TRADE_MATH;
    }
    try {
      const price = Number.isFinite(tradePricePerShare) && tradePricePerShare > 0 ? tradePricePerShare : 0;
      const shares = Number.isFinite(tradeShares) && tradeShares > 0 ? tradeShares : 0;
      const budget = Number.isFinite(buyingPowerBudget) && buyingPowerBudget > 0 ? buyingPowerBudget : 0;
      const action = tradeAction === 'SELL' ? 'SELL' : 'BUY';
      const feesList = Array.isArray(customFees) ? customFees : [];

      const gross = price * shares;
      let totalFees = 0;
      const feeBreakdown: Array<{ name: string; amount: number; detail: string }> = [];

      // Base commission amount for VAT calculation
      let brokerCommAmount = 0;
      const commFee = feesList.find(
        (f) =>
          f?.name &&
          f.name.toLowerCase().includes('commission') &&
          !f.name.toLowerCase().includes('vat')
      );
      if (commFee) {
        const commVal = Number.isFinite(commFee.value) ? commFee.value : 0;
        brokerCommAmount = commFee.type === 'percent' ? gross * (commVal / 100) : commVal;
      }

      feesList.forEach((fee) => {
        if (!fee) return;
        const isApplicable =
          fee.appliesTo === 'both' ||
          (fee.appliesTo === 'buy' && action === 'BUY') ||
          (fee.appliesTo === 'sell' && action === 'SELL');

        if (!isApplicable) return;

        const feeVal = Number.isFinite(fee.value) ? fee.value : 0;
        let amount = 0;
        let detail = '';

        if (fee.name && fee.name.toLowerCase().includes('vat')) {
          amount = brokerCommAmount * (feeVal / 100);
          detail = `${feeVal}% of Comm`;
        } else if (fee.type === 'percent') {
          amount = gross * (feeVal / 100);
          detail = `${feeVal}% of Gross`;
        } else {
          amount = feeVal;
          detail = `Flat ${safeCurrency} ${feeVal.toFixed(2)}`;
        }

        totalFees += amount;
        feeBreakdown.push({
          name: fee.name || 'Custom Fee',
          amount: isNaN(amount) ? 0 : amount,
          detail,
        });
      });

      const netAmountDue = action === 'BUY' ? gross + totalFees : Math.max(0, gross - totalFees);
      const netPricePerShare = shares > 0 ? netAmountDue / shares : price;
      const remainingPower = budget - (action === 'BUY' ? netAmountDue : 0);

      return {
        gross: isNaN(gross) ? 0 : gross,
        totalFees: isNaN(totalFees) ? 0 : totalFees,
        feeBreakdown,
        netAmountDue: isNaN(netAmountDue) ? 0 : netAmountDue,
        netPricePerShare: isNaN(netPricePerShare) ? 0 : netPricePerShare,
        remainingPower: isNaN(remainingPower) ? 0 : remainingPower,
        powerUsed: action === 'BUY' ? Math.min(budget, netAmountDue) : 0,
      };
    } catch (err) {
      console.warn('Trade math error, returned safe default fallback:', err);
      return STATIC_DEFAULT_TRADE_MATH;
    }
  }, [isMounted, tradeAction, tradePricePerShare, tradeShares, customFees, buyingPowerBudget, safeCurrency]);

  const handleAddFee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeeName.trim()) return;
    const item: CustomFeeItem = {
      id: `fee-${Date.now()}`,
      name: newFeeName.trim(),
      type: newFeeType,
      value: Number(newFeeValue) || 0,
      appliesTo: newFeeAppliesTo,
    };
    setCustomFees([...customFees, item]);
    setNewFeeName('');
    setNewFeeValue(0);
  };

  const handleRemoveFee = (id: string) => {
    setCustomFees((prev) => (Array.isArray(prev) ? prev.filter((f) => f.id !== id) : []));
  };

  const handleResetFees = () => {
    setCustomFees(DEFAULT_FEES);
  };

  // ================= 2. DIVIDEND YIELD & ROI CALCULATOR STATE =================
  const [divStockPrice, setDivStockPrice] = useState<number>(0);
  const [divShares, setDivShares] = useState<number>(0);
  const [annualBaseDividend, setAnnualBaseDividend] = useState<number>(0);
  const [dividendFrequency, setDividendFrequency] = useState<number>(4);
  const [withholdingTaxPercent, setWithholdingTaxPercent] = useState<number>(0);

  // Dividend & ROI Calculations with strict null checks and division by zero protection
  const dividendMath = useMemo(() => {
    if (!isMounted) {
      return STATIC_DEFAULT_DIVIDEND_MATH;
    }
    try {
      const stockPrice = Number.isFinite(divStockPrice) && divStockPrice > 0 ? divStockPrice : 0;
      const shares = Number.isFinite(divShares) && divShares > 0 ? divShares : 0;
      const baseDiv = Number.isFinite(annualBaseDividend) && annualBaseDividend > 0 ? annualBaseDividend : 0;
      const freq = Number.isFinite(dividendFrequency) && dividendFrequency > 0 ? dividendFrequency : 1;
      const taxRate = Number.isFinite(withholdingTaxPercent) && withholdingTaxPercent >= 0 ? withholdingTaxPercent : 0;

      const overallShareCost = stockPrice * shares;
      const grossYearlyDividend = baseDiv * shares;
      const taxDeduction = grossYearlyDividend * (taxRate / 100);
      const netYearlyDividend = Math.max(0, grossYearlyDividend - taxDeduction);
      const dividendPerPayout = freq > 0 ? netYearlyDividend / freq : netYearlyDividend;

      const trueYieldPercent = overallShareCost > 0 ? (netYearlyDividend / overallShareCost) * 100 : 0;
      const grossYieldPercent = stockPrice > 0 ? (baseDiv / stockPrice) * 100 : 0;

      // Years for ROI = Overall Cost / Net Yearly Dividend
      const yearsForRoi =
        netYearlyDividend > 0 && Number.isFinite(overallShareCost / netYearlyDividend)
          ? overallShareCost / netYearlyDividend
          : 0;

      return {
        overallShareCost: isNaN(overallShareCost) ? 0 : overallShareCost,
        grossYearlyDividend: isNaN(grossYearlyDividend) ? 0 : grossYearlyDividend,
        taxDeduction: isNaN(taxDeduction) ? 0 : taxDeduction,
        netYearlyDividend: isNaN(netYearlyDividend) ? 0 : netYearlyDividend,
        dividendPerPayout: isNaN(dividendPerPayout) ? 0 : dividendPerPayout,
        trueYieldPercent: isNaN(trueYieldPercent) ? 0 : trueYieldPercent,
        grossYieldPercent: isNaN(grossYieldPercent) ? 0 : grossYieldPercent,
        yearsForRoi: isNaN(yearsForRoi) ? 0 : yearsForRoi,
      };
    } catch (err) {
      console.warn('Dividend math error, returned safe default fallback:', err);
      return STATIC_DEFAULT_DIVIDEND_MATH;
    }
  }, [isMounted, divStockPrice, divShares, annualBaseDividend, dividendFrequency, withholdingTaxPercent]);

  // ================= 3. MULTI-YEAR COMPOUNDING ENGINE STATE =================
  const [compoundTicker, setCompoundTicker] = useState<string>('');
  const [compoundSharePrice, setCompoundSharePrice] = useState<number>(0);
  const [compoundShares, setCompoundShares] = useState<number>(0);
  const [expectedGrowthRate, setExpectedGrowthRate] = useState<number>(0);
  const [compoundDividendYield, setCompoundDividendYield] = useState<number>(0);
  const [dividendGrowthRate, setDividendGrowthRate] = useState<number>(0);
  const [timeframeYears, setTimeframeYears] = useState<number>(10);
  const [reinvestDividends, setReinvestDividends] = useState<boolean>(true);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(0);

  const timeframePresets = [1, 3, 5, 10, 15, 20, 25, 30];

  const compoundCalculations = useMemo(() => {
    if (!isMounted) {
      return STATIC_DEFAULT_COMPOUND_CALCULATIONS;
    }
    try {
      const price = Number.isFinite(compoundSharePrice) && compoundSharePrice > 0 ? compoundSharePrice : 0;
      const shares = Number.isFinite(compoundShares) && compoundShares > 0 ? compoundShares : 0;
      const growth = Number.isFinite(expectedGrowthRate) ? expectedGrowthRate : 0;
      const divYield = Number.isFinite(compoundDividendYield) && compoundDividendYield >= 0 ? compoundDividendYield : 0;
      const divGrowth = Number.isFinite(dividendGrowthRate) ? dividendGrowthRate : 0;
      const monthly = Number.isFinite(monthlyContribution) && monthlyContribution >= 0 ? monthlyContribution : 0;

      const initialInvestment = price * shares;
      let currentShares = shares;
      let currentPrice = price;
      let currentDivPerShare = currentPrice * (divYield / 100);

      let totalDividendsReceived = 0;
      let cumulativeInvested = initialInvestment;

      const yearlyBreakdown: Array<{
        year: number;
        sharePrice: number;
        sharesCount: number;
        annualDividend: number;
        cumulativeDividends: number;
        portfolioValue: number;
        costBasis: number;
        totalReturn: number;
        totalReturnPercent: number;
      }> = [];

      const safeYears = Math.max(1, Math.min(50, Number(timeframeYears) || 10));

      for (let yr = 1; yr <= safeYears; yr++) {
        currentPrice = currentPrice * (1 + growth / 100);
        const yearlyContribution = monthly * 12;
        cumulativeInvested += yearlyContribution;

        if (yearlyContribution > 0 && currentPrice > 0) {
          currentShares += yearlyContribution / currentPrice;
        }

        if (yr > 1) {
          currentDivPerShare = currentDivPerShare * (1 + divGrowth / 100);
        }

        const annualDividend = currentShares * currentDivPerShare;
        totalDividendsReceived += annualDividend;

        if (reinvestDividends && currentPrice > 0) {
          const additionalShares = annualDividend / currentPrice;
          currentShares += additionalShares;
        }

        const portfolioValue = currentShares * currentPrice;
        const totalReturn = portfolioValue - cumulativeInvested;
        const totalReturnPercent =
          cumulativeInvested > 0 ? (totalReturn / cumulativeInvested) * 100 : 0;

        yearlyBreakdown.push({
          year: yr,
          sharePrice: isNaN(currentPrice) ? 0 : currentPrice,
          sharesCount: isNaN(currentShares) ? 0 : currentShares,
          annualDividend: isNaN(annualDividend) ? 0 : annualDividend,
          cumulativeDividends: isNaN(totalDividendsReceived) ? 0 : totalDividendsReceived,
          portfolioValue: isNaN(portfolioValue) ? 0 : portfolioValue,
          costBasis: isNaN(cumulativeInvested) ? 0 : cumulativeInvested,
          totalReturn: isNaN(totalReturn) ? 0 : totalReturn,
          totalReturnPercent: isNaN(totalReturnPercent) ? 0 : totalReturnPercent,
        });
      }

      const finalResult = yearlyBreakdown[yearlyBreakdown.length - 1] || {
        portfolioValue: initialInvestment,
        totalReturn: 0,
        totalReturnPercent: 0,
        annualDividend: 0,
        sharesCount: currentShares,
      };

      const annualizedReturn =
        initialInvestment > 0 && safeYears > 0
          ? (Math.pow(finalResult.portfolioValue / initialInvestment, 1 / safeYears) - 1) * 100
          : 0;

      return {
        initialInvestment: isNaN(initialInvestment) ? 0 : initialInvestment,
        finalPortfolioValue: isNaN(finalResult.portfolioValue) ? 0 : finalResult.portfolioValue,
        finalTotalReturn: isNaN(finalResult.totalReturn) ? 0 : finalResult.totalReturn,
        finalTotalReturnPercent: isNaN(finalResult.totalReturnPercent) ? 0 : finalResult.totalReturnPercent,
        finalAnnualDividend: isNaN(finalResult.annualDividend) ? 0 : finalResult.annualDividend,
        finalTotalShares: isNaN(finalResult.sharesCount) ? 0 : finalResult.sharesCount,
        annualizedReturn: isNaN(annualizedReturn) ? 0 : annualizedReturn,
        yearlyBreakdown,
      };
    } catch (err) {
      console.warn('Compound math error, returned safe default fallback:', err);
      return STATIC_DEFAULT_COMPOUND_CALCULATIONS;
    }
  }, [
    isMounted,
    compoundSharePrice,
    compoundShares,
    expectedGrowthRate,
    compoundDividendYield,
    dividendGrowthRate,
    timeframeYears,
    reinvestDividends,
    monthlyContribution,
  ]);

  return (
    <div className="space-y-4 pb-12 max-w-full overflow-x-hidden">
      {/* Header Banner */}
      <div className="bg-[#212529] text-white p-4 sm:p-5 rounded-xl shadow-md border border-neutral-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-600 flex items-center justify-center text-emerald-400 shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg text-white">
                International Stock &amp; Dividend Simulator
              </h1>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Simulate stock trades with custom broker fees, compute true dividend yield &amp; ROI payoff, and model long-term compounding.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
          {onOpenHelp && (
            <Tooltip content="Open operational guide and button explanations for Stock & Dividend Simulator">
              <button
                type="button"
                onClick={onOpenHelp}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold shadow-xs transition border border-neutral-700 self-start sm:self-auto cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>Guide</span>
              </button>
            </Tooltip>
          )}

          {/* Global Navigation Tabs (Fully constrained to viewport width on mobile) */}
          <div className="grid grid-cols-3 bg-neutral-900 border border-neutral-700 p-1 rounded-lg w-full sm:w-auto sm:flex sm:items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('trade')}
              className={`px-2 sm:px-3 py-1.5 rounded text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center ${
                activeTab === 'trade'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ArrowDownUp className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Trade &amp; Fees</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dividend')}
              className={`px-2 sm:px-3 py-1.5 rounded text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center ${
                activeTab === 'dividend'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Coins className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Yield &amp; ROI</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('compound')}
              className={`px-2 sm:px-3 py-1.5 rounded text-[11px] sm:text-xs font-bold transition flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer text-center ${
                activeTab === 'compound'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Compounding</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= TAB 1: STOCK TRADE & CUSTOM FEE SIMULATOR ================= */}
      {activeTab === 'trade' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Top KPI Metrics Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-neutral-300 rounded-lg p-3.5 shadow-xs">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">
                Gross Trade Total
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-neutral-900 mt-1">
                {formatCurrency(tradeMath.gross, safeCurrency)}
              </div>
              <span className="text-[10px] text-neutral-400 block mt-0.5">
                {(tradeShares || 0).toLocaleString()} shares @ {formatCurrency(tradePricePerShare, safeCurrency)}
              </span>
            </div>

            <div className="bg-white border border-neutral-300 rounded-lg p-3.5 shadow-xs">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">
                Total Transaction Fees
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-red-600 mt-1">
                {formatCurrency(tradeMath.totalFees, safeCurrency)}
              </div>
              <span className="text-[10px] text-neutral-400 block mt-0.5">
                {tradeMath.gross > 0 ? ((tradeMath.totalFees / tradeMath.gross) * 100).toFixed(3) : '0.000'}% of gross trade
              </span>
            </div>

            <div className="bg-white border border-emerald-300 bg-emerald-50/20 rounded-lg p-3.5 shadow-xs">
              <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                {tradeAction === 'BUY' ? 'Total Amount Due' : 'Net Cash Proceeds'}
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700 mt-1">
                {formatCurrency(tradeMath.netAmountDue, safeCurrency)}
              </div>
              <span className="text-[10px] text-neutral-600 block mt-0.5">
                Effective: <b>{formatCurrency(tradeMath.netPricePerShare, safeCurrency)}</b> / share
              </span>
            </div>

            <div className="bg-white border border-neutral-300 rounded-lg p-3.5 shadow-xs">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block flex items-center justify-between">
                <span>Buying Power</span>
                <span className="font-mono text-neutral-400 font-normal">Remaining</span>
              </span>
              <div
                className={`text-lg sm:text-xl font-bold font-mono mt-1 ${
                  tradeMath.remainingPower >= 0 ? 'text-neutral-900' : 'text-red-600'
                }`}
              >
                {formatCurrency(tradeMath.remainingPower, safeCurrency)}
              </div>
              <span className="text-[10px] text-neutral-400 block mt-0.5">
                Budget: {formatCurrency(buyingPowerBudget, safeCurrency)}
              </span>
            </div>
          </div>

          {/* Trade Parameters & Dynamic Fee Builder */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Trade Order Form (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-neutral-300 rounded-lg p-4 shadow-xs space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <h2 className="font-bold text-neutral-800 uppercase tracking-wide text-xs flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Trade Execution Parameters</span>
                </h2>
                {/* Buy / Sell Toggle Pill */}
                <div className="flex items-center bg-neutral-100 p-0.5 rounded border border-neutral-300">
                  <button
                    type="button"
                    onClick={() => setTradeAction('BUY')}
                    className={`px-3 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      tradeAction === 'BUY'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeAction('SELL')}
                    className={`px-3 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      tradeAction === 'SELL'
                        ? 'bg-red-600 text-white shadow-2xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    SELL
                  </button>
                </div>
              </div>

              {/* Stock Identifier & Company */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Stock Ticker / Code</label>
                  <input
                    type="text"
                    value={tradeStockCode}
                    onChange={(e) => setTradeStockCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AAPL"
                    className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded text-xs font-mono font-bold text-neutral-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={tradeCompanyName}
                    onChange={(e) => setTradeCompanyName(e.target.value)}
                    placeholder="e.g. Apple Inc."
                    className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded text-xs text-neutral-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Price & Shares */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Price Per Share ({safeCurrency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tradePricePerShare || ''}
                    placeholder="e.g. 150.00"
                    onChange={(e) => setTradePricePerShare(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded text-xs font-mono font-bold text-neutral-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Number of Shares</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={tradeShares || ''}
                    placeholder="e.g. 100"
                    onChange={(e) => setTradeShares(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded text-xs font-mono font-bold text-neutral-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Buying Power Budget Input */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Available Portfolio Cash / Buying Power ({safeCurrency})
                </label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={buyingPowerBudget || ''}
                  placeholder="e.g. 10000"
                  onChange={(e) => setBuyingPowerBudget(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded text-xs font-mono text-neutral-800 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Trade Result Summary Card */}
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2">
                <div className="font-bold text-neutral-800 uppercase text-[10px] tracking-wider">
                  Order Summary
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-500">Order Action:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      tradeAction === 'BUY'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {tradeAction} {(tradeShares || 0).toLocaleString()} {tradeStockCode}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-500">Gross Price:</span>
                  <span className="font-mono">{formatCurrency(tradePricePerShare, safeCurrency)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-500">Net Effective Price/Share:</span>
                  <span className="font-mono font-bold text-neutral-900">
                    {formatCurrency(tradeMath.netPricePerShare, safeCurrency)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-neutral-200">
                  <span className="font-bold text-neutral-800">
                    {tradeAction === 'BUY' ? 'Total Amount Due:' : 'Net Payout:'}
                  </span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {formatCurrency(tradeMath.netAmountDue, safeCurrency)}
                  </span>
                </div>

                {/* Pipeline Action Button */}
                <div className="pt-2 border-t border-neutral-200">
                  <button
                    type="button"
                    disabled={isLoggingTrade || tradeMath.netAmountDue <= 0}
                    onClick={handleLogTradeAction}
                    className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-2 ${
                      tradeLogSuccess
                        ? 'bg-emerald-600 text-white cursor-default'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-white active:bg-black'
                    }`}
                  >
                    {isLoggingTrade ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Logging Trade to Ledger...</span>
                      </>
                    ) : tradeLogSuccess ? (
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

                  {tradeLogSuccess && (
                    <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] space-y-1 animate-in fade-in duration-150">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Trade successfully pushed to Logged Transactions and Asset Inventory!</span>
                      </div>
                      {onNavigateToTab && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => onNavigateToTab('income-expenses')}
                            className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                          >
                            View in Transactions &rarr;
                          </button>
                          <span className="text-neutral-300">&middot;</span>
                          <button
                            type="button"
                            onClick={() => onNavigateToTab('assets')}
                            className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                          >
                            View in Asset Inventory &rarr;
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Dynamic Custom Fee Builder (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-neutral-300 rounded-lg p-4 shadow-xs space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <div>
                  <h2 className="font-bold text-neutral-800 uppercase tracking-wide text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Exchange &amp; Broker Fee Schedule</span>
                  </h2>
                  <p className="text-[10px] text-neutral-400">
                    Customize charges, commission percentages, stamp duty, or sales tax
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetFees}
                  className="text-[11px] text-neutral-500 hover:text-neutral-800 flex items-center gap-1 cursor-pointer"
                  title="Reset to default fees"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Defaults</span>
                </button>
              </div>

              {/* Active Fees Table */}
              <div className="border border-neutral-300 rounded overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#2d3134] text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2 px-3">Fee / Charge Name</th>
                      <th className="py-2 px-3">Applies To</th>
                      <th className="py-2 px-3">Rate / Rule</th>
                      <th className="py-2 px-3 text-right">Computed Amount</th>
                      <th className="py-2 px-2 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-mono text-[11px]">
                    {customFees?.map((fee) => {
                      const computed = tradeMath.feeBreakdown.find((b) => b.name === fee.name);
                      const isApplicable =
                        fee.appliesTo === 'both' ||
                        (fee.appliesTo === 'buy' && tradeAction === 'BUY') ||
                        (fee.appliesTo === 'sell' && tradeAction === 'SELL');

                      return (
                        <tr
                          key={fee.id}
                          className={`transition ${
                            !isApplicable
                              ? 'bg-neutral-100/60 dark:bg-neutral-800/60'
                              : 'bg-white dark:bg-[#1a1e20] hover:bg-neutral-50 dark:hover:bg-neutral-800/80'
                          }`}
                        >
                          <td className={`py-2 px-3 font-sans ${!isApplicable ? 'text-neutral-500 dark:text-neutral-300 font-medium italic' : 'font-semibold text-neutral-800 dark:text-neutral-100'}`}>
                            {fee.name}
                          </td>
                          <td className={`py-2 px-3 uppercase text-[10px] font-sans ${!isApplicable ? 'text-neutral-500 dark:text-neutral-300' : 'text-neutral-500 dark:text-neutral-300'}`}>
                            {fee.appliesTo}
                          </td>
                          <td className={`py-2 px-3 ${!isApplicable ? 'text-neutral-500 dark:text-neutral-300' : 'text-neutral-600 dark:text-neutral-200'}`}>
                            {fee.type === 'percent' ? `${fee.value}%` : `${safeCurrency} ${fee.value.toFixed(2)}`}
                          </td>
                          <td className={`py-2 px-3 text-right font-bold ${!isApplicable ? 'text-neutral-500 dark:text-neutral-300' : 'text-neutral-900 dark:text-neutral-100'}`}>
                            {computed ? formatCurrency(computed.amount, safeCurrency) : '—'}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveFee(fee.id)}
                              className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400 p-1 cursor-pointer transition"
                              title="Delete fee"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-neutral-100 dark:bg-neutral-800 font-bold border-t border-neutral-300 dark:border-neutral-700">
                    <tr>
                      <td colSpan={3} className="py-2 px-3 text-neutral-700 dark:text-neutral-300 uppercase text-[10px]">
                        Total Computed Fees ({tradeAction})
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-red-600 dark:text-red-400 text-xs">
                        {formatCurrency(tradeMath.totalFees, safeCurrency)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Add Custom Fee Form */}
              <form
                onSubmit={handleAddFee}
                className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg space-y-2.5"
              >
                <div className="font-bold text-neutral-800 text-[11px] flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Add Custom Fee or Regional Surcharge</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Fee Name (e.g. Stamp Duty)"
                      value={newFeeName}
                      onChange={(e) => setNewFeeName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-xs focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <select
                      value={newFeeType}
                      onChange={(e) => setNewFeeType(e.target.value as 'percent' | 'flat')}
                      className="w-full px-2 py-1.5 bg-white border border-neutral-300 rounded text-xs focus:outline-hidden"
                    >
                      <option value="percent">% of Gross</option>
                      <option value="flat">Flat Amount</option>
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="e.g. 0.1"
                      value={newFeeValue || ''}
                      onChange={(e) => setNewFeeValue(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded text-xs font-mono focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-500">Applies to:</span>
                    <select
                      value={newFeeAppliesTo}
                      onChange={(e) => setNewFeeAppliesTo(e.target.value as any)}
                      className="px-2 py-1 bg-white border border-neutral-300 rounded text-[11px]"
                    >
                      <option value="both">Both (Buy &amp; Sell)</option>
                      <option value="buy">Buy Orders Only</option>
                      <option value="sell">Sell Orders Only</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={!newFeeName.trim()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    Add Fee
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: DIVIDEND YIELD & ROI CALCULATOR ================= */}
      {activeTab === 'dividend' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Key Return Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-neutral-300 rounded-lg p-3.5 shadow-xs">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">
                Overall Share Cost
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-neutral-900 mt-1">
                {formatCurrency(dividendMath.overallShareCost, safeCurrency)}
              </div>
              <span className="text-[10px] text-neutral-400 block mt-0.5">
                {(divShares || 0).toLocaleString()} shares @ {formatCurrency(divStockPrice, safeCurrency)}
              </span>
            </div>

            <div className="bg-white border border-neutral-300 rounded-lg p-3.5 shadow-xs">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">
                Net Yearly Dividend
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-purple-700 mt-1">
                {formatCurrency(dividendMath.netYearlyDividend, safeCurrency)}
              </div>
              <span className="text-[10px] text-neutral-400 block mt-0.5">
                After {withholdingTaxPercent}% withholding tax
              </span>
            </div>

            <div className="bg-white border border-emerald-300 bg-emerald-50/20 rounded-lg p-3.5 shadow-xs">
              <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">
                True Dividend Yield
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700 mt-1">
                {dividendMath.trueYieldPercent.toFixed(2)}%
              </div>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                Gross Yield: {dividendMath.grossYieldPercent.toFixed(2)}%
              </span>
            </div>

            <div className="bg-white border border-neutral-300 rounded-lg p-3.5 shadow-xs">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">
                Years For 100% ROI
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-neutral-900 mt-1">
                {dividendMath.yearsForRoi > 0 ? `${dividendMath.yearsForRoi.toFixed(1)} yrs` : '—'}
              </div>
              <span className="text-[10px] text-neutral-400 block mt-0.5">
                Breakeven payback from dividends alone
              </span>
            </div>
          </div>

          {/* Input Controls & Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 bg-white border border-neutral-300 rounded-lg p-4 shadow-xs space-y-4 text-xs">
              <h2 className="font-bold text-neutral-800 uppercase tracking-wide text-xs pb-2 border-b border-neutral-200 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dividend Parameters</span>
              </h2>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Stock Price ({safeCurrency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={divStockPrice || ''}
                    placeholder="e.g. 150.00"
                    onChange={(e) => setDivStockPrice(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded text-xs font-mono font-bold focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Number of Shares</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={divShares || ''}
                    placeholder="e.g. 100"
                    onChange={(e) => setDivShares(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded text-xs font-mono font-bold focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Annual Base Dividend Per Share ({safeCurrency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={annualBaseDividend || ''}
                  placeholder="e.g. 1.20"
                  onChange={(e) => setAnnualBaseDividend(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded text-xs font-mono font-bold focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Payout Frequency</label>
                  <select
                    value={dividendFrequency}
                    onChange={(e) => setDividendFrequency(Number(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded text-xs focus:bg-white focus:outline-hidden"
                  >
                    <option value={1}>Annual (1x / yr)</option>
                    <option value={2}>Semi-Annual (2x / yr)</option>
                    <option value={4}>Quarterly (4x / yr)</option>
                    <option value={12}>Monthly (12x / yr)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Withholding Tax %
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={withholdingTaxPercent || ''}
                    placeholder="e.g. 10"
                    onChange={(e) => setWithholdingTaxPercent(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded text-xs font-mono focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>


            </div>

            {/* Dividend Payout Schedule Card (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-neutral-300 rounded-lg p-4 shadow-xs space-y-4 text-xs">
              <h2 className="font-bold text-neutral-800 uppercase tracking-wide text-xs pb-2 border-b border-neutral-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                <span>Estimated Dividend Cash Flow Breakdown</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <span className="text-[10px] text-neutral-500 uppercase block font-semibold">
                    Per Distribution Payout
                  </span>
                  <div className="text-base font-bold font-mono text-neutral-900 mt-1">
                    {formatCurrency(dividendMath.dividendPerPayout, safeCurrency)}
                  </div>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    {dividendFrequency === 4 ? 'Every quarter' : `${dividendFrequency}x per year`}
                  </span>
                </div>

                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <span className="text-[10px] text-neutral-500 uppercase block font-semibold">
                    Monthly Equivalent
                  </span>
                  <div className="text-base font-bold font-mono text-purple-700 mt-1">
                    {formatCurrency(dividendMath.netYearlyDividend / 12, safeCurrency)}
                  </div>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    Passive income / month
                  </span>
                </div>

                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <span className="text-[10px] text-neutral-500 uppercase block font-semibold">
                    Withholding Tax Deducted
                  </span>
                  <div className="text-base font-bold font-mono text-red-600 mt-1">
                    -{formatCurrency(dividendMath.taxDeduction, safeCurrency)}
                  </div>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    Annual government tax
                  </span>
                </div>
              </div>

              {/* Formula & Reference Note */}
              <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 text-neutral-600 space-y-2">
                <div className="font-bold text-neutral-800 text-[11px] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  <span>Formula Reference</span>
                </div>
                <div className="font-mono text-[10px] bg-white p-2 rounded border border-neutral-300 text-neutral-700 space-y-1">
                  <div>• Overall Cost = Shares × Stock Price</div>
                  <div>• Net Yearly Dividend = (Annual Base Dividend × Shares) × (1 - Tax%)</div>
                  <div>• True Yield = Net Yearly Dividend / Overall Cost</div>
                  <div>• Years for ROI = Overall Cost / Net Yearly Dividend</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: MULTI-YEAR COMPOUNDING ENGINE ================= */}
      {activeTab === 'compound' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Key Metrics Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white border border-neutral-300 rounded-lg p-3.5 shadow-xs">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">
                Initial Investment
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-neutral-900 mt-1">
                {formatCurrency(compoundCalculations.initialInvestment, safeCurrency)}
              </div>
              <span className="text-[10px] text-neutral-400 block mt-0.5">
                {(compoundShares || 0).toLocaleString()} shares @ {formatCurrency(compoundSharePrice, safeCurrency)}
              </span>
            </div>

            <div className="bg-white dark:bg-[#1e2324] border border-neutral-300 dark:border-neutral-700 rounded-lg p-3.5 shadow-xs">
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider block">
                Projected Value ({timeframeYears} Yrs)
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                {formatCurrency(compoundCalculations.finalPortfolioValue, safeCurrency)}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-300 font-semibold block mt-0.5">
                +{compoundCalculations.finalTotalReturnPercent.toFixed(1)}% total gain
              </span>
            </div>

            <div className="bg-white dark:bg-[#1e2324] border border-neutral-300 dark:border-neutral-700 rounded-lg p-3.5 shadow-xs">
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider block">
                Total Gain / Profit
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                +{formatCurrency(compoundCalculations.finalTotalReturn, safeCurrency)}
              </div>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-400 block mt-0.5">
                Growth + reinvested dividends
              </span>
            </div>

            <div className="bg-white dark:bg-[#1e2324] border border-neutral-300 dark:border-neutral-700 rounded-lg p-3.5 shadow-xs">
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider block">
                Year {timeframeYears} Annual Div
              </span>
              <div className="text-lg sm:text-xl font-bold font-mono text-purple-700 dark:text-purple-300 mt-1">
                {formatCurrency(compoundCalculations.finalAnnualDividend, safeCurrency)} / yr
              </div>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 block">
                {formatCurrency(compoundCalculations.finalAnnualDividend / 12, safeCurrency)} / mo
              </span>
            </div>
          </div>

          {/* Main Grid: Inputs vs Projection Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Interactive Input Form (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-neutral-300 rounded-lg p-4 shadow-xs space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <h2 className="font-bold text-neutral-800 uppercase tracking-wide text-xs flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-600" />
                  <span>Compounding Parameters</span>
                </h2>
                <span className="text-[10px] font-mono bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded font-bold">
                  {(compoundTicker || '').toUpperCase()}
                </span>
              </div>

              {/* Asset Ticker / Name */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Stock Ticker or Company Name
                </label>
                <input
                  type="text"
                  value={compoundTicker}
                  onChange={(e) => setCompoundTicker(e.target.value)}
                  placeholder="e.g. AAPL"
                  className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded text-xs font-semibold text-neutral-800 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Price & Shares */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Current Share Price ({safeCurrency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={compoundSharePrice || ''}
                    placeholder="e.g. 150.00"
                    onChange={(e) => setCompoundSharePrice(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded text-xs font-mono font-bold text-neutral-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Shares Owned
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={compoundShares || ''}
                    placeholder="e.g. 100"
                    onChange={(e) => setCompoundShares(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded text-xs font-mono font-bold text-neutral-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Yield & Growth Rates */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Annual Dividend Yield %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={compoundDividendYield || ''}
                    placeholder="e.g. 3.5"
                    onChange={(e) => setCompoundDividendYield(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded text-xs font-mono text-neutral-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">
                    Dividend Growth Rate % / yr
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={dividendGrowthRate || ''}
                    placeholder="e.g. 5"
                    onChange={(e) => setDividendGrowthRate(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded text-xs font-mono text-neutral-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Capital Appreciation Rate */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Expected Share Price Appreciation % / yr
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={expectedGrowthRate || ''}
                  placeholder="e.g. 8"
                  onChange={(e) => setExpectedGrowthRate(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded text-xs font-mono text-neutral-800 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Time Horizon Selection */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1.5">
                  Investment Time Horizon ({timeframeYears} Years)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {timeframePresets.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setTimeframeYears(yr)}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                        timeframeYears === yr
                          ? 'bg-neutral-900 text-white shadow-xs'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300'
                      }`}
                    >
                      {yr}Y
                    </button>
                  ))}
                </div>
              </div>

              {/* DRIP Reinvestment Toggle */}
              <div className="pt-2 border-t border-neutral-200">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reinvestDividends}
                    onChange={(e) => setReinvestDividends(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-neutral-800 block text-xs">
                      Reinvest Dividends (DRIP)
                    </span>
                    <span className="text-[10px] text-neutral-500 block">
                      Automatically buy more shares with dividend payouts to maximize compounding
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Right Column: Projected Returns Table & Breakdown (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-neutral-300 rounded-lg p-4 shadow-xs space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
                <h2 className="font-bold text-neutral-800 uppercase tracking-wide text-xs flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Projected Total Return Trajectory</span>
                </h2>
                <span className="text-[10px] text-neutral-400 font-mono">
                  CAGR: <b>{compoundCalculations.annualizedReturn.toFixed(2)}%</b>
                </span>
              </div>

              {/* Multi-Year Breakdown Table */}
              <div className="border border-neutral-300 rounded overflow-x-auto max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-[#2d3134] text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2 px-3">Year</th>
                      <th className="py-2 px-3">Share Price</th>
                      <th className="py-2 px-3 text-right">Shares Held</th>
                      <th className="py-2 px-3 text-right">Annual Div</th>
                      <th className="py-2 px-3 text-right">Portfolio Value ({safeCurrency})</th>
                      <th className="py-2 px-3 text-right">Return %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 font-mono text-[11px]">
                    {compoundCalculations.yearlyBreakdown.map((row) => (
                      <tr
                        key={row.year}
                        className={`hover:bg-emerald-50/50 dark:hover:bg-neutral-800 transition ${
                          row.year % 2 === 0 ? 'bg-neutral-50/40 dark:bg-[#16191b]' : 'bg-white dark:bg-[#1a1e20]'
                        }`}
                      >
                        <td className="py-2 px-3 font-bold text-neutral-800 dark:text-neutral-100">
                          Yr {row.year}
                        </td>
                        <td className="py-2 px-3 text-neutral-600 dark:text-neutral-300">
                          {formatCurrency(row.sharePrice, safeCurrency)}
                        </td>
                        <td className="py-2 px-3 text-right text-neutral-700 dark:text-neutral-200">
                          {Math.round(row.sharesCount).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-purple-700 dark:text-purple-300 font-bold">
                          +{formatCurrency(row.annualDividend, safeCurrency)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-neutral-900 dark:text-neutral-100">
                          {formatCurrency(row.portfolioValue, safeCurrency)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-bold ${
                            row.totalReturnPercent >= 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          +{row.totalReturnPercent.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Compound Insight Note */}
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-neutral-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-neutral-800 text-[11px]">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  <span>Compounding Mechanics Insight</span>
                </div>
                <p className="text-[10px] leading-relaxed">
                  By Year {timeframeYears}, your original <b>{(compoundShares || 0).toLocaleString()} shares</b> expand to approximately{' '}
                  <b>{Math.round(compoundCalculations.finalTotalShares).toLocaleString()} shares</b> through dividend reinvestment.
                  Your annual cash dividend yield on original invested capital jumps from{' '}
                  <b>{(compoundDividendYield || 0).toFixed(1)}%</b> to{' '}
                  <b>
                    {(
                      compoundCalculations.initialInvestment > 0
                        ? (compoundCalculations.finalAnnualDividend / compoundCalculations.initialInvestment) * 100
                        : 0
                    ).toFixed(1)}% Yield on Cost
                  </b>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const StockDividendCalculatorPage: React.FC<StockDividendCalculatorPageProps> = (props) => {
  return (
    <CalculatorErrorBoundary>
      <StockDividendCalculatorContent {...props} />
    </CalculatorErrorBoundary>
  );
};
