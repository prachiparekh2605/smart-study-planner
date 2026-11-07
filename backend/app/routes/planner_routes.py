import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Subject, SyllabusTopic, StudyPlan, StudySession, User
from app.schemas import PlanGenerateRequest, SessionRescheduleRequest, PlanAutoAdjustRequest
from app.auth import get_current_user
from app.agents.study_planner import StudyPlanningAgent

router = APIRouter(prefix="/api/planner", tags=["Study Planner"])

@router.post("/generate")
def generate_study_plan(
    req: PlanGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    subject = db.query(Subject).filter(Subject.id == req.subject_id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    topics = db.query(SyllabusTopic).filter(SyllabusTopic.subject_id == subject.id).all()
    if not topics:
        raise HTTPException(
            status_code=400,
            detail="No syllabus topics found for this subject. Please extract or add syllabus topics first."
        )

    topics_data = [
        {
            "id": t.id,
            "name": t.name,
            "difficulty": t.difficulty,
            "importance": t.importance,
            "estimated_hours": t.estimated_hours,
            "is_completed": t.is_completed
        }
        for t in topics
    ]

    # Deactivate existing plans for this subject
    db.query(StudyPlan).filter(StudyPlan.subject_id == subject.id, StudyPlan.user_id == current_user.id).update({"is_active": False})

    # Create new StudyPlan
    new_plan = StudyPlan(
        user_id=current_user.id,
        subject_id=subject.id,
        title=f"{subject.name} Preparation Plan",
        exam_date=req.exam_date,
        daily_hours=req.daily_hours,
        preparation_level=req.preparation_level,
        is_active=True
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)

    # Invoke Agent 2: Study Planning Agent
    agent = StudyPlanningAgent(user_api_key=current_user.gemini_api_key)
    sessions = agent.generate_schedule(
        subject_name=subject.name,
        subject_id=subject.id,
        topics=topics_data,
        exam_date=req.exam_date,
        daily_hours=req.daily_hours,
        preparation_level=req.preparation_level,
        daily_commitments=req.daily_commitments
    )

    saved_sessions = []
    for s in sessions:
        session_obj = StudySession(
            plan_id=new_plan.id,
            user_id=current_user.id,
            subject_id=subject.id,
            topic_id=s.get("topic_id"),
            session_date=s["session_date"],
            duration_minutes=s.get("duration_minutes", 60),
            session_type=s.get("session_type", "study"),
            title=s["title"],
            priority=s.get("priority", "medium"),
            status="pending",
            notes=s.get("notes")
        )
        db.add(session_obj)
        saved_sessions.append(session_obj)

    new_plan.total_sessions = len(saved_sessions)
    subject.exam_date = req.exam_date
    db.commit()

    return {
        "message": f"Successfully created {len(saved_sessions)} study sessions.",
        "plan_id": new_plan.id,
        "total_sessions": len(saved_sessions)
    }

@router.get("/all")
def get_all_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns all sessions across subjects for the Master Interactive Calendar.
    """
    sessions = (
        db.query(StudySession, Subject)
        .join(Subject, StudySession.subject_id == Subject.id)
        .filter(StudySession.user_id == current_user.id)
        .order_by(StudySession.session_date.asc())
        .all()
    )

    result = []
    for sess, sub in sessions:
        result.append({
            "id": sess.id,
            "plan_id": sess.plan_id,
            "subject_id": sub.id,
            "subject_name": sub.name,
            "subject_color": sub.color or "#4f46e5",
            "topic_id": sess.topic_id,
            "title": sess.title,
            "session_date": sess.session_date.isoformat(),
            "duration_minutes": sess.duration_minutes,
            "session_type": sess.session_type,
            "priority": sess.priority,
            "status": sess.status,
            "notes": sess.notes,
            "completed_at": sess.completed_at.isoformat() if sess.completed_at else None
        })
    return result

@router.get("/subject/{subject_id}")
def get_subject_plan(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    plan = db.query(StudyPlan).filter(
        StudyPlan.subject_id == subject_id,
        StudyPlan.user_id == current_user.id,
        StudyPlan.is_active == True
    ).first()

    if not plan:
        return {"plan": None, "sessions": []}

    sessions = db.query(StudySession).filter(StudySession.plan_id == plan.id).order_by(StudySession.session_date.asc()).all()
    return {
        "plan": {
            "id": plan.id,
            "title": plan.title,
            "exam_date": plan.exam_date.isoformat(),
            "daily_hours": plan.daily_hours,
            "preparation_level": plan.preparation_level,
            "total_sessions": plan.total_sessions
        },
        "sessions": [
            {
                "id": s.id,
                "title": s.title,
                "session_date": s.session_date.isoformat(),
                "duration_minutes": s.duration_minutes,
                "session_type": s.session_type,
                "priority": s.priority,
                "status": s.status,
                "notes": s.notes,
                "topic_id": s.topic_id
            }
            for s in sessions
        ]
    }

@router.put("/sessions/{session_id}")
def update_session(
    session_id: int,
    status: Optional[str] = None,
    new_date: Optional[str] = None,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sess = db.query(StudySession).filter(StudySession.id == session_id, StudySession.user_id == current_user.id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    if status is not None:
        sess.status = status
        if status == "completed":
            sess.completed_at = datetime.datetime.utcnow()
            # If session is linked to a topic, mark topic completed
            if sess.topic_id:
                topic = db.query(SyllabusTopic).filter(SyllabusTopic.id == sess.topic_id).first()
                if topic:
                    topic.is_completed = True
        elif status == "pending":
            sess.completed_at = None

    if new_date is not None:
        try:
            sess.session_date = datetime.datetime.fromisoformat(new_date.replace("Z", "+00:00"))
        except Exception:
            sess.session_date = datetime.datetime.strptime(new_date[:10], "%Y-%m-%d")

    if notes is not None:
        sess.notes = notes

    db.commit()
    return {"message": "Session updated successfully", "status": sess.status, "session_date": sess.session_date.isoformat()}

@router.post("/auto-adjust")
def auto_adjust_plan(
    req: PlanAutoAdjustRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Triggers Agent 2 to automatically recalculate and rebalance the timetable
    when student has missed sessions or fallen behind.
    """
    plan = db.query(StudyPlan).filter(
        StudyPlan.subject_id == req.subject_id,
        StudyPlan.user_id == current_user.id,
        StudyPlan.is_active == True
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Active study plan not found")

    sessions = db.query(StudySession).filter(StudySession.plan_id == plan.id).order_by(StudySession.session_date.asc()).all()
    sessions_data = [
        {
            "id": s.id,
            "session_date": s.session_date,
            "status": s.status,
            "duration_minutes": s.duration_minutes,
            "session_type": s.session_type,
            "priority": s.priority,
            "title": s.title,
            "notes": s.notes,
            "topic_id": s.topic_id
        }
        for s in sessions
    ]

    agent = StudyPlanningAgent(user_api_key=current_user.gemini_api_key)
    adjusted_sessions = agent.auto_adjust_schedule(
        sessions=sessions_data,
        exam_date=plan.exam_date,
        daily_hours=plan.daily_hours
    )

    for adj in adjusted_sessions:
        s_id = adj.get("id")
        if s_id:
            db_s = db.query(StudySession).filter(StudySession.id == s_id).first()
            if db_s:
                db_s.session_date = adj["session_date"]
                db_s.status = adj.get("status", "pending")
                db_s.notes = adj.get("notes")

    db.commit()
    return {"message": "Study schedule successfully rebalanced! Overdue sessions have been redistributed."}

