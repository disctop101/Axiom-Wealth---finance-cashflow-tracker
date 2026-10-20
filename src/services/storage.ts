import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  AssetItem,
  LiabilityItem,
  PeriodSettings,
  TransactionItem,
  CategoryBudget,
  AssetTransaction,
  LiabilityPayment,
  CurrencyConfig,
  DEFAULT_ASSETS,
  DEFAULT_LIABILITIES,
  DEFAULT_TRANSACTIONS,
  DEFAULT_PERIOD,
  DEFAULT_BUDGETS,
  DEFAULT_ASSET_TRANSACTIONS,
  DEFAULT_LIABILITY_PAYMENTS,
  DEFAULT_CURRENCY,
  RecurringExpenseItem,
  DEFAULT_RECURRING_EXPENSES,
} from '../types/finance';

const STORAGE_KEYS = {
  ASSETS: 'finance_tracker_assets_v2',
  LIABILITIES: 'finance_tracker_liabilities_v2',
  TRANSACTIONS: 'finance_tracker_transactions_v2',
  PERIOD: 'finance_tracker_period_v2',
  BUDGETS: 'finance_tracker_budgets_v2',
  ASSET_TXS: 'finance_tracker_asset_txs_v2',
  LIABILITY_PAYMENTS: 'finance_tracker_liab_payments_v2',
  CURRENCY: 'finance_tracker_currency_v2',
  USER_NAME: 'finance_tracker_user_name_v2',
  RECURRING: 'finance_tracker_recurring_v2',
};

export const DEFAULT_USER_NAME = '';

export function loadLocalUserName(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_NAME);
    if (raw && raw.trim()) {
      return raw.trim();
    }
    return DEFAULT_USER_NAME;
  } catch {
    return DEFAULT_USER_NAME;
  }
}

export function saveLocalUserName(name: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_NAME, name.trim());
  } catch (e) {
    console.error('Error saving user name:', e);
  }
}

// --- Local Storage Helpers ---
export function loadLocalCurrency(): CurrencyConfig {
  try {
    // One-time migration: previous builds defaulted to PHP. Reset to USD default once.
    const MIGRATION_KEY = 'axiom_currency_default_usd_v1';
    if (!localStorage.getItem(MIGRATION_KEY)) {
      localStorage.setItem(MIGRATION_KEY, 'true');
      localStorage.setItem(STORAGE_KEYS.CURRENCY, JSON.stringify(DEFAULT_CURRENCY));
      return DEFAULT_CURRENCY;
    }
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENCY);
    return raw ? JSON.parse(raw) : DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export function saveLocalCurrency(currency: CurrencyConfig) {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENCY, JSON.stringify(currency));
  } catch (e) {
    console.error('Error saving currency:', e);
  }
}

export function loadLocalAssets(): AssetItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSETS);
    if (!raw) {
      saveLocalAssets(DEFAULT_ASSETS);
      return DEFAULT_ASSETS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading local assets:', e);
    return DEFAULT_ASSETS;
  }
}

export function saveLocalAssets(assets: AssetItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
  } catch (e) {
    console.error('Error saving local assets:', e);
  }
}

export function loadLocalAssetTransactions(): AssetTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSET_TXS);
    if (!raw) {
      saveLocalAssetTransactions(DEFAULT_ASSET_TRANSACTIONS);
      return DEFAULT_ASSET_TRANSACTIONS;
    }
    const parsed: AssetTransaction[] = JSON.parse(raw);
    let modified = false;
    const sorted = [...parsed].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    sorted.forEach((item, idx) => {
      if (!item.entryNo) {
        item.entryNo = `AST-${String(idx + 1).padStart(4, '0')}`;
        modified = true;
      }
    });
    if (modified) {
      saveLocalAssetTransactions(parsed);
    }
    return parsed;
  } catch {
    return DEFAULT_ASSET_TRANSACTIONS;
  }
}

export function saveLocalAssetTransactions(txs: AssetTransaction[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ASSET_TXS, JSON.stringify(txs));
  } catch (e) {
    console.error('Error saving asset transactions:', e);
  }
}

export function loadLocalLiabilities(): LiabilityItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LIABILITIES);
    if (!raw) {
      saveLocalLiabilities(DEFAULT_LIABILITIES);
      return DEFAULT_LIABILITIES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading local liabilities:', e);
    return DEFAULT_LIABILITIES;
  }
}

export function saveLocalLiabilities(liabilities: LiabilityItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.LIABILITIES, JSON.stringify(liabilities));
  } catch (e) {
    console.error('Error saving local liabilities:', e);
  }
}

