/**
 * Receipt & Bank Transaction OCR Parser Service
 * Uses Tesseract.js with intelligent heuristic regex fallback
 * to extract Transaction Amount, Date, Vendor/Description, and Type.
 */

export interface ParsedTransactionData {
  amount?: number;
  date?: string; // YYYY-MM-DD
  name?: string;
  type: 'income' | 'expense';
  suggestedCategory?: string;
  rawText: string;
  confidence: number;
}

export type DocumentType = 'receipt' | 'bank_transaction';

/**
 * Preprocess image on a Canvas for optimal OCR recognition (grayscale + contrast stretch)
 */
export async function preprocessImage(imageSource: string | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource));
        return;
      }

      // Max dimension 1800px to maintain speed while keeping fine text crisp
      let width = img.width;
      let height = img.height;
      const maxDim = 1800;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Simple grayscale + threshold contrast boost
      try {
        const imgData = ctx.getImageData(0, 0, width, height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          // Contrast stretch
          const contrast = Math.min(255, Math.max(0, (gray - 128) * 1.25 + 128));
          d[i] = contrast;
          d[i + 1] = contrast;
          d[i + 2] = contrast;
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(canvas.toDataURL('image/png'));
      }
    };
    img.onerror = reject;

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = URL.createObjectURL(imageSource);
    }
  });
}

/**
 * Perform OCR using Tesseract.js (dynamically imported to minimize bundle footprint)
 */
export async function performOCR(
  imageSource: string | File,
  onProgress?: (progress: number, status: string) => void
): Promise<string> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (onProgress && m.status) {
          onProgress(Math.round((m.progress || 0) * 100), m.status);
        }
      },
    });

    const processedUrl = await preprocessImage(imageSource);
    const ret = await worker.recognize(processedUrl);
    await worker.terminate();
    return ret.data.text || '';
  } catch (error) {
    console.warn('Tesseract OCR error, falling back to simulated extraction:', error);
    return '';
  }
}

/**
 * Intelligent extraction of transaction fields from parsed OCR text
 */
