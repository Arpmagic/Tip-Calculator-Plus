import { recognize } from 'tesseract.js';
import { preprocessReceiptImage } from '../utils/imagePreprocess';
import { ItemizedItem } from '../types';

export interface ExtractedLineItem {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}

export interface ParsedReceiptData {
  venueName: string;
  date?: string;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  lineItems: ExtractedLineItem[];
  isValidated: boolean; // Math check: Subtotal + Tax = Grand Total within 0.05
  mathDiscrepancy?: number;
  confidenceScore: number; // 0 to 100
  rawText: string;
  preprocessedImageUrl?: string;
}

export interface OcrProgressInfo {
  status: string;
  progress: number; // 0 to 100
}

/**
 * Intelligent regex parser that processes raw OCR receipt text
 * to extract structured financial data (Line Items, Subtotal, Tax, Grand Total, Venue).
 */
export function parseReceiptText(rawText: string): ParsedReceiptData {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let detectedVenue = '';
  let detectedDate = '';
  let subtotal = 0;
  let taxAmount = 0;
  let grandTotal = 0;
  const lineItems: ExtractedLineItem[] = [];

  // Patterns to exclude lines from being recognized as food/drink line items
  const summaryBlockKeywords = [
    'subtotal',
    'sub total',
    'sub-total',
    'tax',
    'sales tax',
    'state tax',
    'city tax',
    'vat',
    'gst',
    'total',
    'grand total',
    'amount due',
    'balance due',
    'amount paid',
    'cash',
    'change',
    'visa',
    'mastercard',
    'amex',
    'discover',
    'debit',
    'credit',
    'tip',
    'gratuity',
    'service charge',
    'guest count',
    'server',
    'table',
    'check #',
    'order #',
    'invoice',
    'receipt',
    'thank you',
    'tel:',
    'phone',
  ];

  // 1. Detect Venue / Restaurant Name from top 4 lines
  for (let i = 0; i < Math.min(4, lines.length); i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    // Ignore lines that look like addresses, phone numbers, website URLs, or pure numbers
    if (
      line.length >= 3 &&
      !lower.includes('welcome') &&
      !lower.includes('receipt') &&
      !lower.includes('invoice') &&
      !lower.includes('table') &&
      !lower.includes('server') &&
      !lower.includes('http') &&
      !lower.includes('.com') &&
      !/^\d+[\s\-/]/.test(line) &&
      !/\d{3}[-.\s]\d{3}/.test(line)
    ) {
      // Remove trailing noise symbols
      detectedVenue = line.replace(/[^\w\s&'\-.]/g, '').trim();
      break;
    }
  }

  // 2. Detect Date (e.g. 2026-08-24, 08/24/2026, 24-08-2026, Aug 24 2026)
  const dateRegex = /\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{1,2}(?:st|nd|rd|th)?[\s,]+\d{2,4})\b/i;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match) {
      detectedDate = match[0];
      break;
    }
  }

  // 3. Scan line-by-line for Subtotal, Tax, Grand Total, and Line Items
  // Regex to extract trailing currency price (handles $, £, €, ₴, dots, commas)
  // e.g. "Truffle Fries $14.50" or "Wagyu Steak 65,00" or "2x Latte @ 4.50 9.00"
  const priceTrailingRegex = /(?:[\$£€₴₹\s]|^)\s*(\d{1,4}[.,]\d{2})(?:\s*[A-Za-z*])?$/;

  // Specific regexes for financial summary keywords
  const subtotalRegex = /^(?:sub[\s\-]*total|net[\s\-]*amount|items?[\s\-]*total|sub[\s\-]*tot|sub)\b/i;
  const taxRegex = /^(?:sales[\s\-]*tax|state[\s\-]*tax|city[\s\-]*tax|vat|gst|hst|pst|tax)\b/i;
  const grandTotalRegex = /^(?:grand[\s\-]*total|total[\s\-]*amount|balance[\s\-]*due|total[\s\-]*due|amount[\s\-]*paid|amount[\s\-]*due|final[\s\-]*total|total)\b/i;

  let inItemsSection = false;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lower = line.toLowerCase();

    // Helper to extract clean float price from line
    const extractPrice = (str: string): number | null => {
      // Find all price-like patterns (e.g. 14.50 or 14,50)
      const matches = str.match(/\b\d{1,4}[.,]\d{2}\b/g);
      if (!matches || matches.length === 0) return null;
      // Prefer the last price in the line
      const rawPrice = matches[matches.length - 1].replace(',', '.');
      const num = parseFloat(rawPrice);
      return Number.isFinite(num) ? num : null;
    };

    // A. Subtotal Detection
    if (subtotalRegex.test(lower) || lower.includes('subtotal') || lower.includes('sub total')) {
      const price = extractPrice(line);
      if (price !== null && price > 0) {
        subtotal = price;
      }
      continue;
    }

    // B. Tax Detection (can accumulate multiple taxes if state + city)
    if (taxRegex.test(lower) || lower.includes('tax') || lower.includes('vat') || lower.includes('gst')) {
      const price = extractPrice(line);
      if (price !== null && price > 0) {
        // Prevent accidental grand total matching if line says "Total Tax"
        if (lower.includes('total tax') || (!lower.includes('grand total') && !lower.includes('total:'))) {
          taxAmount += price;
        }
      }
      continue;
    }

    // C. Grand Total Detection
    if (grandTotalRegex.test(lower) || lower.includes('grand total') || lower.includes('balance due')) {
      const price = extractPrice(line);
      if (price !== null && price > 0) {
        // Overwrite or pick highest
        if (price > grandTotal) {
          grandTotal = price;
        }
      }
      continue;
    }

    // Generic "Total" (ensure it's not "Subtotal")
    if (lower.startsWith('total') && !lower.includes('subtotal') && !lower.includes('tax')) {
      const price = extractPrice(line);
      if (price !== null && price > 0) {
        if (price > grandTotal) {
          grandTotal = price;
        }
      }
      continue;
    }

    // D. Line Item Detection
    // Check if line contains a price at the end and doesn't contain summary keywords
    const isSummaryLine = summaryBlockKeywords.some((kw) => lower.includes(kw));
    if (!isSummaryLine) {
      const priceMatch = line.match(priceTrailingRegex);
      if (priceMatch) {
        const rawPrice = priceMatch[1].replace(',', '.');
        const price = parseFloat(rawPrice);

        // Extract item name by removing the price and special symbols
        let itemName = line.replace(priceMatch[0], '').trim();
        // Clean quantity prefix like "1x " or "2 " or "1 "
        const qtyMatch = itemName.match(/^(\d+)\s*[xX*]?\s+(.+)$/);
        let quantity = 1;
        if (qtyMatch) {
          quantity = parseInt(qtyMatch[1], 10) || 1;
          itemName = qtyMatch[2];
        }

        // Clean punctuation noise
        itemName = itemName.replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9\s&'\-./]/g, '').trim();

        if (itemName.length >= 2 && price > 0 && price < 2000) {
          lineItems.push({
            id: `item_${lineItems.length}_${Date.now()}`,
            name: itemName,
            price: price,
            quantity: quantity,
          });
        }
      }
    }
  }

  // 4. Mathematical Consistency & Reconciliation Engine
  const sumOfItems = lineItems.reduce((acc, it) => acc + it.price, 0);

  // If subtotal is missing, infer from line items or grand total - tax
  if (subtotal <= 0) {
    if (sumOfItems > 0) {
      subtotal = parseFloat(sumOfItems.toFixed(2));
    } else if (grandTotal > 0 && taxAmount > 0) {
      subtotal = parseFloat((grandTotal - taxAmount).toFixed(2));
    }
  }

  // If grand total is missing, infer from subtotal + tax or sum of items + tax
  if (grandTotal <= 0) {
    if (subtotal > 0) {
      grandTotal = parseFloat((subtotal + taxAmount).toFixed(2));
    } else if (sumOfItems > 0) {
      grandTotal = parseFloat((sumOfItems + taxAmount).toFixed(2));
      subtotal = sumOfItems;
    }
  }

  // If tax is 0, but Grand Total and Subtotal are both present and Grand Total > Subtotal
  if (taxAmount <= 0 && grandTotal > subtotal && subtotal > 0) {
    taxAmount = parseFloat((grandTotal - subtotal).toFixed(2));
  }

  // Final Validation Check: Subtotal + Tax = Grand Total (within 5 cents tolerance)
  const mathSum = subtotal + taxAmount;
  const discrepancy = Math.abs(mathSum - grandTotal);
  const isValidated = grandTotal > 0 && discrepancy <= 0.05;

  // Calculate heuristic confidence score
  let confidence = 40;
  if (grandTotal > 0) confidence += 20;
  if (subtotal > 0) confidence += 15;
  if (lineItems.length > 0) confidence += 15;
  if (isValidated) confidence += 10;
  if (detectedVenue) confidence += 5;

  return {
    venueName: detectedVenue || 'Dining Venue',
    date: detectedDate || undefined,
    subtotal: Math.max(0, subtotal),
    taxAmount: Math.max(0, taxAmount),
    grandTotal: Math.max(0, grandTotal),
    lineItems,
    isValidated,
    mathDiscrepancy: discrepancy > 0.05 ? parseFloat(discrepancy.toFixed(2)) : undefined,
    confidenceScore: Math.min(100, confidence),
    rawText,
  };
}

