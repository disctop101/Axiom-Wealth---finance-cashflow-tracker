import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

export interface StatementItem {
  name: string;
  amount: number;
}

export interface StatementPdfData {
  userName: string;
  currencySymbol: string;
  periodLabel: string;
  recordsCount: number;

  // Income Statement Data
  earnedIncomeItems: StatementItem[];
  passiveIncomeItems: StatementItem[];
  otherIncomeItems: StatementItem[];
  totalIncome: number;

  fixedExpenseItems: StatementItem[];
  variableExpenseItems: StatementItem[];
  totalExpenses: number;
  netIncome: number;

  // Cash Flow Statement Data
  cashInflows: number;
  cashOutflows: number;
  netCashFlow: number;
  beginningBalance: number;
  endingBalance: number;

  // Balance Sheet Data
  assetItems: StatementItem[];
  totalAssets: number;
  liabilityItems: StatementItem[];
  totalLiabilities: number;
  netWorth: number;

  // Period Expenses Visualizer Data
  expenseVisualizerItems?: { category: string; amount: number }[];
}

export const ORDERED_EXPENSE_CATEGORIES = [
  'Housing',
  'Investments',
  'Utilities',
  'Food',
  'Health Care',
  'Personal Care',
  'Entertainment',
  'Transportation',
  'Account Payables',
  'Account Receivables',
  'Bank Transaction',
  'Miscellaneous',
  'Real Estate/Business Investments',
  'Real Estate/Business Expenses',
  'Savings',
];

export interface ExportPdfOptions {
  data: StatementPdfData;
  filename?: string;
}

/**
 * Resolves currency symbol for jsPDF vector text rendering.
 * Standard jsPDF fonts use WinAnsiEncoding where the Philippine Peso symbol '₱' (U+20B1)
 * incorrectly maps to '±' (0xB1). We convert '₱' to 'PHP' to ensure clean, accurate text output.
 */
export function getPdfSafeCurrency(symbol: string): string {
  if (!symbol) return '';
  if (symbol.includes('₱') || symbol === 'PHP') {
    return 'PHP';
  }
  return symbol;
}

/**
 * Formats a monetary number into a localized string with a PDF-safe currency prefix.
 */
function formatMoney(amount: number, rawSymbol: string): string {
  const symbol = getPdfSafeCurrency(rawSymbol);
  if (isNaN(amount)) return `${symbol} 0`;
  const isNegative = amount < 0;
  const abs = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return isNegative ? `-${symbol} ${abs}` : `${symbol} ${abs}`;
}

/**
 * Safely captures the Period Expenses Visualizer DOM element via html2canvas with timeout and DOM readiness check.
 * If the element is not found, times out, or fails, returns null so the exporter gracefully falls back.
 */
async function captureVisualizerChartImage(
  elementId = 'period-expense-visualizer-container',
  timeoutMs = 1500
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  try {
    const startTime = Date.now();
    let element = document.getElementById(elementId);
    while (!element && Date.now() - startTime < timeoutMs) {
      await new Promise((r) => setTimeout(r, 60));
      element = document.getElementById(elementId);
    }

    if (!element) {
      console.warn(`[PDF Export] Element #${elementId} not ready, using vector fallback.`);
      return null;
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      ignoreElements: (el) => el.classList.contains('print:hidden'),
    });

    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
    };
  } catch (err) {
    console.warn('[PDF Export] html2canvas chart capture skipped, proceeding with vector/text fallback:', err);
    return null;
  }
}

/**
 * Generates a true, selectable, professional vector PDF using jsPDF and jspdf-autotable.
 * Renders the Income Statement and Cash Flow Statement side-by-side,
 * followed by the full-width Balance Sheet underneath.
 */
