import React, { useState, useEffect } from 'react';
import { 
  ScreenType, 
  UserProfile as UserProfileType, 
  DiningTask, 
  CalculationHistoryItem, 
  CurrencyRate, 
  ItemizedItem,
  Person
} from './types';
import { 
  INITIAL_USER, 
  INITIAL_TASKS, 
  INITIAL_HISTORY, 
  SUPPORTED_CURRENCIES, 
  INITIAL_PEOPLE, 
  INITIAL_ITEMS 
} from './data/mockData';

// UI Components
import { TopAppBar } from './components/TopAppBar';
import { BottomNavBar } from './components/BottomNavBar';
import { MainCalculator } from './components/MainCalculator';
import { ItemizedSplit } from './components/ItemizedSplit';
import { ReceiptScanner } from './components/ReceiptScanner';
import { CurrencyConverter } from './components/CurrencyConverter';
import { HistoryView } from './components/HistoryView';
import { TasksView } from './components/TasksView';
import { UserProfile } from './components/UserProfile';
import { OnboardingFlow } from './components/OnboardingFlow';
import { AuthModal } from './components/AuthModal';
import { PaywallModal } from './components/PaywallModal';
import { SettingsModal } from './components/SettingsModal';
import { wipeUserCloudData } from './services/cloudDataService';
import { checkForAppUpdates, applyInstantUpdate, CURRENT_BUILD_VERSION } from './utils/versionCheck';
import { Sparkles, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation & View State
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('calculator');
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('tip_calc_onboarding_done') === 'true';
  });

  // OTA Live Auto-Update State
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [updateVersion, setUpdateVersion] = useState<string>(CURRENT_BUILD_VERSION);

  // User State
  const [user, setUser] = useState<UserProfileType>(() => {
    const saved = localStorage.getItem('tip_calc_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...INITIAL_USER,
            ...parsed,
            name: parsed.name && parsed.name !== 'Guest User' ? parsed.name : (parsed.isGuest ? 'Guest User' : 'User'),
          };
        }
      } catch (e) {
        console.warn('Failed parsing user from localStorage:', e);
      }
    }
    return INITIAL_USER;
  });

  // Task State
  const [tasks, setTasks] = useState<DiningTask[]>(() => {
    const saved = localStorage.getItem('tip_calc_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  // History State
  const [history, setHistory] = useState<CalculationHistoryItem[]>(() => {
    const saved = localStorage.getItem('tip_calc_history');
    return saved ? JSON.parse(saved) : INITIAL_HISTORY;
  });

  // Currencies State
  const [currencies] = useState<CurrencyRate[]>(SUPPORTED_CURRENCIES);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyRate>(() => {
    return SUPPORTED_CURRENCIES.find(c => c.code === user.defaultCurrency) || SUPPORTED_CURRENCIES[0];
  });

  // Itemized Data State
  const [itemizedPeople, setItemizedPeople] = useState<Person[]>(INITIAL_PEOPLE);
  const [itemizedItems, setItemizedItems] = useState<ItemizedItem[]>(INITIAL_ITEMS);
  const [scannedBillData, setScannedBillData] = useState<{
    billAmount: number;
    taxAmount: number;
    venueName: string;
  } | null>(null);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Check for OTA app updates on boot and resume
  useEffect(() => {
    const runUpdateCheck = async () => {
      const res = await checkForAppUpdates();
      if (res.updateAvailable) {
        setUpdateAvailable(true);
        setUpdateVersion(res.latestVersion);
      }
    };

    runUpdateCheck();

    const handleFocus = () => {
      runUpdateCheck();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Sync state to local storage (protect custom username and email)
  useEffect(() => {
    localStorage.setItem('tip_calc_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('tip_calc_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('tip_calc_history', JSON.stringify(history));
  }, [history]);

  // Handlers
  const handleCompleteOnboarding = () => {
    localStorage.setItem('tip_calc_onboarding_done', 'true');
    setHasSeenOnboarding(true);
    setCurrentScreen('calculator');
  };

  const handleUpdateUser = (updated: UserProfileType) => {
    setUser(prev => ({
      ...prev,
      ...updated,
      name: updated.name !== undefined ? (updated.name.trim() || prev.name) : prev.name,
    }));
    const curr = currencies.find(c => c.code === updated.defaultCurrency);
    if (curr) setSelectedCurrency(curr);
  };

  const handleUpgradeSuccess = () => {
    setUser(prev => ({ ...prev, isPro: true }));
  };

  const handleApplyUpdate = async () => {
    await applyInstantUpdate();
  };

  const handleSaveHistory = (item: CalculationHistoryItem) => {
    setHistory(prev => [item, ...prev]);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const handleAddTask = (newTask: DiningTask) => {
    setTasks(prev => [newTask, ...prev]);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleApplyScan = (result: {
    billAmount: number;
    taxAmount: number;
    venueName: string;
    items?: ItemizedItem[];
    currency?: string;
  }) => {
    setScannedBillData({
      billAmount: result.billAmount,
      taxAmount: result.taxAmount,
      venueName: result.venueName,
    });

    // Auto-switch currency if detected on receipt (e.g. PLN, EUR, GBP, UAH)
    if (result.currency) {
      const matchedCurrency = currencies.find((c) => c.code === result.currency);
      if (matchedCurrency) {
        setSelectedCurrency(matchedCurrency);
      }
    }

    if (result.items && result.items.length > 0) {
      setItemizedItems(result.items);
      setCurrentScreen('itemized');
    } else {
      setCurrentScreen('calculator');
    }
  };

  const handleLogout = () => {
    const guestUser: UserProfileType = {
      ...INITIAL_USER,
      isGuest: true,
      isPro: false,
      id: `usr_${Date.now()}`,
    };
    setUser(guestUser);
    localStorage.setItem('tip_calc_user', JSON.stringify(guestUser));
  };

  const handleClearAllData = async () => {
    try {
      await wipeUserCloudData();
    } catch (e) {
      console.warn('Cloud wipe skipped or failed:', e);
    }
    localStorage.removeItem('tip_calc_user');
    localStorage.removeItem('tip_calc_tasks');
    localStorage.removeItem('tip_calc_history');
    setUser(INITIAL_USER);
    setTasks(INITIAL_TASKS);
    setHistory([]);
  };

  // If onboarding hasn't been completed, show onboarding flow first
  if (!hasSeenOnboarding) {
    return (
      <OnboardingFlow
        onComplete={handleCompleteOnboarding}
        onOpenPaywall={() => {
          handleCompleteOnboarding();
          setIsPaywallOpen(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#dce1fb] flex flex-col justify-between selection:bg-white/20 selection:text-white relative">
      {/* Live OTA Update Notification Banner */}
      {updateAvailable && (
        <div className="fixed top-3 inset-x-4 z-50 max-w-lg mx-auto p-3.5 rounded-2xl bg-[#090D16]/95 backdrop-blur-2xl border border-amber-400/40 shadow-[0_12px_36px_rgba(251,191,36,0.3)] flex items-center justify-between gap-3 animate-slide-down">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>
            <div className="min-w-0">
              <span className="font-display font-bold text-xs text-white block truncate">New update available ({updateVersion})</span>
              <span className="font-mono text-[10px] text-[#c4c7c8]/80 block truncate">Tap to reload latest OCR & UI improvements</span>
            </div>
          </div>
          <button
            onClick={handleApplyUpdate}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#F5D061] via-[#E6B83D] to-[#C9971E] text-[#090D16] font-display font-black text-xs shrink-0 shadow-sm active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3 stroke-[3]" />
            <span>Update</span>
          </button>
        </div>
      )}

      {/* Top Header Bar with Minimalist Titanium Glassmorphism */}
      <TopAppBar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        onOpenPaywall={() => setIsPaywallOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        user={user}
      />

      {/* Main Content Area with Viewport Safe Clearances (Zero Clipping on Physical Devices) */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pt-content-safe pb-content-safe sm:px-6">
        {currentScreen === 'calculator' && (
          <MainCalculator
            selectedCurrency={selectedCurrency}
            user={user}
            onSaveHistory={handleSaveHistory}
            onNavigate={setCurrentScreen}
            onOpenPaywall={() => setIsPaywallOpen(true)}
            scannedData={scannedBillData}
          />
        )}

        {currentScreen === 'itemized' && (
          <ItemizedSplit
            selectedCurrency={selectedCurrency}
            initialPeople={itemizedPeople}
            initialItems={itemizedItems}
            defaultTip={user.defaultTip || 20}
            onSaveHistory={handleSaveHistory}
          />
        )}

        {currentScreen === 'scanner' && (
          <ReceiptScanner
            onClose={() => setCurrentScreen('calculator')}
            selectedCurrency={selectedCurrency}
            onApplyScan={handleApplyScan}
            onSaveHistory={handleSaveHistory}
          />
        )}

        {currentScreen === 'converter' && (
          <CurrencyConverter
            currencies={currencies}
            selectedCurrency={selectedCurrency}
            onSelectCurrency={setSelectedCurrency}
          />
        )}

        {currentScreen === 'history' && (
          <HistoryView
            history={history}
            onClearHistory={handleClearHistory}
            onDeleteItem={handleDeleteHistoryItem}
            currencies={currencies}
          />
        )}

        {currentScreen === 'tasks' && (
          <TasksView
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            selectedCurrency={selectedCurrency}
          />
        )}

        {currentScreen === 'profile' && (
          <UserProfile
            user={user}
            onUpdateUser={handleUpdateUser}
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            history={history}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenPaywall={() => setIsPaywallOpen(true)}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Bottom Floating Glass Navigation Bar with EXACTLY 5 TABS (hidden when scanner is active) */}
      {currentScreen !== 'scanner' && (
        <BottomNavBar
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
          pendingTasksCount={tasks.filter(t => !t.completed).length}
        />
      )}

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={user}
        onAuthSuccess={handleUpdateUser}
      />

      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onUpgradeSuccess={handleUpgradeSuccess}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onUpdateUser={handleUpdateUser}
        currencies={currencies}
        onDeleteAccount={handleClearAllData}
        onClearAllData={handleClearAllData}
        onOpenPaywall={() => setIsPaywallOpen(true)}
      />
    </div>
  );
};

export default App;
