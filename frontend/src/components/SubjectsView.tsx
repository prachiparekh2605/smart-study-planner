import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Sparkles,
  CheckCircle2,
  Circle,
  Trash2,
  ChevronDown,
  ChevronRight,
  Upload,
  AlertCircle,
  FileText,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Subject, SyllabusData, Topic, Unit } from '../types';
import { api } from '../services/api';
import { getDifficultyColor, getImportanceColor } from '../utils/formatters';

interface SubjectsViewProps {
  subjects: Subject[];
  selectedSubject: Subject | null;
  onSelectSubject: (sub: Subject) => void;
  onRefreshSubjects: () => void;
  onNavigate: (view: string) => void;
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  subjects,
  selectedSubject,
  onSelectSubject,
  onRefreshSubjects,
  onNavigate
}) => {
  const [syllabus, setSyllabus] = useState<SyllabusData | null>(null);
  const [loadingSyllabus, setLoadingSyllabus] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionInsights, setExtractionInsights] = useState<any>(null);

  // New Subject Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newColor, setNewColor] = useState('#4f46e5');
  const [newExamDate, setNewExamDate] = useState('');
  const [newTargetScore, setNewTargetScore] = useState(90);
  const [creating, setCreating] = useState(false);

  // Expanded Units State
  const [expandedUnits, setExpandedUnits] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (selectedSubject) {
      loadSyllabus(selectedSubject.id);
    }
  }, [selectedSubject]);

  const loadSyllabus = async (subjectId: number) => {
    setLoadingSyllabus(true);
    try {
      const data = await api.getSyllabus(subjectId);
      setSyllabus(data);
      // Auto-expand all units
      const exp: Record<number, boolean> = {};
      data.units.forEach((u) => {
        exp[u.id] = true;
      });
      setExpandedUnits(exp);
    } catch {
      setSyllabus(null);
    } finally {
      setLoadingSyllabus(false);
    }
  };

  const handleExtractSyllabus = async () => {
    if (!selectedSubject) return;
    setExtracting(true);
    setExtractionInsights(null);
    try {
      const res = await api.extractSyllabus(selectedSubject.id);
      setExtractionInsights(res);
      await loadSyllabus(selectedSubject.id);
      onRefreshSubjects();
    } catch (err: any) {
      alert(err.message || 'Syllabus extraction failed.');
    } finally {
      setExtracting(false);
    }
  };

  const handleToggleTopic = async (topicId: number, currentStatus: boolean) => {
    try {
      await api.updateTopic(topicId, { is_completed: !currentStatus });
      if (selectedSubject) {
        await loadSyllabus(selectedSubject.id);
        onRefreshSubjects();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update topic');
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const newSub = await api.createSubject({
        name: newName,
        code: newCode || undefined,
        color: newColor,
        exam_date: newExamDate ? new Date(newExamDate).toISOString() : undefined,
        target_score: Number(newTargetScore)
      });
      onRefreshSubjects();
      onSelectSubject(newSub);
      setShowNewModal(false);
      setNewName('');
      setNewCode('');
      setNewExamDate('');
    } catch (err: any) {
      alert(err.message || 'Failed to create subject');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSubject = async (subjectId: number) => {
    if (!confirm('Are you sure you want to delete this subject and its materials?')) return;
    try {
      await api.deleteSubject(subjectId);
      onRefreshSubjects();
    } catch (err: any) {
      alert(err.message || 'Failed to delete subject');
    }
  };

  const toggleUnitExpand = (unitId: number) => {
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Course Subjects & Academic Syllabi
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your courses, extract syllabus units with AI, and track topic completion
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/25 transition-all flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Subject</span>
        </button>
      </div>

      {/* Subject Cards Horizontal Scroll / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {subjects.map((sub) => {
          const isSelected = selectedSubject?.id === sub.id;
          return (
            <div
              key={sub.id}
              onClick={() => onSelectSubject(sub)}
              className={`p-5 rounded-3xl border transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sub.color || '#4f46e5' }}
                  />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                      {sub.name}
                    </h3>
                    {sub.code && (
                      <span className="text-[11px] font-mono text-slate-400 uppercase">
                        {sub.code}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSubject(sub.id);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                  title="Delete Subject"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Progress */}
              <div className="space-y-1.5 my-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Completion</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {sub.progress_percentage}% ({sub.completed_topics_count}/{sub.topics_count} topics)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${sub.progress_percentage}%`,
                      backgroundColor: sub.color || '#4f46e5'
                    }}
                  />
                </div>
              </div>

              {/* Meta stats */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>{sub.units_count} Units</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>{sub.materials_count} Files</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Target: {sub.target_score}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Subject's Detailed Syllabus Tree */}
      {selectedSubject && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedSubject.color }}
                />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {selectedSubject.name} &mdash; Syllabus Breakdown
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Extracted topics, difficulty tags, essential formulas, and unit outlines
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => onNavigate('materials')}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Materials</span>
              </button>

              <button
                onClick={handleExtractSyllabus}
                disabled={extracting}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{extracting ? 'Analyzing Documents...' : 'Extract Syllabus with AI'}</span>
              </button>
            </div>
          </div>

          {/* AI Insights Banner from Agent 1 */}
          {extractionInsights && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-200">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Agent 1: Syllabus Analyzer Insights</span>
              </div>
              {extractionInsights.exam_weightage_analysis && (
                <p className="text-slate-700 dark:text-slate-300">
                  <strong>Exam Weightage:</strong> {extractionInsights.exam_weightage_analysis}
                </p>
              )}
              {extractionInsights.missing_prerequisites?.length > 0 && (
                <p className="text-slate-700 dark:text-slate-300">
                  <strong>Recommended Prerequisites:</strong>{' '}
                  {extractionInsights.missing_prerequisites.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Units Accordion */}
          {loadingSyllabus ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Loading syllabus structure...
            </div>
          ) : (!syllabus || syllabus.units.length === 0) ? (
            <div className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Syllabus Extracted Yet
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Upload your course materials (PDF, PPTX, DOCX, TXT, or notes) and click "Extract Syllabus with AI" to generate the structured curriculum.
              </p>
              <button
                onClick={handleExtractSyllabus}
                disabled={extracting}
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors"
              >
                Run Syllabus Analyzer Agent
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {syllabus.units.map((unit) => {
                const isExpanded = expandedUnits[unit.id] ?? true;
                return (
                  <div
                    key={unit.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                  >
                    {/* Unit Header */}
                    <div
                      onClick={() => toggleUnitExpand(unit.id)}
                      className="p-4 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between cursor-pointer select-none hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {unit.title}
                          </h4>
                          {unit.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{unit.description}</p>
                          )}
                        </div>
                      </div>

                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {unit.topics.length} Topics
                      </span>
                    </div>

                    {/* Topics List */}
                    {isExpanded && (
                      <div className="p-4 space-y-3 bg-white dark:bg-slate-900">
                        {unit.topics.map((topic) => (
                          <div
                            key={topic.id}
                            className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                              topic.is_completed
                                ? 'bg-slate-50/60 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 opacity-70'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <button
                                onClick={() => handleToggleTopic(topic.id, topic.is_completed)}
                                className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors flex-shrink-0"
                              >
                                {topic.is_completed ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                  <Circle className="w-5 h-5" />
                                )}
                              </button>

                              <div>
                                <h5
                                  className={`text-xs font-bold ${
                                    topic.is_completed
                                      ? 'line-through text-slate-400'
                                      : 'text-slate-900 dark:text-slate-100'
                                  }`}
                                >
                                  {topic.name}
                                </h5>

                                {/* Key concepts / formulas chips */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {topic.formulas?.map((f, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px]"
                                    >
                                      📐 {f}
                                    </span>
                                  ))}
                                  {topic.key_concepts?.map((c, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px]"
                                    >
                                      ● {c}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Tags */}
                            <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border capitalize ${getDifficultyColor(
                                  topic.difficulty
                                )}`}
                              >
                                {topic.difficulty}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border capitalize ${getImportanceColor(
                                  topic.importance
                                )}`}
                              >
                                {topic.importance}
                              </span>
                              <span className="text-[11px] text-slate-400 font-medium">
                                {topic.estimated_hours}h
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* New Subject Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 relative">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              Add New Course Subject
            </h3>

            <form onSubmit={handleCreateSubject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Database Systems"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Course Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. CS450"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Exam Date
                </label>
                <input
                  type="date"
                  value={newExamDate}
                  onChange={(e) => setNewExamDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Color Tag
                </label>
                <div className="flex gap-2">
                  {['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'].map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setNewColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        newColor === c ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

