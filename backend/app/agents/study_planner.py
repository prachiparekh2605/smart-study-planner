import datetime
import math
from typing import List, Dict, Any, Optional
from app.agents.base_agent import BaseAIAgent

class StudyPlanningAgent(BaseAIAgent):
    """
    Agent 2: Study Planning Agent
    Generates realistic, balanced, exam-oriented study timetables.
    Features:
    - Workload estimation & topic prioritization
    - Spaced repetition revision sessions
    - Quiz & Mock exam checkpoints
    - Pre-exam buffer days
    - Dynamic automatic schedule adjustment for missed sessions
    """

    def generate_schedule(
        self,
        subject_name: str,
        subject_id: int,
        topics: List[Dict[str, Any]],
        exam_date: datetime.datetime,
        daily_hours: float = 3.0,
        preparation_level: str = "intermediate",
        daily_commitments: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Calculates and allocates daily sessions up to exam_date.
        """
        now = datetime.datetime.utcnow().date()
        exam_d = exam_date.date() if isinstance(exam_date, datetime.datetime) else exam_date
        total_days = (exam_d - now).days

        if total_days <= 0:
            total_days = 7  # minimum fallback window

        # Reserve last 2-3 days as pre-exam buffer days (unless time is critically short)
        buffer_days = min(3, max(1, total_days // 7))
        active_study_days = max(1, total_days - buffer_days)

        # Sort topics: critical & high importance first, then hard/medium difficulty
        importance_weights = {"critical": 4, "high": 3, "medium": 2, "low": 1}
        difficulty_weights = {"hard": 3, "medium": 2, "easy": 1}

        def topic_sort_key(t):
            imp = importance_weights.get(t.get("importance", "medium").lower(), 2)
            diff = difficulty_weights.get(t.get("difficulty", "medium").lower(), 2)
            return (imp, diff)

        sorted_topics = sorted(topics, key=topic_sort_key, reverse=True)

        sessions = []
        current_day_offset = 0

        # Preparation level factor
        prep_multiplier = 1.2 if preparation_level == "beginner" else (0.9 if preparation_level == "advanced" else 1.0)

        # 1. Distribute Initial Study Sessions
        topics_per_day = max(1, math.ceil(len(sorted_topics) / (active_study_days * 0.7)))
        
        for idx, topic in enumerate(sorted_topics):
            day_for_topic = min(current_day_offset, active_study_days - 1)
            session_date = now + datetime.timedelta(days=day_for_topic)
            
            hours = topic.get("estimated_hours", 1.5) * prep_multiplier
            duration_mins = int(min(daily_hours * 60, max(45, hours * 60)))

            sessions.append({
                "subject_id": subject_id,
                "topic_id": topic.get("id"),
                "session_date": datetime.datetime.combine(session_date, datetime.time(9, 0)),
                "title": f"Study: {topic.get('name')}",
                "session_type": "study",
                "duration_minutes": duration_mins,
                "priority": "high" if topic.get("importance") in ["critical", "high"] else "medium",
                "status": "pending",
                "notes": f"Focus on {topic.get('difficulty')} core concepts and key formulas."
            })

            # Check if we should insert a spaced revision session (3 days after study)
            rev_date = session_date + datetime.timedelta(days=3)
            if (rev_date - now).days < active_study_days:
                sessions.append({
                    "subject_id": subject_id,
                    "topic_id": topic.get("id"),
                    "session_date": datetime.datetime.combine(rev_date, datetime.time(14, 0)),
                    "title": f"Spaced Revision: {topic.get('name')}",
                    "session_type": "revision",
                    "duration_minutes": 45,
                    "priority": "medium",
                    "status": "pending",
                    "notes": "Recall key definitions, self-test formulas, and solve 2 quick numerical problems."
                })

            if (idx + 1) % topics_per_day == 0:
                current_day_offset += 1

        # 2. Add Unit / Checkpoint Quizzes
        quiz_interval = max(3, active_study_days // 4)
        for q_day in range(quiz_interval, active_study_days, quiz_interval):
            sessions.append({
                "subject_id": subject_id,
                "topic_id": None,
                "session_date": datetime.datetime.combine(now + datetime.timedelta(days=q_day), datetime.time(18, 0)),
                "title": f"Checkpoint Assessment & Quiz",
                "session_type": "quiz",
                "duration_minutes": 45,
                "priority": "high",
                "status": "pending",
                "notes": "Test retention on topics studied over the last few days. Analyze any incorrect answers."
            })

        # 3. Add Pre-Exam Buffer and Full Mock Exams in buffer period
        for b_idx in range(buffer_days):
            buffer_date = now + datetime.timedelta(days=active_study_days + b_idx)
            if b_idx == 0:
                sessions.append({
                    "subject_id": subject_id,
                    "topic_id": None,
                    "session_date": datetime.datetime.combine(buffer_date, datetime.time(10, 0)),
                    "title": f"Full Exam Simulation (Mock Exam 1)",
                    "session_type": "mock_exam",
                    "duration_minutes": 120,
                    "priority": "high",
                    "status": "pending",
                    "notes": "Timed condition test. Practice time management and objective + subjective questions."
                })
            elif b_idx == buffer_days - 1:
                sessions.append({
                    "subject_id": subject_id,
                    "topic_id": None,
                    "session_date": datetime.datetime.combine(buffer_date, datetime.time(15, 0)),
                    "title": "Final Rapid Formula & Flashcard Review",
                    "session_type": "revision",
                    "duration_minutes": 90,
                    "priority": "high",
                    "status": "pending",
                    "notes": "Review summary cheat-sheets, high-yield formulas, and weakest topics. Rest early."
                })

        # Sort all sessions chronologically
        sessions.sort(key=lambda s: s["session_date"])
        return sessions

    def auto_adjust_schedule(
        self,
        sessions: List[Dict[str, Any]],
        exam_date: datetime.datetime,
        daily_hours: float = 3.0
    ) -> List[Dict[str, Any]]:
        """
        Automatically reschedules missed or pending overdue sessions
        without losing completed progress or overloading remaining days.
        """
        now = datetime.datetime.utcnow()
        today = now.date()
        exam_d = exam_date.date() if isinstance(exam_date, datetime.datetime) else exam_date
        
        remaining_days = (exam_d - today).days
        if remaining_days <= 0:
            remaining_days = 3

        # Identify missed or overdue pending sessions
        missed_or_pending = []
        completed_sessions = []
        future_sessions = []

        for s in sessions:
            s_date = s["session_date"].date() if isinstance(s["session_date"], datetime.datetime) else datetime.datetime.strptime(str(s["session_date"])[:10], "%Y-%m-%d").date()
            if s.get("status") == "completed":
                completed_sessions.append(s)
            elif s_date < today and s.get("status") in ["pending", "missed"]:
                s["status"] = "pending"  # reset to pending for rescheduling
                missed_or_pending.append(s)
            else:
                future_sessions.append(s)

        if not missed_or_pending:
            return sessions  # no adjustments needed

        # Re-distribute missed sessions across remaining days
        all_uncompleted = missed_or_pending + future_sessions
        # Prioritize study and mock_exam types
        type_priority = {"mock_exam": 4, "study": 3, "quiz": 2, "revision": 1}
        all_uncompleted.sort(key=lambda s: type_priority.get(s.get("session_type", "study"), 1), reverse=True)

        adjusted_sessions = list(completed_sessions)
        day_allocation_count = {}

        for idx, s in enumerate(all_uncompleted):
            # Pick a day from today onwards
            day_slot = idx % remaining_days
            target_date = today + datetime.timedelta(days=day_slot)
            
            day_allocation_count[target_date] = day_allocation_count.get(target_date, 0) + 1
            hour_offset = 9 + (day_allocation_count[target_date] * 2)
            if hour_offset > 20:
                hour_offset = 18

            s["session_date"] = datetime.datetime.combine(target_date, datetime.time(hour_offset % 24, 0))
            s["notes"] = (s.get("notes") or "") + " [Auto-adjusted by Planner Agent to stay on track]"
            adjusted_sessions.append(s)

        adjusted_sessions.sort(key=lambda s: s["session_date"])
        return adjusted_sessions

