import React, { useState } from 'react';
import { 
  X, 
  Crown, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Coins, 
  ScanLine, 
  Split,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  onUpgradeSuccess,
}) => {
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<'lifetime' | 'annual' | 'monthly'>('lifetime');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successCelebration, setSuccessCelebration] = useState<boolean>(false);

  if (!isOpen) return null;

  const handlePurchase = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setSuccessCelebration(true);
      setTimeout(() => {
        setSuccessCelebration(false);
        onUpgradeSuccess();
        onClose();
      }, 1400);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div 
        className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-7 border border-white/[0.14] shadow-[0_20px_60px_rgba(0,0,0,0.9)] relative overflow-hidden my-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Radial Golden Blur Behind Hero */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Minimalist Translucent Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-[#c4c7c8] hover:text-white transition-all z-20"
          aria-label={t.common.close}
        >
          <X className="w-4 h-4" />
        </button>

        {successCelebration ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 flex items-center justify-center text-[#0c1324] shadow-[0_0_40px_rgba(251,191,36,0.7)] animate-bounce">
              <Crown className="w-10 h-10 fill-[#0c1324]" />
            </div>
            <h3 className="font-display font-extrabold text-2xl text-white">{t.paywall.badge}</h3>
            <p className="font-mono text-xs text-emerald-400 max-w-xs">
              {t.paywall.lifetimeSub}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            
            {/* 1. HERO HEADER: 3D-styled Gold/Onyx Badge & Typography */}
            <div className="text-center space-y-2.5 pt-1">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 border border-amber-200/60 flex items-center justify-center shadow-[0_0_35px_rgba(251,191,36,0.45)] transform hover:scale-105 transition-transform duration-300">
                  <Crown className="w-9 h-9 text-[#0c1324] fill-[#0c1324]" />
                </div>
                <span className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-[#0c1324] border border-amber-400/50 text-[10px] font-mono font-black text-amber-300 tracking-wider uppercase shadow-md">
                  PRO
                </span>
              </div>

              <div className="pt-1">
                <h2 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight leading-tight">
                  {t.paywall.title}
                </h2>
                <p className="text-xs font-mono text-[#c4c7c8] max-w-xs mx-auto leading-relaxed mt-1">
                  {t.paywall.subtitle}
                </p>
              </div>
            </div>

            {/* 2. FEATURE MATRIX: Glass Pills with Emerald/Gold Icons */}
            <div className="grid grid-cols-1 gap-2 rounded-2xl bg-white/[0.02] p-3 border border-white/[0.08] text-xs">
              <div className="flex items-center gap-3 p-1.5 rounded-xl bg-white/[0.02]">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <ScanLine className="w-4 h-4" />
                </div>
                <span className="text-white/90 font-medium leading-snug">{t.paywall.benefit1}</span>
              </div>

              <div className="flex items-center gap-3 p-1.5 rounded-xl bg-white/[0.02]">
                <div className="w-7 h-7 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 flex items-center justify-center shrink-0">
                  <Split className="w-4 h-4" />
                </div>
                <span className="text-white/90 font-medium leading-snug">{t.paywall.benefit2}</span>
              </div>

              <div className="flex items-center gap-3 p-1.5 rounded-xl bg-white/[0.02]">
                <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0">
                  <Coins className="w-4 h-4" />
                </div>
                <span className="text-white/90 font-medium leading-snug">{t.paywall.benefit3}</span>
              </div>

              <div className="flex items-center gap-3 p-1.5 rounded-xl bg-white/[0.02]">
                <div className="w-7 h-7 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <span className="text-white/90 font-medium leading-snug">{t.paywall.benefit5}</span>
              </div>
            </div>

            {/* 3. SUBSCRIPTION CARDS COMPARISON */}
            <div className="flex flex-col gap-2.5">
              
              {/* Lifetime Pro Card (Most Popular / Best Value) */}
              <button
                type="button"
                id="plan-lifetime-option"
                onClick={() => setSelectedPlan('lifetime')}
                className={`w-full min-h-[64px] p-4 rounded-2xl border transition-all duration-200 text-left flex items-center justify-between relative overflow-hidden active:scale-[0.98] ${
                  selectedPlan === 'lifetime'
                    ? 'border-amber-400/80 bg-gradient-to-r from-amber-500/15 via-white/[0.04] to-transparent shadow-[0_0_24px_rgba(251,191,36,0.2)] ring-1 ring-amber-400/60'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                }`}
              >
                {/* Best Value Ribbon Badge */}
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-400 to-yellow-400 text-[#0c1324] text-[9px] font-mono font-black uppercase px-2.5 py-0.5 rounded-bl-xl shadow-md">
                  BEST VALUE • FOREVER
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    selectedPlan === 'lifetime' 
                      ? 'border-amber-400 bg-amber-400 text-[#0c1324]' 
                      : 'border-white/30 bg-transparent'
                  }`}>
                    {selectedPlan === 'lifetime' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-extrabold text-sm text-white">{t.paywall.lifetimePlan}</span>
                      <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase">
                        ONE-TIME
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-[#c4c7c8] block mt-0.5">{t.paywall.lifetimeSub}</span>
                  </div>
                </div>

                <div className="text-right pt-2">
                  <span className="font-display font-black text-xl text-amber-300">{t.paywall.lifetimePrice}</span>
                  <span className="text-[10px] font-mono text-emerald-400 block font-semibold">Instant ROI</span>
                </div>
              </button>

              {/* Annual Plan Card */}
              <button
                type="button"
                id="plan-annual-option"
                onClick={() => setSelectedPlan('annual')}
                className={`w-full min-h-[56px] p-3.5 rounded-2xl border transition-all duration-200 text-left flex items-center justify-between active:scale-[0.98] ${
                  selectedPlan === 'annual'
                    ? 'border-white/80 bg-white/10 shadow-lg ring-1 ring-white/40'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    selectedPlan === 'annual' 
                      ? 'border-white bg-white text-black' 
                      : 'border-white/30 bg-transparent'
                  }`}>
                    {selectedPlan === 'annual' && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>

                  <div>
                    <span className="font-display font-bold text-xs sm:text-sm text-white">{t.paywall.annualPlan}</span>
                    <span className="font-mono text-[10px] text-[#c4c7c8] block">{t.paywall.annualSub}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-display font-extrabold text-sm text-white">{t.paywall.annualPrice}</span>
                  <span className="text-[10px] font-mono text-[#c4c7c8] block">$0.41/mo</span>
                </div>
              </button>

            </div>

            {/* 4. PRIMARY 56dp CHAMPAGNE GOLD ACTION CTA */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                id="btn-confirm-purchase"
                disabled={isProcessing}
                onClick={handlePurchase}
                className="w-full h-14 min-h-[56px] bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-[#0c1324] font-display font-black text-base rounded-2xl flex items-center justify-center gap-2.5 shadow-[0_0_35px_rgba(251,191,36,0.4)] hover:brightness-105 active:scale-[0.97] transition-all duration-150 relative overflow-hidden cursor-pointer"
              >
                {/* Shimmer sweep */}
                <div className="absolute inset-0 animate-shimmer pointer-events-none" />

                {isProcessing ? (
                  <span className="font-mono text-sm">{t.common.loading}</span>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-[#0c1324]" />
                    <span>{t.paywall.unlockBtn}</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </>
                )}
              </button>

              <div className="flex justify-between items-center text-[11px] font-mono text-[#c4c7c8]/70 px-2 pt-1">
                <button 
                  onClick={() => alert(t.paywall.restorePurchases)}
                  className="hover:text-white transition-colors underline"
                >
                  {t.paywall.restorePurchases}
                </button>
                <span>•</span>
                <button 
                  onClick={() => alert('Terms of Service: Lifetime one-time payment or annual auto-renew subscription.')}
                  className="hover:text-white transition-colors underline"
                >
                  Terms
                </button>
                <span>•</span>
                <button 
                  onClick={() => alert(t.paywall.guaranteeText)}
                  className="hover:text-white transition-colors underline"
                >
                  30-Day Guarantee
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
