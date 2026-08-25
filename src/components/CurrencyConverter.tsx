import React, { useState } from 'react';
import { CurrencyRate } from '../types';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  RefreshCw,
  Coins,
  X
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { formatTime } from '../utils/i18nFormatter';

interface CurrencyConverterProps {
  currencies: CurrencyRate[];
  selectedCurrency: CurrencyRate;
  onSelectCurrency: (currency: CurrencyRate) => void;
}

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
  currencies,
  selectedCurrency,
  onSelectCurrency,
}) => {
  const { language, t } = useLanguage();
  const [baseAmountStr, setBaseAmountStr] = useState<string>('100.00');
  const [autoUpdate, setAutoUpdate] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Default pinned currencies to display
  const [pinnedCodes, setPinnedCodes] = useState<string[]>(['USD', 'EUR', 'GBP', 'JPY', 'UAH', 'CAD', 'CHF']);

  const baseAmount = parseFloat(baseAmountStr) || 0;

  const convertAmount = (targetRateToUSD: number) => {
    const inUSD = selectedCurrency.rateToUSD > 0 ? (baseAmount / selectedCurrency.rateToUSD) : baseAmount;
    return inUSD * targetRateToUSD;
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const displayedCurrencies = currencies.filter(c => 
    pinnedCodes.includes(c.code) && c.code !== selectedCurrency.code
  );

  const filteredForAdd = currencies.filter(c =>
    !pinnedCodes.includes(c.code) &&
    (c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     c.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddCurrency = (code: string) => {
    setPinnedCodes([...pinnedCodes, code]);
    setShowAddModal(false);
  };

  const handleRemoveCurrency = (code: string) => {
    setPinnedCodes(pinnedCodes.filter(c => c !== code));
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-5 pb-12 animate-fade-in">
      
      {/* 1. HEADER */}
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest block font-bold">
            FX RATES
          </span>
          <h2 className="font-display font-black text-2xl text-white tracking-tight">{t.converter.title}</h2>
        </div>

        {/* Live Rates Badge */}
        <div className="glass-panel px-3.5 py-1.5 rounded-full flex items-center gap-2 border border-white/[0.1] shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
          <span className="font-mono text-[11px] text-white font-semibold uppercase tracking-wider">{t.converter.liveRates}</span>
        </div>
      </div>

      {/* 2. BASE CONVERSION INPUT CARD */}
      <section className="glass-card rounded-3xl p-6 sm:p-7 flex flex-col gap-5 border border-white/[0.12] bg-white/[0.035] shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex justify-between items-center relative z-10">
          <span className="font-mono text-xs text-[#c4c7c8] uppercase tracking-widest font-semibold">
            {t.converter.enterAmount}
          </span>

          {/* Base Currency Dropdown Pill */}
          <div className="flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] px-3.5 py-1.5 rounded-2xl border border-white/15 transition-all">
            <span className="text-base">{selectedCurrency.flag}</span>
            <select
              value={selectedCurrency.code}
              onChange={(e) => {
                const found = currencies.find(c => c.code === e.target.value);
                if (found) onSelectCurrency(found);
              }}
              className="bg-transparent text-xs font-mono font-bold text-white border-none outline-none cursor-pointer"
            >
              {currencies.map(c => (
                <option key={c.code} value={c.code} className="bg-[#0B0F19] text-white">
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Input */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
          <span className="font-display font-light text-4xl sm:text-5xl text-[#c4c7c8]/60 select-none">
            {selectedCurrency.symbol}
          </span>
          <input
            type="number"
            step="0.01"
            value={baseAmountStr}
            onChange={(e) => setBaseAmountStr(e.target.value)}
            placeholder="0.00"
            className="w-full bg-transparent border-none outline-none font-display font-black text-4xl sm:text-5xl text-white text-right pl-4 pr-0 py-0 focus:ring-0 placeholder:text-white/15 tabular-nums"
          />
        </div>

        {/* Card Footer: Timestamp & Auto-update */}
        <div className="flex justify-between items-center text-xs text-[#c4c7c8] relative z-10">
          <div className="flex items-center gap-2 font-mono text-[11px] text-[#c4c7c8]/80">
            <button 
              onClick={handleRefresh} 
              className={`hover:text-white p-1 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg hover:bg-white/5 transition-all active:scale-90 ${isRefreshing ? 'animate-spin' : ''}`}
              title="Refresh"
              aria-label="Refresh rates"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <span>{t.converter.updatedJustNow}, {formatTime(Date.now(), language)}</span>
          </div>

          <button
            onClick={() => setAutoUpdate(!autoUpdate)}
            className="flex items-center gap-2 cursor-pointer font-mono text-xs text-white"
          >
            <span>Auto</span>
            <div className={`w-8 h-4.5 rounded-full transition-colors relative border border-white/20 ${autoUpdate ? 'bg-emerald-400' : 'bg-white/10'}`}>
              <div className={`w-3.5 h-3.5 rounded-full transition-transform absolute top-0.5 ${
                autoUpdate ? 'translate-x-4 bg-[#0B0F19]' : 'translate-x-0.5 bg-white/70'
              }`} />
            </div>
          </button>
        </div>
      </section>

      {/* 3. CONVERTED CURRENCY RATES LIST */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-400" />
            <span>Exchange Rates</span>
          </h3>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="min-h-[36px] px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/10 text-xs font-mono text-white flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Currency</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {displayedCurrencies.map((currency) => {
            const convertedVal = convertAmount(currency.rateToUSD);
            const isPositive = currency.change24h >= 0;

            return (
              <div
                key={currency.code}
                className="glass-card rounded-2xl p-4 border border-white/[0.08] hover:border-white/20 transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{currency.flag}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-bold text-sm text-white">{currency.code}</h4>
                      <span className="text-xs text-[#c4c7c8]/80 font-mono">({currency.symbol})</span>
                    </div>
                    <p className="text-[11px] text-[#c4c7c8]/60 font-mono">
                      {currency.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-display font-black text-lg text-white tabular-nums">
                      {currency.symbol}{convertedVal.toFixed(2)}
                    </div>
                    <div className={`flex items-center justify-end gap-1 text-[10px] font-mono font-bold ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{isPositive ? '+' : ''}{currency.change24h}%</span>
                    </div>
                  </div>

                  {displayedCurrencies.length > 2 && (
                    <button
                      onClick={() => handleRemoveCurrency(currency.code)}
                      className="text-[#c4c7c8]/30 hover:text-rose-400 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg transition-colors opacity-0 group-hover:opacity-100 active:scale-90"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add Currency Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 border border-white/[0.16] shadow-2xl space-y-4 animate-slide-up max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-display font-bold text-base text-white">Add Currency</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>

            <div className="glass-panel rounded-2xl px-3.5 py-2 flex items-center gap-2 border border-white/10 min-h-[48px]">
              <Search className="w-4 h-4 text-[#c4c7c8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search currency code or name..."
                className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-white/30"
                autoFocus
              />
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {filteredForAdd.map(currency => (
                <button
                  key={currency.code}
                  onClick={() => handleAddCurrency(currency.code)}
                  className="w-full p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.1] active:scale-[0.98] border border-white/5 flex items-center justify-between text-left transition-all min-h-[48px]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{currency.flag}</span>
                    <div>
                      <span className="font-display font-bold text-xs text-white block">{currency.code}</span>
                      <span className="font-mono text-[10px] text-[#c4c7c8]">{currency.name}</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-emerald-400 font-bold">{currency.symbol}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
