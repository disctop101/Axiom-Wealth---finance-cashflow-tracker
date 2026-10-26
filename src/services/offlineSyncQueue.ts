import { db } from '../firebase';
import {
  collection,
  getDocs,
  getDocsFromServer,
  doc,
  getDoc,
  getDocFromServer,
} from 'firebase/firestore';
import {
  AssetItem,
  LiabilityItem,
  TransactionItem,
  CategoryBudget,
  PeriodSettings,
  AssetTransaction,
  LiabilityPayment,
  RecurringExpenseItem,
} from '../types/finance';
import {
  saveTransactionItemToCloud,
  deleteTransactionItemFromCloud,
  saveAssetItemToCloud,
  deleteAssetItemFromCloud,
  saveLiabilityItemToCloud,
  deleteLiabilityItemFromCloud,
  saveBudgetsToCloud,
  savePeriodToCloud,
  saveAssetTransactionToCloud,
  deleteAssetTransactionFromCloud,
  saveLiabilityPaymentToCloud,
  deleteLiabilityPaymentFromCloud,
  saveRecurringExpenseToCloud,
  deleteRecurringExpenseFromCloud,
  saveUserCache,
  restoreAccountDataToFirestore,
} from './storage';
import { BackupPayload } from './backupRestore';

export interface QueuedOfflineAction {
  id: string;
  userId: string;
  timestamp: string;
  entity:
    | 'transaction'
    | 'asset'
    | 'liability'
    | 'budget'
    | 'period'
    | 'asset_tx'
    | 'liability_payment'
    | 'recurring';
  actionType: 'save' | 'delete';
  entityId?: string;
  payload?: any;
}

const QUEUE_KEY_PREFIX = 'axiom_offline_queue_';
const LAST_SYNCED_PREFIX = 'axiom_last_synced_';

export function getQueueKey(userId: string): string {
  return `${QUEUE_KEY_PREFIX}${userId}`;
}

export function getLastSyncedKey(userId: string): string {
  return `${LAST_SYNCED_PREFIX}${userId}`;
}

/**
 * Retrieve the current pending offline actions queue for a user
 */
export function getOfflineQueue(userId: string): QueuedOfflineAction[] {
  try {
    const raw = localStorage.getItem(getQueueKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[OfflineQueue] Error reading offline queue:', err);
    return [];
  }
}

/**
 * Enqueue a mutation action to be synced when online connectivity is restored
 */
export function enqueueOfflineAction(
  action: Omit<QueuedOfflineAction, 'id' | 'timestamp'>
): QueuedOfflineAction {
  const queuedItem: QueuedOfflineAction = {
    ...action,
    id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    const current = getOfflineQueue(action.userId);
    const updated = [...current, queuedItem];
    localStorage.setItem(getQueueKey(action.userId), JSON.stringify(updated));
    console.log(`[OfflineQueue] Enqueued ${action.actionType} on ${action.entity}:`, queuedItem.id);

    // Notify listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('axiom_offline_queue_changed', {
          detail: { userId: action.userId, count: updated.length },
        })
      );
    }
  } catch (err) {
    console.error('[OfflineQueue] Failed to enqueue offline action:', err);
  }

  return queuedItem;
}

/**
 * Remove an action from the offline queue once it has synced successfully
 */
export function removeOfflineAction(userId: string, actionId: string): void {
  try {
    const current = getOfflineQueue(userId);
    const updated = current.filter((item) => item.id !== actionId);
    localStorage.setItem(getQueueKey(userId), JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('axiom_offline_queue_changed', {
          detail: { userId, count: updated.length },
        })
      );
    }
  } catch (err) {
    console.error('[OfflineQueue] Failed to remove offline action:', err);
  }
}

/**
 * Clear all pending actions in the offline queue for a user
 */
export function clearOfflineQueue(userId: string): void {
  try {
    localStorage.removeItem(getQueueKey(userId));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('axiom_offline_queue_changed', {
          detail: { userId, count: 0 },
        })
      );
    }
  } catch (err) {
    console.error('[OfflineQueue] Failed to clear offline queue:', err);
  }
}

/**
 * Process all queued offline actions in sequential order and commit them to Firestore
 */
