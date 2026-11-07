import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean
)
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    gemini_api_key = Column(String(255), nullable=True)
    preferred_daily_hours = Column(Float, default=3.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    subjects = relationship("Subject", back_populates="user", cascade="all, delete-orphan")
    study_plans = relationship("StudyPlan", back_populates="user", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="user", cascade="all, delete-orphan")
    mock_exams = relationship("MockExam", back_populates="user", cascade="all, delete-orphan")
    focus_logs = relationship("FocusLog", back_populates="user", cascade="all, delete-orphan")
    flashcard_decks = relationship("FlashcardDeck", back_populates="user", cascade="all, delete-orphan")
    tutor_chats = relationship("TutorChat", back_populates="user", cascade="all, delete-orphan")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    color = Column(String(20), default="#4f46e5")
    exam_date = Column(DateTime, nullable=True)
    target_score = Column(Float, default=90.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="subjects")
    materials = relationship("Material", back_populates="subject", cascade="all, delete-orphan")
    units = relationship("SyllabusUnit", back_populates="subject", cascade="all, delete-orphan")
    topics = relationship("SyllabusTopic", back_populates="subject", cascade="all, delete-orphan")
    study_plans = relationship("StudyPlan", back_populates="subject", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="subject", cascade="all, delete-orphan")
    mock_exams = relationship("MockExam", back_populates="subject", cascade="all, delete-orphan")
    flashcard_decks = relationship("FlashcardDeck", back_populates="subject", cascade="all, delete-orphan")
    tutor_chats = relationship("TutorChat", back_populates="subject", cascade="all, delete-orphan")


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    status = Column(String(50), default="pending")  # pending, processing, ready, error
    error_message = Column(Text, nullable=True)
    page_count = Column(Integer, default=0)
    summary = Column(Text, nullable=True)
    storage_path = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    subject = relationship("Subject", back_populates="materials")
    chunks = relationship("DocumentChunk", back_populates="material", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    material_id = Column(Integer, ForeignKey("materials.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    page_or_slide = Column(Integer, default=1)
    meta_info = Column(Text, nullable=True)  # JSON string
    embedding_json = Column(Text, nullable=True)  # JSON array for semantic search

    material = relationship("Material", back_populates="chunks")


class SyllabusUnit(Base):
    __tablename__ = "syllabus_units"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    order_num = Column(Integer, default=1)
    description = Column(Text, nullable=True)

    subject = relationship("Subject", back_populates="units")
    topics = relationship("SyllabusTopic", back_populates="unit", cascade="all, delete-orphan")


class SyllabusTopic(Base):
    __tablename__ = "syllabus_topics"

    id = Column(Integer, primary_key=True, index=True)
    unit_id = Column(Integer, ForeignKey("syllabus_units.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    difficulty = Column(String(50), default="medium")  # easy, medium, hard
    importance = Column(String(50), default="medium")  # low, medium, high, critical
    estimated_hours = Column(Float, default=1.5)
    formulas_json = Column(Text, nullable=True)
    definitions_json = Column(Text, nullable=True)
    key_concepts_json = Column(Text, nullable=True)
    is_completed = Column(Boolean, default=False)
    order_num = Column(Integer, default=1)

    unit = relationship("SyllabusUnit", back_populates="topics")
    subject = relationship("Subject", back_populates="topics")
    sessions = relationship("StudySession", back_populates="topic")


class StudyPlan(Base):
    __tablename__ = "study_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    exam_date = Column(DateTime, nullable=False)
    daily_hours = Column(Float, default=3.0)
    preparation_level = Column(String(50), default="intermediate")  # beginner, intermediate, advanced
    total_sessions = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="study_plans")
    subject = relationship("Subject", back_populates="study_plans")
    sessions = relationship("StudySession", back_populates="plan", cascade="all, delete-orphan")


class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("study_plans.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey("syllabus_topics.id"), nullable=True, index=True)
    session_date = Column(DateTime, nullable=False, index=True)
    duration_minutes = Column(Integer, default=60)
    session_type = Column(String(50), default="study")  # study, revision, quiz, mock_exam
    title = Column(String(255), nullable=False)
    priority = Column(String(50), default="medium")  # low, medium, high
    status = Column(String(50), default="pending")  # pending, completed, missed
    notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    plan = relationship("StudyPlan", back_populates="sessions")
    topic = relationship("SyllabusTopic", back_populates="sessions")


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    topic_name = Column(String(255), nullable=True)
    title = Column(String(255), nullable=False)
    quiz_type = Column(String(50), default="topic")  # topic, unit, full_syllabus, mistake_bank
    total_questions = Column(Integer, default=5)
    score = Column(Float, nullable=True)
    time_spent_seconds = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="quizzes")
    subject = relationship("Subject", back_populates="quizzes")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), default="mcq")  # mcq, true_false, fill_blank, short_answer
    options_json = Column(Text, nullable=True)  # JSON list of options
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    topic_name = Column(String(255), nullable=True)
    student_answer = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=True)

    quiz = relationship("Quiz", back_populates="questions")


class MockExam(Base):
    __tablename__ = "mock_exams"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    duration_minutes = Column(Integer, default=60)
    total_marks = Column(Float, default=50.0)
    scored_marks = Column(Float, nullable=True)
    percentage = Column(Float, nullable=True)
    status = Column(String(50), default="ready")  # ready, in_progress, completed
    feedback = Column(Text, nullable=True)
    time_spent_seconds = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="mock_exams")
    subject = relationship("Subject", back_populates="mock_exams")
    questions = relationship("MockQuestion", back_populates="exam", cascade="all, delete-orphan")


class MockQuestion(Base):
    __tablename__ = "mock_questions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("mock_exams.id"), nullable=False, index=True)
    question_num = Column(Integer, default=1)
    section = Column(String(50), default="Section A")  # Section A (Objective), Section B (Subjective)
    question_type = Column(String(50), default="objective")  # objective, subjective
    question_text = Column(Text, nullable=False)
    marks = Column(Float, default=2.0)
    options_json = Column(Text, nullable=True)  # JSON for objective questions
    ideal_answer = Column(Text, nullable=True)
    rubric_json = Column(Text, nullable=True)  # Evaluation criteria
    student_answer = Column(Text, nullable=True)
    awarded_marks = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    is_flagged = Column(Boolean, default=False)

    exam = relationship("MockExam", back_populates="questions")


class FocusLog(Base):
    __tablename__ = "focus_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True, index=True)
    topic_id = Column(Integer, ForeignKey("syllabus_topics.id"), nullable=True, index=True)
    topic_name = Column(String(255), nullable=True)
    duration_minutes = Column(Integer, nullable=False)
    interval_type = Column(String(50), default="25/5")
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="focus_logs")


