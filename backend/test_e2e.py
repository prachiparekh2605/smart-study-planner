import sys
import os
import datetime
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database import SessionLocal, Base, engine
from app.models import User

client = TestClient(app)

def test_full_platform():
    print("==================================================")
    print("   SMART STUDY PLANNER & EXAM PREP - E2E TEST   ")
    print("==================================================")

    # 1. Healthcheck
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("✅ 1. Health check passed:", res.json()["status"])

    # 2. Login with Seeded Demo User
    login_res = client.post("/api/auth/login", json={
        "email": "student@example.com",
        "password": "password123"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ 2. Authenticated as Alex Chen (student@example.com)")

    # 3. Get Subjects
    subjects_res = client.get("/api/subjects", headers=headers)
    assert subjects_res.status_code == 200
    subjects = subjects_res.json()
    assert len(subjects) > 0, "No subjects found"
    os_subject = subjects[0]
    print(f"✅ 3. Retrieved {len(subjects)} subjects. Active: '{os_subject['name']}' (ID: {os_subject['id']})")

    # 4. Agent 1: Syllabus Analyzer Test
    extract_res = client.post(f"/api/syllabus/extract/{os_subject['id']}", headers=headers)
    assert extract_res.status_code == 200, f"Syllabus extraction failed: {extract_res.text}"
    print("✅ 4. Agent 1 (Syllabus Analyzer) executed successfully:", extract_res.json()["message"])

    # Verify syllabus content
    syl_res = client.get(f"/api/syllabus/subject/{os_subject['id']}", headers=headers)
    assert syl_res.status_code == 200
    units = syl_res.json()["units"]
    assert len(units) > 0
    first_topic = units[0]["topics"][0]
    print(f"      Extracted {len(units)} units. Sample Topic: '{first_topic['name']}' (Diff: {first_topic['difficulty']}, Imp: {first_topic['importance']})")

    # 5. Agent 2: Study Planning Agent Test
    exam_date = (datetime.datetime.utcnow() + datetime.timedelta(days=14)).isoformat()
    plan_res = client.post("/api/planner/generate", headers=headers, json={
        "subject_id": os_subject["id"],
        "exam_date": exam_date,
        "daily_hours": 3.0,
        "preparation_level": "intermediate"
    })
    assert plan_res.status_code == 200, f"Planner failed: {plan_res.text}"
    print("✅ 5. Agent 2 (Study Planning Agent) generated timetable:", plan_res.json()["message"])

    # Test auto-adjust for missed sessions
    adjust_res = client.post("/api/planner/auto-adjust", headers=headers, json={
        "subject_id": os_subject["id"]
    })
    assert adjust_res.status_code == 200
    print("✅ 6. Agent 2 Auto-Rebalance tested:", adjust_res.json()["message"])

    # 6. Agent 3: AI Tutor Agent Test (RAG & Citations)
    tutor_res = client.post("/api/tutor/ask", headers=headers, json={
        "subject_id": os_subject["id"],
        "prompt": "Explain Semaphores and Banker's Algorithm with an intuitive analogy",
        "mode": "student_friendly"
    })
    assert tutor_res.status_code == 200, f"Tutor failed: {tutor_res.text}"
    tutor_data = tutor_res.json()
    print("✅ 7. Agent 3 (AI Tutor Agent) responded with citations:")
    print(f"      Citations count: {len(tutor_data.get('citations', []))}")
    print(f"      Answer preview: {tutor_data['answer'][:120]}...")

    # 7. Agent 4: Quiz Generator Agent Test
    quiz_res = client.post("/api/quiz/generate", headers=headers, json={
        "subject_id": os_subject["id"],
        "topic_name": "Semaphores & Mutex Primitives",
        "difficulty": "medium",
        "num_questions": 3,
        "quiz_type": "topic"
    })
    assert quiz_res.status_code == 200, f"Quiz generation failed: {quiz_res.text}"
    quiz_data = quiz_res.json()
    print(f"✅ 8. Agent 4 (Quiz Generator) generated {quiz_data['total_questions']} questions: '{quiz_data['title']}'")

    # Submit Quiz Answers
    answers_to_submit = [
        {"question_id": q["id"], "student_answer": (q.get("options") or ["A"])[0]}
        for q in quiz_data["questions"]
    ]
    submit_quiz_res = client.post(f"/api/quiz/{quiz_data['quiz_id']}/submit", headers=headers, json={
        "quiz_id": quiz_data["quiz_id"],
        "answers": answers_to_submit,
        "time_spent_seconds": 95
    })
    assert submit_quiz_res.status_code == 200
    print(f"      Submitted quiz. Score: {submit_quiz_res.json()['score_percentage']}%")

    # 8. Agent 5: Exam Simulator Agent Test
    exam_res = client.post("/api/exam/generate", headers=headers, json={
        "subject_id": os_subject["id"],
        "title": "CS401 Mid-Term Comprehensive Mock",
        "duration_minutes": 60,
        "total_marks": 50.0,
        "difficulty": "medium"
    })
    assert exam_res.status_code == 200, f"Mock exam generation failed: {exam_res.text}"
    exam_info = exam_res.json()
    print(f"✅ 9. Agent 5 (Exam Simulator) generated full question paper: {exam_info['questions_count']} questions")

    # Fetch exam and submit with written subjective answers
    full_exam = client.get(f"/api/exam/{exam_info['exam_id']}", headers=headers).json()
    exam_submissions = []
    for q in full_exam["questions"]:
        if q["question_type"] == "objective":
            exam_submissions.append({
                "question_id": q["id"],
                "student_answer": (q.get("options") or ["Default"])[0],
                "is_flagged": False
            })
        else:
            exam_submissions.append({
                "question_id": q["id"],
                "student_answer": "In operating systems, resource allocation requires maintaining a safe sequence where each process request is satisfied by available plus current allocations. The governing relationship ensures no circular wait occurs under standard boundary assumptions.",
                "is_flagged": True
            })

    submit_exam_res = client.post(f"/api/exam/{exam_info['exam_id']}/submit", headers=headers, json={
        "exam_id": exam_info["exam_id"],
        "answers": exam_submissions,
        "time_spent_seconds": 1800
    })
    assert submit_exam_res.status_code == 200
    exam_eval = submit_exam_res.json()
    print(f"      AI Rubric Evaluation: Scored {exam_eval['scored_marks']}/{exam_eval['total_marks']} ({exam_eval['percentage']}%)")
    print(f"      Feedback: {exam_eval['feedback']}")

    # 9. Agent 6: Performance Analysis Agent Test
    analytics_res = client.get("/api/analytics/dashboard", headers=headers)
    assert analytics_res.status_code == 200
    ana_data = analytics_res.json()
    print("✅ 10. Agent 6 (Performance Analysis Agent) Dashboard:")
    print(f"       Overall Completion: {ana_data['overall_completion_pct']}%")
    print(f"       Study Streak: {ana_data['study_streak_days']} Days")
    print(f"       Focus Hours: {ana_data['total_focus_hours']} hrs")
    print(f"       Readiness Grade: {ana_data['readiness_grade']}")
    print(f"       Next Recommendation: {ana_data['recommended_action']}")

    # 10. Agent 7: Revision Agent Test (Flashcards & Formula Sheet)
    flash_res = client.post("/api/revision/flashcards/generate", headers=headers, json={
        "subject_id": os_subject["id"],
        "num_cards": 5
    })
    assert flash_res.status_code == 200
    deck_info = flash_res.json()
    print(f"✅ 11. Agent 7 (Revision Agent) Flashcards Deck Created: '{deck_info['title']}' ({deck_info['total_cards']} cards)")

    formula_res = client.get(f"/api/revision/formula-sheet/{os_subject['id']}", headers=headers)
    assert formula_res.status_code == 200
    sheet = formula_res.json()
    print(f"       Formula Sheet compiled: {len(sheet['categories'])} categories for {sheet['subject_name']}")

    # 11. Focus Mode Logging & Stats Test
    focus_res = client.post("/api/focus/log", headers=headers, json={
        "subject_id": os_subject["id"],
        "topic_name": "Virtual Memory Paging",
        "duration_minutes": 25,
        "interval_type": "25/5",
        "notes": "Reviewed page replacement algorithms"
    })
    assert focus_res.status_code == 200
    focus_stats = client.get("/api/focus/stats", headers=headers).json()
    print(f"✅ 12. Focus Mode session logged. Total today: {focus_stats['today_hours']} hours.")

    print("\n🎉 ALL 12 END-TO-END ACCEPTANCE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_full_platform()

