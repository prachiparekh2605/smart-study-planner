import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import FocusLog, User, Subject, SyllabusTopic
from app.schemas import FocusLogCreate
from app.auth import get_current_user

router = APIRouter(prefix="/api/focus", tags=["Focus Mode"])

@router.post("/log")
def log_focus_session(
    req: FocusLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log = FocusLog(
        user_id=current_user.id,
        subject_id=req.subject_id,
        topic_id=req.topic_id,
        topic_name=req.topic_name,
        duration_minutes=req.duration_minutes,
        interval_type=req.interval_type,
        notes=req.notes
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return {"message": "Focus session logged successfully.", "log_id": log.id}

@router.get("/stats")
def get_focus_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = datetime.datetime.utcnow().date()
    week_start = today - datetime.timedelta(days=7)

    logs = (
        db.query(FocusLog)
        .filter(FocusLog.user_id == current_user.id, FocusLog.completed_at >= week_start)
        .all()
    )

    today_minutes = sum(l.duration_minutes for l in logs if l.completed_at.date() == today)
    week_minutes = sum(l.duration_minutes for l in logs)

    # Daily breakdown for last 7 days
    daily_stats = []
    for i in range(6, -1, -1):
        day_d = today - datetime.timedelta(days=i)
        day_mins = sum(l.duration_minutes for l in logs if l.completed_at.date() == day_d)
        daily_stats.append({
            "date": day_d.isoformat(),
            "day_name": day_d.strftime("%a"),
            "minutes": day_mins,
            "hours": round(day_mins / 60.0, 1)
        })

    return {
        "today_minutes": today_minutes,
        "today_hours": round(today_minutes / 60.0, 1),
        "weekly_minutes": week_minutes,
        "weekly_hours": round(week_minutes / 60.0, 1),
        "daily_breakdown": daily_stats,
        "total_sessions": len(logs)
    }

