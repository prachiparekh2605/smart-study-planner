import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Subject, Quiz, QuizQuestion, DocumentChunk, Material, User
from app.schemas import QuizGenerateRequest, QuizSubmitRequest
from app.auth import get_current_user
from app.agents.quiz_generator import QuizGeneratorAgent
from app.vector_store import VectorStore

router = APIRouter(prefix="/api/quiz", tags=["Quiz"])

@router.post("/generate")
def generate_quiz(
    req: QuizGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == req.subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # If mistake_bank requested, pull previously wrong questions
    if req.quiz_type == "mistake_bank":
        wrong_questions = (
            db.query(QuizQuestion)
            .join(Quiz, QuizQuestion.quiz_id == Quiz.id)
            .filter(
                Quiz.subject_id == subject.id,
                Quiz.user_id == current_user.id,
                QuizQuestion.is_correct == False
            )
            .limit(req.num_questions)
            .all()
        )
        if not wrong_questions:
            # Fall back to standard quiz if no mistakes recorded yet
            req.quiz_type = "topic"

    # Context chunks for syllabus grounding
    chunks = db.query(DocumentChunk).filter(DocumentChunk.subject_id == subject.id).limit(20).all()
    chunk_dicts = [{"content": c.content} for c in chunks]

    agent = QuizGeneratorAgent(user_api_key=current_user.gemini_api_key)
    questions_data = agent.generate_quiz(
        subject_name=subject.name,
        topic_name=req.topic_name,
        difficulty=req.difficulty or "medium",
        num_questions=req.num_questions,
        quiz_type=req.quiz_type or "topic",
        context_chunks=chunk_dicts
    )

    # Create Quiz in DB
    quiz = Quiz(
        user_id=current_user.id,
        subject_id=subject.id,
        topic_name=req.topic_name or f"{subject.name} Comprehensive Quiz",
        title=f"{req.topic_name or subject.name} - {req.difficulty.title()} Practice",
        quiz_type=req.quiz_type or "topic",
        total_questions=len(questions_data)
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    saved_questions = []
    for q in questions_data:
        qq = QuizQuestion(
            quiz_id=quiz.id,
            question_text=q["question_text"],
            question_type=q.get("question_type", "mcq"),
            options_json=json.dumps(q.get("options")) if q.get("options") else None,
            correct_answer=q["correct_answer"],
            explanation=q.get("explanation"),
            topic_name=q.get("topic_name") or req.topic_name or subject.name
        )
        db.add(qq)
        saved_questions.append(qq)

    db.commit()

    return {
        "quiz_id": quiz.id,
        "title": quiz.title,
        "total_questions": len(saved_questions),
        "questions": [
            {
                "id": qq.id,
                "question_text": qq.question_text,
                "question_type": qq.question_type,
                "options": json.loads(qq.options_json) if qq.options_json else None,
                "topic_name": qq.topic_name
            }
            for qq in saved_questions
        ]
    }

@router.get("/{quiz_id}")
def get_quiz(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.user_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()
    return {
        "id": quiz.id,
        "title": quiz.title,
        "quiz_type": quiz.quiz_type,
        "score": quiz.score,
        "total_questions": quiz.total_questions,
        "time_spent_seconds": quiz.time_spent_seconds,
        "questions": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "options": json.loads(q.options_json) if q.options_json else None,
                "student_answer": q.student_answer,
                "correct_answer": q.correct_answer if quiz.score is not None else None,
                "is_correct": q.is_correct,
                "explanation": q.explanation if quiz.score is not None else None,
                "topic_name": q.topic_name
            }
            for q in questions
        ]
    }

@router.post("/{quiz_id}/submit")
def submit_quiz(
    quiz_id: int,
    req: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.user_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    answer_map = {a.question_id: a.student_answer.strip() for a in req.answers}
    questions = db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz.id).all()

    correct_count = 0
    feedback_list = []

    for q in questions:
        stud_ans = answer_map.get(q.id, "")
        q.student_answer = stud_ans

        # Evaluation: case-insensitive match for objective / MCQ / true_false
        is_right = False
        if q.question_type in ["mcq", "true_false"]:
            is_right = (stud_ans.lower() == q.correct_answer.lower())
        else:
            # Fuzzy inclusion match for fill_blank or short answer
            is_right = (q.correct_answer.lower() in stud_ans.lower()) or (stud_ans.lower() in q.correct_answer.lower())

        q.is_correct = is_right
        if is_right:
            correct_count += 1

        feedback_list.append({
            "question_id": q.id,
            "question_text": q.question_text,
            "student_answer": stud_ans,
            "correct_answer": q.correct_answer,
            "is_correct": is_right,
            "explanation": q.explanation,
            "topic_name": q.topic_name
        })

    quiz.score = round((correct_count / max(len(questions), 1)) * 100, 1)
    quiz.time_spent_seconds = req.time_spent_seconds
    db.commit()

    return {
        "quiz_id": quiz.id,
        "score_percentage": quiz.score,
        "correct_count": correct_count,
        "total_questions": len(questions),
        "results": feedback_list
    }

@router.get("/mistakes/{subject_id}")
def get_mistake_bank(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns questions that were answered incorrectly so the student can review them.
    """
    mistakes = (
        db.query(QuizQuestion)
        .join(Quiz, QuizQuestion.quiz_id == Quiz.id)
        .filter(
            Quiz.subject_id == subject_id,
            Quiz.user_id == current_user.id,
            QuizQuestion.is_correct == False
        )
        .order_by(Quiz.created_at.desc())
        .limit(25)
        .all()
    )

    return [
        {
            "id": m.id,
            "quiz_id": m.quiz_id,
            "question_text": m.question_text,
            "student_answer": m.student_answer,
            "correct_answer": m.correct_answer,
            "explanation": m.explanation,
            "topic_name": m.topic_name
        }
        for m in mistakes
    ]

