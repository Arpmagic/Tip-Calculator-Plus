import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
  Fingerprint,
  Eye,
  EyeOff
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
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatusMessage(t.common.savedSuccess);
    setTimeout(() => {
      const updatedUser: UserProfile = {
        ...currentUser,
        name: mode === 'signup' ? (name.trim() || 'User') : (currentUser.name !== 'Guest User' ? currentUser.name : (name.trim() || 'Alex')),
        email: email.trim(),
        id: currentUser.id || `user_${Date.now()}`,
        isGuest: false,
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
      email: '',
      isGuest: true,
      isPro: false,
    };
    onAuthSuccess(guestUser);
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-white/[0.12] bg-[#090D16]/95 backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

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
        <div className="flex bg-white/5 rounded-xl p-1 mb-6 border border-white/10">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold shadow-sm'
                : 'text-[#c4c7c8] hover:text-white border border-transparent'
            }`}
          >
            {t.auth.signInTitle}
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold shadow-sm'
                : 'text-[#c4c7c8] hover:text-white border border-transparent'
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
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Henderson"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-all font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#c4c7c8] mb-1.5 ml-1">
              {t.auth.email}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex.dining@onyx.finance"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-[#c4c7c8] mb-1.5 ml-1">
              {t.auth.password}
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-all font-mono pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-[#c4c7c8] hover:text-white p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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
            className="w-full h-12 mt-2 bg-gradient-to-r from-[#F5D061] via-[#E6B83D] to-[#C9971E] text-[#090D16] font-display font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(230,184,61,0.25)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>{mode === 'signin' ? t.auth.signInBtn : t.auth.signUpBtn}</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </form>

        {/* Quick Instant Biometric / Guest Mode */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleQuickGuest}
            className="w-full py-2.5 px-3 glass-button rounded-xl text-xs text-[#dce1fb] hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
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

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

