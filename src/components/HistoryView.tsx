import React, { useState } from 'react';
import { CalculationHistoryItem, CurrencyRate } from '../types';
import { 
  Search, 
  Trash2, 
  Users, 
  User, 
  Receipt, 
  Download, 
  X,
  Share2,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface HistoryViewProps {
  history: CalculationHistoryItem[];
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
  currencies: CurrencyRate[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onClearHistory,
  onDeleteItem,
  currencies,
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<CalculationHistoryItem | null>(null);

  const filteredHistory = history.filter(item => 
    item.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.currency.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.mealType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCurrencySymbol = (code: string) => {
    const found = currencies.find(c => c.code === code);
    return found ? found.symbol : '$';
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tip_calculator_history_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-5 pb-12 animate-fade-in">
      
      {/* 1. SEARCH & ACTION BAR */}
      <div className="flex items-center gap-2.5">
        <div className="flex-1 glass-panel rounded-2xl px-4 py-2.5 flex items-center gap-3 border border-white/[0.1] focus-within:border-white/30 transition-all min-h-[48px]">
          <Search className="w-4 h-4 text-[#c4c7c8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.history.searchPlaceholder}
            className="bg-transparent border-none outline-none text-xs sm:text-sm text-white w-full placeholder:text-white/30 p-0"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="text-[#c4c7c8] hover:text-white p-1 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {history.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleExportJSON}
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/[0.12] text-white flex items-center justify-center transition-all shadow-md"
              title={t.history.exportJson}
              aria-label={t.history.exportJson}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (confirm(t.common.confirmDelete)) onClearHistory();
              }}
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 border border-rose-500/30 text-rose-300 flex items-center justify-center transition-all shadow-md"
              title={t.history.clearHistory}
              aria-label={t.history.clearHistory}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 2. SECTION HEADER */}
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="font-display font-black text-2xl text-white tracking-tight">{t.history.title}</h2>
          <p className="text-xs font-mono text-[#c4c7c8] mt-0.5">{t.history.subtitle}</p>
        </div>
        <span className="font-mono text-xs text-emerald-400 uppercase tracking-wider font-bold">
          {filteredHistory.length} {t.history.totalSavedRecords}
        </span>
      </div>

      {/* 3. HISTORY ITEMS LIST */}
      {filteredHistory.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center space-y-3 border border-dashed border-white/15">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto text-[#c4c7c8]">
            <Receipt className="w-7 h-7" />
          </div>
          <h4 className="font-display font-extrabold text-base text-white">{t.history.noHistoryTitle}</h4>
          <p className="text-xs font-mono text-[#c4c7c8] max-w-xs mx-auto">
            {t.history.noHistoryDesc}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => {
            const sym = getCurrencySymbol(item.currency);
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="glass-card rounded-3xl p-5 flex flex-col gap-3.5 border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.045] transition-all cursor-pointer group active:scale-[0.98] relative overflow-hidden shadow-lg"
              >
                {/* Top Row: Currency Badge, Venue, Date & Group Size */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/[0.08] border border-white/[0.16] flex items-center justify-center font-mono text-xs font-black text-white shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                      {item.currency}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-white group-hover:text-emerald-300 transition-colors">
                        {item.venueName}
                      </h3>
                      <div className="flex items-center gap-2 text-xs font-mono text-[#c4c7c8] mt-0.5">
                        <span>{item.date}</span>
                        <span>•</span>
                        <span>{item.time}</span>
                        <span>•</span>
                        <span className="text-sky-300 font-semibold">{item.mealType}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.1] font-mono text-xs text-[#c4c7c8]">
                    {item.splitCount > 1 ? (
                      <>
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-bold text-white">{item.splitCount}</span>
                      </>
                    ) : (
                      <>
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-bold text-white">1</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="h-px w-full bg-white/[0.06]" />

                {/* Bottom Row: Financial Breakdown */}
                <div className="flex justify-between items-end">
                  <div>
                    <span className="font-mono text-[10px] text-[#c4c7c8]/80 uppercase tracking-wider block font-semibold">
                      {t.history.billTotal}
                    </span>
                    <span className="font-display font-bold text-lg text-white">
                      {sym}{item.billAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5 mb-1">
                      <span className="bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono text-[10px] text-emerald-300 font-bold">
                        {item.tipPercent}% {t.history.tipPaid} (+{sym}{item.tipAmount.toFixed(2)})
                      </span>
                    </div>
                    <div className="font-display font-black text-2xl text-white">
                      {sym}{item.totalBill.toFixed(2)}
                    </div>
                    {item.splitCount > 1 && (
                      <span className="text-xs font-mono text-emerald-400 block font-semibold">
                        {sym}{item.totalPerPerson.toFixed(2)} {t.history.perPerson}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. ITEM DETAIL MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-7 border border-white/[0.16] shadow-2xl space-y-5 animate-slide-up">
            
            <div className="flex justify-between items-start border-b border-white/10 pb-4">
              <div>
                <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest block font-bold">
                  {t.history.title}
                </span>
                <h3 className="font-display font-extrabold text-2xl text-white">{selectedItem.venueName}</h3>
                <span className="text-xs font-mono text-[#c4c7c8]">
                  {selectedItem.date} • {selectedItem.time}
                </span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-white transition-all"
                aria-label="Close detail modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Financial Details */}
            <div className="glass-panel rounded-2xl p-4 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between text-[#c4c7c8]">
                <span>{t.history.billTotal}:</span>
                <span className="text-white font-bold">
                  {getCurrencySymbol(selectedItem.currency)}{selectedItem.billAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#c4c7c8]">
                <span>{t.calculator.taxAmount}:</span>
                <span className="text-white font-bold">
                  {getCurrencySymbol(selectedItem.currency)}{selectedItem.taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#c4c7c8]">
                <span>{t.history.tipPaid} ({selectedItem.tipPercent}%):</span>
                <span className="text-emerald-300 font-bold">
                  +{getCurrencySymbol(selectedItem.currency)}{selectedItem.tipAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-base text-white pt-2.5 border-t border-white/10">
                <span>{t.calculator.finalGrandTotal}:</span>
                <span className="text-emerald-400 font-black">
                  {getCurrencySymbol(selectedItem.currency)}{selectedItem.totalBill.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sky-300 pt-1">
                <span>{t.history.perPerson} ({selectedItem.splitCount} {t.history.splitCount}):</span>
                <span className="font-bold">
                  {getCurrencySymbol(selectedItem.currency)}{selectedItem.totalPerPerson.toFixed(2)}
                </span>
              </div>
            </div>

            {/* If Itemized */}
            {selectedItem.itemizedData && (
              <div className="space-y-2">
                <span className="font-mono text-[10px] text-[#c4c7c8] uppercase block font-semibold">
                  {t.itemized.title} ({selectedItem.itemizedData.items.length})
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {selectedItem.itemizedData.items.map(dish => (
                    <div key={dish.id} className="flex justify-between text-xs font-mono p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-white">{dish.name}</span>
                      <span className="text-emerald-400 font-bold">{getCurrencySymbol(selectedItem.currency)}{dish.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => {
                  onDeleteItem(selectedItem.id);
                  setSelectedItem(null);
                }}
                className="min-h-[48px] px-5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold transition-all"
              >
                {t.common.delete}
              </button>

              <button
                onClick={() => {
                  const text = `${selectedItem.venueName} — Total: ${getCurrencySymbol(selectedItem.currency)}${selectedItem.totalBill.toFixed(2)} (${getCurrencySymbol(selectedItem.currency)}${selectedItem.totalPerPerson.toFixed(2)}/person)`;
                  navigator.clipboard?.writeText(text);
                  alert(t.common.copied);
                }}
                className="flex-1 min-h-[48px] rounded-2xl bg-white text-[#0c1324] font-display font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.97] transition-all shadow-lg"
              >
                <Share2 className="w-4 h-4" />
                <span>{t.common.copy}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
