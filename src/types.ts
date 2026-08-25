export type AppLanguage = 'en' | 'uk' | 'ru';

export type ScreenType =
  | 'calculator'
  | 'itemized'
  | 'scanner'
  | 'history'
  | 'tasks'
  | 'converter'
  | 'profile'
  | 'widgets'
  | 'onboarding'
  | 'paywall';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isGuest?: boolean;
  isPro: boolean;
  proPlan?: 'lifetime' | 'monthly' | 'annual';
  defaultCurrency: string;
  defaultTip: number;
  preTaxTipping?: boolean;
  roundTotal: boolean;
  language?: AppLanguage;
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
  createdAt: number | string;
  memberSince?: number | string;
  proUnlockDate?: number | string;
}

export interface DiningTask {
  id: string;
  title: string;
  category: 'split' | 'verify' | 'refund' | 'expense' | 'travel' | 'receivable' | 'payable';
  type?: 'receivable' | 'payable' | 'general';
  completed: boolean;
  dueDate?: string;
  amount?: number;
  currency: string;
  debtorOrCreditor?: string;
  phoneOrHandle?: string;
  venue?: string;
  notes?: string;
  assignedWith?: string;
}

export interface Person {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
}

export interface ItemizedItem {
  id: string;
  name: string;
  price: number;
  assignedPersonIds: string[];
}

export interface ItemizedSplitData {
  items: ItemizedItem[];
  people: Person[];
  taxRatePercent: number;
  tipPercent: number;
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  grandTotal: number;
}

export interface CalculationHistoryItem {
  id: string;
  venueName: string;
  date: string;
  time: string;
  mealType: 'Dinner' | 'Lunch' | 'Drinks' | 'Brunch' | 'Coffee' | 'Supper';
  currency: string;
  billAmount: number;
  taxAmount: number;
  tipPercent: number;
  tipAmount: number;
  totalBill: number;
  splitCount: number;
  totalPerPerson: number;
  isItemized: boolean;
  itemizedData?: ItemizedSplitData;
}

export interface CurrencyRate {
  code: string;
  symbol: string;
  name: string;
  rateToUSD: number;
  change24h: number;
  flag: string;
}

export interface ReceiptScanResult {
  venueName?: string;
  date?: string;
  subtotal: number;
  tax: number;
  total: number;
  items: { name: string; price: number }[];
}
