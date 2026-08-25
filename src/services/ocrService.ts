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
  isEstimatedTax?: boolean; // True if tax was derived mathematically rather than explicitly printed
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
 * Detects currency using multi-token heuristics and European city/fiscal indicators.
 */
export function detectReceiptCurrency(rawText: string): string {
  const upper = rawText.toUpperCase();

  // 1. Polish Fiscal Indicators, Cities & Złoty (PLN / zł)
  const polishCityIndicators = [
    'POZNAŃ', 'POZNAN', 'WARSZAWA', 'WARSAW', 'GDAŃSK', 'GDANSK', 
    'KRAKÓW', 'KRAKOW', 'WROCŁAW', 'WROCLAW', 'KATOWICE', 'ŁÓDŹ', 
    'LODZ', 'SZCZECIN', 'LUBLIN', 'BYDGOSZCZ', 'GDYNIA', 'SOPOT'
  ];
  const hasPolishCity = polishCityIndicators.some((city) => upper.includes(city));

  if (
    /\b(PLN|ZŁ|ZL)\b/i.test(rawText) ||
    hasPolishCity ||
    upper.includes('PARAGON FISKALNY') ||
    upper.includes('PARAGON') ||
    upper.includes('SUMA PLN') ||
    upper.includes('KWOTA PLN') ||
    upper.includes('SUMA PTU') ||
    upper.includes('SPRZEDAŻ') ||
    upper.includes('SPRZEDAZ') ||
    upper.includes('DO ZAPŁATY') ||
    upper.includes('DO ZAPLATY') ||
    upper.includes('ROZLICZENIE PŁATNOŚCI') ||
    upper.includes('PŁATNOŚĆ KARTĄ') ||
    upper.includes('ŻABKA') ||
    upper.includes('ZABKA') ||
    upper.includes('BIEDRONKA') ||
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
    upper.includes('ПІДСУМОК') ||
    upper.includes('КИЇВ') ||
    upper.includes('ЛЬВІВ') ||
    upper.includes('ОДЕСА')
  ) {
    return 'UAH';
  }

  // 3. British Pound (GBP / £)
  if (/\bGBP\b/i.test(rawText) || rawText.includes('£') || /\bPOUND\b/i.test(rawText) || upper.includes('LONDON') || upper.includes('VAT REG')) {
    return 'GBP';
  }

  // 4. Swiss Franc (CHF)
  if (/\b(CHF|SFRS?)\b/i.test(rawText) || /\bFR\.\s*\d/i.test(rawText) || upper.includes('ZÜRICH') || upper.includes('GENEVA')) {
    return 'CHF';
  }

  // 5. Japanese Yen (JPY / ¥ / 円)
  if (/\bJPY\b/i.test(rawText) || rawText.includes('¥') || rawText.includes('円') || upper.includes('TOKYO') || upper.includes('SHIBUYA')) {
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
    upper.includes('TOTAL HT') ||
    upper.includes('PARIS') ||
    upper.includes('BERLIN') ||
    upper.includes('MADRID') ||
    upper.includes('ROMA')
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
 * Intelligent multi-strategy fiscal OCR parser.
 * Employs Strategy A (Fuzzy Keyword Match) + Strategy B (Bottom-Up Heuristic Number Search)
 * so that it NEVER returns an empty or $0.00 total on valid receipt scans.
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
  let isEstimatedTax = false;
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
  // A. Check for known store / restaurant brand match first with store ID support (e.g. "SKLEP ŻABKA Z7394")
  for (const line of lines.slice(0, 10)) {
    const cleanUpper = line.toUpperCase().replace(/[^\w\sŻŹĆĄŚĘŁÓŃА-ЯІЇЄҐ]/gi, ' ');
    
    // Check Żabka with store ID (e.g. "SKLEP ŻABKA Z7394" or "ŻABKA Z7394")
    const zabkaMatch = line.match(/(?:SKLEP\s+)?(?:ŻABKA|ZABKA)(?:\s+([A-Z0-9]+))?/i);
    if (zabkaMatch) {
      const storeId = zabkaMatch[1] ? ` ${zabkaMatch[1]}` : '';
      detectedVenue = `Sklep Żabka${storeId}`;
      break;
    }

    // Check other known brands
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
      /^\d{2}-\d{3}\b/,
      /\d{3}[-.\s]\d{3}/,
      /^[a-z]{1,4}\s+[a-z]{1,4}\s+[a-z]{1,4}$/i,
    ];

    for (let i = 0; i < Math.min(6, lines.length); i++) {
      const line = lines[i];
      const isIgnored = metaIgnorePatterns.some((pattern) => pattern.test(line));
      if (!isIgnored && line.length >= 3) {
        const cleanedLine = line.replace(/[^\w\s&'\-.ŻŹĆĄŚĘŁÓŃżźćąśęłóńА-Яа-яІіЇїЄєҐґ\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g, '').trim();
        if (cleanedLine.length >= 2 && !/^(innes|ili|on|en)$/i.test(cleanedLine)) {
          detectedVenue = cleanedLine;
          break;
        }
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

    // Strip out weights (e.g. "120g", "250ml", "0.5kg", "5L") and dates (e.g. "1956r")
    clean = clean.replace(/\b\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|szt|gr)\b/gi, ' ');
    clean = clean.replace(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, ' ');
    clean = clean.replace(/\b\d{2}[-/.]\d{2}[-/.]\d{4}\b/g, ' ');
    clean = clean.replace(/\b\d{4}r\b/gi, ' ');
    clean = clean.replace(/\bNIP[:\s]*\d{10}\b/gi, ' ');
    clean = clean.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' '); // Strip timestamps

    const matches = clean.match(/-?\b\d{1,5}[.,]\d{2}\b/g);
    if (matches && matches.length > 0) {
      const lastMatch = matches[matches.length - 1].replace(',', '.');
      const num = parseFloat(lastMatch);
      return Number.isFinite(num) ? num : null;
    }

    // Fallback for whole integers (e.g. JPY receipts "4500円" or round euro/dollar bills)
    const intMatches = clean.match(/-?\b\d{1,5}\b/g);
    if (intMatches && intMatches.length > 0) {
      const lastInt = parseFloat(intMatches[intMatches.length - 1]);
      return Number.isFinite(lastInt) ? lastInt : null;
    }

    return normalizePriceString(clean);
  };

  // 4. Fuzzy Keyword Regex Lexicons (Handles character noise like "S U M A", "SUNA", "TOTAI", "ZAPŁAT")
  const grandTotalLineRegex = /(?:S\s*U\s*[MN]\s*A|S[UÜO0][MN]A|R\s*A\s*Z\s*[E3]\s*M|DO\s*Z\s*A\s*P\s*[ŁL]\s*A\s*T\s*Y|T\s*O\s*T\s*A\s*[LI1]|G\s*R\s*A\s*N\s*D\s*T\s*O\s*T\s*A\s*L|K\s*W\s*O\s*T\s*A|B\s*A\s*L(?:\s*A\s*N\s*C\s*E)?\s*D\s*U\s*E|A\s*M\s*O\s*U\s*N\s*T\s*D\s*U\s*E|T\s*O\s*T\s*A\s*L\s*D\s*U\s*E|P\s*Ł\s*A\s*T\s*N\s*O\s*Ś\s*Ć\s*K\s*A\s*R\s*T\s*Ą|G\s*E\s*S\s*A\s*M\s*T|Z\s*U\s*Z\s*A\s*H\s*L\s*E\s*N|T\s*O\s*T\s*A\s*L\s*T\s*T\s*C|С\s*У\s*М\s*А|В\s*С\s*Ь\s*О\s*Г\s*О|Д\s*О\s*С\s*П\s*Л\s*А\s*Т\s*И|合\s*計)/i;
  const taxLineRegex = /(?:S\s*U\s*M\s*A\s*P\s*T\s*U|P\s*T\s*U(?:\s*[A-Z])?|V\s*A\s*T|P\s*O\s*D\s*A\s*T\s*E\s*K|T\s*A\s*X|M\s*W\s*S\s*T|T\s*V\s*A|I\s*V\s*A|G\s*S\s*T|П\s*Д\s*В|消\s*費\s*税)/i;
  const subtotalLineRegex = /(?:S\s*P\s*R\s*Z\s*E\s*D\s*A\s*[ZŻ]\s*O\s*P\s*O\s*D\s*A\s*T\s*K\s*O\s*W\s*A\s*N\s*A|N\s*E\s*T\s*T\s*O|S\s*U\s*B\s*[\-\s]*\s*T\s*O\s*T\s*A\s*L|T\s*O\s*T\s*A\s*L\s*H\s*T|P\s*R\s*E\s*[\-\s]*\s*T\s*A\s*X|P\s*O\s*D\s*S\s*U\s*M\s*A|П\s*І\s*Д\s*С\s*У\s*М\s*О\s*К|小\s*計|Z\s*W\s*I\s*S\s*C\s*H\s*E\s*N\s*S\s*U\s*M\s*M\s*E)/i;

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

  // 5. Line-by-Line Fiscal Analysis (Strategy A)
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lower = line.toLowerCase();

    // A. Subtotal / Netto Detection
    if (subtotalLineRegex.test(line)) {
      const price = extractValidLinePrice(line);
      if (price !== null && price > 0) {
        subtotal = price;
      } else if (idx + 1 < lines.length) {
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
        if (!lower.includes('grand total') && !lower.includes('suma pln') && !lower.includes('do zapłaty') && !lower.includes('razem')) {
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

    // C. Grand Total / SUMA / DO ZAPŁATY Detection
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

    // D. Individual Line Items Detection (including discounts / opust)
    const isSummaryLine = summaryExclusionKeywords.some((kw) => lower.includes(kw));
    if (!isSummaryLine) {
      const priceTrailingRegex = /(?:[\$£€₴₹\s]|^)\s*(-?\d{1,4}[.,]\d{2})(?:\s*[A-Za-z*złPLN]+)?$/i;
      const priceMatch = line.match(priceTrailingRegex);

      if (priceMatch) {
        const rawPrice = priceMatch[1].replace(',', '.');
        const price = parseFloat(rawPrice);

        let itemName = line.replace(priceMatch[0], '').trim();
        const qtyMatch = itemName.match(/^(\d+)\s*[xX*]?\s+(.+)$/);
        let quantity = 1;
        if (qtyMatch) {
          quantity = parseInt(qtyMatch[1], 10) || 1;
          itemName = qtyMatch[2];
        }

        itemName = itemName
          .replace(/^\d+\s*[*xX]\s*[\d.,]+\s*/, '')
          .replace(/^[^a-zA-Z0-9ŻŹĆĄŚĘŁÓŃżźćąśęłóńА-Яа-яІіЇїЄєҐґ]+/, '')
          .replace(/[^a-zA-Z0-9\s&'\-./ŻŹĆĄŚĘŁÓŃżźćąśęłóńА-Яа-яІіЇїЄєҐґ]/g, '')
          .trim();

        if (itemName.length >= 2 && Math.abs(price) > 0 && Math.abs(price) < 5000) {
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

  // 6. Multi-Line Permissive Regex Across Full Text Block
  if (grandTotal <= 0) {
    const multiGtRegex = /(?:SUMA\s*PLN|DO\s*ZAP[ŁL]ATY|RAZEM|TOTAL|GRAND\s*TOTAL|BAL(?:ANCE)?\s*DUE|AMOUNT\s*DUE|TOTAL\s*DUE|KWOTA\s*PLN|S\s*U\s*M\s*A)[\s\S]{0,35}?([0-9]{1,4}[.,\s][0-9]{2})/gi;
    let m;
    while ((m = multiGtRegex.exec(rawText)) !== null) {
      const p = parseFloat(m[1].replace(/\s/g, '').replace(',', '.'));
      if (p > grandTotal) grandTotal = p;
    }
  }

  if (taxAmount <= 0) {
    const multiTaxRegex = /(?:SUMA\s*PTU|PTU\s*[A-Z]|VAT|TAX|PODATEK|MWST|TVA|IVA|ПДВ)[\s\S]{0,35}?([0-9]{1,4}[.,\s][0-9]{2})/gi;
    let m;
    while ((m = multiTaxRegex.exec(rawText)) !== null) {
      const p = parseFloat(m[1].replace(/\s/g, '').replace(',', '.'));
      if (p > 0 && (grandTotal <= 0 || p < grandTotal)) taxAmount = p;
    }
  }

  if (subtotal <= 0) {
    const multiSubRegex = /(?:SPRZEDA[ZŻ]\s*OPODATKOWANA|NETTO|OPODATKOWANIE|SUB[\s\-]*TOTAL|TOTAL\s*HT|PRE[\s\-]*TAX)[\s\S]{0,35}?([0-9]{1,4}[.,\s][0-9]{2})/gi;
    let m;
    while ((m = multiSubRegex.exec(rawText)) !== null) {
      const p = parseFloat(m[1].replace(/\s/g, '').replace(',', '.'));
      if (p > 0) subtotal = p;
    }
  }

  // 7. STRATEGY B: BOTTOM-UP NUMBER HEURISTIC (Never Return Empty)
  // If Strategy A yielded no grand total, search for all valid decimal monetary amounts bottom-up
  if (grandTotal <= 0) {
    const extractedCandidates: number[] = [];

    // Scan lines from bottom to top
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      let clean = line.replace(/(\d)\s*([.,])\s*(\d)/g, '$1$2$3');
      
      // Filter out dates (2024, 2025, 2026, 1956), time (14:23, 10:15), NIP IDs (10 digits), and weights
      clean = clean.replace(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, ' ');
      clean = clean.replace(/\b\d{2}[-/.]\d{2}[-/.]\d{4}\b/g, ' ');
      clean = clean.replace(/\b\d{4}r\b/gi, ' ');
      clean = clean.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' ');
      clean = clean.replace(/\bNIP[:\s]*\d{10}\b/gi, ' ');
      clean = clean.replace(/\b\d+\s*(?:g|kg|ml|l|szt|gr)\b/gi, ' ');

      const matches = clean.match(/\b\d{1,4}[.,]\d{2}\b/g);
      if (matches) {
        for (const matchStr of matches) {
          const num = parseFloat(matchStr.replace(',', '.'));
          // Filter out typical year numbers (e.g. 2026.00 or 1956.00) or barcode numbers
          if (num > 0.5 && num < 10000 && num !== 2025 && num !== 2026 && num !== 1956) {
            extractedCandidates.push(num);
          }
        }
      }
    }

    if (extractedCandidates.length > 0) {
      // Pick the bottom-most candidate or the largest reasonable value in the bottom section
      grandTotal = extractedCandidates[0];
    }
  }

  // 8. Auto-Derivation for Tax & Subtotal when missing
  const sumOfItems = lineItems.reduce((acc, it) => acc + it.price, 0);

  // If Grand Total is missing, infer from line items or Subtotal + Tax
  if (grandTotal <= 0) {
    if (sumOfItems > 0) {
      grandTotal = parseFloat((sumOfItems + taxAmount).toFixed(2));
      subtotal = sumOfItems;
    } else if (subtotal > 0) {
      grandTotal = parseFloat((subtotal + taxAmount).toFixed(2));
    }
  }

  // Auto-derive Tax & Subtotal if Tax is zero/missing from receipt
  if (grandTotal > 0 && taxAmount <= 0) {
    if (subtotal > 0 && subtotal < grandTotal) {
      taxAmount = parseFloat((grandTotal - subtotal).toFixed(2));
    } else {
      // Mathematically derive 23% VAT: Subtotal = Total / 1.23, Tax = Total - Subtotal
      subtotal = parseFloat((grandTotal / 1.23).toFixed(2));
      taxAmount = parseFloat((grandTotal - subtotal).toFixed(2));
      isEstimatedTax = true;
    }
  }

  // Mathematical Consistency Guardrails
  if (taxAmount > 0 && grandTotal > 0 && taxAmount >= grandTotal) {
    taxAmount = parseFloat(((grandTotal * 0.23) / 1.23).toFixed(2));
    subtotal = parseFloat((grandTotal - taxAmount).toFixed(2));
    isEstimatedTax = true;
  }

  if (grandTotal > 0 && taxAmount > 0 && subtotal <= 0) {
    subtotal = parseFloat(Math.max(0, grandTotal - taxAmount).toFixed(2));
  }

  if (grandTotal > 0 && taxAmount > 0 && subtotal >= grandTotal) {
    subtotal = parseFloat(Math.max(0, grandTotal - taxAmount).toFixed(2));
  }

  const mathSum = subtotal + taxAmount;
  const discrepancy = Math.abs(mathSum - grandTotal);
  const isValidated = grandTotal > 0 && discrepancy <= 0.05;

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
    isEstimatedTax,
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

