import React, { useState } from 'react';
import { 
  CurrencyRate, 
  CalculationHistoryItem, 
  UserProfile, 
  ScreenType 
} from '../types';
import { 
  Users, 
  Receipt, 
  Check, 
  Share2, 
  BookmarkCheck, 
  Plus, 
  Minus, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal,
  Shield,
  Coins,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { 
  formatCurrency, 
  formatDate, 
  formatTime, 
  parseLocalizedNumber 
} from '../utils/i18nFormatter';

interface MainCalculatorProps {
  selectedCurrency: CurrencyRate;
  user: UserProfile;
  onSaveHistory: (item: CalculationHistoryItem) => void;
  onNavigate: (screen: ScreenType) => void;
  onOpenPaywall: () => void;
  scannedData?: {
    billAmount: number;
    taxAmount: number;
    venueName: string;
  } | null;
}

/**
 * Calculates the nearest upward palindrome currency total (e.g. 73.37, 84.48, 122.21)
 * to prevent fraudulent post-signing receipt tampering on credit card slips.
 */
export function getNearestUpwardPalindrome(total: number): number {
  if (total <= 0) return 0;
  const cents = Math.ceil(Math.round(total * 100));
  
  for (let i = cents; i < cents + 2000; i++) {
    const s = i.toString();
    if (s === s.split('').reverse().join('')) {
      return i / 100;
    }
  }
  return total;
}

export const MainCalculator: React.FC<MainCalculatorProps> = ({
  selectedCurrency,
  user,
  onSaveHistory,
  scannedData,
}) => {
  const { language, t } = useLanguage();

  // Primary Input States (Reactive - updates synchronously as you type)
  const [billAmountStr, setBillAmountStr] = useState<string>(
    scannedData && scannedData.billAmount > 0 ? scannedData.billAmount.toFixed(2) : ''
  );
  const [tipPercent, setTipPercent] = useState<number>(user.defaultTip || 20);
  const [isCustomTip, setIsCustomTip] = useState<boolean>(false);
  const [customTipStr, setCustomTipStr] = useState<string>('20');

  // Progressive Disclosure: "Advanced Options" drawer (Tax, Pre/Post-tax, Split, Rounding Mode)
  // Permanently hidden by default for a pristine, uncluttered "Zen" layout
  const [showAdvanced, setShowAdvanced] = useState<boolean>(
    scannedData ? scannedData.taxAmount > 0 : false
  );
  const [taxAmountStr, setTaxAmountStr] = useState<string>(
    scannedData && scannedData.taxAmount > 0 ? scannedData.taxAmount.toFixed(2) : '0.00'
  );
  const [isPreTax, setIsPreTax] = useState<boolean>(user.preTaxTipping ?? true);
  const [splitCount, setSplitCount] = useState<number>(1);
  const [roundingMode, setRoundingMode] = useState<'none' | 'cash' | 'palindrome'>(
    user.roundTotal ? 'cash' : 'none'
  );

  // Aux & Bottom Thumb Zone Interaction States
  const [venueName, setVenueName] = useState<string>(scannedData?.venueName || '');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Sync state if scannedData updates dynamically from OCR
  React.useEffect(() => {
    if (scannedData) {
      if (scannedData.billAmount > 0) {
        setBillAmountStr(scannedData.billAmount.toFixed(2));
      }
      if (scannedData.taxAmount > 0) {
        setTaxAmountStr(scannedData.taxAmount.toFixed(2));
        setShowAdvanced(true);
      }
      if (scannedData.venueName) {
        setVenueName(scannedData.venueName);
      }
    }
  }, [scannedData]);

  const tipPresets = [15, 18, 20, 25];

  // Fluid Real-time Math Computations (Updates synchronously on every keystroke)
  const billAmount = parseLocalizedNumber(billAmountStr);
  const taxAmount = parseLocalizedNumber(taxAmountStr);
  const effectiveTipPercent = isCustomTip ? parseLocalizedNumber(customTipStr) : tipPercent;

  // Gratuity calculation (Pre-tax vs Post-tax tipping engine)
  const tipBase = isPreTax ? billAmount : (billAmount + taxAmount);
  const rawTipAmount = (tipBase * effectiveTipPercent) / 100;
  const rawTotalWithTax = billAmount + taxAmount;
  const rawGrandTotal = rawTotalWithTax + rawTipAmount;

  // Smart Rounding Execution (Cash Round Up vs Anti-Fraud Palindrome Rounding)
  let finalGrandTotal = rawGrandTotal;
  let finalTipAmount = rawTipAmount;

  if (rawGrandTotal > 0) {
    if (roundingMode === 'cash') {
      const rounded = Math.ceil(rawGrandTotal);
      const diff = rounded - rawGrandTotal;
      finalGrandTotal = rounded;
      finalTipAmount = rawTipAmount + diff;
    } else if (roundingMode === 'palindrome') {
      const palindromic = getNearestUpwardPalindrome(rawGrandTotal);
      const diff = palindromic - rawGrandTotal;
      finalGrandTotal = palindromic;
      finalTipAmount = rawTipAmount + diff;
    }
  }

  const totalPerPerson = splitCount > 0 ? (finalGrandTotal / splitCount) : finalGrandTotal;

  // Strict locale formatting matching active language state (zero OS fallback)
  const formattedPerPerson = formatCurrency(totalPerPerson, selectedCurrency.code, language);
  const formattedGrandTotal = formatCurrency(finalGrandTotal, selectedCurrency.code, language);
  const formattedTipAmount = formatCurrency(finalTipAmount, selectedCurrency.code, language);
  const formattedTaxAmount = formatCurrency(taxAmount, selectedCurrency.code, language);

  // Handle Preset Tip Selection
  const handleSelectPreset = (percent: number) => {
    setTipPercent(percent);
    setIsCustomTip(false);
  };

  // Quick Save calculation in bottom thumb zone
  const handleSaveCalculation = () => {
    if (billAmount <= 0) {
      alert(t.calculator.enterValidBill);
      return;
    }

    const historyItem: CalculationHistoryItem = {
      id: `hist_${Date.now()}`,
      venueName: venueName.trim() || t.calculator.defaultVenueName,
      date: formatDate(Date.now(), language),
      time: formatTime(Date.now(), language),
      mealType: 'Dinner',
      currency: selectedCurrency.code,
      billAmount: billAmount,
      taxAmount: taxAmount,
      tipPercent: effectiveTipPercent,
      tipAmount: finalTipAmount,
      totalBill: finalGrandTotal,
      splitCount: splitCount,
      totalPerPerson: totalPerPerson,
      isItemized: false,
    };

    onSaveHistory(historyItem);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleShare = async () => {
    const text = t.calculator.shareTextSummary(
      selectedCurrency.symbol,
      billAmount.toFixed(2),
      taxAmount.toFixed(2),
      effectiveTipPercent,
      finalTipAmount.toFixed(2),
      finalGrandTotal.toFixed(2),
      splitCount,
      totalPerPerson.toFixed(2)
    );

    if (navigator.share) {
      try {
        await navigator.share({ title: t.calculator.shareTitle, text });
      } catch {
        // User cancelled native share
      }
    } else {
      navigator.clipboard?.writeText(text);
      alert(t.common.shareCopiedAlert);
    }
  };

  const hasActiveAdvanced = taxAmount > 0 || splitCount > 1 || roundingMode !== 'none' || !isPreTax;

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-5 pb-8 animate-fade-in">
      
      {/* 1. ZEN FOCAL HERO: Massive Grand Total Output (Highest Contrast & Visual Hierarchy) */}
      <section 
        id="calculator-hero-display"
        className="glass-card rounded-3xl p-6 sm:p-7 flex flex-col gap-3 relative overflow-hidden border border-white/[0.12] bg-white/[0.035] shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-baseline justify-between z-10">
          <div className="flex flex-col">
            <span className="font-mono text-xs text-[#c4c7c8] uppercase tracking-wider font-semibold">
              {splitCount > 1 
                ? `${t.calculator.totalPerPerson} (${splitCount} ${t.calculator.people})` 
                : t.calculator.finalGrandTotal}
            </span>
            <div className="font-display font-black text-4xl sm:text-5xl text-white tracking-tight leading-none mt-2 tabular-nums">
              {splitCount > 1 ? formattedPerPerson : formattedGrandTotal}
            </div>
          </div>

          {/* Subdued Context when splitting bill */}
          {splitCount > 1 && (
            <div className="text-right flex flex-col items-end">
              <span className="font-mono text-[10px] text-[#c4c7c8]/70 uppercase tracking-wider font-semibold">
                {t.calculator.finalGrandTotal}
              </span>
              <span className="font-display font-extrabold text-xl text-emerald-300 tabular-nums">
                {formattedGrandTotal}
              </span>
            </div>
          )}
        </div>

        {/* Tip & Breakdown Bar */}
        <div className="flex items-center justify-between text-xs font-mono text-[#c4c7c8] pt-3 mt-1 border-t border-white/10 z-10 flex-wrap gap-2">
          <span>
            {t.calculator.tipAmount}: <strong className="text-emerald-400 font-black">+{formattedTipAmount}</strong> ({effectiveTipPercent}%)
          </span>
          {taxAmount > 0 && <span>Tax: {formattedTaxAmount}</span>}
          {roundingMode === 'cash' && (
            <span className="text-amber-300 font-bold bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/30 text-[10px]">
              {t.calculator.smartRound}
            </span>
          )}
          {roundingMode === 'palindrome' && (
            <span className="text-emerald-300 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30 text-[10px] flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>Palindrome Anti-Fraud</span>
            </span>
          )}
        </div>
      </section>

      {/* 2. ZEN COMPACT INPUT CARD (Bill Amount & Tip Segmented Control ONLY) */}
      <section className="glass-panel rounded-3xl p-5 flex flex-col gap-4 border border-white/[0.08] bg-white/[0.03] shadow-xl relative backdrop-blur-xl">
        
        {/* Bill Amount Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center px-1">
            <label htmlFor="bill-amount-input" className="font-mono text-xs text-[#c4c7c8] uppercase tracking-wider font-semibold">
              {t.calculator.billAmount}
            </label>
            <span className="font-mono text-xs text-emerald-400 font-bold tracking-wider">{selectedCurrency.code}</span>
          </div>

          <div className="relative flex items-center bg-white/5 rounded-2xl px-4 py-2 border border-white/10 focus-within:border-white/40 focus-within:bg-white/10 transition-all min-h-[56px]">
            <span className="text-2xl sm:text-3xl text-[#c4c7c8]/70 font-light select-none mr-2">
              {selectedCurrency.symbol}
            </span>
            <input
              id="bill-amount-input"
              type="text"
              inputMode="decimal"
              value={billAmountStr}
              onChange={(e) => setBillAmountStr(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent border-none outline-none font-display font-black text-3xl sm:text-4xl text-white text-right py-1 focus:ring-0 placeholder:text-white/20 tabular-nums min-h-[48px]"
            />
          </div>
        </div>

        {/* Tip Percentage: Single-Row Segmented Selector (48x48dp Touch Targets) */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <span className="font-mono text-xs text-[#c4c7c8] uppercase tracking-wider font-semibold">
              {t.calculator.tipPercentage}
            </span>
            <span className="font-mono text-xs font-bold text-emerald-300">
              {effectiveTipPercent}% ({formattedTipAmount})
            </span>
          </div>

          {/* 5-Segment Horizontal Row */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/5 border border-white/10 w-full overflow-hidden">
            {tipPresets.map((pct) => {
              const isSelected = !isCustomTip && tipPercent === pct;
              return (
                <button
                  key={pct}
                  id={`tip-preset-${pct}`}
                  type="button"
                  onClick={() => handleSelectPreset(pct)}
                  className={`flex-1 min-h-[48px] rounded-xl font-display text-sm font-bold transition-all duration-150 active:scale-95 flex items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_16px_rgba(16,185,129,0.25)] scale-[1.02]'
                      : 'text-[#dce1fb] hover:text-white hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {pct}%
                </button>
              );
            })}

            {/* Custom Tip Segment */}
            <button
              id="tip-preset-custom"
              type="button"
              onClick={() => setIsCustomTip(true)}
              className={`flex-1 min-h-[48px] rounded-xl font-display text-xs sm:text-sm font-bold transition-all duration-150 active:scale-95 flex items-center justify-center whitespace-nowrap cursor-pointer ${
                isCustomTip
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-[0_0_16px_rgba(251,191,36,0.25)] scale-[1.02]'
                  : 'text-[#c4c7c8] hover:text-white hover:bg-white/10 border border-transparent'
              }`}
            >
              {isCustomTip ? `${customTipStr}%` : t.calculator.customTip}
            </button>
          </div>

          {/* Inline Custom Tip Input (if active) */}
          {isCustomTip && (
            <div className="flex items-center gap-2 mt-1 px-1 animate-fade-in">
              <span className="text-xs font-mono text-[#c4c7c8]">{t.calculator.customTip}:</span>
              <div className="flex-1 flex items-center bg-white/5 rounded-xl px-3 py-1.5 border border-white/20 min-h-[48px]">
                <input
                  type="text"
                  inputMode="decimal"
                  value={customTipStr}
                  onChange={(e) => setCustomTipStr(e.target.value)}
                  className="bg-transparent border-none outline-none text-white text-sm font-mono w-full tabular-nums text-right font-bold"
                  placeholder="20"
                />
                <span className="text-xs font-mono text-[#c4c7c8] ml-1.5">%</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. PROGRESSIVE DISCLOSURE: "ADVANCED OPTIONS" DRAWER */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden transition-all mt-1">
          <button
            type="button"
            id="toggle-advanced-options-btn"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-2 text-xs font-mono text-[#c4c7c8] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 shrink-0">
              <SlidersHorizontal className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-white text-xs whitespace-nowrap">{t.calculator.advancedOptions}</span>
              {hasActiveAdvanced && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[#c4c7c8]/80 shrink-0">
              <span className="hidden sm:inline">{showAdvanced ? t.common.close : t.calculator.advancedOptionsDesc}</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {/* Collapsible Advanced Content */}
          {showAdvanced && (
            <div className="px-4 pb-4 pt-2 border-t border-white/5 flex flex-col gap-4 animate-fade-in">
              
              {/* Tax Amount Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-mono text-[#c4c7c8]">
                  <span>{t.calculator.taxAmount}</span>
                  {taxAmount > 0 && <span className="text-emerald-400 font-semibold">{formattedTaxAmount}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative flex items-center bg-white/5 rounded-xl px-3 py-1.5 border border-white/15 min-h-[48px]">
                    <span className="text-sm text-[#c4c7c8]/70 mr-1.5">{selectedCurrency.symbol}</span>
                    <input
                      id="tax-amount-input"
                      type="text"
                      inputMode="decimal"
                      value={taxAmountStr}
                      onChange={(e) => setTaxAmountStr(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent border-none outline-none font-mono text-sm text-white text-right tabular-nums py-1 font-bold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const autoTax = (billAmount * 0.08875).toFixed(2);
                      setTaxAmountStr(autoTax);
                    }}
                    className="min-h-[48px] px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    8.875%
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxAmountStr('0.00')}
                    className="min-h-[48px] px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#c4c7c8] text-xs font-mono transition-all active:scale-95 cursor-pointer"
                  >
                    0
                  </button>
                </div>
              </div>

              {/* Pre-Tax vs Post-Tax Tipping Segmented Selector */}
              <div className="flex flex-col gap-1.5 pt-1 border-t border-white/5">
                <div className="flex justify-between items-center text-xs font-mono text-[#c4c7c8]">
                  <span>{t.calculator.tipBasis}</span>
                  <span className="text-[11px] font-bold text-white">
                    {isPreTax ? t.calculator.preTax : t.calculator.postTax}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsPreTax(true)}
                    className={`min-h-[44px] rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                      isPreTax
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                        : 'text-[#c4c7c8] hover:text-white border border-transparent'
                    }`}
                  >
                    <span>{t.calculator.preTax}</span>
                    <span className="text-[10px] font-normal opacity-70">(Subtotal)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPreTax(false)}
                    className={`min-h-[44px] rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                      !isPreTax
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                        : 'text-[#c4c7c8] hover:text-white border border-transparent'
                    }`}
                  >
                    <span>{t.calculator.postTax}</span>
                    <span className="text-[10px] font-normal opacity-70">(+ Tax)</span>
                  </button>
                </div>
              </div>

              {/* Split Count & Smart Rounding in 8px Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                {/* Split Counter */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10 min-h-[48px]">
                  <div className="flex items-center gap-2.5 pl-1">
                    <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono text-[#c4c7c8] uppercase leading-none">{t.calculator.splitBetween}</span>
                      <span className="text-xs font-bold text-white font-mono mt-1">
                        {splitCount} {splitCount === 1 ? t.calculator.person : t.calculator.people}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSplitCount(Math.max(1, splitCount - 1))}
                      className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer"
                      aria-label="Decrease split count"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitCount(Math.min(20, splitCount + 1))}
                      className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer"
                      aria-label="Increase split count"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Smart Rounding Mode Selector (None / Cash Up / Palindrome) */}
                <div className="flex flex-col gap-1.5 p-2.5 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-mono text-[#c4c7c8] uppercase font-semibold">Rounding Mode</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">{roundingMode}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setRoundingMode('none')}
                      className={`min-h-[36px] rounded-lg text-[11px] font-mono font-bold transition-all flex items-center justify-center active:scale-95 cursor-pointer ${
                        roundingMode === 'none'
                          ? 'bg-white/15 text-white border border-white/30 shadow-sm'
                          : 'text-[#c4c7c8] hover:text-white border border-transparent'
                      }`}
                    >
                      Exact
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoundingMode('cash')}
                      className={`min-h-[36px] rounded-lg text-[11px] font-mono font-bold transition-all flex items-center justify-center active:scale-95 cursor-pointer ${
                        roundingMode === 'cash'
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm'
                          : 'text-[#c4c7c8] hover:text-white border border-transparent'
                      }`}
                      title={t.calculator.smartRoundDesc}
                    >
                      Cash ⌈$⌉
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoundingMode('palindrome')}
                      className={`min-h-[36px] rounded-lg text-[11px] font-mono font-bold transition-all flex items-center justify-center active:scale-95 cursor-pointer ${
                        roundingMode === 'palindrome'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm'
                          : 'text-[#c4c7c8] hover:text-white border border-transparent'
                      }`}
                      title="Anti-Fraud Palindromic Total (e.g. $73.37)"
                    >
                      Anti-Fraud
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </section>

      {/* 4. BOTTOM THUMB ZONE PRIMARY ACTIONS (56dp CTAs & 8px Grid) */}
      <div className="flex flex-col gap-3 pb-4">
        <div className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-3 border border-white/10 bg-white/5 min-h-[48px]">
          <Receipt className="w-4 h-4 text-[#c4c7c8] shrink-0" />
          <input
            type="text"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder={t.calculator.venuePlaceholder}
            className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-white/30 p-0"
          />
        </div>

        <div className="flex gap-2">
          <button
            id="btn-save-calculation"
            onClick={handleSaveCalculation}
            className={`flex-1 min-h-[56px] h-14 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg ${
              savedSuccess
                ? 'bg-emerald-500 text-[#05070E] shadow-[0_0_24px_rgba(16,185,129,0.4)]'
                : 'bg-[#F0C05A] hover:bg-[#E2B248] text-[#05070E] shadow-[0_4px_24px_rgba(240,192,90,0.18)]'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>{t.calculator.savedSuccess}</span>
              </>
            ) : (
              <>
                <BookmarkCheck className="w-5 h-5 stroke-[2.5]" />
                <span>{t.calculator.saveCalculation}</span>
              </>
            )}
          </button>

          <button
            id="btn-share-calculation"
            onClick={handleShare}
            className="min-w-[56px] min-h-[56px] w-14 h-14 rounded-2xl bg-white/[0.08] border border-white/[0.12] text-white flex items-center justify-center hover:bg-white/15 active:scale-95 transition-all shrink-0 cursor-pointer"
            title={t.calculator.shareBreakdown}
            aria-label={t.calculator.shareBreakdown}
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

    </div>
  );
};
