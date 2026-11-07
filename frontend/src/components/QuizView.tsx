import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Award,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuizData, QuizQuestion, Subject } from '../types';
import { api } from '../services/api';

interface QuizViewProps {
  selectedSubject: Subject | null;
  subjects: Subject[];
  onSelectSubject: (sub: Subject) => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  selectedSubject,
  subjects,
  onSelectSubject
}) => {
  const [activeTab, setActiveTab] = useState<'practice' | 'mistakes'>('practice');
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [topicName, setTopicName] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [quizType, setQuizType] = useState('topic');
  const [generating, setGenerating] = useState(false);

  // Answering state
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Mistake bank state
  const [mistakes, setMistakes] = useState<any[]>([]);
  const [loadingMistakes, setLoadingMistakes] = useState(false);

  useEffect(() => {
    let interval: any;
    if (timerActive) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  useEffect(() => {
    if (selectedSubject && activeTab === 'mistakes') {
      loadMistakes(selectedSubject.id);
    }
  }, [selectedSubject, activeTab]);

  const loadMistakes = async (subId: number) => {
    setLoadingMistakes(true);
    try {
      const data = await api.getMistakeBank(subId);
      setMistakes(data);
    } catch {
      setMistakes([]);
    } finally {
      setLoadingMistakes(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!selectedSubject) return;
    setGenerating(true);
    setResults(null);
    setAnswers({});
    setTimerSeconds(0);
    try {
      const data = await api.generateQuiz(
        selectedSubject.id,
        topicName || undefined,
        difficulty,
        numQuestions,
        quizType
      );
      setQuiz(data);
      setTimerActive(true);
    } catch (err: any) {
      alert(err.message || 'Failed to generate quiz.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswerChange = (questionId: number, val: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  const handleSubmitQuiz = async () => {
    if (!quiz) return;
    setSubmitting(true);
    setTimerActive(false);

    try {
      const payloadAnswers = quiz.questions.map((q) => ({
        question_id: q.id,
        student_answer: answers[q.id] || ''
      }));

      const res = await api.submitQuiz(quiz.id, payloadAnswers, timerSeconds);
      setResults(res);

      if (res.score_percentage >= 80) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Quiz & Self-Assessment Series
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Test retention, generate unit quizzes, and practice the Mistake Bank
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('practice')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'practice'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Practice Quizzes
          </button>
          <button
            onClick={() => setActiveTab('mistakes')}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'mistakes'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Mistake Bank
          </button>
        </div>
      </div>

      {activeTab === 'practice' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configurator Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Quiz Generator Configurator
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
                Topic Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Banker's Algorithm, Paging"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['easy', 'medium', 'hard'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`py-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                      difficulty === d
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Number of Questions
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[3, 5, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNumQuestions(n)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      numQuestions === n
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {n} Questions
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateQuiz}
              disabled={generating || !selectedSubject}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              {generating ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Quiz with AI</span>
                </>
              )}
            </button>
          </div>

          {/* Active Quiz Area (2 cols) */}
          <div className="lg:col-span-2">
            {!quiz ? (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <HelpCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Ready to Practice?
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Configure your subject and parameters on the left, then click "Generate Quiz with AI" to begin.
                </p>
              </div>
            ) : (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                {/* Quiz Header & Timer */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {quiz.title}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {quiz.total_questions} Questions &middot; Difficulty: {difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{formatTimer(timerSeconds)}</span>
                  </div>
                </div>

                {/* Score Banner if submitted */}
                {results && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        Quiz Completed!
                      </div>
                      <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {results.score_percentage}% ({results.correct_count}/{results.total_questions} correct)
                      </div>
                    </div>
                    <button
                      onClick={handleGenerateQuiz}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake / New Quiz</span>
                    </button>
                  </div>
                )}

                {/* Questions List */}
                <div className="space-y-6">
                  {quiz.questions.map((q, idx) => {
                    const studentAns = answers[q.id];
                    const questionResult = results?.results?.find((r: any) => r.question_id === q.id);

                    return (
                      <div
                        key={q.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          questionResult
                            ? questionResult.is_correct
                              ? 'bg-emerald-500/5 border-emerald-500/30'
                              : 'bg-rose-500/5 border-rose-500/30'
                            : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                            <span className="text-indigo-600 dark:text-indigo-400 mr-1.5">
                              {idx + 1}.
                            </span>
                            {q.question_text}
                          </h4>

                          {questionResult && (
                            <span className="flex-shrink-0">
                              {questionResult.is_correct ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-500" />
                              )}
                            </span>
                          )}
                        </div>

                        {/* Options */}
                        {q.options && q.options.length > 0 ? (
                          <div className="space-y-2">
                            {q.options.map((opt, oIdx) => {
                              const isSelected = studentAns === opt;
                              return (
                                <label
                                  key={oIdx}
                                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 font-semibold text-indigo-900 dark:text-indigo-200'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`q_${q.id}`}
                                    value={opt}
                                    checked={isSelected}
                                    onChange={() => handleAnswerChange(q.id, opt)}
                                    disabled={Boolean(results)}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <div>
                            <input
                              type="text"
                              placeholder="Type your answer here..."
                              value={studentAns || ''}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              disabled={Boolean(results)}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        )}

                        {/* Explanation after submit */}
                        {questionResult && (
                          <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] leading-relaxed space-y-1">
                            <div className="font-bold text-slate-700 dark:text-slate-300">
                              Correct Answer: <span className="text-emerald-600 font-normal">{questionResult.correct_answer}</span>
                            </div>
                            {questionResult.explanation && (
                              <p className="text-slate-500 dark:text-slate-400">
                                💡 <strong>Explanation:</strong> {questionResult.explanation}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!results && (
                  <div className="pt-4 flex justify-end">
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={submitting}
                      className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? 'Evaluating Answers...' : 'Submit Quiz for AI Grading'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Mistake Bank Tab */
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Mistake Bank Practice Vault</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Targeted review of questions you previously got wrong to convert weak spots into strengths
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {mistakes.length} Logged Error(s)
            </span>
          </div>

          {loadingMistakes ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading previous errors...</div>
          ) : mistakes.length === 0 ? (
            <div className="py-12 text-center">
              <Award className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Logged Mistakes!
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                You currently have no unreviewed mistakes in this subject. Keep practicing to discover and fix gaps!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {mistakes.map((m, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="font-bold text-slate-900 dark:text-white">
                    {m.question_text}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                      <strong>Your Answer:</strong> {m.student_answer || 'No answer'}
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      <strong>Correct Answer:</strong> {m.correct_answer}
                    </div>
                  </div>
                  {m.explanation && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">
                      💡 {m.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