export function parseTransactionFromText(
  rawText: string,
  docType: DocumentType
): ParsedTransactionData {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Determine Inflow vs Outflow based on document type & keywords
  let detectedType: 'income' | 'expense' = docType === 'receipt' ? 'expense' : 'expense';

  const lowerText = rawText.toLowerCase();

  if (docType === 'bank_transaction') {
    const isCredit =
      lowerText.includes('credit') ||
      lowerText.includes('deposit') ||
      lowerText.includes('received') ||
      lowerText.includes('inflow') ||
      lowerText.includes('transfer from') ||
      lowerText.includes('salary') ||
      lowerText.includes('remittance');

    const isDebit =
      lowerText.includes('debit') ||
      lowerText.includes('payment to') ||
      lowerText.includes('withdrawal') ||
      lowerText.includes('sent to') ||
      lowerText.includes('purchase') ||
      lowerText.includes('transfer to');

    if (isCredit && !isDebit) {
      detectedType = 'income';
    } else if (isDebit) {
      detectedType = 'expense';
    }
  } else {
    // For receipts, check if it's a refund or return
    if (lowerText.includes('refund') || lowerText.includes('return receipt') || lowerText.includes('cashback')) {
      detectedType = 'income';
    } else {
      detectedType = 'expense';
    }
  }

  // 2. Extract Amount
  // Search for currency symbols (₱, $, €, £, PHP) or keywords like TOTAL, AMOUNT, DUE, NET, BALANCE
  let detectedAmount: number | undefined;

  // Regex for finding amounts: e.g. 1,250.50 or 1250.00 or PHP 450.00
  const amountRegex = /(?:total|amount|due|net|php|₱|\$|eur|balance|grand total|subtotal)?\s*[:=]?\s*(?:php|₱|\$|€|£)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2})?)/gi;

  const candidateAmounts: number[] = [];

  // Line-by-line prioritized extraction (lines containing 'total', 'amount', 'due' are weighted highest)
  let prioritizedAmount: number | undefined;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    const hasTotalKeyword =
      lowerLine.includes('total') ||
      lowerLine.includes('amount') ||
      lowerLine.includes('due') ||
      lowerLine.includes('net') ||
      lowerLine.includes('balance') ||
      lowerLine.includes('php') ||
      lowerLine.includes('₱');

    const matches = [...line.matchAll(amountRegex)];
    for (const match of matches) {
      const rawNum = match[1]?.replace(/,/g, '');
      const num = parseFloat(rawNum);
      if (!isNaN(num) && num > 0 && num < 10000000) {
        candidateAmounts.push(num);
        if (hasTotalKeyword && (prioritizedAmount === undefined || lowerLine.includes('total'))) {
          prioritizedAmount = num;
        }
      }
    }
  }

  detectedAmount = prioritizedAmount || (candidateAmounts.length > 0 ? Math.max(...candidateAmounts) : undefined);

  // 3. Extract Date (Formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, DD-Mon-YYYY)
  let detectedDate: string | undefined;

  // Format YYYY-MM-DD
  const isoDateMatch = rawText.match(/\b(20[2-3][0-9])[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12][0-9]|3[01])\b/);
  if (isoDateMatch) {
    detectedDate = `${isoDateMatch[1]}-${isoDateMatch[2].padStart(2, '0')}-${isoDateMatch[3].padStart(2, '0')}`;
  } else {
    // Format MM/DD/YYYY or DD/MM/YYYY
    const slashDateMatch = rawText.match(/\b(0?[1-9]|[12][0-9]|3[01])[-/.](0?[1-9]|[12][0-9]|3[01])[-/.](20[2-3][0-9])\b/);
    if (slashDateMatch) {
      const p1 = parseInt(slashDateMatch[1], 10);
      const p2 = parseInt(slashDateMatch[2], 10);
      const year = slashDateMatch[3];
      // If p1 > 12, it must be DD/MM/YYYY
      if (p1 > 12) {
        detectedDate = `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
      } else {
        // Assume MM/DD/YYYY default
        detectedDate = `${year}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
      }
    } else {
      // Month name date e.g. Oct 19, 2026 or 19 Oct 2026
      const monthNames = [
        'jan', 'feb', 'mar', 'apr', 'may', 'jun',
        'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
      ];
      const monthRegex = new RegExp(
        `\\b(?:(\\d{1,2})\\s+)?(${monthNames.join('|')})[a-z]*\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20[2-3]\\d)\\b`,
        'i'
      );
      const mMatch = rawText.match(monthRegex);
      if (mMatch) {
        const mIdx = monthNames.findIndex((m) => mMatch[2].toLowerCase().startsWith(m)) + 1;
        const day = mMatch[1] || mMatch[3];
        const year = mMatch[4];
        if (mIdx > 0 && day && year) {
          detectedDate = `${year}-${String(mIdx).padStart(2, '0')}-${String(parseInt(day, 10)).padStart(2, '0')}`;
        }
      }
    }
  }

  // Fallback date to today if not parsed
  if (!detectedDate) {
    detectedDate = new Date().toISOString().split('T')[0];
  }

  // 4. Extract Merchant or Description Name
  let detectedName: string | undefined;

  // For receipts, the top non-empty line (1-3) is usually the vendor name (e.g. Starbucks, Shell, SM Store)
  const candidateVendorLines = lines.filter(
    (l) =>
      l.length > 2 &&
      !l.toLowerCase().includes('receipt') &&
      !l.toLowerCase().includes('invoice') &&
      !l.toLowerCase().includes('welcome') &&
      !l.toLowerCase().includes('official') &&
      !/\d{3,}/.test(l)
  );

  if (candidateVendorLines.length > 0) {
    detectedName = candidateVendorLines[0];
  } else if (docType === 'bank_transaction') {
    detectedName = 'Bank Transfer / Statement Entry';
  } else {
    detectedName = 'Scanned Purchase Receipt';
  }

  // 5. Category Inference
  let suggestedCategory: string | undefined;
  const nLower = (detectedName || '').toLowerCase() + ' ' + lowerText;

  if (detectedType === 'income') {
    if (nLower.includes('salary') || nLower.includes('payroll') || nLower.includes('wage')) {
      suggestedCategory = 'Salary/Wages';
    } else if (nLower.includes('dividend') || nLower.includes('interest')) {
      suggestedCategory = 'Interest/Dividends';
    } else if (nLower.includes('invest') || nLower.includes('stock') || nLower.includes('equity')) {
      suggestedCategory = 'Investments';
    } else {
      suggestedCategory = 'Bank Transaction';
    }
  } else {
    if (
      nLower.includes('restaurant') ||
      nLower.includes('cafe') ||
      nLower.includes('coffee') ||
      nLower.includes('food') ||
      nLower.includes('dining') ||
      nLower.includes('grocer') ||
      nLower.includes('market') ||
      nLower.includes('supermarket') ||
      nLower.includes('jollibee') ||
      nLower.includes('mcdonald') ||
      nLower.includes('starbucks')
    ) {
      suggestedCategory = 'Food';
    } else if (
      nLower.includes('shell') ||
      nLower.includes('petron') ||
      nLower.includes('caltex') ||
      nLower.includes('fuel') ||
      nLower.includes('gas') ||
      nLower.includes('grab') ||
      nLower.includes('taxi') ||
      nLower.includes('toll') ||
      nLower.includes('auto')
    ) {
      suggestedCategory = 'Transportation';
    } else if (
      nLower.includes('electric') ||
      nLower.includes('water') ||
      nLower.includes('meralco') ||
      nLower.includes('internet') ||
      nLower.includes('telecom') ||
      nLower.includes('pldt') ||
      nLower.includes('globe')
    ) {
      suggestedCategory = 'Utilities';
    } else if (
      nLower.includes('pharmacy') ||
      nLower.includes('hospital') ||
      nLower.includes('clinic') ||
      nLower.includes('med') ||
      nLower.includes('doctor')
    ) {
      suggestedCategory = 'Health Care';
    } else if (
      nLower.includes('cinema') ||
      nLower.includes('movie') ||
      nLower.includes('netflix') ||
      nLower.includes('spotify') ||
      nLower.includes('concert') ||
      nLower.includes('game')
    ) {
      suggestedCategory = 'Entertainment';
    } else if (nLower.includes('rent') || nLower.includes('mortgage') || nLower.includes('condo') || nLower.includes('housing')) {
      suggestedCategory = 'Housing';
    } else {
      suggestedCategory = 'Miscellaneous';
    }
  }

  return {
    amount: detectedAmount,
    date: detectedDate,
    name: detectedName,
    type: detectedType,
    suggestedCategory,
    rawText,
    confidence: detectedAmount ? 85 : 50,
  };
}

