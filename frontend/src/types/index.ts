export interface User {
  id: number;
  email: string;
  full_name: string;
  preferred_daily_hours: number;
  has_gemini_key: boolean;
}

export interface Subject {
  id: number;
  name: string;
  code?: string;
  description?: string;
  color: string;
  exam_date?: string;
  target_score: number;
  created_at: string;
  materials_count: number;
  units_count: number;
  topics_count: number;
  completed_topics_count: number;
  progress_percentage: number;
}

export interface Material {
  id: number;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  error_message?: string;
  page_count: number;
  summary?: string;
  created_at: string;
}

export interface DocumentChunk {
  chunk_index: number;
  page_or_slide: number;
  content: string;
}

export interface MaterialPreview {
  id: number;
  filename: string;
  file_type: string;
  status: string;
  page_count: number;
  summary?: string;
  chunks: DocumentChunk[];
}

export interface Topic {
  id: number;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  importance: 'low' | 'medium' | 'high' | 'critical';
  estimated_hours: number;
  formulas: string[];
  definitions: string[];
  key_concepts: string[];
  is_completed: boolean;
  order_num: number;
}

export interface Unit {
  id: number;
  title: string;
  order_num: number;
  description?: string;
  topics: Topic[];
}

export interface SyllabusData {
  subject_id: number;
  subject_name: string;
  units: Unit[];
}

export interface StudySession {
  id: number;
  plan_id?: number;
  subject_id: number;
  subject_name: string;
  subject_color: string;
  topic_id?: number;
  title: string;
  session_date: string;
  duration_minutes: number;
  session_type: 'study' | 'revision' | 'quiz' | 'mock_exam';
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'missed';
  notes?: string;
  completed_at?: string;
}

export interface TutorCitation {
  source: string;
  page_or_slide: number;
  snippet: string;
}

export interface TutorMessage {
  id?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: TutorCitation[];
  created_at?: string;
}

export interface QuizQuestion {
  id: number;
  question_text: string;
  question_type: 'mcq' | 'true_false' | 'fill_blank' | 'short_answer';
  options?: string[];
  student_answer?: string;
  correct_answer?: string;
  is_correct?: boolean;
  explanation?: string;
  topic_name?: string;
}

export interface QuizData {
  id: number;
  title: string;
  quiz_type: string;
  score?: number;
  total_questions: number;
  time_spent_seconds?: number;
  questions: QuizQuestion[];
}

export interface MockQuestion {
  id: number;
  question_num: number;
  section: string;
  question_type: 'objective' | 'subjective';
  question_text: string;
  marks: number;
  options?: string[];
  student_answer?: string;
  ideal_answer?: string;
  awarded_marks?: number;
  feedback?: string;
  is_flagged?: boolean;
}

export interface MockExamData {
  id: number;
  title: string;
  duration_minutes: number;
  total_marks: number;
  scored_marks?: number;
  percentage?: number;
  status: 'ready' | 'in_progress' | 'completed';
  feedback?: string;
  time_spent_seconds?: number;
  questions: MockQuestion[];
}

export interface Flashcard {
  id: number;
  front: string;
  back: string;
  formula?: string;
  topic_name?: string;
  repetitions: number;
  interval_days: number;
  ease_factor: number;
  next_review_date: string;
}

export interface FlashcardDeck {
  id: number;
  title: string;
  description?: string;
  cards_count: number;
  created_at: string;
}

export interface FormulaItem {
  name: string;
  formula: string;
  variables: string;
}

export interface FormulaCategory {
  unit_title: string;
  formulas: FormulaItem[];
}

export interface FormulaSheetData {
  subject_name: string;
  categories: FormulaCategory[];
  exam_cheat_sheet_tips: string[];
}

export interface WeakTopic {
  topic_name: string;
  accuracy: number;
  questions_attempted: number;
  status: string;
}

export interface DashboardAnalytics {
  overall_completion_pct: number;
  total_focus_hours: number;
  study_streak_days: number;
  total_quizzes_taken: number;
  quiz_accuracy_pct: number;
  readiness_grade: string;
  recommended_action: string;
  daily_goal_minutes: number;
  upcoming_exams: Array<{
    subject_id: number;
    subject_name: string;
    color: string;
    exam_date: string;
    days_left: number;
  }>;
  todays_schedule: StudySession[];
  subject_breakdown: Array<{
    subject_id: number;
    name: string;
    color: string;
    total_topics: number;
    completed_topics: number;
    progress_percentage: number;
    exam_date?: string;
  }>;
  weak_topics: WeakTopic[];
  strong_topics: Array<{
    topic_name: string;
    accuracy: number;
    questions_attempted: number;
  }>;
}

export interface FocusStats {
  today_minutes: number;
  today_hours: number;
  weekly_minutes: number;
  weekly_hours: number;
  total_sessions: number;
  daily_breakdown: Array<{
    date: string;
    day_name: string;
    minutes: number;
    hours: number;
  }>;
}

