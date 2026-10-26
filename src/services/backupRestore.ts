/**
 * Axiom Wealth - Account Backup & Restore Service
 * Provides full-account export and restore in both structured CSV (Google Sheets / Excel compatible)
 * and lossless JSON formats.
 */

import {
  TransactionItem,
  AssetItem,
  LiabilityItem,
  CategoryBudget,
  PeriodSettings,
  AssetTransaction,
  LiabilityPayment,
  RecurringExpenseItem,
  DEFAULT_PERIOD,
  DEFAULT_BUDGETS,
} from '../types/finance';

export interface BackupPayload {
  version: number;
  exportedAt: string;
  source: string;
  userId?: string;
  transactions: TransactionItem[];
  assets: AssetItem[];
  liabilities: LiabilityItem[];
  budgets: CategoryBudget[];
  period: PeriodSettings;
  assetTransactions: AssetTransaction[];
  liabilityPayments: LiabilityPayment[];
  recurringExpenses: RecurringExpenseItem[];
}

/**
 * Escapes a single CSV field following RFC 4180 rules.
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Parses a single CSV line into tokens, respecting quotes.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Generates a clean, multi-section CSV file openable in Google Sheets and Excel.
 */
export function generateCsvBackup(data: BackupPayload): string {
  const lines: string[] = [];

  // Metadata Header
  lines.push('# =========================================================================');
  lines.push('# AXIOM WEALTH - FINANCIAL ACCOUNT MASTER BACKUP');
  lines.push(`# Exported At: ${data.exportedAt}`);
  lines.push(`# Version: ${data.version}`);
  lines.push('# Compatibility: Google Sheets, Microsoft Excel, Apple Numbers');
  lines.push('# =========================================================================');
  lines.push('');

  // 1. PERIOD SETTINGS
  lines.push('# [SECTION: PERIOD_SETTINGS]');
  lines.push('Start Month,Start Year,End Month,End Year,Beginning Balance');
  lines.push([
    escapeCsv(data.period.startMonth),
    escapeCsv(data.period.startYear),
    escapeCsv(data.period.endMonth),
    escapeCsv(data.period.endYear),
    escapeCsv(data.period.beginningBalance),
  ].join(','));
  lines.push('');

  // 2. TRANSACTIONS (INCOME & EXPENSES)
  lines.push('# [SECTION: TRANSACTIONS]');
  lines.push('ID,Entry No,Date,Name,Type,Category,Classification,Amount,Payment Method,Description,Created At');
  for (const t of data.transactions) {
    lines.push([
      escapeCsv(t.id),
      escapeCsv(t.entryNo || ''),
      escapeCsv(t.date),
      escapeCsv(t.name),
      escapeCsv(t.type),
      escapeCsv(t.category),
      escapeCsv(t.subCategory),
      escapeCsv(t.amount),
      escapeCsv(t.paymentMethod || 'Cash'),
      escapeCsv(t.description || ''),
      escapeCsv(t.createdAt || t.date),
    ].join(','));
  }
  lines.push('');

  // 3. ASSETS & PORTFOLIO
  lines.push('# [SECTION: ASSETS]');
  lines.push('ID,Acquisition Date,Name,Category,Initial Valuation,Institution,Stock Ticker,Company Name,Broker,Shares,Avg Cost,Fees Paid,Current Price,Notes');
  for (const a of data.assets) {
    lines.push([
      escapeCsv(a.id),
      escapeCsv(a.date || ''),
      escapeCsv(a.name),
      escapeCsv(a.category),
      escapeCsv(a.initialValue),
      escapeCsv(a.institution || ''),
      escapeCsv(a.stockCode || ''),
      escapeCsv(a.stockName || ''),
      escapeCsv(a.broker || ''),
      escapeCsv(a.totalShares !== undefined ? a.totalShares : ''),
      escapeCsv(a.avgCostPerShare !== undefined ? a.avgCostPerShare : ''),
      escapeCsv(a.totalFeesPaid !== undefined ? a.totalFeesPaid : ''),
      escapeCsv(a.currentPrice !== undefined ? a.currentPrice : ''),
      escapeCsv(a.notes || ''),
    ].join(','));
  }
  lines.push('');

  // 4. LIABILITIES & DEBTS
  lines.push('# [SECTION: LIABILITIES]');
  lines.push('ID,Origination Date,Name,Category,Principal Amount,Interest Rate %,Monthly Payment,Lender,Purpose,Notes');
  for (const l of data.liabilities) {
    lines.push([
      escapeCsv(l.id),
      escapeCsv(l.date || ''),
      escapeCsv(l.name),
      escapeCsv(l.category),
      escapeCsv(l.initialAmount),
      escapeCsv(l.interestRate !== undefined ? l.interestRate : ''),
      escapeCsv(l.monthlyPayment !== undefined ? l.monthlyPayment : ''),
      escapeCsv(l.lender || ''),
      escapeCsv(l.purpose || ''),
      escapeCsv(l.notes || ''),
    ].join(','));
  }
  lines.push('');

  // 5. BUDGETS
  lines.push('# [SECTION: BUDGETS]');
  lines.push('Category,Monthly Target,Period Limits (JSON)');
  for (const b of data.budgets) {
    lines.push([
      escapeCsv(b.category),
      escapeCsv(b.monthlyBudget),
      escapeCsv(b.periodBudgets ? JSON.stringify(b.periodBudgets) : ''),
    ].join(','));
  }
  lines.push('');

  // 6. ASSET MOVEMENTS
  if (data.assetTransactions && data.assetTransactions.length > 0) {
    lines.push('# [SECTION: ASSET_TRANSACTIONS]');
    lines.push('ID,Asset ID,Entry No,Date,Name,Type,Amount,Stock Code,Broker,Notes');
    for (const atx of data.assetTransactions) {
      lines.push([
        escapeCsv(atx.id),
        escapeCsv(atx.assetId),
        escapeCsv(atx.entryNo || ''),
        escapeCsv(atx.date),
        escapeCsv(atx.name),
        escapeCsv(atx.type),
        escapeCsv(atx.amount),
        escapeCsv(atx.stockCode || ''),
        escapeCsv(atx.broker || ''),
        escapeCsv(atx.notes || ''),
      ].join(','));
    }
    lines.push('');
  }

  // 7. LIABILITY PAYMENTS
  if (data.liabilityPayments && data.liabilityPayments.length > 0) {
    lines.push('# [SECTION: LIABILITY_PAYMENTS]');
    lines.push('ID,Liability ID,Entry No,Date,Amount,Notes');
    for (const lp of data.liabilityPayments) {
      lines.push([
        escapeCsv(lp.id),
        escapeCsv(lp.liabilityId),
        escapeCsv(lp.entryNo || ''),
        escapeCsv(lp.date),
        escapeCsv(lp.amount),
        escapeCsv(lp.notes || ''),
      ].join(','));
    }
    lines.push('');
  }

  // 8. RECURRING EXPENSES
  if (data.recurringExpenses && data.recurringExpenses.length > 0) {
    lines.push('# [SECTION: RECURRING_EXPENSES]');
    lines.push('ID,Name,Category,Classification,Amount,Frequency,Start Date,Next Due Date,Payment Method,Notes');
    for (const r of data.recurringExpenses) {
      lines.push([
        escapeCsv(r.id),
        escapeCsv(r.name),
        escapeCsv(r.category),
        escapeCsv(r.subCategory),
        escapeCsv(r.amount),
        escapeCsv(r.frequency),
        escapeCsv(r.startDate),
        escapeCsv(r.nextDueDate),
        escapeCsv(r.paymentMethod || 'Cash'),
        escapeCsv(r.notes || ''),
      ].join(','));
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generates an uncompressed JSON backup for lossless data transfer.
 */
export function generateJsonBackup(data: BackupPayload): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Triggers a file download in the browser.
 */
export function downloadBackupFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses either CSV or JSON backup content into a verified BackupPayload.
 */
export async function parseBackupFile(content: string, filename: string): Promise<BackupPayload> {
  const isJson = filename.toLowerCase().endsWith('.json') || content.trim().startsWith('{');

  if (isJson) {
    try {
      const parsed = JSON.parse(content);
      return sanitizeParsedPayload(parsed);
    } catch (err: any) {
      throw new Error(`Invalid JSON backup file: ${err.message}`);
    }
  }

  // Parse sectioned CSV
  return parseCsvBackup(content);
}

/**
 * Parses multi-section CSV backup into structured objects.
 */
function parseCsvBackup(csvText: string): BackupPayload {
  const lines = csvText.split(/\r?\n/);
  
  const payload: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    source: 'Axiom Wealth CSV Restore',
    transactions: [],
    assets: [],
    liabilities: [],
    budgets: [],
    period: { ...DEFAULT_PERIOD },
    assetTransactions: [],
    liabilityPayments: [],
    recurringExpenses: [],
  };

  let currentSection: string | null = null;
  let isHeaderLine = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Section marker
    if (rawLine.startsWith('# [SECTION:')) {
      const match = rawLine.match(/\[SECTION:\s*([A-Z_]+)\]/);
      if (match) {
        currentSection = match[1];
        isHeaderLine = true;
        continue;
      }
    }

    // Ignore other comments
    if (rawLine.startsWith('#')) continue;

    // Skip the column header line for the section
    if (isHeaderLine) {
      isHeaderLine = false;
      continue;
    }

    const cols = parseCsvLine(lines[i]);
    if (!cols || cols.length === 0) continue;

    switch (currentSection) {
      case 'PERIOD_SETTINGS': {
        if (cols.length >= 5) {
          payload.period = {
            startMonth: cols[0] || DEFAULT_PERIOD.startMonth,
            startYear: parseInt(cols[1]) || DEFAULT_PERIOD.startYear,
            endMonth: cols[2] || DEFAULT_PERIOD.endMonth,
            endYear: parseInt(cols[3]) || DEFAULT_PERIOD.endYear,
            beginningBalance: parseFloat(cols[4]) || 0,
          };
        }
        break;
      }

      case 'TRANSACTIONS': {
        if (cols.length >= 8 && cols[3]?.trim()) {
          const date = cols[2] || new Date().toISOString().split('T')[0];
          const [yearStr, monthStr] = date.split('-');
          payload.transactions.push({
            id: cols[0] || `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            entryNo: cols[1] || undefined,
            date,
            month: parseInt(monthStr) || 1,
            year: parseInt(yearStr) || new Date().getFullYear(),
            name: cols[3].trim(),
            type: (cols[4] === 'income' ? 'income' : 'expense'),
            category: cols[5]?.trim() || 'General',
            subCategory: (cols[6]?.trim() as any) || 'fixed',
            amount: parseFloat(cols[7]) || 0,
            paymentMethod: (cols[8] as any) || 'Cash',
            description: cols[9] || undefined,
            createdAt: cols[10] || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        break;
      }

      case 'ASSETS': {
        if (cols.length >= 5 && cols[2]?.trim()) {
          payload.assets.push({
            id: cols[0] || `ast-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            date: cols[1] || new Date().toISOString().split('T')[0],
            name: cols[2].trim(),
            category: (cols[3]?.trim() as any) || 'Other assets',
            initialValue: parseFloat(cols[4]) || 0,
            institution: cols[5] || undefined,
            stockCode: cols[6] || undefined,
            stockName: cols[7] || undefined,
            broker: cols[8] || undefined,
            totalShares: cols[9] ? parseFloat(cols[9]) : undefined,
            avgCostPerShare: cols[10] ? parseFloat(cols[10]) : undefined,
            totalFeesPaid: cols[11] ? parseFloat(cols[11]) : undefined,
            currentPrice: cols[12] ? parseFloat(cols[12]) : undefined,
            notes: cols[13] || undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        break;
      }

      case 'LIABILITIES': {
        if (cols.length >= 5 && cols[2]?.trim()) {
          payload.liabilities.push({
            id: cols[0] || `liab-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            date: cols[1] || new Date().toISOString().split('T')[0],
            name: cols[2].trim(),
            category: (cols[3]?.trim() as any) || 'Other debts',
            initialAmount: parseFloat(cols[4]) || 0,
            interestRate: cols[5] ? parseFloat(cols[5]) : undefined,
            monthlyPayment: cols[6] ? parseFloat(cols[6]) : undefined,
            lender: cols[7] || undefined,
            purpose: (cols[8] as any) || 'financed_purchase',
            notes: cols[9] || undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        break;
      }

      case 'BUDGETS': {
        if (cols.length >= 2 && cols[0]?.trim()) {
          let periodBudgets: Record<string, number> | undefined;
          if (cols[2]) {
            try {
              periodBudgets = JSON.parse(cols[2]);
            } catch {}
          }
          payload.budgets.push({
            category: cols[0].trim(),
            monthlyBudget: parseFloat(cols[1]) || 0,
            periodBudgets,
          });
        }
        break;
      }

      case 'ASSET_TRANSACTIONS': {
        if (cols.length >= 7 && cols[4]?.trim()) {
          payload.assetTransactions.push({
            id: cols[0] || `atx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            assetId: cols[1] || '',
            entryNo: cols[2] || undefined,
            date: cols[3] || new Date().toISOString().split('T')[0],
            name: cols[4].trim(),
            type: (cols[5] as any) || 'buy',
            amount: parseFloat(cols[6]) || 0,
            stockCode: cols[7] || undefined,
            broker: cols[8] || undefined,
            notes: cols[9] || undefined,
            createdAt: new Date().toISOString(),
          });
        }
        break;
      }

      case 'LIABILITY_PAYMENTS': {
        if (cols.length >= 5 && cols[1]?.trim()) {
          payload.liabilityPayments.push({
            id: cols[0] || `lp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            liabilityId: cols[1].trim(),
            entryNo: cols[2] || undefined,
            date: cols[3] || new Date().toISOString().split('T')[0],
            amount: parseFloat(cols[4]) || 0,
            notes: cols[5] || undefined,
            createdAt: new Date().toISOString(),
          });
        }
        break;
      }

      case 'RECURRING_EXPENSES': {
        if (cols.length >= 6 && cols[1]?.trim()) {
          payload.recurringExpenses.push({
            id: cols[0] || `rec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            name: cols[1].trim(),
            category: cols[2]?.trim() || 'Utilities',
            subCategory: (cols[3] as any) || 'fixed',
            amount: parseFloat(cols[4]) || 0,
            frequency: (cols[5] as any) || 'monthly',
            startDate: cols[6] || new Date().toISOString().split('T')[0],
            nextDueDate: cols[7] || new Date().toISOString().split('T')[0],
            paymentMethod: (cols[8] as any) || 'Cash',
            notes: cols[9] || undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        break;
      }
    }
  }

  return payload;
}

/**
 * Validates and cleans parsed JSON object into BackupPayload.
 */
function sanitizeParsedPayload(raw: any): BackupPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Backup file does not contain a valid JSON object.');
  }

  return {
    version: raw.version || 1,
    exportedAt: raw.exportedAt || new Date().toISOString(),
    source: raw.source || 'Axiom Wealth JSON Restore',
    userId: raw.userId,
    transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
    assets: Array.isArray(raw.assets) ? raw.assets : [],
    liabilities: Array.isArray(raw.liabilities) ? raw.liabilities : [],
    budgets: Array.isArray(raw.budgets) && raw.budgets.length > 0 ? raw.budgets : DEFAULT_BUDGETS,
    period: raw.period && typeof raw.period === 'object' ? raw.period : { ...DEFAULT_PERIOD },
    assetTransactions: Array.isArray(raw.assetTransactions) ? raw.assetTransactions : [],
    liabilityPayments: Array.isArray(raw.liabilityPayments) ? raw.liabilityPayments : [],
    recurringExpenses: Array.isArray(raw.recurringExpenses) ? raw.recurringExpenses : [],
  };
}
