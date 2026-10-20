from fastapi import APIRouter

from app.models.article import RecommendationRequest

router = APIRouter()


@router.post("/recommendations/rank")
def rank_recommendations(req: RecommendationRequest):
    """Placeholder for the RecommendationEngine step: given a user's
    preferences and a candidate set of article IDs (typically shortlisted
    by the backend via a pgvector nearest-neighbor query), returns a
    ranked ordering. Wire this up to app.services.recommendation once the
    candidate embeddings are passed in from the backend.
    """
    return {
        "userId": req.userId,
        "rankedArticleIds": req.candidateArticleIds,  # TODO: real ranking
    }
