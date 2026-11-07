import json
from typing import List, Dict, Any, Optional
from app.agents.base_agent import BaseAIAgent

class ExamSimulatorAgent(BaseAIAgent):
    """
    Agent 5: Exam Simulator Agent
    Generates realistic full-length question papers divided into:
    - Section A: Objective Questions (MCQ, True/False, Multiple choice)
    - Section B: Subjective Questions (Short & Long conceptual/numerical derivations)
    Performs AI grading of student answers using strict academic rubrics.
    """

    def generate_mock_exam(
        self,
        subject_name: str,
        title: Optional[str] = None,
        duration_minutes: int = 60,
        total_marks: float = 50.0,
        difficulty: str = "medium",
        num_objective: int = 5,
        num_subjective: int = 3,
        topics_summary: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates an examination paper.
        """
        prompt = f"""
You are the Exam Simulator Agent designing a formal university-standard examination paper.
Subject: {subject_name}
Title: {title or f'{subject_name} Mid-Term / Final Examination'}
Total Marks: {total_marks}
Duration: {duration_minutes} minutes
Difficulty: {difficulty}

Create {num_objective} objective questions (Section A: 2 marks each) and {num_subjective} subjective questions (Section B: {round((total_marks - (num_objective * 2)) / max(num_subjective, 1), 1)} marks each).

Output JSON structure strictly as:
{{
  "title": "{title or f'{subject_name} Comprehensive Mock Examination'}",
  "total_marks": {total_marks},
  "duration_minutes": {duration_minutes},
  "questions": [
    {{
      "question_num": 1,
      "section": "Section A (Objective)",
      "question_type": "objective",
      "marks": 2.0,
      "question_text": "...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "ideal_answer": "Option A text",
      "rubric": {{"correct_selection": 2.0, "incorrect_selection": 0.0}}
    }},
    {{
      "question_num": 6,
      "section": "Section B (Subjective)",
      "question_type": "subjective",
      "marks": 10.0,
      "question_text": "Derive the mathematical relationship for ... and explain its practical significance in ...",
      "options": null,
      "ideal_answer": "Comprehensive model answer containing key formulas, diagrams description, and 3 key points.",
      "rubric": {{
        "conceptual_accuracy": 4.0,
        "completeness_and_derivations": 4.0,
        "terminology_and_units": 2.0
      }}
    }}
  ]
}}
"""
        if self.is_configured():
            try:
                raw_response = self.call_gemini(
                    prompt=prompt,
                    system_instruction="You are a senior university professor and chief examiner. Return strictly valid JSON."
                )
                parsed = self.extract_json(raw_response)
                if parsed and "questions" in parsed:
                    return parsed
            except Exception as e:
                print(f"[ExamSimulatorAgent] Gemini generation failed, using structured fallback exam: {e}")

        # Fallback Exam Paper Generation
        return self._generate_fallback_exam(subject_name, title, duration_minutes, total_marks, num_objective, num_subjective)

    def _generate_fallback_exam(
        self,
        subject_name: str,
        title: Optional[str],
        duration_minutes: int,
        total_marks: float,
        num_objective: int,
        num_subjective: int
    ) -> Dict[str, Any]:
        obj_marks_each = 2.0
        total_obj_marks = num_objective * obj_marks_each
        rem_marks = max(10.0, total_marks - total_obj_marks)
        subj_marks_each = round(rem_marks / max(num_subjective, 1), 1)

        questions = []
        q_counter = 1

        # Section A: Objective
        for i in range(num_objective):
            questions.append({
                "question_num": q_counter,
                "section": "Section A (Objective)",
                "question_type": "objective",
                "marks": obj_marks_each,
                "question_text": f"Question {q_counter}: In {subject_name}, which primary law ensures continuity and equilibrium across state transitions?",
                "options": [
                    "Conservation of Energy and Continuity Principle",
                    "Second-order Random Dispersion Theorem",
                    "Inverse Geometric Divergence",
                    "Unbounded Friction Hypothesis"
                ],
                "ideal_answer": "Conservation of Energy and Continuity Principle",
                "rubric": {"correct_selection": obj_marks_each, "incorrect_selection": 0.0}
            })
            q_counter += 1

        # Section B: Subjective
        subj_topics = [
            f"State and rigorously derive the fundamental governing equation of {subject_name}. Include all necessary boundary assumptions and dimensional constraints.",
            f"Analyze the performance trade-offs in a complex {subject_name} system when subjected to non-ideal load conditions. Provide step-by-step mitigation strategies.",
            f"Compare and contrast the primary analytical model with empirical approximations in {subject_name}. Cite specific scenarios where empirical corrections are mandatory."
        ]

        for i in range(num_subjective):
            prompt_text = subj_topics[i % len(subj_topics)]
            questions.append({
                "question_num": q_counter,
                "section": "Section B (Subjective)",
                "question_type": "subjective",
                "marks": subj_marks_each,
                "question_text": f"Question {q_counter} [{subj_marks_each} Marks]: {prompt_text}",
                "options": None,
                "ideal_answer": f"A comprehensive solution must address: 1) Initial problem statement and definitions in {subject_name}; 2) Mathematical formulation and derivation; 3) Verification of units and boundary constraints; 4) Practical exam implications.",
                "rubric": {
                    "conceptual_accuracy": round(subj_marks_each * 0.4, 1),
                    "completeness_and_derivations": round(subj_marks_each * 0.4, 1),
                    "terminology_and_units": round(subj_marks_each * 0.2, 1)
                }
            })
            q_counter += 1

        return {
            "title": title or f"{subject_name} Standard Mock Examination",
            "total_marks": total_marks,
            "duration_minutes": duration_minutes,
            "questions": questions
        }

    def evaluate_subjective_answer(
        self,
        question_text: str,
        student_answer: str,
        ideal_answer: str,
        max_marks: float,
        rubric: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Uses AI to grade student written answers against the rubric criteria.
        """
        if not student_answer or len(student_answer.strip()) < 10:
            return {
                "awarded_marks": 0.0,
                "feedback": "No substantial answer provided. Please attempt to write key concepts and formulas to receive partial credit.",
                "rubric_breakdown": {"conceptual_accuracy": 0, "completeness": 0, "terminology": 0}
            }

        prompt = f"""
You are the Chief Academic Evaluator. Grade the following subjective exam answer strictly against the rubric.

Question ({max_marks} marks):
{question_text}

Model Ideal Answer:
{ideal_answer}

Student's Written Submission:
{student_answer}

Evaluation Rubric:
- Conceptual Accuracy (max {round(max_marks * 0.4, 1)} pts)
- Completeness and Steps (max {round(max_marks * 0.4, 1)} pts)
- Technical Terminology and Clarity (max {round(max_marks * 0.2, 1)} pts)

Output JSON only:
{{
  "awarded_marks": 7.5, // float between 0 and {max_marks}
  "feedback": "Constructive 2-3 sentence critique highlighting what was done well and what was missed.",
  "rubric_breakdown": {{
    "conceptual_accuracy": 3.0,
    "completeness": 3.0,
    "terminology": 1.5
  }},
  "model_improvement_tip": "Specific recommendation for scoring full marks next time."
}}
"""
        if self.is_configured():
            try:
                raw = self.call_gemini(
                    prompt=prompt,
                    system_instruction="You are an objective, fair, and encouraging academic grader. Always return strictly valid JSON."
                )
                parsed = self.extract_json(raw)
                if parsed and "awarded_marks" in parsed:
                    awarded = min(max_marks, max(0.0, float(parsed["awarded_marks"])))
                    parsed["awarded_marks"] = round(awarded, 1)
                    return parsed
            except Exception as e:
                print(f"[ExamSimulatorAgent] AI subjective grading failed, using heuristic grading: {e}")

        # Heuristic Rubric Grading Fallback
        word_count = len(student_answer.split())
        quality_factor = min(1.0, max(0.2, word_count / 80.0))
        
        # Check if student mentions key words
        has_formula = any(sym in student_answer for sym in ["=", "+", "-", "*", "/", "\\", "^"])
        if has_formula:
            quality_factor = min(1.0, quality_factor + 0.15)

        awarded = round(max_marks * quality_factor, 1)
        return {
            "awarded_marks": awarded,
            "feedback": f"Good effort. Your answer covers core ideas with {word_count} words. To score maximum marks, expand on the mathematical derivation and state boundary conditions explicitly.",
            "rubric_breakdown": {
                "conceptual_accuracy": round(awarded * 0.45, 1),
                "completeness": round(awarded * 0.35, 1),
                "terminology": round(awarded * 0.20, 1)
            },
            "model_improvement_tip": "Include a brief diagram sketch or governing equation at the beginning of your answer."
        }

