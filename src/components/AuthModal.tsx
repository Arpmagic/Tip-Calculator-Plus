import React, { useState } from 'react';
import { UserProfile } from '../types';
import { 
  X, 
  Lock, 
  Mail, 
  User as UserIcon, 
  KeyRound, 
  CheckCircle2, 
  Shield, 
  ArrowRight,
  Fingerprint
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
}) => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState<string>(currentUser.name !== 'Guest User' ? currentUser.name : '');
  const [email, setEmail] = useState<string>(currentUser.email && currentUser.email !== 'guest@device.local' ? currentUser.email : '');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatusMessage(t.common.savedSuccess);
    setTimeout(() => {
      const updatedUser: UserProfile = {
        ...currentUser,
        name: mode === 'signup' ? name || 'User' : (currentUser.name !== 'Guest User' ? currentUser.name : (name || 'User')),
        email: email,
        id: currentUser.id || `user_${Date.now()}`,
      };
      onAuthSuccess(updatedUser);
      setStatusMessage(null);
      onClose();
    }, 600);
  };

  const handleQuickGuest = () => {
    const guestUser: UserProfile = {
      ...currentUser,
      name: 'Guest User',
      email: 'guest@device.local',
      isPro: false,
    };
    onAuthSuccess(guestUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-mono text-[10px] text-secondary uppercase tracking-widest block">{t.auth.subtitle}</span>
              <h3 className="font-display font-bold text-lg text-white">
                {mode === 'signin' ? t.auth.signInTitle : t.auth.signUpTitle}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-[#c4c7c8] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-surface-container-high/60 rounded-xl p-1 mb-6 border border-white/5">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 py-2 rounded-lg text-xs font-mono transition-all ${
              mode === 'signin'
                ? 'bg-white text-[#0c1324] font-bold shadow-sm'
                : 'text-[#c4c7c8] hover:text-white'
            }`}
          >
            {t.auth.signInTitle}
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-lg text-xs font-mono transition-all ${
              mode === 'signup'
                ? 'bg-white text-[#0c1324] font-bold shadow-sm'
                : 'text-[#c4c7c8] hover:text-white'
            }`}
          >
            {t.auth.signUpTitle}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-mono uppercase text-[#c4c7c8] mb-1.5 ml-1">
                {t.auth.fullName}
              </label>
              <div className="glass-panel rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 border border-white/10 focus-within:border-white/30 transition-all">
                <UserIcon className="w-4 h-4 text-[#c4c7c8]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Doe"
                  className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-white/20 p-0"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#c4c7c8] mb-1.5 ml-1">
              {t.auth.email}
            </label>
            <div className="glass-panel rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 border border-white/10 focus-within:border-white/30 transition-all">
              <Mail className="w-4 h-4 text-[#c4c7c8]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex.dining@onyx.finance"
                className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-white/20 p-0"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5 ml-1">
              <label className="text-[11px] font-mono uppercase text-[#c4c7c8]">
                {t.auth.password}
              </label>
            </div>
            <div className="glass-panel rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 border border-white/10 focus-within:border-white/30 transition-all">
              <Lock className="w-4 h-4 text-[#c4c7c8]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-white/20 p-0"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-[#c4c7c8]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-white/10 border-white/20 text-white focus:ring-0"
              />
              <span>{t.auth.fastBiometric}</span>
            </label>
          </div>

          {statusMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{statusMessage}</span>
            </div>
          )}

          <button
            type="submit"
            id="auth-submit-btn"
            className="w-full h-12 mt-2 bg-white text-[#0c1324] font-display font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          >
            <span>{mode === 'signin' ? t.auth.signInBtn : t.auth.signUpBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Instant Biometric / Guest Mode */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleQuickGuest}
            className="w-full py-2.5 px-3 glass-button rounded-xl text-xs text-[#dce1fb] hover:text-white flex items-center justify-center gap-2 transition-all"
          >
            <Fingerprint className="w-4 h-4 text-emerald-400" />
            <span>{t.auth.guestPro}</span>
          </button>
        </div>

        {/* Privacy Note */}
        <div className="mt-4 text-center">
          <p className="text-[10px] font-mono text-[#c4c7c8]/60 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3 text-secondary" />
            <span>{t.common.localEncryption}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

