from typing import List, Optional
from pydantic import BaseModel


class ArticleInput(BaseModel):
    id: str
    title: str
    content: Optional[str] = ""
    url: Optional[str] = None


class ProcessedArticle(BaseModel):
    id: str
    summary: str
    headline: str
    category: str
    tags: List[str]
    embedding: List[float]
    trendingScore: float
    # Populated only when AI enrichment failed and a degraded fallback
    # result was returned instead — None means real AI enrichment succeeded.
    fallbackReason: Optional[str] = None


class RecommendationRequest(BaseModel):
    userId: str
    preferredCategories: List[str] = []
    preferredTags: List[str] = []
    candidateArticleIds: List[str] = []


class DigestRequest(BaseModel):
    articleIds: List[str]
