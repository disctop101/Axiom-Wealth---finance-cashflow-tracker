import { AssetItem, LiabilityItem, PeriodSettings, TransactionItem } from '../types/finance';

interface ExportFinanceData {
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
}

export async function exportToGoogleSheets(
  accessToken: string,
  data: ExportFinanceData
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const title = `Personal Financial Statement (${data.period.startMonth} - ${data.period.endMonth} ${data.period.endYear})`;

  // 1. Create the new Spreadsheet
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Financial Statements',
            gridProperties: {
              rowCount: 60,
              columnCount: 15,
            },
          },
        },
        {
          properties: {
            title: 'Assets Detail',
            gridProperties: {
              rowCount: 50,
              columnCount: 7,
            },
          },
        },
        {
          properties: {
            title: 'Liabilities Detail',
            gridProperties: {
              rowCount: 50,
              columnCount: 8,
            },
          },
        },
      ],
    }),
  });

  if (!createResponse.ok) {
    const errText = await createResponse.text();
    let message = 'Failed to create Google Spreadsheet';
    try {
      const errJson = JSON.parse(errText);
      message = errJson.error?.message || message;
    } catch {
      // use errText
    }
    throw new Error(message);
  }

  const spreadsheet = await createResponse.json();
  const spreadsheetId = spreadsheet.spreadsheetId;
  const spreadsheetUrl = spreadsheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Prepare tabular data for "Financial Statements"
  const sumByCategory = (type: 'income' | 'expense', category: string) =>
    data.transactions
      .filter((t) => t.type === type && t.category === category)
      .reduce((acc, t) => acc + t.amount, 0);

  const expenseCategories = Array.from(
    new Set(data.transactions.filter((t) => t.type === 'expense').map((t) => t.category))
  ).filter(Boolean);

  const categoryRows = expenseCategories.map((cat) => [
    cat,
    -sumByCategory('expense', cat),
    '',
    `${cat} expenses`,
    -sumByCategory('expense', cat),
  ]);

  const finSheetRows = [
    ['FINANCIAL STATEMENT', '', '', `START: ${data.period.startMonth} ${data.period.startYear}`, '', `END: ${data.period.endMonth} ${data.period.endYear}`],
    ['', '', '', '', '', ''],
    ['INCOME STATEMENT (PERSONAL)', '', '', 'CASH FLOW STATEMENT', ''],
    [`Period of ${data.period.startMonth} to ${data.period.endMonth} ${data.period.endYear}`, '', '', `Period of ${data.period.startMonth} to ${data.period.endMonth} ${data.period.endYear}`, ''],
    ['Period Income', 'Amount', '', 'Cash Inflows', 'Amount'],
    ['Income (Earned)', data.totals.totalEarned, '', 'Total Cash Inflows', data.totals.totalInflows],
    ['Income (Portfolio/Passive)', data.totals.totalPassive, '', '', ''],
    ['Other Income:', data.totals.totalOtherIncome, '', 'Cash Outflows', 'Amount'],
    ['Total Income:', data.totals.totalIncome, '', 'Total Cash Outflows', -data.totals.totalOutflows],
    ['', '', '', '', ''],
    ['Period Expenses', 'Amount', '', 'Outflows by Category', 'Amount'],
    ...categoryRows,
    ['Fixed Expenses', -data.totals.totalFixedExpenses, '', '', ''],
    ['Variable Expenses', -data.totals.totalVariableExpenses, '', 'Net Cash Flow', data.totals.netCashFlow],
    ['Total Expenses', -data.totals.totalExpenses, '', 'Beginning Balance', data.period.beginningBalance],
    ['Net Income (Income - Expenses)', data.totals.netIncome, '', 'Ending Balance', data.totals.endingBalance],
    ['Previous Balance', data.period.beginningBalance, '', '', ''],
    ['Ending Balance', data.totals.endingBalance, '', '', ''],
    ['', '', '', '', ''],
    ['PERSONAL BALANCE SHEET', '', '', '', ''],
    ['Assets', 'Value', '', 'Liabilities', 'Value'],
    ['Total Assets', data.totals.totalAssets, '', 'Total Liabilities', data.totals.totalLiabilities],
    ['Net Worth (Assets - Liabilities)', data.totals.netWorth, '', '', ''],
  ];
  // 3. Prepare Assets Detail sheet
  const assetRows = [
    ['PERSONAL ASSET INVENTORY', '', '', '', ''],
    ['Asset Name', 'Category', 'Value', 'Institution / Custodian', 'Notes'],
    ...data.assets.map((a) => [a.name, a.category, (a as any).value ?? a.initialValue, a.institution || '-', a.notes || '-']),
    ['Total Assets', '', data.totals.totalAssets, '', ''],
  ];

  // 4. Prepare Liabilities Detail sheet
  const liabilityRows = [
    ['PERSONAL LIABILITIES & DEBT TRACKER', '', '', '', '', ''],
    ['Liability / Debt Name', 'Category', 'Outstanding Balance', 'Interest Rate (%)', 'Monthly Payment', 'Lender', 'Notes'],
    ...data.liabilities.map((l) => [
      l.name,
      l.category,
      (l as any).amount ?? l.initialAmount,
      l.interestRate ? `${l.interestRate}%` : '-',
      l.monthlyPayment || 0,
      l.lender || '-',
      l.notes || '-',
    ]),
    ['Total Liabilities', '', data.totals.totalLiabilities, '', '', '', ''],
  ];

  // 5. Update data via batchUpdate
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'Financial Statements!A1',
          values: finSheetRows,
        },
        {
          range: 'Assets Detail!A1',
          values: assetRows,
        },
        {
          range: 'Liabilities Detail!A1',
          values: liabilityRows,
        },
      ],
    }),
  });

  return { spreadsheetId, spreadsheetUrl };
}
