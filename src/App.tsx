import { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  testConnection,
  getAccessToken,
  isMagicLink,
  completeMagicLinkSignIn,
} from './firebase';
import {
  AssetItem,
  LiabilityItem,
  PeriodSettings,
  TransactionItem,
  CategoryBudget,
  AssetTransaction,
  LiabilityPayment,
  CurrencyConfig,
  RecurringExpenseItem,
  PaymentMethodType,
  DEFAULT_ASSETS,
  DEFAULT_LIABILITIES,
  DEFAULT_TRANSACTIONS,
  DEFAULT_PERIOD,
  MONTH_NAMES,
  DEFAULT_BUDGETS,
  DEFAULT_ASSET_TRANSACTIONS,
  DEFAULT_LIABILITY_PAYMENTS,
  DEFAULT_CURRENCY,
  DEFAULT_RECURRING_EXPENSES,
  TransactionType,
  IncomeClassification,
  ExpenseClassification,
} from './types/finance';
import {
  loadLocalAssets,
  saveLocalAssets,
  loadLocalLiabilities,
  saveLocalLiabilities,
  loadLocalTransactions,
  saveLocalTransactions,
  loadLocalPeriod,
  saveLocalPeriod,
  loadLocalBudgets,
  saveLocalBudgets,
  loadLocalAssetTransactions,
  saveLocalAssetTransactions,
  loadLocalLiabilityPayments,
  saveLocalLiabilityPayments,
  loadLocalCurrency,
  saveLocalCurrency,
  loadLocalUserName,
  saveLocalUserName,
  loadLocalRecurringExpenses,
  saveLocalRecurringExpenses,
  syncUserDataToFirestore,
  subscribeToUserAssets,
  subscribeToUserLiabilities,
  saveAssetItemToCloud,
  deleteAssetItemFromCloud,
  saveLiabilityItemToCloud,
  deleteLiabilityItemFromCloud,
  saveTransactionItemToCloud,
  deleteTransactionItemFromCloud,
  wipeAllTransactionsFromStorageAndCloud,
  wipeAllDataToPureZero,
  runOneTimeTestDataPurge,
} from './services/storage';
import { generate90DayMockData } from './services/mockData';
import { Navbar, AppNavTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { IncomeExpensesPage } from './components/IncomeExpensesPage';
import { WealthPage } from './components/WealthPage';
import { AssetsPage } from './components/AssetsPage';
import { LiabilitiesPage } from './components/LiabilitiesPage';
import { SettingsPage } from './components/SettingsPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { PurchaseCheckerPage } from './components/PurchaseCheckerPage';
import { StockDividendCalculatorPage } from './components/StockDividendCalculatorPage';
import { NotificationsPage } from './components/NotificationsPage';
import { GrowthCheckpointModal, GrowthCheckpointTrigger } from './components/GrowthCheckpointModal';
import { ExportSheetsModal } from './components/ExportSheetsModal';
import { CategoryDetailModal } from './components/CategoryDetailModal';
import { HelpModal } from './components/HelpModal';
import { ContextualGuideModal } from './components/ContextualGuideModal';
import { AuthModal } from './components/AuthModal';
import { QuickLogModal } from './components/QuickLogModal';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { MobileNavDrawer } from './components/MobileNavDrawer';
import {
  computeUserAccess,
  getPreviewAsCustomer,
  setPreviewAsCustomer,
  getLocalSubscriptionStatus,
  setLocalSubscriptionStatus,
  activateFreeTrial,
  SubscriptionPlanType,
} from './services/subscription';
import {
  Eye,
  LayoutDashboard,
  ReceiptText,
  ArrowDownUp,
  Scale,
  Menu,
  PlusCircle,
  Layers,
  Target,
  BarChart2,
  Wallet,
  CreditCard,
  PieChart,
  Settings,
  UserCheck,
  Sliders,
  Sparkles,
  Repeat,
  Shield,
  Calculator,
} from 'lucide-react';

// Purge any previously injected 90-day test data or mock fixtures on app load
runOneTimeTestDataPurge();

export default function App() {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<AppNavTab>('dashboard');

  // Subscription, Admin Bypass & Growth Checkpoint State
  const [previewAsCustomer, setPreviewAsCustomerState] = useState<boolean>(getPreviewAsCustomer);
  const [subscriptionState, setSubscriptionState] = useState(getLocalSubscriptionStatus);
  const [isGrowthCheckpointOpen, setIsGrowthCheckpointOpen] = useState(false);
  const [growthCheckpointTrigger, setGrowthCheckpointTrigger] = useState<GrowthCheckpointTrigger>('general');

  const handleOpenGrowthCheckpoint = (
    trigger: GrowthCheckpointTrigger = 'general'
  ) => {
    setGrowthCheckpointTrigger(trigger);
    setIsGrowthCheckpointOpen(true);
  };

  // 15-Day Trial Live Refresh Listener
  const [trialRevision, setTrialRevision] = useState(0);

  useEffect(() => {
    const handleTrialChange = () => {
      setTrialRevision((r) => r + 1);
      setSubscriptionState(getLocalSubscriptionStatus());
    };
    window.addEventListener('axiom_trial_change', handleTrialChange);
    return () => window.removeEventListener('axiom_trial_change', handleTrialChange);
  }, []);

  // Auth & Token State
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // User Access & Subscription Status computation
  const userAccess = useMemo(
    () => computeUserAccess(user, previewAsCustomer),
    [user, previewAsCustomer, subscriptionState, trialRevision]
  );

  // Auto-trigger Growth Checkpoint modal if an Essential tier user attempts to open an Apex-locked tool
  useEffect(() => {
    if (
      !userAccess.hasApexAccess &&
      (activeTab === 'purchase-checker' ||
        activeTab === 'stock-dividend-calculator' ||
        activeTab === 'analytics')
    ) {
      handleOpenGrowthCheckpoint(
        activeTab === 'purchase-checker'
          ? 'purchase_checker'
          : activeTab === 'stock-dividend-calculator'
          ? 'stock_calculator'
          : 'analytics'
      );
    }
  }, [activeTab, userAccess.hasApexAccess]);

  // Context-aware mobile sub-tabs per main page
  const [dashboardSubTab, setDashboardSubTab] = useState<'dashboard' | 'income' | 'cashflow' | 'balancesheet'>('dashboard');
  const [incomeExpensesSubTab, setIncomeExpensesSubTab] = useState<
    'entry' | 'transactions' | 'budgets' | 'recurring' | 'analytics'
  >('entry');
  const [wealthSubTab, setWealthSubTab] = useState<'assets' | 'liabilities' | 'summary'>('assets');

  // Mobile drawer menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Central Quick Log modal state
  const [isQuickLogModalOpen, setIsQuickLogModalOpen] = useState(false);

  // Global Currency State
  const [currency, setCurrency] = useState<CurrencyConfig>(loadLocalCurrency);

  // Personalization: User Name State
  const [userName, setUserName] = useState<string>(loadLocalUserName);

  // Distraction-free statement view: Top navigation bar hide toggle
  const [isNavHidden, setIsNavHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem('finance_nav_hidden') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleNav = () => {
    setIsNavHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('finance_nav_hidden', String(next));
      } catch {}
      return next;
    });
  };

  // App Data State
  const [period, setPeriod] = useState<PeriodSettings>(loadLocalPeriod);
  const [assets, setAssets] = useState<AssetItem[]>(loadLocalAssets);
  const [assetTransactions, setAssetTransactions] = useState<AssetTransaction[]>(
    loadLocalAssetTransactions
  );
  const [liabilities, setLiabilities] = useState<LiabilityItem[]>(loadLocalLiabilities);
  const [liabilityPayments, setLiabilityPayments] = useState<LiabilityPayment[]>(
    loadLocalLiabilityPayments
  );
  const [transactions, setTransactions] = useState<TransactionItem[]>(loadLocalTransactions);
  const [budgets, setBudgets] = useState<CategoryBudget[]>(loadLocalBudgets);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpenseItem[]>(loadLocalRecurringExpenses);

  // Modals state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMasterHelpOpen, setIsMasterHelpOpen] = useState(false);
  const [contextualGuideTab, setContextualGuideTab] = useState<AppNavTab | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleOpenMasterHelp = useCallback(() => {
    setIsMasterHelpOpen(true);
  }, []);

  const handleOpenContextualGuide = useCallback((tab?: AppNavTab) => {
    setContextualGuideTab(tab || activeTab);
  }, [activeTab]);

  // Interactive Category Drill-Down Modal state
  const [categoryDetailModal, setCategoryDetailModal] = useState<{
    isOpen: boolean;
    category: string;
    type: 'income' | 'expense';
  }>({
    isOpen: false,
    category: 'Salary/Wages',
    type: 'income',
  });

  // Test Firestore connectivity on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Check for Magic Link passwordless sign-in on boot
  useEffect(() => {
    if (isMagicLink()) {
      completeMagicLinkSignIn()
        .then((authUser) => {
          if (authUser) {
            setUser(authUser);
            console.log('Successfully completed passwordless magic link sign-in:', authUser.email);
          }
        })
        .catch((err) => {
          console.error('Magic link sign-in error:', err);
        });
    }
  }, []);

  // Listen to Auth state changes
  useEffect(() => {
    const unsubscribe = initAuth(
      async (authUser, token) => {
        setUser(authUser);
        setAuthInitialized(true);
        if (token) {
          setAccessToken(token);
        } else {
          const cached = await getAccessToken();
          setAccessToken(cached);
        }

        const access = computeUserAccess(authUser, previewAsCustomer);
        if (authUser && access.hasApexAccess) {
          setIsSyncing(true);
          try {
            await syncUserDataToFirestore(
              authUser.uid,
              authUser.email || '',
              authUser.displayName || '',
              assets,
              liabilities,
              transactions,
              period
            );
          } catch (e) {
            console.error('Initial sync error:', e);
          } finally {
            setIsSyncing(false);
          }
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setAuthInitialized(true);
      }
    );

    return () => unsubscribe();
  }, [assets, liabilities, transactions, period, previewAsCustomer]);

  // Subscribe to real-time Firestore updates if user is authenticated AND on Apex tier
  useEffect(() => {
    if (!user || !userAccess.hasApexAccess) return;

    const unsubAssets = subscribeToUserAssets(
      user.uid,
      (updatedAssets) => setAssets(updatedAssets),
      (err) => console.error('Assets sync error:', err)
    );

    const unsubLiabilities = subscribeToUserLiabilities(
      user.uid,
      (updatedLiabs) => setLiabilities(updatedLiabs),
      (err) => console.error('Liabilities sync error:', err)
    );

    return () => {
      unsubAssets();
      unsubLiabilities();
    };
  }, [user, userAccess.hasApexAccess]);

  // Save to Local Storage on updates
  useEffect(() => {
    saveLocalAssets(assets);
  }, [assets]);

  useEffect(() => {
    saveLocalAssetTransactions(assetTransactions);
  }, [assetTransactions]);

  useEffect(() => {
    saveLocalLiabilities(liabilities);
  }, [liabilities]);

  useEffect(() => {
    saveLocalLiabilityPayments(liabilityPayments);
  }, [liabilityPayments]);

  useEffect(() => {
    saveLocalTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    saveLocalBudgets(budgets);
  }, [budgets]);

  useEffect(() => {
    saveLocalPeriod(period);
  }, [period]);

  useEffect(() => {
    saveLocalCurrency(currency);
  }, [currency]);

  useEffect(() => {
    saveLocalRecurringExpenses(recurringExpenses);
  }, [recurringExpenses]);

  // Handle Google Sign In
  const handleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  // Handle Logout
  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  // Dynamic Totals calculation
  const computedTotals = useMemo(() => {
    const isDateInPeriod = (dateStr?: string) => {
      if (!dateStr) return true;
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

    const periodTransactions = transactions.filter((t) => isDateInPeriod(t.date));

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

    const totalEarned = getIncomeAmount('Salary/Wages');
    const totalPassive =
      getIncomeAmount('Interest/Dividends') +
      getIncomeAmount('Investments') +
      getIncomeAmount('Real Estate/Business Investments');
    const totalOtherIncome =
      getIncomeAmount('Account Payables') +
      getIncomeAmount('Account Receivables') +
      getIncomeAmount('Bank Transaction') +
      getIncomeAmount('Savings');
    const totalIncome = totalEarned + totalPassive + totalOtherIncome;

    const totalFixedExpenses =
      getExpenseAmount('Housing') +
      getExpenseAmount('Investments') +
      getExpenseAmount('Utilities') +
      getExpenseAmount('Food') +
      getExpenseAmount('Health Care') +
      getExpenseAmount('Personal Care');

    const totalVariableExpenses =
      getExpenseAmount('Entertainment') +
      getExpenseAmount('Transportation') +
      getExpenseAmount('Account Payables') +
      getExpenseAmount('Account Receivables') +
      getExpenseAmount('Bank Transaction') +
      getExpenseAmount('Miscellaneous') +
      getExpenseAmount('Real Estate/Business Investments') +
      getExpenseAmount('Real Estate/Business Expenses') +
      getExpenseAmount('Savings');

    const totalExpenses = totalFixedExpenses + totalVariableExpenses;
    const netIncome = totalIncome - totalExpenses;
    const endingBalance = period.beginningBalance + netIncome;

    const totalInflows = totalIncome;
    const totalOutflows = totalExpenses;
    const netCashFlow = totalInflows - totalOutflows;

    // Auto-computed Assets sum
    const totalAssets = assets.reduce((sum, a) => {
      const txs = assetTransactions.filter((t) => t.assetId === a.id);
      const netTxs = txs.reduce((s, t) => {
        return t.type === 'buy' || t.type === 'deposit' || t.type === 'appreciation'
          ? s + t.amount
          : s - t.amount;
      }, 0);
      return sum + Math.max(0, a.initialValue + netTxs);
    }, 0);

    // Auto-computed Liabilities sum (deducting payments)
    const totalLiabilities = liabilities.reduce((sum, l) => {
      const pays = liabilityPayments.filter((p) => p.liabilityId === l.id);
      const totalPaid = pays.reduce((s, p) => s + p.amount, 0);
      return sum + Math.max(0, l.initialAmount - totalPaid);
    }, 0);

    const netWorth = totalAssets - totalLiabilities;

    return {
      totalEarned,
      totalPassive,
      totalOtherIncome,
      totalIncome,
      totalFixedExpenses,
      totalVariableExpenses,
      totalExpenses,
      netIncome,
      endingBalance,
      totalInflows,
      totalOutflows,
      netCashFlow,
      totalAssets,
      totalLiabilities,
      netWorth,
    };
  }, [transactions, assets, assetTransactions, liabilities, liabilityPayments, period]);

  // Asset Actions with Cross-Linked Ledger Automations
  const handleAddAsset = async (
    newAsset: Omit<AssetItem, 'id' | 'createdAt' | 'updatedAt'>,
    autoLedger?: { enabled: boolean; type: 'expense' | 'income'; category: string }
  ) => {
    const item: AssetItem = {
      ...newAsset,
      id: `ast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAssets((prev) => [item, ...prev]);

    // Cross-linked ledger automation: Acquiring a new asset that costs money must automatically log as an Expense
    if (autoLedger?.enabled !== false && item.initialValue > 0) {
      const defaultExpenseCat =
        item.category === 'Real estate'
          ? 'Real Estate/Business Investments'
          : item.category === 'Vehicles'
          ? 'Transportation'
          : 'Investments';

      const nextTxSeq = transactions.length + 1;
      const crossTx: TransactionItem = {
        id: `tx-cross-ast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        entryNo: `TXN-${String(nextTxSeq).padStart(4, '0')}`,
        name: `Acquisition: ${item.name}`,
        type: autoLedger?.type || 'expense',
        category: autoLedger?.category || defaultExpenseCat,
        subCategory: autoLedger?.type === 'income' ? 'passive' : 'fixed',
        description: `Auto-generated from wealth asset creation (${item.category}${item.stockCode ? ` · ${item.stockCode}` : ''})`,
        amount: item.initialValue,
        date: item.date, // Exact date syncing
        month: parseInt(item.date.split('-')[1]) || 1,
        year: parseInt(item.date.split('-')[0]) || 2024,
        linkedAssetId: item.id,
        autoGenerated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setTransactions((prev) => [crossTx, ...prev]);
      if (user && userAccess.hasApexAccess) {
        await saveTransactionItemToCloud(user.uid, crossTx);
      }
    }

    if (user && userAccess.hasApexAccess) {
      await saveAssetItemToCloud(user.uid, item);
    }
  };

  const handleUpdateAsset = async (updated: AssetItem) => {
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

    if (user && userAccess.hasApexAccess) {
      await saveAssetItemToCloud(user.uid, updated);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
    setAssetTransactions((prev) => prev.filter((t) => t.assetId !== assetId));
    setTransactions((prev) => prev.filter((t) => t.linkedAssetId !== assetId));

    if (user && userAccess.hasApexAccess) {
      await deleteAssetItemFromCloud(user.uid, assetId);
    }
  };

  // Pipeline: Push directly into Logged Transactions and Asset Inventory
  const handleLogActiveTransactionAndAsset = async (data: {
    transaction: {
      name: string;
      amount: number;
      date: string;
      type: 'expense' | 'income';
      category: string;
      description?: string;
      paymentMethod?: PaymentMethodType;
    };
    asset: Omit<AssetItem, 'id' | 'createdAt' | 'updatedAt'>;
  }) => {
    // 1. Create asset
    const newAsset: AssetItem = {
      ...data.asset,
      id: `ast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAssets((prev) => [newAsset, ...prev]);

    // 2. Create transaction cross-linked to this asset
    const nextTxSeq = transactions.length + 1;
    const newTx: TransactionItem = {
      id: `tx-pipeline-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      entryNo: `TXN-${String(nextTxSeq).padStart(4, '0')}`,
      name: data.transaction.name,
      type: data.transaction.type,
      category: data.transaction.category,
      subCategory: data.transaction.type === 'income' ? 'passive' : 'fixed',
      description: data.transaction.description || `Pipeline logged (${data.asset.category})`,
      amount: data.transaction.amount,
      date: data.transaction.date,
      month: parseInt(data.transaction.date.split('-')[1]) || 1,
      year: parseInt(data.transaction.date.split('-')[0]) || 2024,
      paymentMethod: data.transaction.paymentMethod || 'Bank Transfer',
      linkedAssetId: newAsset.id,
      autoGenerated: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);

    if (user && userAccess.hasApexAccess) {
      await saveAssetItemToCloud(user.uid, newAsset);
      await saveTransactionItemToCloud(user.uid, newTx);
    }

    return { asset: newAsset, transaction: newTx };
  };

  const handleAddAssetTransaction = async (
    data: Omit<AssetTransaction, 'id' | 'createdAt'>,
    autoLedger?: { enabled: boolean; type: 'expense' | 'income'; category: string }
  ) => {
    const nextAstSeq = assetTransactions.length + 1;
    const astEntryNo = `AST-${String(nextAstSeq).padStart(4, '0')}`;

    const newTx: AssetTransaction = {
      ...data,
      id: `atx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      entryNo: astEntryNo,
      createdAt: new Date().toISOString(),
    };
    setAssetTransactions((prev) => [newTx, ...prev]);

    // Cross-linked ledger automation:
    // Earning from an asset, such as business revenue or stock dividends -> must log as Income
    // Buying an asset -> must log as Expense
    if (autoLedger?.enabled !== false && newTx.amount > 0) {
      const parentAsset = assets.find((a) => a.id === newTx.assetId);
      const isIncome = autoLedger?.type === 'income' || newTx.type === 'deposit' || newTx.type === 'sell';
      const nextTxSeq = transactions.length + 1;

      const crossTx: TransactionItem = {
        id: `tx-cross-atx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        entryNo: `TXN-${String(nextTxSeq).padStart(4, '0')}`,
        name: `${newTx.name} (${parentAsset?.name || 'Asset'})`,
        type: isIncome ? 'income' : 'expense',
        category:
          autoLedger?.category ||
          (isIncome
            ? newTx.type === 'deposit'
              ? 'Interest/Dividends'
              : 'Investments'
            : 'Investments'),
        subCategory: isIncome ? 'passive' : 'variable',
        description: newTx.notes || `Wealth activity: ${newTx.type} on ${parentAsset?.name || 'Asset'}`,
        amount: newTx.amount,
        date: newTx.date, // Exact date syncing
        month: parseInt(newTx.date.split('-')[1]) || 1,
        year: parseInt(newTx.date.split('-')[0]) || 2024,
        linkedAssetId: newTx.assetId,
        autoGenerated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setTransactions((prev) => [crossTx, ...prev]);
      if (user && userAccess.hasApexAccess) {
        await saveTransactionItemToCloud(user.uid, crossTx);
      }
    }
  };

  const handleDeleteAssetTransaction = (txId: string) => {
    setAssetTransactions((prev) => prev.filter((t) => t.id !== txId));
  };

  // Liability Actions with Cross-Linked Ledger Automations
  const handleAddLiability = async (
    newLiab: Omit<LiabilityItem, 'id' | 'createdAt' | 'updatedAt'>,
    autoLedger?: { enabled: boolean; type: 'expense' | 'income'; category: string }
  ) => {
    const item: LiabilityItem = {
      ...newLiab,
      id: `liab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLiabilities((prev) => [item, ...prev]);

    // Cross-linked ledger automation:
    // Taking on a new liability, like a cash loan -> register as Income since it is a cash inflow
    // Using a liability to buy something, like purchasing a car via financing -> log purchase as an Expense
    if (autoLedger?.enabled !== false && item.initialAmount > 0) {
      const isCashLoan = item.purpose === 'cash_loan' || autoLedger?.type === 'income';

      let defaultCat = 'Account Payables';
      if (isCashLoan) {
        defaultCat = 'Bank Transaction';
      } else {
        if (item.category === 'Car loan') defaultCat = 'Transportation';
        else if (item.category === 'Mortgage balance') defaultCat = 'Housing';
        else defaultCat = 'Account Payables';
      }

      const nextTxSeq = transactions.length + 1;
      const crossTx: TransactionItem = {
        id: `tx-cross-liab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        entryNo: `TXN-${String(nextTxSeq).padStart(4, '0')}`,
        name: isCashLoan ? `Cash Loan Inflow: ${item.name}` : `Financed Purchase: ${item.name}`,
        type: isCashLoan ? 'income' : 'expense',
        category: autoLedger?.category || defaultCat,
        subCategory: isCashLoan ? 'other' : 'fixed',
        description: `Auto-generated from liability creation (${item.category} · ${isCashLoan ? 'Cash loan inflow' : 'Financed purchase'})`,
        amount: item.initialAmount,
        date: item.date, // Exact date syncing
        month: parseInt(item.date.split('-')[1]) || 1,
        year: parseInt(item.date.split('-')[0]) || 2024,
        linkedLiabilityId: item.id,
        autoGenerated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setTransactions((prev) => [crossTx, ...prev]);
      if (user && userAccess.hasApexAccess) {
        await saveTransactionItemToCloud(user.uid, crossTx);
      }
    }

    if (user && userAccess.hasApexAccess) {
      await saveLiabilityItemToCloud(user.uid, item);
    }
  };

  const handleUpdateLiability = async (updated: LiabilityItem) => {
    setLiabilities((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));

    if (user && userAccess.hasApexAccess) {
      await saveLiabilityItemToCloud(user.uid, updated);
    }
  };

  const handleDeleteLiability = async (liabilityId: string) => {
    setLiabilities((prev) => prev.filter((l) => l.id !== liabilityId));
    setLiabilityPayments((prev) => prev.filter((p) => p.liabilityId !== liabilityId));
    setTransactions((prev) => prev.filter((t) => t.linkedLiabilityId !== liabilityId));

    if (user && userAccess.hasApexAccess) {
      await deleteLiabilityItemFromCloud(user.uid, liabilityId);
    }
  };

  const handleAddLiabilityPayment = async (
    data: Omit<LiabilityPayment, 'id' | 'createdAt'>,
    autoLedger?: { enabled: boolean; category: string }
  ) => {
    const nextPaySeq = liabilityPayments.length + 1;
    const newPayment: LiabilityPayment = {
      ...data,
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      entryNo: `PAY-${String(nextPaySeq).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
    };
    setLiabilityPayments((prev) => [newPayment, ...prev]);

    // Cross-linked ledger: paying liability automatically logs as an Expense
    if (autoLedger?.enabled !== false && newPayment.amount > 0) {
      const parentLiability = liabilities.find((l) => l.id === newPayment.liabilityId);
      const liabName = parentLiability?.name || 'Debt';
      const liabCat = parentLiability?.category;

      let defaultCat = 'Account Payables';
      if (liabCat === 'Mortgage balance') defaultCat = 'Housing';
      else if (liabCat === 'Car loan') defaultCat = 'Transportation';

      const nextCrossTxSeq = transactions.length + 1;
      const crossTx: TransactionItem = {
        id: `tx-cross-pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        entryNo: `TXN-${String(nextCrossTxSeq).padStart(4, '0')}`,
        name: `Debt Payment: ${liabName}`,
        type: 'expense',
        category: autoLedger?.category || defaultCat,
        subCategory: 'fixed',
        description: newPayment.notes || `Amortization payment for ${liabName}`,
        amount: newPayment.amount,
        date: newPayment.date, // Exact date syncing
        month: parseInt(newPayment.date.split('-')[1]) || 1,
        year: parseInt(newPayment.date.split('-')[0]) || 2024,
        linkedLiabilityId: newPayment.liabilityId,
        autoGenerated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setTransactions((prev) => [crossTx, ...prev]);
      if (user && userAccess.hasApexAccess) {
        await saveTransactionItemToCloud(user.uid, crossTx);
      }
    }
  };

  const handleDeleteLiabilityPayment = (paymentId: string) => {
    setLiabilityPayments((prev) => prev.filter((p) => p.id !== paymentId));
  };

  // Transaction Actions (Logged via Income & Expenses page)
  const handleAddTransaction = async (data: {
    name: string;
    type: TransactionType;
    category: string;
    subCategory: IncomeClassification | ExpenseClassification;
    description?: string;
    amount: number;
    date: string;
    paymentMethod?: PaymentMethodType;
  }) => {
    // Generate unique sequential entry identifier (e.g. TXN-0001, TXN-0002)
    const nextSeq = transactions.length + 1;
    const entryNo = `TXN-${String(nextSeq).padStart(4, '0')}`;

    const newTx: TransactionItem = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      entryNo,
      name: data.name,
      type: data.type,
      category: data.category,
      subCategory: data.subCategory,
      description: data.description || data.name,
      amount: data.amount,
      date: data.date,
      month: parseInt(data.date.split('-')[1]) || 1,
      year: parseInt(data.date.split('-')[0]) || 2024,
      paymentMethod: data.paymentMethod || 'Cash',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);

    if (user && userAccess.hasApexAccess) {
      await saveTransactionItemToCloud(user.uid, newTx);
    }
  };

  const handleUpdateTransaction = async (updated: TransactionItem) => {
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

    if (user && userAccess.hasApexAccess) {
      await saveTransactionItemToCloud(user.uid, updated);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== txId));

    if (user && userAccess.hasApexAccess) {
      await deleteTransactionItemFromCloud(user.uid, txId);
    }
  };

  // Recurring Expenses Scheduling Handlers
  const handleAddRecurringExpense = (item: Omit<RecurringExpenseItem, 'id'>) => {
    const newItem: RecurringExpenseItem = {
      ...item,
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setRecurringExpenses((prev) => [newItem, ...prev]);
  };

  const handleUpdateRecurringExpense = (updated: RecurringExpenseItem) => {
    setRecurringExpenses((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const handleDeleteRecurringExpense = (id: string) => {
    setRecurringExpenses((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePayRecurringExpense = async (
    recurringId: string,
    instanceAmount: number,
    paymentMethod: PaymentMethodType = 'Cash',
    paidDate?: string
  ) => {
    if (!userAccess.hasApexAccess) {
      handleOpenGrowthCheckpoint('recurring_automation');
      return;
    }
    const rec = recurringExpenses.find((r) => r.id === recurringId);
    if (!rec) return;

    const actualDate = paidDate || new Date().toISOString().split('T')[0];

    // 1. Log transaction with custom instance amount (without altering master schedule!)
    await handleAddTransaction({
      name: `Recurring: ${rec.name}`,
      type: 'expense',
      category: rec.category,
      subCategory: 'fixed',
      amount: instanceAmount,
      date: actualDate,
      description: `Scheduled payment for ${rec.name} (${rec.frequency})`,
      paymentMethod,
    });

    // 2. Advance nextDueDate based on frequency
    const baseDue = new Date(rec.nextDueDate || actualDate);
    const nextDate = new Date(baseDue);
    const advanceOneCycle = (d: Date) => {
      if (rec.frequency === 'daily') {
        d.setDate(d.getDate() + 1);
      } else if (rec.frequency === 'weekly') {
        d.setDate(d.getDate() + 7);
      } else if (rec.frequency === 'monthly') {
        d.setMonth(d.getMonth() + 1);
      } else if (rec.frequency === 'yearly') {
        d.setFullYear(d.getFullYear() + 1);
      }
    };

    advanceOneCycle(nextDate);
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    while (nextDate <= todayMidnight) {
      advanceOneCycle(nextDate);
    }

    const nextDueDateStr = nextDate.toISOString().split('T')[0];

    // 3. Update recurring item nextDueDate while strictly keeping original master scheduled amount
    setRecurringExpenses((prev) =>
      prev.map((r) =>
        r.id === recurringId
          ? {
              ...r,
              nextDueDate: nextDueDateStr,
              lastPaidDate: actualDate,
              lastPaidAmount: instanceAmount,
            }
          : r
      )
    );
  };

  // Budget Actions with Multi-Period Assignment, Year Rollout, and Copying
  const handleUpdateBudget = (
    category: string,
    amount: number,
    options?: {
      scope?: 'month' | 'year';
      monthKey?: string;
      year?: number;
    }
  ) => {
    setBudgets((prev) => {
      const idx = prev.findIndex((b) => b.category === category);
      const existing = idx >= 0 ? prev[idx] : { category, monthlyBudget: amount, periodBudgets: {} };
      const periodBudgets = { ...(existing.periodBudgets || {}) };

      if (!options || !options.scope || options.scope === 'year') {
        const yr = options?.year || (options?.monthKey ? parseInt(options.monthKey.split('-')[0]) : 2024);
        for (let m = 1; m <= 12; m++) {
          const k = `${yr}-${String(m).padStart(2, '0')}`;
          periodBudgets[k] = amount;
        }
        const updatedItem: CategoryBudget = {
          category,
          monthlyBudget: amount,
          periodBudgets,
        };
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updatedItem;
          return copy;
        }
        return [...prev, updatedItem];
      } else {
        const k = options.monthKey || '2024-03';
        periodBudgets[k] = amount;
        const updatedItem: CategoryBudget = {
          category,
          monthlyBudget: existing.monthlyBudget || amount,
          periodBudgets,
        };
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updatedItem;
          return copy;
        }
        return [...prev, updatedItem];
      }
    });
  };

  const handleCopyBudgets = (sourceKey: string, targetKey: string, scope: 'month' | 'year') => {
    setBudgets((prev) => {
      return prev.map((item) => {
        const periodBudgets = { ...(item.periodBudgets || {}) };
        if (scope === 'month') {
          const sourceVal = periodBudgets[sourceKey] ?? item.monthlyBudget;
          periodBudgets[targetKey] = sourceVal;
        } else {
          for (let m = 1; m <= 12; m++) {
            const sm = `${sourceKey}-${String(m).padStart(2, '0')}`;
            const tm = `${targetKey}-${String(m).padStart(2, '0')}`;
            const sourceVal = periodBudgets[sm] ?? item.monthlyBudget;
            periodBudgets[tm] = sourceVal;
          }
        }
        return {
          ...item,
          periodBudgets,
        };
      });
    });
  };

  const handleRolloutYear = (monthKey: string) => {
    const [yearStr] = monthKey.split('-');
    const yr = parseInt(yearStr);
    setBudgets((prev) => {
      return prev.map((item) => {
        const periodBudgets = { ...(item.periodBudgets || {}) };
        const baseAmount = periodBudgets[monthKey] ?? item.monthlyBudget;
        for (let m = 1; m <= 12; m++) {
          const k = `${yr}-${String(m).padStart(2, '0')}`;
          periodBudgets[k] = baseAmount;
        }
        return {
          ...item,
          monthlyBudget: baseAmount,
          periodBudgets,
        };
      });
    });
  };

  // Category drill-down handler
  const handleSelectCategory = useCallback(
    (category: string, type: 'income' | 'expense' | 'asset' | 'liability') => {
      if (type === 'asset' || type === 'liability') {
        setActiveTab(type === 'asset' ? 'assets' : 'liabilities');
        return;
      }
      setCategoryDetailModal({
        isOpen: true,
        category,
        type,
      });
    },
    []
  );

  // Reset to default reference data
  const handleResetToDefault = () => {
    setPeriod(DEFAULT_PERIOD);
    setAssets(DEFAULT_ASSETS);
    setAssetTransactions(DEFAULT_ASSET_TRANSACTIONS);
    setLiabilities(DEFAULT_LIABILITIES);
    setLiabilityPayments(DEFAULT_LIABILITY_PAYMENTS);
    setTransactions(DEFAULT_TRANSACTIONS);
    setBudgets(DEFAULT_BUDGETS);
    setCurrency(DEFAULT_CURRENCY);

    saveLocalPeriod(DEFAULT_PERIOD);
    saveLocalAssets(DEFAULT_ASSETS);
    saveLocalAssetTransactions(DEFAULT_ASSET_TRANSACTIONS);
    saveLocalLiabilities(DEFAULT_LIABILITIES);
    saveLocalLiabilityPayments(DEFAULT_LIABILITY_PAYMENTS);
    saveLocalTransactions(DEFAULT_TRANSACTIONS);
    saveLocalBudgets(DEFAULT_BUDGETS);
    saveLocalCurrency(DEFAULT_CURRENCY);
    saveLocalUserName('Emmanuel Fajutagana');
    setUserName('Emmanuel Fajutagana');
  };

  // Rolling Liquid Cash & Equivalents Balance:
  // Base beginning balance + net of all cash inflows and outflows to date
  const allTimeCashBalance = useMemo(() => {
    const baseBeginning = period.beginningBalance || 0;
    const netTransactions = transactions.reduce((sum, t) => {
      return t.type === 'income' ? sum + t.amount : sum - t.amount;
    }, 0);
    return baseBeginning + netTransactions;
  }, [period.beginningBalance, transactions]);

  // Wipe All Data handler: completely clears all logged assets, liabilities, transactions,
  // and recurring expenses from local storage and Firebase, zeroing out beginning balance so the app resets to a pure zero state.
  const handleWipeAllTransactions = async () => {
    const { newPeriod } = await wipeAllDataToPureZero(user ? user.uid : null, period, assets);
    setTransactions([]);
    setAssets([]);
    setAssetTransactions([]);
    setLiabilities([]);
    setLiabilityPayments([]);
    setRecurringExpenses([]);
    setPeriod(newPeriod);
  };

  // 90-Day Comprehensive Mock Data Injection Handler
  const handleInjectMockData = () => {
    const mock = generate90DayMockData(new Date());
    setTransactions(mock.transactions);
    setAssets(mock.assets);
    setAssetTransactions(mock.assetTransactions);
    setLiabilities(mock.liabilities);
    setLiabilityPayments(mock.liabilityPayments);
    setRecurringExpenses(mock.recurringExpenses);

    // Persist to local storage
    saveLocalTransactions(mock.transactions);
    saveLocalAssets(mock.assets);
    saveLocalAssetTransactions(mock.assetTransactions);
    saveLocalLiabilities(mock.liabilities);
    saveLocalLiabilityPayments(mock.liabilityPayments);
    saveLocalRecurringExpenses(mock.recurringExpenses);

    alert('Successfully injected 90-day comprehensive test data! All charts, time window filters, and performance modules are now fully populated.');
  };

  const handleTogglePreviewAsCustomer = (val: boolean) => {
    setPreviewAsCustomer(val);
    setPreviewAsCustomerState(val);
  };

  const handleSubscribe = async (plan: SubscriptionPlanType) => {
    setLocalSubscriptionStatus(true, plan);
    setSubscriptionState({ isSubscribed: true, plan });
  };

  const handleRestoreSubscription = async () => {
    setLocalSubscriptionStatus(true, 'annual');
    setSubscriptionState({ isSubscribed: true, plan: 'annual' });
  };

  const handleResetTestSubscription = () => {
    setLocalSubscriptionStatus(false, null);
    setSubscriptionState({ isSubscribed: false, plan: null });
  };

  // Instant Quick Log trigger for Header button (Opens Central Log Transaction Modal)
  const handleQuickLog = () => {
    setIsQuickLogModalOpen(true);
  };

  // Mandatory Onboarding & Authentication Guard
  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-[#121416] flex flex-col items-center justify-center p-4 text-white">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-black uppercase tracking-wider text-white">Axiom Wealth</h1>
        <p className="text-xs text-neutral-400 font-mono mt-1">Initializing secure session...</p>
      </div>
    );
  }

  // Require all users to sign up / create an account before accessing the dashboard
  if (!user) {
    return (
      <div className="min-h-screen bg-[#121416] flex flex-col items-center justify-center p-3 sm:p-4 text-white">
        <AuthModal
          isOpen={true}
          isMandatory={true}
          initialMode="signup"
          onClose={() => {}}
          onSuccess={(authUser) => {
            setUser(authUser);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] dark:bg-[#121416] text-neutral-900 dark:text-neutral-100 font-sans antialiased flex flex-col transition-colors duration-150">
      {/* Floating Button to restore navigation if hidden (Distraction-Free Mode) */}
      {isNavHidden && (
        <aside aria-label="Quick Actions" className="fixed top-3 right-4 z-50 print:hidden">
          <button
            type="button"
            onClick={handleToggleNav}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#212529]/95 hover:bg-[#151719] text-white text-xs font-semibold rounded-full shadow-2xl border border-neutral-600 backdrop-blur-md transition cursor-pointer hover:border-emerald-500 hover:scale-105 active:scale-95"
            title="Show navigation bar"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Show Navigation</span>
          </button>
        </aside>
      )}

      {/* Top Header & Navbar (Hidden in distraction-free mode or on print) */}
      {!isNavHidden && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currency={currency}
          user={user}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onSignOut={handleSignOut}
          onToggleHide={handleToggleNav}
          userName={userName}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          recurringExpenses={recurringExpenses}
          budgets={budgets}
          transactions={transactions}
          onPayRecurringExpense={handlePayRecurringExpense}
          onQuickLog={handleQuickLog}
          onOpenHelp={handleOpenMasterHelp}
          hasApexAccess={userAccess.hasApexAccess}
          onOpenGrowthCheckpoint={() => handleOpenGrowthCheckpoint('general')}
        />
      )}

      {/* Main Page Content */}
      <main className={`flex-1 p-3 sm:p-5 pb-24 md:pb-6 max-w-7xl w-full mx-auto ${!isNavHidden ? 'pt-16 sm:pt-18 md:pt-20' : ''}`}>
        {/* Customer Preview / 15-Day Trial / Tier Status Header Alert Banner */}
        {userAccess.isAdmin && previewAsCustomer ? (
          <div className="mb-4 p-3 bg-gradient-to-r from-amber-950/90 via-neutral-900 to-amber-950/90 border border-amber-500/70 text-amber-200 rounded-lg shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <div>
                <span className="font-bold text-white">Customer Preview Active</span>
                <span className="text-neutral-300 ml-1.5">
                  Admin bypass is suspended so you can test Essential vs. Apex tiers, 15-day trial activation, and the Growth Checkpoint.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenGrowthCheckpoint('general')}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded shadow-xs transition cursor-pointer shrink-0"
              >
                Growth Checkpoint
              </button>
              <button
                type="button"
                onClick={() => handleTogglePreviewAsCustomer(false)}
                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] font-semibold border border-neutral-600 transition cursor-pointer shrink-0"
              >
                Exit Preview
              </button>
            </div>
          </div>
        ) : userAccess.isTrialActive ? (
          <div className="mb-4 p-3 bg-gradient-to-r from-emerald-950/90 via-neutral-900 to-emerald-950/90 border border-emerald-500/70 text-emerald-200 rounded-lg shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div>
                <span className="font-bold text-white">
                  Axiom Wealth Apex &bull; 15-Day Free Trial Active ({userAccess.trialDaysRemaining} {userAccess.trialDaysRemaining === 1 ? 'day' : 'days'} remaining)
                </span>
                <span className="text-neutral-300 ml-1.5">
                  Full Apex access enabled: encrypted cloud sync, real-time ledger automations, advanced analytics, and PDF/sheets export.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenGrowthCheckpoint('general')}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded shadow-xs transition cursor-pointer shrink-0"
              >
                Upgrade to Apex
              </button>
            </div>
          </div>
        ) : userAccess.isTrialExpired ? (
          <div className="mb-4 p-3 bg-gradient-to-r from-red-950/90 via-neutral-900 to-amber-950/90 border border-red-500/70 text-amber-200 rounded-lg shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <div>
                <span className="font-bold text-white">15-Day Apex Trial Expired</span>
                <span className="text-neutral-300 ml-1.5">
                  Downgraded to Essential Tier (Local Storage Only). Core ledger and balance sheet remain active.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenGrowthCheckpoint('general')}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded shadow-xs transition cursor-pointer shrink-0"
              >
                Upgrade to Apex
              </button>
            </div>
          </div>
        ) : !userAccess.hasApexAccess ? (
          <div className="mb-4 p-3 bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-700/80 text-neutral-200 rounded-lg shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2 w-2 relative">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-400"></span>
              </span>
              <div>
                <span className="font-bold text-white">Essential Tier (Free &bull; Local Storage Only)</span>
                <span className="text-neutral-400 ml-1.5">
                  Basic ledger and balance sheets enabled. Activate your optional 15-day free trial or upgrade to Apex for cloud sync &amp; analytics.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  activateFreeTrial();
                  setTrialRevision((r) => r + 1);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow-xs transition cursor-pointer shrink-0 text-xs"
              >
                Activate 15-Day Free Trial
              </button>
              <button
                type="button"
                onClick={() => handleOpenGrowthCheckpoint('general')}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded text-xs border border-neutral-600 transition cursor-pointer shrink-0"
              >
                Growth Checkpoint
              </button>
            </div>
          </div>
        ) : null}

        {/* Page 1: Main Dashboard (Read-Only Visualization with Click Drill-down) */}
        {activeTab === 'dashboard' && (
          <Dashboard
            period={period}
            setPeriod={setPeriod}
            assets={assets}
            liabilities={liabilities}
            transactions={transactions}
            currencySymbol={currency.symbol}
            onSelectCategory={handleSelectCategory}
            onResetToDefault={handleResetToDefault}
            userName={userName}
            onUpdateUserName={(name) => {
              setUserName(name);
              saveLocalUserName(name);
            }}
            onWipeAllTransactions={handleWipeAllTransactions}
            activeSubTab={dashboardSubTab}
            onSubTabChange={setDashboardSubTab}
            recurringExpenses={recurringExpenses}
            onAddRecurringExpense={handleAddRecurringExpense}
            onUpdateRecurringExpense={handleUpdateRecurringExpense}
            onDeleteRecurringExpense={handleDeleteRecurringExpense}
            onPayRecurringExpense={handlePayRecurringExpense}
            onOpenHelp={() => handleOpenContextualGuide('dashboard')}
            hasApexAccess={userAccess.hasApexAccess}
            onOpenGrowthCheckpoint={handleOpenGrowthCheckpoint}
          />
        )}

        {/* Page 2: Income & Expenses (Transaction Logging, Running Expenses, Budget Limits, Recurring) */}
        {activeTab === 'income-expenses' && (
          <IncomeExpensesPage
            transactions={transactions}
            budgets={budgets}
            currencySymbol={currency.symbol}
            onAddTransaction={handleAddTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onUpdateBudget={handleUpdateBudget}
            onCopyBudgets={handleCopyBudgets}
            onRolloutYear={handleRolloutYear}
            activeSubTab={incomeExpensesSubTab}
            onSubTabChange={setIncomeExpensesSubTab}
            recurringExpenses={recurringExpenses}
            onAddRecurringExpense={handleAddRecurringExpense}
            onUpdateRecurringExpense={handleUpdateRecurringExpense}
            onDeleteRecurringExpense={handleDeleteRecurringExpense}
            onPayRecurringExpense={handlePayRecurringExpense}
            onOpenHelp={() => handleOpenContextualGuide('income-expenses')}
          />
        )}

        {/* Page 3: Unified Wealth Page (Assets & Liabilities with clean top tab switch) */}
        {(activeTab === 'wealth' || activeTab === 'assets' || activeTab === 'liabilities') && (
          <WealthPage
            assets={assets}
            assetTransactions={assetTransactions}
            liabilities={liabilities}
            liabilityPayments={liabilityPayments}
            currencySymbol={currency.symbol}
            onAddAsset={handleAddAsset}
            onUpdateAsset={handleUpdateAsset}
            onDeleteAsset={handleDeleteAsset}
            onAddAssetTransaction={handleAddAssetTransaction}
            onDeleteAssetTransaction={handleDeleteAssetTransaction}
            onAddLiability={handleAddLiability}
            onUpdateLiability={handleUpdateLiability}
            onDeleteLiability={handleDeleteLiability}
            onAddLiabilityPayment={handleAddLiabilityPayment}
            onDeleteLiabilityPayment={handleDeleteLiabilityPayment}
            currentCashBalance={allTimeCashBalance}
            onAddTransaction={handleAddTransaction}
            activeSubTab={wealthSubTab}
            onSubTabChange={setWealthSubTab}
            onOpenHelp={() => handleOpenContextualGuide('wealth')}
          />
        )}

        {/* Page 4: Settings & Utilities (Account Management, Currency, Data Wipe & Bypass Controls) */}
        {activeTab === 'settings' && (
          <SettingsPage
            user={user}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            isSyncing={isSyncing}
            userName={userName}
            onUpdateUserName={(name) => {
              setUserName(name);
              saveLocalUserName(name);
            }}
            currency={currency}
            onChangeCurrency={setCurrency}
            onOpenExportSheets={() => {
              if (!userAccess.hasApexAccess) {
                handleOpenGrowthCheckpoint('export');
              } else {
                setIsExportModalOpen(true);
              }
            }}
            onWipeAllData={handleWipeAllTransactions}
            onOpenPaywall={() => handleOpenGrowthCheckpoint('general')}
            previewAsCustomer={previewAsCustomer}
            onTogglePreviewAsCustomer={handleTogglePreviewAsCustomer}
            isSubscribed={subscriptionState.isSubscribed}
            subscriptionPlan={subscriptionState.plan}
            onResetTestSubscription={handleResetTestSubscription}
            onInjectMockData={handleInjectMockData}
            onOpenHelp={() => handleOpenContextualGuide('settings')}
          />
        )}

        {/* Page 5: Dedicated Stock-Market Style Analytics */}
        {activeTab === 'analytics' && (
          userAccess.hasApexAccess ? (
            <AnalyticsPage
              transactions={transactions}
              assets={assets}
              assetTransactions={assetTransactions}
              liabilities={liabilities}
              currencySymbol={currency.symbol}
              onOpenHelp={() => handleOpenContextualGuide('analytics')}
            />
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-10 shadow-2xl text-center max-w-2xl mx-auto space-y-6 my-8 animate-in fade-in duration-200">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                  Growth Checkpoint &bull; Axiom Wealth Apex
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  Are you ready to master your cashflow? Choose your path to financial literacy.
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed">
                  Advanced Financial Analytics provides interactive multi-cycle stock-market trend graphs, zero-baseline projections, and box-selection transaction drilldowns.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {!userAccess.isTrialActivated && (
                  <button
                    type="button"
                    onClick={() => {
                      activateFreeTrial();
                      setTrialRevision((r) => r + 1);
                    }}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                  >
                    Activate 15-Day Free Trial
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenGrowthCheckpoint('analytics')}
                  className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl border border-neutral-700 shadow-sm transition cursor-pointer"
                >
                  Upgrade to Apex
                </button>
              </div>
            </div>
          )
        )}

        {/* Page 6: Purchase Checker (Affordability Calculator) */}
        {activeTab === 'purchase-checker' && (
          userAccess.hasApexAccess ? (
            <PurchaseCheckerPage
              currencySymbol={currency.symbol}
              cashEquivalents={allTimeCashBalance}
              monthlyNetIncome={computedTotals.netIncome}
              onLogTransactionAndAsset={handleLogActiveTransactionAndAsset}
              onNavigateToTab={(tab) => setActiveTab(tab as AppNavTab)}
              onOpenHelp={() => handleOpenContextualGuide('purchase-checker')}
            />
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-10 shadow-2xl text-center max-w-2xl mx-auto space-y-6 my-8 animate-in fade-in duration-200">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-inner">
                <Shield className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-purple-400">
                  Growth Checkpoint &bull; Axiom Wealth Apex
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  Are you ready to master your cashflow? Choose your path to financial literacy.
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed">
                  The Purchase Affordability Checker stress-tests prospective lifestyle and luxury purchases against the 10x Wealth Rule and your real-time liquid cash buffer before you buy.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {!userAccess.isTrialActivated && (
                  <button
                    type="button"
                    onClick={() => {
                      activateFreeTrial();
                      setTrialRevision((r) => r + 1);
                    }}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                  >
                    Activate 15-Day Free Trial
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenGrowthCheckpoint('purchase_checker')}
                  className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl border border-neutral-700 shadow-sm transition cursor-pointer"
                >
                  Upgrade to Apex
                </button>
              </div>
            </div>
          )
        )}

        {/* Page 7: Stock & Dividend Calculator */}
        {activeTab === 'stock-dividend-calculator' && (
          userAccess.hasApexAccess ? (
            <StockDividendCalculatorPage
              currencySymbol={currency?.symbol || '$'}
              onLogTransactionAndAsset={handleLogActiveTransactionAndAsset}
              onNavigateToTab={(tab) => setActiveTab(tab as AppNavTab)}
              onOpenHelp={() => handleOpenContextualGuide('stock-dividend-calculator')}
            />
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-10 shadow-2xl text-center max-w-2xl mx-auto space-y-6 my-8 animate-in fade-in duration-200">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-inner">
                <Calculator className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                  Growth Checkpoint &bull; Axiom Wealth Apex
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  Are you ready to master your cashflow? Choose your path to financial literacy.
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed">
                  The Stock &amp; Dividend Yield Simulator projects multi-year dividend reinvestment (DRIP), yield on cost, and compounding exponential growth curves with inflation-adjusted targets.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {!userAccess.isTrialActivated && (
                  <button
                    type="button"
                    onClick={() => {
                      activateFreeTrial();
                      setTrialRevision((r) => r + 1);
                    }}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                  >
                    Activate 15-Day Free Trial
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenGrowthCheckpoint('stock_calculator')}
                  className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl border border-neutral-700 shadow-sm transition cursor-pointer"
                >
                  Upgrade to Apex
                </button>
              </div>
            </div>
          )
        )}

        {/* Page 8: Dedicated Notifications & Scheduled Alerts */}
        {activeTab === 'notifications' && (
          <NotificationsPage
            recurringExpenses={recurringExpenses}
            currencySymbol={currency.symbol}
            budgets={budgets}
            transactions={transactions}
            onPayRecurringExpense={handlePayRecurringExpense}
            onNavigateToBudgets={() => {
              setActiveTab('income-expenses');
              setIncomeExpensesSubTab('budgets');
            }}
            onOpenHelp={() => handleOpenContextualGuide('notifications')}
          />
        )}
      </main>

      {/* Export to Google Sheets Modal */}
      <ExportSheetsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        accessToken={accessToken}
        onRequireLogin={handleSignIn}
        data={{
          period,
          assets: assets.map((a) => ({
            ...a,
            value: a.initialValue, // legacy adapter for export
          })),
          liabilities: liabilities.map((l) => ({
            ...l,
            amount: l.initialAmount,
          })),
          transactions,
          totals: computedTotals,
        }}
      />

      {/* Interactive Category Drill-Down Breakdown Modal (from Dashboard click) */}
      <CategoryDetailModal
        isOpen={categoryDetailModal.isOpen}
        onClose={() => setCategoryDetailModal((prev) => ({ ...prev, isOpen: false }))}
        category={categoryDetailModal.category}
        type={categoryDetailModal.type}
        transactions={transactions}
        currencySymbol={currency.symbol}
        onNavigateToEntries={() => setActiveTab('income-expenses')}
      />

      {/* Contextual Single-Page Operational Guide Modal */}
      <ContextualGuideModal
        isOpen={!!contextualGuideTab}
        onClose={() => setContextualGuideTab(null)}
        activeTab={contextualGuideTab || activeTab}
        userName={userName}
      />

      {/* Master Help & Comprehensive Guide Modal (Triggered only from Profile Menu) */}
      <HelpModal
        isOpen={isMasterHelpOpen}
        onClose={() => setIsMasterHelpOpen(false)}
        userName={userName}
        activeTab={activeTab}
        onNavigateTab={(tab) => {
          setActiveTab(tab as AppNavTab);
        }}
      />

      {/* Axiom Wealth Apex Growth Checkpoint Modal */}
      <GrowthCheckpointModal
        isOpen={isGrowthCheckpointOpen}
        onClose={() => setIsGrowthCheckpointOpen(false)}
        onSubscribe={handleSubscribe}
        isAdminPreview={userAccess.isAdmin && previewAsCustomer}
        triggerFeature={growthCheckpointTrigger}
      />

      {/* Authentication & MFA Security Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(authUser) => {
          setUser(authUser);
          setIsAuthModalOpen(false);
        }}
      />

      {/* Central Quick Log Transaction Modal */}
      <QuickLogModal
        isOpen={isQuickLogModalOpen}
        onClose={() => setIsQuickLogModalOpen(false)}
        currencySymbol={currency.symbol}
        onAddTransaction={handleAddTransaction}
      />

      {/* Progressive Web App (PWA) Install Prompts & Offline Banners */}
      <PwaInstallPrompt />

      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        userName={userName}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        onOpenHelp={() => handleOpenContextualGuide(activeTab)}
        hasApexAccess={userAccess.hasApexAccess}
        onOpenGrowthCheckpoint={() => handleOpenGrowthCheckpoint('general')}
      />

      {/* Mobile Fixed Bottom Navigation Bar (md:hidden) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#1e2324]/95 backdrop-blur-md border-t border-neutral-700/80 px-1 py-1.5 flex items-center justify-around shadow-2xl md:hidden print:hidden safe-pb"
      >
        {/* Context Tabs for Page 1: Financial Statement */}
        {activeTab === 'dashboard' && (
          <>
            <button
              type="button"
              onClick={() => {
                setDashboardSubTab('dashboard');
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
                dashboardSubTab === 'dashboard' && !isMobileMenuOpen
                  ? 'text-emerald-400 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Overview</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDashboardSubTab('income');
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
                dashboardSubTab === 'income' && !isMobileMenuOpen
                  ? 'text-emerald-400 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ReceiptText className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Income</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDashboardSubTab('cashflow');
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
                dashboardSubTab === 'cashflow' && !isMobileMenuOpen
                  ? 'text-emerald-400 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ArrowDownUp className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Cash Flow</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDashboardSubTab('balancesheet');
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
                dashboardSubTab === 'balancesheet' && !isMobileMenuOpen
                  ? 'text-emerald-400 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Scale className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Balance</span>
            </button>
          </>
        )}

        {/* Context Tabs for Page 2: Income & Expenses Tracker */}
        {activeTab === 'income-expenses' && (
          <>
            <button
              type="button"
              onClick={() => {
                setIncomeExpensesSubTab('entry');
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
                incomeExpensesSubTab === 'entry' && !isMobileMenuOpen
                  ? 'text-amber-400 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Log Entry</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIncomeExpensesSubTab('transactions');
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
                incomeExpensesSubTab === 'transactions' && !isMobileMenuOpen
                  ? 'text-amber-400 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Entries</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIncomeExpensesSubTab('budgets');
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
                incomeExpensesSubTab === 'budgets' && !isMobileMenuOpen
                  ? 'text-amber-400 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Target className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Budgets</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIncomeExpensesSubTab('recurring');
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
                incomeExpensesSubTab === 'recurring' && !isMobileMenuOpen
                  ? 'text-amber-400 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Repeat className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Recurring</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIncomeExpensesSubTab('analytics');
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
                incomeExpensesSubTab === 'analytics' && !isMobileMenuOpen
                  ? 'text-amber-400 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Analytics</span>
            </button>
          </>
        )}

        {/* Context Tabs for Utilities & Subpages (Analytics, Purchase Checker, Notifications) */}
        {(activeTab === 'analytics' || activeTab === 'purchase-checker' || activeTab === 'notifications') && (
          <>
            <button
              type="button"
              onClick={() => {
                setActiveTab('dashboard');
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer text-neutral-400 hover:text-white"
            >
              <LayoutDashboard className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Statement</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('income-expenses');
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer text-neutral-400 hover:text-white"
            >
              <ReceiptText className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Income</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('wealth');
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer text-neutral-400 hover:text-white"
            >
              <Wallet className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Wealth</span>
            </button>
          </>
        )}

        {/* Context Tabs for Page 3: Wealth Portfolio & Debts */}
        {(activeTab === 'wealth' || activeTab === 'assets' || activeTab === 'liabilities') && (
          <>
            <button
              type="button"
              onClick={() => {
                setWealthSubTab('assets');
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
                wealthSubTab === 'assets' && !isMobileMenuOpen
                  ? 'text-blue-400 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Wallet className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Assets</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setWealthSubTab('liabilities');
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
                wealthSubTab === 'liabilities' && !isMobileMenuOpen
                  ? 'text-blue-400 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Liabilities</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setWealthSubTab('summary');
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
                wealthSubTab === 'summary' && !isMobileMenuOpen
                  ? 'text-blue-400 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <PieChart className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">Summary</span>
            </button>
          </>
        )}

        {/* Context Tabs for Page 4: Settings & Utilities */}
        {activeTab === 'settings' && (
          <>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('settings-account');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                setIsMobileMenuOpen(false);
              }}
              className="flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer text-neutral-400 hover:text-white"
            >
              <UserCheck className="w-5 h-5 mb-0.5 text-emerald-400" />
              <span className="text-[10px] tracking-tight">Account</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('settings-data');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                setIsMobileMenuOpen(false);
              }}
              className="flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer text-neutral-400 hover:text-white"
            >
              <Sliders className="w-5 h-5 mb-0.5 text-emerald-400" />
              <span className="text-[10px] tracking-tight">Data &amp; Ops</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('settings-subscription');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                setIsMobileMenuOpen(false);
              }}
              className="flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer text-neutral-400 hover:text-white"
            >
              <CreditCard className="w-5 h-5 mb-0.5 text-emerald-400" />
              <span className="text-[10px] tracking-tight">Access</span>
            </button>
          </>
        )}

        {/* Global Hamburger Menu Toggle Button */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            isMobileMenuOpen
              ? 'text-emerald-400 font-bold'
              : 'text-neutral-400 hover:text-white'
          }`}
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Menu</span>
        </button>
      </nav>
    </div>
  );
}
