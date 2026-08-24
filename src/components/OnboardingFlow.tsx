import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ScanLine, 
  Split, 
  Coins, 
  ArrowRight, 
  Check, 
  Lock, 
  Star, 
  Receipt,
  Sparkles,
  Zap
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface OnboardingFlowProps {
  onComplete: () => void;
  onOpenPaywall: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  onOpenPaywall,
}) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState<number>(0);

  const steps = [
    // Step 0: Master Your Dining Math
    {
      id: 'master',
      title: t.onboarding.slide1Title || 'Master Your\nDining Math.',
      subtitle: t.onboarding.slide1Desc || 'Professional tools for effortless splitting and tipping.',
      type: 'hero',
    },
    // Step 1: Intelligent Tools
    {
      id: 'tools',
      title: t.onboarding.slide2Title || 'Intelligent Tools.',
      subtitle: t.onboarding.slide2Desc || 'Elevate your financial precision with pro-level capabilities designed for seamless accuracy.',
      type: 'features',
    },
    // Step 2: Privacy First
    {
      id: 'privacy',
      title: t.onboarding.slide3Title || 'Your Data is Yours.',
      subtitle: t.onboarding.slide3Desc || 'All processing happens locally on your device. We never store or share your financial data.',
      type: 'privacy',
    },
    // Step 3: Unlock Pro / Paywall intro
    {
      id: 'unlock',
      title: t.onboarding.slide4Title || 'Unlock Pro',
      subtitle: t.onboarding.slide4Desc || 'Experience the ultimate precision in bill splitting and dining intelligence.',
      type: 'unlock',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0c1324] text-[#dce1fb] flex flex-col justify-between overflow-y-auto px-4 py-6 sm:p-8">
      {/* Top Header / Skip Button */}
      <div className="w-full max-w-md mx-auto flex justify-between items-center z-10 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-white" />
          </div>
          <span className="font-mono text-xs text-[#c4c7c8] tracking-wider uppercase">Tip Calculator Plus+</span>
        </div>

        {currentStep < steps.length - 1 ? (
          <button
            id="onboarding-skip-btn"
            onClick={onComplete}
            className="text-xs font-mono uppercase tracking-widest text-[#c4c7c8] hover:text-white transition-colors px-2 py-1"
          >
            {t.onboarding.skip}
          </button>
        ) : (
          <div className="w-8"></div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="w-full max-w-md mx-auto my-auto py-6 flex flex-col items-center justify-center relative z-10">
        {/* Step 0: Hero 3D Card */}
        {currentStep === 0 && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <div className="relative w-full aspect-square max-w-[280px] sm:max-w-[320px] mb-6 rounded-3xl glass-card flex items-center justify-center p-6 overflow-hidden border border-white/15 shadow-2xl">
              {/* Subtle light hit */}
              <div className="absolute -top-16 -right-16 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/40 pointer-events-none"></div>

              {/* 3D Stack Graphic */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-28 h-36 rounded-xl bg-gradient-to-b from-white/20 to-white/5 border border-white/30 backdrop-blur-md p-3 flex flex-col justify-between shadow-2xl transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                  <div className="flex justify-between items-center border-b border-white/20 pb-1.5">
                    <span className="font-mono text-[9px] text-white/80">RECEIPT #4092</span>
                    <Sparkles className="w-3 h-3 text-amber-300" />
                  </div>
                  <div className="space-y-1 my-2">
                    <div className="h-1.5 w-16 bg-white/30 rounded"></div>
                    <div className="h-1.5 w-20 bg-white/20 rounded"></div>
                    <div className="h-1.5 w-12 bg-white/30 rounded"></div>
                  </div>
                  <div className="border-t border-white/20 pt-1.5 flex justify-between items-center">
                    <span className="font-mono text-[10px] text-[#c4c7c8]">TOTAL</span>
                    <span className="font-display font-bold text-xs text-white">$142.50</span>
                  </div>
                </div>

                {/* Metallic coins floating */}
                <div className="flex gap-2 -mt-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-400 to-slate-100 border border-white/40 shadow-lg flex items-center justify-center text-[10px] font-bold text-slate-900">
                    $
                  </div>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-amber-100 border border-amber-200 shadow-lg flex items-center justify-center text-[11px] font-bold text-amber-950">
                    %
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-sky-100 border border-white/40 shadow-lg flex items-center justify-center text-[10px] font-bold text-sky-950">
                    €
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center w-full space-y-3">
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight leading-tight whitespace-pre-line">
                {t.onboarding.slide1Title}
              </h2>
              <p className="font-body text-sm sm:text-base text-[#c4c7c8] max-w-[300px] mx-auto leading-relaxed">
                {t.onboarding.slide1Desc}
              </p>
            </div>
          </div>
        )}

        {/* Step 1: Intelligent Tools */}
        {currentStep === 1 && (
          <div className="w-full space-y-5 animate-fade-in">
            <div className="text-center mb-6">
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight mb-2">
                {t.onboarding.slide2Title}
              </h2>
              <p className="font-body text-xs sm:text-sm text-[#c4c7c8] max-w-xs mx-auto">
                {t.onboarding.slide2Desc}
              </p>
            </div>

            <div className="space-y-3">
              {/* Feature 1: OCR Receipt Scanner */}
              <div className="glass-card rounded-2xl p-4 flex items-start gap-3.5 border border-white/10 hover:border-white/20 transition-all">
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center text-white shrink-0 shadow-inner">
                  <ScanLine className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-sm text-white">OCR Receipt Scanner</h3>
                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[9px] font-mono px-2 py-0.5 rounded-full">
                      <Lock className="w-2.5 h-2.5" /> On-Device
                    </span>
                  </div>
                  <p className="text-xs text-[#c4c7c8] mt-1 leading-relaxed">
                    Instantly digitize and parse paper receipts with high-speed on-device machine vision.
                  </p>
                </div>
              </div>

              {/* Feature 2: Itemized Split */}
              <div className="glass-card rounded-2xl p-4 flex items-start gap-3.5 border border-white/10 hover:border-white/20 transition-all">
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center text-white shrink-0 shadow-inner">
                  <Split className="w-5 h-5 text-sky-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-sm text-white">Itemized Split</h3>
                    <span className="inline-flex items-center gap-1 bg-sky-500/10 text-sky-300 border border-sky-500/20 text-[9px] font-mono px-2 py-0.5 rounded-full">
                      Fair Splitting
                    </span>
                  </div>
                  <p className="text-xs text-[#c4c7c8] mt-1 leading-relaxed">
                    Assign specific dishes to individuals for perfectly fair bill sharing with proportional tax & tip.
                  </p>
                </div>
              </div>

              {/* Feature 3: Multi-Currency Converter */}
              <div className="glass-card rounded-2xl p-4 flex items-start gap-3.5 border border-white/10 hover:border-white/20 transition-all">
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/15 flex items-center justify-center text-white shrink-0 shadow-inner">
                  <Coins className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-sm text-white">Multi-Currency Converter</h3>
                    <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] font-mono px-2 py-0.5 rounded-full">
                      160+ Live
                    </span>
                  </div>
                  <p className="text-xs text-[#c4c7c8] mt-1 leading-relaxed">
                    Calculate tips and totals across international borders with real-time conversion rates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Privacy First */}
        {currentStep === 2 && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
              {/* Background Glow */}
              <div className="absolute inset-0 rounded-full shield-glow bg-white/5 animate-pulse"></div>
              {/* Glass Container for Icon */}
              <div className="relative w-28 h-28 rounded-full glass-card border border-white/20 flex items-center justify-center shadow-2xl">
                <ShieldCheck className="w-14 h-14 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
              </div>
              {/* Floating particles */}
              <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-white/60 animate-ping"></div>
              <div className="absolute bottom-4 right-2 w-2.5 h-2.5 rounded-full bg-secondary animate-bounce"></div>
            </div>

            <div className="text-center w-full space-y-3">
              <h2 className="font-display font-bold text-3xl sm:text-4xl text-white tracking-tight">
                {t.onboarding.slide3Title}
              </h2>
              <p className="font-body text-sm text-[#c4c7c8] max-w-[280px] mx-auto leading-relaxed">
                {t.onboarding.slide3Desc}
              </p>

              <div className="pt-4 flex items-center justify-center gap-2 text-xs font-mono text-[#c4c7c8]/80 uppercase tracking-widest">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Cloud Telemetry</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Unlock Pro */}
        {currentStep === 3 && (
          <div className="w-full space-y-5 animate-fade-in">
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                <Star className="w-7 h-7 text-amber-300 fill-amber-300" />
              </div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight">
                {t.onboarding.slide4Title}
              </h2>
              <p className="font-body text-xs sm:text-sm text-[#c4c7c8] max-w-xs mx-auto mt-1">
                {t.onboarding.slide4Desc}
              </p>
            </div>

            {/* Benefits Card */}
            <div className="glass-card rounded-2xl p-5 space-y-3.5 border border-white/15">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 mt-0.5 text-secondary">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Unlimited OCR Scanning</h4>
                  <p className="text-[11px] text-[#c4c7c8]">Sub-second receipt digitization with zero limits.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 mt-0.5 text-secondary">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Itemized Multi-Person Split</h4>
                  <p className="text-[11px] text-[#c4c7c8]">Assign individual dishes and auto-calc exact shares.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 mt-0.5 text-secondary">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">160+ Currencies Live Rates</h4>
                  <p className="text-[11px] text-[#c4c7c8]">Real-time exchange conversion for international travel.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center shrink-0 mt-0.5 text-secondary">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Ad-Free &amp; iOS/Android Widgets</h4>
                  <p className="text-[11px] text-[#c4c7c8]">Pure, uninterrupted luxury financial interface.</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-3 flex items-center justify-between border border-amber-400/30 bg-amber-500/5">
              <div>
                <span className="font-mono text-[10px] text-amber-300 uppercase tracking-wider font-bold">Special Offer</span>
                <p className="text-xs font-bold text-white">Lifetime Pro Access</p>
              </div>
              <div className="text-right">
                <span className="font-display font-bold text-base text-white">$9.99</span>
                <span className="block text-[9px] font-mono text-[#c4c7c8]">One-time</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Controls Area */}
      <footer className="w-full max-w-md mx-auto flex flex-col items-center gap-4 z-10 pt-4 pb-2">
        {/* Step Indicators */}
        <div className="flex gap-2">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStep ? 'w-8 bg-white' : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Action Button */}
        {currentStep === 3 ? (
          <div className="w-full space-y-2">
            <button
              id="onboarding-trial-btn"
              onClick={onOpenPaywall}
              className="w-full h-14 bg-white text-[#0c1324] font-display font-bold text-base rounded-xl flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)]"
            >
              <Zap className="w-4 h-4 fill-[#0c1324]" />
              {t.onboarding.unlockPro}
            </button>
            <button
              id="onboarding-continue-free-btn"
              onClick={onComplete}
              className="w-full h-12 glass-button text-white font-medium text-xs rounded-xl flex items-center justify-center hover:bg-white/10 active:scale-[0.98] transition-all"
            >
              {t.onboarding.getStarted}
            </button>
          </div>
        ) : (
          <button
            id="onboarding-next-btn"
            onClick={handleNext}
            className="w-full h-14 bg-white text-[#0c1324] font-display font-bold text-base rounded-xl flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          >
            {currentStep === 2 ? t.onboarding.getStarted : t.onboarding.next}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </footer>
    </div>
  );
};

