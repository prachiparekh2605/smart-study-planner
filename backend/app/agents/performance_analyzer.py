import datetime
from typing import List, Dict, Any, Optional
from app.agents.base_agent import BaseAIAgent

class PerformanceAnalysisAgent(BaseAIAgent):
    """
    Agent 6: Performance Analysis Agent
    Monitors learning velocity, computes accuracy heatmaps,
    identifies weak topics, and recommends the next best study actions.
    """

    def analyze_student_performance(
        self,
        subjects_data: List[Dict[str, Any]],
        quiz_attempts: List[Dict[str, Any]],
        mock_exams: List[Dict[str, Any]],
        focus_logs: List[Dict[str, Any]],
        sessions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Synthesizes an intelligent holistic performance report.
        """
        # 1. Syllabus Completion Metrics
        total_topics = 0
        completed_topics = 0
        subject_breakdown = []

        for s in subjects_data:
            t_count = s.get("topics_count", 0)
            c_count = s.get("completed_topics_count", 0)
            pct = round((c_count / max(t_count, 1)) * 100, 1) if t_count > 0 else 0.0
            total_topics += t_count
            completed_topics += c_count

            subject_breakdown.append({
                "subject_id": s.get("id"),
                "name": s.get("name"),
                "color": s.get("color"),
                "total_topics": t_count,
                "completed_topics": c_count,
                "progress_percentage": pct,
                "exam_date": s.get("exam_date")
            })

        overall_completion_pct = round((completed_topics / max(total_topics, 1)) * 100, 1) if total_topics > 0 else 0.0

        # 2. Focus Time & Streaks
        total_focus_minutes = sum(f.get("duration_minutes", 0) for f in focus_logs)
        total_focus_hours = round(total_focus_minutes / 60.0, 1)

        # Study streak calculation (consecutive days with completed session or focus log)
        active_dates = set()
        for f in focus_logs:
            if f.get("completed_at"):
                d = str(f["completed_at"])[:10]
                active_dates.add(d)
        for sess in sessions:
            if sess.get("status") == "completed" and sess.get("session_date"):
                d = str(sess["session_date"])[:10]
                active_dates.add(d)

        streak = 0
        check_date = datetime.datetime.utcnow().date()
        while str(check_date) in active_dates:
            streak += 1
            check_date -= datetime.timedelta(days=1)

        # 3. Quiz & Mock Test Accuracy Analysis
        total_quiz_q = len(quiz_attempts)
        correct_quiz_q = sum(1 for q in quiz_attempts if q.get("is_correct") is True)
        quiz_accuracy_pct = round((correct_quiz_q / max(total_quiz_q, 1)) * 100, 1) if total_quiz_q > 0 else 0.0

        # Identify Weak Topics (accuracy < 60% or repeated wrong answers)
        topic_stats = {}
        for qa in quiz_attempts:
            t_name = qa.get("topic_name") or "General"
            if t_name not in topic_stats:
                topic_stats[t_name] = {"total": 0, "correct": 0}
            topic_stats[t_name]["total"] += 1
            if qa.get("is_correct") is True:
                topic_stats[t_name]["correct"] += 1

        weak_topics = []
        strong_topics = []
        for t_name, stat in topic_stats.items():
            acc = round((stat["correct"] / max(stat["total"], 1)) * 100, 1)
            if acc < 60.0 and stat["total"] >= 1:
                weak_topics.append({
                    "topic_name": t_name,
                    "accuracy": acc,
                    "questions_attempted": stat["total"],
                    "status": "Critical Need for Revision"
                })
            elif acc >= 75.0:
                strong_topics.append({
                    "topic_name": t_name,
                    "accuracy": acc,
                    "questions_attempted": stat["total"]
                })

        # If no quiz attempts yet, flag uncompleted high-importance topics as recommended
        if not weak_topics:
            for s in subjects_data:
                weak_topics.append({
                    "topic_name": f"{s.get('name')} - Core Fundamentals",
                    "accuracy": 50.0,
                    "questions_attempted": 0,
                    "status": "Pending First Assessment"
                })
            weak_topics = weak_topics[:3]

        # 4. Next Recommended Action
        recommended_action = "Take a 15-minute diagnostic quiz on your weakest topic to establish a baseline."
        if weak_topics:
            top_weak = weak_topics[0]
            recommended_action = f"Dedicate 45 minutes to revising '{top_weak['topic_name']}' and review the formula sheet."
        elif overall_completion_pct > 80:
            recommended_action = "Attempt a timed Full Mock Exam to fine-tune your exam pacing."

        return {
            "overall_completion_pct": overall_completion_pct,
            "total_focus_hours": total_focus_hours,
            "study_streak_days": streak,
            "total_quizzes_taken": len(quiz_attempts),
            "quiz_accuracy_pct": quiz_accuracy_pct,
            "subject_breakdown": subject_breakdown,
            "weak_topics": weak_topics,
            "strong_topics": strong_topics,
            "recommended_action": recommended_action,
            "readiness_grade": "A" if (overall_completion_pct > 80 and quiz_accuracy_pct > 80) else ("B" if overall_completion_pct > 50 else "C")
        }

