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
  subscribeToUserTransactions,
  subscribeToUserBudgets,
  subscribeToUserSettings,
  subscribeToUserAssetTransactions,
  subscribeToUserLiabilityPayments,
  subscribeToUserRecurringExpenses,
  saveAssetItemToCloud,
  deleteAssetItemFromCloud,
  saveLiabilityItemToCloud,
  deleteLiabilityItemFromCloud,
  saveTransactionItemToCloud,
  deleteTransactionItemFromCloud,
  saveBudgetsToCloud,
  savePeriodToCloud,
  saveAssetTransactionToCloud,
  deleteAssetTransactionFromCloud,
  saveLiabilityPaymentToCloud,
  deleteLiabilityPaymentFromCloud,
  saveRecurringExpenseToCloud,
  deleteRecurringExpenseFromCloud,
  restoreAccountDataToFirestore,
  saveUserCache,
  wipeAllTransactionsFromStorageAndCloud,
  wipeAllDataToPureZero,
  runOneTimeTestDataPurge,
} from './services/storage';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { BackupPayload } from './services/backupRestore';
import {
  enqueueOfflineAction,
  getOfflineQueue,
  processOfflineQueue,
  pushLocalLedgerToCloud,
  pullCloudLedgerToLocal,
  getLastSyncedTime,
  setLastSyncedTime,
} from './services/offlineSyncQueue';
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
import { LandingPage } from './components/PublicPages';
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
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queuedActionsCount, setQueuedActionsCount] = useState<number>(0);
  const [lastSyncedTime, setLastSyncedTimeState] = useState<string | null>(null);

  // Connectivity and offline queue auto-processing
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (user) {
        try {
          const res = await processOfflineQueue(user.uid);
          if (res.processed > 0) {
            setLastSyncedTime(user.uid);
            setLastSyncedTimeState(new Date().toISOString());
          }
        } catch (err) {
          console.error('Auto-sync offline queue on reconnect failed:', err);
        }
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // Offline queue event listener
  useEffect(() => {
    if (!user) {
      setQueuedActionsCount(0);
      setLastSyncedTimeState(null);
      return;
    }

    const refreshQueue = () => {
      const q = getOfflineQueue(user.uid);
      setQueuedActionsCount(q.length);
      setLastSyncedTimeState(getLastSyncedTime(user.uid));
    };

    refreshQueue();

    const handleQueueChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId: string; count: number }>;
      if (!customEvent.detail || customEvent.detail.userId === user.uid) {
        refreshQueue();
      }
    };

    window.addEventListener('axiom_offline_queue_changed', handleQueueChanged);
    window.addEventListener('storage', refreshQueue);

    return () => {
      window.removeEventListener('axiom_offline_queue_changed', handleQueueChanged);
      window.removeEventListener('storage', refreshQueue);
    };
  }, [user]);

  // Safe Cloud Save and Delete with automatic offline queueing
  const safeCloudSave = async (
    entity: 'transaction' | 'asset' | 'liability' | 'budget' | 'period' | 'asset_tx' | 'liability_payment' | 'recurring',
    saveFn: () => Promise<void>,
    payload: any
  ) => {
    if (!user) return;
    if (navigator.onLine) {
      try {
        await saveFn();
        setLastSyncedTime(user.uid);
        setLastSyncedTimeState(new Date().toISOString());
        return;
      } catch (err) {
        console.warn(`[Cloud] Save error online, queuing offline action for ${entity}:`, err);
      }
    }
    enqueueOfflineAction({
      userId: user.uid,
      entity,
      actionType: 'save',
      payload,
    });
  };

  const safeCloudDelete = async (
    entity: 'transaction' | 'asset' | 'liability' | 'budget' | 'period' | 'asset_tx' | 'liability_payment' | 'recurring',
    deleteFn: () => Promise<void>,
    entityId: string
  ) => {
    if (!user) return;
    if (navigator.onLine) {
      try {
        await deleteFn();
        setLastSyncedTime(user.uid);
        setLastSyncedTimeState(new Date().toISOString());
        return;
      } catch (err) {
        console.warn(`[Cloud] Delete error online, queuing offline action for ${entity}:`, err);
      }
    }
    enqueueOfflineAction({
      userId: user.uid,
      entity,
      actionType: 'delete',
      entityId,
    });
  };

  // Two-way sync controls
  const handlePushLocalToCloud = async (): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      throw new Error('Please sign in to push changes to cloud.');
    }
    if (!navigator.onLine) {
      throw new Error('Device is offline. Connect to the internet to push changes to cloud.');
    }

    setIsSyncing(true);
    try {
      const result = await pushLocalLedgerToCloud(user.uid, {
        transactions,
        assets,
        liabilities,
        budgets,
        period,
        assetTransactions,
        liabilityPayments,
        recurringExpenses,
      });

      setLastSyncedTime(user.uid);
      setLastSyncedTimeState(new Date().toISOString());
      setQueuedActionsCount(0);

      return {
        success: true,
        message: result.message,
      };
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullCloudToLocal = async (): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      throw new Error('Please sign in to pull changes from cloud.');
    }
    if (!navigator.onLine) {
      throw new Error('Device is offline. Connect to the internet to pull cloud data.');
    }

    setIsSyncing(true);
    try {
      const result = await pullCloudLedgerToLocal(user.uid);
      if (result.success && result.data) {
        setTransactions(result.data.transactions);
        setAssets(result.data.assets);
        setLiabilities(result.data.liabilities);
        setBudgets(result.data.budgets);
        setPeriod(result.data.period);
        setAssetTransactions(result.data.assetTransactions);
        setLiabilityPayments(result.data.liabilityPayments);
        setRecurringExpenses(result.data.recurringExpenses);

        setLastSyncedTime(user.uid);
        setLastSyncedTimeState(new Date().toISOString());
      }

      return {
        success: result.success,
        message: result.message,
      };
    } finally {
      setIsSyncing(false);
    }
  };

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
  const [isBackupRestoreModalOpen, setIsBackupRestoreModalOpen] = useState(false);
  const [backupRestoreTab, setBackupRestoreTab] = useState<'export' | 'restore'>('export');
  const [isMasterHelpOpen, setIsMasterHelpOpen] = useState(false);
  const [contextualGuideTab, setContextualGuideTab] = useState<AppNavTab | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [landingAuthMode, setLandingAuthMode] = useState<'signin' | 'signup' | null>(null);

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

  // Listen to Auth state changes (One-time subscription on mount)
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = initAuth(
      async (authUser, token) => {
        if (!isMounted) return;
        setUser(authUser);
        setAuthInitialized(true);
        if (token) {
          setAccessToken(token);
        } else {
          try {
            const cached = await getAccessToken();
            if (isMounted) setAccessToken(cached);
          } catch (e) {
            console.warn('Failed to retrieve cached access token:', e);
          }
        }
      },
      () => {
        if (!isMounted) return;
        setUser((prevUser) => {
          if (prevUser !== null) {
            // Only reset state if transitioning from an authenticated session to signed out
            setAssets([]);
            setAssetTransactions([]);
            setLiabilities([]);
            setLiabilityPayments([]);
            setTransactions([]);
            setBudgets([]);
            setRecurringExpenses([]);
          }
          return null;
        });
        setAccessToken(null);
        setAuthInitialized(true);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Subscribe to real-time Cloud Firestore updates for ALL authenticated accounts (Single Source of Truth)
  useEffect(() => {
    if (!user) return;

    setIsSyncing(true);
    let loadedCount = 0;
    const markLoaded = () => {
      loadedCount++;
      if (loadedCount >= 8) {
        setIsSyncing(false);
        setLastSyncedTime(user.uid);
        setLastSyncedTimeState(new Date().toISOString());
      }
    };

    const unsubAssets = subscribeToUserAssets(
      user.uid,
      (updatedAssets) => {
        setAssets(updatedAssets);
        markLoaded();
      },
      (err) => {
        console.error('Assets sync error:', err);
        markLoaded();
      }
    );

    const unsubLiabilities = subscribeToUserLiabilities(
      user.uid,
      (updatedLiabs) => {
        setLiabilities(updatedLiabs);
        markLoaded();
      },
      (err) => {
        console.error('Liabilities sync error:', err);
        markLoaded();
      }
    );

    const unsubTransactions = subscribeToUserTransactions(
      user.uid,
      (updatedTxs) => {
        setTransactions(updatedTxs);
        markLoaded();
      },
      (err) => {
        console.error('Transactions sync error:', err);
        markLoaded();
      }
    );

    const unsubBudgets = subscribeToUserBudgets(
      user.uid,
      (updatedBudgets) => {
        setBudgets(updatedBudgets);
        markLoaded();
      },
      (err) => {
        console.error('Budgets sync error:', err);
        markLoaded();
      }
    );

    const unsubSettings = subscribeToUserSettings(
      user.uid,
      (remotePeriod) => {
        if (remotePeriod) setPeriod(remotePeriod);
        markLoaded();
      },
      (err) => {
        console.error('Settings sync error:', err);
        markLoaded();
      }
    );

    const unsubAssetTxs = subscribeToUserAssetTransactions(
      user.uid,
      (updatedAstTxs) => {
        setAssetTransactions(updatedAstTxs);
        markLoaded();
      },
      (err) => {
        console.error('Asset transactions sync error:', err);
        markLoaded();
      }
    );

    const unsubLiabilityPayments = subscribeToUserLiabilityPayments(
      user.uid,
      (updatedPayments) => {
        setLiabilityPayments(updatedPayments);
        markLoaded();
      },
      (err) => {
        console.error('Liability payments sync error:', err);
        markLoaded();
      }
    );

    const unsubRecurring = subscribeToUserRecurringExpenses(
      user.uid,
      (updatedRecurring) => {
        setRecurringExpenses(updatedRecurring);
        markLoaded();
      },
      (err) => {
        console.error('Recurring expenses sync error:', err);
        markLoaded();
      }
    );

    return () => {
      unsubAssets();
      unsubLiabilities();
      unsubTransactions();
      unsubBudgets();
      unsubSettings();
      unsubAssetTxs();
      unsubLiabilityPayments();
      unsubRecurring();
    };
  }, [user]);

  // Save to Local Storage and User Cache on updates
  useEffect(() => {
    saveLocalAssets(assets);
    if (user) saveUserCache(user.uid, 'assets', assets);
  }, [assets, user]);

  useEffect(() => {
    saveLocalAssetTransactions(assetTransactions);
    if (user) saveUserCache(user.uid, 'assetTransactions', assetTransactions);
  }, [assetTransactions, user]);

  useEffect(() => {
    saveLocalLiabilities(liabilities);
    if (user) saveUserCache(user.uid, 'liabilities', liabilities);
  }, [liabilities, user]);

  useEffect(() => {
    saveLocalLiabilityPayments(liabilityPayments);
    if (user) saveUserCache(user.uid, 'liabilityPayments', liabilityPayments);
  }, [liabilityPayments, user]);

  useEffect(() => {
    saveLocalTransactions(transactions);
    if (user) saveUserCache(user.uid, 'transactions', transactions);
  }, [transactions, user]);

  useEffect(() => {
    saveLocalBudgets(budgets);
    if (user) saveUserCache(user.uid, 'budgets', budgets);
  }, [budgets, user]);

  useEffect(() => {
    saveLocalPeriod(period);
    if (user) saveUserCache(user.uid, 'period', period);
  }, [period, user]);

  useEffect(() => {
    saveLocalCurrency(currency);
    if (user) saveUserCache(user.uid, 'currency', currency);
  }, [currency, user]);

  useEffect(() => {
    saveLocalRecurringExpenses(recurringExpenses);
    if (user) saveUserCache(user.uid, 'recurringExpenses', recurringExpenses);
  }, [recurringExpenses, user]);

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
      setAssets([]);
      setAssetTransactions([]);
      setLiabilities([]);
      setLiabilityPayments([]);
      setTransactions([]);
      setBudgets([]);
      setRecurringExpenses([]);
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
      const pays = liabilityPayments.filter((p) => p.liabilityId === l.id && p.type !== 'borrow');
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

    // 1. Record historical action in asset_transactions
    if (item.initialValue > 0) {
      const nextAstSeq = assetTransactions.length + 1;
      const initialAstTx: AssetTransaction = {
        id: `atx-init-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        assetId: item.id,
        entryNo: `AST-${String(nextAstSeq).padStart(4, '0')}`,
        name: `Initial Acquisition: ${item.name}`,
        type: 'buy',
        amount: item.initialValue,
        date: item.date,
        notes: item.notes || `Initial acquisition recorded for ${item.name}`,
        isRecordOnly: item.isRecordOnly,
        createdAt: new Date().toISOString(),
      };
      setAssetTransactions((prev) => [initialAstTx, ...prev]);
      if (user) {
        await safeCloudSave('asset_tx', () => saveAssetTransactionToCloud(user.uid, initialAstTx), initialAstTx);
      }
    }

    // 2. LINKED CASHFLOW:
    // When "Record only" is UNTICKED:
    // Logging an Asset purchase MUST create an actual Expense (outflow) in the Income & Expenses ledger.
    // When "Record only" is TICKED:
    // Do not create any entry in the Income & Expenses ledger at all. Only record it in the asset inventory and history tables.
    if (!item.isRecordOnly && item.initialValue > 0) {
      const defaultExpenseCat =
        item.category === 'Real estate'
          ? 'Real Estate/Business Investments'
          : item.category === 'Vehicles'
          ? 'Transportation'
          : item.category === 'Liquid Cash' || item.category === 'Cash and cash equivalents'
          ? 'Bank Transaction'
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
      if (user) {
        await safeCloudSave('transaction', () => saveTransactionItemToCloud(user.uid, crossTx), crossTx);
      }
    }

    if (user) {
      await safeCloudSave('asset', () => saveAssetItemToCloud(user.uid, item), item);
    }
  };

  const handleUpdateAsset = async (updated: AssetItem) => {
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

    if (user) {
      await safeCloudSave('asset', () => saveAssetItemToCloud(user.uid, updated), updated);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
    setAssetTransactions((prev) => prev.filter((t) => t.assetId !== assetId));
    setTransactions((prev) => prev.filter((t) => t.linkedAssetId !== assetId));

    if (user) {
      await safeCloudDelete('asset', () => deleteAssetItemFromCloud(user.uid, assetId), assetId);
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

    // 2. Record action in asset_transactions
    const nextAstSeq = assetTransactions.length + 1;
    const initialAstTx: AssetTransaction = {
      id: `atx-init-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      assetId: newAsset.id,
      entryNo: `AST-${String(nextAstSeq).padStart(4, '0')}`,
      name: `Acquisition: ${newAsset.name}`,
      type: data.transaction.type === 'income' ? 'sell' : 'buy',
      amount: newAsset.initialValue,
      date: newAsset.date,
      notes: newAsset.notes || `Acquisition recorded for ${newAsset.name}`,
      isRecordOnly: newAsset.isRecordOnly,
      createdAt: new Date().toISOString(),
    };
    setAssetTransactions((prev) => [initialAstTx, ...prev]);

    // 3. Create transaction cross-linked to this asset (unless record only)
    let newTx: TransactionItem | null = null;
    if (!newAsset.isRecordOnly) {
      const nextTxSeq = transactions.length + 1;
      newTx = {
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
      setTransactions((prev) => [newTx!, ...prev]);
    }

    if (user) {
      await safeCloudSave('asset', () => saveAssetItemToCloud(user.uid, newAsset), newAsset);
      await safeCloudSave('asset_tx', () => saveAssetTransactionToCloud(user.uid, initialAstTx), initialAstTx);
      if (newTx) {
        await safeCloudSave('transaction', () => saveTransactionItemToCloud(user.uid, newTx!), newTx);
      }
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
    if (user) {
      await safeCloudSave('asset_tx', () => saveAssetTransactionToCloud(user.uid, newTx), newTx);
    }

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
      if (user) {
        await safeCloudSave('transaction', () => saveTransactionItemToCloud(user.uid, crossTx), crossTx);
      }
    }
  };

  const handleDeleteAssetTransaction = (txId: string) => {
    setAssetTransactions((prev) => prev.filter((t) => t.id !== txId));
    if (user) {
      safeCloudDelete('asset_tx', () => deleteAssetTransactionFromCloud(user.uid, txId), txId).catch(console.error);
    }
  };

  // Liability Actions: Strictly records to liabilities without dispatching transactions or mutating liquid cash/assets
  const handleAddLiability = async (
    newLiab: Omit<LiabilityItem, 'id' | 'createdAt' | 'updatedAt'>,
    _autoLedger?: { enabled: boolean; type: 'expense' | 'income'; category: string }
  ) => {
    const item: LiabilityItem = {
      ...newLiab,
      id: `liab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLiabilities((prev) => [item, ...prev]);

    // Record initial borrowing in liability_payments for debt history audit
    if (item.initialAmount > 0) {
      const nextPaySeq = liabilityPayments.length + 1;
      const initialBorrowTx: LiabilityPayment = {
        id: `pay-init-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        liabilityId: item.id,
        entryNo: `BORROW-${String(nextPaySeq).padStart(4, '0')}`,
        amount: item.initialAmount,
        date: item.date,
        type: 'borrow',
        notes: item.notes || `Initial loan origination recorded for ${item.name}`,
        isRecordOnly: item.isRecordOnly,
        createdAt: new Date().toISOString(),
      };
      setLiabilityPayments((prev) => [initialBorrowTx, ...prev]);
      if (user) {
        await safeCloudSave('liability_payment', () => saveLiabilityPaymentToCloud(user.uid, initialBorrowTx), initialBorrowTx);
      }
    }

    // 2. LINKED CASHFLOW:
    // When "Record only" is UNTICKED:
    // Logging a New Loan / Borrowing MUST create an actual Income/Cash Inflow (or cash receipt) in the Income & Expenses ledger.
    // When "Record only" is TICKED:
    // Do not create any entry in the Income & Expenses ledger at all. Only record it in the liability inventory and history tables.
    if (!item.isRecordOnly && item.initialAmount > 0) {
      let defaultCat = 'Bank Transaction';
      if (item.category === 'Car loan') defaultCat = 'Transportation';
      else if (item.category === 'Mortgage balance') defaultCat = 'Housing';

      const nextTxSeq = transactions.length + 1;
      const crossTx: TransactionItem = {
        id: `tx-cross-liab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        entryNo: `TXN-${String(nextTxSeq).padStart(4, '0')}`,
        name: `Loan Receipt: ${item.name}`,
        type: 'income',
        category: autoLedger?.category || defaultCat,
        subCategory: 'other',
        description: `Loan Inflow: Cash receipt from borrowed funds (${item.name} · ${item.category})`,
        amount: item.initialAmount,
        date: item.date,
        month: parseInt(item.date.split('-')[1]) || 1,
        year: parseInt(item.date.split('-')[0]) || 2024,
        linkedLiabilityId: item.id,
        autoGenerated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setTransactions((prev) => [crossTx, ...prev]);
      if (user) {
        await safeCloudSave('transaction', () => saveTransactionItemToCloud(user.uid, crossTx), crossTx);
      }
    }

    if (user) {
      await safeCloudSave('liability', () => saveLiabilityItemToCloud(user.uid, item), item);
    }
  };

  const handleUpdateLiability = async (updated: LiabilityItem) => {
    setLiabilities((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));

    if (user) {
      await safeCloudSave('liability', () => saveLiabilityItemToCloud(user.uid, updated), updated);
    }
  };

  const handleDeleteLiability = async (liabilityId: string) => {
    setLiabilities((prev) => prev.filter((l) => l.id !== liabilityId));
    setLiabilityPayments((prev) => prev.filter((p) => p.liabilityId !== liabilityId));
    setTransactions((prev) => prev.filter((t) => t.linkedLiabilityId !== liabilityId));

    if (user) {
      await safeCloudDelete('liability', () => deleteLiabilityItemFromCloud(user.uid, liabilityId), liabilityId);
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
    if (user) {
      await safeCloudSave('liability_payment', () => saveLiabilityPaymentToCloud(user.uid, newPayment), newPayment);
    }

    // Cross-linked ledger: paying liability automatically logs as an Expense
    // Respects isRecordOnly: bypasses cashflow / income-expense statement when enabled
    const parentLiability = liabilities.find((l) => l.id === newPayment.liabilityId);
    const isRecordOnly = Boolean(parentLiability?.isRecordOnly || (data as any)?.isRecordOnly);

    if (!isRecordOnly && autoLedger?.enabled !== false && newPayment.amount > 0) {
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
      if (user) {
        await safeCloudSave('transaction', () => saveTransactionItemToCloud(user.uid, crossTx), crossTx);
      }
    }
  };

  const handleDeleteLiabilityPayment = (paymentId: string) => {
    setLiabilityPayments((prev) => prev.filter((p) => p.id !== paymentId));
    if (user) {
      safeCloudDelete('liability_payment', () => deleteLiabilityPaymentFromCloud(user.uid, paymentId), paymentId).catch(console.error);
    }
  };

  // Transaction Actions (Logged via Income & Expenses page or Quick Log modal)
  const handleAddTransaction = async (data: {
    name: string;
    type: TransactionType;
    category: string;
    subCategory: IncomeClassification | ExpenseClassification;
    description?: string;
    amount: number;
    date: string;
    paymentMethod?: PaymentMethodType;
    transferDirection?: TransferDirection;
    isRecordOnly?: boolean;
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
      transferDirection: data.transferDirection,
      isRecordOnly: data.isRecordOnly,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTransactions((prev) => [newTx, ...prev]);

    // If this is an internal transfer, adjust liquid cash / bank account balances cleanly
    if (data.type === 'transfer' && data.transferDirection) {
      const isCashToBank = data.transferDirection === 'cash_to_bank';
      // Find or adjust cash on hand and bank asset items if they exist
      const cashAsset = assets.find(
        (a) => a.category === 'Liquid Cash' || a.category === 'Cash and cash equivalents'
      );
      if (cashAsset) {
        const delta = isCashToBank ? -data.amount : data.amount;
        const updatedCash = {
          ...cashAsset,
          initialValue: Math.max(0, cashAsset.initialValue + delta),
          updatedAt: new Date().toISOString(),
        };
        handleUpdateAsset(updatedCash as AssetItem);
      }
    }

    if (user) {
      await safeCloudSave('transaction', () => saveTransactionItemToCloud(user.uid, newTx), newTx);
    }
  };

  const handleUpdateTransaction = async (updated: TransactionItem) => {
    setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

    if (user) {
      await safeCloudSave('transaction', () => saveTransactionItemToCloud(user.uid, updated), updated);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== txId));

    if (user) {
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
    if (user) {
      saveRecurringExpenseToCloud(user.uid, newItem).catch(console.error);
    }
  };

  const handleUpdateRecurringExpense = (updated: RecurringExpenseItem) => {
    setRecurringExpenses((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    if (user) {
      saveRecurringExpenseToCloud(user.uid, updated).catch(console.error);
    }
  };

  const handleDeleteRecurringExpense = (id: string) => {
    setRecurringExpenses((prev) => prev.filter((item) => item.id !== id));
    if (user) {
      deleteRecurringExpenseFromCloud(user.uid, id).catch(console.error);
    }
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

      let nextBudgets: CategoryBudget[];
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
          nextBudgets = copy;
        } else {
          nextBudgets = [...prev, updatedItem];
        }
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
          nextBudgets = copy;
        } else {
          nextBudgets = [...prev, updatedItem];
        }
      }

      if (user) {
        saveBudgetsToCloud(user.uid, nextBudgets).catch(console.error);
      }
      return nextBudgets;
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
    saveLocalUserName('');
    setUserName('');
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
  const handleSetPeriod = (newPeriod: React.SetStateAction<PeriodSettings>) => {
    setPeriod((prev) => {
      const next = typeof newPeriod === 'function' ? newPeriod(prev) : newPeriod;
      if (user) {
        savePeriodToCloud(user.uid, next).catch(console.error);
      }
      return next;
    });
  };

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
        <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 p-2.5 flex items-center justify-center mb-4 shadow-2xl animate-pulse">
          <img
            src="/logo.png"
            alt="Axiom Wealth"
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-xl font-black uppercase tracking-wider text-white">Axiom Wealth</h1>
        <p className="text-xs text-neutral-400 font-mono mt-1">Initializing secure session...</p>
      </div>
    );
  }

  // Compliance / login gate: the dashboard stays locked behind authentication, but visitors first see a
  // public landing page that explains the app's purpose and links to the Privacy Policy and Terms.
  if (!user) {
    return (
      <>
        <LandingPage
          onSignIn={() => {
            console.log('[App] User clicked Sign In on landing page');
            setLandingAuthMode('signin');
          }}
          onSignUp={() => {
            console.log('[App] User clicked Create Account on landing page');
            setLandingAuthMode('signup');
          }}
        />
        {landingAuthMode !== null && (
          <AuthModal
            key={landingAuthMode}
            isOpen={true}
            isMandatory={false}
            initialMode={landingAuthMode}
            onClose={() => {
              console.log('[App] Closing AuthModal');
              setLandingAuthMode(null);
            }}
            onSuccess={(authUser) => {
              console.log('[App] AuthModal success, authenticated:', authUser.email);
              setUser(authUser);
              setLandingAuthMode(null);
            }}
          />
        )}
      </>
    );
  }
  return (
    <div className="min-h-screen bg-[#f4f6f8] dark:bg-[#121416] text-neutral-900 dark:text-neutral-100 font-sans antialiased flex flex-col transition-colors duration-150 overflow-x-hidden">
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
        {/* Customer Preview / 15-Day Trial / Tier Status Header Alert Banner (Hidden when Apex/Pro is active) */}
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
        ) : !userAccess.hasApexAccess && userAccess.isTrialExpired ? (
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
            setPeriod={handleSetPeriod}
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
            onOpenBackupRestore={(tab) => {
              setBackupRestoreTab(tab || 'export');
              setIsBackupRestoreModalOpen(true);
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

      {/* Unified Account Backup & Restore Modal (Google Sheets / CSV / JSON) */}
      <BackupRestoreModal
        isOpen={isBackupRestoreModalOpen}
        onClose={() => setIsBackupRestoreModalOpen(false)}
        userId={user?.uid}
        initialTab={backupRestoreTab}
        data={{
          period,
          assets,
          liabilities,
          transactions,
          budgets,
          assetTransactions,
          liabilityPayments,
          recurringExpenses,
        }}
        onRestoreToCloud={async (backup, mode) => {
          if (!user) {
            throw new Error('Please sign in to restore your cloud ledger.');
          }
          return await restoreAccountDataToFirestore(user.uid, backup, mode);
        }}
        onOpenGoogleSheetsExport={() => {
          setIsBackupRestoreModalOpen(false);
          setIsExportModalOpen(true);
        }}
      />

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
        budgets={budgets}
        currentMonthKey={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
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