export interface ExtractedLineItem {
  id: string;
  name: string;
  price: number;
  rawText: string;
}

/**
 * Extract specifically Item Name and Price from raw text inside a line-item crop box
 */
export function parseLineItemFromText(rawText: string): { name: string; price: number; rawText: string } {
  if (!rawText || !rawText.trim()) {
    return { name: 'Line Item', price: 0, rawText: '' };
  }
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { name: 'Line Item', price: 0, rawText };
  }

  // Look for line containing a price (e.g. 112.00, 40.00V, 150.50, PHP 112.00)
  const priceRegex = /(?:php|₱|\$)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})|[0-9]+(?:\.[0-9]{2}))\s*[a-zA-Z*]?$/i;

  for (const line of lines) {
    const match = line.match(priceRegex);
    if (match) {
      const rawPrice = match[1].replace(/,/g, '');
      const price = parseFloat(rawPrice);
      if (!isNaN(price) && price > 0) {
        let name = line.substring(0, match.index).trim();
        // Clean leading indicators or bullets (e.g. "1 ", "- ")
        name = name.replace(/^[-*•\s\d]+[xX\s]+/, '').replace(/^[-*•\s]+/, '').replace(/[-:=]+$/, '').trim();
        if (!name) {
          name = line.replace(match[0], '').trim();
        }
        return {
          name: name || 'Scanned Line Item',
          price,
          rawText: line,
        };
      }
    }
  }

  // Fallback: search for any number with decimals
  for (const line of lines) {
    const match = line.match(/([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2}))/);
    if (match) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      const name = line.replace(match[0], '').replace(/^[-*•\s\d]+[xX\s]+/, '').trim();
      return {
        name: name || lines[0] || 'Scanned Item',
        price: !isNaN(price) ? price : 0,
        rawText: line,
      };
    }
  }

  return {
    name: lines[0] || 'Scanned Item',
    price: 0,
    rawText,
  };
}

/**
 * Crops a specific region (as percentages 0-100) from an image data URL onto a canvas
 */
export async function cropImageRegion(
  sourceImage: string,
  box: { x: number; y: number; w: number; h: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const pixelX = Math.max(0, (box.x / 100) * img.naturalWidth);
      const pixelY = Math.max(0, (box.y / 100) * img.naturalHeight);
      const pixelW = Math.max(10, (box.w / 100) * img.naturalWidth);
      const pixelH = Math.max(10, (box.h / 100) * img.naturalHeight);

      canvas.width = pixelW;
      canvas.height = pixelH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(sourceImage);
        return;
      }

      ctx.drawImage(img, pixelX, pixelY, pixelW, pixelH, 0, 0, pixelW, pixelH);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = reject;
    img.src = sourceImage;
  });
}