export async function processOfflineQueue(
  userId: string
): Promise<{ processed: number; remaining: number }> {
  if (!navigator.onLine) {
    console.log('[OfflineQueue] Device is currently offline. Skipping queue processing.');
    return { processed: 0, remaining: getOfflineQueue(userId).length };
  }

  const queue = getOfflineQueue(userId);
  if (queue.length === 0) {
    return { processed: 0, remaining: 0 };
  }

  console.log(`[OfflineQueue] Processing ${queue.length} pending offline actions for ${userId}...`);
  let processed = 0;

  for (const item of queue) {
    try {
      if (item.actionType === 'save') {
        switch (item.entity) {
          case 'transaction':
            await saveTransactionItemToCloud(userId, item.payload);
            break;
          case 'asset':
            await saveAssetItemToCloud(userId, item.payload);
            break;
          case 'liability':
            await saveLiabilityItemToCloud(userId, item.payload);
            break;
          case 'budget':
            await saveBudgetsToCloud(userId, item.payload);
            break;
          case 'period':
            await savePeriodToCloud(userId, item.payload);
            break;
          case 'asset_tx':
            await saveAssetTransactionToCloud(userId, item.payload);
            break;
          case 'liability_payment':
            await saveLiabilityPaymentToCloud(userId, item.payload);
            break;
          case 'recurring':
            await saveRecurringExpenseToCloud(userId, item.payload);
            break;
        }
      } else if (item.actionType === 'delete' && item.entityId) {
        switch (item.entity) {
          case 'transaction':
            await deleteTransactionItemFromCloud(userId, item.entityId);
            break;
          case 'asset':
            await deleteAssetItemFromCloud(userId, item.entityId);
            break;
          case 'liability':
            await deleteLiabilityItemFromCloud(userId, item.entityId);
            break;
          case 'asset_tx':
            await deleteAssetTransactionFromCloud(userId, item.entityId);
            break;
          case 'liability_payment':
            await deleteLiabilityPaymentFromCloud(userId, item.entityId);
            break;
          case 'recurring':
            await deleteRecurringExpenseFromCloud(userId, item.entityId);
            break;
        }
      }

      // Successfully processed item
      removeOfflineAction(userId, item.id);
      processed++;
    } catch (err) {
      console.error(`[OfflineQueue] Error executing action ${item.id} (${item.entity}):`, err);
      // If we failed due to connectivity, break early to preserve ordering
      if (!navigator.onLine) {
        break;
      }
    }
  }

  const remaining = getOfflineQueue(userId).length;
  console.log(`[OfflineQueue] Finished processing. Processed: ${processed}, Remaining: ${remaining}`);
  return { processed, remaining };
}

/**
 * Get the ISO timestamp of the last successful sync
 */
export function getLastSyncedTime(userId: string): string | null {
  try {
    return localStorage.getItem(getLastSyncedKey(userId));
  } catch {
    return null;
  }
}

export function setLastSyncedTime(userId: string, timestamp?: string): void {
  try {
    const time = timestamp || new Date().toISOString();
    localStorage.setItem(getLastSyncedKey(userId), time);
  } catch {}
}

/**
 * Push Local to Cloud:
 * Uploads all local ledger records and flushes offline mutations directly to Firestore.
 */
export async function pushLocalLedgerToCloud(
  userId: string,
  data: {
    transactions: TransactionItem[];
    assets: AssetItem[];
    liabilities: LiabilityItem[];
    budgets: CategoryBudget[];
    period: PeriodSettings;
    assetTransactions: AssetTransaction[];
    liabilityPayments: LiabilityPayment[];
    recurringExpenses: RecurringExpenseItem[];
  }
): Promise<{
  success: boolean;
  message: string;
  syncedCount: {
    transactions: number;
    assets: number;
    liabilities: number;
    budgets: number;
  };
}> {
  if (!navigator.onLine) {
    throw new Error('Device is offline. Connect to the internet to push changes to the cloud.');
  }

  // 1. Process any pending queue items first
  await processOfflineQueue(userId);

  // 2. Prepare payload for cloud restoration
  const payload: BackupPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    source: 'Axiom Wealth Push',
    userId,
    transactions: data.transactions,
    assets: data.assets,
    liabilities: data.liabilities,
    budgets: data.budgets,
    period: data.period,
    assetTransactions: data.assetTransactions,
    liabilityPayments: data.liabilityPayments,
    recurringExpenses: data.recurringExpenses,
  };

  // 3. Upsert into Firestore using merge mode
  const result = await restoreAccountDataToFirestore(userId, payload, 'merge');

  // 4. Update sync timestamp and clear queue
  setLastSyncedTime(userId);
  clearOfflineQueue(userId);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('axiom_sync_completed', { detail: { type: 'push' } }));
  }

  return {
    success: true,
    message: `Pushed ${result.restoredTxs} transactions, ${result.restoredAssets} assets, and ${result.restoredLiabilities} liabilities to Cloud Firestore.`,
    syncedCount: {
      transactions: result.restoredTxs,
      assets: result.restoredAssets,
      liabilities: result.restoredLiabilities,
      budgets: result.restoredBudgets,
    },
  };
}

