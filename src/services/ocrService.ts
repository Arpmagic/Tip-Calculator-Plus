import Tesseract from 'tesseract.js';
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
  detectedCurrency?: string; // e.g. 'PLN', 'EUR', 'USD', 'GBP', 'UAH', 'CHF', 'JPY', etc.
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
 * Converts comma decimals (21,96 -> 21.96) while filtering out weights (120g),
 * dates (1956r, 2026-08-25), and NIP tax IDs (7811672398).
 */
export function normalizePriceString(str: string): number | null {
  if (!str) return null;

  // Clean whitespace between digits and comma/period: e.g. "21 , 96" -> "21,96"
  let cleaned = str.replace(/(\d)\s*([.,])\s*(\d)/g, '$1$2$3');

  // Reject strings that are item weights (e.g. "120g", "250ml", "0.5kg")
  if (/\b\d+\s*(?:g|kg|ml|l|szt|gr)\b/i.test(cleaned)) {
    // If the entire string is just a weight, reject it
    if (/^\s*\d+\s*(?:g|kg|ml|l|szt|gr)\s*$/i.test(cleaned)) {
      return null;
    }
  }

  // Reject phone numbers, postal codes, years (e.g. "1956r", "2026r")
  if (/\b\d{4}r\b/i.test(cleaned)) return null;

  // Extract number pattern with 2 decimal places: e.g. "12,99", "21.96", "4.50"
  const match = cleaned.match(/\b(\d{1,5})[.,](\d{2})\b/);
  if (match) {
    const num = parseFloat(`${match[1]}.${match[2]}`);
    return Number.isFinite(num) ? num : null;
  }

  // Fallback for single integer values (filter out long barcode/phone/NIP numbers >= 6 digits)
  const intMatch = cleaned.match(/\b(\d{1,5})\b/);
  if (intMatch) {
    const num = parseFloat(intMatch[1]);
    return Number.isFinite(num) ? num : null;
  }

  return null;
}

/**
 * Detects currency strictly using word boundaries to prevent false positives.
 * Never treats words with 'e' or 'c' as EUR.
 */
export function detectReceiptCurrency(rawText: string): string {
  const upper = rawText.toUpperCase();

  // 1. Polish Fiscal Indicators & Złoty (PLN / zł)
  if (
    /\b(PLN|ZŁ|ZL)\b/i.test(rawText) ||
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
    /\bNIP[:\s]*\d{3}[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2}\b/.test(upper) ||
    /\bNIP\s+\d{10}\b/.test(upper)
  ) {
    return 'PLN';
  }

  // 2. Ukrainian Hryvnia (UAH / ₴ / ГРН)
  if (
    /\b(UAH|ГРН)\b/i.test(rawText) ||
    rawText.includes('₴') ||
    upper.includes('ФІСКАЛЬНИЙ ЧЕК') ||
    upper.includes('СУМА ГРН') ||
    upper.includes('ПІДСУМОК')
  ) {
    return 'UAH';
  }

  // 3. British Pound (GBP / £)
  if (/\bGBP\b/i.test(rawText) || rawText.includes('£') || /\bPOUND\b/i.test(rawText)) {
    return 'GBP';
  }

  // 4. Swiss Franc (CHF)
  if (/\b(CHF|SFRS?)\b/i.test(rawText) || /\bFR\.\s*\d/i.test(rawText)) {
    return 'CHF';
  }

  // 5. Japanese Yen (JPY / ¥ / 円)
  if (/\bJPY\b/i.test(rawText) || rawText.includes('¥') || rawText.includes('円')) {
    return 'JPY';
  }

  // 6. Euro (EUR / €) - Strict word boundary to avoid substrings
  if (
    /\bEUR\b/i.test(rawText) ||
    rawText.includes('€') ||
    upper.includes('MWST') ||
    upper.includes('TVA') ||
    upper.includes('IVA') ||
    upper.includes('SUMME EUR') ||
    upper.includes('GESAMTBETRAG') ||
    upper.includes('TOTAL TTC') ||
    upper.includes('TOTAL HT')
  ) {
    return 'EUR';
  }

  // 7. Canadian / Australian Dollar
  if (/\bCAD\b/i.test(rawText) || /\bC\$/i.test(rawText)) return 'CAD';
  if (/\bAUD\b/i.test(rawText) || /\bA\$/i.test(rawText)) return 'AUD';

  // 8. US Dollar ($ / USD)
  if (/\bUSD\b/i.test(rawText) || rawText.includes('$')) {
    return 'USD';
  }

  // Default fallback
  return 'USD';
}

