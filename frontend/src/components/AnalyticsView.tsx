import React from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  BookOpen,
  HelpCircle,
  Flame
} from 'lucide-react';
import { DashboardAnalytics, Subject } from '../types';

interface AnalyticsViewProps {
  analytics: DashboardAnalytics | null;
  onNavigate: (view: string) => void;
  onSelectSubject: (sub: Subject) => void;
  subjects: Subject[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  analytics,
  onNavigate,
  onSelectSubject,
  subjects
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Performance Diagnostics & Learning Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Holistic analysis powered by Agent 6: syllabus velocity, accuracy metrics, and mastery grading
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-600" />
            <span>Overall Readiness Grade: {analytics?.readiness_grade || 'B'}</span>
          </div>
        </div>
      </div>

      {/* AI Recommendation Spotlight Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-violet-500/10 border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30 flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Agent 6 Recommendation
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              Recommended Next Action:
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              {analytics?.recommended_action ||
                'Continue following your daily study plan and take diagnostic checkpoint quizzes.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('quiz')}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 flex-shrink-0 self-start md:self-auto"
        >
          <span>Take Action</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 4 Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs text-slate-400 font-medium">Syllabus Completion</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {analytics?.overall_completion_pct || 0}%
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full"
              style={{ width: `${analytics?.overall_completion_pct || 0}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs text-slate-400 font-medium">Consecutive Study Streak</span>
          <div className="text-2xl font-bold text-amber-500 flex items-center gap-2">
            <span>{analytics?.study_streak_days || 1} Days</span>
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <span className="text-[11px] text-slate-400">Regular active recall</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs text-slate-400 font-medium">Deep Focus Hours</span>
          <div className="text-2xl font-bold text-emerald-500">
            {analytics?.total_focus_hours || 0} hrs
          </div>
          <span className="text-[11px] text-slate-400">Pomodoro intervals tracked</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <span className="text-xs text-slate-400 font-medium">Quiz Accuracy</span>
          <div className="text-2xl font-bold text-purple-500">
            {analytics?.quiz_accuracy_pct || 0}%
          </div>
          <span className="text-[11px] text-slate-400">Across {analytics?.total_quizzes_taken || 0} quizzes</span>
        </div>
      </div>

      {/* Main Grid: Subject Mastery & Weak vs Strong Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Subject Mastery Progress Breakdown */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <span>Subject Mastery Levels</span>
            </h3>
            <span className="text-[11px] text-slate-400">Topics Done / Total</span>
          </div>

          <div className="space-y-4">
            {analytics?.subject_breakdown?.map((sub) => (
              <div key={sub.subject_id} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sub.color }} />
                    <span>{sub.name}</span>
                  </div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    {sub.completed_topics}/{sub.total_topics} ({sub.progress_percentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
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

        {/* Right: Weak Topics Attention & Revision Priorities */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Weak Topics Needing Immediate Revision</span>
            </h3>
            <button
              onClick={() => onNavigate('quiz')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Practice Quiz
            </button>
          </div>

          <div className="space-y-3">
            {(!analytics?.weak_topics || analytics.weak_topics.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No weak topics flagged! Keep taking quizzes to identify gaps.
              </div>
            ) : (
              analytics.weak_topics.map((w, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {w.topic_name}
                    </h4>
                    <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                      Accuracy: {w.accuracy}% &middot; {w.status}
                    </span>
                  </div>

                  <button
                    onClick={() => onNavigate('tutor')}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors shadow-sm"
                  >
                    Tutor Me
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Strong topics preview */}
          {analytics?.strong_topics && analytics.strong_topics.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Strong Mastery Topics ({analytics.strong_topics.length})</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {analytics.strong_topics.map((st, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold"
                  >
                    ✓ {st.topic_name} ({st.accuracy}%)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