class FlashcardDeck(Base):
    __tablename__ = "flashcard_decks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="flashcard_decks")
    subject = relationship("Subject", back_populates="flashcard_decks")
    cards = relationship("Flashcard", back_populates="deck", cascade="all, delete-orphan")


class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column(Integer, ForeignKey("flashcard_decks.id"), nullable=False, index=True)
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    formula = Column(Text, nullable=True)
    topic_name = Column(String(255), nullable=True)
    repetitions = Column(Integer, default=0)
    interval_days = Column(Integer, default=1)
    ease_factor = Column(Float, default=2.5)  # SuperMemo SM-2 default
    next_review_date = Column(DateTime, default=datetime.datetime.utcnow)

    deck = relationship("FlashcardDeck", back_populates="cards")


class TutorChat(Base):
    __tablename__ = "tutor_chats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False, index=True)
    title = Column(String(255), default="Study Session Chat")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="tutor_chats")
    subject = relationship("Subject", back_populates="tutor_chats")
    messages = relationship("TutorMessage", back_populates="chat", cascade="all, delete-orphan")


class TutorMessage(Base):
    __tablename__ = "tutor_messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("tutor_chats.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    citations_json = Column(Text, nullable=True)  # JSON list of {source, page, quote}
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    chat = relationship("TutorChat", back_populates="messages")

