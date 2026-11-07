import React from 'react';
import {
  Flame,
  Clock,
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Bot,
  FileCheck2,
  HelpCircle,
  ArrowRight,
  TrendingUp,
  Award,
  Play
} from 'lucide-react';
import { DashboardAnalytics, Subject, StudySession } from '../types';
import { formatMinutes } from '../utils/formatters';

interface DashboardViewProps {
  analytics: DashboardAnalytics | null;
  onNavigate: (view: string) => void;
  onToggleSessionComplete: (sessionId: number, currentStatus: string) => void;
  onSelectSubject: (sub: Subject) => void;
  subjects: Subject[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  analytics,
  onNavigate,
  onToggleSessionComplete,
  onSelectSubject,
  subjects
}) => {
  const completionPct = analytics?.overall_completion_pct || 0;
  const streak = analytics?.study_streak_days || 1;
  const focusHours = analytics?.total_focus_hours || 0;
  const accuracy = analytics?.quiz_accuracy_pct || 0;
  const grade = analytics?.readiness_grade || 'B';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome & Motivational Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white p-6 sm:p-8 shadow-xl shadow-indigo-950/20">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-10 w-60 h-60 bg-violet-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-semibold mb-3 border border-white/10">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{streak} Day Study Streak &middot; Readiness Grade: {grade}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              Master Your Exams with Multi-Agent Intelligence
            </h1>
            <p className="text-indigo-200 text-xs sm:text-sm mt-2 leading-relaxed">
              {analytics?.recommended_action ||
                "Upload your lecture notes and syllabus to generate an exam-oriented timetable and start grounded RAG tutoring."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigate('focus')}
              className="px-4 py-2.5 rounded-2xl bg-white text-indigo-950 hover:bg-indigo-50 font-bold text-xs shadow-lg transition-all flex items-center gap-2 flex-shrink-0"
            >
              <Play className="w-4 h-4 fill-current text-indigo-600" />
              <span>Start Focus Mode</span>
            </button>
            <button
              onClick={() => onNavigate('tutor')}
              className="px-4 py-2.5 rounded-2xl bg-indigo-700/60 hover:bg-indigo-700 text-white border border-indigo-400/30 font-semibold text-xs transition-all flex items-center gap-2 flex-shrink-0"
            >
              <Bot className="w-4 h-4" />
              <span>Ask AI Tutor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 Key Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Overall Completion */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Syllabus Completion
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {completionPct}%
            </div>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
              Across all enrolled units
            </span>
          </div>
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="5"
                className="text-slate-100 dark:text-slate-800"
                fill="transparent"
              />
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="currentColor"
                strokeWidth="5"
                className="text-indigo-600 dark:text-indigo-500 transition-all duration-1000"
                strokeDasharray="138"
                strokeDashoffset={138 - (138 * completionPct) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <TrendingUp className="w-4 h-4 text-indigo-600 absolute" />
          </div>
        </div>

        {/* Metric 2: Study Streak */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Study Streak
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {streak} <span className="text-sm font-semibold text-slate-400">Days</span>
            </div>
            <span className="text-[11px] text-amber-500 font-medium">
              Daily habits active
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Metric 3: Focus Hours */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Deep Focus Hours
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {focusHours} <span className="text-sm font-semibold text-slate-400">hrs</span>
            </div>
            <span className="text-[11px] text-emerald-500 font-medium">
              Pomodoro tracked
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Quiz Accuracy */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Quiz Accuracy
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {accuracy}%
            </div>
            <span className="text-[11px] text-purple-500 font-medium">
              Tier Grade: {grade}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Schedule & Action Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Schedule (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Today's Study Timetable
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Allocated study blocks and revision checkpoints
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('planner')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Full Planner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {(!analytics?.todays_schedule || analytics.todays_schedule.length === 0) ? (
              <div className="py-8 text-center">
                <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  No sessions scheduled for today.
                </p>
                <button
                  onClick={() => onNavigate('planner')}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Generate Plan with AI
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.todays_schedule.map((session: StudySession) => {
                  const isCompleted = session.status === 'completed';
                  return (
                    <div
                      key={session.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isCompleted
                          ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                          : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-indigo-400/50 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => onToggleSessionComplete(session.id, session.status)}
                          className="flex-shrink-0 text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: session.subject_color || '#4f46e5' }}
                            />
                            <h4
                              className={`text-xs font-bold truncate ${
                                isCompleted
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {session.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                            <span>{session.subject_name}</span>
                            <span>&middot;</span>
                            <span>{formatMinutes(session.duration_minutes)}</span>
                            <span>&middot;</span>
                            <span className="capitalize">{session.session_type}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onNavigate('focus')}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5 flex-shrink-0"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Focus</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subject Mastery Progress Bars */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Course Subject Progress
              </h3>
              <button
                onClick={() => onNavigate('subjects')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Manage Subjects</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4">
              {analytics?.subject_breakdown?.map((sub) => (
                <div key={sub.subject_id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sub.color }} />
                      <span>{sub.name}</span>
                    </div>
                    <span className="text-slate-400 font-medium">
                      {sub.completed_topics}/{sub.total_topics} topics ({sub.progress_percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${sub.progress_percentage}%`,
                        backgroundColor: sub.color || '#4f46e5'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Exams & Quick Launch (1 col) */}
        <div className="space-y-6">
          {/* Upcoming Exams Countdown */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>Upcoming Assessments</span>
            </h3>

            {(!analytics?.upcoming_exams || analytics.upcoming_exams.length === 0) ? (
              <p className="text-xs text-slate-400 py-3">No upcoming exam dates set yet.</p>
            ) : (
              <div className="space-y-2.5">
                {analytics.upcoming_exams.map((exam) => (
                  <div
                    key={exam.subject_id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {exam.subject_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(exam.exam_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="inline-block px-2 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                        {exam.days_left} Days
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weak Topics Attention List */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Weak Topics to Revise</span>
              </h3>
            </div>

            <div className="space-y-2">
              {analytics?.weak_topics?.slice(0, 3).map((w, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-2xl bg-rose-500/5 border border-rose-500/15 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {w.topic_name}
                    </div>
                    <div className="text-[10px] text-rose-500 font-medium">
                      Accuracy: {w.accuracy}%
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('quiz')}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0"
                  >
                    Practice
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Launch Hub */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-50/50 to-violet-50/50 dark:from-slate-800/40 dark:to-slate-800/20 border border-indigo-100 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3">
              Quick Launch Tools
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigate('tutor')}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-left transition-all group"
              >
                <Bot className="w-5 h-5 text-indigo-500 mb-1 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">AI Tutor</div>
                <div className="text-[10px] text-slate-400">Step-by-step</div>
              </button>

              <button
                onClick={() => onNavigate('focus')}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-left transition-all group"
              >
                <Clock className="w-5 h-5 text-emerald-500 mb-1 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Pomodoro</div>
                <div className="text-[10px] text-slate-400">Deep study</div>
              </button>

              <button
                onClick={() => onNavigate('quiz')}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-left transition-all group"
              >
                <HelpCircle className="w-5 h-5 text-purple-500 mb-1 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Quiz Practice</div>
                <div className="text-[10px] text-slate-400">Self assessment</div>
              </button>

              <button
                onClick={() => onNavigate('exam')}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-left transition-all group"
              >
                <FileCheck2 className="w-5 h-5 text-amber-500 mb-1 group-hover:scale-110 transition-transform" />
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Mock Exam</div>
                <div className="text-[10px] text-slate-400">Rubric grading</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

