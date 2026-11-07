import sys
import os
import datetime

# Fix Windows console UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import User, Subject
from app.routes.auth_routes import login, register
from app.schemas import UserLogin
from app.routes.subject_routes import get_subjects
from app.routes.syllabus_routes import extract_syllabus, get_syllabus
from app.routes.planner_routes import generate_study_plan, auto_adjust_plan
from app.schemas import PlanGenerateRequest, PlanAutoAdjustRequest
from app.routes.tutor_routes import ask_tutor
from app.schemas import TutorAskRequest
from app.routes.quiz_routes import generate_quiz, submit_quiz
from app.schemas import QuizGenerateRequest, QuizSubmitRequest, QuizAnswerSubmit
from app.routes.exam_routes import generate_mock_exam, submit_mock_exam, get_mock_exam
from app.schemas import MockExamGenerateRequest, MockExamSubmitRequest, MockAnswerSubmit
from app.routes.analytics_routes import get_dashboard_analytics
from app.routes.revision_routes import generate_flashcards, get_formula_sheet, review_flashcard
from app.schemas import FlashcardDeckCreate, FlashcardReviewRequest
from app.routes.focus_routes import log_focus_session, get_focus_stats
from app.schemas import FocusLogCreate

def run_tests():
    db = SessionLocal()
    try:
        print("==================================================")
        print("   SMART STUDY PLANNER DIRECT AGENT SUITE TEST   ")
        print("==================================================")

        # 1. User Auth Test
        user = db.query(User).filter(User.email == "student@example.com").first()
        assert user is not None, "Demo user not found"
        print(f"[PASS] 1. Demo User Verified: {user.full_name} ({user.email})")

        # 2. Subject Test
        subjects = get_subjects(db=db, current_user=user)
        assert len(subjects) > 0, "No subjects found"
        sub = subjects[0]
        print(f"[PASS] 2. Subjects Loaded: {len(subjects)} subjects. Active: '{sub.name}' (ID: {sub.id})")

        # 3. Agent 1: Syllabus Analyzer Test
        print("Testing Agent 1: Syllabus Analyzer...")
        ext_res = extract_syllabus(subject_id=sub.id, db=db, current_user=user)
        print(f"[PASS] 3. Agent 1 Syllabus Extracted: {ext_res['message']}")
        syl_data = get_syllabus(subject_id=sub.id, db=db, current_user=user)
        print(f"      Units: {len(syl_data['units'])}, First Unit: '{syl_data['units'][0]['title']}'")

        # 4. Agent 2: Study Planner Test
        print("Testing Agent 2: Study Planning Agent...")
        exam_dt = datetime.datetime.utcnow() + datetime.timedelta(days=14)
        plan_req = PlanGenerateRequest(
            subject_id=sub.id,
            exam_date=exam_dt,
            daily_hours=3.5,
            preparation_level="intermediate"
        )
        plan_res = generate_study_plan(req=plan_req, db=db, current_user=user)
        print(f"[PASS] 4. Agent 2 Plan Generated: {plan_res['message']} (Plan ID: {plan_res['plan_id']})")

        adj_req = PlanAutoAdjustRequest(subject_id=sub.id)
        adj_res = auto_adjust_plan(req=adj_req, db=db, current_user=user)
        print(f"[PASS] 5. Agent 2 Auto-Rebalance: {adj_res['message']}")

        # 5. Agent 3: AI Tutor Test (RAG & Grounded Citations)
        print("Testing Agent 3: AI Tutor Agent...")
        tutor_req = TutorAskRequest(
            subject_id=sub.id,
            prompt="Explain the difference between Paging and Segmentation with a step-by-step example.",
            mode="step_by_step"
        )
        tutor_res = ask_tutor(req=tutor_req, db=db, current_user=user)
        print("[PASS] 6. Agent 3 AI Tutor Responded:")
        print(f"      Citations count: {len(tutor_res.get('citations', []))}")
        print(f"      Answer excerpt: {tutor_res['answer'][:110]}...")

        # 6. Agent 4: Quiz Generator Test
        print("Testing Agent 4: Quiz Generator Agent...")
        quiz_req = QuizGenerateRequest(
            subject_id=sub.id,
            topic_name="Paging vs Segmentation Models",
            difficulty="medium",
            num_questions=3,
            quiz_type="topic"
        )
        quiz_res = generate_quiz(req=quiz_req, db=db, current_user=user)
        print(f"[PASS] 7. Agent 4 Generated Quiz: '{quiz_res['title']}' ({quiz_res['total_questions']} questions)")

        quiz_sub_req = QuizSubmitRequest(
            quiz_id=quiz_res["quiz_id"],
            answers=[
                QuizAnswerSubmit(question_id=q["id"], student_answer=(q.get("options") or ["Default"])[0])
                for q in quiz_res["questions"]
            ],
            time_spent_seconds=120
        )
        quiz_eval = submit_quiz(quiz_id=quiz_res["quiz_id"], req=quiz_sub_req, db=db, current_user=user)
        print(f"      Quiz Grading: {quiz_eval['score_percentage']}% ({quiz_eval['correct_count']}/{quiz_eval['total_questions']} correct)")

        # 7. Agent 5: Exam Simulator Test
        print("Testing Agent 5: Exam Simulator Agent...")
        exam_req = MockExamGenerateRequest(
            subject_id=sub.id,
            title="CS401 Midterm Examination",
            duration_minutes=60,
            total_marks=50.0,
            difficulty="medium",
            num_objective=3,
            num_subjective=2
        )
        exam_gen = generate_mock_exam(req=exam_req, db=db, current_user=user)
        print(f"[PASS] 8. Agent 5 Exam Paper Generated: ID {exam_gen['exam_id']} with {exam_gen['questions_count']} questions")

        exam_obj = get_mock_exam(exam_id=exam_gen["exam_id"], db=db, current_user=user)
        exam_sub_answers = []
        for q in exam_obj["questions"]:
            if q["question_type"] == "objective":
                exam_sub_answers.append(MockAnswerSubmit(
                    question_id=q["id"],
                    student_answer=(q.get("options") or ["Default"])[0],
                    is_flagged=False
                ))
            else:
                exam_sub_answers.append(MockAnswerSubmit(
                    question_id=q["id"],
                    student_answer="Paging divides memory into fixed pages while segmentation uses variable logical segments. Address translation utilizes page table base registers and TLB lookup to preserve physical frame alignment.",
                    is_flagged=True
                ))

        exam_sub_req = MockExamSubmitRequest(
            exam_id=exam_gen["exam_id"],
            answers=exam_sub_answers,
            time_spent_seconds=2100
        )
        exam_eval = submit_mock_exam(exam_id=exam_gen["exam_id"], req=exam_sub_req, db=db, current_user=user)
        print(f"      AI Rubric Grading: Scored {exam_eval['scored_marks']}/{exam_eval['total_marks']} ({exam_eval['percentage']}%)")
        print(f"      Feedback: {exam_eval['feedback']}")

        # 8. Agent 6: Performance Analysis Agent Test
        print("Testing Agent 6: Performance Analysis Agent...")
        analytics = get_dashboard_analytics(db=db, current_user=user)
        print("[PASS] 9. Agent 6 Analytics Dashboard:")
        print(f"      Overall Completion: {analytics['overall_completion_pct']}%")
        print(f"      Study Streak: {analytics['study_streak_days']} Days")
        print(f"      Focus Hours: {analytics['total_focus_hours']} hrs")
        print(f"      Readiness Grade: {analytics['readiness_grade']}")
        print(f"      Recommended Next Action: {analytics['recommended_action']}")

        # 9. Agent 7: Revision Agent Test (Flashcards & Formula Sheet)
        print("Testing Agent 7: Revision Agent...")
        deck_req = FlashcardDeckCreate(subject_id=sub.id, num_cards=4)
        deck_res = generate_flashcards(req=deck_req, db=db, current_user=user)
        print(f"[PASS] 10. Agent 7 Flashcards: '{deck_res['title']}' ({deck_res['total_cards']} cards)")

        formula_sheet = get_formula_sheet(subject_id=sub.id, db=db, current_user=user)
        print(f"       Formula Sheet: {len(formula_sheet['categories'])} categories for {formula_sheet['subject_name']}")

        # 10. Focus Mode Logging & Stats Test
        print("Testing Focus Mode...")
        focus_req = FocusLogCreate(
            subject_id=sub.id,
            topic_name="Paging Translation Verification",
            duration_minutes=25,
            interval_type="25/5",
            notes="Completed 25-minute Pomodoro focus interval"
        )
        f_log = log_focus_session(req=focus_req, db=db, current_user=user)
        f_stats = get_focus_stats(db=db, current_user=user)
        print(f"[PASS] 11. Focus Mode session logged (ID: {f_log['log_id']}). Total Today: {f_stats['today_hours']} hrs.")

        print("\n==================================================")
        print("SUCCESS: ALL 11 MULTI-AGENT BACKEND SUITE TESTS PASSED!")
        print("==================================================")
    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
