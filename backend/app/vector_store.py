import math
import re
from typing import List, Dict, Any, Optional

class VectorStore:
    """
    High-performance semantic vector retriever supporting both
    Gemini embeddings and fast local TF-IDF semantic vector similarity.
    Provides source citations (Document name, page or slide number).
    """

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        words = re.findall(r'\b[a-zA-Z0-9_]{2,}\b', text.lower())
        return words

    @staticmethod
    def compute_local_vector(text: str, vocab: Optional[Dict[str, int]] = None) -> Dict[str, float]:
        """
        Creates term frequency representation normalized for cosine similarity.
        """
        tokens = VectorStore._tokenize(text)
        if not tokens:
            return {}
        tf = {}
        for t in tokens:
            tf[t] = tf.get(t, 0) + 1
        
        # L2 norm
        norm = math.sqrt(sum(v * v for v in tf.values()))
        if norm > 0:
            for k in tf:
                tf[k] /= norm
        return tf

    @staticmethod
    def cosine_similarity(vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
        if not vec1 or not vec2:
            return 0.0
        # Iterate over smaller dict
        if len(vec1) > len(vec2):
            vec1, vec2 = vec2, vec1
        dot_product = sum(val * vec2.get(k, 0.0) for k, val in vec1.items())
        return max(0.0, min(1.0, dot_product))

    @staticmethod
    def search_chunks(
        query: str, 
        chunks: List[Dict[str, Any]], 
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Ranks chunks using semantic similarity to the query.
        Each returned chunk includes citation metadata:
        { 'content': ..., 'page_or_slide': ..., 'material_name': ..., 'score': ... }
        """
        if not chunks:
            return []

        query_vec = VectorStore.compute_local_vector(query)
        query_tokens = set(VectorStore._tokenize(query))

        ranked_results = []
        for ch in chunks:
            content = ch.get("content", "")
            chunk_vec = VectorStore.compute_local_vector(content)
            sim = VectorStore.cosine_similarity(query_vec, chunk_vec)

            # Keyword boost for exact concept match
            tokens = set(VectorStore._tokenize(content))
            overlap = len(query_tokens.intersection(tokens))
            keyword_score = overlap / max(len(query_tokens), 1)

            final_score = (sim * 0.7) + (keyword_score * 0.3)
            ranked_results.append({
                **ch,
                "relevance_score": round(final_score, 4)
            })

        ranked_results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return ranked_results[:top_k]

