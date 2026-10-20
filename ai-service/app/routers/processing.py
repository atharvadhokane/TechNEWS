from fastapi import APIRouter
import logging

from app.models.article import ArticleInput, ProcessedArticle
from app.services.summarizer import generate_summary
from app.services.headlines import generate_headline
from app.services.categorizer import categorize
from app.services.tags import generate_tags
from app.services.embeddings import generate_embedding
from app.services.trending import compute_trending_score
from app.utils.ai_client import get_embedding_provider
from datetime import datetime, timezone

router = APIRouter()
logger = logging.getLogger("ai-service")

# Must match the `vector(N)` dimension in database/migrations/001_enable_pgvector.sql.
# Keyed off the *embedding* provider specifically (not AI_PROVIDER) since
# Grok has no embeddings API and falls back to OpenAI's 1536-dim model --
# see app/utils/ai_client.py.
_FALLBACK_EMBEDDING_DIM = 768 if get_embedding_provider() == "gemini" else 1536


def _fallback_result(article: ArticleInput, reason: str) -> ProcessedArticle:
    """Produces a degraded-but-valid result when the OpenAI call fails
    (missing/invalid key, rate limit, outage, etc.), so the pipeline
    keeps moving instead of failing the BullMQ job outright. The article
    is still stored and visible, just without real AI enrichment.
    """
    logger.warning("Falling back to non-AI enrichment for %s: %s", article.id, reason)
    trimmed = (article.content or article.title).strip()
    return ProcessedArticle(
        id=article.id,
        summary=trimmed[:280] + ("..." if len(trimmed) > 280 else ""),
        headline=article.title,
        category="Uncategorized",
        tags=[],
        embedding=[0.0] * _FALLBACK_EMBEDDING_DIM,
        trendingScore=compute_trending_score(datetime.now(timezone.utc)),
        fallbackReason=reason,
    )


@router.post("/process-article", response_model=ProcessedArticle)
def process_article(article: ArticleInput):
    """Runs the full LLMProcessing sub-flow from the activity diagram:
    GenerateSummary -> GenerateHeadline -> Categorize -> GenerateTags ->
    GenerateEmbeddings -> (trending score), called by the BullMQ worker
    for each queued article. Falls back to a non-AI result rather than
    failing the job if the OpenAI call errors (e.g. missing API key).
    """
    if not article.content:
        return _fallback_result(article, "no content provided")

    try:
        summary = generate_summary(article.title, article.content)
        headline = generate_headline(article.title, summary)
        category = categorize(article.title, summary)
        tags = generate_tags(article.title, summary)
        embedding = generate_embedding(f"{headline}\n{summary}")
        trending_score = compute_trending_score(datetime.now(timezone.utc))

        return ProcessedArticle(
            id=article.id,
            summary=summary,
            headline=headline,
            category=category,
            tags=tags,
            embedding=embedding,
            trendingScore=trending_score,
        )
    except Exception as exc:  # noqa: BLE001
        return _fallback_result(article, str(exc))
