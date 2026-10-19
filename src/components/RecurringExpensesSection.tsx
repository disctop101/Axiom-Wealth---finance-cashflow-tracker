import React from 'react';
import {
  RecurringExpenseItem,
  PaymentMethodType,
  RecurrenceFrequency,
  formatCurrency,
} from '../types/finance';
import {
  Bell,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Edit3,
  Layers,
  Plus,
  RefreshCw,
  Trash2,
  X,
  AlertTriangle,
  Landmark,
  Wallet,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

export interface RecurringStatusItem extends RecurringExpenseItem {
  diffDays: number;
  status: 'overdue' | 'due_today' | 'almost_due' | 'upcoming';
  statusLabel: string;
}

export function computeRecurringStatus(
  item: RecurringExpenseItem,
  today: Date = new Date()
): RecurringStatusItem {
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);

  const dueDate = item.nextDueDate ? new Date(item.nextDueDate + 'T00:00:00') : new Date();
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - t.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let status: 'overdue' | 'due_today' | 'almost_due' | 'upcoming';
  let statusLabel: string;

  if (diffDays < 0) {
    status = 'overdue';
    statusLabel = `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
  } else if (diffDays === 0) {
    status = 'due_today';
    statusLabel = 'Due Today';
  } else if (diffDays <= 5) {
    status = 'almost_due';
    statusLabel = `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  } else {
    status = 'upcoming';
    statusLabel = `Due in ${diffDays} days`;
  }

  return {
    ...item,
    diffDays,
    status,
    statusLabel,
  };
}

const EXPENSE_CATEGORIES = [
  'Housing',
  'Utilities',
  'Food',
  'Transportation',
  'Entertainment',
  'Health Care',
  'Personal Care',
  'Investments',
  'Account Payables',
  'Bank Transaction',
  'Miscellaneous',
  'Real Estate/Business Expenses',
  'Savings',
];

interface PayRecurringModalProps {
  item: RecurringExpenseItem | null;
  currencySymbol: string;
  onClose: () => void;
  onConfirm: (
    id: string,
    instanceAmount: number,
    paymentMethod: PaymentMethodType,
    paidDate: string
  ) => Promise<void> | void;
}

