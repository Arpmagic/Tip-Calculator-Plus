import { AdvancedReceipt, ReceiptItem, TaxLine, ServiceCharge } from '../types/advanced';

export function mapOcrResponseToReceipt(aiVisionJson: any): Partial<AdvancedReceipt> {
  const items: ReceiptItem[] = (aiVisionJson.lineItems || []).map((item: any, idx: number) => ({
    id: `ocr_item_${idx}_${Date.now()}`,
    name: item.description || item.name || 'Unknown Item',
    price: parseFloat(item.totalPrice || item.price || 0),
    assignedUserIds: [],
    isShared: true,
  }));

  const taxLines: TaxLine[] = (aiVisionJson.taxes || []).map((tax: any, idx: number) => ({
    id: `ocr_tax_${idx}`,
    label: tax.name || tax.label || 'Sales Tax',
    amount: parseFloat(tax.amount || 0),
    isExemptFromTip: false,
  }));

  const serviceCharges: ServiceCharge[] = (aiVisionJson.serviceCharges || []).map((sc: any, idx: number) => ({
    id: `ocr_sc_${idx}`,
    label: sc.name || sc.label || 'Service Charge',
    amount: parseFloat(sc.amount || 0),
    isExemptFromTip: true, // Automatic default for service fees
  }));

  return {
    venueName: aiVisionJson.merchantName || aiVisionJson.venueName || 'Dining Venue',
    date: aiVisionJson.transactionDate || aiVisionJson.date || new Date().toISOString().split('T')[0],
    items,
    taxLines,
    serviceCharges,
    tipConfig: {
      percent: 18,
      isPostTax: true,
    },
  };
}
