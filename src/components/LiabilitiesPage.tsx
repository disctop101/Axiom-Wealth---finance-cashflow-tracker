import React, { useState, useMemo } from 'react';
import {
  LiabilityCategory,
  LiabilityItem,
  LiabilityPayment,
  LiabilityPaymentFrequency,
  LiabilityPurpose,
  formatCurrency,
} from '../types/finance';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Home,
  GraduationCap,
  CreditCard,
  FileText,
  X,
  History,
  Calendar,
  Clock,
  DollarSign,
  Receipt,
  Link2,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { Tooltip } from './Tooltip';

interface LiabilitiesPageProps {
  liabilities: LiabilityItem[];
  liabilityPayments: LiabilityPayment[];
  totalAssets: number;
  currencySymbol: string;
  onOpenHelp?: () => void;
  onAddLiability: (
    liability: Omit<LiabilityItem, 'id' | 'createdAt' | 'updatedAt'>,
    autoLedger?: { enabled: boolean; type: 'expense' | 'income'; category: string }
  ) => void;
  onUpdateLiability: (liability: LiabilityItem) => void;
  onDeleteLiability: (liabilityId: string) => void;
  onAddLiabilityPayment: (
    data: Omit<LiabilityPayment, 'id' | 'createdAt'>,
    autoLedger?: { enabled: boolean; category: string }
  ) => void;
  onDeleteLiabilityPayment: (paymentId: string) => void;
}

const CATEGORIES: LiabilityCategory[] = [
  'Mortgage balance',
  'Car loan',
  'Student loan',
  'Credit card balances',
  'Other debts',
];

