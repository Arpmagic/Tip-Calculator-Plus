import React, { useState, useMemo } from 'react';
import { 
  Person, 
  ItemizedItem, 
  CurrencyRate, 
  CalculationHistoryItem 
} from '../types';
import { 
  Plus, 
  Trash2, 
  UserPlus, 
  ArrowRight, 
  Check, 
  Share2, 
  Users, 
  Receipt,
  Cake,
  Sparkles,
  Info,
  DollarSign,
  Smartphone,
  Copy
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { formatDate, formatTime } from '../utils/i18nFormatter';
import { calculateAdvancedSplit } from '../utils/calculatorEngine';
import { AdvancedReceipt, TaxLine, ServiceCharge } from '../types/advanced';
import { generatePaymentDeepLink, generateWebSplitShareUrl } from '../utils/paymentLinks';

interface ItemizedSplitProps {
  selectedCurrency: CurrencyRate;
  initialPeople: Person[];
  initialItems: ItemizedItem[];
  defaultTip: number;
  onSaveHistory: (item: CalculationHistoryItem) => void;
}

export const ItemizedSplit: React.FC<ItemizedSplitProps> = ({
  selectedCurrency,
  initialPeople,
  initialItems,
  defaultTip,
  onSaveHistory,
}) => {
  const { language, t } = useLanguage();
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [birthdayPersonId, setBirthdayPersonId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemizedItem[]>(initialItems);
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemPrice, setNewItemPrice] = useState<string>('');
  const [newPersonName, setNewPersonName] = useState<string>('');
  const [showAddPerson, setShowAddPerson] = useState<boolean>(false);
  const [taxRatePercent, setTaxRatePercent] = useState<number>(8.5);
  const [tipPercent, setTipPercent] = useState<number>(defaultTip || 20);
  const [isPostTaxTip, setIsPostTaxTip] = useState<boolean>(false);
  const [serviceFeeAmount, setServiceFeeAmount] = useState<number>(0);
  const [isServiceFeeExempt, setIsServiceFeeExempt] = useState<boolean>(true);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [savedStatus, setSavedStatus] = useState<boolean>(false);
  const [p2pHandleInput] = useState<{ [userId: string]: string }>({});

  // Map to Advanced Receipt format for the math engine
  const advancedReceipt: AdvancedReceipt = useMemo(() => {
    const rawSubtotal = items.reduce((acc, it) => acc + it.price, 0);
    const taxValue = (rawSubtotal * taxRatePercent) / 100;

    const taxLines: TaxLine[] = [
      {
        id: 'tax_main',
        label: `Sales Tax (${taxRatePercent}%)`,
        amount: taxValue,
        isExemptFromTip: !isPostTaxTip,
      }
    ];

    const serviceCharges: ServiceCharge[] = serviceFeeAmount > 0 ? [
      {
        id: 'svc_charge',
        label: 'Service Charge / Gratuity',
        amount: serviceFeeAmount,
        isExemptFromTip: isServiceFeeExempt,
      }
    ] : [];

    const advancedUsers = people.map(p => ({
      id: p.id,
      name: p.name,
      isBirthdayPerson: p.id === birthdayPersonId,
    }));

    const advancedItems = items.map(it => ({
      id: it.id,
      name: it.name,
      price: it.price,
      assignedUserIds: it.assignedPersonIds,
      isShared: it.assignedPersonIds.length === people.length || it.assignedPersonIds.length === 0,
    }));

    return {
      id: `rcpt_${Date.now()}`,
      venueName: 'Dining Venue',
      date: new Date().toISOString(),
      items: advancedItems,
      taxLines,
      serviceCharges,
      tipConfig: {
        percent: tipPercent,
        isPostTax: isPostTaxTip,
      },
      users: advancedUsers,
      currencySymbol: selectedCurrency.symbol,
    };
  }, [items, people, birthdayPersonId, taxRatePercent, isPostTaxTip, serviceFeeAmount, isServiceFeeExempt, tipPercent, selectedCurrency.symbol]);

  // Compute results using the mathematical engine
  const splitResults = useMemo(() => {
    return calculateAdvancedSplit(advancedReceipt);
  }, [advancedReceipt]);

  // Calculations for summary card
  const subtotal = items.reduce((acc, item) => acc + item.price, 0);
  const taxAmount = (subtotal * taxRatePercent) / 100;
  const tipBase = isPostTaxTip ? (subtotal + taxAmount + (isServiceFeeExempt ? 0 : serviceFeeAmount)) : subtotal;
  const tipAmount = (tipBase * tipPercent) / 100;
  const grandTotal = subtotal + taxAmount + tipAmount + serviceFeeAmount;

  // Add Item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newItemPrice);
    if (!newItemName.trim() || isNaN(price) || price <= 0) return;

    const newItem: ItemizedItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      price: price,
      assignedPersonIds: people.map(p => p.id),
    };

    setItems([...items, newItem]);
    setNewItemName('');
    setNewItemPrice('');
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Toggle Person on Item
  const handleTogglePersonOnItem = (itemId: string, personId: string) => {
    setItems(items.map(item => {
      if (item.id !== itemId) return item;
      const isAssigned = item.assignedPersonIds.includes(personId);
      let nextAssigned: string[];
      if (isAssigned) {
        nextAssigned = item.assignedPersonIds.filter(id => id !== personId);
      } else {
        nextAssigned = [...item.assignedPersonIds, personId];
      }
      return { ...item, assignedPersonIds: nextAssigned };
    }));
  };

  // Add Person
  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;

    const colors = [
      'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      'bg-sky-500/20 text-sky-300 border-sky-500/40',
      'bg-purple-500/20 text-purple-300 border-purple-500/40',
      'bg-amber-500/20 text-amber-300 border-amber-500/40',
      'bg-rose-500/20 text-rose-300 border-rose-500/40',
    ];

    const newPerson: Person = {
      id: `p-${Date.now()}`,
      name: newPersonName.trim(),
      initials: newPersonName.trim().charAt(0).toUpperCase(),
      avatarColor: colors[people.length % colors.length],
    };

    setPeople([...people, newPerson]);
    setNewPersonName('');
    setShowAddPerson(false);
  };

  // Remove Person
  const handleRemovePerson = (personId: string) => {
    if (people.length <= 1) return;
    if (birthdayPersonId === personId) {
      setBirthdayPersonId(null);
    }
    setPeople(people.filter(p => p.id !== personId));
    setItems(items.map(item => ({
      ...item,
      assignedPersonIds: item.assignedPersonIds.filter(id => id !== personId),
    })));
  };

  const handleSaveToHistory = () => {
    const historyItem: CalculationHistoryItem = {
      id: `hist_itemized_${Date.now()}`,
      venueName: t.itemized.title,
      date: formatDate(Date.now(), language),
      time: formatTime(Date.now(), language),
      mealType: 'Dinner',
      currency: selectedCurrency.code,
      billAmount: subtotal,
      taxAmount: taxAmount,
      tipPercent: tipPercent,
      tipAmount: tipAmount,
      totalBill: grandTotal,
      splitCount: people.length,
      totalPerPerson: people.length > 0 ? (grandTotal / people.length) : grandTotal,
      isItemized: true,
      itemizedData: {
        items,
        people,
        taxRatePercent,
        tipPercent,
        subtotal,
        taxAmount,
        tipAmount,
        grandTotal,
      },
    };

    onSaveHistory(historyItem);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 2000);
  };

  const handleShareSummary = () => {
    let summary = `Tip Calculator Plus+ Itemized Split (${selectedCurrency.code}):\n`;
    summary += `Total: ${selectedCurrency.symbol}${grandTotal.toFixed(2)} (Subtotal: ${selectedCurrency.symbol}${subtotal.toFixed(2)}, Tax: ${selectedCurrency.symbol}${taxAmount.toFixed(2)}, Tip ${tipPercent}%: ${selectedCurrency.symbol}${tipAmount.toFixed(2)}${serviceFeeAmount > 0 ? `, Service: ${selectedCurrency.symbol}${serviceFeeAmount.toFixed(2)}` : ''})\n`;
    if (birthdayPersonId) {
      const bday = people.find(p => p.id === birthdayPersonId);
      if (bday) summary += `🎂 Birthday Mode Active for ${bday.name} (treated by group!)\n`;
    }
    summary += `\nBreakdown:\n`;

    splitResults.forEach(res => {
      summary += `👤 ${res.userName}: ${selectedCurrency.symbol}${res.finalTotal.toFixed(2)} (Food: ${selectedCurrency.symbol}${res.subtotal.toFixed(2)}, Tax+Tip: ${selectedCurrency.symbol}${(res.proportionalTax + res.tipShare).toFixed(2)}${res.birthdaySubsidyAdded > 0 ? `, Birthday Subsidy: +${selectedCurrency.symbol}${res.birthdaySubsidyAdded.toFixed(2)}` : ''})\n`;
    });

    if (navigator.share) {
      navigator.share({ title: 'Itemized Bill Split', text: summary }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(summary);
      alert(t.common.copied);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-5 pb-12 animate-fade-in">
      
      {/* 1. HEADER HERO SUBTOTAL DISPLAY */}
      <section className="glass-panel rounded-3xl p-6 sm:p-7 flex flex-col items-center justify-center relative overflow-hidden border border-white/[0.12] bg-white/[0.035] shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <p className="font-mono text-xs text-[#c4c7c8] uppercase tracking-widest mb-1 z-10 font-semibold">
          {t.itemized.subtotal}
        </p>
        <h2 className="font-display font-black text-5xl sm:text-6xl text-white tracking-tight z-10 tabular-nums">
          <span className="text-3xl text-[#c4c7c8]/70 mr-1 font-semibold">{selectedCurrency.symbol}</span>
          {subtotal.toFixed(2)}
        </h2>

        <div className="flex items-center gap-2 mt-4 z-10 flex-wrap justify-center text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 bg-white/[0.06] px-3 py-1 rounded-full text-white border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{items.length} {items.length === 1 ? 'item' : 'items'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/[0.06] px-3 py-1 rounded-full text-white border border-white/10">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Tax: {taxRatePercent}% ({selectedCurrency.symbol}{taxAmount.toFixed(2)})</span>
          </span>
          <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 px-3 py-1 rounded-full text-emerald-300 border border-emerald-500/30 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Tip: {tipPercent}% ({selectedCurrency.symbol}{tipAmount.toFixed(2)})</span>
          </span>
        </div>

        {birthdayPersonId && (
          <div className="mt-3 inline-flex items-center gap-1.5 bg-rose-500/20 border border-rose-500/40 px-3.5 py-1.5 rounded-full text-xs font-mono text-rose-300 z-10 animate-pulse">
            <Cake className="w-4 h-4 text-rose-400" />
            <span>Birthday Mode: {people.find(p => p.id === birthdayPersonId)?.name} is treated!</span>
          </div>
        )}
      </section>

      {/* 2. PEOPLE MANAGER BAR WITH TACTILE CHIPS */}
      <section className="glass-panel rounded-3xl p-5 border border-white/[0.08] bg-white/[0.03] space-y-3">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="font-display font-bold text-sm text-white">{t.itemized.assignedPeople} ({people.length})</h3>
          </div>
          <button
            onClick={() => setShowAddPerson(!showAddPerson)}
            className="min-h-[36px] px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/10 text-xs font-mono text-white flex items-center gap-1.5 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t.itemized.addPerson}</span>
          </button>
        </div>

        {/* Add Person Inline Form */}
        {showAddPerson && (
          <form onSubmit={handleAddPerson} className="flex gap-2 p-2 rounded-2xl bg-white/[0.04] border border-white/10 animate-fade-in">
            <input
              type="text"
              required
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder={t.itemized.personNamePlaceholder}
              className="flex-1 bg-transparent border-none outline-none text-xs text-white px-3 min-h-[44px]"
              autoFocus
            />
            <button
              type="submit"
              className="min-h-[44px] px-4 rounded-xl bg-emerald-400 text-[#0B0F19] font-display font-extrabold text-xs hover:bg-emerald-300 active:scale-95 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)]"
            >
              {t.common.save}
            </button>
          </form>
        )}

        {/* Tactile Guest Chips */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
          {people.map(person => {
            const isBday = person.id === birthdayPersonId;
            return (
              <div
                key={person.id}
                className={`min-h-[40px] flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border text-xs font-mono shrink-0 transition-all active:scale-[0.97] shadow-sm ${
                  isBday 
                    ? 'bg-rose-500/30 text-rose-200 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.4)]' 
                    : person.avatarColor
                }`}
              >
                <span className="font-black text-sm">{person.initials}</span>
                <span className="font-medium">{person.name}</span>
                
                {/* Birthday Toggle */}
                <button
                  type="button"
                  onClick={() => setBirthdayPersonId(isBday ? null : person.id)}
                  className={`p-1 rounded-lg transition-all ${
                    isBday ? 'text-rose-200 scale-110' : 'text-white/40 hover:text-white'
                  }`}
                  title={isBday ? 'Birthday person (tap to unmark)' : `Treat ${person.name}`}
                >
                  <Cake className="w-3.5 h-3.5" />
                </button>

                {people.length > 1 && (
                  <button
                    onClick={() => handleRemovePerson(person.id)}
                    className="hover:text-rose-400 pl-1 text-xs text-white/50"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. QUICK ADD ITEM SECTION */}
      <section className="glass-panel rounded-3xl p-5 border border-white/[0.08] bg-white/[0.03] space-y-3">
        <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>{t.itemized.addDish}</span>
        </h3>

        <form onSubmit={handleAddItem} className="flex gap-2.5 items-end">
          <div className="flex-1 flex flex-col gap-1">
            <label className="font-mono text-[10px] text-[#c4c7c8] uppercase font-semibold">{t.itemized.dishNamePlaceholder}</label>
            <input
              type="text"
              required
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="e.g. Wagyu Ribeye Steak"
              className="w-full min-h-[48px] glass-panel rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white bg-transparent border border-white/10 outline-none placeholder:text-white/20 focus:border-white/30"
            />
          </div>

          <div className="w-28 sm:w-32 flex flex-col gap-1">
            <label className="font-mono text-[10px] text-[#c4c7c8] uppercase font-semibold">{t.itemized.price}</label>
            <div className="relative flex items-center min-h-[48px] glass-panel rounded-2xl px-3 border border-white/10 focus-within:border-white/30">
              <span className="text-[#c4c7c8]/60 text-xs font-bold mr-1">
                {selectedCurrency.symbol}
              </span>
              <input
                type="number"
                step="0.01"
                required
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent border-none outline-none text-right font-mono text-xs sm:text-sm text-white p-0 tabular-nums font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-12 h-12 min-w-[48px] min-h-[48px] bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-[#0B0F19] rounded-2xl flex items-center justify-center hover:brightness-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)] shrink-0 cursor-pointer"
            title="Add item"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </form>
      </section>

      {/* 4. DISH ITEMS LIST WITH TACTILE ALLOCATION CHIPS */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-display font-bold text-sm text-white">{t.itemized.title}</h3>
          <span className="font-mono text-xs text-[#c4c7c8]">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
        </div>

        {items.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 text-center text-xs font-mono text-[#c4c7c8] border border-dashed border-white/15">
            {t.itemized.emptyItems}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const isSharedAll = item.assignedPersonIds.length === people.length || item.assignedPersonIds.length === 0;
              const assignedNames = people
                .filter(p => item.assignedPersonIds.includes(p.id))
                .map(p => p.name)
                .join(', ');

              return (
                <div
                  key={item.id}
                  className="glass-card rounded-3xl p-5 border border-white/[0.08] hover:border-white/20 transition-all space-y-3 group shadow-md"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-display font-bold text-base text-white">{item.name}</h4>
                      <p className="font-mono text-xs text-[#c4c7c8] mt-0.5">
                        {isSharedAll ? (
                          <span className="text-emerald-400 font-semibold">{t.itemized.sharedWithAll}</span>
                        ) : (
                          <span>{assignedNames || 'Unassigned'}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display font-black text-lg text-white tabular-nums">
                        {selectedCurrency.symbol}{item.price.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-[#c4c7c8]/40 hover:text-rose-400 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors rounded-xl active:scale-90"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="h-px w-full bg-white/[0.06]" />

                  {/* Interactive Tactile Guest Allocation Chips */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-[#c4c7c8]/70 uppercase font-semibold mr-1">
                        {t.itemized.assignedPeople}:
                      </span>
                      {people.map(person => {
                        const isAssigned = item.assignedPersonIds.includes(person.id);
                        return (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => handleTogglePersonOnItem(item.id, person.id)}
                            className={`min-h-[36px] px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
                              isAssigned
                                ? `${person.avatarColor} ring-1 ring-white/40 shadow-sm scale-105`
                                : 'bg-white/[0.04] text-[#c4c7c8]/40 border border-white/5 hover:text-white'
                            }`}
                            title={`Assign to ${person.name}`}
                          >
                            <span>{person.initials}</span>
                            <span className="text-[11px] font-normal">{person.name}</span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => {
                        const newIds = isSharedAll ? [people[0].id] : people.map(p => p.id);
                        setItems(items.map(i => i.id === item.id ? { ...i, assignedPersonIds: newIds } : i));
                      }}
                      className="text-xs font-mono text-emerald-400 hover:text-emerald-300 underline underline-offset-4"
                    >
                      {isSharedAll ? t.itemized.splitEqually : t.itemized.sharedWithAll}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. TAX & TIP CONFIGURATION BAR */}
      <section className="glass-panel rounded-3xl p-5 border border-white/[0.08] bg-white/[0.03] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <span className="font-mono text-[10px] text-[#c4c7c8] uppercase font-semibold block">{t.itemized.taxRate}</span>
            <select
              value={taxRatePercent}
              onChange={(e) => setTaxRatePercent(parseFloat(e.target.value))}
              className="bg-transparent text-xs font-mono font-bold text-white border-none outline-none cursor-pointer mt-0.5"
            >
              <option value="0" className="bg-[#0B0F19]">0%</option>
              <option value="5" className="bg-[#0B0F19]">5%</option>
              <option value="8.5" className="bg-[#0B0F19]">8.5% (US Avg)</option>
              <option value="10" className="bg-[#0B0F19]">10%</option>
              <option value="20" className="bg-[#0B0F19]">20% (VAT)</option>
            </select>
          </div>

          <div className="h-8 w-px bg-white/10" />

          <div>
            <span className="font-mono text-[10px] text-[#c4c7c8] uppercase font-semibold block">{t.itemized.tipRate}</span>
            <select
              value={tipPercent}
              onChange={(e) => setTipPercent(parseFloat(e.target.value))}
              className="bg-transparent text-xs font-mono font-bold text-emerald-400 border-none outline-none cursor-pointer mt-0.5"
            >
              <option value="0" className="bg-[#0B0F19]">0%</option>
              <option value="10" className="bg-[#0B0F19]">10%</option>
              <option value="15" className="bg-[#0B0F19]">15%</option>
              <option value="18" className="bg-[#0B0F19]">18%</option>
              <option value="20" className="bg-[#0B0F19]">20%</option>
              <option value="25" className="bg-[#0B0F19]">25%</option>
            </select>
          </div>
        </div>

        <div className="text-right">
          <span className="font-mono text-[10px] text-[#c4c7c8] uppercase font-semibold block">{t.itemized.grandTotal}</span>
          <span className="font-display font-black text-xl text-white tabular-nums">
            {selectedCurrency.symbol}{grandTotal.toFixed(2)}
          </span>
        </div>
      </section>

      {/* 6. PRIMARY CTA: CALCULATE SPLIT (56dp Thumb Zone Action) */}
      <button
        onClick={() => setShowSummaryModal(true)}
        className="w-full h-14 min-h-[56px] bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-[#0B0F19] font-display font-black text-base rounded-2xl flex items-center justify-center gap-2.5 hover:brightness-105 active:scale-[0.97] transition-all shadow-[0_0_30px_rgba(251,191,36,0.35)] cursor-pointer"
      >
        <span>{t.itemized.summaryTitle}</span>
        <ArrowRight className="w-5 h-5 stroke-[2.5]" />
      </button>

      {/* 7. FINAL SPLIT SUMMARY MODAL WITH P2P DEEP LINKS */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-lg glass-card rounded-3xl p-6 sm:p-7 border border-white/[0.16] shadow-2xl max-h-[90vh] overflow-y-auto space-y-5 animate-slide-up">
            
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest font-bold">{t.itemized.summaryTitle}</span>
                <h3 className="font-display font-black text-2xl text-white tracking-tight">{t.itemized.eachPersonPays}</h3>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-white transition-all"
                aria-label="Close summary modal"
              >
                ×
              </button>
            </div>

            {/* Individual Breakdown Cards */}
            <div className="space-y-3">
              {splitResults.map(res => {
                const person = people.find(p => p.id === res.userId);
                const isBday = person?.id === birthdayPersonId;
                const handleVal = p2pHandleInput[res.userId] || person?.name.toLowerCase() || 'friend';

                return (
                  <div
                    key={res.userId}
                    className={`glass-panel rounded-2xl p-4 border transition-all space-y-3 ${
                      isBday 
                        ? 'border-rose-400/50 bg-rose-500/10' 
                        : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black font-mono shadow-inner ${person?.avatarColor || 'bg-white/10 text-white'}`}>
                          {person?.initials || res.userName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-display font-bold text-base text-white">{res.userName}</h4>
                            {isBday && (
                              <span className="bg-rose-500/30 text-rose-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-rose-500/40 font-bold">
                                🎂 Birthday Person
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono text-[#c4c7c8]">
                            Food Subtotal: {selectedCurrency.symbol}{res.subtotal.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`font-display font-black text-2xl tabular-nums ${isBday ? 'text-rose-300' : 'text-emerald-400'}`}>
                          {selectedCurrency.symbol}{res.finalTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-[#c4c7c8]/80 flex justify-between pt-2 border-t border-white/5 flex-wrap gap-1">
                      <span>Tax: +{selectedCurrency.symbol}{res.proportionalTax.toFixed(2)}</span>
                      <span>Tip: +{selectedCurrency.symbol}{res.tipShare.toFixed(2)}</span>
                      {res.birthdaySubsidyAdded > 0 && (
                        <span className="text-rose-300 font-bold">Birthday Treat: +{selectedCurrency.symbol}{res.birthdaySubsidyAdded.toFixed(2)}</span>
                      )}
                    </div>

                    {/* Social P2P Deep Link Action Buttons */}
                    {!isBday && res.finalTotal > 0 && (
                      <div className="pt-2 border-t border-white/5 flex items-center gap-2 overflow-x-auto">
                        <span className="text-[10px] font-mono text-[#c4c7c8]/70 uppercase font-semibold mr-1">Pay:</span>
                        
                        {/* Venmo */}
                        <a
                          href={generatePaymentDeepLink({
                            platform: 'venmo',
                            recipientHandle: handleVal,
                            amount: res.finalTotal,
                            note: `Dinner at ${t.itemized.title}`,
                          })}
                          target="_blank"
                          rel="noreferrer"
                          className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#008CFF]/20 text-[#008CFF] hover:bg-[#008CFF]/30 border border-[#008CFF]/40 text-xs font-mono font-bold transition-all shrink-0 flex items-center gap-1 active:scale-95"
                        >
                          <span>Venmo</span>
                        </a>

                        {/* Cash App */}
                        <a
                          href={generatePaymentDeepLink({
                            platform: 'cashapp',
                            recipientHandle: handleVal,
                            amount: res.finalTotal,
                            note: `Dinner share`,
                          })}
                          target="_blank"
                          rel="noreferrer"
                          className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#00D632]/20 text-[#00D632] hover:bg-[#00D632]/30 border border-[#00D632]/40 text-xs font-mono font-bold transition-all shrink-0 flex items-center gap-1 active:scale-95"
                        >
                          <span>Cash App</span>
                        </a>

                        {/* Apple Pay / Cash */}
                        <a
                          href={generatePaymentDeepLink({
                            platform: 'applecash',
                            recipientHandle: handleVal,
                            amount: res.finalTotal,
                            note: `Dinner share`,
                          })}
                          className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white/10 text-white hover:bg-white/20 border border-white/20 text-xs font-mono font-bold transition-all shrink-0 flex items-center gap-1 active:scale-95"
                        >
                          <span>Apple Cash</span>
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 pt-2">
              <div className="flex gap-2.5">
                <button
                  onClick={handleSaveToHistory}
                  className={`flex-1 min-h-[48px] rounded-2xl font-display font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] ${
                    savedStatus
                      ? 'bg-emerald-500 text-[#0B0F19] shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                      : 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-[#0B0F19] hover:brightness-105 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                  }`}
                >
                  {savedStatus ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{t.common.savedSuccess}</span>
                    </>
                  ) : (
                    <>
                      <Receipt className="w-4 h-4" />
                      <span>{t.itemized.saveToHistory}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleShareSummary}
                  className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-2xl glass-button text-white flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all shrink-0"
                  title="Share breakdown"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowSummaryModal(false)}
                className="w-full py-2 text-center text-xs font-mono text-[#c4c7c8] hover:text-white transition-colors"
              >
                {t.common.close}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
