import math
from datetime import datetime, timezone


def compute_trending_score(published_at: datetime, engagement_score: float = 0.0) -> float:
    """Simple recency-decayed trending score, similar in spirit to HN's
    ranking formula: fresher + more-engaged articles score higher.

    engagement_score can be wired up later to real signals (views,
    bookmarks, clicks) coming back from the backend.
    """
    if published_at.tzinfo is None:
        published_at = published_at.replace(tzinfo=timezone.utc)

    age_hours = max((datetime.now(timezone.utc) - published_at).total_seconds() / 3600, 0.01)
    decay = 1 / math.pow(age_hours + 2, 1.5)
    return round((1 + engagement_score) * decay * 1000, 4)
