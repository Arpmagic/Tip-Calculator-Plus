import React, { useState } from 'react';
import { UserProfile as UserProfileType, DiningTask, CalculationHistoryItem } from '../types';
import { 
  User, 
  CheckSquare, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Edit3, 
  LogOut, 
  LogIn,
  RefreshCw,
  Sparkles,
  Calendar,
  Wallet,
  TrendingUp,
  Receipt,
  ArrowUpRight
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { formatCurrency, formatMonthYear, formatDate, parseLocalizedNumber } from '../utils/i18nFormatter';

interface UserProfileProps {
  user: UserProfileType;
  onUpdateUser: (updated: UserProfileType) => void;
  tasks: DiningTask[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: DiningTask) => void;
  onDeleteTask: (taskId: string) => void;
  history: CalculationHistoryItem[];
  onOpenAuth: () => void;
  onOpenPaywall: () => void;
  onLogout?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onUpdateUser,
  tasks,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  history,
  onOpenAuth,
  onOpenPaywall,
  onLogout,
}) => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'profile' | 'tasks'>('profile');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>(user.name);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskCategory, setNewTaskCategory] = useState<'split' | 'verify' | 'refund' | 'expense' | 'travel'>('split');
  const [newTaskAmount, setNewTaskAmount] = useState<string>('');
  const [showAddTaskModal, setShowAddTaskModal] = useState<boolean>(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Compute live financial analytics
  const totalBillsCount = history.length;
  const totalSpent = history.reduce((acc, item) => acc + item.totalBill, 0);
  const totalTipped = history.reduce((acc, item) => acc + item.tipAmount, 0);
  const avgTipPercent = totalBillsCount > 0 
    ? (history.reduce((acc, item) => acc + item.tipPercent, 0) / totalBillsCount).toFixed(1) 
    : '0.0';

  const userCurrency = user.defaultCurrency || 'USD';
  const formattedTotalSpent = formatCurrency(totalSpent, userCurrency, language);
  const formattedTotalTipped = formatCurrency(totalTipped, userCurrency, language);

  // Strictly localized month and year using active appLanguage state (zero OS fallback)
  const localizedMemberSince = formatMonthYear(user.createdAt, language);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onUpdateUser({ ...user, name: newName.trim() });
    setIsEditingName(false);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const task: DiningTask = {
      id: `task_${Date.now()}`,
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      completed: false,
      amount: parseLocalizedNumber(newTaskAmount) || undefined,
      currency: user.defaultCurrency || 'USD',
      dueDate: formatDate(Date.now(), language),
    };

    onAddTask(task);
    setNewTaskTitle('');
    setNewTaskAmount('');
    setShowAddTaskModal(false);
  };

  const pendingTasksCount = tasks.filter(t => !t.completed).length;

  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'pending') return !t.completed;
    if (taskFilter === 'completed') return t.completed;
    return true;
  });

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-5 pb-12 animate-fade-in">
      
      {/* 1. TOP FLOATING PILL SEGMENTED SWITCHER (iOS Style with sliding highlight) */}
      <div className="relative flex bg-white/[0.04] rounded-2xl p-1.5 border border-white/[0.1] shadow-lg backdrop-blur-xl">
        <button
          id="tab-btn-profile"
          onClick={() => setActiveTab('profile')}
          className={`relative z-10 flex-1 min-h-[48px] py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] ${
            activeTab === 'profile'
              ? 'bg-white text-[#0B0F19] shadow-md'
              : 'text-[#c4c7c8] hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{t.profile.title}</span>
        </button>

        <button
          id="tab-btn-tasks"
          onClick={() => setActiveTab('tasks')}
          className={`relative z-10 flex-1 min-h-[48px] py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] ${
            activeTab === 'tasks'
              ? 'bg-white text-[#0B0F19] shadow-md'
              : 'text-[#c4c7c8] hover:text-white'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>{t.profile.tasksTab}</span>
          {pendingTasksCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
              activeTab === 'tasks' ? 'bg-[#0B0F19] text-white' : 'bg-amber-400 text-[#0B0F19]'
            }`}>
              {pendingTasksCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'profile' ? (
        <div className="flex flex-col gap-5">
          
          {/* 2. USER IDENTITY CARD (Titanium Glassmorphism with Ring Border Glow) */}
          <section 
            id="user-profile-card"
            className="glass-card rounded-3xl p-6 border border-white/[0.12] bg-white/[0.035] shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-2xl relative overflow-hidden flex flex-col gap-5"
          >
            <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-4">
                
                {/* Glowing Avatar Ring */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/20 ring-4 ring-white/[0.05] flex items-center justify-center text-2xl font-display font-black text-white shadow-xl overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{user.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  {user.isPro && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-[#0B0F19] shadow-md border-2 border-[#0B0F19]">
                      <span className="text-[10px]">👑</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  {/* Name & Inline Edit */}
                  <div className="flex items-center gap-2">
                    {isEditingName ? (
                      <form onSubmit={handleSaveName} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="glass-panel px-3 py-1.5 rounded-xl text-sm text-white border border-white/30 bg-white/10 outline-none min-h-[44px]"
                          autoFocus
                        />
                        <button 
                          type="submit" 
                          className="min-h-[44px] px-3.5 rounded-xl bg-emerald-400 text-[#0B0F19] text-xs font-mono font-bold hover:bg-emerald-300 transition-colors"
                        >
                          {t.profile.saveName}
                        </button>
                      </form>
                    ) : (
                      <>
                        <h3 className="font-display font-extrabold text-xl text-white tracking-tight leading-snug">
                          {user.name}
                        </h3>
                        <button 
                          onClick={() => setIsEditingName(true)} 
                          className="text-[#c4c7c8]/60 hover:text-white p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors rounded-xl hover:bg-white/5 active:scale-95"
                          title={t.profile.editName}
                          aria-label="Edit Profile Name"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                  
                  {user.email && (
                    <span className="font-mono text-xs text-[#c4c7c8]/80 block">
                      {user.email}
                    </span>
                  )}

                  {/* Status Badges */}
                  <div className="flex items-center flex-wrap gap-2 mt-1.5">
                    {user.isPro ? (
                      <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400/20 to-yellow-400/20 border border-amber-400/40 text-amber-300 text-[11px] font-mono font-black px-3 py-0.5 rounded-full shadow-sm">
                        <span>👑</span>
                        <span>{t.profile.proMember}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-white/10 text-white text-[11px] font-mono px-3 py-0.5 rounded-full border border-white/15">
                        {t.profile.freeAccount}
                      </span>
                    )}

                    <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[#c4c7c8] bg-white/[0.04] px-2.5 py-0.5 rounded-xl border border-white/5">
                      <Calendar className="w-3.5 h-3.5 text-[#c4c7c8]/70" />
                      <span>{t.profile.memberSince} {localizedMemberSince}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions (Upgrade to PRO metallic gold & Sign In / Switch / Logout) */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-white/10 relative z-10">
              {!user.isPro ? (
                <button
                  id="profile-upgrade-btn"
                  onClick={onOpenPaywall}
                  className="flex-1 min-h-[48px] py-3 px-5 rounded-xl bg-[#F0C05A] hover:bg-[#E2B248] text-[#05070E] font-display font-bold text-sm flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(240,192,90,0.18)] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 fill-[#05070E]" />
                  <span>{t.profile.upgradeToPro}</span>
                </button>
              ) : (
                <div className="flex-1 min-h-[48px] py-2 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t.profile.lifetimeAccess}</span>
                </div>
              )}

              {user.isGuest ? (
                /* GUEST USER: Primary Sign In / Register button */
                <button
                  id="profile-auth-signin-btn"
                  onClick={onOpenAuth}
                  className="min-h-[48px] py-3 px-5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.15] active:bg-white/[0.2] border border-white/[0.15] text-xs font-mono font-bold text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all duration-150 cursor-pointer shadow-md"
                >
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span>{t.profile.signInOrRegister || 'Sign In / Register'}</span>
                </button>
              ) : (
                /* AUTHENTICATED USER: Frosted Glass Switch Account + Destructive Crimson Glass Sign Out */
                <div className="flex items-center gap-2">
                  <button
                    id="profile-auth-switch-btn"
                    onClick={onOpenAuth}
                    className="min-h-[48px] py-3 px-3.5 rounded-2xl bg-white/[0.07] hover:bg-white/[0.12] active:bg-white/[0.15] border border-white/[0.12] text-xs font-mono font-semibold text-[#dce1fb] hover:text-white flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all duration-150 cursor-pointer"
                    title={t.profile.switchAccount || 'Switch Account'}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#c4c7c8]" />
                    <span>{t.profile.switchAccount || 'Switch'}</span>
                  </button>

                  <button
                    id="profile-auth-logout-btn"
                    onClick={() => {
                      if (confirm(t.profile.signOutConfirm || 'Are you sure you want to sign out?')) {
                        onLogout?.();
                      }
                    }}
                    className="min-h-[48px] py-3 px-3.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/25 border border-rose-500/30 text-xs font-mono font-semibold text-rose-300 hover:text-rose-200 flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all duration-150 cursor-pointer"
                    title={t.profile.signOut}
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>{t.profile.signOut}</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 3. FINANCIAL ANALYTICS BENTO GRID (8px Grid & Sparkline Micro-Trends) */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h4 className="font-display font-bold text-sm text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>{t.profile.financialAnalytics}</span>
              </h4>
              <span className="text-xs font-mono text-[#c4c7c8]/70 uppercase tracking-wider font-semibold">
                {userCurrency}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Stat 1: Total Dining Volume */}
              <div className="glass-panel rounded-3xl p-5 border border-white/[0.08] bg-white/[0.03] space-y-2 relative overflow-hidden group hover:border-white/20 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[#c4c7c8] uppercase tracking-wider font-semibold">
                    {t.profile.totalSpent}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-white/40 group-hover:text-emerald-400 transition-colors" />
                </div>
                
                <div className="font-display font-black text-3xl text-white tabular-nums tracking-tight">
                  {formattedTotalSpent}
                </div>

                <div className="font-mono text-xs text-[#c4c7c8]/80 flex items-center gap-1.5 pt-1 border-t border-white/5">
                  <Receipt className="w-3.5 h-3.5 text-secondary" />
                  <span>{totalBillsCount} {t.history.totalSavedRecords}</span>
                </div>
              </div>

              {/* Stat 2: Total Tipped & Average Rate */}
              <div className="glass-panel rounded-3xl p-5 border border-white/[0.08] bg-white/[0.03] space-y-2 relative overflow-hidden group hover:border-white/20 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-[#c4c7c8] uppercase tracking-wider font-semibold">
                    {t.profile.totalTipsCalculated}
                  </span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>

                <div className="font-display font-black text-3xl text-emerald-400 tabular-nums tracking-tight">
                  +{formattedTotalTipped}
                </div>

                <div className="font-mono text-xs text-[#c4c7c8]/80 flex items-center gap-1.5 pt-1 border-t border-white/5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.profile.avgTipPercentage}: <strong className="text-white font-bold">{avgTipPercent}%</strong></span>
                </div>
              </div>
            </div>
          </section>

        </div>
      ) : (
        /* 4. DINING TASKS & REIMBURSEMENTS TAB */
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-center px-1">
            <div>
              <h3 className="font-display font-bold text-lg text-white">{t.tasks.title}</h3>
              <p className="text-xs font-mono text-[#c4c7c8]">{t.tasks.subtitle}</p>
            </div>

            <button
              onClick={() => setShowAddTaskModal(true)}
              className="min-h-[48px] px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-[#0B0F19] font-display font-extrabold text-xs flex items-center gap-1.5 hover:brightness-105 active:scale-[0.97] transition-all shadow-[0_0_16px_rgba(251,191,36,0.3)] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.tasks.addNewTask}</span>
            </button>
          </div>

          {/* Filter Segmented Controls */}
          <div className="flex gap-2 text-xs font-mono">
            <button
              onClick={() => setTaskFilter('all')}
              className={`flex-1 min-h-[48px] px-3.5 py-2 rounded-xl border transition-all flex items-center justify-center font-bold active:scale-[0.97] cursor-pointer ${
                taskFilter === 'all'
                  ? 'bg-white/15 text-white border-white/30 shadow-sm'
                  : 'bg-white/5 text-[#c4c7c8] border-white/10 hover:text-white hover:bg-white/10'
              }`}
            >
              {t.tasks.all} ({tasks.length})
            </button>
            <button
              onClick={() => setTaskFilter('pending')}
              className={`flex-1 min-h-[48px] px-3.5 py-2 rounded-xl border transition-all flex items-center justify-center font-bold active:scale-[0.97] cursor-pointer ${
                taskFilter === 'pending'
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-sm'
                  : 'bg-white/5 text-[#c4c7c8] border-white/10 hover:text-white hover:bg-white/10'
              }`}
            >
              {t.tasks.pending} ({pendingTasksCount})
            </button>
            <button
              onClick={() => setTaskFilter('completed')}
              className={`flex-1 min-h-[48px] px-3.5 py-2 rounded-xl border transition-all flex items-center justify-center font-bold active:scale-[0.97] cursor-pointer ${
                taskFilter === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-sm'
                  : 'bg-white/5 text-[#c4c7c8] border-white/10 hover:text-white hover:bg-white/10'
              }`}
            >
              {t.tasks.completed} ({tasks.filter(t => t.completed).length})
            </button>
          </div>

          {/* Tasks List */}
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="glass-panel rounded-3xl p-10 text-center text-xs font-mono text-[#c4c7c8] border border-dashed border-white/15">
                {t.tasks.noTasksDesc}
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`glass-panel rounded-2xl p-4 border transition-all flex items-start justify-between gap-3 ${
                    task.completed 
                      ? 'border-white/5 opacity-50 bg-white/[0.01]' 
                      : 'border-white/10 hover:border-white/20 bg-white/[0.035]'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className={`w-8 h-8 min-w-[32px] min-h-[32px] rounded-xl border mt-0.5 flex items-center justify-center transition-all active:scale-90 ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-400 text-[#0B0F19]'
                          : 'border-white/30 hover:border-white'
                      }`}
                      aria-label="Toggle task completed"
                    >
                      {task.completed && <CheckCircle2 className="w-5 h-5 fill-[#0B0F19] text-emerald-400" />}
                    </button>

                    <div>
                      <h4 className={`text-sm font-semibold ${task.completed ? 'line-through text-[#c4c7c8]' : 'text-white'}`}>
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs font-mono text-[#c4c7c8]/80 flex-wrap">
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-secondary" />
                            <span>{task.dueDate}</span>
                          </span>
                        )}
                        {task.amount && (
                          <span className="text-emerald-300 font-bold">
                            {formatCurrency(task.amount, task.currency || userCurrency, language)}
                          </span>
                        )}
                        {task.assignedWith && (
                          <span className="text-sky-300">👥 {task.assignedWith}</span>
                        )}
                      </div>
                      {task.notes && (
                        <p className="text-xs font-mono text-[#c4c7c8]/60 mt-1 italic">
                          {task.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="text-[#c4c7c8]/40 hover:text-rose-400 p-2 min-w-[48px] min-h-[48px] flex items-center justify-center transition-colors rounded-xl active:scale-90"
                    title={t.history.deleteRecord}
                    aria-label="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add Task Modal */}
          {showAddTaskModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
              <div className="w-full max-w-md glass-card rounded-3xl p-6 border border-white/20 shadow-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-display font-bold text-base text-white">{t.tasks.createTaskModalTitle}</h3>
                  <button 
                    onClick={() => setShowAddTaskModal(false)} 
                    className="text-[#c4c7c8] hover:text-white min-w-[48px] min-h-[48px] flex items-center justify-center text-xl rounded-xl"
                    aria-label="Close modal"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div>
                    <label className="font-mono text-xs text-[#c4c7c8] uppercase block mb-1.5">{t.tasks.taskTitle}</label>
                    <input
                      type="text"
                      required
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder={t.tasks.taskTitlePlaceholder}
                      className="w-full glass-panel rounded-xl px-4 py-3 text-xs text-white bg-transparent border border-white/15 outline-none min-h-[48px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-mono text-xs text-[#c4c7c8] uppercase block mb-1.5">{t.tasks.category}</label>
                      <select
                        value={newTaskCategory}
                        onChange={(e) => setNewTaskCategory(e.target.value as any)}
                        className="w-full glass-panel rounded-xl px-3 py-2.5 text-xs text-white bg-[#0B0F19] border border-white/15 outline-none min-h-[48px]"
                      >
                        <option value="split">{t.tasks.categorySplit}</option>
                        <option value="expense">{t.tasks.categoryExpense}</option>
                        <option value="verify">{t.tasks.categoryVerify}</option>
                        <option value="travel">{t.tasks.categoryTravel}</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-mono text-xs text-[#c4c7c8] uppercase block mb-1.5">{t.tasks.amountOptional}</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={newTaskAmount}
                        onChange={(e) => setNewTaskAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full glass-panel rounded-xl px-4 py-2.5 text-xs text-white bg-transparent border border-white/15 outline-none font-mono min-h-[48px]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full min-h-[48px] bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-[#0B0F19] font-display font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.97] transition-all shadow-[0_0_16px_rgba(251,191,36,0.3)] cursor-pointer"
                  >
                    <span>{t.tasks.createTaskBtn}</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