export const LiabilitiesPage: React.FC<LiabilitiesPageProps> = ({
  liabilities,
  liabilityPayments,
  totalAssets,
  currencySymbol,
  onOpenHelp,
  onAddLiability,
  onUpdateLiability,
  onDeleteLiability,
  onAddLiabilityPayment,
  onDeleteLiabilityPayment,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<LiabilityItem | null>(null);

  // Payment history popup
  const [selectedLiabilityForHistory, setSelectedLiabilityForHistory] = useState<LiabilityItem | null>(null);
  const [showLogPaymentForm, setShowLogPaymentForm] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');
  const [payAutoLedger, setPayAutoLedger] = useState(true);

  // Delete confirmation
  const [liabilityToDelete, setLiabilityToDelete] = useState<LiabilityItem | null>(null);

  // Form states for creating/editing liability
  const [name, setName] = useState('');
  const [category, setCategory] = useState<LiabilityCategory>('Mortgage balance');
  const [initialAmount, setInitialAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [lender, setLender] = useState('');
  const [purpose, setPurpose] = useState<LiabilityPurpose>('financed_purchase');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Scheduled Payment Option States (Permanent on main form)
  const [paymentFrequency, setPaymentFrequency] = useState<LiabilityPaymentFrequency>('monthly');
  const [nextDueDate, setNextDueDate] = useState('');

  const [showSettled, setShowSettled] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'category' | 'date' | 'lender' | 'payments' | 'monthlyPayment' | 'balance'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Compute current outstanding balance: initialAmount - sum(payments for this liability)
  const computeCurrentBalance = (item: LiabilityItem): number => {
    const payments = liabilityPayments.filter((p) => p.liabilityId === item.id);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    return Math.max(0, item.initialAmount - totalPaid);
  };

  const isLiabilitySettled = (item: LiabilityItem): boolean => {
    return computeCurrentBalance(item) <= 0 || (item.notes ? item.notes.toLowerCase().includes('settled') : false);
  };

  const settledCount = useMemo(() => {
    return liabilities.filter((l) => isLiabilitySettled(l)).length;
  }, [liabilities, liabilityPayments]);

  const handleSort = (field: 'name' | 'category' | 'date' | 'lender' | 'payments' | 'monthlyPayment' | 'balance') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const computeTotalPaidForLiability = (liabilityId: string): number => {
    return liabilityPayments
      .filter((p) => p.liabilityId === liabilityId)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const openAddModal = () => {
    setEditingLiability(null);
    setName('');
    setCategory('Mortgage balance');
    setInitialAmount('');
    setInterestRate('');
    setMonthlyPayment('');
    setLender('');
    setPurpose('financed_purchase');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setPaymentFrequency('monthly');
    const defaultNextDue = new Date();
    defaultNextDue.setMonth(defaultNextDue.getMonth() + 1);
    setNextDueDate(defaultNextDue.toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const openEditModal = (item: LiabilityItem) => {
    setEditingLiability(item);
    setName(item.name);
    setCategory(item.category);
    setInitialAmount(item.initialAmount.toString());
    setInterestRate(item.interestRate ? item.interestRate.toString() : '');
    setMonthlyPayment(item.monthlyPayment ? item.monthlyPayment.toString() : '');
    setLender(item.lender || '');
    setPurpose(item.purpose || 'financed_purchase');
    setDate(item.date || new Date().toISOString().split('T')[0]);
    setNotes(item.notes || '');
    // Prepopulate payment frequency and due date
    setPaymentFrequency(item.paymentFrequency || 'monthly');
    setNextDueDate(item.nextDueDate || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(initialAmount) || 0;
    if (!name.trim()) return;

    const parsedMonthlyPayment = monthlyPayment ? parseFloat(monthlyPayment) : undefined;

    if (editingLiability) {
      // Check if settled to automatically deactivate schedule
      const alreadyPaid = computeTotalPaidForLiability(editingLiability.id);
      const isSettled = numericAmount <= alreadyPaid && numericAmount > 0;
      const scheduledActive = !isSettled && Boolean(nextDueDate);

      onUpdateLiability({
        ...editingLiability,
        name: name.trim(),
        category,
        initialAmount: numericAmount,
        interestRate: interestRate ? parseFloat(interestRate) : undefined,
        monthlyPayment: parsedMonthlyPayment,
        lender: lender.trim() || undefined,
        purpose,
        date,
        notes: notes.trim() || undefined,
        // Scheduled payment fields
        scheduledPaymentEnabled: scheduledActive,
        paymentFrequency,
        nextDueDate: scheduledActive ? nextDueDate : undefined,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Mandatory cross-linked ledger automation:
      // Taking on a new liability like cash loan -> registers as Income (cash inflow)
      // Financed purchase -> registers as Expense (purchase outflow)
      const isCashLoan = purpose === 'cash_loan';
      const ledgerType: 'income' | 'expense' = isCashLoan ? 'income' : 'expense';
      let ledgerCategory = 'Account Payables';
      if (isCashLoan) {
        ledgerCategory = 'Bank Transaction';
      } else {
        if (category === 'Car loan') ledgerCategory = 'Transportation';
        else if (category === 'Mortgage balance') ledgerCategory = 'Housing';
        else ledgerCategory = 'Account Payables';
      }

      const scheduledActive = Boolean(nextDueDate);

      onAddLiability(
        {
          name: name.trim(),
          category,
          initialAmount: numericAmount,
          interestRate: interestRate ? parseFloat(interestRate) : undefined,
          monthlyPayment: parsedMonthlyPayment,
          lender: lender.trim() || undefined,
          purpose,
          date,
          notes: notes.trim() || undefined,
          // Scheduled payment fields
          scheduledPaymentEnabled: scheduledActive,
          paymentFrequency,
          nextDueDate: scheduledActive ? nextDueDate : undefined,
        },
        {
          enabled: true, // Mandatory background cross-linking
          type: ledgerType,
          category: ledgerCategory,
        }
      );
    }

    setIsModalOpen(false);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLiabilityForHistory) return;
    const numAmount = parseFloat(payAmount) || 0;
    if (numAmount <= 0) return;

    let paymentCategory = 'Account Payables';
    if (selectedLiabilityForHistory.category === 'Mortgage balance') paymentCategory = 'Housing';
    else if (selectedLiabilityForHistory.category === 'Car loan') paymentCategory = 'Transportation';

    onAddLiabilityPayment(
      {
        liabilityId: selectedLiabilityForHistory.id,
        amount: numAmount,
        date: payDate,
        notes: payNotes.trim() || undefined,
      },
      {
        enabled: payAutoLedger,
        category: paymentCategory,
      }
    );

    // If this payment settles the liability, automatically stop and deactivate the recurring schedule
    const currentPaid = computeTotalPaidForLiability(selectedLiabilityForHistory.id);
    const newTotalPaid = currentPaid + numAmount;
    if (newTotalPaid >= selectedLiabilityForHistory.initialAmount) {
      onUpdateLiability({
        ...selectedLiabilityForHistory,
        scheduledPaymentEnabled: false,
        nextDueDate: undefined,
        updatedAt: new Date().toISOString(),
      });
    }

    setPayAmount('');
    setPayNotes('');
    setPayAutoLedger(true);
    setShowLogPaymentForm(false);
  };

  // Filtered & Sorted Liabilities
  const filteredLiabilities = useMemo(() => {
    return liabilities
      .filter((item) => {
        const settled = isLiabilitySettled(item);
        if (!showSettled && settled) return false;

        const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
        const matchesQuery =
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.lender && item.lender.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCat && matchesQuery;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'name') {
          diff = a.name.localeCompare(b.name);
        } else if (sortField === 'category') {
          diff = a.category.localeCompare(b.category);
        } else if (sortField === 'date') {
          diff = (a.date || '').localeCompare(b.date || '');
        } else if (sortField === 'lender') {
          diff = (a.lender || '').localeCompare(b.lender || '');
        } else if (sortField === 'payments') {
          const countA = liabilityPayments.filter((p) => p.liabilityId === a.id).length;
          const countB = liabilityPayments.filter((p) => p.liabilityId === b.id).length;
          diff = countA - countB;
        } else if (sortField === 'monthlyPayment') {
          diff = (a.monthlyPayment || 0) - (b.monthlyPayment || 0);
        } else if (sortField === 'balance') {
          diff = computeCurrentBalance(a) - computeCurrentBalance(b);
        }
        return sortDirection === 'asc' ? diff : -diff;
      });
  }, [liabilities, liabilityPayments, showSettled, selectedCategory, searchQuery, sortField, sortDirection]);

  const totalOutstanding = useMemo(() => {
    return liabilities.reduce((sum, l) => sum + computeCurrentBalance(l), 0);
  }, [liabilities, liabilityPayments]);

  const totalPaymentsMade = useMemo(() => {
    return liabilityPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [liabilityPayments]);

  const totalMonthlyAmortization = liabilities.reduce((sum, l) => sum + (l.monthlyPayment || 0), 0);
  const debtToAssetRatio = totalAssets > 0 ? (totalOutstanding / totalAssets) * 100 : 0;

  const getCategoryIcon = (cat: LiabilityCategory) => {
    switch (cat) {
      case 'Mortgage balance':
        return <Home className="w-4 h-4 text-blue-600" />;
      case 'Student loan':
        return <GraduationCap className="w-4 h-4 text-emerald-600" />;
      case 'Credit card balances':
        return <CreditCard className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-neutral-600" />;
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 select-none">
      {/* Top Banner */}
      <div className="bg-[#2e3436] text-white p-3.5 shadow-sm border border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-black tracking-wider uppercase">
            Loans, Debts &amp; Payment History
          </h1>
          <p className="text-xs text-neutral-300 font-mono">
            Log loan payments with automatic balance deduction · Click any debt to view payment log
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onOpenHelp && (
            <Tooltip content="Open operational guide and button explanations for Liabilities & Debts">
              <button
                type="button"
                onClick={onOpenHelp}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-100 rounded text-xs font-semibold shadow-xs transition border border-neutral-600"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>Guide</span>
              </button>
            </Tooltip>
          )}
          <Tooltip content="Register a new debt obligation, mortgage, auto loan, or personal liability">
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Debt / Loan</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3 border border-neutral-300 shadow-xs">
          <div className="text-neutral-500 font-medium">Total Outstanding Debt</div>
          <div className="text-base sm:text-lg font-bold font-mono text-red-700 mt-1">
            {formatCurrency(totalOutstanding, currencySymbol)}
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">
            Deducts logged payments automatically
          </div>
        </div>

        <div className="bg-white p-3 border border-neutral-300 shadow-xs">
          <div className="text-neutral-500 font-medium">Total Paid-To-Date</div>
          <div className="text-base sm:text-lg font-bold font-mono text-emerald-700 mt-1">
            {formatCurrency(totalPaymentsMade, currencySymbol)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            {liabilityPayments.length} payments recorded
          </div>
        </div>

        <div className="bg-white p-3 border border-neutral-300 shadow-xs">
          <div className="text-neutral-500 font-medium">Debt-to-Asset Ratio</div>
          <div className="text-base sm:text-lg font-bold font-mono text-neutral-800 mt-1">
            {debtToAssetRatio.toFixed(1)}%
          </div>
          <div className="text-[10px] text-neutral-500 mt-0.5">
            {debtToAssetRatio > 80 ? (
              <span className="text-red-600 font-semibold">High Leverage</span>
            ) : (
              <span className="text-emerald-600 font-semibold">Healthy Range</span>
            )}
          </div>
        </div>

        <div className="bg-white p-3 border border-neutral-300 shadow-xs">
          <div className="text-neutral-500 font-medium">Monthly Amortization</div>
          <div className="text-base sm:text-lg font-bold font-mono text-neutral-900 mt-1">
            {formatCurrency(totalMonthlyAmortization, currencySymbol)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Recurring obligation</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-white p-3 border border-neutral-300 w-full shadow-2xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by loan title, lender, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <Filter className="w-4 h-4 text-neutral-500 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-neutral-50 border border-neutral-300 py-2 px-3 rounded focus:outline-hidden cursor-pointer w-full sm:w-auto"
            >
              <option value="all">All Debt Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowSettled(!showSettled)}
            className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded border transition cursor-pointer shrink-0 ${
              showSettled
                ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
                : 'bg-neutral-100 text-neutral-700 border-neutral-300 hover:bg-neutral-200'
            }`}
            title="Toggle visibility of fully settled / paid-off liabilities"
          >
            <CheckCircle2 className={`w-4 h-4 ${showSettled ? 'text-emerald-600' : 'text-neutral-400'}`} />
            <span>Show Settled Liabilities</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                showSettled ? 'bg-emerald-200 text-emerald-900' : 'bg-neutral-200 text-neutral-700'
              }`}
            >
              {settledCount}
            </span>
          </button>
        </div>
      </div>

      {/* Liabilities Table with Contrasting Grey Rows */}
      <div className="border border-neutral-300 bg-white shadow-xs overflow-x-auto w-full">
        <table className="w-full text-left text-xs border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-[#2d3134] text-white uppercase text-[11px] font-bold select-none whitespace-nowrap">
              <th
                className="py-3 px-3.5 cursor-pointer hover:bg-neutral-700 transition"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Debt / Obligation Name</span>
                  {sortField === 'name' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-400" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                </div>
              </th>
              <th
                className="py-3 px-3.5 cursor-pointer hover:bg-neutral-700 transition"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Category</span>
                  {sortField === 'category' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-400" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                </div>
              </th>
              <th
                className="py-3 px-3.5 font-mono cursor-pointer hover:bg-neutral-700 transition"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Origination Date</span>
                  {sortField === 'date' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-400" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                </div>
              </th>
              <th
                className="py-3 px-3.5 cursor-pointer hover:bg-neutral-700 transition"
                onClick={() => handleSort('lender')}
              >
                <div className="flex items-center gap-1.5">
                  <span>Lender / Creditor</span>
                  {sortField === 'lender' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-400" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                </div>
              </th>
              <th
                className="py-3 px-3.5 text-right cursor-pointer hover:bg-neutral-700 transition"
                onClick={() => handleSort('payments')}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Payments Logged</span>
                  {sortField === 'payments' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-cyan-400" /> : <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                </div>
              </th>
              <th
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-neutral-700 transition"
                onClick={() => handleSort('monthlyPayment')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Scheduled Payment / Due</span>
                  {sortField === 'monthlyPayment' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  )}
                </div>
              </th>
              <th
                className="py-2.5 px-3 text-right cursor-pointer hover:bg-neutral-700 transition"
                onClick={() => handleSort('balance')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Outstanding Balance ({currencySymbol})</span>
                  {sortField === 'balance' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  )}
                </div>
              </th>
              <th className="py-2.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filteredLiabilities.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-neutral-500 italic">
                  No debt obligations recorded. Click "Add New Debt / Loan" to create one.
                </td>
              </tr>
            ) : (
              filteredLiabilities.map((item, idx) => {
                const currentBalance = computeCurrentBalance(item);
                const paymentsCount = liabilityPayments.filter((p) => p.liabilityId === item.id).length;

                return (
                  <tr
                    key={item.id}
                    className={`transition hover:bg-red-50 cursor-pointer ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'
                    }`}
                    onClick={() => setSelectedLiabilityForHistory(item)}
                    title="Click to view payment history or log a payment"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                        <span>{item.name}</span>
                        {item.purpose === 'cash_loan' ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">
                            Cash Loan
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-neutral-200 text-neutral-800 rounded font-bold">
                            Financed
                          </span>
                        )}
                        <History className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      </div>
                      {item.notes && (
                        <div className="text-[11px] text-neutral-500 italic truncate max-w-xs">
                          {item.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {getCategoryIcon(item.category)}
                        <span className="text-neutral-700 font-medium">{item.category}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600 font-mono">
                      {item.date || '2024-01-01'}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600 font-mono">
                      {item.lender || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-700">
                      <span className="px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-800 text-[10px] font-bold">
                        {paymentsCount} payments
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-700">
                      {item.monthlyPayment ? (
                        <div>
                          <div className="font-semibold text-neutral-800">
                            {formatCurrency(item.monthlyPayment, currencySymbol)}
                            <span className="text-[10px] text-neutral-500 font-sans font-normal ml-0.5">/mo</span>
                          </div>
                          {item.nextDueDate && (
                            <div className="text-[10px] text-red-600 font-sans font-medium flex items-center justify-end gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5 text-red-500" />
                              <span>Due: {item.nextDueDate}</span>
                            </div>
                          )}
                        </div>
                      ) : item.nextDueDate ? (
                        <div className="text-[10px] text-red-600 font-sans font-medium flex items-center justify-end gap-1">
                          <Clock className="w-2.5 h-2.5 text-red-500" />
                          <span>Due: {item.nextDueDate}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-red-700 text-sm">
                      {formatCurrency(currentBalance, currencySymbol)}
                    </td>
                    <td
                      className="py-2.5 px-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedLiabilityForHistory(item)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition"
                          title="View payment history"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 text-neutral-500 hover:text-blue-600 hover:bg-neutral-100 rounded transition"
                          title="Edit liability"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setLiabilityToDelete(item)}
                          className="p-1 text-neutral-500 hover:text-red-600 hover:bg-neutral-100 rounded transition"
                          title="Delete liability"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="bg-[#343a40] text-white font-extrabold text-xs">
              <td colSpan={5} className="py-2 px-3 uppercase tracking-wider">
                Total Outstanding Liabilities
              </td>
              <td className="py-2 px-3 text-right font-mono text-red-300 text-sm">
                {formatCurrency(totalOutstanding, currencySymbol)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ================= LIABILITY PAYMENT HISTORY POPUP MODAL ================= */}
      {selectedLiabilityForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-2xl max-w-xl w-full border border-neutral-300 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#2d3134] text-white">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-red-600/30 text-red-400 rounded">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">{selectedLiabilityForHistory.name}</h3>
                  <p className="text-[11px] text-neutral-400">
                    {selectedLiabilityForHistory.category} · Lender: {selectedLiabilityForHistory.lender || 'Unspecified'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedLiabilityForHistory(null);
                  setShowLogPaymentForm(false);
                }}
                className="text-neutral-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Balances Banner */}
            <div className="px-5 py-3 bg-neutral-100 border-b border-neutral-200 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-neutral-500 block">Original Loan Principal:</span>
                <span className="font-mono font-bold text-neutral-800">
                  {formatCurrency(selectedLiabilityForHistory.initialAmount, currencySymbol)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block">Total Payments Paid:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatCurrency(computeTotalPaidForLiability(selectedLiabilityForHistory.id), currencySymbol)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block">Remaining Balance:</span>
                <span className="font-mono font-bold text-red-700 text-sm">
                  {formatCurrency(computeCurrentBalance(selectedLiabilityForHistory), currencySymbol)}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4 max-h-[380px] overflow-y-auto">
              {/* Action Bar */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800">
                  Payment History &amp; Amortization Logs
                </span>
                <button
                  onClick={() => setShowLogPaymentForm(!showLogPaymentForm)}
                  className="px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showLogPaymentForm ? 'Close Form' : 'Log Loan Payment'}</span>
                </button>
              </div>

              {/* Log Payment Inline Form */}
              {showLogPaymentForm && (
                <form
                  onSubmit={handleSavePayment}
                  className="p-3 bg-neutral-50 border border-neutral-300 rounded text-xs space-y-2.5"
                >
                  <div className="font-semibold text-neutral-800 border-b border-neutral-200 pb-1 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Record Debt Payment Entry</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-neutral-600 mb-1">
                        Amount Paid ({currencySymbol}) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        placeholder="e.g. 8500"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="w-full px-2 py-1 border border-neutral-300 rounded font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-neutral-600 mb-1">Payment Date *</label>
                      <input
                        type="date"
                        required
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        className="w-full px-2 py-1 border border-neutral-300 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-neutral-600 mb-1">Payment Notes / Memo</label>
                    <input
                      type="text"
                      placeholder="e.g. Regular monthly installment, extra principal paydown"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      className="w-full px-2 py-1 border border-neutral-300 rounded"
                    />
                  </div>

                  <div className="p-2 bg-neutral-100 border border-neutral-200 rounded">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={payAutoLedger}
                        onChange={(e) => setPayAutoLedger(e.target.checked)}
                        className="mt-0.5 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                      <div className="text-[11px] text-neutral-700">
                        <span className="font-semibold text-neutral-900 flex items-center gap-1">
                          <Link2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Cross-Link Payment to Cashflow Ledger</span>
                        </span>
                        <span className="text-neutral-500 block text-[10px]">
                          Automatically records an Expense on {payDate} to reflect this cash outflow.
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowLogPaymentForm(false)}
                      className="px-2.5 py-1 text-neutral-600 border border-neutral-300 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-red-700 text-white font-bold rounded"
                    >
                      Deduct from Balance
                    </button>
                  </div>
                </form>
              )}

              {/* Payments List */}
              <div className="divide-y divide-neutral-200 text-xs">
                {liabilityPayments.filter((p) => p.liabilityId === selectedLiabilityForHistory.id).length === 0 ? (
                  <div className="text-center py-6 text-neutral-500 italic">
                    No payment entries recorded yet. Full principal balance is outstanding.
                  </div>
                ) : (
                  liabilityPayments
                    .filter((p) => p.liabilityId === selectedLiabilityForHistory.id)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((p) => (
                      <div
                        key={p.id}
                        className="py-2.5 flex items-center justify-between hover:bg-neutral-50 px-2 rounded"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-neutral-900">
                              Payment of {formatCurrency(p.amount, currencySymbol)}
                            </span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                              Paid
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-neutral-400" />
                              {p.date}
                            </span>
                            {p.notes && <span>· {p.notes}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-emerald-700 text-sm">
                            -{formatCurrency(p.amount, currencySymbol)}
                          </span>
                          <button
                            onClick={() => onDeleteLiabilityPayment(p.id)}
                            className="text-neutral-400 hover:text-red-600 p-1"
                            title="Delete payment entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-200 flex justify-end">
              <button
                onClick={() => {
                  setSelectedLiabilityForHistory(null);
                  setShowLogPaymentForm(false);
                }}
                className="px-3.5 py-1.5 bg-neutral-800 text-white rounded text-xs font-semibold hover:bg-neutral-900 transition"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Liability Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-neutral-300 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#2d3134] text-white">
              <h3 className="font-semibold text-sm">
                {editingLiability ? 'Edit Liability / Debt' : 'Add New Debt or Loan'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  Loan / Debt Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Housing Mortgage, Auto Loan, BDO Mastercard"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-hidden focus:border-neutral-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as LiabilityCategory)}
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-hidden cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Origination Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Liability Nature & Cashflow Impact */}
              <div>
                <label className="block font-medium text-neutral-700 mb-1">
                  Liability Nature &amp; Cashflow Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPurpose('financed_purchase')}
                    className={`p-2 border rounded text-left transition ${
                      purpose === 'financed_purchase'
                        ? 'border-red-600 bg-red-50/70 text-red-900 font-semibold shadow-xs'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    <span className="block text-[11px] font-bold flex items-center gap-1">
                      <TrendingDown className="w-3 h-3 text-red-600" />
                      <span>Financed Purchase</span>
                    </span>
                    <span className="block text-[10px] text-neutral-500 mt-0.5">
                      Auto, home or equipment loan (logs as Expense)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPurpose('cash_loan')}
                    className={`p-2 border rounded text-left transition ${
                      purpose === 'cash_loan'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-semibold shadow-xs'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    <span className="block text-[11px] font-bold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                      <span>Cash Loan / Inflow</span>
                    </span>
                    <span className="block text-[10px] text-neutral-500 mt-0.5">
                      Bank borrowing deposited (logs as Income)
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Initial Balance ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0"
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded font-mono focus:outline-hidden focus:border-neutral-800"
                  />
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Interest Rate (% APR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 6.25"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Monthly Payment ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 8500"
                    value={monthlyPayment}
                    onChange={(e) => setMonthlyPayment(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1">
                    Lender / Creditor / Bank
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pag-IBIG Fund, BDO, Metrobank"
                    value={lender}
                    onChange={(e) => setLender(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Recurring Payment Schedule: Frequency & Next Due Date */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Payment Frequency</span>
                  </label>
                  <select
                    value={paymentFrequency}
                    onChange={(e) => setPaymentFrequency(e.target.value as LiabilityPaymentFrequency)}
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded text-xs focus:outline-hidden bg-white cursor-pointer"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Next Payment Due Date</span>
                  </label>
                  <input
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-neutral-300 rounded font-mono text-xs focus:outline-hidden bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Amortization terms, maturity date, or account numbers..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded font-medium shadow-xs"
                >
                  {editingLiability ? 'Save Changes' : 'Record Liability'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!liabilityToDelete}
        title="Delete Liability Entry"
        message={`Are you sure you want to delete "${liabilityToDelete?.name}"? All logged payment records will also be removed.`}
        confirmLabel="Delete Debt"
        onConfirm={() => {
          if (liabilityToDelete) {
            onDeleteLiability(liabilityToDelete.id);
            setLiabilityToDelete(null);
          }
        }}
        onCancel={() => setLiabilityToDelete(null)}
      />
    </div>
  );
};
