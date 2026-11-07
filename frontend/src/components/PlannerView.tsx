import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  RotateCcw,
  CalendarDays
} from 'lucide-react';
import { StudySession, Subject } from '../types';
import { api } from '../services/api';
import { formatDate, formatTime, formatMinutes, getImportanceColor } from '../utils/formatters';

interface PlannerViewProps {
  sessions: StudySession[];
  subjects: Subject[];
  selectedSubject: Subject | null;
  onRefreshSessions: () => void;
  onNavigate: (view: string) => void;
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  sessions,
  subjects,
  selectedSubject,
  onRefreshSessions,
  onNavigate
}) => {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Plan generation modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planSubjectId, setPlanSubjectId] = useState<number>(selectedSubject?.id || (subjects[0]?.id || 0));
  const [planExamDate, setPlanExamDate] = useState('');
  const [planDailyHours, setPlanDailyHours] = useState(3.0);
  const [planPrepLevel, setPlanPrepLevel] = useState('intermediate');
  const [generating, setGenerating] = useState(false);

  // Auto-adjusting state
  const [autoAdjusting, setAutoAdjusting] = useState(false);

  // Reschedule session modal
  const [rescheduleSession, setRescheduleSession] = useState<StudySession | null>(null);
  const [newSessionDate, setNewSessionDate] = useState('');

  useEffect(() => {
    if (selectedSubject) {
      setPlanSubjectId(selectedSubject.id);
    }
  }, [selectedSubject]);

  const handleToggleComplete = async (sessionId: number, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await api.updateSession(sessionId, { status: nextStatus });
      onRefreshSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to update session');
    }
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planSubjectId || !planExamDate) {
      alert('Please select a subject and target exam date.');
      return;
    }
    setGenerating(true);
    try {
      await api.generatePlan(
        planSubjectId,
        new Date(planExamDate).toISOString(),
        Number(planDailyHours),
        planPrepLevel
      );
      onRefreshSessions();
      setShowPlanModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to generate study plan.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAutoAdjust = async () => {
    const targetSubId = selectedSubject?.id || planSubjectId;
    if (!targetSubId) {
      alert('Please select an active subject first.');
      return;
    }
    setAutoAdjusting(true);
    try {
      const res = await api.autoAdjustPlan(targetSubId);
      alert(res.message || 'Schedule rebalanced successfully!');
      onRefreshSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to auto-adjust plan.');
    } finally {
      setAutoAdjusting(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleSession || !newSessionDate) return;
    try {
      await api.updateSession(rescheduleSession.id, {
        new_date: new Date(newSessionDate).toISOString()
      });
      onRefreshSessions();
      setRescheduleSession(null);
    } catch (err: any) {
      alert(err.message || 'Failed to reschedule session.');
    }
  };

  // Filter sessions based on view mode and current date
  const getFilteredSessions = () => {
    return sessions.filter((s) => {
      const sDate = new Date(s.session_date);
      if (viewMode === 'day') {
        return sDate.toDateString() === currentDate.toDateString();
      } else if (viewMode === 'week') {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        return sDate >= startOfWeek && sDate < endOfWeek;
      } else {
        // Month view
        return (
          sDate.getMonth() === currentDate.getMonth() &&
          sDate.getFullYear() === currentDate.getFullYear()
        );
      }
    });
  };

  const filteredSessions = getFilteredSessions();

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') next.setDate(next.getDate() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else next.setMonth(next.getMonth() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') next.setDate(next.getDate() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Smart Interactive Study Planner
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Spaced repetition schedules, pre-exam buffer days, and auto-rebalance for missed sessions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleAutoAdjust}
            disabled={autoAdjusting}
            className="px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold text-xs transition-all flex items-center gap-2"
            title="Automatically shifts overdue sessions forward and rebalances load"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${autoAdjusting ? 'animate-spin' : ''}`} />
            <span>{autoAdjusting ? 'Rebalancing...' : 'Auto-Adjust Missed Sessions'}</span>
          </button>

          <button
            onClick={() => setShowPlanModal(true)}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate AI Plan</span>
          </button>
        </div>
      </div>

      {/* Interactive Calendar Controls Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {viewMode === 'month'
              ? currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
              : viewMode === 'week'
              ? `Week of ${formatDate(currentDate.toISOString())}`
              : formatDate(currentDate.toISOString())}
          </span>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
          {(['day', 'week', 'month'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-xl capitalize transition-all ${
                viewMode === mode
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="space-y-3">
        {filteredSessions.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Sessions in this View Range
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Click "Generate AI Plan" to create an exam schedule based on your syllabus, or switch dates.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredSessions.map((session) => {
              const isCompleted = session.status === 'completed';
              return (
                <div
                  key={session.id}
                  className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
                    isCompleted
                      ? 'bg-slate-50/70 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400/50 hover:shadow-md'
                  }`}
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: session.subject_color || '#4f46e5' }}
                        />
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                          {session.subject_name}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                          session.session_type === 'mock_exam'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            : session.session_type === 'quiz'
                            ? 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                            : session.session_type === 'revision'
                            ? 'bg-sky-500/10 text-sky-600 border-sky-500/30'
                            : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30'
                        }`}
                      >
                        {session.session_type.replace('_', ' ')}
                      </span>
                    </div>

                    <h4
                      className={`text-xs font-bold leading-snug ${
                        isCompleted
                          ? 'line-through text-slate-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {session.title}
                    </h4>

                    {session.notes && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {session.notes}
                      </p>
                    )}
                  </div>

                  {/* Bottom bar */}
                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <span>{formatDate(session.session_date)}</span>
                      <span>&middot;</span>
                      <span>{formatMinutes(session.duration_minutes)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setRescheduleSession(session);
                          setNewSessionDate(session.session_date.substring(0, 10));
                        }}
                        className="text-[10px] font-semibold text-slate-400 hover:text-indigo-600 transition-colors px-1.5 py-0.5 rounded"
                        title="Reschedule session"
                      >
                        Reschedule
                      </button>

                      <button
                        onClick={() => handleToggleComplete(session.id, session.status)}
                        className={`p-1 rounded-lg transition-colors ${
                          isCompleted
                            ? 'text-emerald-500 hover:text-slate-400'
                            : 'text-slate-400 hover:text-emerald-500'
                        }`}
                        title={isCompleted ? 'Mark Pending' : 'Mark Completed'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Generate AI Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Generate AI Study Timetable</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Agent 2 calculates workload, intersperses spaced revision sessions, and reserves buffer days before your exam.
            </p>

            <form onSubmit={handleGeneratePlan} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Subject
                </label>
                <select
                  value={planSubjectId}
                  onChange={(e) => setPlanSubjectId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code || 'Course'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Exam Date *
                </label>
                <input
                  type="date"
                  required
                  value={planExamDate}
                  onChange={(e) => setPlanExamDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Daily Available Study Hours
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  step="0.5"
                  value={planDailyHours}
                  onChange={(e) => setPlanDailyHours(parseFloat(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Knowledge Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['beginner', 'intermediate', 'advanced'].map((lvl) => (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setPlanPrepLevel(lvl)}
                      className={`py-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                        planPrepLevel === lvl
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {generating ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Timetable</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Reschedule Study Session
            </h3>
            <p className="text-xs text-slate-400 mb-3 truncate">
              {rescheduleSession.title}
            </p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Date
                </label>
                <input
                  type="date"
                  required
                  value={newSessionDate}
                  onChange={(e) => setNewSessionDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRescheduleSession(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all"
                >
                  Save Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

