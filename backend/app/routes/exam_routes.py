import json
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Subject, MockExam, MockQuestion, User
from app.schemas import MockExamGenerateRequest, MockExamSubmitRequest
from app.auth import get_current_user
from app.agents.exam_simulator import ExamSimulatorAgent

router = APIRouter(prefix="/api/exam", tags=["Exam Simulator"])

@router.post("/generate")
def generate_mock_exam(
    req: MockExamGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == req.subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    agent = ExamSimulatorAgent(user_api_key=current_user.gemini_api_key)
    exam_data = agent.generate_mock_exam(
        subject_name=subject.name,
        title=req.title,
        duration_minutes=req.duration_minutes,
        total_marks=req.total_marks,
        difficulty=req.difficulty or "medium",
        num_objective=req.num_objective,
        num_subjective=req.num_subjective
    )

    exam = MockExam(
        user_id=current_user.id,
        subject_id=subject.id,
        title=exam_data["title"],
        duration_minutes=exam_data["duration_minutes"],
        total_marks=exam_data["total_marks"],
        status="ready"
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)

    saved_questions = []
    for q in exam_data.get("questions", []):
        mq = MockQuestion(
            exam_id=exam.id,
            question_num=q.get("question_num", 1),
            section=q.get("section", "Section A"),
            question_type=q.get("question_type", "objective"),
            question_text=q["question_text"],
            marks=q.get("marks", 2.0),
            options_json=json.dumps(q.get("options")) if q.get("options") else None,
            ideal_answer=q.get("ideal_answer"),
            rubric_json=json.dumps(q.get("rubric")) if q.get("rubric") else None
        )
        db.add(mq)
        saved_questions.append(mq)

    db.commit()

    return {
        "exam_id": exam.id,
        "title": exam.title,
        "duration_minutes": exam.duration_minutes,
        "total_marks": exam.total_marks,
        "questions_count": len(saved_questions)
    }

@router.get("/{exam_id}")
def get_mock_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exam = db.query(MockExam).filter(MockExam.id == exam_id, MockExam.user_id == current_user.id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Mock exam not found")

    questions = db.query(MockQuestion).filter(MockQuestion.exam_id == exam.id).order_by(MockQuestion.question_num).all()
    is_completed = (exam.status == "completed")

    return {
        "id": exam.id,
        "title": exam.title,
        "duration_minutes": exam.duration_minutes,
        "total_marks": exam.total_marks,
        "scored_marks": exam.scored_marks,
        "percentage": exam.percentage,
        "status": exam.status,
        "feedback": exam.feedback,
        "time_spent_seconds": exam.time_spent_seconds,
        "questions": [
            {
                "id": q.id,
                "question_num": q.question_num,
                "section": q.section,
                "question_type": q.question_type,
                "question_text": q.question_text,
                "marks": q.marks,
                "options": json.loads(q.options_json) if q.options_json else None,
                "student_answer": q.student_answer,
                "ideal_answer": q.ideal_answer if is_completed else None,
                "awarded_marks": q.awarded_marks,
                "feedback": q.feedback if is_completed else None,
                "is_flagged": q.is_flagged
            }
            for q in questions
        ]
    }

@router.post("/{exam_id}/submit")
def submit_mock_exam(
    exam_id: int,
    req: MockExamSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exam = db.query(MockExam).filter(MockExam.id == exam_id, MockExam.user_id == current_user.id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Mock exam not found")

    answers_map = {a.question_id: a for a in req.answers}
    questions = db.query(MockQuestion).filter(MockQuestion.exam_id == exam.id).all()

    agent = ExamSimulatorAgent(user_api_key=current_user.gemini_api_key)
    total_scored = 0.0

    for q in questions:
        submission = answers_map.get(q.id)
        stud_answer = submission.student_answer if submission else ""
        q.student_answer = stud_answer
        q.is_flagged = submission.is_flagged if submission else False

        if q.question_type == "objective":
            # Deterministic auto-grading for objective
            is_right = (stud_answer.strip().lower() == (q.ideal_answer or "").strip().lower())
            awarded = q.marks if is_right else 0.0
            q.awarded_marks = awarded
            q.feedback = "Correct selection! Full credit awarded." if is_right else f"Incorrect. The ideal answer is: {q.ideal_answer}"
            total_scored += awarded
        else:
            # Subjective AI evaluation using rubrics
            rubric_dict = json.loads(q.rubric_json) if q.rubric_json else None
            eval_res = agent.evaluate_subjective_answer(
                question_text=q.question_text,
                student_answer=stud_answer,
                ideal_answer=q.ideal_answer or "",
                max_marks=q.marks,
                rubric=rubric_dict
            )
            q.awarded_marks = eval_res["awarded_marks"]
            q.feedback = eval_res["feedback"]
            total_scored += eval_res["awarded_marks"]

    exam.scored_marks = round(total_scored, 1)
    exam.percentage = round((total_scored / max(exam.total_marks, 1)) * 100, 1)
    exam.status = "completed"
    exam.time_spent_seconds = req.time_spent_seconds
    exam.submitted_at = datetime.datetime.utcnow()

    # Generate overarching feedback
    if exam.percentage >= 85:
        exam.feedback = "Outstanding performance! You demonstrated exceptional mastery across objective and subjective sections."
    elif exam.percentage >= 65:
        exam.feedback = "Solid exam attempt. Review partial-credit subjective explanations to improve your analytical structure and mathematical steps."
    else:
        exam.feedback = "Room for improvement. Strengthen your foundational concepts and practice formula sheets before your actual exam."

    db.commit()

    return {
        "exam_id": exam.id,
        "total_marks": exam.total_marks,
        "scored_marks": exam.scored_marks,
        "percentage": exam.percentage,
        "feedback": exam.feedback
    }

@router.get("/history/{subject_id}")
def get_exam_history(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exams = (
        db.query(MockExam)
        .filter(MockExam.subject_id == subject_id, MockExam.user_id == current_user.id)
        .order_by(MockExam.created_at.desc())
        .all()
    )
    return [
        {
            "id": e.id,
            "title": e.title,
            "total_marks": e.total_marks,
            "scored_marks": e.scored_marks,
            "percentage": e.percentage,
            "status": e.status,
            "created_at": e.created_at.isoformat(),
            "time_spent_seconds": e.time_spent_seconds
        }
        for e in exams
    ]

