from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import datetime

# --- Auth Schemas ---
class UserRegister(BaseModel):
    email: str
    full_name: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    gemini_api_key: Optional[str] = None
    preferred_daily_hours: Optional[float] = None

# --- Subject Schemas ---
class SubjectCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = "#4f46e5"
    exam_date: Optional[datetime.datetime] = None
    target_score: Optional[float] = 90.0

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    exam_date: Optional[datetime.datetime] = None
    target_score: Optional[float] = None

class SubjectResponse(BaseModel):
    id: int
    name: str
    code: Optional[str]
    description: Optional[str]
    color: str
    exam_date: Optional[datetime.datetime]
    target_score: float
    created_at: datetime.datetime
    materials_count: Optional[int] = 0
    units_count: Optional[int] = 0
    topics_count: Optional[int] = 0
    completed_topics_count: Optional[int] = 0
    progress_percentage: Optional[float] = 0.0

    class Config:
        from_attributes = True

# --- Syllabus Schemas ---
class TopicCreate(BaseModel):
    name: str
    difficulty: Optional[str] = "medium"
    importance: Optional[str] = "medium"
    estimated_hours: Optional[float] = 1.5
    formulas: Optional[List[str]] = []
    definitions: Optional[List[str]] = []
    key_concepts: Optional[List[str]] = []

class TopicUpdate(BaseModel):
    name: Optional[str] = None
    difficulty: Optional[str] = None
    importance: Optional[str] = None
    estimated_hours: Optional[float] = None
    is_completed: Optional[bool] = None

class UnitCreate(BaseModel):
    title: str
    description: Optional[str] = None
    topics: List[TopicCreate] = []

# --- Study Plan Schemas ---
class PlanGenerateRequest(BaseModel):
    subject_id: int
    exam_date: datetime.datetime
    daily_hours: float = 3.0
    preparation_level: str = "intermediate"  # beginner, intermediate, advanced
    daily_commitments: Optional[str] = None
    preferred_time_of_day: Optional[str] = "evening"

class SessionRescheduleRequest(BaseModel):
    session_id: int
    new_date: datetime.datetime

class PlanAutoAdjustRequest(BaseModel):
    subject_id: int

# --- AI Tutor Schemas ---
class TutorAskRequest(BaseModel):
    subject_id: int
    chat_id: Optional[int] = None
    prompt: str
    mode: Optional[str] = "student_friendly"  # student_friendly, step_by_step, academic, quick_summary
    topic_context: Optional[str] = None
    image_base64: Optional[str] = None

# --- Quiz Schemas ---
class QuizGenerateRequest(BaseModel):
    subject_id: int
    unit_id: Optional[int] = None
    topic_name: Optional[str] = None
    difficulty: Optional[str] = "medium"
    num_questions: int = 5
    quiz_type: Optional[str] = "topic"  # topic, unit, full_syllabus, mistake_bank

class QuizAnswerSubmit(BaseModel):
    question_id: int
    student_answer: str

class QuizSubmitRequest(BaseModel):
    quiz_id: int
    answers: List[QuizAnswerSubmit]
    time_spent_seconds: int = 0

# --- Exam Simulator Schemas ---
class MockExamGenerateRequest(BaseModel):
    subject_id: int
    title: Optional[str] = None
    duration_minutes: int = 60
    total_marks: float = 50.0
    difficulty: Optional[str] = "medium"
    num_objective: int = 5
    num_subjective: int = 3

class MockAnswerSubmit(BaseModel):
    question_id: int
    student_answer: str
    is_flagged: Optional[bool] = False

class MockExamSubmitRequest(BaseModel):
    exam_id: int
    answers: List[MockAnswerSubmit]
    time_spent_seconds: int

# --- Revision Schemas ---
class FlashcardReviewRequest(BaseModel):
    card_id: int
    rating: int  # 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)

class FlashcardDeckCreate(BaseModel):
    subject_id: int
    topic_name: Optional[str] = None
    num_cards: int = 10

class FormulaSheetRequest(BaseModel):
    subject_id: int

# --- Focus Mode Schemas ---
class FocusLogCreate(BaseModel):
    subject_id: Optional[int] = None
    topic_id: Optional[int] = None
    topic_name: Optional[str] = None
    duration_minutes: int
    interval_type: str = "25/5"
    notes: Optional[str] = None