export function loadLocalLiabilityPayments(): LiabilityPayment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LIABILITY_PAYMENTS);
    if (!raw) {
      saveLocalLiabilityPayments(DEFAULT_LIABILITY_PAYMENTS);
      return DEFAULT_LIABILITY_PAYMENTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_LIABILITY_PAYMENTS;
  }
}

export function saveLocalLiabilityPayments(payments: LiabilityPayment[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.LIABILITY_PAYMENTS, JSON.stringify(payments));
  } catch (e) {
    console.error('Error saving liability payments:', e);
  }
}

export function loadLocalRecurringExpenses(): RecurringExpenseItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECURRING);
    if (!raw) {
      saveLocalRecurringExpenses(DEFAULT_RECURRING_EXPENSES);
      return DEFAULT_RECURRING_EXPENSES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_RECURRING_EXPENSES;
  }
}

export function saveLocalRecurringExpenses(items: RecurringExpenseItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving recurring expenses:', e);
  }
}

export function loadLocalTransactions(): TransactionItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (raw === null) {
      saveLocalTransactions(DEFAULT_TRANSACTIONS);
      return DEFAULT_TRANSACTIONS;
    }
    const parsed: TransactionItem[] = JSON.parse(raw);
    // If stored transactions are from old 2024 mock dates, migrate to current date default
    const isOld2024Mock =
      parsed.length > 0 &&
      parsed.every((t) => t.date.startsWith('2024-')) &&
      new Date().getFullYear() !== 2024;
    if (isOld2024Mock) {
      saveLocalTransactions(DEFAULT_TRANSACTIONS);
      return DEFAULT_TRANSACTIONS;
    }

    // Ensure sequential entry numbers are populated
    let modified = false;
    // Collect chronological sequence
    const sorted = [...parsed].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    sorted.forEach((item, idx) => {
      if (!item.entryNo) {
        item.entryNo = `TXN-${String(idx + 1).padStart(4, '0')}`;
        modified = true;
      }
    });

    if (modified) {
      saveLocalTransactions(parsed);
    }
    return parsed;
  } catch (e) {
    console.error('Error loading local transactions:', e);
    return [];
  }
}

export function saveLocalTransactions(transactions: TransactionItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.error('Error saving local transactions:', e);
  }
}

/**
 * One-time local storage cleanup script:
 * Actively detects and purges previously injected '90-Day Comprehensive Test Data'
 * or hardcoded mock fixtures on load to force returning testers into a clean, zero-balance state.
 */
export function runOneTimeTestDataPurge(): boolean {
  try {
    const PURGE_FLAG_KEY = 'axiom_test_data_purged_v3';
    if (localStorage.getItem(PURGE_FLAG_KEY) === 'true') {
      return false;
    }

    const rawTx = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const rawAssets = localStorage.getItem(STORAGE_KEYS.ASSETS);
    const rawLiab = localStorage.getItem(STORAGE_KEYS.LIABILITIES);
    const rawRec = localStorage.getItem(STORAGE_KEYS.RECURRING);
    const rawName = localStorage.getItem(STORAGE_KEYS.USER_NAME);

    const txs: TransactionItem[] = rawTx ? JSON.parse(rawTx) : [];
    const assets: AssetItem[] = rawAssets ? JSON.parse(rawAssets) : [];
    const liab: LiabilityItem[] = rawLiab ? JSON.parse(rawLiab) : [];
    const rec: RecurringExpenseItem[] = rawRec ? JSON.parse(rawRec) : [];

    const hasMockTx = txs.some(
      (t) =>
        t.id?.startsWith('mock-tx-') ||
        t.id?.startsWith('tx-') ||
        t.id?.startsWith('t-') ||
        t.name?.includes('Executive Salary') ||
        t.name?.includes('Quarterly Salary & Consulting Payout') ||
        t.name?.includes('Hybrid') ||
        t.name?.includes('Shell V-Power')
    );

    const hasMockAsset = assets.some(
      (a) =>
        a.id?.startsWith('mock-asset-') ||
        a.id?.startsWith('ast-') ||
        a.name?.includes('BPI / GCash') ||
        a.name?.includes('High-Yield Checking') ||
        a.name?.includes('COL Financial Trading Account') ||
        a.name?.includes('Hybrid Executive SUV') ||
        a.name?.includes('Toyota') ||
        a.institution?.includes('Toyota')
    );

    const hasMockLiab = liab.some(
      (l) =>
        l.id?.startsWith('mock-liab-') ||
        l.id?.startsWith('liab-') ||
        l.name?.includes('Home Mortgage') ||
        l.name?.includes('Promissory Note') ||
        l.name?.includes('Auto Hybrid Financing Loan')
    );

    const hasMockRec = rec.some(
      (r) =>
        r.id?.startsWith('mock-rec-') ||
        r.id?.startsWith('rec-') ||
        r.name?.includes('Residential Apartment Rent') ||
        r.name?.includes('Fiber Broadband')
    );

    const isDefaultName = rawName === 'Emmanuel Fajutagana' || rawName === 'Emmanuel';

    if (hasMockTx || hasMockAsset || hasMockLiab || hasMockRec || isDefaultName) {
      console.log('[Axiom Cleanup] Purging previously injected 90-day test data and mock fixtures to force clean zero state...');
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.ASSET_TXS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.LIABILITY_PAYMENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.LIABILITIES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify([]));

      if (isDefaultName) {
        localStorage.removeItem(STORAGE_KEYS.USER_NAME);
      }

      // Reset beginning balance in period
      const rawPeriod = localStorage.getItem(STORAGE_KEYS.PERIOD);
      if (rawPeriod) {
        try {
          const p = JSON.parse(rawPeriod);
          p.beginningBalance = 0;
          localStorage.setItem(STORAGE_KEYS.PERIOD, JSON.stringify(p));
        } catch {}
      }
    }

    localStorage.setItem(PURGE_FLAG_KEY, 'true');
    return true;
  } catch (err) {
    console.warn('[Axiom Cleanup] Error during state purge:', err);
    return false;
  }
}

