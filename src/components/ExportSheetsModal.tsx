import React, { useState } from 'react';
import { FileSpreadsheet, ExternalLink, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { exportToGoogleSheets } from '../services/googleSheets';
import { AssetItem, LiabilityItem, PeriodSettings, TransactionItem } from '../types/finance';

interface ExportSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onRequireLogin: () => void;
  data: {
    period: PeriodSettings;
    assets: AssetItem[];
    liabilities: LiabilityItem[];
    transactions: TransactionItem[];
    totals: {
      totalEarned: number;
      totalPassive: number;
      totalOtherIncome: number;
      totalIncome: number;
      totalFixedExpenses: number;
      totalVariableExpenses: number;
      totalExpenses: number;
      netIncome: number;
      endingBalance: number;
      totalInflows: number;
      totalOutflows: number;
      netCashFlow: number;
      totalAssets: number;
      totalLiabilities: number;
      netWorth: number;
    };
  };
}

export const ExportSheetsModal: React.FC<ExportSheetsModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  onRequireLogin,
  data,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    spreadsheetId: string;
    spreadsheetUrl: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!accessToken) {
      onRequireLogin();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await exportToGoogleSheets(accessToken, data);
      setSuccessResult(result);
    } catch (err: unknown) {
      console.error('Export error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create Google Spreadsheet. Please verify your Google account permissions.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full border border-neutral-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0f9d58] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/20 rounded">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Export to Google Sheets</h3>
              <p className="text-[11px] text-emerald-100">Sync Financial Statement to your Google Drive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 text-xs text-neutral-700 space-y-4">
          {!successResult ? (
            <>
              <div className="bg-neutral-50 p-3.5 rounded border border-neutral-200 space-y-2">
                <p className="font-medium text-neutral-800">
                  This operation will create a new Google Spreadsheet containing:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-neutral-600">
                  <li>
                    <strong>Financial Statements:</strong> Income Statement, Cash Flow Statement, and Balance Sheet for {data.period.startMonth} - {data.period.endMonth} {data.period.endYear}.
                  </li>
                  <li>
                    <strong>Assets Inventory:</strong> Detailed list of {data.assets.length} assets with institutions and valuations.
                  </li>
                  <li>
                    <strong>Liabilities &amp; Debts:</strong> Detailed breakdown of {data.liabilities.length} liabilities, amortization, and lenders.
                  </li>
                  <li>All figures are formatted in your selected display currency.</li>
                </ul>
              </div>

              {!accessToken && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    You need to sign in with Google to create spreadsheets in your Google Drive with your permission.
                  </span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">Export Failed</p>
                    <p>{error}</p>
                    <button
                      type="button"
                      onClick={onRequireLogin}
                      className="text-blue-600 underline text-[11px] hover:text-blue-800 block mt-1"
                    >
                      Re-authorize Google Sheets
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-900">Spreadsheet Created Successfully!</h4>
                <p className="text-neutral-500 mt-1">
                  Your personal financial statements and detailed schedules are now saved to your Google Drive.
                </p>
              </div>

              <div className="pt-2">
                <a
                  href={successResult.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f9d58] text-white rounded font-medium shadow hover:bg-emerald-700 transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Open in Google Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 bg-neutral-50 border-t border-neutral-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-100 transition"
          >
            {successResult ? 'Close' : 'Cancel'}
          </button>
          {!successResult && (
            <button
              type="button"
              disabled={loading}
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-[#0f9d58] rounded hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Sheets...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Export</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
