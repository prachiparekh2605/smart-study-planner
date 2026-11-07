import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { SubjectsView } from './components/SubjectsView';
import { PlannerView } from './components/PlannerView';
import { MaterialsView } from './components/MaterialsView';
import { AITutorView } from './components/AITutorView';
import { QuizView } from './components/QuizView';
import { ExamSimulatorView } from './components/ExamSimulatorView';
import { FocusModeView } from './components/FocusModeView';
import { RevisionView } from './components/RevisionView';
import { AnalyticsView } from './components/AnalyticsView';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { api } from './services/api';
import { Subject, StudySession, DashboardAnalytics, User } from './types';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('ssp_theme') === 'dark' ||
      (!localStorage.getItem('ssp_theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);

  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Apply dark mode class to html document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ssp_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ssp_theme', 'light');
    }
  }, [isDarkMode]);

  // Initial Auth & Data Load
  useEffect(() => {
    const initApp = async () => {
      const token = localStorage.getItem('ssp_auth_token');
      if (token) {
        try {
          const me = await api.getMe();
          setUser(me);
          await loadAllData();
        } catch {
          // Token expired or invalid
          localStorage.removeItem('ssp_auth_token');
          setShowAuthModal(true);
        }
      } else {
        // Automatically attempt demo login for seamless out-of-the-box experience
        try {
          const res = await api.login('student@example.com', 'password123');
          setUser(res.user);
          await loadAllData();
        } catch {
          setShowAuthModal(true);
        }
      }
    };
    initApp();
  }, []);

  const loadAllData = async () => {
    try {
      const subs = await api.getSubjects();
      setSubjects(subs);
      if (subs.length > 0) {
        setSelectedSubject((prev) => (prev ? subs.find(s => s.id === prev.id) || subs[0] : subs[0]));
      }

      const sess = await api.getAllSessions();
      setSessions(sess);

      const ana = await api.getDashboardAnalytics();
      setAnalytics(ana);
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  const handleToggleSessionComplete = async (sessionId: number, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await api.updateSession(sessionId, { status: nextStatus });
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to update session');
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        user={user}
        onOpenSettings={() => setShowSettingsModal(true)}
        onLogout={handleLogout}
        studyStreak={analytics?.study_streak_days || 1}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${
          isCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <Header
          subjects={subjects}
          selectedSubject={selectedSubject}
          onSelectSubject={(sub) => setSelectedSubject(sub)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          user={user}
          onOpenSettings={() => setShowSettingsModal(true)}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          {activeView === 'dashboard' && (
            <DashboardView
              analytics={analytics}
              onNavigate={setActiveView}
              onToggleSessionComplete={handleToggleSessionComplete}
              onSelectSubject={(s) => setSelectedSubject(s)}
              subjects={subjects}
            />
          )}

          {activeView === 'subjects' && (
            <SubjectsView
              subjects={subjects}
              selectedSubject={selectedSubject}
              onSelectSubject={(s) => setSelectedSubject(s)}
              onRefreshSubjects={loadAllData}
              onNavigate={setActiveView}
            />
          )}

          {activeView === 'planner' && (
            <PlannerView
              sessions={sessions}
              subjects={subjects}
              selectedSubject={selectedSubject}
              onRefreshSessions={loadAllData}
              onNavigate={setActiveView}
            />
          )}

          {activeView === 'materials' && (
            <MaterialsView
              subjects={subjects}
              selectedSubject={selectedSubject}
              onSelectSubject={(s) => setSelectedSubject(s)}
            />
          )}

          {activeView === 'tutor' && (
            <AITutorView
              selectedSubject={selectedSubject}
              subjects={subjects}
              onSelectSubject={(s) => setSelectedSubject(s)}
            />
          )}

          {activeView === 'quiz' && (
            <QuizView
              selectedSubject={selectedSubject}
              subjects={subjects}
              onSelectSubject={(s) => setSelectedSubject(s)}
            />
          )}

          {activeView === 'exam' && (
            <ExamSimulatorView
              selectedSubject={selectedSubject}
              subjects={subjects}
              onSelectSubject={(s) => setSelectedSubject(s)}
            />
          )}

          {activeView === 'focus' && (
            <FocusModeView
              selectedSubject={selectedSubject}
              onRefreshDashboard={loadAllData}
            />
          )}

          {activeView === 'revision' && (
            <RevisionView
              selectedSubject={selectedSubject}
              subjects={subjects}
              onSelectSubject={(s) => setSelectedSubject(s)}
            />
          )}

          {activeView === 'analytics' && (
            <AnalyticsView
              analytics={analytics}
              onNavigate={setActiveView}
              onSelectSubject={(s) => setSelectedSubject(s)}
              subjects={subjects}
            />
          )}
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(newUser) => {
          setUser(newUser);
          loadAllData();
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        user={user}
        onUserUpdate={(updated) => setUser(updated)}
      />
    </div>
  );
}

export default App;
