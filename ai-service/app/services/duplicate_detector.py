import numpy as np


def cosine_similarity(a: list[float], b: list[float]) -> float:
    a_vec, b_vec = np.array(a), np.array(b)
    denom = np.linalg.norm(a_vec) * np.linalg.norm(b_vec)
    if denom == 0:
        return 0.0
    return float(np.dot(a_vec, b_vec) / denom)


def is_duplicate(candidate_embedding: list[float], existing_embeddings: list[list[float]],
                  threshold: float = 0.92) -> bool:
    """Flags a candidate article as a near-duplicate of an existing one
    if cosine similarity exceeds `threshold`. Used by the "Group similar
    stories / Deduplicate" step before articles are queued for full
    LLM processing."""
    return any(cosine_similarity(candidate_embedding, e) >= threshold for e in existing_embeddings)
