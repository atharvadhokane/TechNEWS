from app.services.duplicate_detector import cosine_similarity


def rank_by_similarity(user_profile_embedding: list[float],
                        candidates: list[dict]) -> list[dict]:
    """Ranks candidate articles (each a dict with 'id' and 'embedding')
    by cosine similarity to a user's preference/profile embedding.

    In production, the initial candidate shortlist and the final
    persistence step live in Postgres (pgvector `<->` operator run
    from the Node backend); this function is useful when you want the
    ranking logic itself to live in the AI service instead.
    """
    scored = [
        {**c, "score": cosine_similarity(user_profile_embedding, c["embedding"])}
        for c in candidates
    ]
    return sorted(scored, key=lambda x: x["score"], reverse=True)
