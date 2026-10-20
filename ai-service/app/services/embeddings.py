from app.utils.ai_client import embed


def generate_embedding(text: str) -> list[float]:
    """Generates a vector embedding for the given text, to be stored in
    the Postgres `embedding` column (pgvector) for similarity search
    and recommendations."""
    return embed(text)
