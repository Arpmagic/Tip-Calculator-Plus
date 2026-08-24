export interface User {
  id: string;
  name: string;
  avatar?: string;
  isBirthdayPerson?: boolean;
}

export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  assignedUserIds: string[]; // Empty or all IDs means shared among everyone
  isShared: boolean;
}

export interface TaxLine {
  id: string;
  label: string;
  amount: number;
  isExemptFromTip: boolean;
}

export interface ServiceCharge {
  id: string;
  label: string;
  amount: number;
  isExemptFromTip: boolean;
}

export interface TipConfig {
  percent: number;
  isPostTax: boolean; // true = tip on subtotal + tax; false = tip on subtotal only
  customAmount?: number;
}

export interface AdvancedReceipt {
  id: string;
  venueName: string;
  date: string;
  items: ReceiptItem[];
  taxLines: TaxLine[];
  serviceCharges: ServiceCharge[];
  tipConfig: TipConfig;
  users: User[];
  currencySymbol: string;
}

export interface PersonShareResult {
  userId: string;
  userName: string;
  subtotal: number;
  proportionalTax: number;
  proportionalService: number;
  tipShare: number;
  birthdaySubsidyAdded: number; // Cost absorbed from birthday person
  finalTotal: number;
}