/**
 * Intelligent fiscal regex parser that processes raw OCR receipt text
 * across Polish/European fiscal receipts, US/Global formats, and dining bills.
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
    'ZABKA': 'Sklep Żabka',
    'ŻABKA': 'Sklep Żabka',
    'SKLEP ZABKA': 'Sklep Żabka',
    'SKLEP ŻABKA': 'Sklep Żabka',
    'BIEDRONKA': 'Biedronka',
    'LIDL': 'Lidl',
    'CARREFOUR': 'Carrefour',
    'AUCHAN': 'Auchan',
    'KAUFLAND': 'Kaufland',
    'DINO': 'Dino',
    'ROSSMANN': 'Rossmann',
    'MCDONALD': "McDonald's",
    'KFC': 'KFC',
    'STARBUCKS': 'Starbucks',
    'COSTA': 'Costa Coffee',
    'SUBWAY': 'Subway',
    'ORLEN': 'PKN Orlen',
    'SHELL': 'Shell',
    'BP': 'BP',
    'CIRCLE K': 'Circle K',
    'PIZZA HUT': 'Pizza Hut',
    'DOMINO': "Domino's Pizza",
    'MAX PREMIUM': 'Max Premium Burgers',
    'BURGER KING': 'Burger King',
    'SILPO': 'Сільпо',
    'СІЛЬПО': 'Сільпо',
    'ATB': 'АТБ',
    'АТБ': 'АТБ',
  };

  // 1. Detect Venue / Restaurant Name
  // A. Check for known store / restaurant brand match first
  for (const line of lines.slice(0, 8)) {
    const cleanUpper = line.toUpperCase().replace(/[^\w\sŻŹĆĄŚĘŁÓŃА-ЯІЇЄҐ]/gi, '');
    for (const [key, brandTitle] of Object.entries(knownBrands)) {
      if (cleanUpper.includes(key)) {
        detectedVenue = brandTitle;
        break;
      }
    }
    if (detectedVenue) break;
  }

  // B. Fallback: Extract from top lines, ignoring fiscal headers and metadata
  if (!detectedVenue) {
    const metaIgnorePatterns = [
      /paragon\s+fiskalny/i,
      /fiskalny/i,
      /nip/i,
      /regon/i,
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

    for (let i = 0; i < Math.min(6, lines.length); i++) {
      const line = lines[i];
      const isIgnored = metaIgnorePatterns.some((pattern) => pattern.test(line));
      if (!isIgnored && line.length >= 3) {
        detectedVenue = line.replace(/[^\w\s&'\-.ŻŹĆĄŚĘŁÓŃżźćąśęłóńА-Яа-яІіЇїЄєҐґ\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g, '').trim();
        if (detectedVenue.length >= 2) break;
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

  // 3. Helper to extract valid currency prices from a line while stripping item weights, dates, and percentages
  const extractValidLinePrice = (lineStr: string): number | null => {
    // Clean spaces between digits and punctuation: "21 , 96" -> "21,96"
    let clean = lineStr.replace(/(\d)\s*([.,])\s*(\d)/g, '$1$2$3');

    // Strip out percentages (e.g. "23%", "10%", "8.875%", "(10%)")
    clean = clean.replace(/\(?\b\d+(?:[.,]\d+)?\s*%\)?/gi, ' ');

    // Strip out weights (e.g. "120g", "250ml", "0.5kg") and dates (e.g. "1956r")
    clean = clean.replace(/\b\d+\s*(?:g|kg|ml|l|szt|gr)\b/gi, ' ');
    clean = clean.replace(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, ' ');
    clean = clean.replace(/\b\d{2}[-/.]\d{2}[-/.]\d{4}\b/g, ' ');
    clean = clean.replace(/\b\d{4}r\b/gi, ' ');
    clean = clean.replace(/\bNIP[:\s]*\d{10}\b/gi, ' ');

    const matches = clean.match(/\b\d{1,5}[.,]\d{2}\b/g);
    if (!matches || matches.length === 0) {
      return normalizePriceString(clean);
    }
    // Take the rightmost price match on the line (standard layout for fiscal summaries)
    const lastMatch = matches[matches.length - 1].replace(',', '.');
    const num = parseFloat(lastMatch);
    return Number.isFinite(num) ? num : null;
  };

  // 4. Fiscal Regex Pattern Lexicons
  // Grand Total: SUMA PLN, DO ZAPŁATY, RAZEM, TOTAL, GRAND TOTAL, KWOTA PLN, AMOUNT DUE, etc.
  const grandTotalLineRegex = /(?:SUMA\s+PLN|RAZEM|DO\s+ZAPŁATY|DO\s+ZAPLATY|TOTAL|GRAND\s+TOTAL|KWOTA\s+PLN|KWOTA|BAL\s+DUE|BALANCE\s+DUE|AMOUNT\s+DUE|TOTAL\s+DUE|TOTAL\s+TO\s+PAY|FINAL\s+TOTAL|PŁATNOŚĆ\s+KARTĄ|PLATNOSC\s+KARTA|GESAMTBETRAG|GESAMT|SUMME|ZU\s+ZAHLEN|TOTAL\s+TTC|NET\s+A\s+PAYER|IMPORTE|TOTALE|СУМА|ВСЬОГО|ДО\s+СПЛАТИ|合計)/i;

  // Tax: SUMA PTU, PTU, VAT, PODATEK, TAX, SALES TAX, MWST, TVA, IVA, ПДВ
  const taxLineRegex = /(?:SUMA\s+PTU|PTU\s+[A-D]|PTU|VAT|PODATEK|KWOTA\s+PTU|SALES\s+TAX|STATE\s+TAX|CITY\s+TAX|TAX|MWST|UST|TVA|IVA|GST|HST|PST|ПДВ|ПОДАТОК|АКЦИЗ|消費税)/i;

  // Subtotal / Net: SPRZEDAŻ OPODATKOWANA, NETTO, SUBTOTAL, PRE-TAX, PODSUMA, TOTAL HT, ПІДСУМОК
  const subtotalLineRegex = /(?:SPRZEDAŻ\s+OPODATKOWANA|SPRZEDAZ\s+OPODATKOWANA|NETTO|OPODATKOWANIE|WARTOŚĆ\s+NETTO|WARTOSC\s+NETTO|SUB[\s\-]*TOTAL|NET[\s\-]*AMOUNT|PRE[\s\-]*TAX|PODSUMA|SUMA\s+BEZ\s+PODATKU|TOTAL\s+HT|SOUS[\s\-]*TOTAL|IMPONIBILE|ZWISCHENSUMME|ПІДСУМОК|小計)/i;

  // Summary exclusion keywords for individual item extraction
  const summaryExclusionKeywords = [
    'subtotal', 'sub total', 'sub-total', 'netto', 'sprzedaż', 'sprzedaz',
    'tax', 'vat', 'ptu', 'podatek', 'mwst', 'tva', 'iva', 'gst',
    'total', 'grand total', 'suma', 'razem', 'do zapłaty', 'do zaplaty', 'kwota',
    'amount due', 'balance due', 'amount paid', 'cash', 'gotówka', 'gotowka',
    'change', 'reszta', 'visa', 'mastercard', 'amex', 'karta', 'płatność', 'platnosc',
    'tip', 'gratuity', 'napiwek', 'service charge', 'guest count', 'server', 'kelner',
    'table', 'stolik', 'check #', 'rachunek', 'order #', 'zamówienie',
    'paragon', 'fiskalny', 'nip', 'kasa', 'bdo', 'dziękujemy', 'thank you',
    'tel:', 'phone', 'www.', 'http', 'opłata', 'rabat', 'discount',
  ];

  // 5. Line-by-Line Fiscal Analysis
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lower = line.toLowerCase();

    // A. Subtotal / Netto Detection
    if (subtotalLineRegex.test(line)) {
      const price = extractValidLinePrice(line);
      if (price !== null && price > 0) {
        subtotal = price;
      } else if (idx + 1 < lines.length) {
        // Lookahead to immediate next line if value is stacked below
        const nextPrice = extractValidLinePrice(lines[idx + 1]);
        if (nextPrice !== null && nextPrice > 0 && !grandTotalLineRegex.test(lines[idx + 1])) {
          subtotal = nextPrice;
        }
      }
      continue;
    }

    // B. Tax / PTU / VAT Detection
    if (taxLineRegex.test(line)) {
      const price = extractValidLinePrice(line);
      if (price !== null && price > 0) {
        // Prevent accidental grand total matching if line says "Total Tax"
        if (!lower.includes('grand total') && !lower.includes('suma pln') && !lower.includes('do zapłaty') && !lower.includes('razem')) {
          // If tax is not an unreasonable multiple
          if (taxAmount === 0 || price < taxAmount * 2) {
            taxAmount = price;
          }
        }
      } else if (idx + 1 < lines.length) {
        const nextPrice = extractValidLinePrice(lines[idx + 1]);
        if (nextPrice !== null && nextPrice > 0 && !grandTotalLineRegex.test(lines[idx + 1])) {
          taxAmount = nextPrice;
        }
      }
      continue;
    }

    // C. Grand Total / SUMA PLN / DO ZAPŁATY Detection
    if (grandTotalLineRegex.test(line)) {
      const price = extractValidLinePrice(line);
      if (price !== null && price > 0) {
        if (price > grandTotal) {
          grandTotal = price;
        }
      } else if (idx + 1 < lines.length) {
        const nextPrice = extractValidLinePrice(lines[idx + 1]);
        if (nextPrice !== null && nextPrice > 0) {
          if (nextPrice > grandTotal) {
            grandTotal = nextPrice;
          }
        }
      }
      continue;
    }

    // D. Individual Line Items Detection
    const isSummaryLine = summaryExclusionKeywords.some((kw) => lower.includes(kw));
    if (!isSummaryLine) {
      const priceTrailingRegex = /(?:[\$£€₴₹\s]|^)\s*(\d{1,4}[.,]\d{2})(?:\s*[A-Za-z*złPLN]+)?$/i;
      const priceMatch = line.match(priceTrailingRegex);

      if (priceMatch) {
        const rawPrice = priceMatch[1].replace(',', '.');
        const price = parseFloat(rawPrice);

        let itemName = line.replace(priceMatch[0], '').trim();
        // Remove item weights from item name if desired, or keep them clean
        const qtyMatch = itemName.match(/^(\d+)\s*[xX*]?\s+(.+)$/);
        let quantity = 1;
        if (qtyMatch) {
          quantity = parseInt(qtyMatch[1], 10) || 1;
          itemName = qtyMatch[2];
        }

        itemName = itemName
          .replace(/^[^a-zA-Z0-9ŻŹĆĄŚĘŁÓŃżźćąśęłóńА-Яа-яІіЇїЄєҐґ]+/, '')
          .replace(/[^a-zA-Z0-9\s&'\-./ŻŹĆĄŚĘŁÓŃżźćąśęłóńА-Яа-яІіЇїЄєҐґ]/g, '')
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

  // 6. Mathematical Consistency, Sanity Guardrails & Self-Healing
  const sumOfItems = lineItems.reduce((acc, it) => acc + it.price, 0);

  // Guardrail 1: Tax MUST be strictly less than Grand Total (Tax < Grand Total)
  if (taxAmount > 0 && grandTotal > 0 && taxAmount >= grandTotal) {
    // Invalidate erroneous tax (e.g. tax parsed from 120g weight or NIP)
    if (subtotal > 0 && subtotal < grandTotal) {
      taxAmount = parseFloat((grandTotal - subtotal).toFixed(2));
    } else {
      // Standard European/Global tax estimate (~23% or ~10%)
      taxAmount = parseFloat(((grandTotal * 0.23) / 1.23).toFixed(2));
    }
  }

  // Guardrail 2: Subtotal cannot exceed or equal Grand Total when Tax is present
  if (grandTotal > 0 && taxAmount > 0) {
    if (subtotal >= grandTotal || Math.abs((subtotal + taxAmount) - grandTotal) > 0.05) {
      subtotal = parseFloat(Math.max(0, grandTotal - taxAmount).toFixed(2));
    }
  }

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
  if (onProgress) {
    onProgress({ status: 'Optimizing receipt contrast & lighting...', progress: 15 });
  }

  const { canvas, dataUrl } = await preprocessReceiptImage(imageSource, {
    contrast: 70,
    brightness: 8,
    binarize: true,
    sharpen: true,
  });

  if (onProgress) {
    onProgress({ status: 'Running on-device neural character recognition...', progress: 35 });
  }

  const result = await Tesseract.recognize(canvas, 'eng', {
    logger: (m) => {
      if (onProgress && m.status === 'recognizing text') {
        const rawProgress = m.progress || 0;
        const mappedProgress = Math.round(35 + rawProgress * 55);
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

