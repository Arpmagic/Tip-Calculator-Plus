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
  detectedCurrency?: string; // e.g. 'PLN', 'EUR', 'USD', 'GBP', 'UAH'
  lineItems: ExtractedLineItem[];
  isValidated: boolean; // Math check: Subtotal + Tax ≈ Grand Total (within 0.05)
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
 * Normalizes European and US number formats from OCR text into a clean float.
 * Handles comma decimals (21,96 -> 21.96), space-separated digits (21 , 96),
 * and trailing tax category letters (21,96 A -> 21.96).
 */
export function normalizePriceString(str: string): number | null {
  if (!str) return null;
  
  // Clean whitespace between digits and comma/period: e.g. "21 , 96" -> "21,96"
  let cleaned = str.replace(/(\d)\s*([.,])\s*(\d)/g, '$1$2$3');
  
  // Extract number pattern with 2 decimal places: e.g. "12,99", "21.96", "4.50"
  const match = cleaned.match(/\b(\d{1,5})[.,](\d{2})\b/);
  if (match) {
    const num = parseFloat(`${match[1]}.${match[2]}`);
    return Number.isFinite(num) ? num : null;
  }
  
  // Fallback for single integer values
  const intMatch = cleaned.match(/\b(\d{1,5})\b/);
  if (intMatch) {
    const num = parseFloat(intMatch[1]);
    return Number.isFinite(num) ? num : null;
  }
  
  return null;
}

/**
 * Detects currency from receipt text based on currency codes, symbols, and fiscal terms.
 */
export function detectReceiptCurrency(rawText: string): string {
  const upper = rawText.toUpperCase();
  
  // 1. Polish Złoty (PLN / zł)
  if (
    upper.includes('PLN') ||
    upper.includes('ZŁ') ||
    upper.includes('ZL') ||
    upper.includes('PARAGON FISKALNY') ||
    upper.includes('SUMA PLN') ||
    upper.includes('KWOTA PLN') ||
    upper.includes('SUMA PTU') ||
    upper.includes('SPRZEDAŻ OPODATKOWANA') ||
    upper.includes('SPRZEDAZ OPODATKOWANA') ||
    upper.includes('DO ZAPŁATY') ||
    upper.includes('DO ZAPLATY') ||
    upper.includes('ROZLICZENIE PŁATNOŚCI') ||
    upper.includes('PŁATNOŚĆ KARTĄ') ||
    /\bNIP[:\s]*\d{3}[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2}\b/.test(upper)
  ) {
    return 'PLN';
  }
  
  // 2. Euro (EUR / €)
  if (
    upper.includes('EUR') ||
    upper.includes('€') ||
    upper.includes('MWST') ||
    upper.includes('TVA') ||
    upper.includes('IVA') ||
    upper.includes('SUMME EUR') ||
    upper.includes('GESAMT EUR')
  ) {
    return 'EUR';
  }
  
  // 3. British Pound (GBP / £)
  if (upper.includes('GBP') || upper.includes('£') || upper.includes('POUND')) {
    return 'GBP';
  }
  
  // 4. Ukrainian Hryvnia (UAH / ₴ / ГРН)
  if (
    upper.includes('UAH') ||
    upper.includes('₴') ||
    upper.includes('ГРН') ||
    upper.includes('ФІСКАЛЬНИЙ ЧЕК') ||
    upper.includes('СУМА ГРН')
  ) {
    return 'UAH';
  }
  
  // 5. Swiss Franc
  if (upper.includes('CHF') || upper.includes('FR.')) {
    return 'CHF';
  }
  
  // 6. Japanese Yen
  if (upper.includes('JPY') || upper.includes('¥') || upper.includes('円')) {
    return 'JPY';
  }
  
  // 7. Canadian / Australian Dollar
  if (upper.includes('CAD') || upper.includes('C$')) return 'CAD';
  if (upper.includes('AUD') || upper.includes('A$')) return 'AUD';
  
  // Default fallback
  return 'USD';
}

