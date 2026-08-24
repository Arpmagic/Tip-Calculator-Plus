import React, { useState } from 'react';
import { DiningTask, CurrencyRate } from '../types';
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Send, 
  Share2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Check, 
  Sparkles,
  Phone,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface TasksViewProps {
  tasks: DiningTask[];
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: DiningTask) => void;
  onDeleteTask: (taskId: string) => void;
  selectedCurrency: CurrencyRate;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  selectedCurrency,
}) => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<'all' | 'receivable' | 'payable' | 'settled'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  // New task form state
  const [title, setTitle] = useState<string>('');
  const [personName, setPersonName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [taskType, setTaskType] = useState<'receivable' | 'payable'>('receivable');
  const [notes, setNotes] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('Today');

  // Compute metrics with neon highlights
  const receivables = tasks.filter(t => !t.completed && (t.type === 'receivable' || t.category === 'split'));
  const payables = tasks.filter(t => !t.completed && (t.type === 'payable' || t.category === 'expense'));
  
  const totalToCollect = receivables.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalYouOwe = payables.reduce((sum, item) => sum + (item.amount || 0), 0);

  const filteredTasks = tasks.filter(task => {
    if (filter === 'settled') return task.completed;
    if (filter === 'receivable') return !task.completed && (task.type === 'receivable' || task.category === 'split');
    if (filter === 'payable') return !task.completed && (task.type === 'payable' || task.category === 'expense');
    return true;
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !personName.trim()) return;

    const formattedTitle = title.trim() || (taskType === 'receivable' ? `Collect split from ${personName}` : `Pay split to ${personName}`);

    const newTask: DiningTask = {
      id: `task_${Date.now()}`,
      title: formattedTitle,
      category: taskType === 'receivable' ? 'split' : 'expense',
      type: taskType,
      completed: false,
      amount: amount ? parseFloat(amount) : undefined,
      currency: selectedCurrency.code,
      debtorOrCreditor: personName.trim() || undefined,
      dueDate: dueDate || t.common.today,
      notes: notes.trim() || undefined,
    };

    onAddTask(newTask);
    setTitle('');
    setPersonName('');
    setAmount('');
    setNotes('');
    setShowAddModal(false);
  };

  const handleSendReminder = (task: DiningTask) => {
    const debtor = task.debtorOrCreditor || task.assignedWith || 'Friend';
    const taskAmount = task.amount ? `${selectedCurrency.symbol}${task.amount.toFixed(2)}` : 'your split';
    const message = `Hi ${debtor}! Just a friendly reminder for our dining split of ${taskAmount}.`;

    if (navigator.share) {
      navigator.share({
        title: `Tip Calculator Split Reminder: ${task.title}`,
        text: message,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(message);
      setReminderToast(`Copied reminder for ${debtor} to clipboard!`);
      setTimeout(() => setReminderToast(null), 3000);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-5 pb-12 animate-fade-in">
      
      {/* Toast Notification */}
      {reminderToast && (
        <div 
          role="status"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-emerald-400 text-black font-display font-bold text-xs shadow-2xl flex items-center gap-2 animate-fade-in"
        >
          <Check className="w-4 h-4" />
          <span>{reminderToast}</span>
        </div>
      )}

      {/* Header with Title and Add CTA */}
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest block font-bold">
            FINANCIAL TRACKER
          </span>
          <h2 className="font-display font-black text-2xl text-white tracking-tight">
            {t.tasks.title}
          </h2>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="min-h-[48px] px-4 rounded-2xl bg-white text-[#0c1324] font-display font-black text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-white/90 active:scale-[0.97] transition-all cursor-pointer"
          aria-label="Add new dining task"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t.tasks.addNewTask}</span>
        </button>
      </div>

      {/* Balance Bento Card with Titanium Glassmorphism & Neon Highlights */}
      <div className="glass-card rounded-3xl p-6 border border-white/[0.12] bg-white/[0.035] backdrop-blur-2xl relative overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <span className="font-mono text-[10px] text-[#c4c7c8] uppercase tracking-wider block mb-3 font-semibold">
          Outstanding Split Balance
        </span>

        <div className="grid grid-cols-2 gap-3">
          {/* Receivables (To Collect) */}
          <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30 bg-emerald-500/[0.04] space-y-1">
            <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Who Owes You</span>
            </div>
            <div className="font-display font-black text-2xl text-emerald-300 tabular-nums">
              +{selectedCurrency.symbol}{totalToCollect.toFixed(2)}
            </div>
            <span className="text-[10px] font-mono text-[#c4c7c8]/80 block">
              {receivables.length} pending
            </span>
          </div>

          {/* Payables (You Owe) */}
          <div className="glass-panel rounded-2xl p-4 border border-amber-500/30 bg-amber-500/[0.04] space-y-1">
            <div className="flex items-center gap-1 text-[11px] font-mono text-amber-400 font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>You Owe</span>
            </div>
            <div className="font-display font-black text-2xl text-amber-300 tabular-nums">
              {selectedCurrency.symbol}{totalYouOwe.toFixed(2)}
            </div>
            <span className="text-[10px] font-mono text-[#c4c7c8]/80 block">
              {payables.length} pending
            </span>
          </div>
        </div>
      </div>

      {/* Segmented Filter Controls (Min 48x48dp targets) */}
      <div 
        role="tablist"
        aria-label="Filter tasks"
        className="grid grid-cols-4 gap-2 w-full"
      >
        {[
          { id: 'all', label: t.tasks.all, count: tasks.length },
          { id: 'receivable', label: 'Owes You', count: receivables.length },
          { id: 'payable', label: 'You Owe', count: payables.length },
          { id: 'settled', label: t.tasks.completed, count: tasks.filter(t => t.completed).length },
        ].map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilter(tab.id as any)}
              className={`min-h-[48px] rounded-2xl text-xs font-mono font-bold flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer ${
                isActive
                  ? 'bg-white text-[#0c1324] shadow-md border-white'
                  : 'bg-white/5 text-[#c4c7c8] border border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-normal ${isActive ? 'text-[#0c1324]/70' : 'text-[#c4c7c8]/60'}`}>
                ({tab.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          /* Empty State */
          <div className="glass-card rounded-3xl p-10 text-center border border-white/10 bg-white/5 backdrop-blur-xl flex flex-col items-center justify-center gap-4 my-2">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(52,211,153,0.25)]">
              ✨
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-white">
                {t.tasks.noTasksTitle}
              </h3>
              <p className="text-xs font-mono text-[#c4c7c8] max-w-xs leading-relaxed">
                {t.tasks.noTasksDesc}
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="min-h-[48px] px-5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono text-xs font-semibold flex items-center gap-2 active:scale-95 transition-all mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t.tasks.addNewTask}</span>
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isReceivable = task.type === 'receivable' || task.category === 'split';
            return (
              <div
                key={task.id}
                className={`glass-card rounded-3xl p-5 border transition-all duration-200 backdrop-blur-xl relative flex flex-col gap-3.5 ${
                  task.completed
                    ? 'border-white/5 bg-white/[0.02] opacity-50'
                    : isReceivable
                    ? 'border-emerald-500/25 bg-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-emerald-400/40'
                    : 'border-amber-500/25 bg-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-amber-400/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Status Checkbox & Content */}
                  <div className="flex items-start gap-3.5 flex-1">
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className={`min-w-[48px] min-h-[48px] rounded-2xl border flex items-center justify-center transition-all active:scale-90 ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-400 text-[#0c1324] shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                          : 'border-white/20 bg-white/5 hover:border-white/40 text-transparent'
                      }`}
                      aria-label={task.completed ? "Mark pending" : "Mark settled"}
                    >
                      <CheckCircle2 className={`w-6 h-6 ${task.completed ? 'text-[#0c1324] fill-[#0c1324]' : 'text-white/20'}`} />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black tracking-wider uppercase border ${
                          task.completed
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : isReceivable
                            ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-300'
                            : 'bg-amber-400/10 border-amber-400/30 text-amber-300'
                        }`}>
                          {task.completed ? 'Settled' : isReceivable ? 'Owes You' : 'You Owe'}
                        </span>

                        {task.dueDate && (
                          <span className="text-[11px] font-mono text-[#c4c7c8]/70 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#8ea4d2]" />
                            <span>{task.dueDate}</span>
                          </span>
                        )}
                      </div>

                      <h4 className={`text-sm font-semibold leading-snug ${task.completed ? 'line-through text-[#c4c7c8]' : 'text-white'}`}>
                        {task.title}
                      </h4>

                      {task.notes && (
                        <p className="text-xs text-[#c4c7c8]/80 mt-1 font-mono italic">
                          "{task.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Amount Display */}
                  {task.amount !== undefined && (
                    <div className="text-right shrink-0">
                      <div className={`font-display font-black text-xl tabular-nums ${
                        task.completed 
                          ? 'text-[#c4c7c8]' 
                          : isReceivable 
                          ? 'text-emerald-300' 
                          : 'text-amber-300'
                      }`}>
                        {isReceivable ? '+' : '-'}{selectedCurrency.symbol}{task.amount.toFixed(2)}
                      </div>
                      <span className="text-[10px] font-mono text-[#c4c7c8]/60 uppercase font-semibold">
                        {task.currency}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Action Row: 48x48dp Reminder CTA & Delete */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
                  {!task.completed ? (
                    <button
                      onClick={() => handleSendReminder(task)}
                      className="flex-1 min-h-[48px] px-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] active:scale-[0.98] border border-white/15 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4 text-emerald-400" />
                      <span>Send 1-Tap Reminder</span>
                    </button>
                  ) : (
                    <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 px-2 py-1 font-bold">
                      <Check className="w-4 h-4" /> Settled
                    </span>
                  )}

                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="min-w-[48px] min-h-[48px] rounded-2xl glass-button text-[#c4c7c8]/60 hover:text-rose-400 hover:border-rose-500/30 flex items-center justify-center active:scale-95 transition-all"
                    title="Delete task"
                    aria-label="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-7 border border-white/[0.16] shadow-2xl space-y-5 animate-slide-up">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
                  NEW RECORD
                </span>
                <h3 className="font-display font-black text-xl text-white">
                  Add Dining Split Task
                </h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="font-mono text-[10px] text-[#c4c7c8] uppercase font-semibold block mb-1.5">
                  Split Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTaskType('receivable')}
                    className={`min-h-[48px] rounded-2xl font-mono text-xs font-bold border transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer ${
                      taskType === 'receivable'
                        ? 'bg-emerald-500 text-[#0c1324] border-emerald-400 shadow-md font-bold'
                        : 'bg-white/5 border-white/10 text-[#c4c7c8] hover:text-white'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                    <span>Who Owes You</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskType('payable')}
                    className={`min-h-[48px] rounded-2xl font-mono text-xs font-bold border transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer ${
                      taskType === 'payable'
                        ? 'bg-amber-400 text-[#0c1324] border-amber-300 shadow-md font-bold'
                        : 'bg-white/5 border-white/10 text-[#c4c7c8] hover:text-white'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    <span>You Owe</span>
                  </button>
                </div>
              </div>

              {/* Person Name / Debtor */}
              <div>
                <label className="font-mono text-[10px] text-[#c4c7c8] uppercase font-semibold block mb-1.5">
                  Friend / Contact Name
                </label>
                <input
                  type="text"
                  required
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="e.g. Sophia Miller"
                  className="w-full min-h-[48px] glass-panel rounded-2xl px-4 py-2 text-sm text-white bg-transparent border border-white/15 outline-none focus:border-white/40"
                />
              </div>

              {/* Amount and Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[10px] text-[#c4c7c8] uppercase font-semibold block mb-1.5">
                    Amount ({selectedCurrency.symbol})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full min-h-[48px] glass-panel rounded-2xl px-4 py-2 text-sm text-white bg-transparent border border-white/15 outline-none font-mono tabular-nums focus:border-white/40"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] text-[#c4c7c8] uppercase font-semibold block mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="text"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    placeholder="e.g. Tomorrow"
                    className="w-full min-h-[48px] glass-panel rounded-2xl px-4 py-2 text-xs text-white bg-transparent border border-white/15 outline-none focus:border-white/40 font-mono"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-mono text-[10px] text-[#c4c7c8] uppercase font-semibold block mb-1.5">
                  Meal / Venue Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.tasks.notesPlaceholder}
                  className="w-full min-h-[48px] glass-panel rounded-2xl px-4 py-2 text-xs text-white bg-transparent border border-white/15 outline-none focus:border-white/40"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] bg-white text-[#0c1324] font-display font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.97] transition-all shadow-lg mt-2 cursor-pointer"
              >
                <span>Save Split Task</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
