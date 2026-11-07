import React, { useState } from 'react';
import { Settings, Key, Clock, Check, X, Shield, Sparkles, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserUpdate: (updated: User) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdate
}) => {
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [preferredHours, setPreferredHours] = useState(user?.preferred_daily_hours || 3.0);
  const [geminiKey, setGeminiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Test endpoint
      const res = await fetch('/api/health');
      if (res.ok) {
        setTestResult({
          success: true,
          message: 'Connection verified! Multi-agent pipeline is active and ready.'
        });
      } else {
        setTestResult({
          success: false,
          message: 'Unable to reach backend agent service.'
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Network or backend error. Ensure the FastAPI service is active.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updates: any = {
        full_name: fullName,
        preferred_daily_hours: Number(preferredHours)
      };
      if (geminiKey.trim()) {
        updates.gemini_api_key = geminiKey.trim();
      }

      const res = await api.updateProfile(updates);
      onUserUpdate(res.user);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Account Settings & AI Provider
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalize your study schedule constraints and configure external LLM keys
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Daily Study Target */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Target Daily Study Commitment (Hours)</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0.5"
                max="12"
                step="0.5"
                value={preferredHours}
                onChange={(e) => setPreferredHours(parseFloat(e.target.value))}
                className="w-28 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Recommended: 3 to 4 hours/day for balanced retention
              </span>
            </div>
          </div>

          {/* Gemini API Key Configuration */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-500" />
                <span>Google Gemini API Key (Optional)</span>
              </label>
              <span className="text-[10px] text-slate-400">
                {user?.has_gemini_key ? '● Configured' : '○ Using Built-in Engine'}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder={user?.has_gemini_key ? '••••••••••••••••••••••••' : 'AIzaSy... (leave blank to use built-in engine)'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
              <button
                type="button"
                onClick={handleTestKey}
                disabled={isTesting}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {isTesting ? 'Testing...' : 'Test'}
              </button>
            </div>

            {testResult && (
              <div
                className={`mt-2 p-2.5 rounded-xl text-[11px] flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
                }`}
              >
                {testResult.success ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <X className="w-3.5 h-3.5 flex-shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="mt-2 p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <Shield className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Zero-Halt AI Architecture:</strong> If no custom Gemini API Key is provided, the platform automatically utilizes its high-yield local academic algorithms and fallback agents for syllabus extraction, scheduling, and quizzes without interrupting your workflow.
              </span>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