export const PayRecurringModal: React.FC<PayRecurringModalProps> = ({
  item,
  currencySymbol,
  onClose,
  onConfirm,
}) => {
  if (!item) return null;

  const [instanceAmount, setInstanceAmount] = React.useState<number>(item.amount);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethodType>(
    item.paymentMethod || 'Cash'
  );
  const [paidDate, setPaidDate] = React.useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (instanceAmount <= 0) return;
    try {
      setIsSubmitting(true);
      await onConfirm(item.id, instanceAmount, paymentMethod, paidDate);
      onClose();
    } catch (err) {
      console.error('Failed to log recurring payment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAmountAdjusted = instanceAmount !== item.amount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-neutral-100 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-800/90 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-950/80 border border-emerald-600 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Record Bill Payment</h3>
              <p className="text-[10px] text-neutral-400">
                Scheduled: {item.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {/* Master Cap Info Box */}
          <div className="bg-neutral-800/60 border border-neutral-700 p-2.5 rounded flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold block">
                Master Schedule Cap
              </span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {formatCurrency(item.amount, currencySymbol)}
              </span>
              <span className="text-[10px] text-neutral-400 capitalize ml-1.5">
                ({item.frequency})
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold block">
                Category
              </span>
              <span className="text-neutral-200 font-medium">
                {item.category}
              </span>
            </div>
          </div>

          {/* Instance Payment Amount (Editable Override) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-neutral-200">
                Actual Payment Amount ({currencySymbol})
              </label>
              {isAmountAdjusted && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-800">
                  Adjusted for this cycle
                </span>
              )}
            </div>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={instanceAmount || ''}
              onChange={(e) => setInstanceAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-neutral-950 border border-neutral-700 focus:border-emerald-500 rounded px-3 py-2 text-sm font-mono text-white focus:outline-hidden"
              placeholder="0.00"
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              💡 You can freely adjust this cycle's bill (e.g. higher utility usage). The master recurring schedule remains protected at {formatCurrency(item.amount, currencySymbol)}.
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-200 mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['Cash', 'Card', 'Bank Transfer'] as PaymentMethodType[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-1.5 px-2 rounded border text-center font-medium transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    paymentMethod === method
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {method === 'Cash' && <Wallet className="w-3.5 h-3.5" />}
                  {method === 'Card' && <CreditCard className="w-3.5 h-3.5" />}
                  {method === 'Bank Transfer' && <Landmark className="w-3.5 h-3.5" />}
                  <span className="text-[10px]">{method}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-200 mb-1">
              Payment Date
            </label>
            <input
              type="date"
              required
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 focus:border-emerald-500 rounded px-2.5 py-1.5 text-xs text-white focus:outline-hidden"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || instanceAmount <= 0}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Logging...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Log Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface RecurringManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurringExpenses: RecurringExpenseItem[];
  currencySymbol: string;
  onPay: (item: RecurringExpenseItem) => void;
  onAdd: (item: Omit<RecurringExpenseItem, 'id'>) => void;
  onUpdate: (item: RecurringExpenseItem) => void;
  onDelete: (id: string) => void;
}

export const RecurringManagerModal: React.FC<RecurringManagerModalProps> = ({
  isOpen,
  onClose,
  recurringExpenses,
  currencySymbol,
  onPay,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [isAddingNew, setIsAddingNew] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // New item form state
  const [formName, setFormName] = React.useState('');
  const [formCategory, setFormCategory] = React.useState('Utilities');
  const [formAmount, setFormAmount] = React.useState<number>(0);
  const [formFrequency, setFormFrequency] = React.useState<RecurrenceFrequency>('monthly');
  const [formDueDate, setFormDueDate] = React.useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [formPaymentMethod, setFormPaymentMethod] = React.useState<PaymentMethodType>('Cash');
  const [formNotes, setFormNotes] = React.useState('');

  const resetForm = () => {
    setFormName('');
    setFormCategory('Utilities');
    setFormAmount(0);
    setFormFrequency('monthly');
    setFormDueDate(new Date().toISOString().split('T')[0]);
    setFormPaymentMethod('Cash');
    setFormNotes('');
    setIsAddingNew(false);
    setEditingId(null);
  };

  const handleStartEdit = (item: RecurringExpenseItem) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormAmount(item.amount);
    setFormFrequency(item.frequency);
    setFormDueDate(item.nextDueDate || new Date().toISOString().split('T')[0]);
    setFormPaymentMethod(item.paymentMethod || 'Cash');
    setFormNotes(item.notes || '');
    setIsAddingNew(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formAmount <= 0) return;

    if (editingId) {
      const existing = recurringExpenses.find((r) => r.id === editingId);
      if (existing) {
        onUpdate({
          ...existing,
          name: formName.trim(),
          category: formCategory,
          amount: formAmount,
          frequency: formFrequency,
          nextDueDate: formDueDate,
          paymentMethod: formPaymentMethod,
          notes: formNotes.trim(),
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      onAdd({
        name: formName.trim(),
        category: formCategory,
        subCategory: 'fixed',
        amount: formAmount,
        frequency: formFrequency,
        startDate: formDueDate,
        nextDueDate: formDueDate,
        paymentMethod: formPaymentMethod,
        notes: formNotes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-neutral-100 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-800/90 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-950/80 border border-blue-600 flex items-center justify-center text-blue-400">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Recurring Expenses Engine</h3>
              <p className="text-[10px] text-neutral-400">
                Manage scheduled recurring bills, subscriptions &amp; automated commitments
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-neutral-400 hover:text-white p-1 rounded transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Add / Edit Form Toggle */}
          {!isAddingNew ? (
            <div className="flex items-center justify-between bg-neutral-800/50 p-3 rounded border border-neutral-700">
              <div>
                <span className="font-bold text-neutral-200 block text-xs">
                  Active Recurring Schedules ({recurringExpenses.length})
                </span>
                <span className="text-[10px] text-neutral-400">
                  Daily, weekly, monthly, and yearly recurring budget obligations
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsAddingNew(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Schedule</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="bg-neutral-800/80 border border-blue-600/60 p-3.5 rounded-lg space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-700 pb-2">
                <span className="font-bold text-xs text-blue-300">
                  {editingId ? 'Edit Recurring Schedule' : 'New Recurring Schedule'}
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-neutral-400 hover:text-white text-[11px]"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-300 mb-0.5">
                    Schedule Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Meralco Electric, Fiber Internet, Netflix"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-300 mb-0.5">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-300 mb-0.5">
                    Master Scheduled Amount ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    value={formAmount || ''}
                    onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-300 mb-0.5">
                    Recurrence Frequency *
                  </label>
                  <select
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value as RecurrenceFrequency)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-300 mb-0.5">
                    Next Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-300 mb-0.5">
                    Preferred Payment Method
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value as PaymentMethodType)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-300 mb-0.5">
                    Notes / Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. Account number, billing cycle notes"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-700">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  {editingId ? 'Update Schedule' : 'Save Schedule'}
                </button>
              </div>
            </form>
          )}

          {/* List of Recurring Items */}
          <div className="space-y-2">
            {recurringExpenses.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No recurring schedules registered yet.</p>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="mt-2 text-blue-400 font-semibold underline text-xs cursor-pointer"
                >
                  Create your first schedule
                </button>
              </div>
            ) : (
              recurringExpenses.map((item) => {
                const statusInfo = computeRecurringStatus(item);
                const isOverdue = statusInfo.status === 'overdue';
                const isDueToday = statusInfo.status === 'due_today';
                const isAlmostDue = statusInfo.status === 'almost_due';

                return (
                  <div
                    key={item.id}
                    className="bg-neutral-800/70 border border-neutral-700 hover:border-neutral-600 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-xs">
                          {item.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300">
                          {item.category}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800 capitalize font-medium">
                          {item.frequency}
                        </span>
                        {/* Due Badge */}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                            isOverdue
                              ? 'bg-red-950 text-red-300 border-red-700 animate-pulse'
                              : isDueToday
                              ? 'bg-amber-950 text-amber-300 border-amber-700'
                              : isAlmostDue
                              ? 'bg-yellow-950 text-yellow-300 border-yellow-700'
                              : 'bg-neutral-900 text-neutral-400 border-neutral-700'
                          }`}
                        >
                          {statusInfo.statusLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-neutral-400 flex-wrap">
                        <span>
                          Next Due:{' '}
                          <span className="text-neutral-200 font-mono font-medium">
                            {item.nextDueDate}
                          </span>
                        </span>
                        {item.paymentMethod && (
                          <span>
                            Method: <span className="text-neutral-300">{item.paymentMethod}</span>
                          </span>
                        )}
                        {item.lastPaidDate && (
                          <span className="text-emerald-400">
                            Last paid: {item.lastPaidDate}
                            {item.lastPaidAmount !== undefined && (
                              <> ({formatCurrency(item.lastPaidAmount, currencySymbol)})</>
                            )}
                          </span>
                        )}
                        {item.notes && <span className="italic">"{item.notes}"</span>}
                      </div>
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-700/60">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-neutral-400 block uppercase tracking-wider font-semibold">
                          Scheduled
                        </span>
                        <span className="font-mono font-bold text-white text-sm">
                          {formatCurrency(item.amount, currencySymbol)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onPay(item);
                          }}
                          className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                          title="Record bill payment with customizable instance amount"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Pay</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded transition cursor-pointer"
                          title="Edit schedule details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          className="p-1.5 bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 rounded transition cursor-pointer"
                          title="Delete recurring schedule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface RecurringAlertsSectionProps {
  recurringExpenses?: RecurringExpenseItem[];
  currencySymbol: string;
  onPayRecurringExpense?: (
    id: string,
    instanceAmount: number,
    paymentMethod?: PaymentMethodType,
    paidDate?: string
  ) => Promise<void> | void;
  onAddRecurringExpense?: (item: Omit<RecurringExpenseItem, 'id'>) => void;
  onUpdateRecurringExpense?: (item: RecurringExpenseItem) => void;
  onDeleteRecurringExpense?: (id: string) => void;
  variant?: 'mobile' | 'desktop';
}

export const RecurringAlertsSection: React.FC<RecurringAlertsSectionProps> = ({
  recurringExpenses = [],
  currencySymbol,
  onPayRecurringExpense,
  onAddRecurringExpense,
  onUpdateRecurringExpense,
  onDeleteRecurringExpense,
  variant = 'mobile',
}) => {
  const [selectedPayItem, setSelectedPayItem] = React.useState<RecurringExpenseItem | null>(null);
  const [isManagerOpen, setIsManagerOpen] = React.useState(false);

  // Compute status for all recurring expenses
  const today = React.useMemo(() => new Date(), []);
  const allWithStatus = React.useMemo(() => {
    return recurringExpenses.map((item) => computeRecurringStatus(item, today));
  }, [recurringExpenses, today]);

  // Urgent items: overdue (diffDays < 0), due today (diffDays === 0), almost due (1 <= diffDays <= 5)
  const urgentItems = React.useMemo(() => {
    return allWithStatus
      .filter((item) => item.diffDays <= 5)
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [allWithStatus]);

  const overdueCount = urgentItems.filter((i) => i.status === 'overdue').length;
  const dueTodayCount = urgentItems.filter((i) => i.status === 'due_today').length;
  const almostDueCount = urgentItems.filter((i) => i.status === 'almost_due').length;

  const handleConfirmPay = async (
    id: string,
    instanceAmount: number,
    paymentMethod: PaymentMethodType,
    paidDate: string
  ) => {
    if (onPayRecurringExpense) {
      await onPayRecurringExpense(id, instanceAmount, paymentMethod, paidDate);
    }
  };

  return (
    <>
      {/* Pay Modal */}
      {selectedPayItem && (
        <PayRecurringModal
          item={selectedPayItem}
          currencySymbol={currencySymbol}
          onClose={() => setSelectedPayItem(null)}
          onConfirm={handleConfirmPay}
        />
      )}

      {/* Schedule Manager Modal */}
      <RecurringManagerModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        recurringExpenses={recurringExpenses}
        currencySymbol={currencySymbol}
        onPay={(item) => setSelectedPayItem(item)}
        onAdd={(item) => onAddRecurringExpense && onAddRecurringExpense(item)}
        onUpdate={(item) => onUpdateRecurringExpense && onUpdateRecurringExpense(item)}
        onDelete={(id) => onDeleteRecurringExpense && onDeleteRecurringExpense(id)}
      />

      {/* Render Urgent Notification Cards or Schedule Widget */}
      {urgentItems.length > 0 ? (
        <div
          className={`border rounded-lg shadow-sm overflow-hidden text-xs ${
            overdueCount > 0
              ? 'bg-red-950/20 border-red-800/80'
              : dueTodayCount > 0
              ? 'bg-amber-950/20 border-amber-800/80'
              : 'bg-yellow-950/20 border-yellow-800/70'
          }`}
        >
          {/* Alert Header */}
          <div
            className={`px-3 py-2 border-b flex items-center justify-between ${
              overdueCount > 0
                ? 'bg-red-950/80 border-red-800 text-red-200'
                : dueTodayCount > 0
                ? 'bg-amber-950/80 border-amber-800 text-amber-200'
                : 'bg-yellow-950/80 border-yellow-800 text-yellow-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 animate-pulse" />
              <span className="font-bold text-xs">
                Recurring Bills Due &amp; Almost Due ({urgentItems.length})
              </span>
              <div className="flex items-center gap-1 text-[10px]">
                {overdueCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-red-600 text-white rounded-full font-bold">
                    {overdueCount} Overdue
                  </span>
                )}
                {dueTodayCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-600 text-white rounded-full font-bold">
                    {dueTodayCount} Today
                  </span>
                )}
                {almostDueCount > 0 && (
                  <span className="px-1.5 py-0.2 bg-yellow-600 text-neutral-900 rounded-full font-bold">
                    {almostDueCount} in &le;5d
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsManagerOpen(true)}
              className="text-[11px] underline hover:text-white transition cursor-pointer"
            >
              Manage Schedules ({recurringExpenses.length})
            </button>
          </div>

          {/* Urgent Items List */}
          <div className="divide-y divide-neutral-700/40 p-2 space-y-1.5">
            {urgentItems.map((item) => {
              const isOverdue = item.status === 'overdue';
              const isDueToday = item.status === 'due_today';

              return (
                <div
                  key={item.id}
                  className="bg-neutral-900/80 p-2.5 rounded border border-neutral-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-start sm:items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-full mt-0.5 sm:mt-0 ${
                        isOverdue
                          ? 'bg-red-950 text-red-400 border border-red-700'
                          : isDueToday
                          ? 'bg-amber-950 text-amber-400 border border-amber-700'
                          : 'bg-yellow-950 text-yellow-400 border border-yellow-700'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white text-xs">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          ({item.category})
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-tight ${
                            isOverdue
                              ? 'bg-red-900/90 text-red-200'
                              : isDueToday
                              ? 'bg-amber-900/90 text-amber-200'
                              : 'bg-yellow-900/80 text-yellow-200'
                          }`}
                        >
                          {item.statusLabel}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-400 flex items-center gap-2 mt-0.5">
                        <span>
                          Due date:{' '}
                          <span className="text-neutral-300 font-mono font-medium">
                            {item.nextDueDate}
                          </span>
                        </span>
                        <span>·</span>
                        <span className="capitalize">{item.frequency}</span>
                        {item.paymentMethod && (
                          <>
                            <span>·</span>
                            <span>{item.paymentMethod}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount & Direct Pay Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-neutral-800">
                    <div className="text-left sm:text-right">
                      <span className="text-[9px] text-neutral-400 block uppercase tracking-wider font-semibold">
                        Scheduled Master
                      </span>
                      <span className="font-mono font-bold text-white text-xs sm:text-sm">
                        {formatCurrency(item.amount, currencySymbol)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPayItem(item)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <DollarSign className="w-3 h-3" />
                      <span>Pay</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* If no urgent items, render clean summary card with shortcut to manager */
        <div className="bg-neutral-800/40 border border-neutral-700/60 rounded p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="font-semibold text-neutral-200">
                Recurring Schedules: All bills up to date
              </span>
              <span className="text-[10px] text-neutral-400 block">
                {recurringExpenses.length} recurring schedules active · No payments due within 5 days
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsManagerOpen(true)}
            className="px-2.5 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded text-[11px] font-semibold transition cursor-pointer"
          >
            Manage ({recurringExpenses.length})
          </button>
        </div>
      )}
    </>
  );
};

export interface RecurringExpensesModuleProps {
  recurringExpenses?: RecurringExpenseItem[];
  currencySymbol: string;
  onPayRecurringExpense?: (
    id: string,
    instanceAmount: number,
    paymentMethod?: PaymentMethodType,
    paidDate?: string
  ) => Promise<void> | void;
  onAddRecurringExpense?: (item: Omit<RecurringExpenseItem, 'id'>) => void;
  onUpdateRecurringExpense?: (item: RecurringExpenseItem) => void;
  onDeleteRecurringExpense?: (id: string) => void;
}

export const RecurringExpensesModule: React.FC<RecurringExpensesModuleProps> = ({
  recurringExpenses = [],
  currencySymbol,
  onPayRecurringExpense,
  onAddRecurringExpense,
  onUpdateRecurringExpense,
  onDeleteRecurringExpense,
}) => {
  const [selectedPayItem, setSelectedPayItem] = React.useState<RecurringExpenseItem | null>(null);
  const [isAddingNew, setIsAddingNew] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Form states
  const [formName, setFormName] = React.useState('');
  const [formCategory, setFormCategory] = React.useState('Utilities');
  const [formAmount, setFormAmount] = React.useState<number>(0);
  const [formFrequency, setFormFrequency] = React.useState<RecurrenceFrequency>('monthly');
  const [formDueDate, setFormDueDate] = React.useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [formPaymentMethod, setFormPaymentMethod] = React.useState<PaymentMethodType>('Cash');
  const [formNotes, setFormNotes] = React.useState('');

  const resetForm = () => {
    setFormName('');
    setFormCategory('Utilities');
    setFormAmount(0);
    setFormFrequency('monthly');
    setFormDueDate(new Date().toISOString().split('T')[0]);
    setFormPaymentMethod('Cash');
    setFormNotes('');
    setIsAddingNew(false);
    setEditingId(null);
  };

  const handleStartEdit = (item: RecurringExpenseItem) => {
    setEditingId(item.id);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormAmount(item.amount);
    setFormFrequency(item.frequency);
    setFormDueDate(item.nextDueDate || new Date().toISOString().split('T')[0]);
    setFormPaymentMethod(item.paymentMethod || 'Cash');
    setFormNotes(item.notes || '');
    setIsAddingNew(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formAmount <= 0) return;

    if (editingId) {
      const existing = recurringExpenses.find((r) => r.id === editingId);
      if (existing && onUpdateRecurringExpense) {
        onUpdateRecurringExpense({
          ...existing,
          name: formName.trim(),
          category: formCategory,
          amount: formAmount,
          frequency: formFrequency,
          nextDueDate: formDueDate,
          paymentMethod: formPaymentMethod,
          notes: formNotes.trim(),
          updatedAt: new Date().toISOString(),
        });
      }
    } else if (onAddRecurringExpense) {
      onAddRecurringExpense({
        name: formName.trim(),
        category: formCategory,
        subCategory: 'fixed',
        amount: formAmount,
        frequency: formFrequency,
        startDate: formDueDate,
        nextDueDate: formDueDate,
        paymentMethod: formPaymentMethod,
        notes: formNotes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    resetForm();
  };

  const handleConfirmPay = async (
    id: string,
    instanceAmount: number,
    paymentMethod: PaymentMethodType,
    paidDate: string
  ) => {
    if (onPayRecurringExpense) {
      await onPayRecurringExpense(id, instanceAmount, paymentMethod, paidDate);
    }
  };

  return (
    <div className="bg-white border border-neutral-300 shadow-xs rounded-xs overflow-hidden text-xs">
      {/* Header */}
      <div className="bg-[#2d3134] text-white p-3 flex items-center justify-between border-b border-neutral-700">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-emerald-400" />
          <div>
            <h2 className="font-bold text-sm tracking-wide">Recurring Expenses Engine</h2>
            <p className="text-[10px] text-neutral-300 font-mono">
              Manage scheduled recurring obligations, automated commitments &amp; bill cycles
            </p>
          </div>
        </div>
        {!isAddingNew && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsAddingNew(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Schedule</span>
          </button>
        )}
      </div>

      {/* Pay Modal */}
      {selectedPayItem && (
        <PayRecurringModal
          item={selectedPayItem}
          currencySymbol={currencySymbol}
          onClose={() => setSelectedPayItem(null)}
          onConfirm={handleConfirmPay}
        />
      )}

      <div className="p-4 space-y-4">
        {/* Add / Edit Form */}
        {isAddingNew && (
          <form onSubmit={handleSave} className="bg-neutral-50 border-2 border-emerald-500/60 p-3.5 rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <span className="font-bold text-xs text-neutral-800 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-emerald-600" />
                {editingId ? 'Edit Recurring Schedule' : 'New Recurring Schedule'}
              </span>
              <button
                type="button"
                onClick={resetForm}
                className="text-neutral-500 hover:text-neutral-800 text-[11px] underline cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-0.5">
                  Schedule Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Apartment Rent, Internet, Electric Utility"
                  className="w-full bg-white border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-0.5">
                  Category *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-0.5">
                  Master Amount ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={formAmount || ''}
                  onChange={(e) => setFormAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-white border border-neutral-300 rounded px-2.5 py-1.5 text-xs font-mono text-neutral-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-0.5">
                  Frequency *
                </label>
                <select
                  value={formFrequency}
                  onChange={(e) => setFormFrequency(e.target.value as RecurrenceFrequency)}
                  className="w-full bg-white border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-0.5">
                  Next Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-0.5">
                  Payment Method
                </label>
                <select
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value as PaymentMethodType)}
                  className="w-full bg-white border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-0.5">
                  Notes / Reference (Optional)
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Account number, billing reference"
                  className="w-full bg-white border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {editingId ? 'Update Schedule' : 'Save Schedule'}
              </button>
            </div>
          </form>
        )}

        {/* List of Recurring Schedules */}
        <div className="space-y-2">
          {recurringExpenses.length === 0 ? (
            <div className="text-center py-8 text-neutral-400">
              <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-40 text-neutral-500" />
              <p>No recurring schedules registered yet.</p>
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="mt-2 text-emerald-600 font-semibold underline text-xs cursor-pointer"
              >
                Create your first recurring schedule
              </button>
            </div>
          ) : (
            recurringExpenses.map((item) => {
              const statusInfo = computeRecurringStatus(item);
              const isOverdue = statusInfo.status === 'overdue';
              const isDueToday = statusInfo.status === 'due_today';
              const isAlmostDue = statusInfo.status === 'almost_due';

              return (
                <div
                  key={item.id}
                  className="bg-neutral-50 border border-neutral-200 hover:border-neutral-300 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-neutral-900 text-xs">
                        {item.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-200 text-neutral-700 font-medium">
                        {item.category}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 capitalize font-medium">
                        {item.frequency}
                      </span>
                      {/* Due Status Badge */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                          isOverdue
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : isDueToday
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : isAlmostDue
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                            : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                        }`}
                      >
                        {statusInfo.statusLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-neutral-500 flex-wrap">
                      <span>
                        Next Due:{' '}
                        <span className="text-neutral-800 font-mono font-medium">
                          {item.nextDueDate}
                        </span>
                      </span>
                      {item.paymentMethod && (
                        <span>
                          Method: <span className="text-neutral-700 font-medium">{item.paymentMethod}</span>
                        </span>
                      )}
                      {item.lastPaidDate && (
                        <span className="text-emerald-700 font-medium">
                          Last paid: {item.lastPaidDate}
                          {item.lastPaidAmount !== undefined && (
                            <> ({formatCurrency(item.lastPaidAmount, currencySymbol)})</>
                          )}
                        </span>
                      )}
                      {item.notes && <span className="italic">"{item.notes}"</span>}
                    </div>
                  </div>

                  {/* Actions & Amount */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-200">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-neutral-400 block uppercase tracking-wider font-semibold">
                        Scheduled
                      </span>
                      <span className="font-mono font-bold text-neutral-900 text-sm">
                        {formatCurrency(item.amount, currencySymbol)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedPayItem(item)}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                        title="Record payment with customizable instance amount"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Pay</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded transition cursor-pointer"
                        title="Edit schedule details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {onDeleteRecurringExpense && (
                        <button
                          type="button"
                          onClick={() => onDeleteRecurringExpense(item.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded transition cursor-pointer"
                          title="Delete recurring schedule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