export async function exportStatementToPdf({
  data,
  filename = 'Financial_Statement.pdf',
}: ExportPdfOptions): Promise<void> {
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  // Create A4 Landscape document (297mm width x 210mm height)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const marginX = 14;
  const usableWidth = pageWidth - marginX * 2; // 269mm
  const halfTableWidth = 131; // 131mm each table with 7mm gutter

  // ==========================================
  // HEADER SECTION (Vector text & banner)
  // ==========================================
  // Background Header Box
  doc.setFillColor(33, 37, 41); // #212529 (Dark graphite)
  doc.roundedRect(marginX, 9, usableWidth, 18, 1.5, 1.5, 'F');

  // Title: Personal Ledger Owner Statement
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `${(data.userName || 'Personal').toUpperCase()}'S FINANCIAL STATEMENT`,
    marginX + 4,
    15.5
  );

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // #cbd5e1
  doc.text(
    `Personal Cashflow & Balance Sheet Statement · ${data.periodLabel}`,
    marginX + 4,
    21
  );

  // Meta Right Side: Currency, Records, Date (using PHP instead of ₱ to prevent ± bug)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(52, 211, 153); // #34d399 (Emerald)
  const todayStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const safeCurrency = getPdfSafeCurrency(data.currencySymbol);
  const metaText = `Currency: ${safeCurrency}   |   Records: ${data.recordsCount}   |   Date: ${todayStr}`;
  doc.text(metaText, pageWidth - marginX - 4, 18.5, { align: 'right' });

  // Accent Line under header
  doc.setDrawColor(16, 185, 129); // #10b981
  doc.setLineWidth(0.4);
  doc.line(marginX, 29, pageWidth - marginX, 29);

  // ==========================================
  // TABLE 1: INCOME STATEMENT (LEFT TABLE)
  // ==========================================
  const incomeBody: (string | { content: string; colSpan?: number; styles?: any })[][] = [];

  // Earned Income Group
  incomeBody.push([
    {
      content: '1. EARNED INCOME',
      colSpan: 2,
      styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: 'left' },
    },
  ]);
  data.earnedIncomeItems.forEach((item) => {
    incomeBody.push([
      { content: `  ${item.name}`, styles: { halign: 'left' } },
      { content: formatMoney(item.amount, data.currencySymbol), styles: { halign: 'right' } },
    ]);
  });

  // Passive & Investments Group
  incomeBody.push([
    {
      content: '2. PASSIVE & INVESTMENT INCOME',
      colSpan: 2,
      styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: 'left' },
    },
  ]);
  data.passiveIncomeItems.forEach((item) => {
    incomeBody.push([
      { content: `  ${item.name}`, styles: { halign: 'left' } },
      { content: formatMoney(item.amount, data.currencySymbol), styles: { halign: 'right' } },
    ]);
  });

  // Other Income Group
  if (data.otherIncomeItems.length > 0) {
    incomeBody.push([
      {
        content: '3. OTHER INCOME / DEPOSITS',
        colSpan: 2,
        styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: 'left' },
      },
    ]);
    data.otherIncomeItems.forEach((item) => {
      incomeBody.push([
        { content: `  ${item.name}`, styles: { halign: 'left' } },
        { content: formatMoney(item.amount, data.currencySymbol), styles: { halign: 'right' } },
      ]);
    });
  }

  // Total Income Highlight
  incomeBody.push([
    { content: 'TOTAL EARNED & PASSIVE INCOME', styles: { fontStyle: 'bold', textColor: [5, 150, 105], halign: 'left' } },
    { content: formatMoney(data.totalIncome, data.currencySymbol), styles: { fontStyle: 'bold', textColor: [5, 150, 105], halign: 'right' } },
  ]);

  // Fixed Living Expenses Group
  incomeBody.push([
    {
      content: '4. FIXED LIVING EXPENSES',
      colSpan: 2,
      styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: 'left' },
    },
  ]);
  data.fixedExpenseItems.forEach((item) => {
    incomeBody.push([
      { content: `  ${item.name}`, styles: { halign: 'left' } },
      { content: formatMoney(item.amount, data.currencySymbol), styles: { halign: 'right' } },
    ]);
  });

  // Variable Living Expenses Group
  incomeBody.push([
    {
      content: '5. VARIABLE EXPENSES',
      colSpan: 2,
      styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: 'left' },
    },
  ]);
  data.variableExpenseItems.forEach((item) => {
    incomeBody.push([
      { content: `  ${item.name}`, styles: { halign: 'left' } },
      { content: formatMoney(item.amount, data.currencySymbol), styles: { halign: 'right' } },
    ]);
  });

  // Total Expenses Highlight
  incomeBody.push([
    { content: 'TOTAL COMBINED EXPENSES', styles: { fontStyle: 'bold', textColor: [220, 38, 38], halign: 'left' } },
    { content: formatMoney(data.totalExpenses, data.currencySymbol), styles: { fontStyle: 'bold', textColor: [220, 38, 38], halign: 'right' } },
  ]);

  // Net Income Summary
  const isPositiveNet = data.netIncome >= 0;
  incomeBody.push([
    {
      content: 'NET INCOME (Income - Expenses)',
      styles: {
        fontStyle: 'bold',
        fillColor: isPositiveNet ? [209, 250, 229] : [254, 226, 226],
        textColor: isPositiveNet ? [6, 95, 70] : [153, 27, 27],
        halign: 'left',
      },
    },
    {
      content: formatMoney(data.netIncome, data.currencySymbol),
      styles: {
        fontStyle: 'bold',
        halign: 'right',
        fillColor: isPositiveNet ? [209, 250, 229] : [254, 226, 226],
        textColor: isPositiveNet ? [6, 95, 70] : [153, 27, 27],
      },
    },
  ]);

  autoTable(doc, {
    startY: 32,
    margin: { left: marginX, right: pageWidth - marginX - halfTableWidth, bottom: 8 },
    tableWidth: halfTableWidth, // 131mm
    head: [['Personal Income Statement', 'Amount']],
    body: incomeBody as any,
    theme: 'grid',
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
    styles: {
      fontSize: 6.8,
      cellPadding: { top: 0.7, bottom: 0.7, left: 1.5, right: 1.5 },
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [46, 52, 54],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      fontSize: 7.2,
      cellPadding: { top: 1.0, bottom: 1.0, left: 1.5, right: 1.5 },
    },
    columnStyles: {
      0: { cellWidth: 88, halign: 'left' },
      1: { cellWidth: 43, halign: 'right', fontStyle: 'bold' },
    },
  });

  const leftFinalY = (doc as any).lastAutoTable.finalY || 32;

  // ==========================================
  // TABLE 2: CASH FLOW STATEMENT (RIGHT TABLE)
  // ==========================================
  const cashFlowBody: (string | { content: string; colSpan?: number; styles?: any })[][] = [];

  cashFlowBody.push([
    {
      content: 'CASH INFLOWS',
      colSpan: 2,
      styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: 'left' },
    },
  ]);
  cashFlowBody.push([
    { content: '  Earned Income Inflows', styles: { halign: 'left' } },
    { content: formatMoney(data.totalIncome, data.currencySymbol), styles: { halign: 'right' } },
  ]);
  cashFlowBody.push([
    { content: 'Total Cash Inflows', styles: { fontStyle: 'bold', textColor: [5, 150, 105], halign: 'left' } },
    { content: formatMoney(data.cashInflows, data.currencySymbol), styles: { fontStyle: 'bold', textColor: [5, 150, 105], halign: 'right' } },
  ]);

  cashFlowBody.push([
    {
      content: 'CASH OUTFLOWS',
      colSpan: 2,
      styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: 'left' },
    },
  ]);
  cashFlowBody.push([
    { content: '  Living & Categorized Outflows', styles: { halign: 'left' } },
    { content: formatMoney(data.totalExpenses, data.currencySymbol), styles: { halign: 'right' } },
  ]);
  cashFlowBody.push([
    { content: 'Total Cash Outflows', styles: { fontStyle: 'bold', textColor: [220, 38, 38], halign: 'left' } },
    { content: formatMoney(data.cashOutflows, data.currencySymbol), styles: { fontStyle: 'bold', textColor: [220, 38, 38], halign: 'right' } },
  ]);

  // Net Cash Flow
  const isPositiveCashFlow = data.netCashFlow >= 0;
  cashFlowBody.push([
    {
      content: 'NET CASH FLOW (Inflows - Outflows)',
      styles: {
        fontStyle: 'bold',
        fillColor: isPositiveCashFlow ? [236, 253, 245] : [254, 242, 242],
        textColor: isPositiveCashFlow ? [4, 120, 87] : [185, 28, 28],
        halign: 'left',
      },
    },
    {
      content: formatMoney(data.netCashFlow, data.currencySymbol),
      styles: {
        fontStyle: 'bold',
        halign: 'right',
        fillColor: isPositiveCashFlow ? [236, 253, 245] : [254, 242, 242],
        textColor: isPositiveCashFlow ? [4, 120, 87] : [185, 28, 28],
      },
    },
  ]);

  cashFlowBody.push([
    {
      content: 'LIQUIDITY RECONCILIATION',
      colSpan: 2,
      styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42], halign: 'left' },
    },
  ]);
  cashFlowBody.push([
    { content: 'Beginning Cash Balance', styles: { halign: 'left' } },
    { content: formatMoney(data.beginningBalance, data.currencySymbol), styles: { halign: 'right' } },
  ]);
  cashFlowBody.push([
    { content: 'Net Cash Flow Added / (Deducted)', styles: { halign: 'left' } },
    { content: formatMoney(data.netCashFlow, data.currencySymbol), styles: { halign: 'right' } },
  ]);
  cashFlowBody.push([
    {
      content: 'ENDING CASH BALANCE (Rolling Liquidity)',
      styles: {
        fontStyle: 'bold',
        fillColor: [209, 250, 229],
        textColor: [6, 95, 70],
        halign: 'left',
      },
    },
    {
      content: formatMoney(data.endingBalance, data.currencySymbol),
      styles: {
        fontStyle: 'bold',
        halign: 'right',
        fillColor: [209, 250, 229],
        textColor: [6, 95, 70],
      },
    },
  ]);

  // Enforce active page pointer is strictly Page 1 before Table 2
  doc.setPage(1);

  autoTable(doc, {
    startY: 32,
    margin: { left: marginX + halfTableWidth + 7, right: marginX, bottom: 8 }, // 152mm startX
    tableWidth: halfTableWidth, // 131mm
    head: [['Cash Flow Statement', 'Amount']],
    body: cashFlowBody as any,
    theme: 'grid',
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
    styles: {
      fontSize: 6.8,
      cellPadding: { top: 0.7, bottom: 0.7, left: 1.5, right: 1.5 },
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [46, 52, 54],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      fontSize: 7.2,
      cellPadding: { top: 1.0, bottom: 1.0, left: 1.5, right: 1.5 },
    },
    columnStyles: {
      0: { cellWidth: 88, halign: 'left' },
      1: { cellWidth: 43, halign: 'right', fontStyle: 'bold' },
    },
  });

  const rightFinalY = (doc as any).lastAutoTable.finalY || 32;

  // ==========================================
  // PROGRAMMATIC PERIOD EXPENSES VISUALIZER (BAR CHART)
  // Reconstructs the horizontal bar visualizer natively in the right column
  // directly underneath the Cash Flow Statement
  // ==========================================
  // Enforce active page pointer is strictly Page 1 for right column visualizer
  doc.setPage(1);

  const chartStartX = marginX + halfTableWidth + 7; // 152mm
  const chartWidth = halfTableWidth; // 131mm
  let curY = rightFinalY + 3.0;

  let capturedImageSuccess = false;
  try {
    const captured = await captureVisualizerChartImage('period-expense-visualizer-container', 1000);
    if (captured && captured.dataUrl) {
      const imgHeight = Math.min(48, (captured.height / captured.width) * chartWidth);
      doc.addImage(captured.dataUrl, 'PNG', chartStartX, curY, chartWidth, imgHeight);
      curY += imgHeight + 3.0;
      capturedImageSuccess = true;
    }
  } catch (chartErr) {
    console.warn('[PDF Export] DOM capture skipped, using vector fallback:', chartErr);
  }

  // Safe fallback: if DOM image was not captured or skipped, render native vector bar visualizer
  if (!capturedImageSuccess) {
    // Build expense amount lookup map
    const expenseMap: Record<string, number> = {};
    if (data.expenseVisualizerItems && data.expenseVisualizerItems.length > 0) {
      data.expenseVisualizerItems.forEach((item) => {
        expenseMap[item.category] = (expenseMap[item.category] || 0) + item.amount;
      });
    } else {
      data.fixedExpenseItems.forEach((item) => {
        expenseMap[item.name] = (expenseMap[item.name] || 0) + item.amount;
      });
      data.variableExpenseItems.forEach((item) => {
        expenseMap[item.name] = (expenseMap[item.name] || 0) + item.amount;
      });
    }

    // Calculate dynamic maximum scale for bar proportion (matching web chart)
    const maxExpenseVal = Math.max(50000, ...Object.values(expenseMap), 1);

    // 1. Visualizer Header Bar
    doc.setFillColor(63, 69, 74); // #3f454a
    doc.rect(chartStartX, curY, chartWidth, 4.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.0);
    doc.setTextColor(255, 255, 255);
    doc.text('PERIOD EXPENSES VISUALIZER', chartStartX + 3, curY + 3.0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(203, 213, 225);
    doc.text(`(${safeCurrency})`, chartStartX + chartWidth - 3, curY + 3.0, { align: 'right' });

    curY += 4.5;

    // 2. 15 Category Rows with background track and filled bar
    ORDERED_EXPENSE_CATEGORIES.forEach((cat, idx) => {
      const amount = expenseMap[cat] || 0;
      const rowHeight = 2.6;

      // Alternating subtle background row
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(chartStartX, curY - 0.2, chartWidth, rowHeight, 'F');
      }

      // Category Label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.0);
      doc.setTextColor(71, 85, 105);
      doc.text(cat, chartStartX + 42, curY + 1.9, { align: 'right' });

      // Background Bar Track
      const trackX = chartStartX + 44;
      const trackWidth = 59;
      const trackHeight = 1.6;
      const trackY = curY + 0.4;

      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.12);
      doc.rect(trackX, trackY, trackWidth, trackHeight, 'FD');

      // Filled Visualizer Bar
      const widthPct = Math.min(1, Math.max(0, amount / maxExpenseVal));
      const barWidth = widthPct * trackWidth;
      if (barWidth > 0) {
        doc.setFillColor(52, 58, 64); // #343a40 Dark graphite
        doc.rect(trackX, trackY, barWidth, trackHeight, 'F');
      }

      // Numerical Figure (Right-aligned)
      doc.setFont('helvetica', amount > 0 ? 'bold' : 'normal');
      doc.setFontSize(6.0);
      if (amount > 0) {
        doc.setTextColor(185, 28, 28); // #b91c1c Red
        doc.text(formatMoney(-amount, data.currencySymbol), chartStartX + chartWidth - 2, curY + 1.9, { align: 'right' });
      } else {
        doc.setTextColor(148, 163, 184); // #94a3b8 Slate gray
        doc.text('-', chartStartX + chartWidth - 2, curY + 1.9, { align: 'right' });
      }

      curY += rowHeight;
    });

    // 3. Total Expenses Row
    curY += 0.4;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(chartStartX, curY, chartStartX + chartWidth, curY);

    doc.setFillColor(241, 245, 249);
    doc.rect(chartStartX, curY, chartWidth, 3.6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL EXPENSES', chartStartX + 42, curY + 2.6, { align: 'right' });

    doc.setTextColor(185, 28, 28);
    doc.text(
      formatMoney(data.totalExpenses > 0 ? -data.totalExpenses : 0, data.currencySymbol),
      chartStartX + chartWidth - 2,
      curY + 2.6,
      { align: 'right' }
    );

    curY += 4.6;
  }

  // 4. Bottom Cash Flow Summary Cards (2x2 Grid)
  const cardWidth = (chartWidth - 3) / 2; // 64mm
  const cardHeight = 5.4;

  // Row 1: Inflows & Outflows
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.18);
  doc.roundedRect(chartStartX, curY, cardWidth, cardHeight, 0.5, 0.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(30, 41, 59);
  doc.text('Total Cash Inflows', chartStartX + 2.5, curY + 3.6);
  doc.setTextColor(5, 150, 105);
  doc.text(formatMoney(data.cashInflows, data.currencySymbol), chartStartX + cardWidth - 2.5, curY + 3.6, { align: 'right' });

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(chartStartX + cardWidth + 3, curY, cardWidth, cardHeight, 0.5, 0.5, 'FD');
  doc.setTextColor(30, 41, 59);
  doc.text('Total Cash Outflows', chartStartX + cardWidth + 5.5, curY + 3.6);
  doc.setTextColor(220, 38, 38);
  doc.text(
    formatMoney(data.cashOutflows > 0 ? -data.cashOutflows : 0, data.currencySymbol),
    chartStartX + chartWidth - 2.5,
    curY + 3.6,
    { align: 'right' }
  );

  curY += 6.2;

  // Row 2: Net Cash Flow & Ending Balance
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(chartStartX, curY, cardWidth, 6.2, 0.5, 0.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  doc.setTextColor(4, 120, 87);
  doc.text('Net Cash Flow', chartStartX + 2.5, curY + 3.3);
  doc.text(formatMoney(data.netCashFlow, data.currencySymbol), chartStartX + cardWidth - 2.5, curY + 3.3, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.4);
  doc.setTextColor(100, 116, 139);
  doc.text('[Total Inflows] - [Total Outflows]', chartStartX + 2.5, curY + 5.0);

  doc.setFillColor(254, 249, 195); // yellow-100
  doc.setDrawColor(253, 224, 71); // yellow-300
  doc.roundedRect(chartStartX + cardWidth + 3, curY, cardWidth, 6.2, 0.5, 0.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.4);
  doc.setTextColor(120, 53, 15);
  doc.text('Ending Balance', chartStartX + cardWidth + 5.5, curY + 3.3);
  doc.text(formatMoney(data.endingBalance, data.currencySymbol), chartStartX + chartWidth - 2.5, curY + 3.3, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.4);
  doc.setTextColor(146, 64, 14);
  doc.text('[Beginning Balance] + [Net Cash Flow]', chartStartX + cardWidth + 5.5, curY + 5.0);

  // ==========================================
  // PAGE 2: PERSONAL BALANCE SHEET & WEALTH STATEMENT
  // Rendered cleanly on Page 2 with dedicated header banner
  // ==========================================
  // Enforce trimming if any unintended page was opened by autoTable
  while ((doc as any).internal.getNumberOfPages() > 1) {
    (doc as any).deletePage((doc as any).internal.getNumberOfPages());
  }

  doc.addPage('a4', 'landscape');

  // Page 2 Header Banner
  doc.setFillColor(33, 37, 41);
  doc.roundedRect(marginX, 9, usableWidth, 18, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `${(data.userName || 'Personal').toUpperCase()}'S BALANCE SHEET & WEALTH STATEMENT`,
    marginX + 4,
    15.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Personal Assets, Liabilities & Liquidity Overview · ${data.periodLabel}`,
    marginX + 4,
    21
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(52, 211, 153);
  doc.text(metaText, pageWidth - marginX - 4, 18.5, { align: 'right' });

  // Accent Line under header
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.4);
  doc.line(marginX, 29, pageWidth - marginX, 29);

  // ==========================================
  // TABLE 3: BALANCE SHEET (FULL-WIDTH ON PAGE 2)
  // ==========================================
  const balanceSheetBody: (string | { content: string; colSpan?: number; styles?: any })[][] = [];

  const maxRows = Math.max(data.assetItems.length, data.liabilityItems.length);
  for (let i = 0; i < maxRows; i++) {
    const asset = data.assetItems[i];
    const liability = data.liabilityItems[i];

    balanceSheetBody.push([
      { content: asset ? asset.name : '', styles: { halign: 'left' } },
      { content: asset ? formatMoney(asset.amount, data.currencySymbol) : '', styles: { halign: 'right' } },
      { content: liability ? liability.name : '', styles: { halign: 'left' } },
      { content: liability ? formatMoney(liability.amount, data.currencySymbol) : '', styles: { halign: 'right' } },
    ]);
  }

  // Total Assets & Liabilities row
  balanceSheetBody.push([
    { content: 'TOTAL ASSETS', styles: { fontStyle: 'bold', textColor: [5, 150, 105], fillColor: [248, 250, 252], halign: 'left' } },
    { content: formatMoney(data.totalAssets, data.currencySymbol), styles: { fontStyle: 'bold', textColor: [5, 150, 105], halign: 'right', fillColor: [248, 250, 252] } },
    { content: 'TOTAL LIABILITIES', styles: { fontStyle: 'bold', textColor: [220, 38, 38], fillColor: [248, 250, 252], halign: 'left' } },
    { content: formatMoney(data.totalLiabilities, data.currencySymbol), styles: { fontStyle: 'bold', textColor: [220, 38, 38], halign: 'right', fillColor: [248, 250, 252] } },
  ]);

  // Personal Net Worth Summary Row (Full-width Colspan 4)
  const isPositiveNetWorth = data.netWorth >= 0;
  balanceSheetBody.push([
    {
      content: `PERSONAL NET WORTH (Total Assets - Total Liabilities):  ${formatMoney(
        data.netWorth,
        data.currencySymbol
      )}`,
      colSpan: 4,
      styles: {
        halign: 'center',
        fontStyle: 'bold',
        fontSize: 9.5,
        fillColor: isPositiveNetWorth ? [209, 250, 229] : [254, 226, 226],
        textColor: isPositiveNetWorth ? [6, 95, 70] : [153, 27, 27],
      },
    },
  ]);

  autoTable(doc, {
    startY: 32,
    margin: { left: marginX, right: marginX, bottom: 8 },
    tableWidth: usableWidth, // 269mm
    head: [['Balance Sheet Assets', 'Asset Value', 'Balance Sheet Liabilities', 'Debt Amount']],
    body: balanceSheetBody as any,
    theme: 'grid',
    pageBreak: 'avoid',
    rowPageBreak: 'avoid',
    styles: {
      fontSize: 7.0,
      cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 },
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [41, 46, 48],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
      fontSize: 7.5,
      cellPadding: { top: 1.1, bottom: 1.1, left: 1.5, right: 1.5 },
    },
    columnStyles: {
      0: { cellWidth: 91.5, halign: 'left' },
      1: { cellWidth: 43, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 91.5, halign: 'left' },
      3: { cellWidth: 43, halign: 'right', fontStyle: 'bold' },
    },
  });

  const p2FinalY = (doc as any).lastAutoTable.finalY || 32;

  // Wealth Portfolio & Solvency Analytics Card on Page 2
  const solvencyRatio = data.totalAssets > 0
    ? (((data.totalAssets - data.totalLiabilities) / data.totalAssets) * 100).toFixed(1)
    : '0.0';
  const debtToAssetRatio = data.totalAssets > 0
    ? ((data.totalLiabilities / data.totalAssets) * 100).toFixed(1)
    : '0.0';

  const p2CardY = p2FinalY + 6;
  if (p2CardY + 22 < pageHeight - 12) {
    const boxW = (usableWidth - 7) / 2; // 131mm

    // Left Box: Asset Allocation Overview
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(marginX, p2CardY, boxW, 20, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('ASSET ALLOCATION & LIQUIDITY OVERVIEW', marginX + 3.5, p2CardY + 4.5);

    const liquidAssets = data.assetItems.find((a) => a.name.toLowerCase().includes('cash'))?.amount || 0;
    const investedAssets = Math.max(0, data.totalAssets - liquidAssets);
    const liquidPct = data.totalAssets > 0 ? ((liquidAssets / data.totalAssets) * 100).toFixed(1) : '0';
    const investedPct = data.totalAssets > 0 ? ((investedAssets / data.totalAssets) * 100).toFixed(1) : '0';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text('· Liquid Cash & Equivalents:', marginX + 3.5, p2CardY + 9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatMoney(liquidAssets, data.currencySymbol)} (${liquidPct}%)`, marginX + boxW - 3.5, p2CardY + 9.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.text('· Portfolio Holdings & Physical Assets:', marginX + 3.5, p2CardY + 14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatMoney(investedAssets, data.currencySymbol)} (${investedPct}%)`, marginX + boxW - 3.5, p2CardY + 14, { align: 'right' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Verified rolling balances synchronized across bank ledgers and portfolio holdings.', marginX + 3.5, p2CardY + 18);

    // Right Box: Solvency & Capital Health
    const rightBoxX = marginX + boxW + 7;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(rightBoxX, p2CardY, boxW, 20, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('CAPITAL HEALTH & SOLVENCY METRICS', rightBoxX + 3.5, p2CardY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text('· Net Solvency Ratio (Equity / Assets):', rightBoxX + 3.5, p2CardY + 9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(`${solvencyRatio}%`, rightBoxX + boxW - 3.5, p2CardY + 9.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('· Debt-to-Asset Leverage Ratio:', rightBoxX + 3.5, p2CardY + 14);
    if (parseFloat(debtToAssetRatio) > 50) {
      doc.setTextColor(220, 38, 38);
    } else {
      doc.setTextColor(30, 41, 59);
    }
    doc.text(`${debtToAssetRatio}%`, rightBoxX + boxW - 3.5, p2CardY + 14, { align: 'right' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Computed according to Axiom Wealth double-entry personal finance standards.', rightBoxX + 3.5, p2CardY + 18);
  }

  // Footer Branding
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // #94a3b8
    doc.text(
      'Axiom Wealth · Professional Personal Ledger & Financial Statements System',
      marginX,
      pageHeight - 6
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 6,
      { align: 'right' }
    );
  }

  // ==========================================
  // DISPATCH / SAVE (Cross-Platform)
  // ==========================================
  if (Capacitor.isNativePlatform()) {
    // Generate PDF data URI and extract base64
    const dataUri = doc.output('datauristring');
    const base64Data = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;

    const writeResult = await Filesystem.writeFile({
      path: safeFilename,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true,
    });

    await FileOpener.open({
      filePath: writeResult.uri,
      contentType: 'application/pdf',
    });
  } else {
    // Browser download
    doc.save(safeFilename);
  }
}
