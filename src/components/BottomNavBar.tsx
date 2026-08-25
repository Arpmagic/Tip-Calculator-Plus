import React from 'react';
import { ScreenType } from '../types';
import { 
  Calculator, 
  History, 
  Split, 
  ScanLine, 
  CheckSquare 
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface BottomNavBarProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  pendingTasksCount: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentScreen,
  onNavigate,
  pendingTasksCount,
}) => {
  const { t } = useLanguage();

  const navItems: { id: ScreenType; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'calculator',
      label: t.nav.calculator,
      icon: <Calculator className="w-5 h-5" />,
    },
    {
      id: 'itemized',
      label: t.nav.itemized,
      icon: <Split className="w-5 h-5" />,
    },
    {
      id: 'scanner',
      label: t.nav.scanner,
      icon: <ScanLine className="w-5 h-5" />,
    },
    {
      id: 'history',
      label: t.nav.history,
      icon: <History className="w-5 h-5" />,
    },
    {
      id: 'tasks',
      label: t.nav.tasks,
      icon: <CheckSquare className="w-5 h-5" />,
      badge: pendingTasksCount,
    },
  ];

  return (
    <nav 
      aria-label="Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-50 pb-safe pointer-events-none flex justify-center px-4 mb-2"
    >
      <div className="flex justify-around items-center h-16 px-2 sm:px-4 bg-[#060810]/92 backdrop-blur-2xl border border-white/[0.08] rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] pointer-events-auto max-w-md w-full">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              id={`bottom-nav-${item.id}`}
              onClick={() => onNavigate(item.id)}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center flex-1 min-h-[48px] min-w-[48px] py-1 transition-all duration-200 relative active:scale-90 cursor-pointer ${
                isActive
                  ? 'text-white font-bold'
                  : 'text-[#c4c7c8]/60 hover:text-white/80'
              }`}
            >
              {/* Active Backing Pill */}
              {isActive && (
                <div className="absolute inset-x-1.5 inset-y-1 bg-white/[0.06] border border-white/[0.1] rounded-2xl -z-10 shadow-sm" />
              )}

              <div className="relative flex items-center justify-center">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#F3C350] text-[#060810] text-[9px] font-mono font-bold flex items-center justify-center border border-[#060810] shadow-[0_0_10px_rgba(243,195,80,0.4)]">
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="font-mono text-[10px] tracking-tight whitespace-nowrap mt-0.5">
                {item.label}
              </span>

              {/* Active Indicator Dot */}
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981] absolute bottom-1" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
