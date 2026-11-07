import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Subject, SyllabusTopic, StudySession, Quiz, QuizQuestion, MockExam, FocusLog, User
from app.auth import get_current_user
from app.agents.performance_analyzer import PerformanceAnalysisAgent

router = APIRouter(prefix="/api/analytics", tags=["Performance Analytics"])

@router.get("/dashboard")
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Subjects & Topics
    subjects = db.query(Subject).filter(Subject.user_id == current_user.id).all()
    subjects_data = []
    for s in subjects:
        topics = db.query(SyllabusTopic).filter(SyllabusTopic.subject_id == s.id).all()
        t_count = len(topics)
        c_count = sum(1 for t in topics if t.is_completed)
        subjects_data.append({
            "id": s.id,
            "name": s.name,
            "color": s.color or "#4f46e5",
            "topics_count": t_count,
            "completed_topics_count": c_count,
            "exam_date": s.exam_date.isoformat() if s.exam_date else None
        })

    # 2. Quiz Attempts
    quiz_attempts_query = (
        db.query(QuizQuestion.topic_name, QuizQuestion.is_correct)
        .join(Quiz, QuizQuestion.quiz_id == Quiz.id)
        .filter(Quiz.user_id == current_user.id, QuizQuestion.student_answer.isnot(None))
        .all()
    )
    quiz_attempts = [
        {"topic_name": qa[0], "is_correct": qa[1]}
        for qa in quiz_attempts_query
    ]

    # 3. Mock Exams
    mock_exams = db.query(MockExam).filter(MockExam.user_id == current_user.id).all()
    mock_exams_data = [
        {"id": m.id, "percentage": m.percentage, "status": m.status}
        for m in mock_exams
    ]

    # 4. Focus Logs
    focus_logs = db.query(FocusLog).filter(FocusLog.user_id == current_user.id).all()
    focus_logs_data = [
        {"duration_minutes": f.duration_minutes, "completed_at": f.completed_at}
        for f in focus_logs
    ]

    # 5. Study Sessions
    sessions = db.query(StudySession).filter(StudySession.user_id == current_user.id).all()
    sessions_data = [
        {"status": s.status, "session_date": s.session_date, "duration_minutes": s.duration_minutes}
        for s in sessions
    ]

    # Today's Sessions
    today = datetime.datetime.utcnow().date()
    todays_sessions = (
        db.query(StudySession, Subject)
        .join(Subject, StudySession.subject_id == Subject.id)
        .filter(
            StudySession.user_id == current_user.id,
            StudySession.session_date >= datetime.datetime.combine(today, datetime.time.min),
            StudySession.session_date <= datetime.datetime.combine(today, datetime.time.max)
        )
        .order_by(StudySession.session_date.asc())
        .all()
    )

    # Invoke Agent 6: Performance Analysis Agent
    agent = PerformanceAnalysisAgent(user_api_key=current_user.gemini_api_key)
    analysis = agent.analyze_student_performance(
        subjects_data=subjects_data,
        quiz_attempts=quiz_attempts,
        mock_exams=mock_exams_data,
        focus_logs=focus_logs_data,
        sessions=sessions_data
    )

    # Upcoming exams
    upcoming_exams = [
        {
            "subject_id": s.id,
            "subject_name": s.name,
            "color": s.color or "#4f46e5",
            "exam_date": s.exam_date.isoformat(),
            "days_left": max(0, (s.exam_date.date() - today).days)
        }
        for s in subjects if s.exam_date
    ]
    upcoming_exams.sort(key=lambda x: x["days_left"])

    return {
        **analysis,
        "upcoming_exams": upcoming_exams,
        "todays_schedule": [
            {
                "id": sess.id,
                "title": sess.title,
                "subject_name": sub.name,
                "subject_color": sub.color,
                "duration_minutes": sess.duration_minutes,
                "session_type": sess.session_type,
                "priority": sess.priority,
                "status": sess.status,
                "session_date": sess.session_date.isoformat()
            }
            for sess, sub in todays_sessions
        ],
        "daily_goal_minutes": int(current_user.preferred_daily_hours * 60)
    }