/**
 * Pull Cloud to Local:
 * Fetches the latest live records from Cloud Firestore and updates local in-memory & cache state.
 */
export async function pullCloudLedgerToLocal(
  userId: string
): Promise<{
  success: boolean;
  message: string;
  data: {
    transactions: TransactionItem[];
    assets: AssetItem[];
    liabilities: LiabilityItem[];
    budgets: CategoryBudget[];
    period: PeriodSettings;
    assetTransactions: AssetTransaction[];
    liabilityPayments: LiabilityPayment[];
    recurringExpenses: RecurringExpenseItem[];
  };
}> {
  if (!navigator.onLine) {
    throw new Error('Device is offline. Connect to the internet to pull the latest cloud snapshot.');
  }

  const fetchCollection = async (colName: string) => {
    const colRef = collection(db, 'users', userId, colName);
    try {
      return await getDocsFromServer(colRef);
    } catch {
      return await getDocs(colRef);
    }
  };

  // Fetch all 8 collections/docs in parallel from Firestore
  const [
    txSnap,
    assetSnap,
    liabSnap,
    budgetSnap,
    atxSnap,
    lpaySnap,
    recSnap,
  ] = await Promise.all([
    fetchCollection('transactions'),
    fetchCollection('assets'),
    fetchCollection('liabilities'),
    fetchCollection('budgets'),
    fetchCollection('asset_transactions'),
    fetchCollection('liability_payments'),
    fetchCollection('recurring_expenses'),
  ]);

  // Fetch period document from settings/period
  let remotePeriod: PeriodSettings = {
    startMonth: '01',
    startYear: 2024,
    endMonth: '12',
    endYear: 2024,
    beginningBalance: 0,
  };

  try {
    const periodDocRef = doc(db, 'users', userId, 'settings', 'period');
    let periodDocSnap;
    try {
      periodDocSnap = await getDocFromServer(periodDocRef);
    } catch {
      periodDocSnap = await getDoc(periodDocRef);
    }
    if (periodDocSnap.exists()) {
      remotePeriod = periodDocSnap.data() as PeriodSettings;
    }
  } catch (e) {
    console.warn('[OfflineQueue] Using default period during pull:', e);
  }

  const transactions: TransactionItem[] = [];
  txSnap.forEach((d) => transactions.push(d.data() as TransactionItem));
  transactions.sort((a, b) => b.date.localeCompare(a.date));

  const assets: AssetItem[] = [];
  assetSnap.forEach((d) => assets.push(d.data() as AssetItem));

  const liabilities: LiabilityItem[] = [];
  liabSnap.forEach((d) => liabilities.push(d.data() as LiabilityItem));

  const budgets: CategoryBudget[] = [];
  budgetSnap.forEach((d) => budgets.push(d.data() as CategoryBudget));

  const assetTransactions: AssetTransaction[] = [];
  atxSnap.forEach((d) => assetTransactions.push(d.data() as AssetTransaction));
  assetTransactions.sort((a, b) => b.date.localeCompare(a.date));

  const liabilityPayments: LiabilityPayment[] = [];
  lpaySnap.forEach((d) => liabilityPayments.push(d.data() as LiabilityPayment));
  liabilityPayments.sort((a, b) => b.date.localeCompare(a.date));

  const recurringExpenses: RecurringExpenseItem[] = [];
  recSnap.forEach((d) => recurringExpenses.push(d.data() as RecurringExpenseItem));
  recurringExpenses.sort((a, b) => (a.nextDueDate || '').localeCompare(b.nextDueDate || ''));

  // Update user-scoped local cache
  saveUserCache(userId, 'transactions', transactions);
  saveUserCache(userId, 'assets', assets);
  saveUserCache(userId, 'liabilities', liabilities);
  saveUserCache(userId, 'budgets', budgets);
  saveUserCache(userId, 'period', remotePeriod);
  saveUserCache(userId, 'asset_txs', assetTransactions);
  saveUserCache(userId, 'liab_payments', liabilityPayments);
  saveUserCache(userId, 'recurring', recurringExpenses);

  setLastSyncedTime(userId);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('axiom_sync_completed', { detail: { type: 'pull' } }));
  }

  return {
    success: true,
    message: `Pulled ${transactions.length} transactions, ${assets.length} assets, and ${liabilities.length} liabilities from Cloud Firestore.`,
    data: {
      transactions,
      assets,
      liabilities,
      budgets,
      period: remotePeriod,
      assetTransactions,
      liabilityPayments,
      recurringExpenses,
    },
  };
}
