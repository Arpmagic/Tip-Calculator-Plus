export interface PaymentLinkParams {
  platform: 'venmo' | 'cashapp' | 'applecash' | 'sms';
  recipientHandle: string; // e.g. "@JohnDoe" or "$JohnDoe" or phone number
  amount: number;
  note: string;
}

export function generatePaymentDeepLink(params: PaymentLinkParams): string {
  const { platform, recipientHandle, amount, note } = params;
  const encodedNote = encodeURIComponent(note);
  const formattedAmount = amount.toFixed(2);

  switch (platform) {
    case 'venmo': {
      // Venmo deep link with web fallback
      const cleanHandle = recipientHandle.replace('@', '');
      return `https://venmo.com/${cleanHandle}?txn=pay&amount=${formattedAmount}&note=${encodedNote}`;
    }
    case 'cashapp': {
      const cleanTag = recipientHandle.replace('$', '');
      return `https://cash.app/$${cleanTag}/${formattedAmount}?note=${encodedNote}`;
    }
    case 'applecash': {
      // Apple Pay / Apple Cash shortcut URI
      return `apple-pay://pay?amount=${formattedAmount}&recipient=${encodeURIComponent(recipientHandle)}&memo=${encodedNote}`;
    }
    case 'sms': {
      const smsBody = encodeURIComponent(`Hey! Here is your share for ${note}: $${formattedAmount}. Pay via Venmo/CashApp: ${recipientHandle}`);
      return `sms:${recipientHandle}?body=${smsBody}`;
    }
    default:
      return '#';
  }
}

export function generateWebSplitShareUrl(params: {
  receiptTitle: string;
  totalAmount: number;
  currency: string;
  personName: string;
  shareAmount: number;
  itemsSummary: string;
}): string {
  const query = new URLSearchParams({
    title: params.receiptTitle,
    total: params.totalAmount.toFixed(2),
    cur: params.currency,
    person: params.personName,
    amount: params.shareAmount.toFixed(2),
    items: params.itemsSummary,
  });

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/?split=${query.toString()}`;
}
