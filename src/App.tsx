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

export const App: React.FC = () => {
  // Navigation & View State
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('calculator');
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('tip_calc_onboarding_done') === 'true';
  });

  // User State
  const [user, setUser] = useState<UserProfileType>(() => {
    const saved = localStorage.getItem('tip_calc_user');
    return saved ? JSON.parse(saved) : INITIAL_USER;
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

  // Sync state to local storage
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
    setUser(updated);
    const curr = currencies.find(c => c.code === updated.defaultCurrency);
    if (curr) setSelectedCurrency(curr);
  };

  const handleUpgradeSuccess = () => {
    setUser(prev => ({ ...prev, isPro: true }));
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
  }) => {
    setScannedBillData({
      billAmount: result.billAmount,
      taxAmount: result.taxAmount,
      venueName: result.venueName,
    });
    if (result.items && result.items.length > 0) {
      setItemizedItems(result.items);
      setCurrentScreen('itemized');
    } else {
      setCurrentScreen('calculator');
    }
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
    <div className="min-h-screen bg-[#0c1324] text-[#dce1fb] flex flex-col justify-between selection:bg-white/20 selection:text-white">
      {/* Top Header Bar with Minimalist Titanium Glassmorphism */}
      <TopAppBar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        onOpenPaywall={() => setIsPaywallOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        user={user}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 pt-20 pb-24 sm:px-6">
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
