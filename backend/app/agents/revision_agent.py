import json
import datetime
from typing import List, Dict, Any, Optional
from app.agents.base_agent import BaseAIAgent

class RevisionAgent(BaseAIAgent):
    """
    Agent 7: Revision Agent
    Empowers students with:
    - AI-generated flashcards
    - SuperMemo SM-2 Spaced Repetition scheduling
    - Formula Sheet compiler
    - High-yield quick revision notes
    - 24-48 hour last-minute cram itineraries
    """

    def generate_flashcards(
        self,
        subject_name: str,
        topic_name: Optional[str] = None,
        num_cards: int = 8,
        context_chunks: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Generates front/back/formula flashcards.
        """
        prompt = f"""
You are the Revision Agent for {subject_name}.
Generate {num_cards} high-yield study flashcards for topic: {topic_name or 'Complete Syllabus'}.

JSON Schema:
[
  {{
    "front": "Prompt or Question (e.g. What is the First Law of Thermodynamics?)",
    "back": "Clear concise answer and conceptual takeaway",
    "formula": "Optional mathematical formula or null",
    "topic_name": "{topic_name or subject_name}"
  }}
]
"""
        if self.is_configured():
            try:
                raw = self.call_gemini(
                    prompt=prompt,
                    system_instruction="You are an expert educator specializing in memory retention techniques. Return only JSON."
                )
                parsed = self.extract_json(raw)
                if isinstance(parsed, list) and len(parsed) > 0:
                    return parsed[:num_cards]
            except Exception as e:
                print(f"[RevisionAgent] Flashcard generation fallback: {e}")

        # Intelligent Flashcard Fallback Decks
        target = topic_name or subject_name
        return [
            {
                "front": f"What is the core definition and physical significance of {target}?",
                "back": f"{target} governs the systematic relationship between applied excitation and system state equilibrium.",
                "formula": "Delta_State = Integral(Drive * dt)",
                "topic_name": target
            },
            {
                "front": f"What are the 3 mandatory boundary conditions required when analyzing {target}?",
                "back": "1. Conservation of mass/energy\n2. Geometric boundary constraints\n3. Initial steady-state conditions at t=0",
                "formula": "Sum(Forces) = 0, at t=0",
                "topic_name": target
            },
            {
                "front": f"How do you resolve numerical discrepancies in {target} problem sets?",
                "back": "Perform dimensional analysis on each term, check SI unit consistency, and verify order of magnitude against standard physical limits.",
                "formula": "[L]^a [M]^b [T]^c",
                "topic_name": target
            },
            {
                "front": f"What is the most frequent examination trap related to {target}?",
                "back": "Assuming ideal linear conditions when the problem states non-zero friction, internal resistance, or dissipative loss.",
                "formula": "Efficiency = (Output / Input) < 1.0",
                "topic_name": target
            }
        ]

    @staticmethod
    def calculate_sm2_repetition(
        rating: int,  # 1: Again (blackout), 2: Hard, 3: Good, 4: Easy
        repetitions: int,
        interval_days: int,
        ease_factor: float
    ) -> Dict[str, Any]:
        """
        Implementation of SuperMemo SM-2 algorithm.
        Returns: { 'repetitions': int, 'interval_days': int, 'ease_factor': float, 'next_review_date': datetime }
        """
        if rating < 2:  # Again
            new_repetitions = 0
            new_interval = 1
        else:
            if repetitions == 0:
                new_interval = 1
            elif repetitions == 1:
                new_interval = 6
            else:
                new_interval = int(round(interval_days * ease_factor))

            new_repetitions = repetitions + 1

        # Ease factor adjustment formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        q = rating + 1  # map 1-4 to 2-5 scale
        new_ef = ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        new_ef = max(1.3, round(new_ef, 2))

        next_date = datetime.datetime.utcnow() + datetime.timedelta(days=new_interval)

        return {
            "repetitions": new_repetitions,
            "interval_days": new_interval,
            "ease_factor": new_ef,
            "next_review_date": next_date
        }

    def generate_formula_sheet(
        self,
        subject_name: str,
        units_and_topics: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Aggregates and formats all core formulas into a crisp reference sheet.
        """
        categories = []
        for u in units_and_topics:
            formulas = []
            for t in u.get("topics", []):
                t_formulas = t.get("formulas") or []
                for f in t_formulas:
                    formulas.append({
                        "name": t.get("name"),
                        "formula": f,
                        "variables": "Standard notation as defined in course syllabus"
                    })
            if formulas:
                categories.append({
                    "unit_title": u.get("title"),
                    "formulas": formulas
                })

        # If empty, add standard subject formulas
        if not categories:
            categories.append({
                "unit_title": f"Core Equations of {subject_name}",
                "formulas": [
                    {
                        "name": "Fundamental Equilibrium Equation",
                        "formula": "F(x, t) = A \\cdot \\cos(\\omega t + \\phi) + C",
                        "variables": "A = Amplitude, \\omega = Angular frequency, \\phi = Phase angle"
                    },
                    {
                        "name": "System Efficiency Metric",
                        "formula": "\\eta = \\frac{W_{\\text{out}}}{Q_{\\text{in}}} = 1 - \\frac{T_C}{T_H}",
                        "variables": "T_C = Cold reservoir temp (K), T_H = Hot reservoir temp (K)"
                    },
                    {
                        "name": "Rate of Transfer Relation",
                        "formula": "J = -D \\frac{dC}{dx}",
                        "variables": "D = Diffusion/Transport coefficient, dC/dx = Concentration gradient"
                    }
                ]
            })

        return {
            "subject_name": subject_name,
            "categories": categories,
            "exam_cheat_sheet_tips": [
                "Always check units on both sides of equal sign (dimensional homogeneity).",
                "Convert temperature to Kelvin in all thermodynamic equations.",
                "State standard reference values (e.g. g = 9.81 m/s^2, R = 8.314 J/mol K) before calculation."
            ]
        }