export async function wipeAllDataToPureZero(
  userId?: string | null,
  currentPeriod?: PeriodSettings,
  currentAssets?: AssetItem[]
): Promise<{ newPeriod: PeriodSettings; newAssets: AssetItem[] }> {
  try {
    // 1. Wipe all transactions, asset txs, and liability payments from local storage
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ASSET_TXS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.LIABILITY_PAYMENTS, JSON.stringify([]));

    // 2. Explicitly wipe all logged assets and liabilities from local storage
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.LIABILITIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify([]));

    // 3. Completely zero out the beginning balance
    const basePeriod = currentPeriod || loadLocalPeriod();
    const zeroedPeriod: PeriodSettings = {
      ...basePeriod,
      beginningBalance: 0,
    };
    localStorage.setItem(STORAGE_KEYS.PERIOD, JSON.stringify(zeroedPeriod));

    const zeroedAssets: AssetItem[] = [];

    // 4. Wipe from connected Firebase Firestore database
    if (userId) {
      // Delete all transaction documents
      const txsCol = collection(db, 'users', userId, 'transactions');
      const txSnap = await getDocs(txsCol);
      if (!txSnap.empty) {
        await Promise.all(txSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)));
      }

      // Delete all asset documents
      const assetsCol = collection(db, 'users', userId, 'assets');
      const assetSnap = await getDocs(assetsCol);
      if (!assetSnap.empty) {
        await Promise.all(assetSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)));
      }

      // Delete all liability documents
      const liabCol = collection(db, 'users', userId, 'liabilities');
      const liabSnap = await getDocs(liabCol);
      if (!liabSnap.empty) {
        await Promise.all(liabSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)));
      }

      // Delete all recurring expenses
      const recCol = collection(db, 'users', userId, 'recurring_expenses');
      const recSnap = await getDocs(recCol);
      if (!recSnap.empty) {
        await Promise.all(recSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)));
      }

      // Update period settings in Firestore with beginningBalance: 0
      const periodDoc = doc(db, 'users', userId, 'settings', 'period');
      await setDoc(periodDoc, { ...zeroedPeriod, userId, updatedAt: new Date().toISOString() }, { merge: true });
    }

    return { newPeriod: zeroedPeriod, newAssets: zeroedAssets };
  } catch (err) {
    console.error('Error wiping all data to pure zero:', err);
    if (userId) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    }
    throw err;
  }
}

export async function wipeAllTransactionsFromStorageAndCloud(userId?: string | null): Promise<void> {
  await wipeAllDataToPureZero(userId);
}

export function loadLocalBudgets(): CategoryBudget[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BUDGETS);
    if (!raw) {
      saveLocalBudgets(DEFAULT_BUDGETS);
      return DEFAULT_BUDGETS;
    }
    const parsed: CategoryBudget[] = JSON.parse(raw);
    return parsed.map((b) => ({
      ...b,
      periodBudgets: b.periodBudgets || DEFAULT_BUDGETS.find((db) => db.category === b.category)?.periodBudgets || {},
    }));
  } catch {
    return DEFAULT_BUDGETS;
  }
}

