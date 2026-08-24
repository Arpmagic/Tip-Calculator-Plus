import { AppLanguage } from '../types';

/**
 * Maps application language codes strictly to standard BCP 47 locales.
 * Zero OS-level fallback to guarantee 100% deterministic localization.
 */
export const LOCALE_MAP: Record<AppLanguage, string> = {
  en: 'en-US',
  uk: 'uk-UA',
  ru: 'ru-RU',
};

/**
 * Returns the exact decimal separator character for the given language.
 */
export function getDecimalSeparator(appLanguage: AppLanguage = 'en'): string {
  return appLanguage === 'en' ? '.' : ',';
}

/**
 * Parses user input string into a valid finite number.
 * Robustly handles both commas (,) and periods (.) as decimal separators
 * regardless of the user's mobile keyboard layout or regional settings.
 */
export function parseLocalizedNumber(
  input: string | number | undefined | null
): number {
  if (input === undefined || input === null) return 0;
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;

  // Clean all whitespace, non-breaking spaces, and currency symbols
  let sanitized = input.toString().trim().replace(/[^\d.,\-]/g, '');
  if (!sanitized) return 0;

  // If input contains both comma and dot (e.g. 1,250.50 or 1.250,50)
  if (sanitized.includes(',') && sanitized.includes('.')) {
    const lastComma = sanitized.lastIndexOf(',');
    const lastDot = sanitized.lastIndexOf('.');
    if (lastComma > lastDot) {
      // European format: 1.250,50 -> 1250.50
      sanitized = sanitized.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,250.50 -> 1250.50
      sanitized = sanitized.replace(/,/g, '');
    }
  } else if (sanitized.includes(',')) {
    // Single comma used as decimal separator (e.g. 85,50 -> 85.50)
    sanitized = sanitized.replace(',', '.');
  }

  const result = parseFloat(sanitized);
  return Number.isFinite(result) ? result : 0;
}

/**
 * Formats a monetary amount into a localized string using standard Intl.NumberFormat.
 * The formatting rules (grouping, decimal separator, symbol placement) strictly follow
 * the user's active application language state.
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  appLanguage: AppLanguage = 'en',
  options?: {
    useGrouping?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const locale = LOCALE_MAP[appLanguage] || 'en-US';

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'narrowSymbol',
      useGrouping: options?.useGrouping ?? true,
      minimumFractionDigits: options?.minimumFractionDigits ?? 2,
      maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    });

    return formatter.format(safeAmount);
  } catch {
    // Fallback for custom or unsupported currency formatting
    const fallbackSymbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      PLN: 'zł',
      GBP: '£',
      UAH: '₴',
      JPY: '¥',
      CAD: 'C$',
      AUD: 'A$',
      CHF: 'CHF',
      CNY: '¥',
    };
    const symbol = fallbackSymbols[currencyCode] || currencyCode;
    return `${symbol}${safeAmount.toFixed(2)}`;
  }
}

/**
 * Formats a raw number according strictly to the user's active language locale.
 */
export function formatNumber(
  value: number,
  appLanguage: AppLanguage = 'en',
  options?: Intl.NumberFormatOptions
): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const locale = LOCALE_MAP[appLanguage] || 'en-US';
  return new Intl.NumberFormat(locale, options).format(safeValue);
}

/**
 * Formats a percentage value according to the user's active language locale.
 */
export function formatPercent(
  percent: number,
  appLanguage: AppLanguage = 'en'
): string {
  const safePct = Number.isFinite(percent) ? percent : 0;
  const locale = LOCALE_MAP[appLanguage] || 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: Number.isInteger(safePct) ? 0 : 1,
    maximumFractionDigits: 2,
  }).format(safePct / 100);
}

/**
 * Safely parses any date input (timestamp number, ISO string, Date object)
 * into a valid Date object. If input is invalid or a legacy pre-formatted string,
 * falls back to a safe timestamp (e.g. August 2026).
 */
export function parseDateInput(input: number | string | Date | undefined | null): Date {
  if (input === undefined || input === null) {
    return new Date('2026-08-01T00:00:00.000Z');
  }
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? new Date('2026-08-01T00:00:00.000Z') : input;
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? new Date('2026-08-01T00:00:00.000Z') : d;
  }
  if (typeof input === 'string') {
    // If it's a numeric string timestamp
    const num = Number(input);
    if (!isNaN(num) && num > 100000000) {
      const d = new Date(num);
      if (!isNaN(d.getTime())) return d;
    }
    // Attempt standard or ISO parse
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      return d;
    }
    // Fallback for any legacy localized strings
    return new Date('2026-08-01T00:00:00.000Z');
  }
  return new Date('2026-08-01T00:00:00.000Z');
}

/**
 * Strictly formats a date input into "Month Year" (e.g. "August 2026", "серпень 2026 р.", "август 2026 г.")
 * based SOLELY on the active application language state. Never defaults to the browser/OS locale.
 */
export function formatMonthYear(
  dateInput: number | string | Date | undefined | null,
  appLanguage: AppLanguage = 'en'
): string {
  const date = parseDateInput(dateInput);
  const locale = LOCALE_MAP[appLanguage] || 'en-US';

  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    });
    const formatted = formatter.format(date);
    // Capitalize first character for clean aesthetic in headers/badges
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    if (appLanguage === 'uk') return 'Серпень 2026';
    if (appLanguage === 'ru') return 'Август 2026';
    return 'August 2026';
  }
}

/**
 * Strictly formats a date into standard localized format (e.g. "Aug 23, 2026", "23 серп. 2026 р.")
 * using the explicit appLanguage locale.
 */
export function formatDate(
  dateInput: number | string | Date | undefined | null,
  appLanguage: AppLanguage = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseDateInput(dateInput);
  const locale = LOCALE_MAP[appLanguage] || 'en-US';

  try {
    const formatter = new Intl.DateTimeFormat(locale, options || {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Strictly formats a time into standard localized format (e.g. "7:45 PM" or "19:45")
 * using the explicit appLanguage locale.
 */
export function formatTime(
  dateInput: number | string | Date | undefined | null,
  appLanguage: AppLanguage = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseDateInput(dateInput);
  const locale = LOCALE_MAP[appLanguage] || 'en-US';

  try {
    const formatter = new Intl.DateTimeFormat(locale, options || {
      hour: '2-digit',
      minute: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return '12:00 PM';
  }
}
