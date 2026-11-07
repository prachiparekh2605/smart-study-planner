import React, { useState } from 'react';
import {
  Search,
  Moon,
  Sun,
  Bell,
  Sparkles,
  BookOpen,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { Subject, User } from '../types';

interface HeaderProps {
  subjects: Subject[];
  selectedSubject: Subject | null;
  onSelectSubject: (sub: Subject) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  user: User | null;
  onOpenSettings: () => void;
  onSearchQuery?: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  subjects,
  selectedSubject,
  onSelectSubject,
  isDarkMode,
  onToggleDarkMode,
  user,
  onOpenSettings,
  onSearchQuery
}) => {
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    onSearchQuery?.(e.target.value);
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Active Subject Selector */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowSubjectMenu(!showSubjectMenu)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 bg-slate-50 dark:bg-slate-800/60 transition-all text-xs font-semibold text-slate-800 dark:text-slate-200"
          >
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedSubject?.color || '#4f46e5' }}
            />
            <span className="max-w-[200px] truncate">
              {selectedSubject ? selectedSubject.name : 'Select Course Subject'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showSubjectMenu && (
            <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Active Course Subjects
              </div>
              <div className="max-h-60 overflow-y-auto">
                {subjects.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      onSelectSubject(sub);
                      setShowSubjectMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors ${
                      selectedSubject?.id === sub.id ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                      <span className="truncate">{sub.name}</span>
                    </div>
                    {selectedSubject?.id === sub.id && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Global Search */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search syllabus topics, formulas, lecture notes, or flashcards..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-100/80 dark:bg-slate-800/60 border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all text-slate-800 dark:text-slate-200 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-2">
        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Academic Alerts
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  2 Pending
                </span>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-2.5">
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Exam in 14 Days
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Operating Systems Final. 4 units scheduled for revision.
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Weak Topic Alert
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Banker's Algorithm scored 66.7%. Practice diagnostic quiz.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar Button */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold text-xs flex items-center justify-center">
            {user?.full_name?.charAt(0).toUpperCase() || 'S'}
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline-block">
            {user?.full_name?.split(' ')[0] || 'Student'}
          </span>
        </button>
      </div>
    </header>
  );
};

