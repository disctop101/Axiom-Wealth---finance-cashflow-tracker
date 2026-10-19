import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  X,
  Printer,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  RefreshCw,
  Search,
  BookOpen,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  ShieldCheck,
  CheckCircle2,
  Scan,
  Coins,
  Bell,
  Settings as SettingsIcon,
  MousePointer,
  Eye,
  Scale,
  ArrowRight,
} from 'lucide-react';
import { AppNavTab } from './Navbar';
import { useTooltips } from '../context/TooltipContext';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: AppNavTab;
  userName?: string;
  onNavigateTab?: (tab: AppNavTab) => void;
}

interface PageGuideSection {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  activeTab = 'dashboard',
  userName,
  onNavigateTab,
}) => {
  const [selectedTab, setSelectedTab] = useState<AppNavTab>(activeTab);
  const { tooltipsEnabled, toggleTooltips } = useTooltips();

  useEffect(() => {
    if (isOpen) {
      setSelectedTab(activeTab);
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const PAGE_GUIDES: Record<
    AppNavTab,
    {
      title: string;
      subtitle: string;
      icon: React.ComponentType<{ className?: string }>;
      sections: PageGuideSection[];
    }
  > = {
    dashboard: {
      title: 'Financial Statements Dashboard',
      subtitle: 'Income Statement, Cash Flow, Balance Sheet & Period Visualizer',
      icon: Layers,
      sections: [
        {
          title: 'Personal Income & Cash Flow Statements',
          description:
            'Review classified inflows, operational outflows, and net cashflow. Click any row or category line item to open the interactive drilldown ledger and inspect underlying transactions.',
          icon: DollarSign,
        },
        {
          title: 'Period Visualizer & Category Colors',
          description:
            'Visualizes spending and wealth distribution against configured budgets. Custom category colors configured in Settings are mapped dynamically across Income, Expenses, Assets, and Liabilities.',
          icon: BarChart3,
        },
        {
          title: 'Time Window & Period Controls',
          description:
            'Use the Period controls (Start/End month or Year) or the global Time Window selector. Click "Current" to snap instantly to the active period, or toggle "All Dates" for cumulative history.',
          icon: Calendar,
        },
        {
          title: 'Publication-Grade Statement Printing',
          description:
            'Click "Print Statement" or press Ctrl+P / Cmd+P to produce an executive-ready, high-resolution document stripped of interactive controls and bulky guidance widgets.',
          icon: Printer,
        },
      ],
    },
    'income-expenses': {
      title: 'Income & Expenses Cashflow Dashboard',
      subtitle: 'Transaction Logging, Multi-Bounding Box OCR & Cashflow Trends',
      icon: DollarSign,
      sections: [
        {
          title: 'Log New Transaction Form',
          description:
            'Log Inflows and Outflows. Selecting "Income / Inflow" dynamically updates the field to "Deposit To", whereas "Expense" shows "Payment Method" (Cash, Card, Bank Transfer).',
          icon: DollarSign,
        },
        {
          title: 'Multi-Bounding Box OCR Receipt Scanner',
          description:
            'Upload a receipt or activate your webcam. Draw multiple individual bounding boxes over items on the document simultaneously to extract item names and corresponding prices for accurate line-item logging.',
          icon: Scan,
          badge: 'NEW PRO OCR',
        },
        {
          title: 'Logged Transactions Table Sorting',
          description:
            'Click column headers (Date, Transaction Name, Category, Type, Amount) to toggle ascending and descending sort orders across your entire ledger history.',
          icon: MousePointer,
        },
        {
          title: 'Synchronized Cash Flow Trend Line Chart',
          description:
            'Displays cumulative inflows, outflows, and net trajectory strictly synchronized with the global Time Window selector above.',
          icon: TrendingUp,
        },
      ],
    },
    analytics: {
      title: 'Analytics & Performance Benchmark',
      subtitle: 'Dual-Tab Trend Visualization & Asset Class Yield Ranking',
      icon: BarChart3,
      sections: [
        {
          title: 'Tab 1: Cash Flow Trends',
          description:
            'Interactive daily cashflow chart with dynamic multi-colored trend fills, KPI metric cards (Total Inflow, Outflow, Net Cashflow, Savings Rate %), and rolling 7-day velocity metrics.',
          icon: TrendingUp,
        },
        {
          title: 'Tab 2: Performance & Yield Benchmark',
          description:
            'Ranks capital deployment across asset classes. Sort categories by Invested Capital, Current Valuation, or Return % to immediately identify your top performers.',
          icon: Coins,
        },
        {
          title: 'Global Time Window Filtering',
          description:
            'Filter by Day, Week, Month, Year, All Time, or click "Current" to automatically snap to the present active timeframe.',
          icon: Calendar,
        },
      ],
    },
    wealth: {
      title: 'Personal Balance & Wealth Management',
      subtitle: 'Net Worth Calculation, Asset Distribution & Solvency',
      icon: Scale,
      sections: [
        {
          title: 'Time-Bound Balance Sheet',
          description:
            'Every asset and liability strictly adheres to its acquisition or origination date. Items acquired in future dates are automatically excluded when inspecting historical periods.',
          icon: Calendar,
        },
        {
          title: 'Solvency & Equity Ratio',
          description:
            'Computes your true Net Worth (Total Assets minus Total Liabilities) and monitors your liquid cash reserves against short-term debt.',
          icon: ShieldCheck,
        },
        {
          title: 'Asset Distribution',
          description:
            'Inspect allocation across Cash, Equities/Stocks, Retirement, Real Estate, Vehicles, and Other Assets.',
          icon: Layers,
        },
      ],
    },
    assets: {
      title: 'Asset Inventory & Stocks Ledger',
      subtitle: 'Portfolio Tracking, Stock Holdings Ledger & Cash Reconciliation',
      icon: TrendingUp,
      sections: [
        {
          title: 'Dedicated Stocks Portfolio Ledger',
          description:
            'When filtering by "Stocks", the table transforms into a dedicated portfolio ledger tracking: Ticker Symbol, Broker Name, Total Shares, Average Cost per Share, Total Fees & Taxes Paid, Current Market Price, Unrealised Gain/Loss ($ and %), and Total Dividends Collected.',
          icon: TrendingUp,
          badge: 'STOCKS LEDGER',
        },
        {
          title: 'Live Preview in Add/Edit Asset Modal',
          description:
            'Entering stock shares, avg cost, fees, and market price automatically calculates your total invested capital, current valuation, and unrealised P/L in real time before saving.',
          icon: Sparkles,
        },
        {
          title: 'Liquid Cash Balance Reconciliation',
          description:
            'Click "Adjust Balance" on Cash and Cash Equivalents to reconcile ledger cash against your physical wallet or real-world bank account with an automated balancing entry.',
          icon: Scale,
        },
        {
          title: 'Asset Transaction History & Auto-Valuation',
          description:
            'Click any asset row to view its complete ledger history of deposits, withdrawals, appreciation, and depreciation entries.',
          icon: RefreshCw,
        },
      ],
    },
    liabilities: {
      title: 'Liabilities & Debt Management',
      subtitle: 'Active Debt Tracking & Snowball / Avalanche Payoff Strategies',
      icon: CreditCard,
      sections: [
        {
          title: 'Active Liabilities Ledger',
          description:
            'Track mortgages, vehicle financing, personal loans, and credit card balances with original principal, current balance, interest rate, and monthly dues.',
          icon: CreditCard,
        },
        {
          title: 'Debt Payoff Strategies',
          description:
            'Compare Debt Snowball (prioritizing the lowest balance for psychological momentum) versus Debt Avalanche (prioritizing highest interest rates to minimize total interest paid).',
          icon: TrendingUp,
        },
        {
          title: 'Pay Down Debt Cross-Linking',
          description:
            'Click "Pay Down" to record a debt reduction payment. It automatically decrements the liability balance and can auto-log as an Expense in your cashflow ledger.',
          icon: DollarSign,
        },
      ],
    },
    'purchase-checker': {
      title: 'Buyer Checker & Affordability Utility',
      subtitle: 'The 10x Wealth Rule & Pre-Purchase Viability Assessment',
      icon: CheckCircle2,
      sections: [
        {
          title: 'The 10x Wealth Rule',
          description:
            'Evaluates purchases against your liquid reserves. Ensures that even after completing a discretionary purchase, you maintain at least a 10x buffer of productive capital.',
          icon: ShieldCheck,
        },
        {
          title: 'Verdict & Cash Flow Impact',
          description:
            'Provides real-time viability scoring (Safe, Caution, High Risk) with payback period and emergency reserve stress testing.',
          icon: BarChart3,
        },
        {
          title: 'Log as Active Transaction & Asset Button',
          description:
            'One-click action pushes the validated purchase directly into Logged Transactions as an Expense and simultaneously registers the acquired item in Asset Inventory.',
          icon: ArrowRight,
          badge: 'PIPELINE',
        },
      ],
    },
    'dividend-calculator': {
      title: 'Stock & Dividend Simulator',
      subtitle: 'Broker Fees, True Yield, Payback Years & DRIP Compounding',
      icon: Coins,
      sections: [
        {
          title: 'Tab 1: Stock Trade & Custom Fee Schedule',
          description:
            'Simulate BUY and SELL stock orders with granular fee breakdowns (broker commission, SEC fee, PSE/clearing fee, stamp duty, sales tax). Calculates net effective price per share.',
          icon: DollarSign,
        },
        {
          title: 'Tab 2: Dividend Yield & ROI Payback',
          description:
            'Calculates True Dividend Yield net of withholding taxes, estimated monthly passive income, and exact years to achieve 100% ROI payback from dividends alone.',
          icon: Coins,
        },
        {
          title: 'Tab 3: DRIP Compounding Engine',
          description:
            'Projects multi-year wealth accumulation with automatic dividend reinvestment (DRIP), price appreciation, and recurring contributions.',
          icon: TrendingUp,
        },
        {
          title: 'Log as Active Transaction & Asset Button',
          description:
            'Click "Log as Active Transaction & Asset" to record the executed trade into Logged Transactions and create a tracked Stock holding in Asset Inventory.',
          icon: ArrowRight,
          badge: 'PIPELINE',
        },
      ],
    },
    notifications: {
      title: 'Notifications & Alert Center',
      subtitle: 'Over-Budget Warnings, Bill Due Dates & Synchronized Alerts',
      icon: Bell,
      sections: [
        {
          title: 'Automated Budget Overrun Detection',
          description:
            'Monitors category spending against configured monthly budgets and fires instant alerts when spending approaches or exceeds targets.',
          icon: AlertCircle,
        },
        {
          title: 'Upcoming Bill Due Dates',
          description:
            'Tracks recurring expenses and upcoming liability due dates to prevent missed payments or late penalties.',
          icon: Calendar,
        },
        {
          title: 'Synchronized Review State',
          description:
            'Marking an alert as "Reviewed" instantly removes it from the top header bell dropdown and decrements the global unread badge counter.',
          icon: CheckCircle2,
        },
      ],
    },
    settings: {
      title: 'Settings & System Administration',
      subtitle: 'Tooltips Toggle, Two-Factor Authentication, Cloud Sync & Data Wipe',
      icon: SettingsIcon,
      sections: [
        {
          title: 'Master Toggle Tooltips Switch',
          description:
            'Toggle all platform tooltips and interactive hover guidance ON or OFF. Useful for experienced users who prefer a completely clean, distraction-free interface.',
          icon: Eye,
        },
        {
          title: 'Two-Factor Authentication (2FA TOTP)',
          description:
            'Protect your financial ledger using any standard TOTP Authenticator app (Google Authenticator, Authy, 1Password). Features automatic session renewal to prevent configuration deadlocks.',
          icon: ShieldCheck,
        },
        {
          title: 'Cloud Firestore Synchronization',
          description:
            'Enables seamless cross-device synchronization of assets, liabilities, transactions, and budgets with Firebase Cloud Firestore.',
          icon: RefreshCw,
        },
        {
          title: 'Master Password Protected Data Wipe',
          description:
            'Perform a full clean wipe of all ledger records, transactions, and asset accounts with master password verification.',
          icon: X,
        },
      ],
    },
  };

  const currentGuide = PAGE_GUIDES[selectedTab] || PAGE_GUIDES.dashboard;
  const GuideIcon = currentGuide.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-hidden"
    >
      <div className="bg-white border border-neutral-300 w-full max-w-full sm:max-w-3xl max-h-[94vh] flex flex-col shadow-2xl rounded-xl overflow-hidden animate-in zoom-in-95 duration-150 min-w-0">
        {/* Modal Header */}
        <div className="bg-[#212529] text-white px-3 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-700 shrink-0 min-w-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="p-1.5 sm:p-2 bg-emerald-950/90 border border-emerald-600/70 rounded-lg text-emerald-400 shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-xs sm:text-base font-bold tracking-wide truncate">
                  Help &amp; Operational Guide
                </h2>
                <span className="text-[10px] font-mono font-bold bg-neutral-800 text-neutral-300 px-1.5 sm:px-2 py-0.5 rounded border border-neutral-700 truncate">
                  {userName ? `${userName}'s Ledger` : 'Axiom Wealth'}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-neutral-400 font-mono hidden xs:block truncate">
                Comprehensive reference for page functions, workflows &amp; button behaviours
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
            {/* Quick Master Tooltip Toggle in Header */}
            <button
              type="button"
              onClick={toggleTooltips}
              className={`px-2 py-1 rounded text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                tooltipsEnabled
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600 hover:bg-emerald-900'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
              }`}
              title="Toggle interactive tooltips across all pages"
            >
              <MousePointer className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Tooltips: {tooltipsEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
              title="Close guide (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Page Selector Tabs Strip */}
        <div className="bg-[#2a2f32] px-2 sm:px-3 py-2 border-b border-neutral-700 flex items-center gap-1 overflow-x-auto w-full max-w-full shrink-0 select-none no-scrollbar">
          {(Object.keys(PAGE_GUIDES) as AppNavTab[]).map((tabKey) => {
            const isCurrent = selectedTab === tabKey;
            const TabIcon = PAGE_GUIDES[tabKey].icon;
            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => setSelectedTab(tabKey)}
                className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                  isCurrent
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-700/60'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span className="capitalize">{tabKey.replace('-', ' ')}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body: Active Page Guide */}
        <div className="p-5 overflow-y-auto space-y-4 text-neutral-800 text-xs sm:text-sm leading-relaxed flex-1">
          {/* Active Page Header Banner */}
          <div className="p-3.5 bg-neutral-900 text-white rounded-lg border border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-lg">
                <GuideIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white">{currentGuide.title}</h3>
                <p className="text-xs text-neutral-400">{currentGuide.subtitle}</p>
              </div>
            </div>

            {onNavigateTab && selectedTab !== activeTab && (
              <button
                type="button"
                onClick={() => {
                  onNavigateTab(selectedTab);
                  onClose();
                }}
                className="self-start sm:self-auto px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Navigate to this Page</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Section Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentGuide.sections.map((section, idx) => {
              const SecIcon = section.icon;
              return (
                <div
                  key={idx}
                  className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 hover:border-neutral-300 transition flex flex-col justify-between space-y-2"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white border border-neutral-300 rounded text-neutral-700 shadow-2xs">
                          <SecIcon className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h4 className="font-bold text-neutral-900 text-xs">{section.title}</h4>
                      </div>
                      {section.badge && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                          {section.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-600 text-[11px] leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Master Tooltip Information Banner */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <b>Interactive Hover Tooltips:</b> Hover over any metric card, chart element, or actionable button across the entire platform to view instant contextual explanations.
              </span>
            </div>
            <button
              type="button"
              onClick={toggleTooltips}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer self-start sm:self-auto shrink-0 ${
                tooltipsEnabled
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
              }`}
            >
              {tooltipsEnabled ? 'Tooltips Enabled ✓' : 'Tooltips Disabled (Click to Enable)'}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-neutral-100 px-5 py-3 border-t border-neutral-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-mono">
            <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
            <span>Axiom Wealth Standard Operating Guidance</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded text-xs transition shadow-xs cursor-pointer"
          >
            Got it, Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
