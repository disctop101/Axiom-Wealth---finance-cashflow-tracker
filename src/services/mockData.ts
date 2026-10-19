import {
  AssetItem,
  AssetTransaction,
  LiabilityItem,
  LiabilityPayment,
  TransactionItem,
  RecurringExpenseItem,
  CategoryBudget,
} from '../types/finance';

/**
 * Helper to produce an ISO date string offset from today by X days
 */
function getDateString(offsetDays: number, anchorDate: Date = new Date()): string {
  const d = new Date(anchorDate);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

export interface MockSeedData {
  transactions: TransactionItem[];
  assets: AssetItem[];
  assetTransactions: AssetTransaction[];
  liabilities: LiabilityItem[];
  liabilityPayments: LiabilityPayment[];
  recurringExpenses: RecurringExpenseItem[];
}

/**
 * Generates a comprehensive, realistic 90-day financial dataset
 * covering income, expenses, recurring bills, liabilities, and assets
 * (stocks, real estate, cash, business assets) with cost basis and performance values.
 */
export function generate90DayMockData(anchorDate: Date = new Date()): MockSeedData {
  const assets: AssetItem[] = [
    {
      id: 'mock-asset-cash-checking',
      name: 'High-Yield Checking & Liquid Reserve',
      category: 'Cash and cash equivalents',
      initialValue: 345000,
      institution: 'BDO Private Bank',
      notes: 'Primary liquid operational buffer and emergency funds',
      date: getDateString(-90, anchorDate),
      createdAt: getDateString(-90, anchorDate),
      updatedAt: getDateString(-1, anchorDate),
    },
    {
      id: 'mock-asset-stock-tech',
      name: 'Global Tech Growth Portfolio (NVDA / MSFT / AAPL)',
      category: 'Investment accounts',
      initialValue: 620000, // Invested capital basis
      institution: 'Interactive Brokers',
      stockCode: 'TECH-ETF',
      stockName: 'Global Semiconductor & AI Leaders',
      broker: 'Interactive Brokers',
      notes: 'Active equities portfolio. Cost basis ₱620,000, strong unrealized appreciation.',
      date: getDateString(-88, anchorDate),
      createdAt: getDateString(-88, anchorDate),
      updatedAt: getDateString(-2, anchorDate),
    },
    {
      id: 'mock-asset-stock-div',
      name: 'Blue Chip Dividend Aristocrats',
      category: 'Investment accounts',
      initialValue: 480000,
      institution: 'COL Financial',
      stockCode: 'DIV-PH',
      stockName: 'Top PSEi Dividend Payers',
      broker: 'COL Financial',
      notes: 'High-yield REITs and banking dividend aristocrats.',
      date: getDateString(-85, anchorDate),
      createdAt: getDateString(-85, anchorDate),
      updatedAt: getDateString(-3, anchorDate),
    },
    {
      id: 'mock-asset-re-condo',
      name: 'BGC High Street Premium Condo Unit',
      category: 'Real estate',
      initialValue: 3850000,
      institution: 'Ayala Land Premier',
      notes: '1-Bedroom rental property in Bonifacio Global City. Steady cashflow generation.',
      date: getDateString(-90, anchorDate),
      createdAt: getDateString(-90, anchorDate),
      updatedAt: getDateString(-1, anchorDate),
    },
    {
      id: 'mock-asset-biz-agency',
      name: 'Digital SaaS & Advisory Agency',
      category: 'Other assets',
      initialValue: 850000,
      institution: 'Axiom Labs Inc.',
      notes: 'Equity stake and operating capital in profitable digital consultancy.',
      date: getDateString(-80, anchorDate),
      createdAt: getDateString(-80, anchorDate),
      updatedAt: getDateString(-5, anchorDate),
    },
    {
      id: 'mock-asset-crypto',
      name: 'Cold Storage Digital Assets (BTC / ETH)',
      category: 'Investment accounts',
      initialValue: 310000,
      institution: 'Ledger Vault',
      notes: 'Long-term digital store of value and staking assets.',
      date: getDateString(-75, anchorDate),
      createdAt: getDateString(-75, anchorDate),
      updatedAt: getDateString(-4, anchorDate),
    },
    {
      id: 'mock-asset-vehicle',
      name: 'Hybrid Executive SUV',
      category: 'Vehicles',
      initialValue: 1450000,
      institution: 'Toyota Financial',
      notes: 'Personal & business transport asset with annual depreciation tracking.',
      date: getDateString(-90, anchorDate),
      createdAt: getDateString(-90, anchorDate),
      updatedAt: getDateString(-10, anchorDate),
    },
  ];

  const assetTransactions: AssetTransaction[] = [
    // Tech ETF Appreciation (+₱142,000 net gain over 90 days)
    {
      id: 'mock-atx-1',
      assetId: 'mock-asset-stock-tech',
      name: 'Q3 Valuation Gain & AI Rally',
      type: 'appreciation',
      amount: 86000,
      date: getDateString(-60, anchorDate),
      notes: 'Semiconductor sector rally surge',
      createdAt: getDateString(-60, anchorDate),
    },
    {
      id: 'mock-atx-2',
      assetId: 'mock-asset-stock-tech',
      name: 'Capital Reinvestment & Share Add',
      type: 'buy',
      amount: 45000,
      date: getDateString(-40, anchorDate),
      notes: 'Additional dollar-cost averaging into tech equities',
      createdAt: getDateString(-40, anchorDate),
    },
    {
      id: 'mock-atx-3',
      assetId: 'mock-asset-stock-tech',
      name: 'Month-End Equity Appreciation',
      type: 'appreciation',
      amount: 58000,
      date: getDateString(-12, anchorDate),
      notes: 'Strong earnings report upward mark-to-market adjustment',
      createdAt: getDateString(-12, anchorDate),
    },

    // Dividend Stocks (+₱38,000 cash dividend inflow / reinvestment)
    {
      id: 'mock-atx-4',
      assetId: 'mock-asset-stock-div',
      name: 'Quarterly REIT Dividend Payout',
      type: 'deposit',
      amount: 22500,
      date: getDateString(-50, anchorDate),
      notes: 'Cash dividend deposited into settlement account',
      createdAt: getDateString(-50, anchorDate),
    },
    {
      id: 'mock-atx-5',
      assetId: 'mock-asset-stock-div',
      name: 'Market Price Capital Growth',
      type: 'appreciation',
      amount: 24000,
      date: getDateString(-25, anchorDate),
      notes: 'Dividend aristocrat capital re-rating',
      createdAt: getDateString(-25, anchorDate),
    },

    // Real Estate (+₱220,000 appraisal growth)
    {
      id: 'mock-atx-6',
      assetId: 'mock-asset-re-condo',
      name: 'BGC Zonal Valuation Adjustment',
      type: 'appreciation',
      amount: 220000,
      date: getDateString(-45, anchorDate),
      notes: 'Annual city master appraisal revision for high street district',
      createdAt: getDateString(-45, anchorDate),
    },

    // Business Assets (+₱165,000 retained profits / appreciation)
    {
      id: 'mock-atx-7',
      assetId: 'mock-asset-biz-agency',
      name: 'Retained Enterprise Earnings Addition',
      type: 'appreciation',
      amount: 110000,
      date: getDateString(-55, anchorDate),
      notes: 'Q2 agency retained retained net earnings reinvested into valuation',
      createdAt: getDateString(-55, anchorDate),
    },
    {
      id: 'mock-atx-8',
      assetId: 'mock-asset-biz-agency',
      name: 'New Client Retainer Contract Growth',
      type: 'appreciation',
      amount: 55000,
      date: getDateString(-18, anchorDate),
      notes: 'SaaS recurring ARR multiple valuation expansion',
      createdAt: getDateString(-18, anchorDate),
    },

    // Crypto (+₱48,000 volatility appreciation)
    {
      id: 'mock-atx-9',
      assetId: 'mock-asset-crypto',
      name: 'Digital Assets Market Appreciation',
      type: 'appreciation',
      amount: 48000,
      date: getDateString(-30, anchorDate),
      notes: 'Mark-to-market crypto asset appreciation',
      createdAt: getDateString(-30, anchorDate),
    },

    // Vehicle Depreciation (-₱45,000)
    {
      id: 'mock-atx-10',
      assetId: 'mock-asset-vehicle',
      name: 'Quarterly Straight-Line Depreciation',
      type: 'depreciation',
      amount: 45000,
      date: getDateString(-15, anchorDate),
      notes: 'Automotive standard quarterly depreciation charge',
      createdAt: getDateString(-15, anchorDate),
    },
  ];

  const liabilities: LiabilityItem[] = [
    {
      id: 'mock-liab-mortgage',
      name: 'Condo Unit Prime Mortgage',
      category: 'Mortgage balance',
      initialAmount: 2200000,
      interestRate: 6.25,
      monthlyPayment: 26500,
      lender: 'BPI Family Bank',
      purpose: 'financed_purchase',
      date: getDateString(-90, anchorDate),
      notes: '15-Year fixed-rate residential condo mortgage amortizing monthly',
      createdAt: getDateString(-90, anchorDate),
      updatedAt: getDateString(-5, anchorDate),
    },
    {
      id: 'mock-liab-car',
      name: 'Auto Hybrid Financing Loan',
      category: 'Car loan',
      initialAmount: 680000,
      interestRate: 7.1,
      monthlyPayment: 18200,
      lender: 'Security Bank Auto Loans',
      purpose: 'financed_purchase',
      date: getDateString(-90, anchorDate),
      notes: '5-Year vehicle auto amortization program',
      createdAt: getDateString(-90, anchorDate),
      updatedAt: getDateString(-10, anchorDate),
    },
    {
      id: 'mock-liab-card',
      name: 'Platinum Corporate Rewards Card',
      category: 'Credit card balances',
      initialAmount: 48000,
      interestRate: 24.0,
      monthlyPayment: 48000,
      lender: 'Citibank / UnionBank',
      purpose: 'other',
      date: getDateString(-30, anchorDate),
      notes: 'Revolving credit paid in full monthly to avoid interest charges',
      createdAt: getDateString(-30, anchorDate),
      updatedAt: getDateString(-2, anchorDate),
    },
  ];

  const liabilityPayments: LiabilityPayment[] = [
    {
      id: 'mock-lpay-1',
      liabilityId: 'mock-liab-mortgage',
      amount: 26500,
      date: getDateString(-70, anchorDate),
      notes: 'Month 1 mortgage amortization principal & interest',
      createdAt: getDateString(-70, anchorDate),
    },
    {
      id: 'mock-lpay-2',
      liabilityId: 'mock-liab-mortgage',
      amount: 26500,
      date: getDateString(-40, anchorDate),
      notes: 'Month 2 mortgage amortization',
      createdAt: getDateString(-40, anchorDate),
    },
    {
      id: 'mock-lpay-3',
      liabilityId: 'mock-liab-mortgage',
      amount: 26500,
      date: getDateString(-10, anchorDate),
      notes: 'Month 3 mortgage amortization',
      createdAt: getDateString(-10, anchorDate),
    },
    {
      id: 'mock-lpay-4',
      liabilityId: 'mock-liab-car',
      amount: 18200,
      date: getDateString(-65, anchorDate),
      notes: 'Month 1 auto loan payment',
      createdAt: getDateString(-65, anchorDate),
    },
    {
      id: 'mock-lpay-5',
      liabilityId: 'mock-liab-car',
      amount: 18200,
      date: getDateString(-35, anchorDate),
      notes: 'Month 2 auto loan payment',
      createdAt: getDateString(-35, anchorDate),
    },
    {
      id: 'mock-lpay-6',
      liabilityId: 'mock-liab-car',
      amount: 18200,
      date: getDateString(-5, anchorDate),
      notes: 'Month 3 auto loan payment',
      createdAt: getDateString(-5, anchorDate),
    },
  ];

  const recurringExpenses: RecurringExpenseItem[] = [
    {
      id: 'mock-rec-fiber',
      name: 'High-Speed Enterprise Fiber Internet',
      category: 'Utilities',
      subCategory: 'fixed',
      amount: 3500,
      frequency: 'monthly',
      dayOfMonth: 15,
      notes: '1 Gbps dedicated business fiber link',
      paymentMethod: 'Bank Transfer',
      autoPay: true,
      lastPaidDate: getDateString(-34, anchorDate),
      lastPaidAmount: 3500,
      createdAt: getDateString(-90, anchorDate),
      updatedAt: getDateString(-2, anchorDate),
    },
    {
      id: 'mock-rec-cloud',
      name: 'Cloud Infrastructure & AI Servers',
      category: 'Real Estate/Business Expenses',
      subCategory: 'fixed',
      amount: 12500,
      frequency: 'monthly',
      dayOfMonth: 20,
      notes: 'Google Cloud Platform & OpenAI API hosting instances',
      paymentMethod: 'Card',
      autoPay: true,
      lastPaidDate: getDateString(-29, anchorDate),
      lastPaidAmount: 12500,
      createdAt: getDateString(-90, anchorDate),
      updatedAt: getDateString(-2, anchorDate),
    },
    {
      id: 'mock-rec-gym',
      name: 'Executive Wellness & Fitness Club',
      category: 'Personal Care',
      subCategory: 'fixed',
      amount: 4200,
      frequency: 'monthly',
      dayOfMonth: 5,
      notes: 'Gym and sauna membership',
      paymentMethod: 'Card',
      autoPay: true,
      lastPaidDate: getDateString(-13, anchorDate),
      lastPaidAmount: 4200,
      createdAt: getDateString(-90, anchorDate),
      updatedAt: getDateString(-1, anchorDate),
    },
    {
      id: 'mock-rec-insurance',
      name: 'Comprehensive Health & Critical Care Shield',
      category: 'Health Care',
      subCategory: 'fixed',
      amount: 8500,
      frequency: 'monthly',
      dayOfMonth: 28,
      notes: 'Maxicare / AIA Executive health coverage policy',
      paymentMethod: 'Bank Transfer',
      autoPay: true,
      lastPaidDate: getDateString(-21, anchorDate),
      lastPaidAmount: 8500,
      createdAt: getDateString(-90, anchorDate),
      updatedAt: getDateString(-1, anchorDate),
    },
    {
      id: 'mock-rec-condo-dues',
      name: 'BGC Condo HOA Building Dues',
      category: 'Housing',
      subCategory: 'fixed',
      amount: 6800,
      frequency: 'monthly',
      dayOfMonth: 10,
      notes: 'Ayala HOA maintenance, security, and amenities dues',
      paymentMethod: 'Bank Transfer',
      autoPay: false,
      lastPaidDate: getDateString(-8, anchorDate),
      lastPaidAmount: 6800,
      createdAt: getDateString(-90, anchorDate),
      updatedAt: getDateString(-1, anchorDate),
    },
  ];

  // Comprehensive 90-day transactions stream
  const transactions: TransactionItem[] = [];

  // Helper to add tx
  const addTx = (
    name: string,
    type: 'income' | 'expense',
    category: string,
    subCategory: any,
    amount: number,
    offsetDays: number,
    paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' = 'Bank Transfer',
    description: string = ''
  ) => {
    const dStr = getDateString(offsetDays, anchorDate);
    const parts = dStr.split('-');
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]);

    transactions.push({
      id: `mock-tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      type,
      category,
      subCategory,
      amount,
      date: dStr,
      month: m,
      year: y,
      paymentMethod,
      description: description || `${type === 'income' ? 'Received' : 'Paid'}: ${name}`,
      createdAt: dStr,
      updatedAt: dStr,
    });
  };

  // Generate 3 cycles of bi-monthly executive salaries over 90 days
  [-88, -73, -58, -43, -28, -13].forEach((offset, idx) => {
    addTx(
      'Senior Tech Lead Executive Compensation',
      'income',
      'Salary/Wages',
      'earned',
      145000,
      offset,
      'Bank Transfer',
      `Direct deposit payroll settlement cycle ${idx + 1}`
    );
  });

  // Generate monthly consulting retainers (passive/business)
  [-82, -52, -22].forEach((offset, idx) => {
    addTx(
      'Digital Advisory Retainer Revenue',
      'income',
      'Investments',
      'passive',
      65000,
      offset,
      'Bank Transfer',
      `Monthly consulting & advisory retainer milestone ${idx + 1}`
    );
  });

  // Generate monthly condo rental income
  [-80, -50, -20].forEach((offset, idx) => {
    addTx(
      'BGC Rental Property Tenant Rent Inflow',
      'income',
      'Real Estate/Business Investments',
      'passive',
      42000,
      offset,
      'Bank Transfer',
      `Gross rental income received from BGC condo tenant (Month ${idx + 1})`
    );
  });

  // Stock quarterly dividends
  [-50, -10].forEach((offset) => {
    addTx(
      'Dividend Aristocrat Yield Inflow',
      'income',
      'Interest/Dividends',
      'passive',
      18500,
      offset,
      'Bank Transfer',
      'COL Financial quarterly stock cash dividend release'
    );
  });

  // Bank high-yield deposit interest monthly
  [-75, -45, -15].forEach((offset, idx) => {
    addTx(
      'High-Yield Savings Compound Interest',
      'income',
      'Interest/Dividends',
      'passive',
      3250,
      offset,
      'Bank Transfer',
      `HYSA monthly interest accrual cycle ${idx + 1}`
    );
  });

  // Generate regular expenses distributed across the 90-day window:
  // 1. Food / Groceries & Dining (twice a week)
  for (let d = -89; d <= -1; d += 4) {
    const isSupermarket = d % 8 === 0;
    if (isSupermarket) {
      addTx(
        'S&R / Landmark Premium Groceries & Pantry',
        'expense',
        'Food',
        'variable',
        7800 + Math.floor(Math.random() * 1600),
        d,
        'Card',
        'Organic supplies, pantry staples, and household grocery batch'
      );
    } else {
      addTx(
        'Artisan Dining & Cafe Refreshments',
        'expense',
        'Food',
        'variable',
        1450 + Math.floor(Math.random() * 950),
        d,
        'Card',
        'Social dinners and specialty coffee work sessions'
      );
    }
  }

  // 2. Housing & Utilities monthly payments
  [-80, -50, -20].forEach((offset) => {
    addTx('Electricity & Water Bill (Meralco / Manila Water)', 'expense', 'Utilities', 'fixed', 9800, offset, 'Bank Transfer');
    addTx('BGC Fiber Internet & Smart Home', 'expense', 'Utilities', 'fixed', 3500, offset + 1, 'Card');
    addTx('HOA Building Maintenance & Security', 'expense', 'Housing', 'fixed', 6800, offset + 3, 'Bank Transfer');
  });

  // 3. Transportation & Fuel (weekly)
  for (let d = -86; d <= -2; d += 7) {
    addTx(
      'Shell V-Power Hybrid Fuel & Auto Tollway',
      'expense',
      'Transportation',
      'variable',
      3200 + Math.floor(Math.random() * 800),
      d,
      'Card',
      'Premium unleaded fuel and RFID tollway load'
    );
  }

  // 4. Healthcare & Insurance
  [-78, -48, -18].forEach((offset) => {
    addTx('AIA Critical Care & Executive Medical Plan', 'expense', 'Health Care', 'fixed', 8500, offset, 'Bank Transfer');
  });

  // 5. Personal Care & Wellness
  [-74, -44, -14].forEach((offset) => {
    addTx('Executive Gym Club & Physio Wellness', 'expense', 'Personal Care', 'fixed', 4200, offset, 'Card');
  });

  // 6. Entertainment & Subscriptions
  [-70, -40, -10].forEach((offset) => {
    addTx('Apple One, Netflix 4K & Media Streaming', 'expense', 'Entertainment', 'fixed', 1650, offset, 'Card');
  });
  [-62, -32, -2].forEach((offset) => {
    addTx('Weekend Golf & Cultural Concert Outing', 'expense', 'Entertainment', 'discretionary', 6500, offset, 'Card');
  });

  // 7. Business & SaaS Subscriptions
  [-68, -38, -8].forEach((offset) => {
    addTx('Enterprise Cloud Server Architecture & APIs', 'expense', 'Real Estate/Business Expenses', 'fixed', 12500, offset, 'Card');
  });

  // 8. Auto Loan and Mortgage Debt Service
  [-70, -40, -10].forEach((offset) => {
    addTx('Mortgage Principal & Interest Service', 'expense', 'Housing', 'fixed', 26500, offset, 'Bank Transfer');
  });
  [-65, -35, -5].forEach((offset) => {
    addTx('Hybrid Auto Amortization Debt Service', 'expense', 'Transportation', 'fixed', 18200, offset, 'Bank Transfer');
  });

  // Sort chronologically ascending to assign sequential entry numbers (TXN-0001, TXN-0002...)
  transactions.sort((a, b) => a.date.localeCompare(b.date));
  transactions.forEach((tx, idx) => {
    tx.entryNo = `TXN-${String(idx + 1).padStart(4, '0')}`;
  });

  // Assign sequential entry numbers to asset transactions
  assetTransactions.sort((a, b) => a.date.localeCompare(b.date));
  assetTransactions.forEach((atx, idx) => {
    atx.entryNo = `AST-${String(idx + 1).padStart(4, '0')}`;
  });

  // Sort chronologically descending for display default
  transactions.sort((a, b) => b.date.localeCompare(a.date));

  return {
    transactions,
    assets,
    assetTransactions,
    liabilities,
    liabilityPayments,
    recurringExpenses,
  };
}