/**
 * Intelligent regex parser that processes raw OCR receipt text
 * across Polish/European fiscal receipts and US/Global formats.
 */
export function parseReceiptText(rawText: string): ParsedReceiptData {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const detectedCurrency = detectReceiptCurrency(rawText);
  let detectedVenue = '';
  let detectedDate = '';
  let subtotal = 0;
  let taxAmount = 0;
  let grandTotal = 0;
  const lineItems: ExtractedLineItem[] = [];

  // Known global & European brand patterns for immediate high-confidence matching
  const knownBrands: { [brandKey: string]: string } = {
    'ZABKA': 'SKLEP ŻABKA',
    'ŻABKA': 'SKLEP ŻABKA',
    'SKLEP ZABKA': 'SKLEP ŻABKA',
    'SKLEP ŻABKA': 'SKLEP ŻABKA',
    'BIEDRONKA': 'BIEDRONKA',
    'LIDL': 'LIDL',
    'CARREFOUR': 'CARREFOUR',
    'AUCHAN': 'AUCHAN',
    'KAUFLAND': 'KAUFLAND',
    'DINO': 'DINO',
    'ROSSMANN': 'ROSSMANN',
    'MCDONALD': "MCDONALD'S",
    'KFC': 'KFC',
    'STARBUCKS': 'STARBUCKS',
    'COSTA': 'COSTA COFFEE',
    'SUBWAY': 'SUBWAY',
    'ORLEN': 'PKN ORLEN',
    'SHELL': 'SHELL',
    'BP': 'BP',
    'CIRCLE K': 'CIRCLE K',
    'PIZZA HUT': 'PIZZA HUT',
    'DOMINO': "DOMINO'S PIZZA",
    'MAX PREMIUM': 'MAX PREMIUM BURGERS',
    'BURGER KING': 'BURGER KING',
  };

  // 1. Detect Venue / Restaurant Name
  // A. Check for known store / restaurant brand match first
  for (const line of lines.slice(0, 8)) {
    const cleanUpper = line.toUpperCase().replace(/[^\w\sŻŹĆĄŚĘŁÓŃ]/gi, '');
    for (const [key, brandTitle] of Object.entries(knownBrands)) {
      if (cleanUpper.includes(key)) {
        detectedVenue = brandTitle;
        break;
      }
    }
    if (detectedVenue) break;
  }

  // B. Fallback: Extract from top 5 lines, ignoring fiscal headers and metadata
  if (!detectedVenue) {
    const metaIgnorePatterns = [
      /paragon\s+fiskalny/i,
      /fiskalny/i,
      /nip/i,
      /kasa\s+nr/i,
      /nr\s+wydruku/i,
      /pos\s+terminal/i,
      /welcome/i,
      /receipt/i,
      /invoice/i,
      /http/i,
      /\.com/i,
      /\.pl/i,
      /ul\./i,
      /al\./i,
      /pl\./i,
      /tel[:.]/i,
      /^\d+[\s\-/]/,
      /^\d{2}-\d{3}\b/, // Polish postal code (e.g. 00-001)
      /\d{3}[-.\s]\d{3}/,
    ];

    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      const isIgnored = metaIgnorePatterns.some((pattern) => pattern.test(line));
      if (!isIgnored && line.length >= 3) {
        // Clean out noise characters
        detectedVenue = line.replace(/[^\w\s&'\-.ŻŹĆĄŚĘŁÓŃżźćąśęłóń]/g, '').trim();
        if (detectedVenue.length >= 3) break;
      }
    }
  }

  // 2. Detect Date (ISO, US, European: e.g. 2026-08-25, 25-08-2026, 25.08.2026, 08/25/2026)
  const dateRegex = /\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{1,2}(?:st|nd|rd|th)?[\s,]+\d{2,4})\b/i;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match) {
      detectedDate = match[0];
      break;
    }
  }

  // 3. European & Global Keyword Matchers for Totals
  // Grand Total: SUMA PLN, DO ZAPŁATY, RAZEM, TOTAL, GRAND TOTAL, KWOTA PLN, AMOUNT DUE, etc.
  const grandTotalLineRegex = /(?:SUMA\s+PLN|SUMA|RAZEM|DO\s+ZAPŁATY|DO\s+ZAPLATY|TOTAL|GRAND\s+TOTAL|KWOTA\s+PLN|KWOTA|BAL\s+DUE|AMOUNT\s+DUE|TOTAL\s+DUE|TOTAL\s+TO\s+PAY|FINAL\s+TOTAL|PŁATNOŚĆ\s+KARTĄ|PLATNOSC\s+KARTA|KARTA|GESAMT|SUMME|ZU\s+ZAHLEN|TOTAL\s+TTC|NET\s+A\s+PAYER|IMPORTE|TOTALE|СУМА|ВСЬОГО|ДО\s+СПЛАТИ)/i;
  
  // Tax: SUMA PTU, PTU, VAT, PODATEK, TAX, SALES TAX, MWST, TVA, IVA, ПДВ
  const taxLineRegex = /(?:SUMA\s+PTU|PTU\s+[A-D]|PTU|VAT|PODATEK|KWOTA\s+PTU|SALES\s+TAX|STATE\s+TAX|CITY\s+TAX|TAX|MWST|UST|TVA|IVA|GST|HST|PST|ПДВ|ПОДАТОК|АКЦИЗ)/i;
  
  // Subtotal / Net: SPRZEDAŻ OPODATKOWANA, NETTO, SUBTOTAL, PRE-TAX, PODSUMA, TOTAL HT, ПІДСУМОК
  const subtotalLineRegex = /(?:SPRZEDAŻ\s+OPODATKOWANA|SPRZEDAZ\s+OPODATKOWANA|NETTO|OPODATKOWANIE|WARTOŚĆ\s+NETTO|WARTOSC\s+NETTO|SUB[\s\-]*TOTAL|NET[\s\-]*AMOUNT|PRE[\s\-]*TAX|PODSUMA|SUMA\s+BEZ\s+PODATKU|TOTAL\s+HT|SOUS[\s\-]*TOTAL|IMPONIBILE|ZWISCHENSUMME|ПІДСУМОК)/i;

  // Patterns to exclude lines from being recognized as individual food/drink items
  const summaryExclusionKeywords = [
    'subtotal', 'sub total', 'sub-total', 'netto', 'sprzedaż', 'sprzedaz',
    'tax', 'vat', 'ptu', 'podatek', 'mwst', 'tva', 'iva', 'gst',
    'total', 'grand total', 'suma', 'razem', 'do zapłaty', 'do zaplaty', 'kwota',
    'amount due', 'balance due', 'amount paid', 'cash', 'gotówka', 'gotowka',
    'change', 'reszta', 'visa', 'mastercard', 'amex', 'karta', 'płatność', 'platnosc',
    'tip', 'gratuity', 'napiwek', 'service charge', 'guest count', 'server', 'kelner',
    'table', 'stolik', 'check #', 'rachunek', 'order #', 'zamówienie',
    'paragon', 'fiskalny', 'nip', 'kasa', 'bdo', 'dziękujemy', 'thank you',
    'tel:', 'phone', 'www.', 'http',
  ];

  // Scan line-by-line
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lower = line.toLowerCase();

    // Helper to find highest valid price on the line
    const extractLinePrice = (str: string): number | null => {
      // Clean comma / dot spaced numbers: "21 , 96" -> "21,96"
      const normalized = str.replace(/(\d)\s*([.,])\s*(\d)/g, '$1$2$3');
      const matches = normalized.match(/\b\d{1,5}[.,]\d{2}\b/g);
      if (!matches || matches.length === 0) {
        return normalizePriceString(normalized);
      }
      // Take the last match in the line (most totals are on the far right)
      const lastMatch = matches[matches.length - 1].replace(',', '.');
      const num = parseFloat(lastMatch);
      return Number.isFinite(num) ? num : null;
    };

    // A. Subtotal / Netto Detection
    if (subtotalLineRegex.test(line)) {
      const price = extractLinePrice(line);
      if (price !== null && price > 0) {
        subtotal = price;
      }
      continue;
    }

    // B. Tax / PTU / VAT Detection
    if (taxLineRegex.test(line)) {
      const price = extractLinePrice(line);
      if (price !== null && price > 0) {
        // Prevent accidental grand total matching if line says "Total Tax"
        if (!lower.includes('grand total') && !lower.includes('suma pln') && !lower.includes('do zapłaty')) {
          taxAmount += price;
        }
      }
      continue;
    }

    // C. Grand Total / SUMA PLN / DO ZAPŁATY Detection
    if (grandTotalLineRegex.test(line)) {
      const price = extractLinePrice(line);
      if (price !== null && price > 0) {
        if (price > grandTotal) {
          grandTotal = price;
        }
      }
      continue;
    }

    // D. Individual Line Items Detection
    const isSummaryLine = summaryExclusionKeywords.some((kw) => lower.includes(kw));
    if (!isSummaryLine) {
      // Match line ending with price pattern: e.g. "1 KANAPKA TRÓJKĄT 12,99 A" or "COCA COLA 8,97"
      const priceTrailingRegex = /(?:[\$£€₴₹\s]|^)\s*(\d{1,4}[.,]\d{2})(?:\s*[A-Za-z*złPLN]+)?$/i;
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
        itemName = itemName
          .replace(/^[^a-zA-Z0-9ŻŹĆĄŚĘŁÓŃżźćąśęłóń]+/, '')
          .replace(/[^a-zA-Z0-9\s&'\-./ŻŹĆĄŚĘŁÓŃżźćąśęłóń]/g, '')
          .trim();

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

  // 4. Mathematical Consistency, Reconciliation & Self-Healing
  const sumOfItems = lineItems.reduce((acc, it) => acc + it.price, 0);

  // If Grand Total is detected and Tax is detected, infer Subtotal if missing or zero
  if (grandTotal > 0 && taxAmount > 0 && subtotal <= 0) {
    subtotal = parseFloat(Math.max(0, grandTotal - taxAmount).toFixed(2));
  }

  // If Subtotal is missing, infer from line items
  if (subtotal <= 0 && sumOfItems > 0) {
    subtotal = parseFloat(sumOfItems.toFixed(2));
  }

  // If Grand Total is missing, infer from Subtotal + Tax or sum of line items + Tax
  if (grandTotal <= 0) {
    if (subtotal > 0) {
      grandTotal = parseFloat((subtotal + taxAmount).toFixed(2));
    } else if (sumOfItems > 0) {
      grandTotal = parseFloat((sumOfItems + taxAmount).toFixed(2));
      subtotal = sumOfItems;
    }
  }

  // If Tax is 0, but Grand Total > Subtotal > 0
  if (taxAmount <= 0 && grandTotal > subtotal && subtotal > 0) {
    taxAmount = parseFloat((grandTotal - subtotal).toFixed(2));
  }

  // Final Validation Check: Subtotal + Tax ≈ Grand Total (within 5 cents tolerance)
  const mathSum = subtotal + taxAmount;
  const discrepancy = Math.abs(mathSum - grandTotal);
  const isValidated = grandTotal > 0 && discrepancy <= 0.05;

  // Calculate heuristic confidence score
  let confidence = 40;
  if (grandTotal > 0) confidence += 25;
  if (subtotal > 0) confidence += 15;
  if (lineItems.length > 0) confidence += 10;
  if (isValidated) confidence += 10;
  if (detectedVenue) confidence += 10;

  return {
    venueName: detectedVenue || 'Dining Venue',
    date: detectedDate || undefined,
    subtotal: Math.max(0, subtotal),
    taxAmount: Math.max(0, taxAmount),
    grandTotal: Math.max(0, grandTotal),
    detectedCurrency,
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
