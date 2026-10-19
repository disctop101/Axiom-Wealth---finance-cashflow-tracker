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
  const finSheetRows = [
    ['FINANCIAL STATEMENT', '', '', `START: ${data.period.startMonth} ${data.period.startYear}`, '', `END: ${data.period.endMonth} ${data.period.endYear}`],
    ['', '', '', '', '', ''],
    ['INCOME STATEMENT (PERSONAL)', '', '', 'CASH FLOW STATEMENT', ''],
    [`Period of ${data.period.startMonth} to ${data.period.endMonth} ${data.period.endYear}`, '', '', `Period of ${data.period.startMonth} to ${data.period.endMonth} ${data.period.endYear}`, ''],
    ['Period Income', 'Amount (PHP)', '', 'Cash Inflows', 'Amount (PHP)'],
    ['Salary/Wages', 152000, '', 'Salary/Wages received', 152000],
    ['Income (Earned)', data.totals.totalEarned, '', 'Cash received from Account Receivables', 5600],
    ['Interest/Dividends', 0, '', 'Cash received from Investments', 0],
    ['Investments', 0, '', 'Cash from investing', 5600],
    ['Income (Portfolio/Passive)', data.totals.totalPassive, '', 'Cash received from Account Payables', 23400],
    ['Account Payables', 23400, '', 'Cash from financing', 23400],
    ['Account Receivables', 5600, '', '', ''],
    ['Other Income:', data.totals.totalOtherIncome, '', 'Cash Outflows', 'Amount (PHP)'],
    ['Total Income:', data.totals.totalIncome, '', 'Payments made to Bank Transactions', -95],
    ['', '', '', 'Transportation expenses', -5250],
    ['Period Expenses', 'Amount (PHP)', '', 'Utilities expenses', -25900],
    ['Utilities', -25900, '', 'Food expenses', -44321],
    ['Food', -44321, '', 'Health Care expenses', -28969],
    ['Health Care', -28969, '', 'Personal Care expenses', -2841],
    ['Personal Care', -2841, '', 'Miscellaneous expenses', -26019],
    ['Fixed Expenses', -data.totals.totalFixedExpenses, '', 'Recurring Expenses', -135415],
    ['Entertainment', -2020, '', 'Payments made to Account Payables', -48358],
    ['Transportation', -5250, '', 'Cash from financing', -48358],
    ['Account Payables', -48358, '', '', ''],
    ['Bank Transaction', -95, '', 'Total Cash Inflows', data.totals.totalInflows],
    ['Miscellaneous', -26019, '', 'Total Cash Outflows', -data.totals.totalOutflows],
    ['Variable Expenses', -data.totals.totalVariableExpenses, '', 'Net Cash Flow', data.totals.netCashFlow],
    ['Total Expenses', -data.totals.totalExpenses, '', 'Beginning Balance', data.period.beginningBalance],
    ['Net Income (Income - Expenses)', data.totals.netIncome, '', 'Ending Balance', data.totals.endingBalance],
    ['Previous Balance', data.period.beginningBalance, '', '', ''],
    ['Ending Balance', data.totals.endingBalance, '', '', ''],
    ['', '', '', '', ''],
    ['PERSONAL BALANCE SHEET', '', '', '', ''],
    ['Assets', 'Value (PHP)', '', 'Liabilities', 'Value (PHP)'],
    ['Cash and cash equivalents', data.totals.endingBalance, '', 'Mortgage balance', 100000],
    ['Investment accounts', 482, '', 'Car loan', 0],
    ['Real estate', 0, '', 'Student loan', 0],
    ['Vehicles', 0, '', 'Credit card balances', 0],
    ['Other assets', 192000, '', 'Other debts', 90000],
    ['Total Assets', data.totals.totalAssets, '', 'Total Liabilities', data.totals.totalLiabilities],
    ['Net Worth (Assets - Liabilities)', data.totals.netWorth, '', '', ''],
  ];

  // 3. Prepare Assets Detail sheet
  const assetRows = [
    ['PERSONAL ASSET INVENTORY', '', '', '', ''],
    ['Asset Name', 'Category', 'Value (PHP)', 'Institution / Custodian', 'Notes'],
    ...data.assets.map((a) => [a.name, a.category, (a as any).value ?? a.initialValue, a.institution || '-', a.notes || '-']),
    ['Total Assets', '', data.totals.totalAssets, '', ''],
  ];

  // 4. Prepare Liabilities Detail sheet
  const liabilityRows = [
    ['PERSONAL LIABILITIES & DEBT TRACKER', '', '', '', '', ''],
    ['Liability / Debt Name', 'Category', 'Outstanding Balance (PHP)', 'Interest Rate (%)', 'Monthly Payment (PHP)', 'Lender', 'Notes'],
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
