import React from 'react';
import { ScreenType, UserProfile } from '../types';
import { 
  CreditCard, 
  Crown, 
  Settings as SettingsIcon
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface TopAppBarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  user: UserProfile;
  onOpenPaywall: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  currentScreen,
  onNavigate,
  user,
  onOpenPaywall,
  onOpenSettings,
}) => {
  const { t } = useLanguage();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#0B0F19]/85 backdrop-blur-2xl border-b border-white/[0.08] shadow-sm transition-all pt-safe">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16 max-w-2xl mx-auto w-full">
        {/* Left: App Title & Brand Identity */}
        <button
          onClick={() => onNavigate('calculator')}
          className="flex items-center gap-2.5 text-left group cursor-pointer active:scale-95 transition-transform min-h-[48px]"
          aria-label="Home calculator"
        >
          <div className="w-9 h-9 rounded-2xl bg-white/[0.08] border border-white/[0.16] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
            <CreditCard className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-black text-base sm:text-lg tracking-tight text-white">
              Tip Calculator Plus+
            </h1>
            {user.isPro && (
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400/20 to-yellow-400/20 border border-amber-400/50 text-amber-300 text-[10px] font-mono font-black uppercase tracking-wider shadow-[0_0_12px_rgba(251,191,36,0.25)]">
                PRO
              </span>
            )}
          </div>
        </button>

        {/* Right: Pro Upgrade Badge, Profile, and Settings Icon (Strict Min 48x48 touch targets) */}
        <div className="flex items-center gap-2">
          {!user.isPro && (
            <button
              id="top-upgrade-pro-btn"
              onClick={onOpenPaywall}
              className="flex items-center gap-1.5 min-h-[44px] px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-[#0B0F19] text-xs font-display font-extrabold transition-all active:scale-95 shadow-[0_0_20px_rgba(251,191,36,0.35)] hover:brightness-105 cursor-pointer"
              aria-label="Upgrade to Pro"
            >
              <Crown className="w-3.5 h-3.5 fill-[#0B0F19]" />
              <span>PRO</span>
            </button>
          )}

          {/* User Profile Button */}
          <button
            id="top-profile-btn"
            onClick={() => onNavigate('profile')}
            className={`flex items-center justify-center min-w-[48px] min-h-[48px] rounded-full border transition-all active:scale-95 ${
              currentScreen === 'profile'
                ? 'bg-white/20 border-white/40 text-white shadow-lg'
                : 'bg-white/5 border-white/10 text-[#dce1fb] hover:bg-white/10'
            }`}
            title={t.profile.title}
            aria-label="User profile"
          >
            <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
          </button>

          {/* Settings Gear Icon (48x48dp Touch Target) */}
          <button
            id="top-settings-gear-btn"
            onClick={onOpenSettings}
            className="flex items-center justify-center min-w-[48px] min-h-[48px] rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-[#dce1fb] hover:text-white transition-all active:scale-90"
            title={t.settings.title}
            aria-label="Open Settings"
          >
            <SettingsIcon className="w-5 h-5 text-[#dce1fb] hover:text-white" />
          </button>
        </div>
      </div>
    </header>
  );
};
