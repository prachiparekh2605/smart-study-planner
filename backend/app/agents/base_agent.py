import os
import re
import json
from typing import Optional, Dict, Any
from app.config import GEMINI_API_KEY, DEFAULT_MODEL

class BaseAIAgent:
    def __init__(self, user_api_key: Optional[str] = None):
        self.api_key = user_api_key or GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
        self.model = DEFAULT_MODEL
        self._client = None
        if self.api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"[BaseAIAgent] Failed to init genai client: {e}")

    def is_configured(self) -> bool:
        return bool(self.api_key and self._client)

    def call_gemini(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """
        Executes a call to the Gemini API using google-genai client.
        """
        if not self.is_configured():
            raise ValueError("GEMINI_API_KEY is not configured. Please add it in Settings or environment.")

        full_prompt = prompt
        if system_instruction:
            full_prompt = f"System Instruction: {system_instruction}\n\nTask:\n{prompt}"

        try:
            # Using interactions or models generateContent
            if hasattr(self._client, "interactions"):
                interaction = self._client.interactions.create(
                    model=self.model,
                    input=full_prompt
                )
                if hasattr(interaction, "output_text") and interaction.output_text:
                    return interaction.output_text
            
            # Direct generate_content fallback
            response = self._client.models.generate_content(
                model=self.model,
                contents=full_prompt
            )
            return response.text or ""
        except Exception as e:
            print(f"[BaseAIAgent] Gemini API call error: {e}")
            raise e

    @staticmethod
    def extract_json(raw_text: str) -> Optional[Any]:
        """
        Extracts valid JSON from model responses, handling markdown code fences.
        """
        if not raw_text:
            return None
        text = raw_text.strip()
        # Remove markdown fences ```json ... ```
        if "```" in text:
            match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
            if match:
                text = match.group(1).strip()
        try:
            return json.loads(text)
        except Exception:
            # Try to find { ... } or [ ... ]
            brace_match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', text)
            if brace_match:
                try:
                    return json.loads(brace_match.group(1))
                except Exception:
                    pass
        return None

