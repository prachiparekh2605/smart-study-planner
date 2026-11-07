import {
  User, Subject, Material, MaterialPreview, SyllabusData,
  StudySession, TutorMessage, QuizData, MockExamData,
  FlashcardDeck, Flashcard, FormulaSheetData, DashboardAnalytics, FocusStats
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): HeadersInit {
  const token = localStorage.getItem('ssp_auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMsg = `Request failed (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.detail) errMsg = errJson.detail;
      else if (errJson.message) errMsg = errJson.message;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export const api = {
  // --- Auth ---
  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await handleResponse<{ access_token: string; user: User }>(res);
    localStorage.setItem('ssp_auth_token', data.access_token);
    return data;
  },

  async register(email: string, full_name: string, password: string): Promise<{ access_token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name, password })
    });
    const data = await handleResponse<{ access_token: string; user: User }>(res);
    localStorage.setItem('ssp_auth_token', data.access_token);
    return data;
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeader()
    });
    return handleResponse<User>(res);
  },

  async updateProfile(updates: { full_name?: string; gemini_api_key?: string; preferred_daily_hours?: number }): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(updates)
    });
    return handleResponse<{ user: User }>(res);
  },

  logout() {
    localStorage.removeItem('ssp_auth_token');
  },

  // --- Subjects ---
  async getSubjects(): Promise<Subject[]> {
    const res = await fetch(`${API_BASE}/subjects`, {
      headers: getAuthHeader()
    });
    return handleResponse<Subject[]>(res);
  },

  async createSubject(data: { name: string; code?: string; description?: string; color?: string; exam_date?: string; target_score?: number }): Promise<Subject> {
    const res = await fetch(`${API_BASE}/subjects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(data)
    });
    return handleResponse<Subject>(res);
  },

  async deleteSubject(id: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/subjects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse<{ message: string }>(res);
  },

  // --- Materials ---
  async getMaterials(subjectId: number): Promise<Material[]> {
    const res = await fetch(`${API_BASE}/materials/subject/${subjectId}`, {
      headers: getAuthHeader()
    });
    return handleResponse<Material[]>(res);
  },

  async uploadMaterials(subjectId: number, files: File[]): Promise<{ message: string; materials: Material[] }> {
    const formData = new FormData();
    formData.append('subject_id', subjectId.toString());
    files.forEach(f => formData.append('files', f));

    const res = await fetch(`${API_BASE}/materials/upload`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData
    });
    return handleResponse<{ message: string; materials: Material[] }>(res);
  },

  async getMaterialPreview(materialId: number): Promise<MaterialPreview> {
    const res = await fetch(`${API_BASE}/materials/${materialId}/preview`, {
      headers: getAuthHeader()
    });
    return handleResponse<MaterialPreview>(res);
  },

  async deleteMaterial(id: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/materials/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse<{ message: string }>(res);
  },

  async reprocessMaterial(id: number): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/materials/${id}/reprocess`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    return handleResponse<{ message: string }>(res);
  },

  // --- Syllabus ---
  async extractSyllabus(subjectId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/syllabus/extract/${subjectId}`, {
      method: 'POST',
      headers: getAuthHeader()
    });
    return handleResponse<any>(res);
  },

  async getSyllabus(subjectId: number): Promise<SyllabusData> {
    const res = await fetch(`${API_BASE}/syllabus/subject/${subjectId}`, {
      headers: getAuthHeader()
    });
    return handleResponse<SyllabusData>(res);
  },

  async updateTopic(topicId: number, data: { name?: string; is_completed?: boolean; difficulty?: string; importance?: string; estimated_hours?: number }): Promise<any> {
    const res = await fetch(`${API_BASE}/syllabus/topics/${topicId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(data)
    });
    return handleResponse<any>(res);
  },

  // --- Planner ---
  async getAllSessions(): Promise<StudySession[]> {
    const res = await fetch(`${API_BASE}/planner/all`, {
      headers: getAuthHeader()
    });
    return handleResponse<StudySession[]>(res);
  },

  async generatePlan(subjectId: number, examDate: string, dailyHours: number, prepLevel: string): Promise<any> {
    const res = await fetch(`${API_BASE}/planner/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({
        subject_id: subjectId,
        exam_date: examDate,
        daily_hours: dailyHours,
        preparation_level: prepLevel
      })
    });
    return handleResponse<any>(res);
  },

  async updateSession(sessionId: number, updates: { status?: string; new_date?: string; notes?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (updates.status) params.append('status', updates.status);
    if (updates.new_date) params.append('new_date', updates.new_date);
    if (updates.notes) params.append('notes', updates.notes);

    const res = await fetch(`${API_BASE}/planner/sessions/${sessionId}?${params.toString()}`, {
      method: 'PUT',
      headers: getAuthHeader()
    });
    return handleResponse<any>(res);
  },

  async autoAdjustPlan(subjectId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/planner/auto-adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ subject_id: subjectId })
    });
    return handleResponse<any>(res);
  },

  // --- AI Tutor ---
  async askTutor(subjectId: number, prompt: string, mode: string, chatId?: number): Promise<any> {
    const res = await fetch(`${API_BASE}/tutor/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({
        subject_id: subjectId,
        prompt,
        mode,
        chat_id: chatId
      })
    });
    return handleResponse<any>(res);
  },

  async getTutorHistory(subjectId: number): Promise<{ chat_id: number | null; messages: TutorMessage[] }> {
    const res = await fetch(`${API_BASE}/tutor/history/${subjectId}`, {
      headers: getAuthHeader()
    });
    return handleResponse<{ chat_id: number | null; messages: TutorMessage[] }>(res);
  },

  async clearTutorHistory(subjectId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/tutor/history/${subjectId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse<any>(res);
  },

  // --- Quiz ---
  async generateQuiz(subjectId: number, topicName?: string, difficulty = 'medium', numQuestions = 5, quizType = 'topic'): Promise<QuizData> {
    const res = await fetch(`${API_BASE}/quiz/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({
        subject_id: subjectId,
        topic_name: topicName,
        difficulty,
        num_questions: numQuestions,
        quiz_type: quizType
      })
    });
    return handleResponse<QuizData>(res);
  },

  async getQuiz(quizId: number): Promise<QuizData> {
    const res = await fetch(`${API_BASE}/quiz/${quizId}`, {
      headers: getAuthHeader()
    });
    return handleResponse<QuizData>(res);
  },

  async submitQuiz(quizId: number, answers: Array<{ question_id: number; student_answer: string }>, timeSpent: number): Promise<any> {
    const res = await fetch(`${API_BASE}/quiz/${quizId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({
        quiz_id: quizId,
        answers,
        time_spent_seconds: timeSpent
      })
    });
    return handleResponse<any>(res);
  },

  async getMistakeBank(subjectId: number): Promise<any[]> {
    const res = await fetch(`${API_BASE}/quiz/mistakes/${subjectId}`, {
      headers: getAuthHeader()
    });
    return handleResponse<any[]>(res);
  },

  // --- Exam Simulator ---
  async generateExam(subjectId: number, title?: string, durationMins = 60, totalMarks = 50, difficulty = 'medium'): Promise<any> {
    const res = await fetch(`${API_BASE}/exam/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({
        subject_id: subjectId,
        title,
        duration_minutes: durationMins,
        total_marks: totalMarks,
        difficulty,
        num_objective: 5,
        num_subjective: 3
      })
    });
    return handleResponse<any>(res);
  },

  async getExam(examId: number): Promise<MockExamData> {
    const res = await fetch(`${API_BASE}/exam/${examId}`, {
      headers: getAuthHeader()
    });
    return handleResponse<MockExamData>(res);
  },

  async submitExam(examId: number, answers: Array<{ question_id: number; student_answer: string; is_flagged?: boolean }>, timeSpent: number): Promise<any> {
    const res = await fetch(`${API_BASE}/exam/${examId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({
        exam_id: examId,
        answers,
        time_spent_seconds: timeSpent
      })
    });
    return handleResponse<any>(res);
  },

  async getExamHistory(subjectId: number): Promise<any[]> {
    const res = await fetch(`${API_BASE}/exam/history/${subjectId}`, {
      headers: getAuthHeader()
    });
    return handleResponse<any[]>(res);
  },

  // --- Revision ---
  async generateFlashcards(subjectId: number, topicName?: string, numCards = 8): Promise<any> {
    const res = await fetch(`${API_BASE}/revision/flashcards/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({
        subject_id: subjectId,
        topic_name: topicName,
        num_cards: numCards
      })
    });
    return handleResponse<any>(res);
  },

  async getFlashcardDecks(subjectId: number): Promise<FlashcardDeck[]> {
    const res = await fetch(`${API_BASE}/revision/flashcards/subject/${subjectId}`, {
      headers: getAuthHeader()
    });
    return handleResponse<FlashcardDeck[]>(res);
  },

  async getDeckCards(deckId: number): Promise<{ id: number; title: string; cards: Flashcard[] }> {
    const res = await fetch(`${API_BASE}/revision/flashcards/deck/${deckId}`, {
      headers: getAuthHeader()
    });
    return handleResponse<{ id: number; title: string; cards: Flashcard[] }>(res);
  },

  async reviewFlashcard(cardId: number, rating: number): Promise<any> {
    const res = await fetch(`${API_BASE}/revision/flashcards/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ card_id: cardId, rating })
    });
    return handleResponse<any>(res);
  },

  async getFormulaSheet(subjectId: number): Promise<FormulaSheetData> {
    const res = await fetch(`${API_BASE}/revision/formula-sheet/${subjectId}`, {
      headers: getAuthHeader()
    });
    return handleResponse<FormulaSheetData>(res);
  },

  // --- Focus Mode ---
  async logFocusSession(data: { subject_id?: number; topic_name?: string; duration_minutes: number; interval_type: string; notes?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/focus/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(data)
    });
    return handleResponse<any>(res);
  },

  async getFocusStats(): Promise<FocusStats> {
    const res = await fetch(`${API_BASE}/focus/stats`, {
      headers: getAuthHeader()
    });
    return handleResponse<FocusStats>(res);
  },

  // --- Analytics Dashboard ---
  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    const res = await fetch(`${API_BASE}/analytics/dashboard`, {
      headers: getAuthHeader()
    });
    return handleResponse<DashboardAnalytics>(res);
  }
};

