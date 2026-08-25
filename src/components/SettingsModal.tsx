import React, { useState } from 'react';
import { UserProfile, CurrencyRate } from '../types';
import { 
  X, 
  Settings, 
  Trash2, 
  ShieldCheck, 
  Check, 
  Sliders, 
  Globe, 
  Lock,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  currencies: CurrencyRate[];
  onDeleteAccount?: () => void;
  onClearAllData?: () => void;
  onOpenPaywall?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  currencies,
  onDeleteAccount,
  onClearAllData,
  onOpenPaywall,
}) => {
  const { language, setLanguage, t, availableLanguages } = useLanguage();
  const [defaultTip, setDefaultTip] = useState<number>(user.defaultTip || 20);
  const [defaultCurrency, setDefaultCurrency] = useState<string>(user.defaultCurrency || 'USD');
  const [roundTotal, setRoundTotal] = useState<boolean>(user.roundTotal || false);
  const [preTaxTipping, setPreTaxTipping] = useState<boolean>(user.preTaxTipping ?? true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(user.soundEnabled ?? true);
  const [hapticEnabled, setHapticEnabled] = useState<boolean>(user.hapticEnabled ?? true);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateUser({
      ...user,
      defaultTip,
      defaultCurrency,
      roundTotal,
      preTaxTipping,
      soundEnabled,
      hapticEnabled,
      language,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 500);
  };

  const handleConfirmDelete = () => {
    if (onDeleteAccount) {
      onDeleteAccount();
    } else if (onClearAllData) {
      onClearAllData();
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div 
        className="w-full max-w-lg glass-card rounded-3xl p-5 sm:p-7 border border-white/20 shadow-2xl relative space-y-6 my-auto max-h-[92vh] overflow-y-auto bg-[#0B0F19]/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest block font-bold">
                SYSTEM CONFIGURATION
              </span>
              <h3 className="font-display font-bold text-xl text-white">
                App Preferences
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-[#c4c7c8] hover:text-white transition-all active:scale-90"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SECTION 1: GENERAL PREFERENCES */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" />
            <h4 className="font-display font-semibold text-sm text-white">
              General Preferences
            </h4>
          </div>

          {/* Language Selector Segmented Group */}
          <div className="glass-panel rounded-2xl p-3.5 border border-white/10 space-y-2">
            <span className="text-xs font-mono text-[#c4c7c8] block">
              Display Language
            </span>
            <div className="grid grid-cols-3 gap-2">
              {availableLanguages.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={`min-h-[48px] py-2 px-2 rounded-xl flex flex-col items-center justify-center gap-0.5 border transition-all text-center active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-sm font-bold'
                        : 'bg-white/5 border-white/10 text-[#dce1fb] hover:bg-white/10'
                    }`}
                  >
                    <span className="text-sm">{lang.flag}</span>
                    <span className="text-xs font-semibold leading-tight">{lang.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Default Currency - Horizontal Segmented Scroll (NO DROPDOWNS) */}
          <div className="glass-panel rounded-2xl p-3.5 border border-white/10 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-[#c4c7c8]">
                Default Currency
              </span>
              <span className="font-mono text-xs font-bold text-emerald-300">
                {defaultCurrency}
              </span>
            </div>

            {/* Horizontal Segmented Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
              {currencies.map((curr) => {
                const isSelected = defaultCurrency === curr.code;
                return (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => setDefaultCurrency(curr.code)}
                    className={`min-h-[48px] min-w-[76px] px-3 py-2 rounded-xl border flex flex-col items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold border-emerald-400/40 shadow-sm'
                        : 'bg-white/5 border-white/10 text-[#c4c7c8] hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="text-base leading-none">{curr.flag}</span>
                    <span className="text-xs font-mono font-bold mt-1">{curr.code}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 2: CALCULATION PREFERENCES */}
        <div className="space-y-4 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h4 className="font-display font-semibold text-sm text-white">
              Calculation Logic Defaults
            </h4>
          </div>

          {/* Default Tip % Segmented Control */}
          <div className="glass-panel rounded-2xl p-3.5 space-y-2 border border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-[#c4c7c8]">
                Default Tip Rate
              </span>
              <span className="font-display font-bold text-sm text-white">
                {defaultTip}%
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[15, 18, 20, 25].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDefaultTip(pct)}
                  className={`min-h-[48px] rounded-xl text-xs font-mono font-bold transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                    defaultTip === pct
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm font-bold'
                      : 'bg-white/5 text-[#c4c7c8] border border-white/10 hover:text-white'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Pre-Tax vs Post-Tax Tipping Segmented Control */}
          <div className="glass-panel rounded-2xl p-3.5 border border-white/10 space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-mono text-white block font-semibold">
                  Gratuity Calculation Base
                </span>
                <span className="text-[10px] font-mono text-[#c4c7c8]">
                  Standard etiquette applies tip to food/drink subtotal before taxes
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setPreTaxTipping(true)}
                className={`min-h-[48px] rounded-xl text-xs font-mono font-bold border transition-all flex flex-col items-center justify-center cursor-pointer ${
                  preTaxTipping
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-sm'
                    : 'bg-white/5 border-white/10 text-[#c4c7c8] hover:text-white'
                }`}
              >
                <span>Pre-Tax Tipping</span>
                <span className="text-[9px] font-normal opacity-80">(Recommended)</span>
              </button>

              <button
                type="button"
                onClick={() => setPreTaxTipping(false)}
                className={`min-h-[48px] rounded-xl text-xs font-mono font-bold border transition-all flex flex-col items-center justify-center cursor-pointer ${
                  !preTaxTipping
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-sm'
                    : 'bg-white/5 border-white/10 text-[#c4c7c8] hover:text-white'
                }`}
              >
                <span>Post-Tax Tipping</span>
                <span className="text-[9px] font-normal opacity-80">(Grand Total)</span>
              </button>
            </div>
          </div>

          {/* Smart Rounding Default Toggle */}
          <div className="glass-panel rounded-2xl p-3.5 flex justify-between items-center border border-white/10 min-h-[52px]">
            <div>
              <span className="text-xs font-mono text-white block font-semibold">
                Smart Cash Rounding
              </span>
              <span className="text-[10px] font-mono text-[#c4c7c8]">
                Round final split amounts to the nearest whole dollar
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRoundTotal(!roundTotal)}
              aria-label="Toggle smart cash rounding"
              className={`w-14 h-8 min-w-[56px] min-h-[32px] rounded-full transition-colors relative border border-white/20 shrink-0 ${
                roundTotal ? 'bg-emerald-400' : 'bg-white/10'
              }`}
            >
              <div className={`w-6 h-6 rounded-full transition-transform absolute top-0.5 ${
                roundTotal ? 'translate-x-7 bg-[#0B0F19]' : 'translate-x-1 bg-white/70'
              }`} />
            </button>
          </div>
        </div>

        {/* SECTION 3: SYSTEM FEEDBACK & PRIVACY */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" />
            <h4 className="font-display font-semibold text-sm text-white">
              Privacy & Local Storage
            </h4>
          </div>

          {/* Encryption Badge */}
          <div className="glass-panel rounded-2xl p-3.5 flex items-center gap-3 border border-emerald-500/30 bg-emerald-500/5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs font-mono">
              <span className="text-white font-bold block">100% On-Device Processing</span>
              <span className="text-[#c4c7c8]/80 text-[11px]">All calculation history and scanned receipts stay encrypted on your device.</span>
            </div>
          </div>

          {/* Danger Zone: Account & Data Deletion */}
          <div className="glass-panel rounded-2xl p-4 border border-rose-500/20 bg-rose-500/5 space-y-3 mt-4">
            <div>
              <span className="text-xs font-mono text-rose-300 block font-semibold">Danger Zone</span>
              <span className="text-[10px] font-mono text-[#c4c7c8]/80 leading-snug block mt-1">
                Permanently delete your account, saved receipts, and financial history. This action cannot be undone.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full min-h-[48px] rounded-xl border border-rose-500/30 text-rose-400 font-display font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-500/10 active:scale-95 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Account & Data</span>
            </button>
          </div>
        </div>

        {/* Save and Apply CTA (Primary Thumb Zone) */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSave}
            className="w-full min-h-[52px] bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-[#0B0F19] font-display font-black text-sm rounded-2xl flex items-center justify-center gap-2 hover:brightness-105 active:scale-98 transition-all shadow-[0_0_20px_rgba(251,191,36,0.3)] cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check className="w-5 h-5 stroke-[2.5]" />
                <span>Preferences Saved!</span>
              </>
            ) : (
              <span>Save & Apply Settings</span>
            )}
          </button>
        </div>

        {/* Version Footer */}
        <div className="text-center text-[10px] font-mono text-[#c4c7c8]/50 pt-1">
          Tip Calculator Plus+ • 2026 Titanium v2.4 • WCAG AA Compliant
        </div>

        {/* Overlapping Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-5 bg-[#0B0F19]/90 backdrop-blur-lg rounded-3xl animate-fade-in">
            <div className="w-full glass-card border border-rose-500/30 bg-[#0B0F19] p-6 rounded-2xl shadow-2xl text-center flex flex-col gap-4">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(244,63,94,0.15)]">
                <span className="text-2xl">⚠️</span>
              </div>
              
              <div>
                <h4 className="text-white font-display font-bold text-lg tracking-tight">Delete Everything?</h4>
                <p className="text-[11px] font-mono text-[#c4c7c8] mt-2 leading-relaxed">
                  Are you absolutely sure? All your P2P splits, saved receipts, and custom preferences will be erased from our servers immediately.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 min-h-[48px] rounded-xl bg-white/10 text-white font-mono font-semibold text-xs active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 min-h-[48px] rounded-xl bg-rose-500 text-white font-display font-bold text-xs shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:brightness-110 active:scale-95 transition-all"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

