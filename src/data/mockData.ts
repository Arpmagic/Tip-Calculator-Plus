import { CurrencyRate, CalculationHistoryItem, DiningTask, Person, ItemizedItem, UserProfile } from '../types';

export const INITIAL_USER: UserProfile = {
  id: 'usr_default',
  name: 'Guest User',
  email: '',
  isGuest: true,
  isPro: false,
  defaultTip: 20,
  defaultCurrency: 'USD',
  roundTotal: false,
  language: 'en',
  createdAt: Date.now(),
  memberSince: Date.now(),
};

export const INITIAL_CURRENCIES: CurrencyRate[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', rateToUSD: 1.0, change24h: 0.0, flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', rateToUSD: 0.9245, change24h: 0.5, flag: '🇪🇺' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', rateToUSD: 3.965, change24h: 0.2, flag: '🇵🇱' },
  { code: 'GBP', symbol: '£', name: 'British Pound', rateToUSD: 0.7890, change24h: -0.2, flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateToUSD: 149.50, change24h: 1.2, flag: '🇯🇵' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rateToUSD: 1.352, change24h: 0.1, flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rateToUSD: 1.518, change24h: -0.4, flag: '🇦🇺' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', rateToUSD: 0.882, change24h: 0.3, flag: '🇨🇭' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rateToUSD: 7.234, change24h: -0.1, flag: '🇨🇳' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia', rateToUSD: 41.25, change24h: 0.4, flag: '🇺🇦' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', rateToUSD: 1.341, change24h: 0.2, flag: '🇸🇬' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', rateToUSD: 7.82, change24h: 0.0, flag: '🇭🇰' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rateToUSD: 3.672, change24h: 0.0, flag: '🇦🇪' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', rateToUSD: 1335.0, change24h: 0.8, flag: '🇰🇷' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateToUSD: 83.45, change24h: -0.1, flag: '🇮🇳' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', rateToUSD: 5.48, change24h: -0.6, flag: '🇧🇷' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', rateToUSD: 10.42, change24h: 0.3, flag: '🇸🇪' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', rateToUSD: 1.638, change24h: -0.3, flag: '🇳🇿' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', rateToUSD: 19.85, change24h: 0.9, flag: '🇲🇽' },
];

export const INITIAL_PEOPLE: Person[] = [
  { id: 'p1', name: 'You', avatarColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', initials: 'Y' },
  { id: 'p2', name: 'Guest 1', avatarColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40', initials: 'G1' },
];

export const INITIAL_ITEMIZED_ITEMS: ItemizedItem[] = [];

export const INITIAL_HISTORY: CalculationHistoryItem[] = [];

export const INITIAL_TASKS: DiningTask[] = [];

export const SUPPORTED_CURRENCIES = INITIAL_CURRENCIES;
export const INITIAL_ITEMS = INITIAL_ITEMIZED_ITEMS;


