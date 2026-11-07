import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  Image as ImageIcon,
  RotateCcw,
  Paperclip,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Flame,
  Zap,
  HelpCircle,
  Compass
} from 'lucide-react';
import { TutorMessage, Subject, TutorCitation } from '../types';
import { api } from '../services/api';

interface AITutorViewProps {
  selectedSubject: Subject | null;
  subjects: Subject[];
  onSelectSubject: (sub: Subject) => void;
}

export const AITutorView: React.FC<AITutorViewProps> = ({
  selectedSubject,
  subjects,
  onSelectSubject
}) => {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'student_friendly' | 'step_by_step' | 'academic' | 'quick_summary'>('student_friendly');
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<number | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<TutorCitation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedSubject) {
      loadChatHistory(selectedSubject.id);
    }
  }, [selectedSubject]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadChatHistory = async (subjectId: number) => {
    try {
      const data = await api.getTutorHistory(subjectId);
      setChatId(data.chat_id);
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
      } else {
        // Welcome intro message
        setMessages([
          {
            role: 'assistant',
            content: `Hello! I am your personal **AI Tutor** for **${selectedSubject?.name || 'your course'}**.\n\nI am grounded in your actual uploaded notes, lecture slides, and curriculum syllabus. Ask me anything from conceptual analogies to step-by-step numerical derivations!`,
            citations: []
          }
        ]);
      }
    } catch {
      // ignore
    }
  };

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || prompt;
    if (!textToSend.trim() || !selectedSubject || loading) return;

    const userMsg: TutorMessage = {
      role: 'user',
      content: textToSend
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    try {
      const res = await api.askTutor(selectedSubject.id, textToSend, mode, chatId || undefined);
      setChatId(res.chat_id);

      const asstMsg: TutorMessage = {
        role: 'assistant',
        content: res.answer,
        citations: res.citations
      };
      setMessages((prev) => [...prev, asstMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error consulting AI Tutor: ${err.message || 'Please check your connection.'}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!selectedSubject) return;
    if (!confirm('Clear tutoring conversation history for this subject?')) return;
    try {
      await api.clearTutorHistory(selectedSubject.id);
      setChatId(null);
      setMessages([
        {
          role: 'assistant',
          content: `Chat history cleared. What would you like to review in **${selectedSubject.name}** today?`,
          citations: []
        }
      ]);
    } catch (err: any) {
      alert(err.message || 'Failed to clear chat');
    }
  };

  const quickPrompts = [
    'Explain the primary governing law with an intuitive analogy.',
    'Solve a numerical problem step-by-step with given data & formulas.',
    'What are the most frequent exam traps and pitfalls for this topic?',
    'Summarize this into a 5-bullet high-yield exam cheat sheet.'
  ];

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
      {/* Tutor Header & Mode Selector */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Personal AI Subject Tutor
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                RAG Grounded
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {selectedSubject ? `Grounded in ${selectedSubject.name}` : 'Select a course to begin'}
            </p>
          </div>
        </div>

        {/* Pedagogical Mode Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
          {[
            { id: 'student_friendly', label: '💡 Analogies' },
            { id: 'step_by_step', label: '📐 Step-by-Step' },
            { id: 'academic', label: '🎓 Academic' },
            { id: 'quick_summary', label: '⚡ Cheat Sheet' }
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id as any)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                mode === m.id
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {m.label}
            </button>
          ))}
          <button
            onClick={handleClearHistory}
            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors ml-1"
            title="Clear Chat History"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-sm'
                }`}
              >
                {isUser ? 'You' : <Bot className="w-4 h-4" />}
              </div>

              <div className="space-y-2 max-w-[85%]">
                <div
                  className={`p-4 rounded-3xl text-xs leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Grounded Source Citations */}
                {!isUser && msg.citations && msg.citations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-indigo-500" />
                      <span>Sources:</span>
                    </span>
                    {msg.citations.map((c, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => setSelectedCitation(c)}
                        className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium hover:bg-indigo-100 transition-colors flex items-center gap-1"
                        title={c.snippet}
                      >
                        <span>{c.source} (p. {c.page_or_slide})</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 text-xs shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span>Synthesizing grounded explanation from notes...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Citation Popover Drawer */}
      {selectedCitation && (
        <div className="p-3 mx-4 mb-2 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-900 flex items-start justify-between gap-3 text-xs">
          <div>
            <div className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>
                Verified Citation: {selectedCitation.source} (Page/Slide {selectedCitation.page_or_slide})
              </span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 mt-1 italic font-mono text-[11px]">
              "{selectedCitation.snippet}"
            </p>
          </div>
          <button
            onClick={() => setSelectedCitation(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Quick Prompts Chips */}
      <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs bg-slate-50/30 dark:bg-slate-900/40">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
          Try:
        </span>
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            onClick={() => handleSend(undefined, qp)}
            className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-400 text-[11px] font-medium transition-colors whitespace-nowrap flex-shrink-0"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <form onSubmit={(e) => handleSend(e)} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
        <input
          type="text"
          placeholder={
            selectedSubject
              ? `Ask a concept question, derivation, or problem in ${selectedSubject.name}...`
              : 'Please select a subject above to ask questions...'
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={!selectedSubject || loading}
          className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 transition-all placeholder-slate-400"
        />

        <button
          type="submit"
          disabled={!prompt.trim() || !selectedSubject || loading}
          className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

