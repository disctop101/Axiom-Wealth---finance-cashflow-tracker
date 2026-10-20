import React from 'react';
import {
  Layers,
  DollarSign,
  BarChart3,
  Calendar,
  Printer,
  Scan,
  MousePointer,
  TrendingUp,
  Coins,
  Scale,
  ShieldCheck,
  CreditCard,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Bell,
  CheckCircle2,
  AlertCircle,
  Settings as SettingsIcon,
  Eye,
  Palette,
  X,
} from 'lucide-react';
import { AppNavTab } from './Navbar';

export interface PageGuideSection {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export interface PageGuideDefinition {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  sections: PageGuideSection[];
}

export const PAGE_GUIDES: Record<AppNavTab, PageGuideDefinition> = {
  dashboard: {
    title: 'Financial Statements',
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
    title: 'Income & Expenses Cashflow',
    subtitle: 'Transaction Logging, Freehand Highlighter OCR & Cashflow Trends',
    icon: DollarSign,
    sections: [
      {
        title: 'Log New Transaction Form',
        description:
          'Log Inflows and Outflows. Selecting "Income / Inflow" dynamically updates the field to "Deposit To", whereas "Expense" shows "Payment Method" (Cash, Card, Bank Transfer).',
        icon: DollarSign,
      },
      {
        title: 'Freehand Highlighter OCR Receipt Scanner',
        description:
          'Upload a receipt or activate your webcam. Paint freehand highlighter strokes over text rows to selectively isolate item names and prices for precision line-item logging.',
        icon: Scan,
        badge: 'PRO HIGHLIGHTER',
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
    title: 'Buyer Checker & Affordability',
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
  'stock-dividend-calculator': {
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
          'On Tab 1 (Stock Trade & Fees), click "Log as Active Transaction & Asset" to record the executed trade into Logged Transactions and create a tracked Stock holding in Asset Inventory.',
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
    title: 'Settings & Administration',
    subtitle: 'Tooltips Toggle, Global Category Styling, Cloud Sync & Data Operations',
    icon: SettingsIcon,
    sections: [
      {
        title: 'Master Toggle Tooltips Switch',
        description:
          'Toggle all platform tooltips and interactive hover guidance ON or OFF. Useful for experienced users who prefer a completely clean, distraction-free interface.',
        icon: Eye,
      },
      {
        title: 'Custom Category Styling & Colors',
        description:
          'Assign customized brand and category colors that seamlessly propagate to all interactive Donut charts, Bar graphs, Period Visualizers, and Ledger tags.',
        icon: Palette,
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