/**
 * Executes on-device OCR scan using pure client-side Tesseract.js.
 * Preprocesses the image via Canvas and extracts structured receipt data.
 */
export async function scanReceiptWithTesseract(
  imageSource: File | Blob | string | HTMLImageElement,
  onProgress?: (info: OcrProgressInfo) => void
): Promise<ParsedReceiptData> {
  // Step 1: Pre-process image on HTML5 Canvas (Luminance grayscale & Contrast boost)
  if (onProgress) {
    onProgress({ status: 'Optimizing receipt contrast & lighting...', progress: 15 });
  }

  const { canvas, dataUrl } = await preprocessReceiptImage(imageSource, {
    contrast: 70,
    brightness: 8,
    sharpen: true,
  });

  if (onProgress) {
    onProgress({ status: 'Running on-device neural character recognition...', progress: 35 });
  }

  // Step 2: Run client-side Tesseract recognition directly in browser worker
  const result = await recognize(canvas, 'eng', {
    logger: (m) => {
      if (onProgress && m.status === 'recognizing text') {
        const rawProgress = m.progress || 0;
        const mappedProgress = Math.round(35 + rawProgress * 55); // Maps 0..1 to 35..90%
        onProgress({
          status: `Extracting text: ${Math.round(rawProgress * 100)}%`,
          progress: Math.min(90, mappedProgress),
        });
      }
    },
  });

  if (onProgress) {
    onProgress({ status: 'Parsing line items, tax & grand totals...', progress: 95 });
  }

  const rawText = result.data.text || '';
  const parsed = parseReceiptText(rawText);
  parsed.preprocessedImageUrl = dataUrl;

  if (onProgress) {
    onProgress({ status: 'Scan completed successfully!', progress: 100 });
  }

  return parsed;
}

/**
 * Converts extracted OCR line items to the application's ItemizedItem schema.
 */
export function convertOcrItemsToItemized(
  items: ExtractedLineItem[],
  defaultPersonIds: string[] = ['p1', 'p2']
): ItemizedItem[] {
  return items.map((item, idx) => ({
    id: `scanned_item_${idx}_${Date.now()}`,
    name: item.name,
    price: item.price,
    assignedPersonIds: defaultPersonIds,
  }));
}
