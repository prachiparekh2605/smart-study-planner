import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Sparkles,
  Clock,
  Flag,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Award,
  ChevronRight,
  Send,
  Eye,
  BookOpen
} from 'lucide-react';
import { MockExamData, MockQuestion, Subject } from '../types';
import { api } from '../services/api';

interface ExamSimulatorViewProps {
  selectedSubject: Subject | null;
  subjects: Subject[];
  onSelectSubject: (sub: Subject) => void;
}

export const ExamSimulatorView: React.FC<ExamSimulatorViewProps> = ({
  selectedSubject,
  subjects,
  onSelectSubject
}) => {
  const [exam, setExam] = useState<MockExamData | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Exam generator settings
  const [examTitle, setExamTitle] = useState('');
  const [durationMins, setDurationMins] = useState(60);
  const [totalMarks, setTotalMarks] = useState(50);
  const [difficulty, setDifficulty] = useState('medium');
  const [generating, setGenerating] = useState(false);

  // Active exam state
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(3600);
  const [examActive, setExamActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [evaluationReport, setEvaluationReport] = useState<any | null>(null);

  useEffect(() => {
    if (selectedSubject) {
      loadHistory(selectedSubject.id);
    }
  }, [selectedSubject]);

  useEffect(() => {
    let interval: any;
    if (examActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [examActive, secondsRemaining]);

  const loadHistory = async (subId: number) => {
    setLoadingHistory(true);
    try {
      const data = await api.getExamHistory(subId);
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleGenerateExam = async () => {
    if (!selectedSubject) return;
    setGenerating(true);
    setEvaluationReport(null);
    setAnswers({});
    setFlagged({});
    try {
      const res = await api.generateExam(
        selectedSubject.id,
        examTitle || undefined,
        durationMins,
        totalMarks,
        difficulty
      );
      const fullExam = await api.getExam(res.exam_id);
      setExam(fullExam);
      setCurrentQIndex(0);
      setSecondsRemaining(durationMins * 60);
      setExamActive(true);
    } catch (err: any) {
      alert(err.message || 'Failed to generate mock exam paper.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAutoSubmit = async () => {
    alert('Time has expired! Submitting your exam automatically.');
    handleSubmitExam();
  };

  const handleSubmitExam = async () => {
    if (!exam) return;
    setSubmitting(true);
    setExamActive(false);

    try {
      const payloadAnswers = exam.questions.map((q) => ({
        question_id: q.id,
        student_answer: answers[q.id] || '',
        is_flagged: flagged[q.id] || false
      }));

      const spentSecs = durationMins * 60 - secondsRemaining;
      const res = await api.submitExam(exam.id, payloadAnswers, spentSecs);
      const updatedExam = await api.getExam(exam.id);
      setExam(updatedExam);
      setEvaluationReport(res);
      if (selectedSubject) loadHistory(selectedSubject.id);
    } catch (err: any) {
      alert(err.message || 'Failed to submit exam paper.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCountdown = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const activeQuestion: MockQuestion | undefined = exam?.questions[currentQIndex];
  const isTimeCritical = secondsRemaining < 300 && examActive;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Formal Examination Simulator
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real exam simulation with objective & subjective rubric-based AI grading
          </p>
        </div>

        {examActive && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border font-mono font-bold text-sm shadow-sm transition-colors ${
              isTimeCritical
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400 animate-pulse'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>Time Remaining: {formatCountdown(secondsRemaining)}</span>
          </div>
        )}
      </div>

      {!exam ? (
        /* Setup / Config View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Exam Paper Generator
              </h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Course Subject
              </label>
              <select
                value={selectedSubject?.id || ''}
                onChange={(e) => {
                  const s = subjects.find((sub) => sub.id === Number(e.target.value));
                  if (s) onSelectSubject(s);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Paper Title (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Mid-Term Comprehensive Exam"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Duration (Mins)
                </label>
                <select
                  value={durationMins}
                  onChange={(e) => setDurationMins(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={30}>30 mins</option>
                  <option value={60}>60 mins</option>
                  <option value={90}>90 mins</option>
                  <option value={120}>120 mins</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Total Marks
                </label>
                <select
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={30}>30 Marks</option>
                  <option value={50}>50 Marks</option>
                  <option value={100}>100 Marks</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateExam}
              disabled={generating || !selectedSubject}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              {generating ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Exam Paper with AI</span>
                </>
              )}
            </button>
          </div>

          {/* Previous Exam History (2 cols) */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-indigo-500" />
              <span>Past Examination History</span>
            </h3>

            {loadingHistory ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading exam records...</div>
            ) : history.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No past mock tests recorded yet. Generate your first paper to simulate real conditions!
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {h.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <span>{new Date(h.created_at).toLocaleDateString()}</span>
                        <span>&middot;</span>
                        <span>Total: {h.total_marks} Marks</span>
                        <span>&middot;</span>
                        <span className="capitalize">{h.status}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {h.percentage !== null ? (
                        <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                          {h.scored_marks}/{h.total_marks} ({h.percentage}%)
                        </span>
                      ) : (
                        <span className="text-xs text-amber-500 font-semibold">Unsubmitted</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Active Live Exam Interface */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Display (3 cols) */}
          <div className="lg:col-span-3 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {activeQuestion?.section} &middot; {activeQuestion?.marks} Marks
                </span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-0.5">
                  Question {currentQIndex + 1} of {exam.questions.length}
                </h3>
              </div>

              {examActive && (
                <button
                  onClick={() =>
                    activeQuestion &&
                    setFlagged((prev) => ({
                      ...prev,
                      [activeQuestion.id]: !prev[activeQuestion.id]
                    }))
                  }
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    activeQuestion && flagged[activeQuestion.id]
                      ? 'bg-amber-500/10 text-amber-600 border-amber-500/40'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>
                    {activeQuestion && flagged[activeQuestion.id] ? 'Flagged for Review' : 'Flag Question'}
                  </span>
                </button>
              )}
            </div>

            {/* Question Text */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
              {activeQuestion?.question_text}
            </div>

            {/* Input / Options */}
            {activeQuestion?.question_type === 'objective' && activeQuestion.options ? (
              <div className="space-y-2.5">
                {activeQuestion.options.map((opt, oIdx) => {
                  const isSelected = answers[activeQuestion.id] === opt;
                  return (
                    <label
                      key={oIdx}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 font-semibold text-indigo-900 dark:text-indigo-200'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q_${activeQuestion.id}`}
                        value={opt}
                        checked={isSelected}
                        onChange={() =>
                          setAnswers((prev) => ({ ...prev, [activeQuestion.id]: opt }))
                        }
                        disabled={!examActive}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Write Your Comprehensive Answer (Derivations, definitions, and step-by-step points):
                </label>
                <textarea
                  rows={8}
                  placeholder="State assumptions, governing formulas, and step-by-step analytical derivation..."
                  value={answers[activeQuestion?.id || 0] || ''}
                  onChange={(e) =>
                    activeQuestion &&
                    setAnswers((prev) => ({ ...prev, [activeQuestion.id]: e.target.value }))
                  }
                  disabled={!examActive}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 leading-relaxed font-mono"
                />
              </div>
            )}

            {/* Evaluation report feedback for this question if completed */}
            {!examActive && activeQuestion?.awarded_marks !== null && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-indigo-950 dark:text-indigo-200">
                  <span>AI Rubric Evaluation:</span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    Awarded: {activeQuestion?.awarded_marks} / {activeQuestion?.marks} Marks
                  </span>
                </div>
                {activeQuestion?.feedback && (
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    <strong>Feedback:</strong> {activeQuestion.feedback}
                  </p>
                )}
                {activeQuestion?.ideal_answer && (
                  <div className="pt-2 border-t border-indigo-200/50 dark:border-indigo-900/40 text-[11px] text-slate-600 dark:text-slate-400">
                    <strong>Model Ideal Answer:</strong> {activeQuestion.ideal_answer}
                  </div>
                )}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQIndex === 0}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40"
              >
                Previous Question
              </button>

              <button
                onClick={() =>
                  setCurrentQIndex((prev) => Math.min(exam.questions.length - 1, prev + 1))
                }
                disabled={currentQIndex === exam.questions.length - 1}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40"
              >
                Next Question
              </button>
            </div>
          </div>

          {/* Question Palette Sidebar (1 col) */}
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Question Palette
              </h4>

              <div className="grid grid-cols-4 gap-2">
                {exam.questions.map((q, qIdx) => {
                  const hasAnswer = Boolean(answers[q.id]?.trim());
                  const isFlag = Boolean(flagged[q.id]);
                  const isCurrent = currentQIndex === qIdx;

                  let bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
                  if (isFlag) bgClass = 'bg-amber-500/20 text-amber-600 border border-amber-500/40';
                  else if (hasAnswer) bgClass = 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/40 font-bold';

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQIndex(qIdx)}
                      className={`h-9 rounded-xl text-xs font-semibold transition-all ${bgClass} ${
                        isCurrent ? 'ring-2 ring-indigo-500 font-bold scale-105' : ''
                      }`}
                    >
                      {qIdx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Flagged for Review</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span>Unvisited</span>
                </div>
              </div>

              {examActive ? (
                <button
                  onClick={handleSubmitExam}
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Evaluating Paper...' : 'Submit Final Paper'}</span>
                </button>
              ) : (
                <button
                  onClick={() => setExam(null)}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                >
                  Return to Exam Center
                </button>
              )}
            </div>

            {/* Scorecard Summary if completed */}
            {evaluationReport && (
              <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-100">
                  Official Scorecard
                </span>
                <div className="text-3xl font-extrabold">
                  {evaluationReport.scored_marks} / {evaluationReport.total_marks}
                </div>
                <div className="text-xs font-semibold text-indigo-100">
                  Percentage: {evaluationReport.percentage}%
                </div>
                <p className="text-xs text-indigo-100 pt-1 leading-relaxed border-t border-white/20">
                  {evaluationReport.feedback}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

