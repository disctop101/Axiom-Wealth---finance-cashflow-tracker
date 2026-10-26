import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Database,
  ArrowRight,
} from 'lucide-react';
import {
  BackupPayload,
  generateCsvBackup,
  generateJsonBackup,
  downloadBackupFile,
  parseBackupFile,
} from '../services/backupRestore';
import {
  AssetItem,
  LiabilityItem,
  PeriodSettings,
  TransactionItem,
  CategoryBudget,
  AssetTransaction,
  LiabilityPayment,
  RecurringExpenseItem,
} from '../types/finance';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string | null;
  initialTab?: 'export' | 'restore';
  data: {
    period: PeriodSettings;
    assets: AssetItem[];
    liabilities: LiabilityItem[];
    transactions: TransactionItem[];
    budgets: CategoryBudget[];
    assetTransactions: AssetTransaction[];
    liabilityPayments: LiabilityPayment[];
    recurringExpenses: RecurringExpenseItem[];
  };
  onRestoreToCloud: (
    backup: BackupPayload,
    mode: 'merge' | 'replace'
  ) => Promise<{
    restoredTxs: number;
    restoredAssets: number;
    restoredLiabilities: number;
    restoredBudgets: number;
  }>;
  onOpenGoogleSheetsExport?: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  userId,
  initialTab = 'export',
  data,
  onRestoreToCloud,
  onOpenGoogleSheetsExport,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'restore'>(initialTab);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');

  // File parsing & upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<BackupPayload | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    restoredTxs: number;
    restoredAssets: number;
    restoredLiabilities: number;
    restoredBudgets: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDownloadCsv = () => {
    try {
      const payload: BackupPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        source: 'Axiom Wealth Application',
        userId: userId || undefined,
        ...data,
      };
      const csv = generateCsvBackup(payload);
      const filename = `axiom_wealth_backup_${new Date().toISOString().split('T')[0]}.csv`;
      downloadBackupFile(csv, filename, 'text/csv');
    } catch (err: any) {
      console.error('Error exporting CSV backup:', err);
      setErrorMsg('Failed to generate CSV backup file.');
    }
  };

  const handleDownloadJson = () => {
    try {
      const payload: BackupPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        source: 'Axiom Wealth Application',
        userId: userId || undefined,
        ...data,
      };
      const json = generateJsonBackup(payload);
      const filename = `axiom_wealth_backup_${new Date().toISOString().split('T')[0]}.json`;
      downloadBackupFile(json, filename, 'application/json');
    } catch (err: any) {
      console.error('Error exporting JSON backup:', err);
      setErrorMsg('Failed to generate JSON backup file.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);
    setErrorMsg(null);
    setSuccessResult(null);

    try {
      const text = await file.text();
      const parsed = await parseBackupFile(text, file.name);
      setParsedBackup(parsed);
    } catch (err: any) {
      console.error('Error parsing backup file:', err);
      setErrorMsg(err.message || 'Unable to parse the uploaded file. Please provide a valid CSV or JSON backup.');
      setParsedBackup(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!parsedBackup) return;

    setIsRestoring(true);
    setErrorMsg(null);
    setSuccessResult(null);

    try {
      const summary = await onRestoreToCloud(parsedBackup, restoreMode);
      setSuccessResult(summary);
      setSelectedFile(null);
      setParsedBackup(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Error applying restore to cloud:', err);
      setErrorMsg(err?.message || 'Failed to persist restored data to Cloud Firestore.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#161b22] text-neutral-100 rounded-lg shadow-2xl max-w-2xl w-full border border-neutral-700 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0d1117] border-b border-neutral-700">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-950/80 border border-emerald-600 rounded text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Account Backup &amp; Cloud Restore</h3>
              <p className="text-[11px] text-neutral-400 font-mono">
                Google Sheets / CSV export &amp; direct-to-cloud restoration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-800 bg-[#0d1117] px-5 pt-2 gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('export');
              setErrorMsg(null);
            }}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === 'export'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export &amp; Backup</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('restore');
              setErrorMsg(null);
            }}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === 'restore'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restore from File</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-700/80 rounded text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Operation Notice</span>
                <span className="text-[11px] text-red-300">{errorMsg}</span>
              </div>
            </div>
          )}

          {successResult && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-700/80 rounded text-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Cloud Restore Confirmed</span>
                <span className="text-[11px] text-emerald-300">
                  Successfully synchronized {successResult.restoredTxs} transactions, {successResult.restoredAssets} assets, and {successResult.restoredLiabilities} liabilities straight to Cloud Firestore!
                </span>
              </div>
            </div>
          )}

          {/* TAB 1: EXPORT / BACKUP */}
          {activeTab === 'export' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-neutral-900 border border-neutral-700 rounded space-y-1">
                <span className="font-bold text-white text-xs block">Account State Summary</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px] text-neutral-300">
                  <div className="bg-[#1e2329] p-2 rounded border border-neutral-800">
                    <span className="text-neutral-400 text-[10px] block">Transactions</span>
                    <span className="font-bold text-emerald-400">{data.transactions.length}</span>
                  </div>
                  <div className="bg-[#1e2329] p-2 rounded border border-neutral-800">
                    <span className="text-neutral-400 text-[10px] block">Assets</span>
                    <span className="font-bold text-sky-400">{data.assets.length}</span>
                  </div>
                  <div className="bg-[#1e2329] p-2 rounded border border-neutral-800">
                    <span className="text-neutral-400 text-[10px] block">Liabilities</span>
                    <span className="font-bold text-amber-400">{data.liabilities.length}</span>
                  </div>
                  <div className="bg-[#1e2329] p-2 rounded border border-neutral-800">
                    <span className="text-neutral-400 text-[10px] block">Budgets</span>
                    <span className="font-bold text-purple-400">{data.budgets.length}</span>
                  </div>
                </div>
              </div>

              {/* Option 1: CSV for Google Sheets / Excel */}
              <div className="p-4 bg-neutral-900/90 border border-neutral-700/80 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-600/70 transition">
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-xs">Spreadsheet Master Backup (.csv)</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-mono">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Formatted multi-section CSV file containing complete ledger entries, asset valuations, debt amortization, and budgets. Opens directly in Google Sheets, Excel, and Apple Numbers.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center gap-1.5 text-xs transition shrink-0 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download CSV</span>
                </button>
              </div>

              {/* Option 2: JSON Archive */}
              <div className="p-4 bg-neutral-900/90 border border-neutral-700/80 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-sky-600/70 transition">
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-sky-400" />
                    <span className="font-bold text-white text-xs">Raw Lossless JSON Snapshot (.json)</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Exact lossless JSON snapshot of your complete account state. Ideal for offline archive preservation or moving between accounts.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-600 font-bold rounded flex items-center gap-1.5 text-xs transition shrink-0 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Download JSON</span>
                </button>
              </div>

              {/* Option 3: Google Drive Sheets Integration */}
              {onOpenGoogleSheetsExport && (
                <div className="p-4 bg-neutral-900/90 border border-neutral-700/80 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 max-w-md">
                    <div className="flex items-center gap-1.5">
                      <ExternalLink className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-white text-xs">Direct Google Drive Sync</span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Creates a formatted spreadsheet workbook directly in your Google Drive using your Google account permissions.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenGoogleSheetsExport();
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded flex items-center gap-1.5 text-xs transition shrink-0 cursor-pointer shadow-xs"
                  >
                    <span>Open Drive Sync</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RESTORE FROM FILE */}
          {activeTab === 'restore' && (
            <div className="space-y-4">
              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-neutral-700 hover:border-emerald-500 rounded-lg bg-neutral-900/60 flex flex-col items-center justify-center text-center cursor-pointer transition group"
              >
                <div className="p-3 bg-neutral-800 rounded-full text-emerald-400 group-hover:scale-105 transition mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="font-bold text-white text-xs">
                  {selectedFile ? selectedFile.name : 'Click to select or drop an Axiom backup file'}
                </span>
                <span className="text-[11px] text-neutral-400 mt-1">
                  Supports structured CSV (.csv) or raw JSON (.json) archives
                </span>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.json,text/csv,application/json"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {isParsing && (
                <div className="p-3 text-center text-neutral-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Validating backup contents...</span>
                </div>
              )}

              {/* Parsed Inspection Card */}
              {parsedBackup && (
                <div className="p-4 bg-neutral-900 border border-neutral-700 rounded space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white text-xs">Backup Inspected Successfully</span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400">
                      Exported: {parsedBackup.exportedAt.split('T')[0]}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                    <div className="bg-[#1e2329] p-2 rounded border border-neutral-800">
                      <span className="text-neutral-400 text-[10px] block">Transactions</span>
                      <span className="font-bold text-emerald-400">{parsedBackup.transactions.length}</span>
                    </div>
                    <div className="bg-[#1e2329] p-2 rounded border border-neutral-800">
                      <span className="text-neutral-400 text-[10px] block">Assets</span>
                      <span className="font-bold text-sky-400">{parsedBackup.assets.length}</span>
                    </div>
                    <div className="bg-[#1e2329] p-2 rounded border border-neutral-800">
                      <span className="text-neutral-400 text-[10px] block">Liabilities</span>
                      <span className="font-bold text-amber-400">{parsedBackup.liabilities.length}</span>
                    </div>
                    <div className="bg-[#1e2329] p-2 rounded border border-neutral-800">
                      <span className="text-neutral-400 text-[10px] block">Budgets</span>
                      <span className="font-bold text-purple-400">{parsedBackup.budgets.length}</span>
                    </div>
                  </div>

                  {/* Mode Selector */}
                  <div className="pt-2 border-t border-neutral-800 space-y-2">
                    <span className="font-semibold text-neutral-300 block text-[11px]">Restore Mode</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className={`p-2.5 rounded border cursor-pointer flex items-start gap-2 ${
                        restoreMode === 'merge' ? 'bg-emerald-950/40 border-emerald-600 text-white' : 'bg-[#1e2329] border-neutral-800 text-neutral-300'
                      }`}>
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          className="mt-0.5 text-emerald-500"
                        />
                        <div>
                          <span className="font-bold block text-[11px]">Merge Records</span>
                          <span className="text-[10px] text-neutral-400">Append items without erasing existing untouched cloud records.</span>
                        </div>
                      </label>

                      <label className={`p-2.5 rounded border cursor-pointer flex items-start gap-2 ${
                        restoreMode === 'replace' ? 'bg-red-950/40 border-red-600 text-white' : 'bg-[#1e2329] border-neutral-800 text-neutral-300'
                      }`}>
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                          className="mt-0.5 text-red-500"
                        />
                        <div>
                          <span className="font-bold block text-[11px] text-red-300">Replace &amp; Overwrite</span>
                          <span className="text-[10px] text-neutral-400">Clear existing cloud ledger and replace entirely with this backup.</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={isRestoring}
                      onClick={handleConfirmRestore}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center gap-1.5 text-xs transition cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {isRestoring ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Writing to Cloud Firestore...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Authorize &amp; Restore to Cloud</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#0d1117] border-t border-neutral-700 text-xs">
          <span className="text-[11px] text-neutral-500">
            Axiom Wealth Cloud Sync Active
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-neutral-300 hover:text-white bg-neutral-800 border border-neutral-700 rounded hover:bg-neutral-700 transition cursor-pointer font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
