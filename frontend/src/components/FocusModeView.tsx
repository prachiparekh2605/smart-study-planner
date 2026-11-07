import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Sparkles,
  Bot,
  Flame,
  Award,
  Send,
  Sliders
} from 'lucide-react';
import { FocusStats, Subject } from '../types';
import { api } from '../services/api';
import { soundGen } from '../utils/soundGenerator';

interface FocusModeViewProps {
  selectedSubject: Subject | null;
  onRefreshDashboard?: () => void;
}

export const FocusModeView: React.FC<FocusModeViewProps> = ({
  selectedSubject,
  onRefreshDashboard
}) => {
  const [intervalType, setIntervalType] = useState<'25/5' | '50/10' | 'custom'>('25/5');
  const [studyMinutes, setStudyMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [topicFocus, setTopicFocus] = useState('');
  const [sessionGoal, setSessionGoal] = useState('');

  // Ambient sound
  const [activeSound, setActiveSound] = useState<'rain' | 'forest' | 'whitenoise' | 'cafe' | null>(null);
  const [volume, setVolume] = useState(0.4);

  // Stats
  const [stats, setStats] = useState<FocusStats | null>(null);

  // In-focus quick AI helper
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [quickPrompt, setQuickPrompt] = useState('');
  const [quickAnswer, setQuickAnswer] = useState<string | null>(null);
  const [askingAi, setAskingAi] = useState(false);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    loadStats();
    return () => {
      soundGen.stop();
    };
  }, []);

  useEffect(() => {
    let timer: any;
    if (isRunning && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && secondsLeft === 0) {
      soundGen.playTimerChime();
      if (!isBreak) {
        // Study interval finished, log session!
        handleLogSession();
        setIsBreak(true);
        setSecondsLeft(breakMinutes * 60);
      } else {
        // Break finished
        setIsBreak(false);
        setSecondsLeft(studyMinutes * 60);
        setIsRunning(false);
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, secondsLeft, isBreak, breakMinutes, studyMinutes]);

  const loadStats = async () => {
    try {
      const data = await api.getFocusStats();
      setStats(data);
    } catch {
      // ignore
    }
  };

  const handleLogSession = async () => {
    try {
      await api.logFocusSession({
        subject_id: selectedSubject?.id,
        topic_name: topicFocus || (selectedSubject ? `${selectedSubject.name} Focus` : 'Deep Study Session'),
        duration_minutes: studyMinutes,
        interval_type: intervalType,
        notes: sessionGoal || undefined
      });
      await loadStats();
      onRefreshDashboard?.();
    } catch {
      // ignore
    }
  };

  const handleIntervalChange = (type: '25/5' | '50/10' | 'custom') => {
    setIntervalType(type);
    setIsRunning(false);
    setIsBreak(false);
    if (type === '25/5') {
      setStudyMinutes(25);
      setBreakMinutes(5);
      setSecondsLeft(25 * 60);
    } else if (type === '50/10') {
      setStudyMinutes(50);
      setBreakMinutes(10);
      setSecondsLeft(50 * 60);
    } else {
      setStudyMinutes(30);
      setBreakMinutes(5);
      setSecondsLeft(30 * 60);
    }
  };

  const toggleSound = (sound: 'rain' | 'forest' | 'whitenoise' | 'cafe') => {
    if (activeSound === sound) {
      soundGen.stop();
      setActiveSound(null);
    } else {
      soundGen.playAmbient(sound, volume);
      setActiveSound(sound);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    soundGen.setVolume(newVol);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleQuickAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim() || !selectedSubject) return;
    setAskingAi(true);
    setQuickAnswer(null);
    try {
      const res = await api.askTutor(selectedSubject.id, quickPrompt, 'quick_summary');
      setQuickAnswer(res.answer);
    } catch (err: any) {
      setQuickAnswer(`Error: ${err.message}`);
    } finally {
      setAskingAi(false);
    }
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progressPct = (( (isBreak ? breakMinutes : studyMinutes) * 60 - secondsLeft) / ((isBreak ? breakMinutes : studyMinutes) * 60)) * 100;

  return (
    <div className={`space-y-6 animate-fade-in ${isFullscreen ? 'p-8 bg-slate-950 min-h-screen text-white' : ''}`}>
      {/* Top Header & Fullscreen Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Distraction-Free Focus Mode
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pomodoro pacing, synthesized ambient soundscapes, and focused learning
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAiDrawer(!showAiDrawer)}
            className="px-3.5 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold text-xs border border-indigo-200 dark:border-indigo-900 flex items-center gap-1.5 hover:bg-indigo-100 transition-colors"
          >
            <Bot className="w-4 h-4" />
            <span>AI Topic Assistant</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Distraction-Free Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Focus Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timer Card (2 cols) */}
        <div className="lg:col-span-2 p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold relative z-10">
            {(['25/5', '50/10', 'custom'] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleIntervalChange(t)}
                className={`px-4 py-1.5 rounded-xl transition-all ${
                  intervalType === t
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {t === '25/5' ? '25/5 Standard' : t === '50/10' ? '50/10 Deep Work' : 'Custom'}
              </button>
            ))}
          </div>

          {/* Topic & Goal Inputs */}
          <div className="w-full max-w-md space-y-2 relative z-10">
            <input
              type="text"
              placeholder="What topic are you studying? (e.g. Raft Consensus)"
              value={topicFocus}
              onChange={(e) => setTopicFocus(e.target.value)}
              className="w-full px-4 py-2 rounded-2xl text-center text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              placeholder="Session Goal: (e.g. Master leader election invariant)"
              value={sessionGoal}
              onChange={(e) => setSessionGoal(e.target.value)}
              className="w-full px-4 py-1.5 rounded-xl text-center text-[11px] bg-transparent border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Circular Countdown Display */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center relative z-10">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="44%"
                stroke="currentColor"
                strokeWidth="8"
                className="text-slate-100 dark:text-slate-800"
                fill="transparent"
              />
              <circle
                cx="50%"
                cy="50%"
                r="44%"
                stroke="currentColor"
                strokeWidth="8"
                className={`transition-all duration-1000 ${
                  isBreak ? 'text-emerald-500' : 'text-indigo-600 dark:text-indigo-500'
                }`}
                strokeDasharray="600"
                strokeDashoffset={600 - (600 * progressPct) / 100}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            <div className="absolute flex flex-col items-center">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 ${
                  isBreak
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                }`}
              >
                {isBreak ? 'Short Break' : 'Focus Session'}
              </span>
              <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
              </div>
              <span className="text-[11px] text-slate-400 mt-1">
                {isBreak ? 'Rest your eyes & hydrate' : selectedSubject?.name || 'Academic Focus'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 relative z-10">
            <button
              onClick={() => {
                setIsRunning(false);
                setSecondsLeft((isBreak ? breakMinutes : studyMinutes) * 60);
              }}
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              title="Reset Timer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsRunning(!isRunning)}
              className="px-8 py-4 rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2.5 scale-105 active:scale-95"
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Pause Timer</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>{secondsLeft === studyMinutes * 60 ? 'Start Focus' : 'Resume'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleLogSession}
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-500 hover:text-emerald-600 transition-colors"
              title="Mark Completed & Log Session"
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Ambient Soundscapes & Stats (1 col) */}
        <div className="space-y-6">
          {/* Ambient Sound Player Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-indigo-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Ambient Focus Soundscapes
                </h3>
              </div>
              {activeSound && (
                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Playing</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'rain', label: '🌧️ Gentle Rain' },
                { id: 'forest', label: '🌲 Forest Breeze' },
                { id: 'cafe', label: '☕ Cozy Cafe' },
                { id: 'whitenoise', label: '🌊 Pink Noise' }
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleSound(s.id as any)}
                  className={`p-3 rounded-2xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                    activeSound === s.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span>{s.label}</span>
                </button>
              ))}
            </div>

            {/* Volume slider */}
            <div className="pt-2 flex items-center gap-3">
              <span className="text-[11px] text-slate-400 font-medium">Volume</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg"
              />
            </div>
          </div>

          {/* Daily & Weekly Focus Stats Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Focus Velocity</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 font-medium">Today</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {stats?.today_hours || 0} hrs
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 font-medium">This Week</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {stats?.weekly_hours || 0} hrs
                </div>
              </div>
            </div>

            {/* 7-day mini bar graph */}
            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-400">
                Last 7 Days (Minutes per Day)
              </span>
              <div className="flex items-end justify-between h-20 pt-3 gap-1.5">
                {stats?.daily_breakdown?.map((d, idx) => {
                  const maxMins = Math.max(...(stats.daily_breakdown.map((x) => x.minutes)), 60);
                  const barHeight = Math.max(10, Math.round((d.minutes / maxMins) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end justify-center h-full">
                        <div
                          className="w-full max-w-[14px] rounded-t-md bg-indigo-500 transition-all duration-500"
                          style={{ height: `${barHeight}%` }}
                          title={`${d.day_name}: ${d.minutes} mins`}
                        />
                      </div>
                      <span className="text-[9px] font-semibold text-slate-400">{d.day_name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick In-Focus AI Question Drawer */}
      {showAiDrawer && (
        <div className="p-6 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-950 dark:text-indigo-200">
              <Bot className="w-4 h-4 text-indigo-600" />
              <span>In-Focus Quick Concept Helper</span>
            </div>
            <button
              onClick={() => setShowAiDrawer(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleQuickAsk} className="flex gap-2">
            <input
              type="text"
              placeholder="Ask a quick concept definition or formula without leaving focus mode..."
              value={quickPrompt}
              onChange={(e) => setQuickPrompt(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs text-slate-900 dark:text-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={askingAi || !quickPrompt.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {askingAi ? 'Searching Notes...' : 'Ask AI'}
            </button>
          </form>

          {quickAnswer && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
              {quickAnswer}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