export function saveLocalBudgets(budgets: CategoryBudget[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
  } catch (e) {
    console.error('Error saving budgets:', e);
  }
}

export function loadLocalPeriod(): PeriodSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PERIOD);
    if (!raw) {
      saveLocalPeriod(DEFAULT_PERIOD);
      return DEFAULT_PERIOD;
    }
    const parsed: PeriodSettings = JSON.parse(raw);
    if (
      parsed.startYear === 2024 &&
      parsed.endYear === 2024 &&
      new Date().getFullYear() !== 2024
    ) {
      saveLocalPeriod(DEFAULT_PERIOD);
      return DEFAULT_PERIOD;
    }
    return parsed;
  } catch (e) {
    console.error('Error loading local period:', e);
    return DEFAULT_PERIOD;
  }
}

export function saveLocalPeriod(period: PeriodSettings) {
  try {
    localStorage.setItem(STORAGE_KEYS.PERIOD, JSON.stringify(period));
  } catch (e) {
    console.error('Error saving local period:', e);
  }
}

// --- Firestore Sync Helpers ---

export async function syncUserDataToFirestore(
  userId: string,
  userEmail: string,
  userName: string,
  assets: AssetItem[],
  liabilities: LiabilityItem[],
  transactions: TransactionItem[],
  period: PeriodSettings
) {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        id: userId,
        email: userEmail,
        displayName: userName || 'User',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const assetsCol = collection(db, 'users', userId, 'assets');
    const existingAssets = await getDocs(assetsCol);
    if (existingAssets.empty && assets.length > 0) {
      for (const asset of assets) {
        await setDoc(doc(db, 'users', userId, 'assets', asset.id), {
          ...asset,
          userId,
        });
      }
    }

    const liabsCol = collection(db, 'users', userId, 'liabilities');
    const existingLiabs = await getDocs(liabsCol);
    if (existingLiabs.empty && liabilities.length > 0) {
      for (const liab of liabilities) {
        await setDoc(doc(db, 'users', userId, 'liabilities', liab.id), {
          ...liab,
          userId,
        });
      }
    }

    const txsCol = collection(db, 'users', userId, 'transactions');
    const existingTxs = await getDocs(txsCol);
    if (existingTxs.empty && transactions.length > 0) {
      for (const tx of transactions) {
        await setDoc(doc(db, 'users', userId, 'transactions', tx.id), {
          ...tx,
          userId,
        });
      }
    }

    const periodDoc = doc(db, 'users', userId, 'settings', 'period');
    await setDoc(periodDoc, {
      ...period,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

export function subscribeToUserAssets(
  userId: string,
  onUpdate: (assets: AssetItem[]) => void,
  onError?: (err: unknown) => void
) {
  const path = `users/${userId}/assets`;
  const assetsCol = collection(db, 'users', userId, 'assets');
  return onSnapshot(
    assetsCol,
    (snapshot) => {
      const items: AssetItem[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as AssetItem);
      });
      if (items.length > 0) {
        onUpdate(items);
        saveLocalAssets(items);
      }
    },
    (err) => {
      console.error('Assets listener error:', err);
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

export function subscribeToUserLiabilities(
  userId: string,
  onUpdate: (liabilities: LiabilityItem[]) => void,
  onError?: (err: unknown) => void
) {
  const path = `users/${userId}/liabilities`;
  const liabsCol = collection(db, 'users', userId, 'liabilities');
  return onSnapshot(
    liabsCol,
    (snapshot) => {
      const items: LiabilityItem[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as LiabilityItem);
      });
      if (items.length > 0) {
        onUpdate(items);
        saveLocalLiabilities(items);
      }
    },
    (err) => {
      console.error('Liabilities listener error:', err);
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

export async function saveAssetItemToCloud(userId: string, asset: AssetItem) {
  const path = `users/${userId}/assets/${asset.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'assets', asset.id), {
      ...asset,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteAssetItemFromCloud(userId: string, assetId: string) {
  const path = `users/${userId}/assets/${assetId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'assets', assetId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveLiabilityItemToCloud(userId: string, liability: LiabilityItem) {
  const path = `users/${userId}/liabilities/${liability.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'liabilities', liability.id), {
      ...liability,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteLiabilityItemFromCloud(userId: string, liabilityId: string) {
  const path = `users/${userId}/liabilities/${liabilityId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'liabilities', liabilityId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveTransactionItemToCloud(userId: string, tx: TransactionItem) {
  const path = `users/${userId}/transactions/${tx.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'transactions', tx.id), {
      ...tx,
      userId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteTransactionItemFromCloud(userId: string, txId: string) {
  const path = `users/${userId}/transactions/${txId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'transactions', txId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
